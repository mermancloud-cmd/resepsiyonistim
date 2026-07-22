import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Timing-safe string comparison (prevents timing attacks on CSRF tokens)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Constant-time: compare against itself so duration is consistent
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ a.charCodeAt(i);
    for (let i = 0; i < b.length; i++) mismatch |= b.charCodeAt(i) ^ b.charCodeAt(i);
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// --- Rate Limiter (in-memory, per Edge instance) ---
const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOGIN_RATE_LIMIT_MAX = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const OTP_RATE_LIMIT_MAX = 5;
const API_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const API_RATE_LIMIT_MAX = 60;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginRateLimitStore = new Map<string, RateLimitEntry>();
const otpRateLimitStore = new Map<string, RateLimitEntry>();
const apiRateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  [loginRateLimitStore, otpRateLimitStore, apiRateLimitStore].forEach((store) => {
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) store.delete(key);
    }
  });
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

// --- CSRF Protection ---
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
  return timingSafeEqual(cookieToken, headerToken);
}

// --- Security Headers ---
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()"
  );
  response.headers.set("X-Request-ID", crypto.randomUUID());
  return response;
}

function addNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// --- CORS ---
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
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// --- Main Proxy (Next.js 16 convention — previously middleware) ---
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(request);
    const resp = new NextResponse(null, { status: 204, headers: corsHeaders });
    return addSecurityHeaders(resp);
  }

  // Rate limiting
  const isLoginPath = pathname === "/login" && request.method === "POST";
  const isOTPVerify = pathname.startsWith("/api/auth/otp") && request.method === "POST";
  const isAPIRoute = pathname.startsWith("/api/");

  if (isAPIRoute && !pathname.startsWith("/api/health")) {
    const clientIP = getClientIP(request);
    const rateResult = checkRateLimit(
      apiRateLimitStore,
      clientIP,
      API_RATE_LIMIT_WINDOW_MS,
      API_RATE_LIMIT_MAX
    );
    if (!rateResult.allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.ceil((rateResult.resetAt - Date.now()) / 1000)
              ),
              "X-RateLimit-Limit": String(API_RATE_LIMIT_MAX),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(rateResult.resetAt / 1000)),
            },
          }
        )
      );
    }
  }

  if (isLoginPath) {
    const clientIP = getClientIP(request);
    const rateResult = checkRateLimit(
      loginRateLimitStore,
      clientIP,
      LOGIN_RATE_LIMIT_WINDOW_MS,
      LOGIN_RATE_LIMIT_MAX
    );
    if (!rateResult.allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.ceil((rateResult.resetAt - Date.now()) / 1000)
              ),
              "X-RateLimit-Limit": String(LOGIN_RATE_LIMIT_MAX),
              "X-RateLimit-Remaining": "0",
            },
          }
        )
      );
    }
  }

  if (isOTPVerify) {
    const clientIP = getClientIP(request);
    const rateResult = checkRateLimit(
      otpRateLimitStore,
      clientIP,
      OTP_RATE_LIMIT_WINDOW_MS,
      OTP_RATE_LIMIT_MAX
    );
    if (!rateResult.allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Too many verification attempts. Please request a new code." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.ceil((rateResult.resetAt - Date.now()) / 1000)
              ),
            },
          }
        )
      );
    }
  }

  // CSRF validation
  if (!validateCSRF(request)) {
    return addSecurityHeaders(
      NextResponse.json({ error: "CSRF token validation failed" }, { status: 403 })
    );
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
      maxAge: 24 * 60 * 60,
    });
  }

  response = addSecurityHeaders(response);

  if (isAPIRoute) {
    const corsHeaders = getCORSHeaders(request);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  const authPages = ["/login", "/onboarding", "/signup"];
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
