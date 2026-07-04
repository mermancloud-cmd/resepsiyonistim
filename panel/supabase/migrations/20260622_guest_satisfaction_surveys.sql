-- ============================================================================
-- Guest Satisfaction Surveys Table
-- ============================================================================
-- Stores guest satisfaction survey responses linked to conversations.
-- Used by the owner panel Analytics page to display real satisfaction metrics.
--
-- Run via Supabase Dashboard → SQL Editor
-- ============================================================================

-- ─── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.guest_satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  category_tags TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_surveys_tenant_id
  ON public.guest_satisfaction_surveys (tenant_id);

CREATE INDEX IF NOT EXISTS idx_surveys_created_at
  ON public.guest_satisfaction_surveys (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_surveys_conversation_id
  ON public.guest_satisfaction_surveys (conversation_id);

CREATE INDEX IF NOT EXISTS idx_surveys_rating
  ON public.guest_satisfaction_surveys (rating);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.guest_satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_satisfaction_surveys FORCE ROW LEVEL SECURITY;

-- Tenant isolation: SELECT
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.guest_satisfaction_surveys;
CREATE POLICY "tenant_isolation_select" ON public.guest_satisfaction_surveys
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id_legacy());

-- Tenant isolation: INSERT (for AI bot / webhook to insert survey responses)
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.guest_satisfaction_surveys;
CREATE POLICY "tenant_isolation_insert" ON public.guest_satisfaction_surveys
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

-- Tenant isolation: UPDATE
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.guest_satisfaction_surveys;
CREATE POLICY "tenant_isolation_update" ON public.guest_satisfaction_surveys
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id_legacy())
  WITH CHECK (tenant_id = public.get_user_tenant_id_legacy());

-- Tenant isolation: DELETE
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.guest_satisfaction_surveys;
CREATE POLICY "tenant_isolation_delete" ON public.guest_satisfaction_surveys
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id_legacy());

-- ─── Verification ───────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'guest_satisfaction_surveys';
-- Should show rowsecurity = true
