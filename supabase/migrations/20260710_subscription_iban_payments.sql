-- Resepsiyonistim: subscription_iban_payments
-- IBAN ile yapılan abonelik ödemelerini takip eder.
-- Her kayıt bir işletme sahibinin havale/EFT bildirimini temsil eder.

CREATE TABLE IF NOT EXISTS subscription_iban_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  iban_last4 TEXT NOT NULL,
  bank_name TEXT,
  reference_code TEXT NOT NULL UNIQUE,
  receipt_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_iban_tenant ON subscription_iban_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_iban_status ON subscription_iban_payments(status);
CREATE INDEX IF NOT EXISTS idx_sub_iban_reference ON subscription_iban_payments(reference_code);

-- RLS
ALTER TABLE subscription_iban_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own payments"
  ON subscription_iban_payments FOR SELECT
  USING (tenant_id = auth.uid()::uuid);

CREATE POLICY "Tenants can insert own payments"
  ON subscription_iban_payments FOR INSERT
  WITH CHECK (tenant_id = auth.uid()::uuid);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_sub_iban_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_sub_iban_updated_at ON subscription_iban_payments;
CREATE TRIGGER trg_sub_iban_updated_at
  BEFORE UPDATE ON subscription_iban_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_sub_iban_updated_at();
