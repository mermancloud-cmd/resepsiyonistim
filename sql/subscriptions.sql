-- ─────────────────────────────────────────────────────────────────────────────
-- Bungalov AI – Subscription Tables (IYZICO)
-- For SaaS subscription payments only. Guest reservations use IBAN/havale.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('starter', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'none' CHECK (
    status IN ('none', 'trial', 'active', 'past_due', 'cancelled', 'expired')
  ),
  iyzico_subscription_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id
  ON public.subscriptions (tenant_id);

-- Index for status queries (cron jobs, billing)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions (status)
  WHERE status IN ('active', 'trial', 'past_due');

-- 2. Trial invites table (invite-based activation, not auto-activate)
CREATE TABLE IF NOT EXISTS public.trial_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('starter', 'pro', 'enterprise')),
  trial_days INTEGER NOT NULL DEFAULT 14,
  used_by_tenant_id TEXT,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'admin'
);

-- Index for code lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_trial_invites_code
  ON public.trial_invites (UPPER(code));

-- Index for unused invites
CREATE INDEX IF NOT EXISTS idx_trial_invites_unused
  ON public.trial_invites (used_by_tenant_id)
  WHERE used_by_tenant_id IS NULL;

-- 3. IYZICO payment logs (for reconciliation and debugging)
CREATE TABLE IF NOT EXISTS public.iyzico_payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  token TEXT,
  plan_id TEXT,
  amount NUMERIC(10, 2),
  currency TEXT DEFAULT 'TRY',
  status TEXT NOT NULL CHECK (status IN ('initiated', 'success', 'failure')),
  error_code TEXT,
  error_message TEXT,
  iyzico_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iyzico_logs_tenant_id
  ON public.iyzico_payment_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_iyzico_logs_conversation_id
  ON public.iyzico_payment_logs (conversation_id);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- 5. RLS policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iyzico_payment_logs ENABLE ROW LEVEL SECURITY;

-- Subscriptions: tenant can read own, service role manages all
CREATE POLICY "Tenants can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );

-- Trial invites: read only for validation (anyone with a code can check)
CREATE POLICY "Anyone can validate trial invite codes"
  ON public.trial_invites FOR SELECT
  USING (used_by_tenant_id IS NULL AND expires_at > now());

-- Payment logs: tenant can read own
CREATE POLICY "Tenants can view own payment logs"
  ON public.iyzico_payment_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );

-- 6. Seed: create sample trial invite codes for testing
INSERT INTO public.trial_invites (code, plan_id, trial_days, created_by)
VALUES
  ('BUNGALOV14', 'pro', 14, 'seed'),
  ('START-7DAY', 'starter', 7, 'seed'),
  ('ENTERPRISE30', 'enterprise', 30, 'seed')
ON CONFLICT (code) DO NOTHING;

-- 7. Comment
COMMENT ON TABLE public.subscriptions IS
  'SaaS subscription state per tenant. IYZICO-only (NOT for guest reservation payments).';

COMMENT ON TABLE public.trial_invites IS
  'Invite-based trial activation codes. Not auto-activated on registration.';

COMMENT ON TABLE public.iyzico_payment_logs IS
  'IYZICO payment audit trail for reconciliation and debugging.';
