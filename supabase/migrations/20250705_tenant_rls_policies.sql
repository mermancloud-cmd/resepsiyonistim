-- ============================================================================
-- Tenant-Scoped Row Level Security (RLS) for Owner Panel
-- ============================================================================
--
-- This migration enables RLS on all tenant-scoped tables and creates
-- policies that ensure each authenticated owner can only access data
-- belonging to their own tenant.
--
-- Architecture:
--   User (auth.users) → tenants.owner_id → tenant-scoped tables.tenant_id
--
-- The policy checks: 
--   1. User is authenticated (auth.role() = 'authenticated')
--   2. A tenant row exists where owner_id = auth.uid()
--   3. The queried row's tenant_id matches that tenant
--
-- Usage:
--   Run this migration via Supabase Dashboard → SQL Editor
--   Or: supabase db push (if using Supabase CLI)
--
-- IMPORTANT: This migration is idempotent (uses IF NOT EXISTS patterns)
-- ============================================================================

-- ─── Helper Function: Get current user's tenant_id ────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.tenants t
  WHERE t.owner_id = auth.uid()
  LIMIT 1;
$$;

-- Also check businesses table (legacy fallback)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id_legacy()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT t.id FROM public.tenants t WHERE t.owner_id = auth.uid() LIMIT 1),
    (SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid() LIMIT 1)
  );
$$;

-- ─── Enable RLS on tenant-scoped tables ──────────────────────────────────────

ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ibans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.owner_ibans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too (important for Supabase)
ALTER TABLE IF EXISTS public.properties FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_confirmations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ibans FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.owner_ibans FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events FORCE ROW LEVEL SECURITY;

-- ─── RLS Policies ────────────────────────────────────────────────────────────
-- Each table gets a SELECT, INSERT, UPDATE, DELETE policy

-- ─── Properties ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'tenant_id') THEN
    -- SELECT
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.properties;
    CREATE POLICY "tenant_isolation_select" ON public.properties
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id_legacy());

    -- INSERT
    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.properties;
    CREATE POLICY "tenant_isolation_insert" ON public.properties
      FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    -- UPDATE
    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.properties;
    CREATE POLICY "tenant_isolation_update" ON public.properties
      FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    -- DELETE
    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.properties;
    CREATE POLICY "tenant_isolation_delete" ON public.properties
      FOR DELETE
      USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Reservations ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.reservations;
    CREATE POLICY "tenant_isolation_select" ON public.reservations
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.reservations;
    CREATE POLICY "tenant_isolation_insert" ON public.reservations
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.reservations;
    CREATE POLICY "tenant_isolation_update" ON public.reservations
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.reservations;
    CREATE POLICY "tenant_isolation_delete" ON public.reservations
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Conversations ───────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.conversations;
    CREATE POLICY "tenant_isolation_select" ON public.conversations
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.conversations;
    CREATE POLICY "tenant_isolation_insert" ON public.conversations
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.conversations;
    CREATE POLICY "tenant_isolation_update" ON public.conversations
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.conversations;
    CREATE POLICY "tenant_isolation_delete" ON public.conversations
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Messages ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.messages;
    CREATE POLICY "tenant_isolation_select" ON public.messages
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.messages;
    CREATE POLICY "tenant_isolation_insert" ON public.messages
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.messages;
    CREATE POLICY "tenant_isolation_update" ON public.messages
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.messages;
    CREATE POLICY "tenant_isolation_delete" ON public.messages
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Payments ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.payments;
    CREATE POLICY "tenant_isolation_select" ON public.payments
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.payments;
    CREATE POLICY "tenant_isolation_insert" ON public.payments
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.payments;
    CREATE POLICY "tenant_isolation_update" ON public.payments
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.payments;
    CREATE POLICY "tenant_isolation_delete" ON public.payments
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Payment Confirmations ───────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_confirmations' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.payment_confirmations;
    CREATE POLICY "tenant_isolation_select" ON public.payment_confirmations
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.payment_confirmations;
    CREATE POLICY "tenant_isolation_insert" ON public.payment_confirmations
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.payment_confirmations;
    CREATE POLICY "tenant_isolation_update" ON public.payment_confirmations
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.payment_confirmations;
    CREATE POLICY "tenant_isolation_delete" ON public.payment_confirmations
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── IBANs ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ibans' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.ibans;
    CREATE POLICY "tenant_isolation_select" ON public.ibans
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.ibans;
    CREATE POLICY "tenant_isolation_insert" ON public.ibans
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.ibans;
    CREATE POLICY "tenant_isolation_update" ON public.ibans
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.ibans;
    CREATE POLICY "tenant_isolation_delete" ON public.ibans
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Owner IBANs ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_ibans' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.owner_ibans;
    CREATE POLICY "tenant_isolation_select" ON public.owner_ibans
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.owner_ibans;
    CREATE POLICY "tenant_isolation_insert" ON public.owner_ibans
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.owner_ibans;
    CREATE POLICY "tenant_isolation_update" ON public.owner_ibans
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.owner_ibans;
    CREATE POLICY "tenant_isolation_delete" ON public.owner_ibans
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── AI Settings ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_settings' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.ai_settings;
    CREATE POLICY "tenant_isolation_select" ON public.ai_settings
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.ai_settings;
    CREATE POLICY "tenant_isolation_insert" ON public.ai_settings
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.ai_settings;
    CREATE POLICY "tenant_isolation_update" ON public.ai_settings
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.ai_settings;
    CREATE POLICY "tenant_isolation_delete" ON public.ai_settings
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Push Subscriptions ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_subscriptions' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.push_subscriptions;
    CREATE POLICY "tenant_isolation_select" ON public.push_subscriptions
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.push_subscriptions;
    CREATE POLICY "tenant_isolation_insert" ON public.push_subscriptions
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.push_subscriptions;
    CREATE POLICY "tenant_isolation_update" ON public.push_subscriptions
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.push_subscriptions;
    CREATE POLICY "tenant_isolation_delete" ON public.push_subscriptions
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Analytics Events ────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.analytics_events;
    CREATE POLICY "tenant_isolation_select" ON public.analytics_events
      FOR SELECT USING (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.analytics_events;
    CREATE POLICY "tenant_isolation_insert" ON public.analytics_events
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.analytics_events;
    CREATE POLICY "tenant_isolation_update" ON public.analytics_events
      FOR UPDATE USING (tenant_id = public.get_user_tenant_id_legacy())
      WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.analytics_events;
    CREATE POLICY "tenant_isolation_delete" ON public.analytics_events
      FOR DELETE USING (tenant_id = public.get_user_tenant_id_legacy());
  END IF;
END $$;

-- ─── Tenants Table (owner can only see their own) ────────────────────────────

ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_can_select_own_tenant" ON public.tenants;
CREATE POLICY "owner_can_select_own_tenant" ON public.tenants
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_can_update_own_tenant" ON public.tenants;
CREATE POLICY "owner_can_update_own_tenant" ON public.tenants
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─── Businesses Table (owner can only see their own) ─────────────────────────

ALTER TABLE IF EXISTS public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.businesses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_can_select_own_business" ON public.businesses;
CREATE POLICY "owner_can_select_own_business" ON public.businesses
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_can_update_own_business" ON public.businesses;
CREATE POLICY "owner_can_update_own_business" ON public.businesses
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─── Index for Performance ──────────────────────────────────────────────────
-- Ensure tenant_id columns have indexes for fast RLS policy evaluation

CREATE INDEX IF NOT EXISTS idx_properties_tenant_id ON public.properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_id ON public.reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_tenant_id ON public.payment_confirmations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ibans_tenant_id ON public.ibans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_owner_ibans_tenant_id ON public.owner_ibans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_tenant_id ON public.ai_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_id ON public.push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_id ON public.analytics_events(tenant_id);

-- ─── Verification Query ─────────────────────────────────────────────────────
-- Run this after migration to verify RLS is enabled:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'properties', 'reservations', 'conversations', 'messages',
--     'payments', 'payment_confirmations', 'ibans', 'owner_ibans',
--     'ai_settings', 'push_subscriptions', 'analytics_events',
--     'tenants', 'businesses'
--   )
-- ORDER BY tablename;
--
-- All rows should show `rowsecurity = true`
