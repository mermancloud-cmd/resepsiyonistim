# Resepsiyonistim — Güncel Proje Durumu

**Güncelleme:** 25 Haziran 2026
**Proje:** Dijital Resepsiyonist — WhatsApp üzerinden konaklama işletmeleri için insan gibi konuşan dijital resepsiyonist

---

## 1. Proje Özeti

Küçük ve orta ölçekli konaklama işletmeleri (bungalov, tiny house, villa, butik otel, pansiyon, apart, glamping ve kamp alanları) için geliştirilmiş AI resepsiyonist sistemi. WhatsApp üzerinden misafir sorularını yanıtlar, rezervasyon sürecini yönetir, dil tespiti yapar (tr/en/ar), ve karmaşık durumlarda insan operatöre devreder.

### Hedef Kitle
- Bungalov işletmecileri
- Tiny house tesisleri
- Villa/konaklama sahipleri
- Butik oteller ve pansiyonlar
- Apart ve glamping tesisleri
- Kamp alanları
- **Büyük otel/resortlar için DEĞİL** (kurumsal çözümler için farklı plan)

---

## 2. Mimari Genel Bakış

```
WhatsApp Mesajı → Evolution API Webhook
  → WF01 (ön işleme + HMAC doğrulama)
  → WF02 (State+AI Pipeline — n8n)
     → Dil Tespiti (tr/en/ar, Unicode + keyword)
     → State Machine (greeting → asking_date → ... → completed)
     → AI Prompt Oluşturma (dil-specific)
     → 9Router API (model: cx/gpt-5.4-mini)
     → Yanıt Ayrıştırma + Doğrulama
  → Supabase (conversation_states, reservations, ...)
  → Evolution API → WhatsApp yanıtı
  → Telegram Bot → Yönetici bildirimi

Owner Panel (bungalow-panel):
  Next.js 16 → Supabase Auth + RLS
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
| Workflow Motoru | n8n (25 workflow, 20 aktif) |
| LLM Sağlayıcı | 9Router (cx/gpt-5.4-mini) |
| Veritabanı | Supabase (PostgreSQL, RLS aktif) |
| WhatsApp API | Evolution API |
| Owner Panel | Next.js 16, React 19, TypeScript 5, Tailwind 4 |
| UI Kütüphanesi | shadcn/ui |
| State | Zustand + TanStack Query |
| Auth | NextAuth v4 + Supabase Auth |
| Ödeme | IBAN (şu anlık) → Iyzico (planlanan) |
| Bildirimler | Telegram Bot + Web Push |
| Deploy | Docker, Coolify, Cloudflare Pages |
| Charts | Recharts |

---

## 4. GitHub Repoları

| Repo | Tip | İçerik |
|------|-----|--------|
| `mermancloud-cmd/bungalovresepsiyonist54` | PRIVATE | n8n workflow yönetimi, QA test suite, simülasyon scriptleri |
| `mermancloud-cmd/bungalow-panel` | PUBLIC | Next.js owner paneli (frontend + Supabase entegrasyonu) |

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
| WF16 | Iyzico Ödeme | ✅ Aktif | ⚠️ IBAN çalışıyor, Iyzico planlanan |
| WF20 | Owner Panel | ✅ Aktif | ⚠️ UX hataları |

---

## 6. Owner Panel (bungalow-panel) — Detay

### Sayfalar (14)
- `/login` — Multi-method auth (Supabase + NextAuth)
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
- JWT auth (auth-jwt.ts)
- Supabase RLS (3 migration: binary gate, RLS policies, satisfaction surveys)

### Hooks (14)
use-analytics-dashboard, use-auth-logout, use-conversations, use-dashboard-stats, use-iban-payments, use-onboarding, use-onboarding-gate, use-owner-ibans, use-push-notification, use-rate-limiter, use-reservations, use-satisfaction-analytics, use-session-timeout

### Build
- Static export tamamlandı (`out/` dizini)
- Docker + Coolify deploy script hazır
- nginx.conf (rate limiting, CORS, security headers)
- GitHub Actions: auto-deploy to Cloudflare Pages

---

## 7. QA Test Sonuçları

### Test Suite (bungalov_qa_v3)
- 43 senaryo, 5 kategori
- Kategoriler: bungalov (12), tiny_house (8), villa (10), edge_case (8), sales (5)
- Hedef: H ≥ 99, T ≥ 99, S ≥ 98, Toplam ≥ 98

### Sonuçlar

| Tarih | H | T | S | Toplam | Durum |
|------|----|----|----|--------|-------|
| 22 Haz 13:00 | 100.0 | 99.1 | 99.3 | 99.5 | 🟢 HEDEFLER KARŞILANDI |
| 22 Haz 10:35 | 99.9 | 99.1 | 99.4 | 99.5 | 🟢 HEDEFLER KARŞILANDI |
| 22 Haz 09:13 | 76.1 | 87.8 | 96.7 | 86.9 | 🔴 REGRESYON |
| 22 Haz 03:20 | ~96 | ~97 | ~97 | ~96.5 | 🔴 BAŞARISIZ |
| 21 Haz 18:18 | 100.0 | 100.0 | 99.7 | 99.9 | 🟢 HEDEFLER KARŞILANDI |
| 23 Haz (re-run) | 83.6 | 86.7 | 93.0 | 87.8 | 🔴 MOCK YANITLAR |

### 23 Haziran Re-Run Analizi
- WF07 smoke test webhook 404 verdiği için tüm 43 senaryo mock yanıt döndürdü
- Mock yanıt: `"Merhaba, {senaryo_adı} ile ilgili yardımcı olabilirim."`
- Gerçek AI test edilemedi
- Dolayısıyla skorlar gerçek AI performansını yansıtmıyor

### Altyapı Testleri: 6/6 ✅
- n8n API: status=ok ✅
- Supabase RLS: 3 fonksiyon 401 (beklenen) ✅
- Environment: Hardcoded secret yok ✅
- Hata Yönetimi: 1 error handler workflow ✅
- Dedup Pattern: Çalışıyor ✅
- HMAC Doğrulama: WF02'de 3 pattern ✅

---

## 8. Bilinen Sorunlar (P0/P1)

| Öncelik | Sorun | Etki | Çözüm |
|---------|-------|------|-------|
| P0 | WF07 Smoke route 404 | Smoke test çalışmıyor | Webhook'u yeniden kaydet |
| P0 | WF01/WF02 HMAC geçersiz imza | E2E testler fail | HMAC anahtar eşleşmesini kontrol et |
| P0 | WF02 Load Conv State credential hatası | State yüklenemiyor | Credential yapılandırmasını düzelt |
| P0 | WF02 60s timeout (7/7 fail) | Yanıt üretilemiyor | Timeout'u arttır |
| P1 | IBAN/ödeme — Iyzico canlıya geçiş planlanıyor | Gerçek ödeme alınamıyor (şu an IBAN) | Iyzico kimlik bilgilerini yapılandır |
| P1 | Owner Panel UX — expired trial | Kullanıcı deneyimi | expired trial → expired, onboarding_state ekle |

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

### Owner Panel (bungalow-panel)
- ✅ 14.486 satır TypeScript/TSX
- ✅ 140+ kaynak dosya
- ✅ 14 sayfa (login, onboarding, dashboard, reservations, messages, ai, analytics, payments, settings, subscription, reservation-action)
- ✅ 50+ React component
- ✅ 14 custom hook
- ✅ shadcn/ui bileşenleri (15+)
- ✅ Supabase entegrasyonu (client, server, admin, middleware)
- ✅ 3 SQL migration (binary gate, RLS, satisfaction surveys)
- ✅ NextAuth v4 + Supabase Auth (multi-method login)
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
- ✅ En iyi skor: 99.5/100 (hedef 98)
- ✅ Altyapı testleri 6/6 geçti

---

## 10. Genel Değerlendirme: ~85% Tamamlandı

### Tamamlanan (✅)
- Mimari tasarım
- 20/25 n8n workflow aktif
- Owner panel UI (14K+ satır, 140+ dosya)
- Supabase entegrasyonu
- Onboarding wizard (14 adım)
- Güvenlik katmanı
- PWA desteği
- Docker/Coolify deploy
- QA test suite (43 senaryo)
- Çoklu dil desteği (tr/en/ar)

### Devam Eden (🔧)
- Iyzico ödeme entegrasyonu (P1)
- Owner panel UX düzeltmeleri (P1)

### Engellenen (🔴)
- n8n HMAC + timeout sorunları (P0)
- Smoke test webhook devre dışı (P0)

### Satışa Hazırlık
**DEĞİL** — P0 sorunlar çözülüp taze smoke test + E2E testler geçene kadar satışa çıkılmamalı.
