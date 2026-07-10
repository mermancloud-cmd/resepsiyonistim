-- ═══════════════════════════════════════════════════════════════════════════════
-- M5 - Telegram Bot / Facebook Messenger Entegrasyonu Migration
-- ═══════════════════════════════════════════════════════════════════════════════
-- channels tablosu + conversation.channel alanı + channel_settings
-- Rollback: DROP TABLE channels CASCADE;
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. channels table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'telegram', 'facebook_messenger')),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Telegram-specific
  bot_token TEXT,
  bot_username TEXT,
  -- Facebook-specific
  page_id TEXT,
  verify_token TEXT,
  app_secret TEXT,
  -- Common
  webhook_url TEXT,
  webhook_verified_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, channel_type, name)
);

COMMENT ON TABLE public.channels IS 'Connected communication channels per tenant';
COMMENT ON COLUMN public.channels.settings IS 'JSONB: greeting_message, auto_reply_enabled, notification_preferences, etc.';

CREATE INDEX IF NOT EXISTS idx_channels_tenant_id ON public.channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channels_type_active ON public.channels(channel_type, is_active);

-- ─── 2. Add channel_type to conversations ──────────────────────────────────
ALTER TABLE IF EXISTS public.conversations
  ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (channel_type IN ('whatsapp', 'telegram', 'facebook_messenger'));

ALTER TABLE IF EXISTS public.conversations
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_type ON public.conversations(channel_type);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_id ON public.conversations(channel_id);

-- ─── 3. tenant_settings için bildirim & kanal ayarları kolonları ──────────
ALTER TABLE IF EXISTS public.tenant_settings
  ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS fb_page_id TEXT,
  ADD COLUMN IF NOT EXISTS fb_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS fb_app_secret TEXT,
  ADD COLUMN IF NOT EXISTS notification_channels TEXT[] NOT NULL DEFAULT '{}'
    CHECK (notification_channels <@ ARRAY['telegram','whatsapp','webpush']::text[]);

-- ─── 4. Auto-update trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_channel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_channels_updated_at ON public.channels;
CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_channel_timestamp();

-- ─── 5. RLS policies ───────────────────────────────────────────────────────
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: owners see only their own channels
CREATE POLICY channels_tenant_isolation ON public.channels
  USING (tenant_id IN (
    SELECT id FROM public.tenants WHERE owner_id = auth.uid()
  ));

-- Service role bypass for webhook handlers
CREATE POLICY channels_service_all ON public.channels
  FOR ALL USING (true)
  WITH CHECK (true);

-- ─── 6. RPC: increment_conversation_count ────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_conversation_count(conv_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversations
  SET
    message_count = message_count + 1,
    updated_at = now()
  WHERE id = conv_id;
END;
$$;

-- ─── 7. Seed: create WhatsApp channel for existing tenant ──────────────────
INSERT INTO public.channels (tenant_id, channel_type, name, is_active, settings)
SELECT id, 'whatsapp', 'WhatsApp', true,
  '{"greeting_message": "Merhaba! Size nasıl yardımcı olabiliriz?", "auto_reply_enabled": true}'::jsonb
FROM public.tenants
WHERE id = '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999'
ON CONFLICT (tenant_id, channel_type, name) DO NOTHING;
