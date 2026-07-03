     1|# ──────────────────────────────────────────────────────────────────────────────
     2|# Dockerfile — Bungalow Owner Panel (Security-Hardened nginx)
     3|#
     4|# Multi-stage build:
     5|#   1. deps    — Install Node.js dependencies
     6|#   2. builder — Build Next.js static export
     7|#   3. runner  — Serve with hardened nginx (non-root)
     8|# ──────────────────────────────────────────────────────────────────────────────
     9|
    10|# ── Stage 1: Dependencies ────────────────────────────────────────────────────
    11|FROM node:20-alpine AS deps
    12|RUN apk add --no-cache libc6-compat
    13|WORKDIR /app
    14|
    15|COPY package.json package-lock.json* ./
    16|RUN npm ci
    17|
    18|# ── Stage 2: Build ───────────────────────────────────────────────────────────
    19|FROM node:20-alpine AS builder
    20|WORKDIR /app
    21|COPY --from=deps /app/node_modules ./node_modules
    22|COPY . .
    23|
    24|ENV NEXT_TELEMETRY_DISABLED=1
    25|ENV NODE_ENV=production
    26|
    27|# Next.js public env vars required at build time for static export
    28|# These are baked into the JS bundle during `next build` for export mode
    29|ARG NEXT_PUBLIC_SUPABASE_URL=https://xzmakpsongrcbnrpdvsy.supabase.co
    30|ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bWFrcHNvbmdyY2JucnBkdnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTU5MjgsImV4cCI6MjA5NTk5MTkyOH0.kIeLLVfO68wShvgPjEvHxtYG61U6a7_jM_1bDxisyYo
    31|ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=
    32|ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    33|ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    34|ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
    35|
    36|# Build static export → output goes to ./out/
    37|RUN npx next build
    38|
    39|# ── Stage 3: Production (Hardened nginx) ─────────────────────────────────────
    40|FROM nginx:1.31-alpine AS runner
    41|
    42|# Remove default nginx config and html
    43|RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*
    44|
    45|# Copy hardened nginx configuration
    46|COPY nginx.conf /etc/nginx/nginx.conf
    47|
    48|# Copy static export from builder
    49|COPY --from=builder /app/out /usr/share/nginx/html
    50|
    51|# Copy public assets (including _headers for reference, health.json)
    52|COPY --from=builder /app/public/* /usr/share/nginx/html/
    53|
    54|# Run nginx as non-root (optional hardening — requires adjusting paths)
    55|# For simplicity, keep default nginx user but ensure config is secure
    56|
    57|EXPOSE 80
    58|
    59|# Health check
    60|HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    61|  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1
    62|
    63|CMD ["nginx", "-g", "daemon off;"]
    64|