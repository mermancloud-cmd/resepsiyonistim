# Resepsiyonistim — Repo Sadeleştirme & Coolify Tek Seferde Kurulum Planı

> **Plan Modu:** Bu plan yalnızca planlama aşamasıdır. Kod değişikliği yapılmaz.
> **Hedef:** Repoyu temizle, gereksiz dosyaları kaldır, Docker yapısını tek standarda indir, Coolify ile tek seferde deploy edilebilir hale getir.

**Goal:** Resepsiyonistim GitHub reposunu sadeleştirip geliştirerek, Coolify üzerinde tek komutla (git push ile) ayağa kalkabilen, production-ready bir Next.js uygulaması haline getirmek.

**Architecture:** Mevcut proje Next.js 16 standalone modunda çalışıyor. Cloudflare Pages legacy kodları temizlenecek, sadece Next.js standalone + Supabase auth kalacak. Docker multi-stage build ile optimize edilecek. Coolify'in git-pull + Docker build pipeline'ına tam uyum sağlanacak.

**Tech Stack:** Next.js 16 (standalone), Supabase (auth + db), Tailwind CSS v4, Docker multi-stage, Coolify

**Mevcut Durum Tespiti:**
- 197 source file (src/ altında)
- 2 Dockerfile (Dockerfile + Dockerfile.nextjs) — farklı stratejiler
- 1 adet middleware artığı (functions/\_middleware.ts — Cloudflare Pages için)
- 1 adet Next.js proxy (src/proxy.ts — kullanılmıyor olabilir)
- backups/ dizini (RBAC scriptleri — repositoride yeri yok)
- 2 adet logo dosyası (1.tif, 2.tif — TIF formatında marka logoları, ~24MB)
-   → Web formatına dönüştürülüp `public/brand/` altına taşınacak
- .hermes-plan.md (eski plan)
- nginx.conf (259 satır — Coolify Docker'da gerekli değil, Traefik var)
- .env.production gitignore'da ama deploy için lazım (örnek olarak)
- TODO list, eskimiş dokümanlar (PROJE_DURUMU.md, PROJE_ELESTIRI.md)

---

## Task 1: Repo Temizliği — Gereksiz Dosyaları Kaldır

**Objective:** Repodan build artifact'lerini, legacy Cloudflare kodlarını, büyük binary dosyaları ve eski dokümanları temizle.

**Files:**
- Modify: `.gitignore`
- Delete: `1.tif`, `2.tif`
- Delete: `functions/` (tümü — Cloudflare Pages middleware legacy)
- Delete: `backups/` (tümü — RBAC scriptleri repoda olmamalı)
- Delete: `.hermes-plan.md`
- Delete: `PROJE_DURUMU.md`
- Delete: `PROJE_ELESTIRI.md`
- Delete: `nginx.conf`
- Delete: `coolify-deploy.sh`
- Delete: `.next-old-1783702170/`
- Delete: `src/app/layout.tsx.bak`
- Delete: `src/proxy.ts`
- Delete: `next.config.ts.bak`

**Step 1: Silinecek dosyaları belirle**

```bash
# Legacy Cloudflare middleware
rm -rf functions/

# RBAC scriptleri (backup)
rm -rf backups/

# Eski plan/doküman
rm -f .hermes-plan.md PROJE_DURUMU.md PROJE_ELESTIRI.md

# Deploy scripti (Coolify kendi pipeline'ını kullanır)
rm -f coolify-deploy.sh

# nginx (Coolify'da gerekmez — Traefik var)
rm -f nginx.conf

# Eski build
rm -rf .next-old-1783702170/

# Yedek dosyalar
rm -f src/app/layout.tsx.bak next.config.ts.bak

# Legacy proxy (middleware.ts kullanılıyor)
rm -f src/proxy.ts
```

**Step 2: `.gitignore`'ı güncelle**

`.env.production`'ı gitignore'dan çıkar (örnek template olarak) ve yeni ignore kuralları ekle:

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# Local env (sadece local)
.env.local
.env.*.local

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# PWA
public/sw.js

# IDE
.idea/
.vscode/
*.swp
*.swo
```

Not: `.env.production` **gitignore'dan kaldırılacak** çünkü Coolify build'te NEXT_PUBLIC_* değişkenlerini build argümanı olarak alır. `.env.production` artık örnek-env dosyası olarak kalacak (gerçek secret'lar Coolify env'lerinde).

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up repo — remove legacy files, binaries, Cloudflare code, old docs"
```

---

## Task 2: Logoları Dönüştür ve `public/` Altına Taşı

**Objective:** `1.tif` ve `2.tif` Resepsiyonistim marka logolarıdır. Web uyumlu formata (PNG/WebP) dönüştürülüp `public/brand/` dizinine taşınır. Orijinal TIF'ler korunur.

**Files:**
- Create: `public/brand/` (dizin)
- Create: `public/brand/logo-primary.png` (1.tif'ten dönüştürülmüş)
- Create: `public/brand/logo-secondary.png` (2.tif'ten dönüştürülmüş)
- Keep: `1.tif`, `2.tif` (repo kökünde — marka arşivi)

**Step 1: Dizin oluştur**

```bash
mkdir -p public/brand
```

**Step 2: TIF → PNG dönüştür**

ImageMagick veya sharp ile dönüştür:

```bash
# ImageMagick ile
convert 1.tif -background white -flatten -resize 1200x1200 public/brand/logo-primary.png
convert 2.tif -background white -flatten -resize 1200x1200 public/brand/logo-secondary.png

# Alternatif: ffmpeg
# ffmpeg -i 1.tif -vf "scale=1200:-1" public/brand/logo-primary.png
```

> **Not:** ImageMagick yoksa Python + Pillow ile de yapılabilir. GitHub Actions'ta bu adımı otomatize etmek gerekmez — dönüşüm bir kere yapılır, sonuç git'e eklenir.

**Step 3: `.gitignore` kontrol** — `.gitignore`'da `*.tif` veya `*.tiff` varsa kaldır. Logo dosyaları git'e eklenmeli.

**Step 4: WebP versiyon da oluştur (opsiyonel — performans)**

```bash
convert public/brand/logo-primary.png public/brand/logo-primary.webp
convert public/brand/logo-secondary.png public/brand/logo-secondary.webp
```

**Step 5: Commit**

```bash
git add public/brand/ 1.tif 2.tif
git commit -m "feat(brand): add Resepsiyonistim logos (primary + secondary) to public/brand/"
```

---

**Objective:** İki Dockerfile'ı (Dockerfile + Dockerfile.nextjs) tek bir multi-stage production Dockerfile'da birleştir. Coolify ile sorunsuz build al.

**Files:**
- Modify: `Dockerfile` (multi-stage, Next.js standalone)
- Delete: `Dockerfile.nextjs`
- Modify: `docker-compose.yml` (sadeleştir, Coolify uyumlu)

**Step 1: Mevcut durum** — `Dockerfile` single-stage (node:20-alpine, npm ci + build + start), `Dockerfile.nextjs` multi-stage (deps → builder → runner). İkisi de Next.js standalone üretiyor ama farklı yaklaşımlar.

**Step 2: Yeni `Dockerfile`** — Multi-stage, node:20-alpine, .env.production'daki NEXT_PUBLIC_* değişkenlerini build argümanı olarak al:

```dockerfile
# ─────────────────────────────────────────────────────────────
# Dockerfile — Resepsiyonistim Production (Multi-stage build)
# Build: docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... -t resepsiyonistim .
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare npm@latest --activate
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# ── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (NEXT_PUBLIC_* → baked into JS bundle)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

RUN npm run build

# ── Stage 3: Production runner ──────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**Step 3: Yeni `docker-compose.yml`** — Sade, Coolify uyumlu:

```yaml
version: '3.8'

services:
  resepsiyonistim:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        - NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
        - NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME:-Resepsiyonistim}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      # Runtime env vars (NOT NEXT_PUBLIC_* — those are build-time only)
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

**Step 4: `.dockerignore`** — Güncelle:

```
.git
.gitignore
node_modules
.next
*.md
.env*.local
.next-old-*
*.tif
backups
functions
```

**Step 5: Delete eski Dockerfile**

```bash
rm Dockerfile.nextjs
```

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(docker): unify to single multi-stage Dockerfile, clean compose"
```

---

## Task 3: Middleware Yapısını Düzelt

**Objective:** Mevcut `src/proxy.ts`'deki middleware mantığını Next.js `src/middleware.ts`'ye taşı. Rate limiting, CSRF, auth gating, security headers tek dosyada.

**Files:**
- Create: `src/middleware.ts` (Next.js Edge middleware)
- Delete: `src/proxy.ts` (zaten Task 1'de silindi, burada emin ol)

**Step 1: Mevcut durum** — `src/proxy.ts` 265 satırlık bir middleware dosyası. Next.js 16'da middleware `src/middleware.ts`'de olmalı ve `export async function middleware()` ile çalışır.

**Step 2: Yeni `src/middleware.ts`** — Mevcut proxy.ts'deki tüm işlevselliği koru ama Next.js 16 middleware API'sine uygun hale getir:

```typescript
import { NextResponse, type NextRequest } from "next/server";
// Mevcut proxy.ts'deki tüm mantık buraya taşınır:
// 1. Rate limiting (login, OTP, API)
// 2. CSRF koruması
// 3. Security headers
// 4. Supabase session refresh (updateSession)
// 5. Auth gating (public/protected route ayrımı)
// 6. CORS headers
```

**Detaylı kod** proxy.ts'deki gibi kalır, sadece `export async function proxy(request)` → `export async function middleware(request)` olur ve `config.matcher` aynen kalır.

**Step 3: Commit**

```bash
git add -A
git commit -m "fix(middleware): rename proxy.ts to middleware.ts for Next.js 16 compat"
```

---

## Task 4: `.env.production`'ı Örnek Template Olarak Düzenle

**Objective:** `.env.production` git'e eklenebilir bir template haline getir. Gerçek secret'lar içermez, sadece NEXT_PUBLIC_* için placeholder'lar ve açıklamalar.

**Files:**
- Modify: `.env.production`

**Step 1: Yeni `.env.production`** — Secret'sız, belgelenmiş:

```bash
# ════════════════════════════════════════════════════════════
# Resepsiyonistim — Production Environment Template
# ════════════════════════════════════════════════════════════
# Build-time ONLY: NEXT_PUBLIC_* değişkenleri build sırasında
# Docker build arg olarak verilir, JS bundle'a gömülür.
# Runtime değişkenleri Coolify Environment Variables'dan alınır.
# ════════════════════════════════════════════════════════════

# ── Supabase (Build-time) ──────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# ── Push Notifications (Build-time) ───────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key

# ── App (Build-time) ──────────────────────────────────────
NEXT_PUBLIC_APP_NAME=Resepsiyonistim

# ── Supabase Service Role (Runtime ONLY — never client-side)
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Step 2: Commit**

```bash
git add -A
git commit -m "docs(env): convert .env.production to secret-free template, add docs"
```

---

## Task 5: Supabase Migrations Düzeni

**Objective:** Supabase migrations klasörünü düzenle. Tarih bazlı isimlendirme var ama sıralama bozuk. Okunabilirliği artır.

**Files:**
- Modify: `supabase/migrations/` (dosya isimleri)

**Step 1: Mevcut durum** — 19 migration dosyası. İsimlerde yıl-ay-gün formatı var ama bazıları atlamalı, sıra dışı:

```
2025_onboarding_binary_gate.sql
20260622_guest_satisfaction_surveys.sql
20260705_tenant_rls_policies.sql
20260706_auto_signup_trial.sql
20260709_ab_testing.sql
20260709_ab_tests.sql
20260709_humanization_evaluation.sql
20260709_musteri_feedback.sql
20260709_occupancy_reports.sql
20260709_rbac.sql
20260709_referrals.sql
20260710_ab_test_bridge_optimization.sql
20260710_bank_accounts.sql
20260710_channels.sql
20260710_channels_v4_web_widget.sql
20260710_facilities.sql
20260710_landing_page_conversion.sql
20260710_subscription_iban_payments.sql
20260721_email_logs.sql
```

Burada değişiklik yapmak **tehlikeli** çünkü Supabase migration tablosu dosya adlarına göre takip eder. Bu task'ı **atla** — migration'lar olduğu gibi kalsın. Sadece not olarak düş.

**Karar:** Bu task atlandı — migration isimlerini değiştirmek Supabase state'ini bozar.

---

## Task 6: Build Script ve Service Worker'ı Güncelle

**Objective:** `package.json` build script'i sorunsuz çalışmalı. Service worker build'i basitleştir.

**Files:**
- Modify: `package.json`
- Modify: `scripts/build-sw.mjs`

**Step 1: `package.json`** — Script'leri sadeleştir:

```json
{
  "name": "resepsiyonistim",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test:e2e": "playwright test",
    "test:e2e:report": "playwright show-report"
  },
  ...
}
```

Not: `build-sw.mjs` script'i kaldır veya `next build` içinde `generateSW` ile değiştir. Serwist zaten `@serwist/next` ile Next.js build'ine entegre oluyor, ayrı bir script gereksiz.

**Step 2: `scripts/build-sw.mjs`** — Dosyayı incele, gerekirse sil. Serwist'in kendi build pipeline'ı yeterli.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: simplify build scripts, remove redundant sw build step"
```

---

## Task 7: Coolify Tek Seferde Deploy — README'yi Güncelle

**Objective:** README.md'yi Coolify tek-seferde-kurulum kılavuzu ile güncelle.

**Files:**
- Modify: `README.md`

**Step 1: Yeni README.md** — Sade, Coolify odaklı:

```markdown
# Resepsiyonistim — Dijital Resepsiyonist Paneli

İşletmeniz için 7/24 WhatsApp tabanlı dijital resepsiyonist yönetim paneli.

## 🚀 Coolify Tek Seferde Kurulum

### Gereksinimler
- Coolify instance (v4+)
- GitHub repo erişimi
- Supabase projesi (URL + anon key + service role key)

### Kurulum Adımları

1. **Coolify'da yeni resource oluştur**
   - Source: GitHub
   - Repo: `mermancloud-cmd/resepsiyonistim`
   - Branch: `main`
   - Build pack: **Docker**

2. **Environment Variables (Build Args)**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-key
   NEXT_PUBLIC_APP_NAME=Resepsiyonistim
   ```

3. **Environment Variables (Runtime)**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Ports:** `3000`

5. **Healthcheck:** `GET /api/health` (Coolify built-in)

6. **Domain:** panel.merman.sbs (veya kendi domainin)

### Yerel Geliştirme

```bash
npm install
cp .env.production .env.local
# .env.local'ı gerçek değerlerle doldur
npm run dev
```

## 🏗 Mimari

- **Frontend:** Next.js 16 (App Router, standalone)
- **Auth:** Supabase (email/password, Google, Apple)
- **Database:** Supabase PostgreSQL
- **Styling:** Tailwind CSS v4
- **Deploy:** Docker + Coolify

## 📦 Teknolojiler

| Bileşen | Teknoloji |
|---------|-----------|
| Framework | Next.js 16 |
| Auth | Supabase SSR |
| UI | Tailwind CSS v4, shadcn/ui |
| State | Zustand, TanStack Query |
| Charts | Recharts |
| PWA | Serwist |
| Container | Docker (multi-stage) |
```

**Step 2: Commit**

```bash
git add -A
git commit -m "docs: add Coolify one-shot deploy guide to README"
```

---

## Task 8: Son Kontroller ve Test

**Objective:** Tüm değişikliklerden sonra build testi ve son git durumu kontrolü.

**Files:**
- Run: `npm run build` (local)
- Run: `docker build -t resepsiyonistim:test .` (Docker build test)

**Step 1: Next.js build test**

```bash
npm ci
npm run build
```
Expected: Build successful, 40+ sayfa statik olarak render edilir.

**Step 2: Docker build test**

```bash
docker build -t resepsiyonistim:test \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder \
  .
```
Expected: Docker build successful, image ~200MB.

**Step 3: Git durumu kontrolü**

```bash
git status
git log --oneline -5
```

---

## Özet: Silinecek Dosyalar (Logolar hariç)

| Dosya/Dizin | Boyut | Sebep |
|-------------|-------|-------|
| `functions/` | ~16KB | Cloudflare Pages legacy |
| `backups/` | ~35KB | RBAC scriptleri — repoda yeri yok |
| `nginx.conf` | ~15KB | Coolify'da gerekmez (Traefik var) |
| `coolify-deploy.sh` | ~9KB | Coolify kendi pipeline'ını kullanır |
| `Dockerfile.nextjs` | ~1KB | Çift Dockerfile, birleşecek |
| `src/proxy.ts` | ~10KB | middleware.ts olarak taşınacak |
| `.hermes-plan.md` | ~1KB | Eski plan |
| `PROJE_DURUMU.md` | ~12KB | Eskimiş doküman |
| `PROJE_ELESTIRI.md` | ~10KB | Eskimiş doküman |
| `src/app/layout.tsx.bak` | ~3KB | Yedek |
| `next.config.ts.bak` | ~1KB | Yedek |
| `.next-old-*/` | ~? | Eski build |

### Korunacak Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `1.tif` | **Logo** — Resepsiyonistim marka logosu (primary) |
| `2.tif` | **Logo** — Resepsiyonistim marka logosu (secondary) |
| `public/brand/` | Web formatına dönüştürülmüş logo kopyaları (PNG + WebP) |

## Riskler ve Dikkat Edilecekler

- **Supabase migration isimleri değiştirilmemeli** — DB state'i bozulur
- **proxy.ts → middleware.ts** taşımasında `config.matcher` ve export ismi doğru olmalı
- **NEXT_PUBLIC_* değişkenleri build-time** — Coolify build args olarak verilmeli, runtime env'de çalışmaz
- **Serwist/PWA** — `scripts/build-sw.mjs` kaldırılırsa SW çalışmaya devam etmeli (test edilmeli)
- `.env.production` **secret içermemeli** — template olarak git'te olacak
- **node_modules dizini** `.dockerignore`'da olmalı ki Docker build hızlı olsun

## Açık Sorular

- `scripts/build-sw.mjs` ne işe yarıyor? Serwist'in Next.js plugin'i ile çakışıyor mu? (İncelenip ona göre karar verilecek)
- `proxy.ts`'deki rate limiting Map'leri Edge middleware'de çalışır mı? (Edge'de global değişkenler instance başına, rate limiting sınırlı olabilir)
- `package.json`'da `name: "bungalow-panel"` → `"resepsiyonistim"` yapılmalı mı? Marka tutarlılığı için evet.
