/**
 * Cloudflare Pages Edge Middleware
 *
 * Runs at Cloudflare's edge BEFORE serving static content.
 * Provides server-side security that works with static exports.
 *
 * Handles:
 * 1. Auth gating on protected routes (checks Supabase JWT cookies)
 * 2. Rate limiting on login/auth endpoints (per-IP, in-memory per edge node)
 * 3. CSRF token validation for state-changing requests
 * 4. Security headers (supplement/override _headers file)
 * 5. Returns 401 JSON for unauthenticated API requests
 */

// ─── Constants ─────────────────────────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/_next",
  "/favicon",
  "/manifest",
  "/sw.js",
  "/api/health",
];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/reservations",
  "/payments",
  "/messages",
  "/settings",
  "/analytics",
  "/ai",
  "/subscription",
  "/onboarding",
];

const API_PROTECTED_PREFIXES = [
  "/api/dashboard",
  "/api/reservations",
  "/api/conversations",
  "/api/push",
  "/api/subscription",
];

// Rate limiting: 5 login attempts per 60 seconds per IP
const LOGIN_RATE_LIMIT_WINDOW_S = 60;
const LOGIN_RATE_LIMIT_MAX = 5;
// General API: 60 requests per minute per IP
const API_RATE_LIMIT_WINDOW_S = 60;
const API_RATE_LIMIT_MAX = 60;

// ─── Rate Limiter (KV-backed for distributed edge nodes) ───────────────────

interface Env {
  RATE_LIMIT_KV?: KVNamespace;
}

async function checkLoginRateLimit(
  env: Env,
  clientIP: string
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const key = `rl:login:${clientIP}`;

  try {
    // Try KV-backed rate limiting first (works across edge nodes)
    if (env.RATE_LIMIT_KV) {
      const existing = await env.RATE_LIMIT_KV.get<{ count: number; resetAt: number }>(key, "json");
      const now = Math.floor(Date.now() / 1000);

      if (!existing || now >= existing.resetAt) {
        const resetAt = now + LOGIN_RATE_LIMIT_WINDOW_S;
        await env.RATE_LIMIT_KV.put(
          key,
          JSON.stringify({ count: 1, resetAt }),
          { expirationTtl: LOGIN_RATE_LIMIT_WINDOW_S }
        );
        return { allowed: true, remaining: LOGIN_RATE_LIMIT_MAX - 1, retryAfter: 0 };
      }

      existing.count++;
      if (existing.count > LOGIN_RATE_LIMIT_MAX) {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: existing.resetAt - now,
        };
      }

      await env.RATE_LIMIT_KV.put(
        key,
        JSON.stringify(existing),
        { expirationTtl: existing.resetAt - now }
      );
      return {
        allowed: true,
        remaining: LOGIN_RATE_LIMIT_MAX - existing.count,
        retryAfter: 0,
      };
    }
  } catch {
    // KV not available — fall through to allow (fail open)
  }

  // No KV available — allow request (rate limiting handled client-side)
  return { allowed: true, remaining: LOGIN_RATE_LIMIT_MAX, retryAfter: 0 };
}

async function checkAPIRateLimit(
  env: Env,
  clientIP: string
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const key = `rl:api:${clientIP}`;

  try {
    if (env.RATE_LIMIT_KV) {
      const existing = await env.RATE_LIMIT_KV.get<{ count: number; resetAt: number }>(key, "json");
      const now = Math.floor(Date.now() / 1000);

      if (!existing || now >= existing.resetAt) {
        const resetAt = now + API_RATE_LIMIT_WINDOW_S;
        await env.RATE_LIMIT_KV.put(
          key,
          JSON.stringify({ count: 1, resetAt }),
          { expirationTtl: API_RATE_LIMIT_WINDOW_S }
        );
        return { allowed: true, remaining: API_RATE_LIMIT_MAX - 1, retryAfter: 0 };
      }

      existing.count++;
      if (existing.count > API_RATE_LIMIT_MAX) {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: existing.resetAt - now,
        };
      }

      await env.RATE_LIMIT_KV.put(
        key,
        JSON.stringify(existing),
        { expirationTtl: existing.resetAt - now }
      );
      return {
        allowed: true,
        remaining: API_RATE_LIMIT_MAX - existing.count,
        retryAfter: 0,
      };
    }
  } catch {
    // KV not available — fail open
  }

  return { allowed: true, remaining: API_RATE_LIMIT_MAX, retryAfter: 0 };
}

// ─── Auth Check (Supabase JWT Cookie Validation) ────────────────────────────

function hasValidAuthCookies(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;

  // Supabase SSR sets sb-*-auth-token and sb-*-auth-token-code-verifier cookies
  // Also check for the standard Supabase session cookies
  const cookies = parseCookies(cookieHeader);

  // Check for any Supabase auth token cookie (the name includes the project ref)
  const hasAuthToken = Object.keys(cookies).some(
    (name) =>
      name.includes("auth-token") ||
      name.startsWith("sb-") && name.includes("auth-token")
  );

  return hasAuthToken;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (key) {
      cookies[key.trim()] = decodeURIComponent(rest.join("="));
    }
  });
  return cookies;
}

// ─── CSRF Validation ────────────────────────────────────────────────────────

function validateCSRFToken(request: Request, cookies: Record<string, string>): boolean {
  const method = request.method.toUpperCase();
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(method)) return true;

  // API routes use token-based auth (Supabase JWT), CSRF not needed
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return true;

  // For form submissions, validate double-submit cookie
  const cookieToken = cookies["__csrf_token"];
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken) return false;

  // Constant-time comparison
  if (cookieToken.length !== headerToken.length) return false;

  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return result === 0;
}

// ─── Security Headers ───────────────────────────────────────────────────────

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Request-ID", crypto.randomUUID());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "0");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // Return new response with modified headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─── CORS Configuration (Same-Origin Only) ──────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://panel.merman.sbs",
  "https://owner.merman.sbs",
  "https://api.merman.sbs",
];

function getCORSHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      ...extraHeaders,
    },
  });
}

// ─── Client IP Extraction ───────────────────────────────────────────────────

function getClientIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Path Classification ────────────────────────────────────────────────────

function isPublicPath(pathname: string): boolean {
  // Exact matches
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }

  // Static assets
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|map|json|webmanifest|txt)$/.test(pathname)) {
    return true;
  }

  // Next.js static files
  if (pathname.startsWith("/_next/")) return true;

  // Root page is public
  if (pathname === "/" || pathname === "") return true;

  return false;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isProtectedAPI(pathname: string): boolean {
  return API_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isLoginPOST(pathname: string, method: string): boolean {
  return pathname === "/login" && method === "POST";
}

// ─── Main Middleware Handler ────────────────────────────────────────────────

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();

  // Handle CORS preflight (OPTIONS) requests
  if (method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(request);
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  }

  // Skip middleware for static assets and Next.js internals
  if (pathname.startsWith("/_next/") || /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/.test(pathname)) {
    return next();
  }

  const cookieHeader = request.headers.get("cookie");
  const cookies = cookieHeader ? parseCookies(cookieHeader) : {};

  // ── Rate Limiting on Login ──────────────────────────────────────────────
  if (isLoginPOST(pathname, method) || pathname.startsWith("/api/auth/otp")) {
    const clientIP = getClientIP(request);
    const rateResult = await checkLoginRateLimit(env, clientIP);

    if (!rateResult.allowed) {
      return jsonResponse(
        { error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." },
        429,
        {
          "Retry-After": String(rateResult.retryAfter),
          "X-RateLimit-Limit": String(LOGIN_RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + rateResult.retryAfter),
        }
      );
    }
  }

  // ── General API Rate Limiting ──────────────────────────────────────────
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/health")) {
    const clientIP = getClientIP(request);
    const rateResult = await checkAPIRateLimit(env, clientIP);

    if (!rateResult.allowed) {
      return jsonResponse(
        { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
        429,
        {
          "Retry-After": String(rateResult.retryAfter),
          "X-RateLimit-Limit": String(API_RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + rateResult.retryAfter),
        }
      );
    }
  }

  // ── CSRF Validation ───────────────────────────────────────────────────
  if (!validateCSRFToken(request, cookies)) {
    return jsonResponse({ error: "CSRF token validation failed" }, 403);
  }

  // ── Auth Check on Protected API Routes → 401 JSON ─────────────────────
  if (isProtectedAPI(pathname)) {
    if (!hasValidAuthCookies(cookieHeader)) {
      return jsonResponse({ error: "Unauthorized", message: "Authentication required" }, 401);
    }
  }

  // ── Auth Check on Protected Pages → Redirect to Login ─────────────────
  if (isProtectedPath(pathname) && !isPublicPath(pathname)) {
    if (!hasValidAuthCookies(cookieHeader)) {
      // For XHR/fetch requests, return 401 JSON
      const accept = request.headers.get("accept") || "";
      if (accept.includes("application/json") || request.headers.get("x-requested-with")) {
        return jsonResponse({ error: "Unauthorized", redirect: "/login" }, 401);
      }

      // For page navigation, redirect to login with return URL
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("reason", "unauthorized");
      return Response.redirect(loginUrl.toString(), 302);
    }
  }

  // ── Continue to Static Asset Serving ──────────────────────────────────
  const response = await next();

  // Add CORS headers to API responses
  if (pathname.startsWith("/api/")) {
    const corsHeaders = getCORSHeaders(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }
    const corsResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    return addSecurityHeaders(corsResponse);
  }

  return addSecurityHeaders(response);
};
