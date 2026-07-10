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
  output: "export",
  poweredByHeader: false,
  turbopack: {},

  // ─── Image Optimization ──────────────────────────────────────────────────
  // Since we use static export, next/image doesn't run on-demand.
  // We use unoptimized images (SVG/sprites) and nginx for caching.
  images: {
    unoptimized: true,
  },

  // ─── Bundle Size Monitoring ──────────────────────────────────────────────
  // Logs warnings when chunks exceed configured size thresholds.
  // Helps catch regressions before they reach production.
  productionBrowserSourceMaps: false,

  // ─── Experimental: Optimize package imports ──────────────────────────────
  // Prevents importing the entire recharts/lucide bundle on every page.
  // Only imports used components are included in the tree-shake.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@supabase/supabase-js",
      "@tanstack/react-query",
    ],
  },

  // ─── Headers (only used in standalone mode, but kept for reference) ──────
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
function getBundleAnalyzer(): (config: NextConfig) => NextConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@next/bundle-analyzer");
    return mod({ enabled: process.env.ANALYZE === "true" });
  } catch {
    return (c: NextConfig) => c;
  }
}
const withBundleAnalyzer = getBundleAnalyzer();

const config = withBundleAnalyzer(nextConfig);

export default withSerwist(config);
