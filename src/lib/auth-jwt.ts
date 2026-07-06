/**
 * JWT Verification Utilities for Supabase Auth
 *
 * Used by:
 * 1. Cloudflare Functions middleware (functions/_middleware.ts)
 * 2. Server-side API routes (if ever switching to standalone mode)
 * 3. Any proxy layer that needs to verify Supabase JWTs
 *
 * Supabase JWTs are standard RS256 tokens signed by the project's key.
 * The public key can be fetched from: {SUPABASE_URL}/auth/v1/settings
 * or from the JWKS endpoint: {SUPABASE_URL}/auth/v1/keys
 */

import { createAdminClient } from "./supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerifiedToken {
  sub: string; // User ID (UUID)
  email?: string;
  phone?: string;
  role: string; // "authenticated" | "anon" | "service_role"
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface TenantClaim {
  user_id: string;
  tenant_id: string;
  email?: string;
  phone?: string;
  role: string;
}

// ─── JWT Verification via Supabase Admin Client ──────────────────────────────

/**
 * Verify a Supabase JWT by calling the Supabase Auth API.
 * This is the recommended approach for server-side verification
 * as it doesn't require managing JWKS keys manually.
 *
 * @param accessToken - The Supabase access token (JWT)
 * @returns The verified user data, or null if invalid
 */
export async function verifySupabaseJWT(
  accessToken: string
): Promise<VerifiedToken | null> {
  try {
    const admin = createAdminClient();

    // Use the admin client to verify the token by getting the user
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    return {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: "authenticated",
      aud: "authenticated",
      exp: 0, // Not available from getUser
      iat: 0,
      iss: "",
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    };
  } catch {
    return null;
  }
}

/**
 * Decode a JWT without verification (for debugging/logging only).
 * DO NOT use this for authorization decisions.
 */
export function decodeJWT(token: string): VerifiedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    return payload as VerifiedToken;
  } catch {
    return null;
  }
}

// ─── Extract Token from Request ──────────────────────────────────────────────

/**
 * Extract the Supabase access token from various locations:
 * 1. Authorization: Bearer <token> header
 * 2. sb-access-token cookie (set by Supabase SSR client)
 * 3. access_token query parameter (for SSE/WebSocket connections)
 */
export function extractAccessToken(request: Request): string | null {
  // 1. Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. Cookie
  const cookies = request.headers.get("cookie");
  if (cookies) {
    const match = cookies.match(/(?:^|;\s*)sb-access-token=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }

  // 3. Query parameter
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("access_token");
  if (queryToken) return queryToken;

  return null;
}

// ─── Tenant Scoping ──────────────────────────────────────────────────────────

/**
 * Look up the tenant_id for a given user_id.
 * Uses the admin client (bypasses RLS) to query the tenants table.
 *
 * @returns The tenant claim with user and tenant info, or null if no tenant found
 */
export async function getTenantForUser(
  userId: string
): Promise<TenantClaim | null> {
  try {
    const admin = createAdminClient();

    // Get user details
    const {
      data: { user },
    } = await (admin.auth as any).admin.getUserById(userId);
    if (!user) return null;

    // Look up tenant from tenants table
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (tenantRow) {
      return {
        user_id: userId,
        tenant_id: tenantRow.id,
        email: user.email,
        phone: user.phone,
        role: "authenticated",
      };
    }

    // Fallback: businesses table
    const { data: bizRow } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (bizRow) {
      return {
        user_id: userId,
        tenant_id: bizRow.id,
        email: user.email,
        phone: user.phone,
        role: "authenticated",
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Auth Middleware for API Routes ───────────────────────────────────────────

export interface AuthenticatedRequest {
  user: VerifiedToken;
  tenant: TenantClaim;
}

/**
 * Authenticate and authorize an incoming request.
 * Verifies the JWT, looks up the tenant, and returns both.
 *
 * @returns { ok: true, auth } on success, or { ok: false, status, error } on failure
 */
export async function authenticateRequest(
  request: Request
): Promise<
  | { ok: true; auth: AuthenticatedRequest }
  | { ok: false; status: number; error: string }
> {
  // Extract token
  const token = extractAccessToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Missing authentication token" };
  }

  // Verify JWT
  const verified = await verifySupabaseJWT(token);
  if (!verified) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  // Must be authenticated (not anon)
  if (verified.role !== "authenticated") {
    return { ok: false, status: 403, error: "Insufficient permissions" };
  }

  // Look up tenant
  const tenant = await getTenantForUser(verified.sub);
  if (!tenant) {
    return {
      ok: false,
      status: 403,
      error: "No tenant associated with this account",
    };
  }

  return { ok: true, auth: { user: verified, tenant } };
}

/**
 * Convenience: Create a 401 JSON response
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Convenience: Create a 403 JSON response
 */
export function forbiddenResponse(message = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
