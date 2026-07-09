-- ═══════════════════════════════════════════════════════════════════════════════
-- Humanization Evaluation Framework for AI Response Quality
-- ═══════════════════════════════════════════════════════════════════════════════
-- Hedef: AI yanitlarinin insanlastirma (humanization) seviyesini olcmek
-- ve >=95/100 puani hedefleyen bir degerlendirme sistemi kurmak.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. humanization_test_scenarios ────────────────────────────────────────────
-- Her senaryo bir AI yanitinin hangi acidan degerlendirilecegini tanimlar.
-- Ornegin: "Dogal karsilama", "Empatik yanit", "Baglam farkindaligi" vb.

CREATE TABLE IF NOT EXISTS public.humanization_test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                              -- Senaryo adi (e.g. "Dogal Karsilama")
  description TEXT,                                -- Senaryo aciklamasi
  category TEXT NOT NULL DEFAULT 'general'         
    CHECK (category IN (
      'general', 'greeting', 'empathy', 'objection_handling',
      'room_presentation', 'followup', 'closing', 'complaint'
    )),
  prompt_template TEXT,                            -- AI'ya gonderilecek prompt template
  expected_behaviors TEXT[],                       -- Beklenen insani davranislar (array)
  evaluation_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Her kriter: {"name": "dogallik", "weight": 0.25, "max_score": 100}
    -- toplam weight = 1.0 olmali
  min_target_score NUMERIC(5,2) NOT NULL DEFAULT 95.00  -- Hedef skor (varsayilan 95)
    CHECK (min_target_score >= 0 AND min_target_score <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_humanization_scenarios_tenant ON public.humanization_test_scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_humanization_scenarios_active ON public.humanization_test_scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_humanization_scenarios_category ON public.humanization_test_scenarios(category);

-- ─── 2. humanization_scores ───────────────────────────────────────────────────
-- Her degerlendirme kaydi, bir senaryo icin AI yanitinin puanlarini icerir.

CREATE TABLE IF NOT EXISTS public.humanization_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES humanization_test_scenarios(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- AI yaniti
  ai_response_text TEXT NOT NULL,
  
  -- Boyut bazli puanlar (her biri 0-100)
  score_naturalness NUMERIC(5,2) CHECK (score_naturalness >= 0 AND score_naturalness <= 100),
  score_empathy NUMERIC(5,2) CHECK (score_empathy >= 0 AND score_empathy <= 100),
  score_fluency NUMERIC(5,2) CHECK (score_fluency >= 0 AND score_fluency <= 100),
  score_context NUMERIC(5,2) CHECK (score_context >= 0 AND score_context <= 100),
  score_personalization NUMERIC(5,2) CHECK (score_personalization >= 0 AND score_personalization <= 100),
  score_flow NUMERIC(5,2) CHECK (score_flow >= 0 AND score_flow <= 100),
  score_tone NUMERIC(5,2) CHECK (score_tone >= 0 AND score_tone <= 100),

  -- Bilesik skor (weighted average, 0-100)
  composite_score NUMERIC(5,2) CHECK (composite_score >= 0 AND composite_score <= 100),

  -- Degerlendirme metadatasi
  evaluation_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (evaluation_method IN ('manual', 'automated', 'llm_judge')),
  evaluator_id TEXT,                               -- KULLANICI ID veya 'ai_judge' veya 'system'
  notes TEXT,                                      -- Degerlendirme notlari
  passed BOOLEAN,                                  -- composite_score >= scenario.min_target_score ?
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_humanization_scores_tenant ON public.humanization_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_humanization_scores_scenario ON public.humanization_scores(scenario_id);
CREATE INDEX IF NOT EXISTS idx_humanization_scores_composite ON public.humanization_scores(composite_score);
CREATE INDEX IF NOT EXISTS idx_humanization_scores_passed ON public.humanization_scores(passed);
CREATE INDEX IF NOT EXISTS idx_humanization_scores_created ON public.humanization_scores(created_at DESC);

-- ─── 3. Humanizasyon ozet fonksiyonu ───────────────────────────────────────────
-- Tenant bazinda humanizasyon istatistiklerini dondurur

CREATE OR REPLACE FUNCTION public.get_humanization_summary(
  p_tenant_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_evaluations BIGINT,
  passed_count BIGINT,
  fail_count BIGINT,
  pass_rate NUMERIC(5,2),
  avg_composite NUMERIC(5,2),
  avg_naturalness NUMERIC(5,2),
  avg_empathy NUMERIC(5,2),
  avg_fluency NUMERIC(5,2),
  avg_context NUMERIC(5,2),
  avg_personalization NUMERIC(5,2),
  avg_flow NUMERIC(5,2),
  avg_tone NUMERIC(5,2),
  best_score NUMERIC(5,2),
  worst_score NUMERIC(5,2),
  scenario_count BIGINT,
  last_evaluated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := now() - (p_days_back || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_evaluations,
    COUNT(*) FILTER (WHERE hs.passed = true)::BIGINT AS passed_count,
    COUNT(*) FILTER (WHERE hs.passed = false)::BIGINT AS fail_count,
    ROUND(
      (COUNT(*) FILTER (WHERE hs.passed = true)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100,
      2
    ) AS pass_rate,
    ROUND(AVG(hs.composite_score)::NUMERIC, 2) AS avg_composite,
    ROUND(AVG(hs.score_naturalness)::NUMERIC, 2) AS avg_naturalness,
    ROUND(AVG(hs.score_empathy)::NUMERIC, 2) AS avg_empathy,
    ROUND(AVG(hs.score_fluency)::NUMERIC, 2) AS avg_fluency,
    ROUND(AVG(hs.score_context)::NUMERIC, 2) AS avg_context,
    ROUND(AVG(hs.score_personalization)::NUMERIC, 2) AS avg_personalization,
    ROUND(AVG(hs.score_flow)::NUMERIC, 2) AS avg_flow,
    ROUND(AVG(hs.score_tone)::NUMERIC, 2) AS avg_tone,
    MAX(hs.composite_score) AS best_score,
    MIN(hs.composite_score) AS worst_score,
    (SELECT COUNT(*)::BIGINT FROM public.humanization_test_scenarios WHERE tenant_id = p_tenant_id AND is_active = true) AS scenario_count,
    MAX(hs.created_at) AS last_evaluated_at
  FROM public.humanization_scores hs
  WHERE hs.tenant_id = p_tenant_id
    AND hs.created_at >= v_cutoff;
END;
$$;

-- ─── 4. Senaryo bazli detayli istatistik ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_humanization_scenario_stats(
  p_tenant_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  scenario_id UUID,
  scenario_name TEXT,
  category TEXT,
  total_evaluations BIGINT,
  passed_count BIGINT,
  avg_composite NUMERIC(5,2),
  avg_naturalness NUMERIC(5,2),
  avg_empathy NUMERIC(5,2),
  avg_fluency NUMERIC(5,2),
  avg_context NUMERIC(5,2),
  avg_personalization NUMERIC(5,2),
  avg_flow NUMERIC(5,2),
  avg_tone NUMERIC(5,2),
  min_target NUMERIC(5,2),
  last_score NUMERIC(5,2),
  trend TEXT  -- 'improving', 'declining', 'stable'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := now() - (p_days_back || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH scenario_agg AS (
    SELECT
      hs.scenario_id,
      COUNT(*)::BIGINT AS total_evaluations,
      COUNT(*) FILTER (WHERE hs.passed = true)::BIGINT AS passed_count,
      ROUND(AVG(hs.composite_score)::NUMERIC, 2) AS avg_composite,
      ROUND(AVG(hs.score_naturalness)::NUMERIC, 2) AS avg_naturalness,
      ROUND(AVG(hs.score_empathy)::NUMERIC, 2) AS avg_empathy,
      ROUND(AVG(hs.score_fluency)::NUMERIC, 2) AS avg_fluency,
      ROUND(AVG(hs.score_context)::NUMERIC, 2) AS avg_context,
      ROUND(AVG(hs.score_personalization)::NUMERIC, 2) AS avg_personalization,
      ROUND(AVG(hs.score_flow)::NUMERIC, 2) AS avg_flow,
      ROUND(AVG(hs.score_tone)::NUMERIC, 2) AS avg_tone
    FROM public.humanization_scores hs
    WHERE hs.tenant_id = p_tenant_id
      AND hs.created_at >= v_cutoff
    GROUP BY hs.scenario_id
  ),
  last_scores AS (
    SELECT DISTINCT ON (hs.scenario_id)
      hs.scenario_id,
      hs.composite_score AS last_score
    FROM public.humanization_scores hs
    WHERE hs.tenant_id = p_tenant_id
    ORDER BY hs.scenario_id, hs.created_at DESC
  ),
  trend_data AS (
    SELECT
      hs.scenario_id,
      CASE
        WHEN COUNT(*) < 3 THEN 'stable'
        WHEN
          AVG(hs.composite_score) FILTER (WHERE hs.created_at >= now() - INTERVAL '7 days') >
          AVG(hs.composite_score) FILTER (WHERE hs.created_at < now() - INTERVAL '7 days' AND hs.created_at >= v_cutoff) + 2
        THEN 'improving'
        WHEN
          AVG(hs.composite_score) FILTER (WHERE hs.created_at >= now() - INTERVAL '7 days') <
          AVG(hs.composite_score) FILTER (WHERE hs.created_at < now() - INTERVAL '7 days' AND hs.created_at >= v_cutoff) - 2
        THEN 'declining'
        ELSE 'stable'
      END AS trend
    FROM public.humanization_scores hs
    WHERE hs.tenant_id = p_tenant_id
      AND hs.created_at >= v_cutoff
    GROUP BY hs.scenario_id
  )
  SELECT
    s.id AS scenario_id,
    s.name AS scenario_name,
    s.category,
    COALESCE(sa.total_evaluations, 0)::BIGINT,
    COALESCE(sa.passed_count, 0)::BIGINT,
    sa.avg_composite,
    sa.avg_naturalness,
    sa.avg_empathy,
    sa.avg_fluency,
    sa.avg_context,
    sa.avg_personalization,
    sa.avg_flow,
    sa.avg_tone,
    s.min_target_score AS min_target,
    ls.last_score,
    COALESCE(td.trend, 'stable') AS trend
  FROM public.humanization_test_scenarios s
  LEFT JOIN scenario_agg sa ON sa.scenario_id = s.id
  LEFT JOIN last_scores ls ON ls.scenario_id = s.id
  LEFT JOIN trend_data td ON td.scenario_id = s.id
  WHERE s.tenant_id = p_tenant_id AND s.is_active = true
  ORDER BY s.sort_order, s.name;
END;
$$;

-- ─── 5. Seed Data: Humanizasyon Test Senaryolari ──────────────────────────────

-- Tenant: merman-bungalov (596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999)
INSERT INTO public.humanization_test_scenarios (tenant_id, name, description, category, prompt_template, expected_behaviors, evaluation_criteria, min_target_score, sort_order)
VALUES
(
  '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
  'Doğal Karşılama',
  'Misafirin ilk mesajina dogal ve sicak bir karsilama verme',
  'greeting',
  'Bir misafir size "Merhaba, 2 kisilik bir bungalov arıyorum 3 gece için" yazdi. Yanit verin.',
  ARRAY['Sicak ve dogal bir selamlama', 'Kendini tanitma', 'Kisisel bir dokunus', 'Soru ile devam etme'],
  '[{"name": "dogallik", "weight": 0.25, "max_score": 100}, {"name": "empati", "weight": 0.20, "max_score": 100}, {"name": "akis", "weight": 0.20, "max_score": 100}, {"name": "ton", "weight": 0.20, "max_score": 100}, {"name": "kisisellestirme", "weight": 0.15, "max_score": 100}]'::jsonb,
  95.00, 1
),
(
  '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
  'Empatik Yanıt',
  'Misafirin sikayet veya endisesine empatik yanit verme',
  'empathy',
  'Bir misafir su mesaji gonderdi: "Daha onceki konusmamizda fiyat 3000 TL idi, simdi 3500 TL diyorsunuz. Bu dogru degil." Yanit verin.',
  ARRAY['Anlayis gosterme', 'Ozgurce ozur dileme', 'Sorunu cozmeye odaklanma', 'Sakin ve profesyonel ton'],
  '[{"name": "empati", "weight": 0.35, "max_score": 100}, {"name": "dogallik", "weight": 0.20, "max_score": 100}, {"name": "ton", "weight": 0.25, "max_score": 100}, {"name": "akis", "weight": 0.20, "max_score": 100}]'::jsonb,
  95.00, 2
),
(
  '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
  'Oda Tanıtımı',
  'Oda seceneklerini dogal ve cekici bir dille sunma',
  'room_presentation',
  'Misafir su soruyu sordu: "Bungalovlarinizda mutfak var mi? 2 yetiskin 1 cocuk icin uygun bir sey onerebilir misiniz?" Yanit verin.',
  ARRAY['Odalari karsilastirmali sunma', 'Aileye uygun secenekleri vurgulama', 'Detaylari dogal akista verme', 'Ek soru ile ilgiyi canli tutma'],
  '[{"name": "dogallik", "weight": 0.25, "max_score": 100}, {"name": "kisisellestirme", "weight": 0.25, "max_score": 100}, {"name": "akis", "weight": 0.20, "max_score": 100}, {"name": "ton", "weight": 0.15, "max_score": 100}, {"name": "baglam", "weight": 0.15, "max_score": 100}]'::jsonb,
  95.00, 3
),
(
  '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
  'İtiraz Yönetimi',
  'Misafirin itirazlarini dogal bir dille yonetime',
  'objection_handling',
  'Misafir diyor ki: "Biraz pahali geldi baska yerler daha uygun, sizde bu fiyata degiyor mu gercekten?" Yanit verin.',
  ARRAY['Itirazi kabul etme ve anlayis gosterme', 'Deger odakli yanit verme', 'Kesinlikle degil ikna edici olma', 'Alternatif sunma'],
  '[{"name": "empati", "weight": 0.25, "max_score": 100}, {"name": "dogallik", "weight": 0.25, "max_score": 100}, {"name": "akis", "weight": 0.20, "max_score": 100}, {"name": "ton", "weight": 0.15, "max_score": 100}, {"name": "kisisellestirme", "weight": 0.15, "max_score": 100}]'::jsonb,
  95.00, 4
),
(
  '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
  'Doğal Takip',
  'Konusma sonrasi dogal bir takip mesaji gonderebilme',
  'followup',
  'Bir misafir "Dusunecegim, sonra donerim" dedi. 1 saat sonra takip mesaji atacaksiniz. Ne yazarsiniz?',
  ARRAY['Baskici olmayan hatirlatma', 'Yeni bir deger sunma', 'Kisa ve dogal olma', 'Kapatmaya zorlamama'],
  '[{"name": "dogallik", "weight": 0.30, "max_score": 100}, {"name": "ton", "weight": 0.25, "max_score": 100}, {"name": "akis", "weight": 0.20, "max_score": 100}, {"name": "kisisellestirme", "weight": 0.25, "max_score": 100}]'::jsonb,
  95.00, 5
),
(
  '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
  'Şikayet Yönetimi',
  'Sikayet durumunda dogal ve cozum odakli iletisim',
  'complaint',
  '"Bungalovda sicak su yoktu ve bu kadar para verdik, hayal kirikligina ugradim" diyen bir musteriye yanit verin.',
  ARRAY['Ozgurce ozur dileme', 'Empati gosterme', 'Cozum odakli yaklasim', 'Telafi teklif etme', 'Profesyonel tonu kaybetmeme'],
  '[{"name": "empati", "weight": 0.30, "max_score": 100}, {"name": "dogallik", "weight": 0.20, "max_score": 100}, {"name": "ton", "weight": 0.20, "max_score": 100}, {"name": "akis", "weight": 0.15, "max_score": 100}, {"name": "kisisellestirme", "weight": 0.15, "max_score": 100}]'::jsonb,
  95.00, 6
),
(
  '596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999',
  'Kapanış ve Rezervasyon',
  'Konusmayi dogal bir sekilde rezervasyonla kapatma',
  'closing',
  'Misafir "Tamam karar verdik, cumartesi geliyoruz" dedi. Rezervasyon onayi mesaji yazin.',
  ARRAY['Sicak onay', 'Kisisel dokunus', 'Net bilgi verme', 'Kapora yonlendirmesi', 'Tesekkur etme'],
  '[{"name": "dogallik", "weight": 0.25, "max_score": 100}, {"name": "ton", "weight": 0.20, "max_score": 100}, {"name": "akis", "weight": 0.20, "max_score": 100}, {"name": "kisisellestirme", "weight": 0.20, "max_score": 100}, {"name": "baglam", "weight": 0.15, "max_score": 100}]'::jsonb,
  95.00, 7
);

-- ─── 6. RLS Policies ──────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.humanization_test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.humanization_scores ENABLE ROW LEVEL SECURITY;

-- Tenant-based policies (owner_id join pattern)
CREATE POLICY "humanization_scenarios_tenant_select" ON public.humanization_test_scenarios
  FOR SELECT
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "humanization_scenarios_tenant_insert" ON public.humanization_test_scenarios
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "humanization_scenarios_tenant_update" ON public.humanization_test_scenarios
  FOR UPDATE
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "humanization_scenarios_tenant_delete" ON public.humanization_test_scenarios
  FOR DELETE
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

-- Scores
CREATE POLICY "humanization_scores_tenant_select" ON public.humanization_scores
  FOR SELECT
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "humanization_scores_tenant_insert" ON public.humanization_scores
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "humanization_scores_tenant_update" ON public.humanization_scores
  FOR UPDATE
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "humanization_scores_tenant_delete" ON public.humanization_scores
  FOR DELETE
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
