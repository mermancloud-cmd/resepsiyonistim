# Resepsiyonistim

**Bungalov, tiny house ve villa işletmeleri için WhatsApp tabanlı yapay zeka resepsiyonisti.**

> **AI Karakteri:** Elif — misafirlerinizle 7/24 konuşan dijital resepsiyonist.

---

## Nedir?

Resepsiyonistim, küçük konaklama işletmeleri için geliştirilmiş bir SaaS ürünüdür. WhatsApp üzerinden misafir sorularını yanıtlar, doğal dilde rezervasyon sürecini yönetir, fiyat/müsaitlik bilgisi verir ve karmaşık durumlarda insan operatöre devreder.

**Müşteri yapay zeka olduğunu anlamaz.** Elif sakin, doğal ve profesyonel bir tonda konuşur — gerçek bir resepsiyonist gibi.

---

## Mimari

```
WhatsApp Mesajı → Evolution API
  → n8n Workflow Motoru
     → WF01 (ön işleme + HMAC)
     → WF02 (State+AI Pipeline)
        → Dil Tespiti (tr/en/ar)
        → State Machine
        → 9Router LLM (AI yanıt üretimi)
        → SQLite REST API (veri tabanı)
  → Evolution API → WhatsApp yanıtı
  → Telegram Bot → İşletme sahibi bildirimi

Resepsiyonistim Panel (Next.js):
  → İşletme sahibi yönetim arayüzü
  → Dashboard, rezervasyon, mesajlar, AI kontrol
  → Onboarding wizard (14 adım)
  → Iyzico ödeme entegrasyonu
  → Analitik
```

### Teknoloji Yığını

| Bileşen | Teknoloji |
|---------|----------|
| Workflow Motoru | n8n (25 workflow, 20 aktif) |
| AI / LLM | 9Router (ocg/qwen3.7-plus) |
| Veritabanı | SQLite (REST API, auth middleware) |
| WhatsApp | Evolution API |
| Yönetim Paneli | Next.js 16, React 19, TypeScript 5, Tailwind 4 |
| UI Kütüphanesi | shadcn/ui |
| Ödeme | Iyzico |
| Bildirimler | Telegram Bot + Web Push |
| Deploy | Docker, Coolify |

---

## Repo Yapısı

```
resepsiyonistim/
├── BRANDING.md          # Marka kimlik kılavuzu
├── PROJE_DURUMU.md       # Proje durumu (güncel)
├── PROJE_ELESTIRI.md     # Proje eleştirisi
├── README.md            # Bu dosya
├── docs/                # Dokümantasyon
│   ├── PROJECT_OVERVIEW.md
│   ├── DEPLOYMENT_STATUS.md
│   ├── N8N_WORKFLOWS.md
│   ├── HERMES_TEST_RESULTS.md
│   └── migration-supabase-to-sqlite.md
├── backend/             # n8n workflow yönetimi + SQLite API + QA
│   ├── scripts/          # n8n yönetim scriptleri (Node.js)
│   ├── sqlite-service/   # SQLite REST API (FastAPI)
│   ├── tests/            # 43 senaryolu E2E QA test suite
│   ├── data/
│   ├── docker-compose.yml
│   └── package.json
├── panel/              # Resepsiyonistim Panel (Next.js yönetim arayüzü)
│   ├── src/
│   │   ├── app/         # Next.js sayfaları
│   │   ├── components/  # UI bileşenleri
│   │   ├── hooks/       # React hooks
│   │   └── lib/         # Auth, API, utils
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── sql/                 # Veritabanı migrasyonları
└── assets/              # Logo ve görsel varlıklar
    └── logo.png
```

---

## QA Testleri

43 senaryo, 5 kategori (bungalov, tiny_house, villa, edge_case, sales).

```bash
cd backend/tests && pip install -r requirements.txt && python bungalov_qa_v3.py
```

GitHub Actions her push'ta ve PR'da otomatik testleri çalıştırır.

---

## Kurulum

### Backend (n8n + SQLite)

```bash
cd backend
cp .env.example .env  # API anahtarlarını doldur
npm install
npm run check         # API erişimi kontrol
npm run discover      # Workflow'ları listele
```

### Panel (Resepsiyonistim Panel)

```bash
cd panel
npm install
npm run dev           # Geliştirme modu
```

---

## Marka

Resepsiyonistim — doğal ve sıcak marka kimliği: terracotta, orman yeşili, amber, sıcak bej. Detaylar: `BRANDING.md`.

AI karakteri **Elif**: Sakin, güven veren, profesyonel. WhatsApp'ta gerçek bir resepsiyonist gibi konuşur.

---

## Lisans

PRIVATE — tüm hakları saklıdır. Bu depo gizli iç çalışma deposudur.