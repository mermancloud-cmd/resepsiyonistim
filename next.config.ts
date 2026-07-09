import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: true, // SW built separately via scripts/build-sw.mjs postbuild
});

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // ─── Deployment Mode ─────────────────────────────────────────────────────
  // "standalone" = Node.js server — required for API routes (/api/widget/*)
  output: "standalone",
  poweredByHeader: false,
  turbopack: {},

  // ─── Image Optimization ──────────────────────────────────────────────────
  images: {
    unoptimized: true,
  },

  // ─── Bundle Size ─────────────────────────────────────────────────────────
  productionBrowserSourceMaps: false,

  // ─── Experimental: Tree-shake heavy packages ─────────────────────────────
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@supabase/supabase-js",
      "@tanstack/react-query",
    ],
  },

  // ─── Security Headers (standalone mode) ──────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

const config = withBundleAnalyzer(nextConfig);

export default withSerwist(config);
