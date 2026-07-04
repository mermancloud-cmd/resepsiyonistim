# Resepsiyonistim — Güncel Proje Durumu

**Güncelleme:** 4 Temmuz 2026
**Proje:** Resepsiyonistim — WhatsApp üzerinden küçük konaklama işletmeleri için yapay zeka resepsiyonist

---

## 1. Proje Özeti

> ⚠️ **4 Temmuz 2026 kritik durum:** n8n PostgreSQL volume'u silindi. WF07 Smoke Test dışındaki tüm workflow'lar (WF01-WF06, WF08, WF10, WF14, WF16, WF20) kayıp. WF02 export JSON'ları repo'da mevcut ancak SQLite API'e uyarlanması gerekli. Ayrıntı: [GitHub Issue #6](https://github.com/mermancloud-cmd/resepsiyonistim/issues/6)

Küçük konaklama işletmeleri (bungalov, tiny house, villa) için geliştirilmiş AI resepsiyonist sistemi. WhatsApp üzerinden misafir sorularını yanıtlar, rezervasyon sürecini yönetir, dil tespiti yapar (tr/en/ar), ve karmaşık durumlarda insan operatöre devreder.

### Hedef Kitle
- Bungalov işletmecileri
- Tiny house tesisleri
- Villa/konaklama sahipleri
- **Kocaman otel/resortlar için DEĞİL**

---

## 2. Mimari Genel Bakış

```
WhatsApp Mesajı → Evolution API Webhook
  → WF01 (ön işleme + HMAC doğrulama)
  → WF02 (State+AI Pipeline — n8n)
     → Dil Tespiti (tr/en/ar, Unicode + keyword)
     → State Machine (greeting → asking_date → ... → completed)
     → AI Prompt Oluşturma (dil-specific)
     → 9Router API (model: ocg/qwen3.7-plus)
     → Yanıt Ayrıştırma + Doğrulama
  → SQLite REST API (bungalov-db:8000 — conversation_states, reservations, ...)
  → Evolution API → WhatsApp yanıtı
  → Telegram Bot → Yönetici bildirimi

Resepsiyonistim Panel (panel/):
  Next.js 16 → SQLite REST API (bungalov-db.merman.sbs)
  → Dashboard, Rezervasyon, Mesajlar, AI Kontrol
  → Onboarding Wizard (14 adım, binary gate)
  → Iyzico ödeme entegrasyonu
  → PWA (service worker, push bildirim)
  → Analitik (konuşma metrikleri, memnuniyet)
```

---

## 3. Teknoloji Yığını

| Bileşen | Teknoloji |
|---------|-----------|
| Workflow Motoru | n8n (25 workflow planlandı, şu an 1 aktif — WF07, diğerleri kayıp) |
| LLM Sağlayıcı | 9Router (ocg/qwen3.7-plus) |
| Veritabanı | SQLite (bungalov-db REST API, auth middleware) |
| WhatsApp API | Evolution API |
| Owner Panel | Next.js 16, React 19, TypeScript 5, Tailwind 4 |
| UI Kütüphanesi | shadcn/ui |
| State | Zustand + TanStack Query |
| Auth | JWT (api-key middleware) |
| Ödeme | Iyzico (entegrasyon aşamasında) |
| Bildirimler | Telegram Bot + Web Push |
| Deploy | Docker, Coolify, Cloudflare Pages |
| Charts | Recharts |

---

## 4. GitHub Repo

| Repo | Tip | İçerik |
|------|-----|--------|
| `mermancloud-cmd/resepsiyonistim` | PRIVATE | Monorepo: `backend/` (n8n + SQLite API + QA), `panel/` (Next.js), `docs/`, `sql/`, `landing/`, `assets/` |

---

## 5. n8n Workflow Durumu (25 toplam, 20 aktif)

| ID | İsim | Durum | Son QA |
|----|------|-------|--------|
| WF01 | Gelen Mesaj İşleme | ✅ Aktif | 🔴 HMAC geçersiz imza |
| WF02 | State+AI Pipeline | ✅ Aktif | 🔴 HMAC + 60s timeout (7/7 fail) |
| WF03 | Rezervasyon | ✅ Aktif | ✅ Çalışıyor |
| WF04 | Stok/Müsaitlik | ✅ Aktif | ✅ Düzeltildi |
| WF05 | Human Handoff | ✅ Aktif | ✅ Düzeltildi |
| WF06 | Telegram Bildirimleri | ✅ Aktif | ✅ Düzeltildi |
| WF07 | Smoke Test | ⏸️ Pasif | ❌ POST /webhook/smoke-test 404 |
| WF08 | Veritabanı Bakımı | ✅ Aktif | ✅ Düzeltildi |
| WF10 | Fiyat Hesaplama | ✅ Aktif | ✅ Düzeltildi |
| WF14 | Çoklu Dil Desteği | ✅ Aktif | ✅ Düzeltildi |
| WF16 | Iyzico Ödeme | ✅ Aktif | ⚠️ Stripe bloke |
| WF20 | Owner Panel | ✅ Aktif | ⚠️ UX hataları |

---

## 6. Resepsiyonistim Panel — Detay

### Sayfalar (14)
- `/login` — Multi-method auth (JWT api-key)
- `/onboarding` — 14 adımlı kurulum sihirbazı (binary gate)
- `/dashboard` — Genel istatistikler, AI durumu, rezervasyon özeti
- `/reservations` — Rezervasyon yönetimi + takvim + ödeme takibi
- `/messages` — Misafir konuşmaları + AI kontrolü
- `/ai` — AI kontrol paneli (persona, toggle, performans)
- `/analytics` — Konuşma metrikleri, memnuniyet analizi
- `/payments` — IBAN + Iyzico ödeme yönetimi
- `/settings` — İşletme ayarları
- `/subscription` — SaaS abonelik planları
- `/reservation-action` — Rezervasyon aksiyon onayı (HMAC)

### Bileşenler
- **Layout:** Header, bottom-nav, mobile-shell
- **Dashboard:** 9 widget (AI status, revenue, conversations, inquiry breakdown, vb.)
- **Onboarding:** 12 adım componenti (business info, units, pricing, amenities, rules, cancellation, deposit, location, surroundings, emergency, greeting, review)
- **Reservations:** List, calendar, detail, payment tracker
- **Messages:** Conversation list, detail, message bubble
- **AI Control:** Toggle, conversation toggles, performance stats, persona settings
- **Payments:** IBAN form, payment action modal
- **Subscription:** Checkout form, plan selection, status

### Güvenlik
- HMAC imzalama (owner action)
- CSRF koruması
- Rate limiting
- COEP credentialless headers
- JWT auth (X-API-Key middleware)

### Hooks (14)
use-analytics-dashboard, use-auth-logout, use-conversations, use-dashboard-stats, use-iban-payments, use-onboarding, use-onboarding-gate, use-owner-ibans, use-push-notification, use-rate-limiter, use-reservations, use-satisfaction-analytics, use-session-timeout

### Build
- Static export tamamlandı (`out/` dizini)
- Docker + Coolify deploy script hazır
- nginx.conf (rate limiting, CORS, security headers)
- GitHub Actions: auto-deploy to Cloudflare Pages

---

## 7. QA Test Sonuçları

### Test Suite (bungalov_qa_v3 — keyword dönemi)
- 43 senaryo, 5 kategori
- Kategoriler: bungalov (12), tiny_house (8), villa (10), edge_case (8), sales (5)
- Hedef: H ≥ 99, T ≥ 99, S ≥ 98, Toplam ≥ 98

### Yeni QA Sistemi (LLM-as-judge)
- `qa_master_runner.py` — 9Router üzerinden LLM-as-judge puanlama
- Model: `ocg/qwen3.7-plus` (env ile override edilebilir `BUNGALOV_TEST_MODEL`)
- Skorlar daha gerçekçi, hedeflere ulaşmak için prompt iyileştirme devam ediyor
- Güncel: **93.2/100** (hedef 98 — 5 puan altında)
- Trend tracking altyapısı hazır, history dosyası oluşturulacak

### Sonuçlar

| Tarih | H | T | S | Toplam | Durum |
|------|----|----|----|--------|-------|
| 3 Tem 2026 (LLM-as-judge) | 93.7 | 93.9 | 92.0 | 93.2 | 🔴 HEDEF ALTINDA |
| 1 Tem 2026 (LLM-as-judge, 8 edge) | 85.8 | 92.5 | 89.5 | 89.3 | 🔴 HEDEF ALTINDA |
| 22 Haz 13:00 (keyword dönemi) | 100.0 | 99.1 | 99.3 | 99.5 | 🟢 HEDEFLER KARŞILANDI |
| 22 Haz 10:35 (keyword dönemi) | 99.9 | 99.1 | 99.4 | 99.5 | 🟢 HEDEFLER KARŞILANDI |
| 22 Haz 09:13 | 76.1 | 87.8 | 96.7 | 86.9 | 🔴 REGRESYON |
| 22 Haz 03:20 | ~96 | ~97 | ~97 | ~96.5 | 🔴 BAŞARISIZ |
| 21 Haz 18:18 | 100.0 | 100.0 | 99.7 | 99.9 | 🟢 HEDEFLER KARŞILANDI |
| 23 Haz (re-run) | 83.6 | 86.7 | 93.0 | 87.8 | 🔴 MOCK YANITLAR |

### 23 Haziran Re-Run Analizi
- WF07 smoke test webhook 404 verdiği için tüm 43 senaryo mock yanıt döndürdü
- Mock yanıt: `"Merhaba, {senaryo_adı} ile ilgili yardımcı olabilirim."`
- Gerçek AI test edilemedi
- Dolayısıyla skorlar gerçek AI performansını yansıtmıyor

### Altyapı Testleri: 5/6 ✅
- n8n API: status=ok ✅
- SQLite API: erişilebilir ✅
- Environment: Hardcoded secret yok ✅
- Hata Yönetimi: 1 error handler workflow ✅
- Dedup Pattern: Çalışıyor ✅
- Auth Middleware: X-API-Key doğrulama ✅

---

## 8. Bilinen Sorunlar (P0/P1)

| Öncelik | Sorun | Etki | Çözüm |
|---------|-------|------|-------|
| P0 | WF07 Smoke route 404 | Smoke test çalışmıyor | Webhook'u yeniden kaydet |
| P0 | WF01/WF02 HMAC geçersiz imza | E2E testler fail | HMAC anahtar eşleşmesini kontrol et |
| P0 | WF02 9Router timeout (45s) | E2E pipeline untested | Timeout ayarla, E2E test yaz |
| P0 | SQLite API public URL — auth yok (çözülüyor) | OTP/PII sızıntısı | Auth middleware eklendi, deploy bekliyor |
| P1 | Iyzico canlı fatura bloke | Gerçek ödeme alınamıyor | Kimlik bilgilerini yapılandır |
| P1 | Owner Panel UX — expired trial | Kullanıcı deneyimi | expired trial → expired, onboarding_state ekle |
| P1 | QA hedef altı (93.2 vs 98) | LLM-as-judge henüz hedefte değil | Prompt iyileştirme, model tuning |

---

## 9. Tamamlanan İşler

### n8n Workflows
- ✅ 25 workflow oluşturuldu, 20 aktif
- ✅ WF02 State+AI Pipeline (ana akış)
- ✅ WF03 Rezervasyon yönetimi
- ✅ WF04 Stok/müsaitlik düzeltildi
- ✅ WF05 Human handoff düzeltildi
- ✅ WF06 Telegram bildirimleri düzeltildi
- ✅ WF08 DB bakımı düzeltildi
- ✅ WF10 Fiyat hesaplama düzeltildi
- ✅ WF14 Çoklu dil desteği düzeltildi
- ✅ WF16 Iyzico ödeme (entegrasyon)
- ✅ WF20 Owner panel backend
- ✅ HMAC doğrulama (WF02'de 3 pattern)
- ✅ Dedup pattern'leri
- ✅ Error handler workflow
- ✅ SQLite REST API (main.py v2.1.0, auth middleware eklendi)
- ✅ n8n workflow URL'leri Supabase → SQLite dönüştürüldü
- ✅ 1115 satır veri Supabase → SQLite taşındı
- ✅ LLM-as-judge QA sistemi (qa_master_runner.py)
- ✅ Telegram notifier + canlı test runner

### Resepsiyonistim Panel (panel/)
- ✅ 14.486 satır TypeScript/TSX
- ✅ 140+ kaynak dosya
- ✅ 14 sayfa (login, onboarding, dashboard, reservations, messages, ai, analytics, payments, settings, subscription, reservation-action)
- ✅ 50+ React component
- ✅ 14 custom hook
- ✅ shadcn/ui bileşenleri (15+)
- ✅ SQLite entegrasyonu (client, server, admin, middleware)
- ✅ 3 SQL migration (binary gate, RLS, satisfaction surveys)
- ✅ NextAuth v4 + JWT (multi-method login)
- ✅ Iyzico client + types
- ✅ Web Push (VAPID, client, subscribe/unsubscribe)
- ✅ PWA (service worker, manifest, icons)
- ✅ Onboarding wizard (12 step component, binary gate)
- ✅ Güvenlik (HMAC, CSRF, rate limiting, COEP, JWT, session timeout)
- ✅ Static export build tamamlandı
- ✅ Docker + Coolify deploy script
- ✅ nginx.conf (security headers, CORS, rate limiting)
- ✅ GitHub Actions CI/CD (Cloudflare Pages auto-deploy)

### QA
- ✅ 43 senaryolu test suite (Python)
- ✅ 5 kategori (bungalov, tiny_house, villa, edge_case, sales)
- ✅ GitHub Actions pipeline (qa-tests.yml)
- ✅ LLM-as-judge sistemi (qa_master_runner.py) — 9Router ile puanlama
- ✅ En iyi skor (LLM-as-judge): 93.2/100 (hedef 98 — prompt iyileştirme devam)
- ✅ Altyapı testleri 5/6 geçti
- ✅ Telegram notifier + cron QA runner

---

## 10. Genel Değerlendirme: ~80% Tamamlandı

### Tamamlanan (✅)
- Mimari tasarım
- 20/25 n8n workflow aktif
- Owner panel UI (14K+ satır, 140+ dosya)
- SQLite REST API (auth middleware ile)
- Onboarding wizard (14 adım)
- Güvenlik katmanı (X-API-Key, HMAC, rate limiting)
- PWA desteği
- Docker/Coolify deploy
- QA test suite (43 senaryo + LLM-as-judge)
- Çoklu dil desteği (tr/en/ar)
- Supabase → SQLite migration tamamlandı
- LLM-as-judge QA sistemi aktif

### Devam Eden (🔧)
- Iyzico ödeme entegrasyonu (P1)
- Owner panel UX düzeltmeleri (P1)
- QA skor iyileştirme (93.2 → 98 hedef)
- SQLite API auth middleware deploy (kod hazır)

### Engellenen (🔴)
- n8n HMAC sorunları (P0)
- Smoke test webhook devre dışı (P0)
- E2E pipeline doğrulanmamış (P0)

### Satışa Hazırlık
**DEĞİL** — P0 sorunlar çözülüp taze smoke test + E2E testler geçene kadar satışa çıkılmamalı.
