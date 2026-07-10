import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Deployment Mode ─────────────────────────────────────────────────────
  // "standalone" = Node.js server — required for API routes (/api/*)
  output: "standalone",
  poweredByHeader: false,

  // ─── Image Optimization ──────────────────────────────────────────────────
  images: {
    unoptimized: true,
  },

  // ─── Bundle Size Monitoring ──────────────────────────────────────────────
  productionBrowserSourceMaps: false,

  // ─── Experimental: Optimize package imports ──────────────────────────────
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@supabase/supabase-js",
      "@tanstack/react-query",
    ],
  },

  // ─── Headers ─────────────────────────────────────────────────────────────
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

// Bundle analyzer wrapper (activated via ANALYZE=true env var, optional dep)
let withBundleAnalyzer = (c: NextConfig) => c;
try {
  const mod = require("@next/bundle-analyzer");
  withBundleAnalyzer = mod({ enabled: process.env.ANALYZE === "true" });
} catch {
  // @next/bundle-analyzer is optional, skip if not installed
}

const config = withBundleAnalyzer(nextConfig);

export default config;
