-- ═══════════════════════════════════════════════════════════════════════════════
-- Referral Program Infrastructure
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Referrals table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referrer_name TEXT NOT NULL,
  referrer_phone TEXT NOT NULL,
  referee_name TEXT,
  referee_phone TEXT,
  referee_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','converted','rewarded','expired')),
  reward_type TEXT NOT NULL DEFAULT 'discount' CHECK (reward_type IN ('discount','credit','free_night','cash')),
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  reward_currency TEXT NOT NULL DEFAULT 'TRY',
  reward_claimed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_tenant_id ON public.referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_phone ON public.referrals(referrer_phone);

-- ─── 2. referral_codes table (unique per tenant) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'discount' CHECK (reward_type IN ('discount','credit','free_night','cash')),
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  reward_currency TEXT NOT NULL DEFAULT 'TRY',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_tenant_id ON public.referral_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- ─── 3. RLS Policies ──────────────────────────────────────────────────────────
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Referrals: tenant owners can see all their own referrals
CREATE POLICY "Tenant owners can view own referrals"
  ON public.referrals
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenant owners can insert referrals"
  ON public.referrals
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenant owners can update own referrals"
  ON public.referrals
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

-- Referral codes: tenant owners can manage their codes
CREATE POLICY "Tenant owners can view own referral codes"
  ON public.referral_codes
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenant owners can manage own referral codes"
  ON public.referral_codes
  FOR ALL
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

-- ─── 4. Function: generate referral code ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_referral_code(
  p_tenant_id UUID,
  p_description TEXT DEFAULT NULL,
  p_reward_type TEXT DEFAULT 'discount',
  p_reward_amount NUMERIC DEFAULT 500.00,
  p_reward_currency TEXT DEFAULT 'TRY',
  p_max_uses INTEGER DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 10;
BEGIN
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    BEGIN
      INSERT INTO public.referral_codes (
        tenant_id, code, description, reward_type, reward_amount,
        reward_currency, max_uses, expires_at
      ) VALUES (
        p_tenant_id, v_code, p_description, p_reward_type, p_reward_amount,
        p_reward_currency, p_max_uses, p_expires_at
      );
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts >= v_max_attempts THEN
        RAISE EXCEPTION 'Could not generate unique referral code after % attempts', v_max_attempts;
      END IF;
    END;
  END LOOP;
END;
$$;
