import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: true, // SW built separately via scripts/build-sw.mjs postbuild (Turbopack incompatible)
});

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
};

export default withSerwist(nextConfig);
