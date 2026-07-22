# Resepsiyonistim — 'Dijital Resepsiyonist'iniz

**İşletmenize 7/24 çalışan, insan gibi konuşan bir 'Dijital Resepsiyonist'.**

Konaklama işletmeleri için WhatsApp tabanlı dijital resepsiyonist. Misafirlerle insan gibi konuşur, anında yanıtlar, rezervasyonları otomatik alır.

---

## 🚀 Coolify Tek Seferde Kurulum

### Gereksinimler
- Coolify instance (v4+)
- GitHub repo erişimi
- Supabase projesi (URL + anon key)

### Kurulum Adımları

1. **Coolify'da yeni resource oluştur**
   - Source: **GitHub**
   - Repo: `mermancloud-cmd/resepsiyonistim`
   - Branch: `main`
   - Build pack: **Docker** (otomatik algılanır)

2. **Build Args (Environment Variables → Build Time)**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xzmakpsongrcbnrpdvsy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-key>
   NEXT_PUBLIC_APP_NAME=Resepsiyonistim
   ```

3. **Ports & Healthcheck**
   - Port: `3000`
   - Healthcheck: `GET /api/health` (Dockerfile'da tanımlı)

4. **Domain** — `panel.merman.sbs` veya kendi domaininiz

> **Not:** Coolify, NEXT_PUBLIC_* değişkenlerini Docker build argümanı olarak geçer. Bu değişkenler build sırasında JS bundle'a gömülür, runtime'da değiştirilemez.

### Yerel Geliştirme

```bash
npm ci
cp .env.production .env.local
# .env.local'ı gerçek Supabase değerlerinizle doldurun
npm run dev
```

### Production Build

```bash
# Standalone build
npm run build

# Docker build
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -t resepsiyonistim .
```

---

## 📁 Proje Yapısı

```
resepsiyonistim/
├── src/
│   ├── app/                 # Next.js App Router sayfaları
│   ├── components/          # Paylaşılan bileşenler
│   ├── hooks/               # React hooks
│   └── lib/                 # Araçlar, tipler, API, Supabase
├── public/
│   ├── brand/               # Marka logoları (PNG + WebP)
│   └── ...
├── supabase/
│   └── migrations/          # Veritabanı migrasyonları
├── docs/                    # n8n workflow, dokümantasyon
├── Dockerfile               # Multi-stage production build
└── docker-compose.yml       # Coolify uyumlu compose
```

---

## 🧬 Teknoloji Yığını

| Bileşen | Teknoloji |
|---------|-----------|
| Framework | Next.js 16 (App Router, standalone) |
| UI | Tailwind CSS v4, shadcn/ui |
| Auth | Supabase SSR (email/password, Google, Apple) |
| Database | Supabase PostgreSQL |
| State | Zustand, TanStack React Query |
| Charts | Recharts |
| PWA | Serwist (service worker + push bildirim) |
| Container | Docker multi-stage (node:20-alpine) |
| Orchestrasyon | n8n |
| WhatsApp | Evolution API |

---

## 📦 Önemli Komutlar

```bash
npm run dev       # Geliştirme sunucusu
npm run build     # Production build
npm run start     # Production sunucusu
npm run lint      # ESLint
npm run test:e2e  # Playwright E2E testleri
```

---

## 🤝 Katkı

1. Fork'la
2. Feature branch aç (`git checkout -b feat/yeni-ozellik`)
3. Commit'le (`git commit -m "feat: yeni özellik"`)
4. Push'la (`git push origin feat/yeni-ozellik`)
5. PR aç

---

© 2026 Resepsiyonistim — Tüm hakları saklıdır.
