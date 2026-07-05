import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: true, // SW built separately via scripts/build-sw.mjs postbuild (Turbopack incompatible)
});

// ─── Security Headers ──────────────────────────────────────────────────────
const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "0", // Modern approach: disable legacy XSS auditor
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.iyzipay.com", // Next.js + IYZICO checkout scripts
      "style-src 'self' 'unsafe-inline'", // Required for Tailwind/shadcn inline styles
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in https://sandbox-api.iyzipay.com https://api.iyzipay.com", // Supabase realtime + REST + IYZICO
      "frame-src https://sandbox-api.iyzipay.com https://api.iyzipay.com https://*.iyzipay.com", // IYZICO checkout iframe
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.iyzipay.com", // IYZICO payment forms
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  // ─── Deployment Mode ─────────────────────────────────────────────────────
  // "export" = Static HTML/JS/CSS, served by nginx (current production)
  //   → Security headers come from nginx.conf (NOT from this config)
  //   → Proxy (src/proxy.ts) does NOT run
  //
  // "standalone" = Node.js server, proxy runs, headers() effective
  //   → Switch to "standalone" when you want Next.js proxy to handle
  //     rate limiting, CSRF, CORS, and security headers server-side
  //   → Requires the Dockerfile.standalone (not the nginx Dockerfile)
  //
  // To switch: change "export" → "standalone" and use Dockerfile.standalone
  output: "export",
  poweredByHeader: false,
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // CORS for API routes — same-origin only
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://panel.merman.sbs",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
