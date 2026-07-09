-- ═══════════════════════════════════════════════════════════════════════════════
-- N2 - Doluluk/Maliyet Raporlari
-- Occupancy & Revenue Reporting RPC Functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. get_occupancy_report ──────────────────────────────────────────────────
-- Returns occupancy + revenue metrics for a given date range.
-- Schema gaps are documented inline as TODOs for J phase (Iyzico payments).

CREATE OR REPLACE FUNCTION public.get_occupancy_report(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  -- Occupancy metrics
  occupancy_rate NUMERIC,
  total_nights BIGINT,
  reservations_count BIGINT,
  avg_stay_length NUMERIC,
  cancellation_rate NUMERIC,
  -- Revenue metrics
  total_revenue NUMERIC,
  avg_revenue_per_reservation NUMERIC,
  -- Monthly trend data (JSON to avoid complex type issues)
  monthly_trend JSONB,
  -- Status breakdown
  status_breakdown JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_reservations BIGINT;
  v_cancelled_reservations BIGINT;
  v_total_nights BIGINT;
  v_total_revenue NUMERIC;
  v_monthly_trend JSONB;
  v_status_breakdown JSONB;
BEGIN
  -- ── Reservations in range (by check_in_date) ────────────────────────────
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COALESCE(SUM(nights), 0),
    COALESCE(SUM(total_price), 0)
  INTO
    v_total_reservations,
    v_cancelled_reservations,
    v_total_nights,
    v_total_revenue
  FROM public.reservations r
  WHERE r.tenant_id = p_tenant_id
    AND r.check_in_date >= p_start_date
    AND r.check_in_date <= p_end_date
    AND r.status IN ('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show');

  -- ── Monthly trend ───────────────────────────────────────────────────────
  -- Aggregated by month for the date range
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'month', to_char(month_start, 'YYYY-MM'),
      'year', EXTRACT(YEAR FROM month_start),
      'month_num', EXTRACT(MONTH FROM month_start),
      'reservations', COALESCE(m.reservations, 0),
      'revenue', COALESCE(m.revenue, 0),
      'nights', COALESCE(m.nights, 0),
      'occupancy_rate', COALESCE(m.occupancy_rate, 0)
    ) ORDER BY month_start
  )
  INTO v_monthly_trend
  FROM (
    SELECT
      DATE_TRUNC('month', r.check_in_date) AS month_start,
      COUNT(*) AS reservations,
      SUM(r.total_price) AS revenue,
      SUM(r.nights) AS nights,
      -- Occupancy: nights / (days_in_month * room_count)
      -- TODO(J phase): Use actual room inventory from rooms table
      -- For now, estimate with assumed room count (5 rooms as default)
      ROUND(
        (SUM(r.nights)::NUMERIC / (EXTRACT(DAY FROM (DATE_TRUNC('month', r.check_in_date) + INTERVAL '1 month' - DATE_TRUNC('month', r.check_in_date))) * 5)) * 100,
        1
      ) AS occupancy_rate
    FROM public.reservations r
    WHERE r.tenant_id = p_tenant_id
      AND r.check_in_date >= p_start_date
      AND r.check_in_date <= p_end_date
      AND r.status IN ('confirmed', 'checked_in', 'checked_out', 'pending')
    GROUP BY DATE_TRUNC('month', r.check_in_date)
  ) m;

  -- If no monthly data, return empty array
  IF v_monthly_trend IS NULL THEN
    v_monthly_trend := '[]'::JSONB;
  END IF;

  -- ── Status breakdown ─────────────────────────────────────────────────────
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'status', s.status,
      'count', s.cnt,
      'percentage', ROUND((s.cnt::NUMERIC / NULLIF(v_total_reservations, 0)) * 100, 1)
    )
  )
  INTO v_status_breakdown
  FROM (
    SELECT r.status, COUNT(*) AS cnt
    FROM public.reservations r
    WHERE r.tenant_id = p_tenant_id
      AND r.check_in_date >= p_start_date
      AND r.check_in_date <= p_end_date
    GROUP BY r.status
    ORDER BY cnt DESC
  ) s;

  IF v_status_breakdown IS NULL THEN
    v_status_breakdown := '[]'::JSONB;
  END IF;

  -- ── Return row ───────────────────────────────────────────────────────────
  RETURN QUERY
  SELECT
    -- Occupancy rate: used_nights / (period_days * estimated_rooms) * 100
    -- TODO(J phase): Replace 5 with actual active room count from rooms table
    CASE
      WHEN v_total_nights > 0 THEN
        ROUND(
          (v_total_nights::NUMERIC / 
            (GREATEST((p_end_date - p_start_date), 1) * 5)
          ) * 100, 1
        )
      ELSE 0
    END AS occupancy_rate,
    v_total_nights AS total_nights,
    v_total_reservations AS reservations_count,
    CASE
      WHEN v_total_reservations > 0 THEN
        ROUND(v_total_nights::NUMERIC / v_total_reservations, 1)
      ELSE 0
    END AS avg_stay_length,
    CASE
      WHEN v_total_reservations > 0 THEN
        ROUND((v_cancelled_reservations::NUMERIC / v_total_reservations) * 100, 1)
      ELSE 0
    END AS cancellation_rate,
    -- Revenue metrics
    COALESCE(v_total_revenue, 0) AS total_revenue,
    CASE
      WHEN v_total_reservations > 0 THEN
        ROUND(v_total_revenue / v_total_reservations, 2)
      ELSE 0
    END AS avg_revenue_per_reservation,
    v_monthly_trend AS monthly_trend,
    v_status_breakdown AS status_breakdown;
END;
$$;

-- ─── 2. get_daily_occupancy ───────────────────────────────────────────────────
-- Returns day-by-day occupancy for charting.
-- Used for the daily occupancy bar chart.

CREATE OR REPLACE FUNCTION public.get_daily_occupancy(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  occupied_rooms BIGINT,
  total_rooms BIGINT,
  occupancy_rate NUMERIC,
  reservations_active BIGINT,
  revenue NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_rooms INT;
BEGIN
  -- TODO(J phase): Get actual active room count
  v_total_rooms := 5;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE AS d
  ),
  daily_ranges AS (
    SELECT
      ds.d,
      COUNT(r.id) AS active_reservations,
      COALESCE(SUM(r.total_price / NULLIF(r.nights, 0)), 0) AS daily_revenue
    FROM date_series ds
    LEFT JOIN public.reservations r
      ON r.tenant_id = p_tenant_id
      AND r.check_in_date <= ds.d
      AND r.check_out_date > ds.d
      AND r.status IN ('confirmed', 'checked_in', 'checked_out')
    GROUP BY ds.d
  )
  SELECT
    dr.d AS date,
    dr.active_reservations AS occupied_rooms,
    v_total_rooms AS total_rooms,
    ROUND(
      (dr.active_reservations::NUMERIC / NULLIF(v_total_rooms, 0)) * 100, 
      1
    ) AS occupancy_rate,
    dr.active_reservations AS reservations_active,
    ROUND(dr.daily_revenue, 2) AS revenue
  FROM daily_ranges dr
  ORDER BY dr.d;
END;
$$;

-- ─── 3. Grant execute permissions ─────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.get_occupancy_report TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_occupancy TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Schema Gap Documentation (for J phase)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- TODO: `room_pricing` table does not exist yet.
--   Required for: per-date pricing, seasonal rates, dynamic pricing.
--   Expected columns: id, room_id, date, price, is_peak, created_at
--
-- TODO: Replace hardcoded room count (5) with dynamic query from rooms table.
--   SELECT COUNT(*) FROM public.rooms WHERE tenant_id = p_tenant_id AND is_active = true
--
-- TODO(J phase): Add Iyzico payment data for actual revenue reconciliation.
--   Current revenue = sum(reservations.total_price) which may include unpaid bookings.
--   Future: JOIN with payment_records table for confirmed revenue only.
--
-- TODO: Add year-over-year comparison support.
-- ═══════════════════════════════════════════════════════════════════════════════
