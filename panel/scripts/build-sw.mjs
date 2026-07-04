#!/usr/bin/env node

/**
 * Post-build script to generate the service worker using @serwist/build.
 * 
 * Next.js 16 uses Turbopack by default, which @serwist/next's webpack plugin
 * doesn't support. This script:
 *   1. Compiles src/app/sw.ts → temporary bundled JS via esbuild
 *   2. Uses @serwist/build's injectManifest to inject the precache manifest
 *   3. Outputs the final sw.js to the `out/` directory (static export)
 */

import { injectManifest } from "@serwist/build";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "out");
const SW_SRC = resolve(ROOT, "src/app/sw.ts");
const SW_TMP = resolve(ROOT, ".next/sw-bundled.js");
const SW_DEST = resolve(OUT_DIR, "sw.js");

// Ensure out/ directory exists
if (!existsSync(OUT_DIR)) {
  console.error("❌ out/ directory not found. Run `next build` first.");
  process.exit(1);
}

// Step 1: Bundle sw.ts with esbuild
console.log("📦 Bundling service worker source...");
try {
  execSync(
    `npx esbuild "${SW_SRC}" --bundle --outfile="${SW_TMP}" --format=esm --platform=browser --target=es2020`,
    { cwd: ROOT, stdio: "inherit" }
  );
} catch (err) {
  console.error("❌ Failed to bundle sw.ts:", err.message);
  process.exit(1);
}

// Step 2: Inject precache manifest
console.log("💉 Injecting precache manifest...");
try {
  const { count, size } = await injectManifest({
    swSrc: SW_TMP,
    swDest: SW_DEST,
    globDirectory: OUT_DIR,
    globPatterns: [
      "**/*.{html,js,css,png,jpg,jpeg,svg,ico,woff,woff2,webmanifest}",
    ],
    globIgnores: ["sw.js", "workbox-*.js", "node_modules/**"],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
  });

  console.log(
    `✅ Service worker generated: ${count} files precached (${(size / 1024).toFixed(1)} KB)`
  );
} catch (err) {
  console.error("❌ injectManifest failed:", err.message);
  process.exit(1);
}

// Clean up temp file
try {
  rmSync(SW_TMP);
} catch {}

// Also copy sw.js to public/ so it's served during dev too
const publicSw = resolve(ROOT, "public/sw.js");
try {
  writeFileSync(publicSw, readFileSync(SW_DEST));
  console.log("📋 Copied sw.js to public/ for dev server");
} catch {}
