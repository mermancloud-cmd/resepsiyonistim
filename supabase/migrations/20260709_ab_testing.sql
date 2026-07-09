-- ═══════════════════════════════════════════════════════════════════════════════
-- A/B Test Infrastructure
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. ab_tests table ─────────────────────────────────────────────────────────
-- Her A/B testin tanimlandigi ana tablo.

CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  feature_flag TEXT NOT NULL,          -- hangi ozellik test ediliyor (e.g. 'welcome_message', 'room_presentation', 'followup_timing')
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed')),
  variant_type TEXT NOT NULL DEFAULT 'binary'
    CHECK (variant_type IN ('binary','multivariate')),
  control_name TEXT NOT NULL DEFAULT 'control',      -- kontrol varyant adi (e.g. 'Mevcut Sistem')
  treatment_name TEXT NOT NULL DEFAULT 'treatment',  -- tedavi varyant adi (e.g. 'Yeni Sistem')
  traffic_split INTEGER NOT NULL DEFAULT 50          -- treatment yuzdesi (0-100)
    CHECK (traffic_split >= 0 AND traffic_split <= 100),
  target_metric TEXT NOT NULL DEFAULT 'satisfaction_score'
    CHECK (target_metric IN ('satisfaction_score','completion_rate','response_time','conversion_rate','handoff_rate','custom')),
  min_sample_size INTEGER DEFAULT 100,               -- kac ornekten sonra istatistiksel anlamlilik kontrol et
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner TEXT,                                       -- 'control' veya 'treatment' veya NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_tenant_id ON public.ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_feature_flag ON public.ab_tests(feature_flag);

-- ─── 2. ab_test_variants table ─────────────────────────────────────────────────
-- Her test icin varyant detaylari (multivariate destegi icin).

CREATE TABLE IF NOT EXISTS public.ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                   -- 'control', 'treatment', 'treatment_v2', etc.
  label TEXT NOT NULL,                  -- UI'da gosterilecek etiket
  description TEXT,                     -- Varyantin aciklamasi
  config JSONB NOT NULL DEFAULT '{}',   -- Varyant spesifik yapilandirma (AI prompt override, vs.)
  traffic_percentage INTEGER NOT NULL DEFAULT 50,
  is_control BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test_id ON public.ab_test_variants(test_id);

-- ─── 3. ab_test_assignments table ──────────────────────────────────────────────
-- Her konusma/kullanici icin random varyant atamasi.

CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  conversation_id UUID,                 -- NULL olabilir (kullanici bazli test)
  session_id TEXT,                      -- anonim oturum ID (kullanici giris yoksa)
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(test_id, conversation_id),
  UNIQUE(test_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON public.ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_variant_id ON public.ab_test_assignments(variant_id);

-- ─── 4. ab_test_results table ──────────────────────────────────────────────────
-- Her test icin toplanan metrikler.

CREATE TABLE IF NOT EXISTS public.ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  conversation_id UUID,                 -- hangi konusmadan geldigi
  metric_name TEXT NOT NULL,            -- 'satisfaction_score', 'completion_rate', 'response_time_ms', 'conversion', 'handoff_rate'
  metric_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON public.ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant_id ON public.ab_test_results(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_metric_name ON public.ab_test_results(metric_name);

-- ─── 5. RLS Policies ───────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_test_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to allow re-runs
DROP POLICY IF EXISTS "ab_tests_tenant_select" ON public.ab_tests;
DROP POLICY IF EXISTS "ab_tests_tenant_insert" ON public.ab_tests;
DROP POLICY IF EXISTS "ab_tests_tenant_update" ON public.ab_tests;
DROP POLICY IF EXISTS "ab_tests_tenant_delete" ON public.ab_tests;
DROP POLICY IF EXISTS "ab_test_variants_tenant_select" ON public.ab_test_variants;
DROP POLICY IF EXISTS "ab_test_variants_tenant_insert" ON public.ab_test_variants;
DROP POLICY IF EXISTS "ab_test_variants_tenant_update" ON public.ab_test_variants;
DROP POLICY IF EXISTS "ab_test_variants_tenant_delete" ON public.ab_test_variants;
DROP POLICY IF EXISTS "ab_test_assignments_tenant_select" ON public.ab_test_assignments;
DROP POLICY IF EXISTS "ab_test_assignments_tenant_insert" ON public.ab_test_assignments;
DROP POLICY IF EXISTS "ab_test_assignments_tenant_update" ON public.ab_test_assignments;
DROP POLICY IF EXISTS "ab_test_assignments_tenant_delete" ON public.ab_test_assignments;
DROP POLICY IF EXISTS "ab_test_results_tenant_select" ON public.ab_test_results;
DROP POLICY IF EXISTS "ab_test_results_tenant_insert" ON public.ab_test_results;
DROP POLICY IF EXISTS "ab_test_results_tenant_update" ON public.ab_test_results;
DROP POLICY IF EXISTS "ab_test_results_tenant_delete" ON public.ab_test_results;

-- Tenant-based policies (using owner_id join)
CREATE POLICY "ab_tests_tenant_select" ON public.ab_tests
  FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "ab_tests_tenant_insert" ON public.ab_tests
  FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "ab_tests_tenant_update" ON public.ab_tests
  FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "ab_tests_tenant_delete" ON public.ab_tests
  FOR DELETE
  USING (tenant_id = public.get_my_tenant_id());

-- Variants: inherit through test_id -> ab_tests.tenant_id
CREATE POLICY "ab_test_variants_tenant_select" ON public.ab_test_variants
  FOR SELECT
  USING (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

CREATE POLICY "ab_test_variants_tenant_insert" ON public.ab_test_variants
  FOR INSERT
  WITH CHECK (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

CREATE POLICY "ab_test_variants_tenant_update" ON public.ab_test_variants
  FOR UPDATE
  USING (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()))
  WITH CHECK (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

CREATE POLICY "ab_test_variants_tenant_delete" ON public.ab_test_variants
  FOR DELETE
  USING (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

-- Assignments
CREATE POLICY "ab_test_assignments_tenant_select" ON public.ab_test_assignments
  FOR SELECT
  USING (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

CREATE POLICY "ab_test_assignments_tenant_insert" ON public.ab_test_assignments
  FOR INSERT
  WITH CHECK (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

-- Results
CREATE POLICY "ab_test_results_tenant_select" ON public.ab_test_results
  FOR SELECT
  USING (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

CREATE POLICY "ab_test_results_tenant_insert" ON public.ab_test_results
  FOR INSERT
  WITH CHECK (test_id IN (SELECT id FROM public.ab_tests WHERE tenant_id = public.get_my_tenant_id()));

-- ─── 6. Helper Functions ───────────────────────────────────────────────────────

-- Rastgele varyant atama fonksiyonu
CREATE OR REPLACE FUNCTION public.assign_ab_test_variant(
  p_test_id UUID,
  p_conversation_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  is_control BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_status TEXT;
  v_variants RECORD;
  v_assignment_id UUID;
  v_total_weight INTEGER;
  v_rand INTEGER;
  v_cumulative INTEGER := 0;
BEGIN
  -- Test durumunu kontrol et
  SELECT status INTO v_test_status FROM public.ab_tests WHERE id = p_test_id;
  IF v_test_status != 'active' THEN
    RETURN; -- Test aktif degilse atama yapma
  END IF;

  -- Daha once atama yapilmis mi kontrol et
  IF p_conversation_id IS NOT NULL THEN
    SELECT variant_id INTO v_assignment_id
    FROM public.ab_test_assignments
    WHERE test_id = p_test_id AND conversation_id = p_conversation_id
    LIMIT 1;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT variant_id INTO v_assignment_id
    FROM public.ab_test_assignments
    WHERE test_id = p_test_id AND session_id = p_session_id
    LIMIT 1;
  END IF;

  -- Varsa mevcut atamayi dondur
  IF v_assignment_id IS NOT NULL THEN
    RETURN QUERY
    SELECT v.id, v.name, v.is_control
    FROM public.ab_test_variants v
    WHERE v.id = v_assignment_id;
    RETURN;
  END IF;

  -- Yeni atama yap: agirlikli random secim
  SELECT COALESCE(SUM(traffic_percentage), 0) INTO v_total_weight
  FROM public.ab_test_variants
  WHERE test_id = p_test_id;

  IF v_total_weight = 0 THEN
    RETURN;
  END IF;

  v_rand := floor(random() * v_total_weight)::INTEGER;

  FOR v_variants IN
    SELECT id, name, is_control, traffic_percentage
    FROM public.ab_test_variants
    WHERE test_id = p_test_id
    ORDER BY is_control DESC, id
  LOOP
    v_cumulative := v_cumulative + v_variants.traffic_percentage;
    IF v_rand < v_cumulative THEN
      -- Atamayi kaydet (handle two unique constraints separately)
      IF p_conversation_id IS NOT NULL THEN
        INSERT INTO public.ab_test_assignments (test_id, variant_id, conversation_id, session_id)
        VALUES (p_test_id, v_variants.id, p_conversation_id, p_session_id)
        ON CONFLICT (test_id, conversation_id) DO NOTHING;
      ELSIF p_session_id IS NOT NULL THEN
        INSERT INTO public.ab_test_assignments (test_id, variant_id, conversation_id, session_id)
        VALUES (p_test_id, v_variants.id, p_conversation_id, p_session_id)
        ON CONFLICT (test_id, session_id) DO NOTHING;
      END IF;

      RETURN QUERY
      SELECT v_variants.id, v_variants.name, v_variants.is_control;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

-- Test sonucu kaydetme fonksiyonu
CREATE OR REPLACE FUNCTION public.record_ab_test_result(
  p_test_id UUID,
  p_variant_id UUID,
  p_conversation_id UUID DEFAULT NULL,
  p_metric_name TEXT DEFAULT 'satisfaction_score',
  p_metric_value NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  INSERT INTO public.ab_test_results (test_id, variant_id, conversation_id, metric_name, metric_value)
  VALUES (p_test_id, p_variant_id, p_conversation_id, p_metric_name, p_metric_value)
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$;

-- ─── 7. Seed Data: Example A/B Tests ───────────────────────────────────────────

-- Tenant: merman-bungalov (596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999)
-- These seed tests are for the Merman Bungalov tenant

-- INSERT INTO public.ab_tests (tenant_id, name, description, feature_flag, status, variant_type, control_name, treatment_name, traffic_split, target_metric, min_sample_size)
-- VALUES
--   ('596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999', 'Hoş Geldiniz Mesajı Testi', 'Kısa vs. uzun hoş geldiniz mesajının dönüşüme etkisi', 'welcome_message', 'draft', 'binary', 'Kısa Mesaj (Mevcut)', 'Uzun Mesaj (Yeni)', 50, 'conversion_rate', 100),
--   ('596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999', 'Oda Tanıtım Formatı', 'Liste vs. detaylı oda tanıtımının rezervasyon oranına etkisi', 'room_presentation', 'draft', 'binary', 'Liste Formatı', 'Detaylı Format', 50, 'completion_rate', 100),
--   ('596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999', 'Takip Mesajı Zamanlaması', '30dk vs 2sa sonra takip mesajının kapatma oranına etkisi', 'followup_timing', 'draft', 'binary', '30 Dakika', '2 Saat', 50, 'conversion_rate', 50);
