-- ═══════════════════════════════════════════════════════════════════════════════
-- Analytics Events for Customer Behavior Tracking
-- ═══════════════════════════════════════════════════════════════════════════════
-- Hedef: Musteri davranis analitigi icin event tracking altyapisi.
-- Olay turleri: page_view, feature_click, conversation_start,
--              reservation_initiate, payment_initiate, human_handoff
-- Guvenlik: PII icermez, 90 gun otomatik retention.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. analytics_events table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id    TEXT NOT NULL,                          -- Tarayici/cihaz oturumu
  event_type    TEXT NOT NULL
    CHECK (event_type IN (
      'page_view',
      'feature_click',
      'conversation_start',
      'reservation_initiate',
      'payment_initiate',
      'human_handoff'
    )),
  page_path     TEXT,                                    -- Hangi sayfa (page_view icin)
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,     -- Event'e ozel ek veri
    -- Ornekler:
    -- page_view:    {"referrer": "...", "device": "mobile", "duration_ms": 12000}
    -- feature_click: {"feature": "ai_toggle", "value": "off"}
    -- conversation_start: {"source": "whatsapp", "room_id": "..."}
    -- reservation_initiate: {"room_id": "...", "date_from": "...", "date_to": "..."}
    -- payment_initiate: {"amount": 2500, "method": "iban"}
  user_id       UUID,                                   -- Opsiyonel: giris yapmissa
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_created
  ON public.analytics_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_type
  ON public.analytics_events (tenant_id, event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON public.analytics_events (session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created
  ON public.analytics_events (created_at);

-- ─── 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Adminler sadece kendi tenant'larinin eventlerini gorebilir
CREATE POLICY analytics_events_tenant_select ON public.analytics_events
  FOR SELECT
  USING (
    tenant_id = (
      SELECT (raw_user_meta_data()->>'tenant_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Adminler kendi tenant'larina event ekleyebilir
CREATE POLICY analytics_events_tenant_insert ON public.analytics_events
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT (raw_user_meta_data()->>'tenant_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Service role bypass (full access)
-- Anon key: tenant_id check via RLS

-- ─── 4. 90-day retention (pg_cron ile) ────────────────────────────────────────
-- NOT: pg_cron supabase'de managed olarak calisiyor.
-- Asagidaki komut SQL Editor'den calistirilmalidir:
--
--   SELECT cron.schedule(
--     'analytics-events-retention',
--     '0 3 * * *',  -- Her gun 03:00 UTC
--     $$DELETE FROM public.analytics_events
--       WHERE created_at < now() - interval '90 days'$$
--   );

-- ─── 5. Aggregation helper: gunluk page views ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_page_views(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  count BIGINT,
  unique_sessions BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    created_at::DATE AS date,
    COUNT(*)::BIGINT AS count,
    COUNT(DISTINCT session_id)::BIGINT AS unique_sessions
  FROM public.analytics_events
  WHERE tenant_id = p_tenant_id
    AND event_type = 'page_view'
    AND created_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY created_at::DATE
  ORDER BY date DESC;
$$;

-- ─── 6. Aggregation helper: event funnel ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_event_funnel(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  event_type TEXT,
  count BIGINT,
  conversion_from_previous NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  WITH event_counts AS (
    SELECT
      event_type,
      COUNT(*)::BIGINT AS count
    FROM public.analytics_events
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days || ' days')::INTERVAL
    GROUP BY event_type
  ),
  funnel_order AS (
    SELECT * FROM (VALUES
      ('page_view', 1),
      ('feature_click', 2),
      ('conversation_start', 3),
      ('reservation_initiate', 4),
      ('payment_initiate', 5),
      ('human_handoff', 6)
    ) AS t(event_type, ord)
  )
  SELECT
    f.event_type,
    COALESCE(ec.count, 0)::BIGINT AS count,
    CASE
      WHEN LAG(ec.count) OVER (ORDER BY f.ord) > 0
      THEN ROUND(
        (ec.count::NUMERIC / LAG(ec.count) OVER (ORDER BY f.ord)) * 100,
        1
      )
      ELSE 0
    END AS conversion_from_previous
  FROM funnel_order f
  LEFT JOIN event_counts ec USING (event_type)
  ORDER BY f.ord;
$$;

-- ─── 7. Aggregation helper: feature adoption ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_feature_adoption(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  feature TEXT,
  click_count BIGINT,
  unique_sessions BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    metadata->>'feature' AS feature,
    COUNT(*)::BIGINT AS click_count,
    COUNT(DISTINCT session_id)::BIGINT AS unique_sessions
  FROM public.analytics_events
  WHERE tenant_id = p_tenant_id
    AND event_type = 'feature_click'
    AND created_at >= now() - (p_days || ' days')::INTERVAL
    AND metadata ? 'feature'
  GROUP BY metadata->>'feature'
  ORDER BY click_count DESC;
$$;

-- ─── 8. Daily active users (session bazinda) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_active_users(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  active_sessions BIGINT,
  page_views BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    created_at::DATE AS date,
    COUNT(DISTINCT session_id)::BIGINT AS active_sessions,
    COUNT(*) FILTER (WHERE event_type = 'page_view')::BIGINT AS page_views
  FROM public.analytics_events
  WHERE tenant_id = p_tenant_id
    AND created_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY created_at::DATE
  ORDER BY date DESC;
$$;
