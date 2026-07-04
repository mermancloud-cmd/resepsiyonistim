-- =============================================================================
-- Push Subscriptions Table
-- Bungalov Yönetim Paneli - Push Bildirim Abonelikleri
-- =============================================================================

-- Tabloyu oluştur
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'telegram', 'whatsapp')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Aboneliğin benzersiz olması için (endpoint bazında)
  CONSTRAINT unique_subscription_endpoint UNIQUE (tenant_id, platform)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_id ON push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_platform ON push_subscriptions(platform);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled ON push_subscriptions(enabled);

-- updated_at trigger'ı
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- RLS'yi etkinleştir
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi tenant'larına ait kayıtları görebilir
CREATE POLICY "Tenant izolasyonu - SELECT"
  ON push_subscriptions
  FOR SELECT
  USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Kullanıcılar sadece kendi tenant'larına kayıt ekleyebilir
CREATE POLICY "Tenant izolasyonu - INSERT"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Kullanıcılar sadece kendi tenant'larına ait kayıtları güncelleyebilir
CREATE POLICY "Tenant izolasyonu - UPDATE"
  ON push_subscriptions
  FOR UPDATE
  USING (tenant_id::text = auth.jwt() ->> 'tenant_id')
  WITH CHECK (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- Kullanıcılar sadece kendi tenant'larına ait kayıtları silebilir
CREATE POLICY "Tenant izolasyonu - DELETE"
  ON push_subscriptions
  FOR DELETE
  USING (tenant_id::text = auth.jwt() ->> 'tenant_id');

-- =============================================================================
-- Service Role erişimi (API sunucu tarafı işlemleri için)
-- NOT: Service role key RLS'yi bypass eder, bu ek politika gerektirmez
-- =============================================================================
