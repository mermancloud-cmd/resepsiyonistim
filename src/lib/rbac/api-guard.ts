import type { NextRequest } from "next/server";
import { authorizeRequest, unauthorizedResponse, forbiddenResponse } from "@/lib/server-rbac";
import type { UserRole } from "@/lib/server-rbac";

export interface ApiGuardSuccess {
  allowed: true;
  user: { tenantId: string };
}

export interface ApiGuardFailure {
  allowed: false;
  response: Response;
}

export type ApiGuardResult = ApiGuardSuccess | ApiGuardFailure;

/**
 * RBAC guard for Next.js API routes.
 * Uses Supabase session cookie for auth + user_roles for authorization.
 *
 * Returns { allowed, response, user } shape for convenient route-level usage.
 */
export async function apiGuard(
  request: NextRequest,
  roles?: UserRole[],
): Promise<ApiGuardResult> {
  const auth = await authorizeRequest(request);

  if (!auth.authorized) {
    if (auth.status === 401) {
      return { allowed: false, response: unauthorizedResponse(auth.error) };
    }
    return { allowed: false, response: forbiddenResponse(auth.error) };
  }

  // Role check — if roles specified, validate user's role is in the list
  if (roles && roles.length > 0 && auth.user.role) {
    if (!roles.includes(auth.user.role)) {
      return {
        allowed: false,
        response: forbiddenResponse("Bu işlem için yeterli yetkiniz yok"),
      };
    }
  }

  // If user has no role at all, deny
  if (!auth.user.role) {
    return {
      allowed: false,
      response: forbiddenResponse("Bu işlem için yetkiniz yok"),
    };
  }

  return {
    allowed: true,
    user: { tenantId: auth.user.tenant_id ?? "" },
  };
}
