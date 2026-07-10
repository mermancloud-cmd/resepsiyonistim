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

export interface ApiGuardResult {
  allowed: boolean;
  response?: Response;
  user: { tenantId: string; id: string; role: string | null };
}

/**
 * API Guard — Authenticate & authorize a request for a set of roles.
 * Returns { allowed, response, user } for consistent handling in API routes.
 */
export async function apiGuard(
  request: NextRequest,
  allowedRoles?: UserRole[]
): Promise<ApiGuardResult> {
  try {
    const token =
      request.cookies.get("sb-access-token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      "";

    if (!token) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ error: "Kimlik doğrulama gerekli" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        ),
        user: { tenantId: "", id: "", role: null },
      };
    }

    const admin = createAdminClient();
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);
    if (error || !user) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ error: "Geçersiz veya süresi dolmuş oturum" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        ),
        user: { tenantId: "", id: "", role: null },
      };
    }

    // Get role from user_roles table
    const { data: userRole } = await admin
      .from("user_roles")
      .select("role_id, tenant_id, roles(name)")
      .eq("user_id", user.id)
      .maybeSingle();

    let roleName: string | null = null;
    if (userRole?.roles) {
      const roles: unknown = userRole.roles;
      if (Array.isArray(roles) && roles.length > 0) {
        const first = roles[0] as { name?: string } | undefined;
        roleName = first?.name ?? null;
      } else if (typeof roles === "object" && roles !== null && !Array.isArray(roles)) {
        const obj = roles as Record<string, unknown>;
        roleName = typeof obj.name === "string" ? obj.name : null;
      }
    }
    const tenantId = userRole?.tenant_id ?? "";

    if (allowedRoles && allowedRoles.length > 0) {
      if (!roleName || !allowedRoles.includes(roleName as UserRole)) {
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({ error: "Bu işlem için yetkiniz yok" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          ),
          user: { tenantId: tenantId || "", id: user.id, role: roleName },
        };
      }
    }

    return {
      allowed: true,
      user: {
        tenantId: tenantId || "",
        id: user.id,
        role: roleName,
      },
    };
  } catch (err) {
    console.error("apiGuard error:", err);
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ error: "Sunucu hatası" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
      user: { tenantId: "", id: "", role: null },
    };
  }
}
