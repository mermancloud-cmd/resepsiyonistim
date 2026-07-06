-- ═══════════════════════════════════════════════════════════════════════════════
-- Self-Service Signup + Auto Trial
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 0. Schema updates ─────────────────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);

-- ─── 1. Create subscriptions table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'pro',
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('none','trial','active','past_due','cancelled','expired')),
  iyzico_subscription_id TEXT,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ─── 2. RPC: signup_tenant ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.signup_tenant(
  p_business_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_plan_id TEXT DEFAULT 'pro'
)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  onboarding_completed BOOLEAN,
  trial_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_trial_end TIMESTAMPTZ;
  v_trial_days INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE owner_id = v_user_id) THEN
    RAISE EXCEPTION 'Kullanıcının zaten bir tesisi var';
  END IF;

  v_trial_days := 14;
  IF p_plan_id = 'enterprise' THEN
    v_trial_days := 30;
  END IF;
  v_trial_end := now() + (v_trial_days || ' days')::INTERVAL;

  INSERT INTO tenants (owner_id, business_name, owner_name, phone, onboarding_completed, slug, plan, is_active, timezone, locale, created_at, updated_at)
  VALUES (v_user_id, p_business_name, COALESCE(p_phone, 'Yeni Kullanıcı'), p_phone, false, lower(regexp_replace(p_business_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || substr(md5(random()::text), 1, 6), 'starter', true, 'Europe/Istanbul', 'tr', now(), now())
  RETURNING id INTO v_tenant_id;

  INSERT INTO subscriptions (
    tenant_id, plan_id, status,
    trial_start, trial_end,
    current_period_start, current_period_end,
    created_at, updated_at
  ) VALUES (
    v_tenant_id, p_plan_id, 'trial',
    now(), v_trial_end,
    now(), v_trial_end,
    now(), now()
  );

  RETURN QUERY
  SELECT t.id, t.business_name, COALESCE(t.onboarding_completed, false), v_trial_end
  FROM tenants t
  WHERE t.id = v_tenant_id;
END;
$$;

-- ─── 3. RLS for tenants table ──────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own" ON public.tenants;
CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenant_insert_own" ON public.tenants;
CREATE POLICY "tenant_insert_own" ON public.tenants
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenant_update_own" ON public.tenants;
CREATE POLICY "tenant_update_own" ON public.tenants
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─── 4. RLS for subscriptions table ────────────────────────────────────────────

ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "sub_select_own" ON public.subscriptions;
CREATE POLICY "sub_select_own" ON public.subscriptions
  FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "sub_insert_trial" ON public.subscriptions;
CREATE POLICY "sub_insert_trial" ON public.subscriptions
  FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "sub_update_own" ON public.subscriptions;
CREATE POLICY "sub_update_own" ON public.subscriptions
  FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
