import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "staff" | "owner";

export interface RBACUser {
  id: string;
  email?: string;
  role: UserRole | null;
  tenant_id: string | null;
}

export interface PermissionAction {
  resource: string;
  action: string;
}

// ─── Server-side RBAC ─────────────────────────────────────────────────────────

/**
 * Get the RBAC info for a user from the database.
 * Uses the admin client (bypasses RLS) to query user_roles.
 */
export async function getUserRBAC(userId: string): Promise<RBACUser> {
  try {
    const admin = createAdminClient();

    // Get user email from auth
    const { data: { user } } = await admin.auth.admin.getUserById(userId);

    // Get role assignment
    const { data: userRole } = await admin
      .from("user_roles")
      .select("role_id, tenant_id, roles(name)")
      .eq("user_id", userId)
      .single();

    if (!userRole) {
      return { id: userId, email: user?.email, role: null, tenant_id: null };
    }

    const rolesData = userRole.roles as { name: string } | { name: string }[];
    const roleName = Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name;

    return {
      id: userId,
      email: user?.email,
      role: (roleName as UserRole) || null,
      tenant_id: userRole.tenant_id,
    };
  } catch {
    return { id: userId, role: null, tenant_id: null };
  }
}

/**
 * Extract user ID from a NextRequest using Supabase session cookie.
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<{ id: string } | null> {
  try {
    const token =
      request.cookies.get("sb-access-token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      "";

    if (!token) return null;

    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;

    return { id: user.id };
  } catch {
    return null;
  }
}

/**
 * Authenticate and authorize a request for a specific permission.
 * Returns { authorized: true, user } or { authorized: false, status, error }.
 */
export async function authorizeRequest(
  request: NextRequest,
  requiredPermission?: string
): Promise<
  | { authorized: true; user: RBACUser }
  | { authorized: false; status: number; error: string }
> {
  // 1. Authenticate
  let userId: string;
  try {
    const token =
      request.cookies.get("sb-access-token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      "";

    if (!token) {
      return { authorized: false, status: 401, error: "Kimlik doğrulama gerekli" };
    }

    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) {
      return { authorized: false, status: 401, error: "Geçersiz veya süresi dolmuş oturum" };
    }
    userId = user.id;
  } catch {
    return { authorized: false, status: 401, error: "Kimlik doğrulama başarısız" };
  }

  // 2. Get RBAC info
  const rbac = await getUserRBAC(userId);
  if (!rbac.role) {
    return { authorized: false, status: 403, error: "Bu işlem için yetkiniz yok" };
  }

  // 3. Authorize
  if (requiredPermission) {
    const [resource, action] = requiredPermission.split(".");
    const adminClient = createAdminClient();

    // Use the user_has_permission RPC function
    const { data: hasPermission } = await adminClient.rpc("user_has_permission", {
      p_permission: requiredPermission,
    });

    if (!hasPermission) {
      return {
        authorized: false,
        status: 403,
        error: "Bu işlem için gerekli izniniz yok",
      };
    }
  }

  return { authorized: true, user: rbac };
}

/**
 * Create a 401 JSON response (Türkçe)
 */
export function unauthorizedResponse(message = "Oturum açmanız gerekiyor"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a 403 JSON response (Türkçe)
 */
export function forbiddenResponse(message = "Bu işlem için yetkiniz yok"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
