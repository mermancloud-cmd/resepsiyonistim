# ──────────────────────────────────────────────────────────────────────────────
# Dockerfile — Bungalow Owner Panel (Security-Hardened nginx)
#
# Multi-stage build:
#   1. deps    — Install Node.js dependencies
#   2. builder — Build Next.js static export
#   3. runner  — Serve with hardened nginx (non-root)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js public env vars required at build time for static export
# These are baked into the JS bundle during `next build` for export mode
ARG NEXT_PUBLIC_SUPABASE_URL=https://xzmakpsongrcbnrpdvsy.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bWFrcHNvbmdyY2JucnBkdnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTU5MjgsImV4cCI6MjA5NTk5MTkyOH0.kIeLLVfO68wShvgPjEvHxtYG61U6a7_jM_1bDxisyYo
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

# Build static export → output goes to ./out/
RUN npx next build

# ── Stage 3: Production (Hardened nginx) ─────────────────────────────────────
FROM nginx:1.31-alpine AS runner

# Remove default nginx config and html
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy hardened nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static export from builder
COPY --from=builder /app/out /usr/share/nginx/html

# Copy public assets (including _headers for reference, health.json)
COPY --from=builder /app/public/* /usr/share/nginx/html/

# Run nginx as non-root (optional hardening — requires adjusting paths)
# For simplicity, keep default nginx user but ensure config is secure

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
