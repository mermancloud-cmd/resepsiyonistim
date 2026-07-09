-- ═══════════════════════════════════════════════════════════════════════════════
-- O3 - Çoklu Tesis Yönetimi Migration
-- ═══════════════════════════════════════════════════════════════════════════════
-- Facilities tablosu + facility_users junction + facility_id FK'lar
-- Rollback: DROP TABLE facilities CASCADE; ALTER TABLE ... DROP COLUMN facility_id;
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. facilities table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'hotel' CHECK (type IN ('hotel','villa','bungalov','apart','pansiyon','glamping','tinyhouse','diger')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

COMMENT ON TABLE public.facilities IS 'Multi-facility management — each tenant can have multiple properties';
COMMENT ON COLUMN public.facilities.settings IS 'JSONB: check_in_time, check_out_time, currency, amenities, etc.';

CREATE INDEX IF NOT EXISTS idx_facilities_tenant_id ON public.facilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON public.facilities(status);

-- ─── 2. facility_users junction table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.facility_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager','staff','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(facility_id, user_id)
);

COMMENT ON TABLE public.facility_users IS 'Which users have access to which facilities';

CREATE INDEX IF NOT EXISTS idx_facility_users_facility_id ON public.facility_users(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_users_user_id ON public.facility_users(user_id);

-- ─── 3. Add facility_id to existing tables (nullable, additive) ────────────
ALTER TABLE IF EXISTS public.reservations
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.rooms
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.conversations
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.musteri_feedback
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;

-- ─── 4. Indexes for facility_id columns ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservations_facility_id ON public.reservations(facility_id);
CREATE INDEX IF NOT EXISTS idx_rooms_facility_id ON public.rooms(facility_id);
CREATE INDEX IF NOT EXISTS idx_conversations_facility_id ON public.conversations(facility_id);
CREATE INDEX IF NOT EXISTS idx_messages_facility_id ON public.messages(facility_id);
CREATE INDEX IF NOT EXISTS idx_musteri_feedback_facility_id ON public.musteri_feedback(facility_id);

-- ─── 5. Auto-update updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_facility_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facilities_updated_at ON public.facilities;
CREATE TRIGGER trg_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_facility_timestamp();

-- ─── 6. RLS Policies ────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.facility_users ENABLE ROW LEVEL SECURITY;

-- Facilities: owner sees own, facility_users see assigned
CREATE POLICY "facilities_select_tenant" ON public.facilities
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id()
    OR id IN (
      SELECT facility_id FROM public.facility_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "facilities_insert_tenant" ON public.facilities
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "facilities_update_tenant" ON public.facilities
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "facilities_delete_tenant" ON public.facilities
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- Facility Users: visible to tenant owner + assigned user
CREATE POLICY "facility_users_select" ON public.facility_users
  FOR SELECT
  USING (
    facility_id IN (
      SELECT id FROM public.facilities WHERE tenant_id = public.get_user_tenant_id()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "facility_users_insert" ON public.facility_users
  FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT id FROM public.facilities WHERE tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "facility_users_delete" ON public.facility_users
  FOR DELETE
  USING (
    facility_id IN (
      SELECT id FROM public.facilities WHERE tenant_id = public.get_user_tenant_id()
    )
  );

-- ─── 7. Helper: Get user's accessible facility IDs ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_facility_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT f.id FROM public.facilities f
    WHERE f.tenant_id = public.get_user_tenant_id()
    UNION
    SELECT fu.facility_id FROM public.facility_users fu
    WHERE fu.user_id = auth.uid()
  );
$$;

-- ─── 8. Rollback helper (run this to revert) ───────────────────────────────
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_facilities_updated_at ON public.facilities;
--   DROP FUNCTION IF EXISTS public.update_facility_timestamp();
--   DROP FUNCTION IF EXISTS public.get_user_facility_ids();
--   ALTER TABLE public.reservations DROP COLUMN IF EXISTS facility_id;
--   ALTER TABLE public.rooms DROP COLUMN IF EXISTS facility_id;
--   ALTER TABLE public.conversations DROP COLUMN IF EXISTS facility_id;
--   ALTER TABLE public.messages DROP COLUMN IF EXISTS facility_id;
--   ALTER TABLE public.musteri_feedback DROP COLUMN IF EXISTS facility_id;
--   DROP TABLE IF EXISTS public.facility_users CASCADE;
--   DROP TABLE IF EXISTS public.facilities CASCADE;
