-- ═══════════════════════════════════════════════════════════════════════════════
-- P2 - Banka Entegrasyon Altyapisi: bank_accounts table
-- ═══════════════════════════════════════════════════════════════════════════════
-- Her facility birden fazla banka hesabına sahip olabilir.
-- IBAN, TR/IBAN validation helper (client-side) ile doğrulanır.
-- Rollback: DROP TABLE IF EXISTS public.bank_accounts CASCADE;
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. bank_accounts table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  branch_name TEXT,
  account_holder TEXT NOT NULL,
  iban TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY' CHECK (currency IN ('TRY','EUR','USD','GBP','CHF','RUB','AED')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  swift_code TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, iban)
);

COMMENT ON TABLE public.bank_accounts IS 'Facility-linked bank accounts for IBAN payment collection';
COMMENT ON COLUMN public.bank_accounts.iban IS 'Full IBAN number (TR format or international)';
COMMENT ON COLUMN public.bank_accounts.facility_id IS 'NULL = available to all facilities';
COMMENT ON COLUMN public.bank_accounts.swift_code IS 'BIC/SWIFT for international transfers (optional)';

CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant_id ON public.bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_facility_id ON public.bank_accounts(facility_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON public.bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON public.bank_accounts(is_default);

-- ─── 2. Auto-update updated_at trigger ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_bank_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_account_timestamp();

-- ─── 3. Enforce single default per tenant (trigger) ─────────────────────────
-- When a bank account is set as default, unset all others for that tenant

CREATE OR REPLACE FUNCTION public.enforce_single_default_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.bank_accounts
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bank_accounts_single_default ON public.bank_accounts;
CREATE TRIGGER trg_bank_accounts_single_default
  AFTER INSERT OR UPDATE OF is_default
  ON public.bank_accounts
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_bank_account();

-- ─── 4. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant users can see their own bank accounts
CREATE POLICY "bank_accounts_select_tenant" ON public.bank_accounts
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- INSERT: tenant users can create
CREATE POLICY "bank_accounts_insert_tenant" ON public.bank_accounts
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- UPDATE: tenant users can update
CREATE POLICY "bank_accounts_update_tenant" ON public.bank_accounts
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- DELETE: tenant users can delete
CREATE POLICY "bank_accounts_delete_tenant" ON public.bank_accounts
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ─── ROLLBACK ───────────────────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_bank_accounts_single_default ON public.bank_accounts;
-- DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON public.bank_accounts;
-- DROP FUNCTION IF EXISTS public.enforce_single_default_bank_account();
-- DROP FUNCTION IF EXISTS public.update_bank_account_timestamp();
-- DROP TABLE IF EXISTS public.bank_accounts CASCADE;
