// ─── Client-side RBAC Hook ─────────────────────────────────────────────────────
// Provides role & permission checks in the browser via React context + hooks.

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type {
  UserRole,
  PermissionMatrix,
  PermissionResource,
  PermissionAction,
  RBACContext,
} from "@/types/rbac";
import { ROLE_PERMISSIONS } from "@/types/rbac";

/**
 * Check if a permission matrix grants a specific resource.action.
 * Handles wildcards: "*::*" grants everything.
 * Handles resource wildcards: { resource: { "*": true } }.
 */
function checkPermission(
  permissions: PermissionMatrix | null | undefined,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  if (!permissions) return false;

  // 1. Admin wildcard
  if (permissions["*::*"]) return true;

  // 2. Resource wildcard
  const resourcePerms = permissions[resource];
  if (resourcePerms && resourcePerms["*"] === true) return true;

  // 3. Exact match
  if (resourcePerms && resourcePerms[action] === true) return true;

  return false;
}

/**
 * Fetch the user's role and permissions from the server.
 */
async function fetchUserRBAC(): Promise<{
  role: UserRole | null;
  permissions: PermissionMatrix | null;
}> {
  try {
    const supabase = createClient();

    // Get user_roles with role info via the RLS-protected query
    const { data: userRole, error } = await supabase
      .from("user_roles")
      .select("role_id, roles(name, permissions)")
      .maybeSingle();

    if (error || !userRole) {
      return { role: null, permissions: null };
    }

    const roleData = userRole.roles as {
      name: string;
      permissions: PermissionMatrix;
    } | null;

    if (!roleData) {
      return { role: null, permissions: null };
    }

    return {
      role: roleData.name as UserRole,
      permissions: roleData.permissions,
    };
  } catch {
    return { role: null, permissions: null };
  }
}

/**
 * Hook: returns the user's RBAC context.
 * Works client-side using React Query to cache the result.
 */
export function useRBAC(): RBACContext {
  const { user, isAuthenticated, tenant } = useAuth();

  const { data } = useQuery({
    queryKey: ["rbac", user?.id, tenant?.id],
    enabled: isAuthenticated && !!user,
    queryFn: fetchUserRBAC,
    staleTime: 30_000,
    retry: 1,
  });

  const role = data?.role ?? null;
  const permissions = data?.permissions ?? null;

  return useMemo<RBACContext>(
    () => ({
      role,
      permissions,
      isAdmin: role === "admin",
      isOwner: role === "owner",
      isStaff: role === "staff",
      can: (resource: PermissionResource, action: PermissionAction) =>
        checkPermission(permissions, resource, action),
      hasRole: (...roles: UserRole[]) => (role ? roles.includes(role) : false),
    }),
    [role, permissions]
  );
}

/**
 * Fallback when RBAC info is not available yet.
 * Returns safe defaults: no permissions, not authorized.
 */
export function useRBACSafe(): RBACContext {
  const fallback: RBACContext = {
    role: null,
    permissions: null,
    isAdmin: false,
    isOwner: false,
    isStaff: false,
    can: () => false,
    hasRole: () => false,
  };

  try {
    return useRBAC();
  } catch {
    return fallback;
  }
}
