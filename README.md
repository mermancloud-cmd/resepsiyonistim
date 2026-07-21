# Resepsiyonistim — 'Dijital Resepsiyonist'iniz

**İşletmenize 7/24 çalışan, insan gibi konuşan bir 'Dijital Resepsiyonist'.**

Konaklama işletmeleri için WhatsApp tabanlı dijital resepsiyonist. Misafirlerle insan gibi konuşur, anında yanıtlar, rezervasyonları otomatik alır.

## 🚀 Canlı Sayfalar

| Sayfa | Açıklama | Canlı URL |
|-------|----------|-----------|
| 🏠 **Landing Page** | Satış odaklı ana sayfa | [`resepsiyonistim.com`](https://resepsiyonistim.com) |
| 🔐 **Giriş/Kayıt** | Mobil uyumlu login/signup + dark mode | [`/login.html`](https://resepsiyonistim.com/login.html) |
| 📊 **Panel** | Yönetim paneli (Panel, Sohbet, Takvim, Ayarlar) | [`/panel.html`](https://resepsiyonistim.com/panel.html) |
| 🛠️ **İşletme Kurulumu** | 12 adımlı onboarding sihirbazı | [`/onboarding.html`](https://resepsiyonistim.com/onboarding.html) |

> Tüm statik sayfalar `public/` klasöründe. Next.js projesine entegre, doğrudan açılabilir.

## 📁 Proje Yapısı

```
resepsiyonistim/
├── public/                  # Statik HTML sayfaları
│   ├── index.html           # Landing page (ana sayfa)
│   ├── login.html           # Giriş / kayıt
│   ├── panel.html           # Yönetim paneli
│   ├── onboarding.html      # 12 adımlı kurulum
│   ├── logo-1.jpeg          # Marka logosu
│   └── logo-2.jpeg          # Marka logosu (alternatif)
├── src/                     # Next.js App Router
│   ├── app/                 # Sayfalar
│   ├── components/          # Bileşenler
│   ├── hooks/               # React hooks
│   └── lib/                 # Araçlar, tipler, API
├── docs/                    # Dokümantasyon
└── ...config dosyaları
```

## 🧬 Stack

- **Frontend:** Next.js 16 + React 19
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Auth:** Supabase SSR
- **Database:** Supabase (PostgreSQL)
- **Messaging:** Evolution API (WhatsApp)
- **Payments:** IBAN (şu anlık) → Iyzico (planlanan)
- **Orchestration:** n8n
- **Deploy:** Coolify

## 🔧 Geliştirme

```bash
npm ci
cp .env.local.example .env.local  # Supabase bilgilerini gir
npm run dev
```

## 📦 Derleme

```bash
npm run build
```

## 🌐 GitHub Pages

Statik sayfalar (`public/`) GitHub Pages ile de yayına alınabilir:

1. Repo → **Settings** → **Pages**
2. **Branch**: `main`, **folder**: `/ (root)`
3. URL: `https://mermancloud-cmd.github.io/resepsiyonistim/`

Ya da doğrudan **Coolify** ile `resepsiyonistim.com` domaininde.

---

© 2026 Resepsiyonistim — Merman Cloud Inc.
