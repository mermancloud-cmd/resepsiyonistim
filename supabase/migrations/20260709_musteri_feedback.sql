-- ═══════════════════════════════════════════════════════════════════════════════
-- Müşteri Geri Bildirim Loop'u (I3)
-- ═══════════════════════════════════════════════════════════════════════════════
-- AI konuşma kalitesi için düşük eforlu geri bildirim toplama.
-- Misafir konuşma sonunda 1-5 yıldız + kategorili yorum bırakabilir.
--
-- humanization_test_scenarios (I2) ile trend analizi için
-- `get_feedback_with_humanization` view'i sağlanmıştır.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. musteri_feedback tablosu ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.musteri_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL DEFAULT 'genel'
    CHECK (category IN (
      'genel', 'hiz', 'rezervasyon', 'oda_bilgisi',
      'fiyat', 'iletisim', 'insan_kalitesi', 'diger'
    )),
  comment TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_musteri_feedback_tenant_id
  ON public.musteri_feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_musteri_feedback_rating
  ON public.musteri_feedback (rating);
CREATE INDEX IF NOT EXISTS idx_musteri_feedback_category
  ON public.musteri_feedback (category);
CREATE INDEX IF NOT EXISTS idx_musteri_feedback_submitted_at
  ON public.musteri_feedback (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_musteri_feedback_conversation_id
  ON public.musteri_feedback (conversation_id);

-- ─── 2. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.musteri_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musteri_feedback FORCE ROW LEVEL SECURITY;

-- Tenant isolation: SELECT (owner panel reads their own feedback)
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.musteri_feedback;
CREATE POLICY "tenant_isolation_select" ON public.musteri_feedback
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Tenant isolation: INSERT (webhook/AI bot submits feedback)
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.musteri_feedback;
CREATE POLICY "tenant_isolation_insert" ON public.musteri_feedback
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Tenant isolation: UPDATE (admin can update notes/status)
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.musteri_feedback;
CREATE POLICY "tenant_isolation_update" ON public.musteri_feedback
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Tenant isolation: DELETE
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.musteri_feedback;
CREATE POLICY "tenant_isolation_delete" ON public.musteri_feedback
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ─── 3. Trend Analizi RPC'leri ─────────────────────────────────────────────

-- get_feedback_summary: rating dağılımı + kırılım istatistikleri
CREATE OR REPLACE FUNCTION public.get_feedback_summary(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'total_count', COUNT(*),
    'avg_rating', ROUND(AVG(rating)::numeric, 2),
    'rating_distribution', COALESCE(
      (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('rating', r, 'count', c) ORDER BY r DESC)
       FROM (
         SELECT rating AS r, COUNT(*) AS c
         FROM musteri_feedback
         WHERE tenant_id = p_tenant_id
           AND created_at >= now() - (p_days || ' days')::interval
         GROUP BY rating
       ) sub),
      '[]'::jsonb
    ),
    'category_breakdown', COALESCE(
      (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('category', cat, 'count', cnt, 'avg_rating', ROUND(avg_r::numeric, 2)))
       FROM (
         SELECT category AS cat, COUNT(*) AS cnt, AVG(rating) AS avg_r
         FROM musteri_feedback
         WHERE tenant_id = p_tenant_id
           AND created_at >= now() - (p_days || ' days')::interval
         GROUP BY category
       ) sub),
      '[]'::jsonb
    ),
    'weekly_trend', COALESCE(
      (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('week', w, 'count', cnt, 'avg_rating', ROUND(avg_r::numeric, 2)) ORDER BY w)
       FROM (
         SELECT
           to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS w,
           COUNT(*) AS cnt,
           AVG(rating) AS avg_r
         FROM musteri_feedback
         WHERE tenant_id = p_tenant_id
           AND created_at >= now() - (p_days || ' days')::interval
         GROUP BY date_trunc('week', created_at)
       ) sub),
      '[]'::jsonb
    ),
    'recent_comments', COALESCE(
      (SELECT JSONB_AGG(
         JSONB_BUILD_OBJECT(
           'id', id,
           'rating', rating,
           'category', category,
           'comment', comment,
           'submitted_at', submitted_at,
           'conversation_id', conversation_id
         )
         ORDER BY submitted_at DESC
       )
       FROM musteri_feedback
       WHERE tenant_id = p_tenant_id
         AND comment IS NOT NULL
         AND created_at >= now() - (p_days || ' days')::interval
       LIMIT 20),
      '[]'::jsonb
    )
  ) INTO result
  FROM musteri_feedback
  WHERE tenant_id = p_tenant_id
    AND created_at >= now() - (p_days || ' days')::interval;

  RETURN result;
END;
$$;

-- get_feedback_trend: günlük bazda trend (chart için)
CREATE OR REPLACE FUNCTION public.get_feedback_trend(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'date', d::date,
      'count', COALESCE(cnt, 0),
      'avg_rating', ROUND(COALESCE(avg_r, 0)::numeric, 2)
    )
    ORDER BY d
  )
  INTO result
  FROM generate_series(
    (now() - (p_days || ' days')::interval)::date,
    now()::date,
    '1 day'::interval
  ) d
  LEFT JOIN (
    SELECT
      created_at::date AS feedback_date,
      COUNT(*) AS cnt,
      AVG(rating) AS avg_r
    FROM musteri_feedback
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days || ' days')::interval
    GROUP BY created_at::date
  ) f ON d::date = f.feedback_date;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ─── 4. I2 Humanization Bağlantı View'i ──────────────────────────────────────
-- Feedback + humanization skorlarını birleştirir (I2 tabloları varsa)
-- Eğer humanization_scores tablosu yoksa, hata vermez (NULL döner)

DROP VIEW IF EXISTS public.feedback_with_humanization;
CREATE OR REPLACE VIEW public.feedback_with_humanization AS
SELECT
  f.id AS feedback_id,
  f.tenant_id,
  f.conversation_id,
  f.rating,
  f.category,
  f.comment,
  f.submitted_at,
  hs.total_score,
  hs.naturalness,
  hs.empathy,
  hs.fluency,
  hs.context_awareness,
  hs.personalization,
  hs.conversation_flow,
  hs.tone_appropriateness,
  hs.scored_at
FROM musteri_feedback f
LEFT JOIN humanization_scores hs ON hs.conversation_id = f.conversation_id;

COMMENT ON VIEW public.feedback_with_humanization IS
  'I3-I2 bağlantı view''i: musteri_feedback + humanization_scores birleştirir. humanization_scores tablosu yoksa LEFT JOIN NULL döndürür.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'musteri_feedback';
-- Should show rowsecurity = true
