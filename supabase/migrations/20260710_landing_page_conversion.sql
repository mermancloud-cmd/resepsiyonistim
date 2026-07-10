-- ═══════════════════════════════════════════════════════════════════════════════
-- K11 — Landing Page Conversion Analytics
-- ═══════════════════════════════════════════════════════════════════════════════
-- landing_page_events: stores visitor interaction events for conversion funnel
-- Event types: page_view, cta_click, social_proof_view, signup_started,
--              signup_completed, trial_activated, trust_badge_click
-- Rollback: DROP TABLE IF EXISTS landing_page_events CASCADE;
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. landing_page_events table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_page_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Event type
  event_type    TEXT NOT NULL CHECK (event_type IN (
    'page_view',
    'cta_click',
    'social_proof_view',
    'signup_started',
    'signup_completed',
    'trial_activated',
    'trust_badge_click',
    'faq_expand',
    'testimonial_scroll'
  )),

  -- Anonymous visitor tracking (client-side fingerprint / session id)
  visitor_id    TEXT NOT NULL DEFAULT '',
  session_id    TEXT,

  -- Referrer / campaign tracking
  referrer      TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  utm_term      TEXT,

  -- Page / element context
  page_path     TEXT NOT NULL DEFAULT '/',
  element_id    TEXT,
  element_text  TEXT,

  -- Device / browser info
  user_agent    TEXT,
  screen_width  INT,
  screen_height INT,
  language      TEXT,

  -- Timing
  time_on_page_seconds INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_landing_events_tenant_created
  ON public.landing_page_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_events_type
  ON public.landing_page_events (tenant_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_events_visitor
  ON public.landing_page_events (tenant_id, visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_events_utm
  ON public.landing_page_events (tenant_id, utm_source, created_at DESC);

-- ─── 3. Row-Level Security ──────────────────────────────────────────────────
ALTER TABLE public.landing_page_events ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: users see only their own tenant's data
CREATE POLICY landing_events_tenant_isolation ON public.landing_page_events
  FOR ALL
  USING (tenant_id = auth.get_tenant_id());

-- Service role can insert for any tenant (used by API routes)
CREATE POLICY landing_events_service_insert ON public.landing_page_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Public anon can only insert page_view / cta_click (client-side tracking)
CREATE POLICY landing_events_anon_insert ON public.landing_page_events
  FOR INSERT
  TO anon
  WITH CHECK (
    event_type IN ('page_view', 'cta_click', 'social_proof_view', 'trust_badge_click', 'faq_expand', 'testimonial_scroll')
  );

-- ─── 4. Helper function: get_conversion_funnel ──────────────────────────────
-- Returns the conversion funnel for a given tenant and date range
CREATE OR REPLACE FUNCTION public.get_conversion_funnel(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date   TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  stage       TEXT,
  count       BIGINT,
  rate        NUMERIC
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view')
        AS total_visitors,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'cta_click')
        AS cta_clicks,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'signup_started')
        AS signups_started,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'signup_completed')
        AS signups_completed,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'trial_activated')
        AS trials_activated
    FROM public.landing_page_events
    WHERE tenant_id = p_tenant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  )
  SELECT 'Ziyaretçi' AS stage, total_visitors, 100.0
  FROM stats
  UNION ALL
  SELECT 'CTA Tıklama', cta_clicks,
    CASE WHEN total_visitors > 0
      THEN ROUND((cta_clicks::NUMERIC / total_visitors) * 100, 1)
      ELSE 0 END
  FROM stats
  UNION ALL
  SELECT 'Kayıt Başladı', signups_started,
    CASE WHEN total_visitors > 0
      THEN ROUND((signups_started::NUMERIC / total_visitors) * 100, 1)
      ELSE 0 END
  FROM stats
  UNION ALL
  SELECT 'Kayıt Tamamlandı', signups_completed,
    CASE WHEN signups_started > 0
      THEN ROUND((signups_completed::NUMERIC / signups_started) * 100, 1)
      ELSE 0 END
  FROM stats
  UNION ALL
  SELECT 'Deneme Aktif', trials_activated,
    CASE WHEN signups_completed > 0
      THEN ROUND((trials_activated::NUMERIC / signups_completed) * 100, 1)
      ELSE 0 END
  FROM stats;
END;
$$;

-- ─── 5. Helper function: get_cro_element_stats ──────────────────────────────
-- Returns interaction stats for CRO elements (social proof, trust badges, etc.)
CREATE OR REPLACE FUNCTION public.get_cro_element_stats(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date   TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  element_type  TEXT,
  event_type    TEXT,
  total_views   BIGINT,
  unique_visitors BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(e.element_id, e.event_type) AS element_type,
    e.event_type,
    COUNT(*)::BIGINT AS total_views,
    COUNT(DISTINCT e.visitor_id)::BIGINT AS unique_visitors
  FROM public.landing_page_events e
  WHERE e.tenant_id = p_tenant_id
    AND e.created_at >= p_start_date
    AND e.created_at <= p_end_date
    AND e.event_type IN ('social_proof_view', 'trust_badge_click', 'faq_expand', 'testimonial_scroll')
  GROUP BY element_type, e.event_type
  ORDER BY total_views DESC;
END;
$$;

-- ─── 6. Helper function: get_daily_visitor_stats ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_visitor_stats(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date   TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  date        DATE,
  page_views  BIGINT,
  unique_visitors BIGINT,
  cta_clicks  BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.created_at::DATE AS date,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::BIGINT AS page_views,
    COUNT(DISTINCT e.visitor_id)::BIGINT AS unique_visitors,
    COUNT(*) FILTER (WHERE e.event_type = 'cta_click')::BIGINT AS cta_clicks
  FROM public.landing_page_events e
  WHERE e.tenant_id = p_tenant_id
    AND e.created_at >= p_start_date
    AND e.created_at <= p_end_date
  GROUP BY e.created_at::DATE
  ORDER BY date;
END;
$$;
