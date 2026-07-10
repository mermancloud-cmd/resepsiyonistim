import { NextResponse } from "next/server";

// ─── Build hash from environment (injected at Docker build time) ─────────────
// This is set via ENV in the Dockerfile or passed at build time.
// Falls back to a placeholder for local dev.
const BUILD_HASH =
  process.env.NEXT_PUBLIC_BUILD_HASH ??
  process.env.BUILD_HASH ??
  "dev-no-hash";

// ─── Runtime health check cache ──────────────────────────────────────────────
// Avoid hitting Supabase on every health check ping (k8s/Docker health check
// probes every 30s). Cache is valid for 60 seconds.
let cachedStatus: "healthy" | "degraded" | "unhealthy" | null = null;
let cachedDbOk = false;
let lastCheck = 0;
const CACHE_TTL_MS = 60_000;

async function checkSupabase(): Promise<boolean> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return false;

    // Lightweight ping: fetch the Supabase REST API openapi description
    // This doesn't require auth and proves the host is reachable.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return res.ok || res.status === 401;
    // 401 is expected (anonymous user), but it proves the DB is accepting connections
  } catch {
    return false;
  }
}

// ─── GET /api/health ─────────────────────────────────────────────────────────
export async function GET() {
  const now = Date.now();
  let dbOk = cachedDbOk;
  let status = cachedStatus;

  // Refresh cache if expired or never checked
  if (cachedStatus === null || now - lastCheck > CACHE_TTL_MS) {
    dbOk = await checkSupabase();
    cachedDbOk = dbOk;

    if (!dbOk) {
      // Try once more after a short delay in case of transient blip
      await new Promise((r) => setTimeout(r, 1000));
      dbOk = await checkSupabase();
      cachedDbOk = dbOk;
    }

    status = dbOk ? "healthy" : "degraded";
    cachedStatus = status;
    lastCheck = Date.now();
  }

  // Collect basic server info
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  const payload = {
    status,
    service: "owner-panel",
    build_hash: BUILD_HASH,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(uptime),
    checks: {
      supabase: dbOk ? "connected" : "unreachable",
    },
    version: process.env.npm_package_version ?? "0.1.0",
  };

  const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

  return NextResponse.json(payload, { status: httpStatus });
}
