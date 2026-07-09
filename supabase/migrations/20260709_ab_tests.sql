-- ═══════════════════════════════════════════════════════════════════════════════
-- A/B Test Infrastructure for AI Response Quality
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. ab_tests table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  variant_a_name TEXT NOT NULL DEFAULT 'Kontrol',
  variant_b_name TEXT NOT NULL DEFAULT 'Tedavi',
  target_metric TEXT NOT NULL DEFAULT 'satisfaction_score'
    CHECK (target_metric IN ('satisfaction_score', 'completion_rate', 'response_time', 'conversion_rate')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_tenant_id ON public.ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON public.ab_tests(is_active);

-- ─── 2. ab_test_results table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control', 'treatment')),
  satisfaction_score NUMERIC(3,1) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 5),
  completion_rate NUMERIC(5,2) CHECK (completion_rate >= 0 AND completion_rate <= 100),
  response_time_seconds INTEGER CHECK (response_time_seconds >= 0),
  message_count INTEGER CHECK (message_count >= 0),
  was_handoff BOOLEAN NOT NULL DEFAULT false,
  converted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON public.ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_tenant_id ON public.ab_test_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant ON public.ab_test_results(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_conversation ON public.ab_test_results(conversation_id);

-- ─── 3. Function: assign random variant ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_ab_test_variant(
  p_tenant_id UUID,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_test_id UUID;
  v_variant TEXT;
  v_count INTEGER;
BEGIN
  -- Find the first active A/B test for this tenant
  SELECT id INTO v_active_test_id
  FROM public.ab_tests
  WHERE tenant_id = p_tenant_id AND is_active = true
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_active_test_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if this conversation already has an assignment
  IF p_conversation_id IS NOT NULL THEN
    SELECT variant INTO v_variant
    FROM public.ab_test_results
    WHERE test_id = v_active_test_id AND conversation_id = p_conversation_id
    LIMIT 1;

    IF v_variant IS NOT NULL THEN
      RETURN v_variant;
    END IF;
  END IF;

  -- Count existing assignments for each variant
  SELECT COUNT(*) INTO v_count
  FROM public.ab_test_results
  WHERE test_id = v_active_test_id;

  -- First result goes to control; then alternate for balance
  -- Actually use modulo for deterministic-ish balancing
  IF v_count % 2 = 0 THEN
    v_variant := 'control';
  ELSE
    v_variant := 'treatment';
  END IF;

  -- Seed the result row (scores will be updated later)
  INSERT INTO public.ab_test_results (
    test_id, tenant_id, conversation_id, variant
  ) VALUES (
    v_active_test_id, p_tenant_id, p_conversation_id, v_variant
  );

  RETURN v_variant;
END;
$$;

-- ─── 4. Function: get A/B test summary stats ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_ab_test_summary(p_test_id UUID)
RETURNS TABLE (
  variant TEXT,
  total_count BIGINT,
  avg_satisfaction NUMERIC,
  avg_completion_rate NUMERIC,
  avg_response_time NUMERIC,
  handoff_rate NUMERIC,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.variant,
    COUNT(*)::BIGINT AS total_count,
    ROUND(AVG(r.satisfaction_score)::NUMERIC, 2) AS avg_satisfaction,
    ROUND(AVG(r.completion_rate)::NUMERIC, 2) AS avg_completion_rate,
    ROUND(AVG(r.response_time_seconds)::NUMERIC, 0) AS avg_response_time,
    ROUND(
      (COUNT(*) FILTER (WHERE r.was_handoff)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100,
      2
    ) AS handoff_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE r.converted)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100,
      2
    ) AS conversion_rate
  FROM public.ab_test_results r
  WHERE r.test_id = p_test_id
  GROUP BY r.variant
  ORDER BY r.variant;
END;
$$;

-- ─── 5. RLS Policies ──────────────────────────────────────────────────────────
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_results ENABLE ROW LEVEL SECURITY;

-- Tenant owners can manage their A/B tests
CREATE POLICY "Tenant owners can view own ab_tests"
  ON public.ab_tests
  FOR SELECT
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owners can manage own ab_tests"
  ON public.ab_tests
  FOR ALL
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

-- Tenant owners can view results
CREATE POLICY "Tenant owners can view own ab_test_results"
  ON public.ab_test_results
  FOR SELECT
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owners can insert ab_test_results"
  ON public.ab_test_results
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owners can update own ab_test_results"
  ON public.ab_test_results
  FOR UPDATE
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );
