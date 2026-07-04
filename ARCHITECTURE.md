# Resepsiyonistim — Webapp Mimari Kılavuzu

> **Ana ilke:** Bu proje tek web uygulaması (webapp) olarak tasarlanır. Ayrı statik site, ayrı panel, ayrı API yoktur. Her şey tek Next.js uygulaması içinde çalışır.

## 1. Mimari Özet

```
┌─────────────────────────────────────────────────────┐
│              Next.js 16 Uygulaması (panel/)           │
│                                                       │
│  /              → Landing page (herkese açık)        │
│  /login         → Giriş                              │
│  /onboarding    → Kayıt sihirbazı                   │
│  /dashboard     → İşletme paneli (auth gerekli)     │
│  /messages      → WhatsApp konuşmaları              │
│  /reservations  → Rezervasyon yönetimi             │
│  /payments      → Ödeme takibi                      │
│  /analytics     → Analitik                          │
│  /settings      → Ayarlar                           │
│  /subscription  → Plan/abonelik                     │
│  /api/*         → API rotaları (Next.js Route Handlers)│
│                                                       │
├─────────────────────────────────────────────────────┤
│           Backend Servisler (backend/)                │
│                                                       │
│  sqlite-service  → REST API (FastAPI/uvicorn)        │
│  n8n             → WhatsApp webhook + AI workflow   │
│  QA tests        → Otomatik kalite kontrol          │
└─────────────────────────────────────────────────────┘
```

## 2. Webapp Prensipleri

### 2.1 Tek Uygulama, Çoklu Rota
- Landing page statik HTML değil, Next.js page route'udur (`app/page.tsx`)
- Panel sayfaları同一 Next.js app içinde (`app/dashboard/page.tsx` vb.)
- API rotaları Next.js Route Handlers olarak çalışır (`app/api/*/route.ts`)
- Mobile-first responsive tasarım — telefon, tablet, masaüstü

### 2.2 PWA (Progressive Web App)
- `manifest.webmanifest` — yüklenebilir uygulama
- Service Worker (`sw.ts`) — offline destek
- Push notification desteği
- Apple Touch Icon, 192/512px ikonlar

### 2.3 Multi-Tenant SaaS
- Her işletme = tenant
- Tenant izolasyonu API seviyesinde (`tenant_id` filtresi)
- JWT auth + session management
- Onboarding sihirbazı (çok adımlı kayıt)
- Abonelik yönetimi (plan seçimi, iyzico ödeme)

### 2.4 API Katmanı
- Next.js Route Handlers (`/api/*`) — panel içi işlemler
- SQLite REST Service (`backend/sqlite-service/`) — veri katmanı
- n8n webhook — WhatsApp mesaj akışı
- Tüm API çağrıları `api-client.ts` üzerinden geçer

## 3. Dizin Yapısı

```
resepsiyonistim/
├── panel/                    # Next.js 16 webapp (ANA UYGULAMA)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Landing page (/)
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── globals.css        # Marka paleti
│   │   │   ├── login/             # Auth
│   │   │   ├── onboarding/        # Kayıt sihirbazı
│   │   │   ├── dashboard/         # İşletme paneli
│   │   │   ├── messages/          # WhatsApp konuşmaları
│   │   │   ├── reservations/      # Rezervasyonlar
│   │   │   ├── payments/          # Ödemeler
│   │   │   ├── analytics/         # Analitik
│   │   │   ├── settings/          # Ayarlar
│   │   │   ├── subscription/     # Abonelik
│   │   │   ├── ai/                # AI kontrol paneli
│   │   │   └── api/               # API rotaları
│   │   ├── components/            # UI komponentleri
│   │   ├── hooks/                 # React hooks
│   │   ├── lib/                   # Yardımcı kütüphaneler
│   │   ├── stores/                # Durum yönetimi
│   │   └── types/                 # TypeScript tipleri
│   ├── public/                # Statik dosyalar (ikon, manifest)
│   ├── Dockerfile              # Container build
│   └── docker-compose.yml      # Local dev orchestration
├── backend/                   # Backend servisler
│   ├── sqlite-service/        # FastAPI REST API
│   ├── scripts/              # Yardımcı scriptler
│   ├── tests/                 # QA testleri
│   └── docker-compose.yml    # Backend orchestration
├── docs/                     # Dokümantasyon
├── assets/                   # Logo, görseller
└── ARCHITECTURE.md           # Bu dosya
```

## 4. Tasarım Kararları

### 4.1 Neden Tek Next.js App?
- Tek deploy birimi — sade operasyon
- Paylaşılan marka paleti, komponentler, auth
- Landing → login → onboarding → dashboard akışı kesintisiz
- SEO: Next.js SSR/SSG landing page için yeterli

### 4.2 Neden Ayrı Backend Servisi?
- SQLite REST service CPU-bound sorgular için optimize
- n8n workflow motoru ayrı process olarak çalışmalı
- Panel Route Handlers bu servislere HTTP ile bağlanır

### 4.3 Mobile-First
- İşletme sahipleri telefondan kullanır
- Bottom navigation (`bottom-nav.tsx`)
- Mobile shell layout (`mobile-shell.tsx`)
- Touch-friendly UI komponentleri

## 5. Deployment

- **Coolify** üzerinden Docker container部署
- Panel: `panel/Dockerfile` + `panel/docker-compose.yml`
- Backend: `backend/docker-compose.yml`
- Nginx reverse proxy (`panel/nginx.conf`)
- Health check: `/health` endpoint

## 6. Geliştirme Kuralları

1. **Yeni özellik = Next.js page veya API route** — ayrı statik dosya EKLEME
2. **Marka paleti** — `globals.css` içindeki CSS değişkenleri kullanılır
3. **API çağrısı** — `lib/api-client.ts` üzerinden yapılır
4. **Auth** — `lib/auth-context.tsx` + `middleware.ts` ile korunur
5. **Tenant izolasyonu** — Her sorgu `tenant_id` ile filtrelenir
6. **PWA** — Manifest ve service worker güncel tutulur
7. **Test** — `backend/tests/` altındaki QA senaryoları çalıştırılır
8. **Deploy** — Git push → Coolify auto-deploy

## 7. Teknoloji Yığını

| Katman          | Teknoloji                          |
|-----------------|------------------------------------|
| Frontend        | Next.js 16, React 19, TypeScript   |
| Stil            | Tailwind CSS v4                    |
| UI Komponentleri| shadcn/ui                          |
| Durum           | Zustand                            |
| Backend API     | FastAPI (Python, uvicorn)          |
| Veritabanı      | SQLite                             |
| AI/WhatsApp     | n8n workflows                      |
| Ödeme           | iyzico                             |
| Push            | Web Push (VAPID)                   |
| Deploy          | Docker + Coolify                   |