import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { timingSafeEqual } from "@/lib/auth-utils";

// --- Rate Limiter (in-memory, per Edge instance) ---
const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute (task spec: 5 attempts per minute)
const LOGIN_RATE_LIMIT_MAX = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RATE_LIMIT_MAX = 5;
const API_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const API_RATE_LIMIT_MAX = 60; // 60 requests per minute per IP for general API

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginRateLimitStore = new Map<string, RateLimitEntry>();
const otpRateLimitStore = new Map<string, RateLimitEntry>();
const apiRateLimitStore = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries (every 5 minutes)
function cleanupStore(store: Map<string, RateLimitEntry>): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

// Run cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  cleanupStore(loginRateLimitStore);
  cleanupStore(otpRateLimitStore);
  cleanupStore(apiRateLimitStore);
}, 5 * 60 * 1000);

function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  ip: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// --- CSRF Protection (Double-Submit Cookie, Timing-Safe) ---
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function validateCSRF(request: NextRequest): boolean {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(request.method)) return true;

  const isAPIRoute = request.nextUrl.pathname.startsWith("/api/");
  if (isAPIRoute) return true;

  const cookieToken = request.cookies.get("__csrf_token")?.value;
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken) return false;

  // Timing-safe comparison (ported from Flask hmac.compare_digest)
  return timingSafeEqual(cookieToken, headerToken);
}

// --- Security Headers Helper ---
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Request-ID", crypto.randomUUID());
  return response;
}

function addNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

// --- Client IP extraction ---
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// --- CORS Configuration (Same-Origin Only) ---
const ALLOWED_ORIGINS = [
  "https://panel.merman.sbs",
  "https://owner.merman.sbs",
  "https://api.merman.sbs",
];

function getCORSHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
    "Vary": "Origin",
  };
}

// --- Main Middleware ---
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight (OPTIONS) requests
  if (request.method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(request);
    const resp = new NextResponse(null, { status: 204, headers: corsHeaders });
    return addSecurityHeaders(resp);
  }

  // Rate limiting for auth endpoints
  const isLoginPath = pathname === "/login" && request.method === "POST";
  const isOTPVerify = pathname.startsWith("/api/auth/otp") && request.method === "POST";
  const isAPIRoute = pathname.startsWith("/api/");

  // General API rate limiting (applies to all /api/ routes)
  if (isAPIRoute && !pathname.startsWith("/api/health")) {
    const clientIP = getClientIP(request);
    const rateResult = checkRateLimit(apiRateLimitStore, clientIP, API_RATE_LIMIT_WINDOW_MS, API_RATE_LIMIT_MAX);

    if (!rateResult.allowed) {
      const resp = NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(API_RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateResult.resetAt / 1000)),
          },
        }
      );
      return addSecurityHeaders(resp);
    }
  }

  if (isLoginPath) {
    const clientIP = getClientIP(request);
    const rateResult = checkRateLimit(loginRateLimitStore, clientIP, LOGIN_RATE_LIMIT_WINDOW_MS, LOGIN_RATE_LIMIT_MAX);

    if (!rateResult.allowed) {
      const resp = NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(LOGIN_RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateResult.resetAt / 1000)),
          },
        }
      );
      return addSecurityHeaders(resp);
    }
  }

  if (isOTPVerify) {
    const clientIP = getClientIP(request);
    const rateResult = checkRateLimit(otpRateLimitStore, clientIP, OTP_RATE_LIMIT_WINDOW_MS, OTP_RATE_LIMIT_MAX);

    if (!rateResult.allowed) {
      const resp = NextResponse.json(
        { error: "Too many verification attempts. Please request a new code." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(OTP_RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
      return addSecurityHeaders(resp);
    }
  }

  // CSRF validation for form submissions
  if (!validateCSRF(request)) {
    const resp = NextResponse.json(
      { error: "CSRF token validation failed" },
      { status: 403 }
    );
    return addSecurityHeaders(resp);
  }

  // Supabase Auth Session
  let response: NextResponse;

  try {
    response = await updateSession(request);
  } catch {
    response = NextResponse.next({ request });
  }

  // Set CSRF cookie if not present
  if (!request.cookies.get("__csrf_token")) {
    const csrfToken = generateCSRFToken();
    response.cookies.set("__csrf_token", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });
  }

  // Add security headers to all responses
  response = addSecurityHeaders(response);

  // Add CORS headers to API responses
  if (isAPIRoute) {
    const corsHeaders = getCORSHeaders(request);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  // Add no-cache headers on auth pages
  const authPages = ["/login", "/onboarding"];
  if (authPages.some((p) => pathname.startsWith(p))) {
    response = addNoCacheHeaders(response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};