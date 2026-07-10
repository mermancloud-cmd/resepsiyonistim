-- ═══════════════════════════════════════════════════════════════════════════════
-- P1(v4) — Web Widget channel + channel_metrics table
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add web_widget to channels CHECK constraint ─────────────────────────
ALTER TABLE IF EXISTS public.channels
  DROP CONSTRAINT IF EXISTS channels_channel_type_check;

ALTER TABLE IF EXISTS public.channels
  ADD CONSTRAINT channels_channel_type_check
  CHECK (channel_type IN ('whatsapp', 'telegram', 'facebook_messenger', 'web_widget'));

-- ─── 2. Add web_widget to conversations.channel_type CHECK ─────────────────
ALTER TABLE IF EXISTS public.conversations
  DROP CONSTRAINT IF EXISTS conversations_channel_type_check;

ALTER TABLE IF EXISTS public.conversations
  ADD CONSTRAINT conversations_channel_type_check
  CHECK (channel_type IN ('whatsapp', 'telegram', 'facebook_messenger', 'web_widget'));

-- ─── 3. channel_metrics table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channel_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_inbound INTEGER NOT NULL DEFAULT 0,
  messages_outbound INTEGER NOT NULL DEFAULT 0,
  active_conversations INTEGER NOT NULL DEFAULT 0,
  avg_response_time_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  handoff_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(channel_id, date)
);

CREATE INDEX IF NOT EXISTS idx_channel_metrics_tenant ON public.channel_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_date ON public.channel_metrics(channel_id, date);

ALTER TABLE public.channel_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY channel_metrics_tenant_isolation ON public.channel_metrics
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY channel_metrics_service_all ON public.channel_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- ─── 4. Seed web_widget channel for existing tenant ─────────────────────────
INSERT INTO public.channels (tenant_id, channel_type, name, is_active, settings)
SELECT id, 'web_widget', 'Web Widget', true,
  '{
    "greeting_message": "Merhaba! Sitemize hoş geldiniz. Size nasıl yardımcı olabilirim?",
    "auto_reply_enabled": true,
    "notification_enabled": true,
    "working_hours": {"enabled": true, "start": "09:00", "end": "23:00", "timezone": "Europe/Istanbul"},
    "handoff_keywords": ["müdür", "şikayet", "yetkili", "konuşmak"],
    "welcome_message_enabled": true
  }'::jsonb
FROM public.tenants
WHERE id = '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999'
ON CONFLICT (tenant_id, channel_type, name) DO NOTHING;

-- ─── 5. Seed channel_metrics placeholder rows for dashboard ─────────────────
INSERT INTO public.channel_metrics (tenant_id, channel_id, date, messages_inbound, messages_outbound, active_conversations, avg_response_time_seconds, handoff_count)
SELECT
  c.tenant_id,
  c.id,
  d.d,
  0, 0, 0, 0, 0
FROM public.channels c
CROSS JOIN (
  SELECT CURRENT_DATE - s.d AS d
  FROM generate_series(0, 6) AS s(d)
) d
WHERE c.tenant_id = '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999'
ON CONFLICT (channel_id, date) DO NOTHING;
