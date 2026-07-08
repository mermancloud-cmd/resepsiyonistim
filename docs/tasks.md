# [RESEPSIYONISTIM] 🚀 v1 Final Ship — Projeyi Yayına Hazırlama

**ID:** `resepsiyonistim-v1-final-ship`
**Risk:** `HIGH` (domain/proxy/config değişiklikleri)
**Öncelik:** Kritik

---

## Mevcut Durum Özeti

- **Repo:** `mermancloud-cmd/resepsiyonistim` (PRIVATE)
- **Local:** `/opt/hermes/resepsiyonistim/`
- **Branch:** `main` (temiz, unstaged yok)
- **Stack:** Next.js 16 + React 19 → static export → nginx / Cloudflare Pages
- **Tüm panel sayfaları tamam** (dashboard, reservations, payments, messages, settings, analytics, AI, whatsapp, subscription, login, signup, onboarding)
- **WhatsApp:** Evolution API entegrasyonu hazır, QR bağlantı yönetimi çalışıyor
- **Auth:** Supabase SSR (login/signup, JWT, context)
- **Ödeme:** Iyzico client/types var, sandbox entegrasyonu kısmi
- **Deploy:** Cloudflare Pages (_headers) + Coolify/nginx (nginx.conf)

---

## Yapılacak İşler (Sıralı)

### A. Marka Dili Düzeltmeleri (LOW-MEDIUM)
- [ ] **A1** `landing.html` (public/) — "yapay zeka" → "dijital resepsiyonist", "akıllı sistem"
- [ ] **A2** `page.tsx` (src/app/) — marka dili audit (hero, özellikler, CTA)
- [ ] **A3** `plans.ts` — "yapay zeka mesajı" → "dijital mesaj" / "otomatik yanıt"
- [ ] **A4** `layout.tsx` metadata — title/description "İşletme Yönetim Paneli" → "Resepsiyonistim"
- [ ] **A5** `app-config.ts` — APP_NAME, APP_TAGLINE, APP_DESCRIPTION güncelle

### B. Fiyat Planları Netleştirme ✓ (MEDIUM)
- [x] **B1** Pazar araştırması yapıldı (10+ rakip tarandı)
  - **KARAR:** 4 kademeli fiyatlandırma (aşağıya bak)
- [x] **B2** `plans.ts` güncellendi — fiyatlar, limitler, feature set, marka dili
- [ ] **B3** `subscription/page.tsx` fiyat kartlarını kontrol et

**Final Fiyat Tablosu (Temmuz 2026):**

| Paket | Aylık | Yıllık/ay (%15 ind.) | Tesis | Mesaj/gün |
|-------|:----:|:-------------------:|:----:|:---------:|
| Başlangıç | **999 ₺** | 849 ₺ | 1 | 1.000 |
| ⭐ Profesyonel | **1.999 ₺** | 1.699 ₺ | 3 | 5.000 |
| İşletme | **3.999 ₺** | 3.399 ₺ | 10 | 10.000 |
| Kurumsal | **7.999 ₺** | 6.799 ₺ | ∞ | ∞ |

**Rakip referansı:** Winnobot 7.499 ₺/ay, Bungalov360 742-1.825 ₺/ay (yıllık, AI yok), bir resepsiyonist maaşı ~20.000-30.000 ₺/ay. Pro paketimiz (1.999 ₺) personel maliyetinin **%7-10'una** denk geliyor.

### C. Build & Test (MEDIUM)
- [ ] **C1** `.env.local` oluştur (Supabase + bağımlılıklar)
- [ ] **C2** `npm ci` veya `npm install`
- [ ] **C3** `npm run build` — hata varsa düzelt
- [ ] **C4** `out/` dizininde export varlığını kontrol et
- [ ] **C5** Landing page (`landing.html`) bağımsız açılıyor mu test et

### D. Domain & Deploy (HIGH)
- [ ] **D1** `resepsiyonistim.com` DNS ayarları (Cloudflare/Coolify)
- [ ] **D2** Nginx conf — `server_name`'e `resepsiyonistim.com` ve `www.resepsiyonistim.com` ekle
- [ ] **D3** `_headers` Cloudflare — doğru domain için kontrol
- [ ] **D4** Coolify'e deploy: public/ + nginx.conf + domain bağlantısı
- [ ] **D5** SSL (Let's Encrypt / Cloudflare) kontrol
- [ ] **D6** Sağlık kontrolü: `/health` endpoint'i çalışıyor mu?

### E. Ödeme Akışı (MEDIUM)
- [ ] **E1** Iyzico sandbox test — abonelik oluşturma akışı çalışıyor mu?
- [ ] **E2** Webhook yönlendirmeleri (iyzico → n8n?)
- [ ] **E3** Hata durumları (başarısız ödeme, iptal, yeniden dene)

### F. Dokümantasyon & SEO (LOW)
- [ ] **F1** README.md yaz (kurulum, deploy, env değişkenleri)
- [ ] **F2** 404.html / 50x.html sayfaları ekle
- [ ] **F3** Open Graph meta etiketleri (paylaşım önizlemesi)
- [ ] **F4** robots.txt / sitemap.xml

### G. Son Kontrol (LOW)
- [ ] **G1** WhatsApp demo numarası (905427450654) çalışıyor — doğrula
- [ ] **G2** Tüm linkler geçerli (landing, panele yönlendirme)
- [ ] **G3** Mobil görünüm testi (responsive)
- [ ] **G4** Commit & push → main

---

## Rollback Planı

| Değişiklik | Rollback |
|-----------|----------|
| Nginx conf | Önceki nginx.conf'u yedekle, `cp nginx.conf.bak` |
| Domain DNS | Önceki DNS kaydını not et, TTL düşük tut |
| Build | `git stash` / önceki commit'e dön |
| Deploy (Coolify) | Coolify UI'dan eski deploy'a rollback |

## Önceki Oturumlardan Notlar

- Repo PRIVATE kalmalı (müşteriye yönelik değil)
- "AI"/"yapay zeka" minimum — "insan gibi", "dijital resepsiyonistim"
- Brand protection #1
- Domain: resepsiyonistim.com (alındı mı? kontrol et)
- Statik export + nginx (standalone DEĞİL)
- Nginx conf `panel.merman.sbs owner.merman.sbs api.merman.sbs concierge.merman.sbs` — resepsiyonistim.com da eklenmeli

## Risk Gerekçesi (HIGH)

Domain değişiklikleri, DNS, nginx proxy yapılandırması ve canlı deploy içeriyor. Canlı sistemi etkileyebilecek değişiklikler var. Yedek ve rollback planı hazırlanmadan uygulanmamalı.
