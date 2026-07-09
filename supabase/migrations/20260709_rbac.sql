-- ═══════════════════════════════════════════════════════════════════════════════
-- RBAC Migration (O1) — Rol Tabanlı Erişim Kontrolü
-- ═══════════════════════════════════════════════════════════════════════════════
-- Roles: admin (full), staff (reservations+chat), owner (finance+settings)
-- Permission matrix stored as JSONB for flexibility.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Roles table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (name IN ('admin', 'staff', 'owner')),
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roles IS 'System roles for RBAC. admin=full, staff=reservations+chat, owner=finance+settings';
COMMENT ON COLUMN public.roles.permissions IS 'JSONB permission map. Example: {"reservations": {"read": true, "write": true, "approve": false}}';

-- ─── 2. User Roles table (junction: auth.users → roles, scoped to tenant) ─────

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

COMMENT ON TABLE public.user_roles IS 'Maps auth.users to roles within a tenant scope';

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles (role_id);

-- ─── 3. Helper Functions ─────────────────────────────────────────────────────

-- get_user_role(): Returns the role name for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- get_user_role(p_user_id, p_tenant_id): Returns role for any user+tenant
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id UUID,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND (p_tenant_id IS NULL OR ur.tenant_id = p_tenant_id)
  LIMIT 1;
$$;

-- get_user_permissions(): Returns the permission JSONB for the current user
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.permissions
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- user_has_permission(resource.read): Checks a specific permission
-- Usage: user_has_permission('reservations.write')
CREATE OR REPLACE FUNCTION public.user_has_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts TEXT[];
  resource TEXT;
  action TEXT;
  perms JSONB;
BEGIN
  parts := string_to_array(p_permission, '.');
  resource := parts[1];
  action := parts[2];

  SELECT r.permissions INTO perms
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  IF perms IS NULL THEN
    RETURN false;
  END IF;

  -- Check wildcard (admin has full access)
  IF perms ? '*::*' THEN
    RETURN (perms->'*::*')::boolean;
  END IF;

  -- Check resource wildcard (e.g. "reservations": {"*": true})
  IF perms ? resource AND (perms->resource) ? '*' THEN
    RETURN ((perms->resource)->>'*')::boolean;
  END IF;

  -- Check exact resource.action
  IF perms ? resource AND (perms->resource) ? action THEN
    RETURN ((perms->resource)->>action)::boolean;
  END IF;

  RETURN false;
END;
$$;

-- 4. Updated get_user_tenant_id (role-aware: tries user_roles first, then owner_id)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT t.id FROM public.tenants t WHERE t.owner_id = auth.uid() LIMIT 1),
    (SELECT b.id FROM public.bungalows b WHERE b.owner_id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id_legacy()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT t.id FROM public.tenants t WHERE t.owner_id = auth.uid() LIMIT 1),
    (SELECT b.id FROM public.bungalows b WHERE b.owner_id = auth.uid() LIMIT 1)
  );
$$;

-- ─── 5. Permission Matrix (JSONB structure) ──────────────────────────────────
-- Example structure for each role:
--
-- admin:  {"*::*": true}  — all access
-- staff:  {"reservations": {"read": true, "write": true, "approve": false},
--          "chat": {"read": true, "write": true, "handoff": true},
--          "guests": {"read": true, "write": true}}
-- owner:  {"finance": {"read": true, "export": true},
--          "settings": {"read": true, "write": true},
--          "analytics": {"read": true, "export": true},
--          "team": {"read": true, "write": true},
--          "reservations": {"read": true, "write": true, "approve": true},
--          "chat": {"read": true, "write": true, "handoff": true}}

-- ─── 6. Seed Default Roles ──────────────────────────────────────────────────

INSERT INTO public.roles (name, description, permissions, is_system) VALUES
  ('admin', 'Tam erişim — tüm özellikler, tüm işlemler',
   '{"*::*": true}'::jsonb, true),

  ('staff', 'Personel — rezervasyon ve sohbet yönetimi, salt okunur diğer alanlar',
   '{"reservations": {"read": true, "write": true, "approve": false},
     "chat": {"read": true, "write": true, "handoff": true},
     "guests": {"read": true, "write": false},
     "rooms": {"read": true, "write": false},
     "analytics": {"read": true, "export": false},
     "settings": {"read": false, "write": false},
     "finance": {"read": false, "export": false},
     "ai": {"read": true, "write": false}}'::jsonb, true),

  ('owner', 'İşletme sahibi — finans, ayarlar, tam yönetim',
   '{"finance": {"read": true, "export": true},
     "settings": {"read": true, "write": true},
     "analytics": {"read": true, "export": true},
     "team": {"read": true, "write": true},
     "reservations": {"read": true, "write": true, "approve": true},
     "chat": {"read": true, "write": true, "handoff": true},
     "guests": {"read": true, "write": true},
     "rooms": {"read": true, "write": true},
     "ai": {"read": true, "write": true}}'::jsonb, true)

ON CONFLICT (name) DO NOTHING;

-- ─── 7. Assign existing users as 'admin' ────────────────────────────────────
-- This covers users who authenticate but may not have a user_roles record yet.
-- Only assigns if no user_roles record exists for that user+tenant pair.

DO $$
DECLARE
  admin_role_id UUID;
  existing_user RECORD;
BEGIN
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin role not seeded';
  END IF;

  -- Get distinct owner_ids from tenants and bungalows
  FOR existing_user IN
    SELECT DISTINCT u.id AS user_id, t.id AS tenant_id
    FROM auth.users u
    CROSS JOIN public.tenants t
    WHERE t.owner_id = u.id
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = u.id AND ur.tenant_id = t.id
      )
  LOOP
    INSERT INTO public.user_roles (user_id, tenant_id, role_id)
    VALUES (existing_user.user_id, existing_user.tenant_id, admin_role_id)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END LOOP;

  -- Also handle users linked via user_profiles if that table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    FOR existing_user IN
      SELECT DISTINCT up.user_id, up.tenant_id
      FROM public.user_profiles up
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = up.user_id AND ur.tenant_id = up.tenant_id
      )
    LOOP
      INSERT INTO public.user_roles (user_id, tenant_id, role_id)
      VALUES (existing_user.user_id, existing_user.tenant_id, admin_role_id)
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. Updated RLS Policies for existing tables
-- ═══════════════════════════════════════════════════════════════════════════════
-- Replaces the old single-policy approach with role-aware policies
-- that check BOTH tenant isolation AND user permissions.

-- ═ Helper: Check if user has a role-based permission ═════════════════════════

-- ── Rooms ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'tenant_id') THEN
    ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.rooms FORCE ROW LEVEL SECURITY;

    -- Drop old policies
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.rooms;
    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.rooms;
    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.rooms;
    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.rooms;

    -- Tenant+role policies
    DROP POLICY IF EXISTS "rbac_rooms_select" ON public.rooms;
    CREATE POLICY "rbac_rooms_select" ON public.rooms
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('rooms.read'));

    DROP POLICY IF EXISTS "rbac_rooms_insert" ON public.rooms;
    CREATE POLICY "rbac_rooms_insert" ON public.rooms
      FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('rooms.write'));

    DROP POLICY IF EXISTS "rbac_rooms_update" ON public.rooms;
    CREATE POLICY "rbac_rooms_update" ON public.rooms
      FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('rooms.write'))
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('rooms.write'));

    DROP POLICY IF EXISTS "rbac_rooms_delete" ON public.rooms;
    CREATE POLICY "rbac_rooms_delete" ON public.rooms
      FOR DELETE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('rooms.write'));
  END IF;
END $$;

-- ── Reservations ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.reservations;
    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.reservations;
    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.reservations;
    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.reservations;

    DROP POLICY IF EXISTS "rbac_reservations_select" ON public.reservations;
    CREATE POLICY "rbac_reservations_select" ON public.reservations
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('reservations.read'));

    DROP POLICY IF EXISTS "rbac_reservations_insert" ON public.reservations;
    CREATE POLICY "rbac_reservations_insert" ON public.reservations
      FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('reservations.write'));

    DROP POLICY IF EXISTS "rbac_reservations_update" ON public.reservations;
    CREATE POLICY "rbac_reservations_update" ON public.reservations
      FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('reservations.write'))
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('reservations.write'));

    DROP POLICY IF EXISTS "rbac_reservations_delete" ON public.reservations;
    CREATE POLICY "rbac_reservations_delete" ON public.reservations
      FOR DELETE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('reservations.write'));
  END IF;
END $$;

-- ── Conversations ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.conversations;
    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.conversations;
    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.conversations;
    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.conversations;

    DROP POLICY IF EXISTS "rbac_conversations_select" ON public.conversations;
    CREATE POLICY "rbac_conversations_select" ON public.conversations
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('chat.read'));

    DROP POLICY IF EXISTS "rbac_conversations_insert" ON public.conversations;
    CREATE POLICY "rbac_conversations_insert" ON public.conversations
      FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('chat.write'));

    DROP POLICY IF EXISTS "rbac_conversations_update" ON public.conversations;
    CREATE POLICY "rbac_conversations_update" ON public.conversations
      FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('chat.write'))
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('chat.write'));

    DROP POLICY IF EXISTS "rbac_conversations_delete" ON public.conversations;
    CREATE POLICY "rbac_conversations_delete" ON public.conversations
      FOR DELETE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('chat.write'));
  END IF;
END $$;

-- ── Messages ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.messages;
    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.messages;
    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.messages;
    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.messages;

    DROP POLICY IF EXISTS "rbac_messages_select" ON public.messages;
    CREATE POLICY "rbac_messages_select" ON public.messages
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('chat.read'));

    DROP POLICY IF EXISTS "rbac_messages_insert" ON public.messages;
    CREATE POLICY "rbac_messages_insert" ON public.messages
      FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('chat.write'));

    DROP POLICY IF EXISTS "rbac_messages_update" ON public.messages;
    CREATE POLICY "rbac_messages_update" ON public.messages
      FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('chat.write'))
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('chat.write'));

    DROP POLICY IF EXISTS "rbac_messages_delete" ON public.messages;
    CREATE POLICY "rbac_messages_delete" ON public.messages
      FOR DELETE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('chat.write'));
  END IF;
END $$;

-- ── Bungalows (properties) ───────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bungalows' AND column_name = 'tenant_id') THEN
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.bungalows;
    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.bungalows;
    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.bungalows;
    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.bungalows;

    DROP POLICY IF EXISTS "rbac_bungalows_select" ON public.bungalows;
    CREATE POLICY "rbac_bungalows_select" ON public.bungalows
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());

    DROP POLICY IF EXISTS "rbac_bungalows_insert" ON public.bungalows;
    CREATE POLICY "rbac_bungalows_insert" ON public.bungalows
      FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('settings.write'));

    DROP POLICY IF EXISTS "rbac_bungalows_update" ON public.bungalows;
    CREATE POLICY "rbac_bungalows_update" ON public.bungalows
      FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('settings.write'))
      WITH CHECK (tenant_id = public.get_user_tenant_id()
                  AND public.user_has_permission('settings.write'));

    DROP POLICY IF EXISTS "rbac_bungalows_delete" ON public.bungalows;
    CREATE POLICY "rbac_bungalows_delete" ON public.bungalows
      FOR DELETE
      USING (tenant_id = public.get_user_tenant_id()
             AND public.user_has_permission('settings.write'));
  END IF;
END $$;

-- ── Tenants ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    DROP POLICY IF EXISTS "owner_can_select_own_tenant" ON public.tenants;
    DROP POLICY IF EXISTS "owner_can_update_own_tenant" ON public.tenants;

    DROP POLICY IF EXISTS "rbac_tenants_select" ON public.tenants;
    CREATE POLICY "rbac_tenants_select" ON public.tenants
      FOR SELECT
      USING (id = public.get_user_tenant_id());

    DROP POLICY IF EXISTS "rbac_tenants_update" ON public.tenants;
    CREATE POLICY "rbac_tenants_update" ON public.tenants
      FOR UPDATE
      USING (id = public.get_user_tenant_id()
             AND public.user_has_permission('settings.write'))
      WITH CHECK (id = public.get_user_tenant_id()
                  AND public.user_has_permission('settings.write'));
  END IF;
END $$;

-- ── RLS on new tables ────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rbac_roles_select" ON public.roles;
CREATE POLICY "rbac_roles_select" ON public.roles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles FORCE ROW LEVEL SECURITY;

-- Users can only see their own user_roles
DROP POLICY IF EXISTS "rbac_user_roles_select" ON public.user_roles;
CREATE POLICY "rbac_user_roles_select" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Only users with team.write permission can insert/update user_roles
DROP POLICY IF EXISTS "rbac_user_roles_insert" ON public.user_roles;
CREATE POLICY "rbac_user_roles_insert" ON public.user_roles
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.permissions ? 'team'
      AND (r.permissions->'team') ? 'write'
      AND ((r.permissions->'team')->>'write')::boolean = true
  ));

DROP POLICY IF EXISTS "rbac_user_roles_update" ON public.user_roles;
CREATE POLICY "rbac_user_roles_update" ON public.user_roles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.permissions ? 'team'
      AND (r.permissions->'team') ? 'write'
      AND ((r.permissions->'team')->>'write')::boolean = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.permissions ? 'team'
      AND (r.permissions->'team') ? 'write'
      AND ((r.permissions->'team')->>'write')::boolean = true));

-- ═══════════════════════════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT * FROM public.roles ORDER BY name;  -- Should show 3 roles
-- SELECT get_user_role();  -- Should return current user's role
-- SELECT user_has_permission('reservations.read');  -- For staff, should be true
-- SELECT user_has_permission('settings.write');     -- For staff, should be false
