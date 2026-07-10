-- ═══════════════════════════════════════════════════════════════════════════════
-- I5(v4) Bridge Migration: A/B Test Optimization Pipeline
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. ab_test_variants: add trigger_type + winning_variant_id ──────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ab_test_variants'
      AND column_name = 'trigger_type'
  ) THEN
    ALTER TABLE public.ab_test_variants
      ADD COLUMN trigger_type TEXT DEFAULT 'auto'
      CHECK (trigger_type IN ('auto', 'manual'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ab_test_variants'
      AND column_name = 'winning_variant_id'
  ) THEN
    ALTER TABLE public.ab_test_variants
      ADD COLUMN winning_variant_id UUID REFERENCES public.ab_test_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 2. ab_test_optimizations table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ab_test_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  winner_variant_id UUID REFERENCES public.ab_test_variants(id) ON DELETE SET NULL,
  confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  sample_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  triggered_by TEXT NOT NULL DEFAULT 'manual'
    CHECK (triggered_by IN ('cron', 'manual')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_optimizations_test_id
  ON public.ab_test_optimizations(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_optimizations_tenant_id
  ON public.ab_test_optimizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_optimizations_status
  ON public.ab_test_optimizations(status);

-- ─── 3. tenant_settings: prompt_template column ──────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_settings'
      AND column_name = 'prompt_template'
  ) THEN
    ALTER TABLE public.tenant_settings
      ADD COLUMN prompt_template TEXT DEFAULT NULL;
  END IF;
END $$;

-- ─── 4. RLS Policies for ab_test_optimizations ───────────────────────────────

ALTER TABLE IF EXISTS public.ab_test_optimizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ab_test_optimizations_tenant_select" ON public.ab_test_optimizations;
DROP POLICY IF EXISTS "ab_test_optimizations_tenant_insert" ON public.ab_test_optimizations;
DROP POLICY IF EXISTS "ab_test_optimizations_tenant_update" ON public.ab_test_optimizations;

CREATE POLICY "ab_test_optimizations_tenant_select" ON public.ab_test_optimizations
  FOR SELECT
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "ab_test_optimizations_tenant_insert" ON public.ab_test_optimizations
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "ab_test_optimizations_tenant_update" ON public.ab_test_optimizations
  FOR UPDATE
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

-- ─── 5. View: ab_test_winner_history (denormalized for UI) ───────────────────

CREATE OR REPLACE VIEW public.ab_test_winner_history AS
SELECT
  o.id,
  o.test_id,
  t.name AS test_name,
  COALESCE(v.name, '—') AS winner_variant_name,
  t.target_metric AS winning_metric,
  NULL::NUMERIC AS metric_improvement,
  o.confidence_score,
  o.sample_size,
  o.triggered_by,
  o.applied_at,
  o.created_at
FROM public.ab_test_optimizations o
LEFT JOIN public.ab_tests t ON t.id = o.test_id
LEFT JOIN public.ab_test_variants v ON v.id = o.winner_variant_id
ORDER BY o.created_at DESC;

-- ─── 6. Function: auto_optimize_ab_test ──────────────────────────────────────
-- Determines winner via simple statistical comparison.
-- Returns optimization record id.

CREATE OR REPLACE FUNCTION public.auto_optimize_ab_test(
  p_test_id UUID,
  p_tenant_id UUID,
  p_triggered_by TEXT DEFAULT 'cron',
  p_min_sample_size INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test RECORD;
  v_summary RECORD;
  v_winner_id UUID;
  v_confidence NUMERIC(5,2);
  v_total_count INTEGER;
  v_control_avg NUMERIC;
  v_treatment_avg NUMERIC;
  v_improvement NUMERIC;
  v_optimization_id UUID;
  v_variant_a_id UUID;
  v_variant_b_id UUID;
BEGIN
  -- Get test info
  SELECT * INTO v_test FROM public.ab_tests WHERE id = p_test_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test bulunamadı: %', p_test_id;
  END IF;

  -- Get variant ids from ab_test_variants
  SELECT id INTO v_variant_a_id FROM public.ab_test_variants
    WHERE test_id = p_test_id AND is_control = true LIMIT 1;

  SELECT id INTO v_variant_b_id FROM public.ab_test_variants
    WHERE test_id = p_test_id AND is_control = false LIMIT 1;

  -- Get aggregated summary
  SELECT
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE variant = 'control') AS control_count,
    COUNT(*) FILTER (WHERE variant = 'treatment') AS treatment_count,
    AVG(satisfaction_score) FILTER (WHERE variant = 'control') AS control_satisfaction,
    AVG(satisfaction_score) FILTER (WHERE variant = 'treatment') AS treatment_satisfaction,
    AVG(completion_rate) FILTER (WHERE variant = 'control') AS control_completion,
    AVG(completion_rate) FILTER (WHERE variant = 'treatment') AS treatment_completion,
    AVG(response_time_seconds) FILTER (WHERE variant = 'control') AS control_response,
    AVG(response_time_seconds) FILTER (WHERE variant = 'treatment') AS treatment_response,
    AVG(conversion_rate::numeric) FILTER (WHERE variant = 'control') AS control_conversion,
    AVG(conversion_rate::numeric) FILTER (WHERE variant = 'treatment') AS treatment_conversion,
    (COUNT(*) FILTER (WHERE variant = 'control' AND converted))::numeric / NULLIF(COUNT(*) FILTER (WHERE variant = 'control'), 0) * 100 AS control_conversion_pct,
    (COUNT(*) FILTER (WHERE variant = 'treatment' AND converted))::numeric / NULLIF(COUNT(*) FILTER (WHERE variant = 'treatment'), 0) * 100 AS treatment_conversion_pct,
    AVG(was_handoff::int) FILTER (WHERE variant = 'control') * 100 AS control_handoff,
    AVG(was_handoff::int) FILTER (WHERE variant = 'treatment') * 100 AS treatment_handoff
  INTO v_summary
  FROM public.ab_test_results
  WHERE test_id = p_test_id AND tenant_id = p_tenant_id;

  v_total_count := COALESCE(v_summary.control_count, 0) + COALESCE(v_summary.treatment_count, 0);

  -- Minimum sample size check
  IF v_total_count < p_min_sample_size THEN
    -- Not enough data — record as pending
    INSERT INTO public.ab_test_optimizations (test_id, tenant_id, winner_variant_id, sample_size, status, triggered_by)
    VALUES (p_test_id, p_tenant_id, NULL, v_total_count, 'pending', p_triggered_by)
    RETURNING id INTO v_optimization_id;
    RETURN v_optimization_id;
  END IF;

  -- Determine winner based on target_metric
  CASE v_test.target_metric
    WHEN 'satisfaction_score' THEN
      v_control_avg := COALESCE(v_summary.control_satisfaction, 0);
      v_treatment_avg := COALESCE(v_summary.treatment_satisfaction, 0);
      IF v_treatment_avg > v_control_avg THEN
        v_winner_id := v_variant_b_id;
        v_improvement := CASE WHEN v_control_avg > 0 THEN ((v_treatment_avg - v_control_avg) / v_control_avg * 100) ELSE 0 END;
      ELSE
        v_winner_id := v_variant_a_id;
        v_improvement := 0;
      END IF;
    WHEN 'completion_rate' THEN
      v_control_avg := COALESCE(v_summary.control_completion, 0);
      v_treatment_avg := COALESCE(v_summary.treatment_completion, 0);
      IF v_treatment_avg > v_control_avg THEN
        v_winner_id := v_variant_b_id;
        v_improvement := CASE WHEN v_control_avg > 0 THEN ((v_treatment_avg - v_control_avg) / v_control_avg * 100) ELSE 0 END;
      ELSE
        v_winner_id := v_variant_a_id;
        v_improvement := 0;
      END IF;
    WHEN 'conversion_rate' THEN
      v_control_avg := COALESCE(v_summary.control_conversion_pct, 0);
      v_treatment_avg := COALESCE(v_summary.treatment_conversion_pct, 0);
      IF v_treatment_avg > v_control_avg THEN
        v_winner_id := v_variant_b_id;
        v_improvement := CASE WHEN v_control_avg > 0 THEN ((v_treatment_avg - v_control_avg) / v_control_avg * 100) ELSE 0 END;
      ELSE
        v_winner_id := v_variant_a_id;
        v_improvement := 0;
      END IF;
    WHEN 'response_time' THEN
      -- Lower is better
      v_control_avg := COALESCE(v_summary.control_response, 999999);
      v_treatment_avg := COALESCE(v_summary.treatment_response, 999999);
      IF v_treatment_avg < v_control_avg THEN
        v_winner_id := v_variant_b_id;
        v_improvement := CASE WHEN v_control_avg > 0 THEN ((v_control_avg - v_treatment_avg) / v_control_avg * 100) ELSE 0 END;
      ELSE
        v_winner_id := v_variant_a_id;
        v_improvement := 0;
      END IF;
    ELSE
      v_winner_id := v_variant_a_id;
  END CASE;

  -- Calculate confidence (simplified: proportional to sample size)
  IF v_total_count >= 100 THEN
    v_confidence := 95.00;
  ELSIF v_total_count >= 50 THEN
    v_confidence := 90.00;
  ELSE
    v_confidence := GREATEST(50.00, LEAST(85.00, v_total_count::numeric / 100 * 85));
  END IF;

  -- Record the optimization
  INSERT INTO public.ab_test_optimizations (
    test_id, tenant_id, winner_variant_id,
    confidence_score, sample_size, status, triggered_by, applied_at
  ) VALUES (
    p_test_id, p_tenant_id, v_winner_id,
    v_confidence, v_total_count, 'completed', p_triggered_by, now()
  )
  RETURNING id INTO v_optimization_id;

  -- Update the test's winning_variant_id
  UPDATE public.ab_test_variants
  SET winning_variant_id = v_winner_id
  WHERE test_id = p_test_id;

  -- Update trigger_type on the winning variant
  IF v_winner_id IS NOT NULL THEN
    UPDATE public.ab_test_variants
    SET trigger_type = CASE WHEN p_triggered_by = 'cron' THEN 'auto' ELSE 'manual' END
    WHERE id = v_winner_id;
  END IF;

  -- Auto-deactivate the test when winner is found
  UPDATE public.ab_tests
  SET is_active = false, updated_at = now()
  WHERE id = p_test_id;

  RETURN v_optimization_id;
END;
$$;

-- ─── 7. RLS for winner_history view ──────────────────────────────────────────

-- The view inherits RLS from underlying tables, so no separate policy needed.
-- For direct query convenience, define a security barrier:

ALTER VIEW public.ab_test_winner_history SET (security_invoker = true);
