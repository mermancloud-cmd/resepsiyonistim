     1|# ──────────────────────────────────────────────────────────────────────────────
     2|# Dockerfile — Resepsiyonistim (Next.js Standalone Node.js Server)
     3|#
     4|# Build context = repo root. Panel code is under panel/.
     5|# Coolify base_directory = "/" (root), dockerfile_location = "/Dockerfile"
     6|# ──────────────────────────────────────────────────────────────────────────────
     7|
     8|# ── Stage 1: deps ────────────────────────────────────────────────────────────
     9|FROM node:20-alpine AS deps
    10|RUN apk add --no-cache libc6-compat
    11|WORKDIR /app
    12|COPY panel/package.json panel/package-lock.json* ./
    13|RUN npm install --legacy-peer-deps
    14|
    15|# ── Stage 2: builder ─────────────────────────────────────────────────────────
    16|FROM node:20-alpine AS builder
    17|WORKDIR /app
    18|COPY --from=deps /app/node_modules ./node_modules
    19|COPY panel/ .
    20|ENV NEXT_TELEMETRY_DISABLED=1
    21|ENV NODE_ENV=production
    22|# Next.js public env vars required at build time
    23|ARG NEXT_PUBLIC_SUPABASE_URL
    24|ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
    25|ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
    26|ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    27|ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    28|ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
    29|RUN npx next build
    30|
    31|# ── Stage 3: runner (Node.js standalone) ────────────────────────────────────
    32|FROM node:20-alpine AS runner
    33|WORKDIR /app
    34|ENV NODE_ENV=production
    35|ENV NEXT_TELEMETRY_DISABLED=1
    36|RUN addgroup --system --gid 1001 nodejs
    37|RUN adduser --system --uid 1001 nextjs
    38|COPY --from=builder /app/public ./public
    39|COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    40|COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    41|USER nextjs
    42|EXPOSE 3000
    43|ENV PORT=3000
    44|ENV HOSTNAME="0.0.0.0"
    45|HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    46|  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1
    47|CMD ["node", "server.js"]