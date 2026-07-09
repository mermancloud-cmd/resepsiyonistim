-- ═══════════════════════════════════════════════════════════════════════════════
-- RBAC Rollback Migration (O1)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this ONLY if the RBAC migration causes issues.
-- Reverts: roles table, user_roles table, updated RLS functions/policies.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Drop RBAC tables (cascades to their RLS policies)
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- 2. Drop RBAC helper functions
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.get_user_permissions();
DROP FUNCTION IF EXISTS public.user_has_permission(TEXT);
DROP FUNCTION IF EXISTS public.check_role_permission(TEXT, TEXT);

-- 3. Restore original get_user_tenant_id (single-tenant fallback)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT t.id FROM public.tenants t WHERE t.owner_id = auth.uid() LIMIT 1),
    (SELECT b.id FROM public.bungalows b WHERE b.owner_id = auth.uid() LIMIT 1),
    (SELECT id FROM public.tenants LIMIT 1)
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
    (SELECT t.id FROM public.tenants t WHERE t.owner_id = auth.uid() LIMIT 1),
    (SELECT b.id FROM public.bungalows b WHERE b.owner_id = auth.uid() LIMIT 1)
  );
$$;

-- NOTE: RLS policies on existing tables are DROPped and recreated
-- by the RBAC migration. If rolling back, re-run the original
-- 2026_tenant_rls_policies.sql migration to restore them.

-- ═══════════════════════════════════════════════════════════════════════════════
-- Verification: run these after rollback
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT * FROM pg_tables WHERE tablename IN ('roles', 'user_roles');
-- Should return 0 rows (both tables dropped)
