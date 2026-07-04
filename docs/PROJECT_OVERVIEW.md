# Merman Bungalov AI Resepsiyonist — Proje Genel Bakış

**Proje:** Elif AI — WhatsApp üzerinden Merman Bungalov tesisi için yapay zeka resepsiyonist
**Son güncelleme:** 2026-07-04

---

## 1. Proje Tanımı

Merman Bungalov müşterileri için WhatsApp tabanlı bir AI resepsiyonist sistemi. Müşteri mesajlarını alır, doğal dilde yanıtlar, rezervasyon sürecini yönetir ve gerektiğinde insan operatöre devreder. Sistem **n8n** workflow motoru üzerinde çalışır, **SQLite** (bungalov-db REST API) veritabanı kullanır ve **Evolution API** üzerinden WhatsApp mesajlaşmasını sağlar.

---

## 2. Teknoloji Yığını

| Bileşen | Teknoloji | Açıklama |
|---------|-----------|----------|
| Workflow Motoru | n8n | 25 workflow, 20 aktif |
| LLM Sağlayıcı | 9Router | AI yanıt üretimi |
| Veritabanı | SQLite (bungalov-db REST API) | conversation_states, reservations, vb. (auth middleware) |
| WhatsApp API | Evolution API | Mesaj gönderme/alma |
| Bildirimler | Telegram Bot | Yönetici bildirimleri |
| Ödeme | Iyzico (entegrasyon aşamasında) | Online ödeme işleme |

---

## 3. Workflow Mimarisi

### Ana Akış (WF02 — State+AI Pipeline)

```
WhatsApp Mesajı → Evolution API Webhook
    → WF01 Gelen Mesaj (ön işleme)
        → WF02 State+AI (durum yönetimi + AI yanıt)
            → Dil Tespiti (tr/en/ar)
            → Durum Geçişi (state machine)
            → AI Prompt Oluşturma
            → 9Router API Çağrısı
            → Yanıt Ayrıştırma ve Doğrulama
        → Evolution API (yanıt gönderme)
```

### Destek Workflow'ları

| ID | İsim | Durum | Açıklama |
|----|------|-------|----------|
| WF01 | Gelen Mesaj İşleme | ✅ Aktif | WhatsApp webhook'larını karşılama ve ön işleme |
| WF02 | State+AI Pipeline | ✅ Aktif | Ana AI akışı, durum yönetimi, dil tespiti |
| WF03 | Rezervasyon | ✅ Aktif | Rezervasyon oluşturma ve yönetim |
| WF04 | Stok/Kullanılabilirlik | ✅ Aktif | Oda/müsaitlik sorgulama |
| WF05 | Human Handoff | ✅ Aktif | Karmaşık sorgular için insan operatöre devir |
| WF06 | Telegram Bildirimleri | ✅ Aktif | Rezervasyon olayları için yönetici bildirimleri |
| WF07 | Smoke Test | ⏸️ Pasif | Sistem sağlık kontrolü |
| WF08 | Veritabanı Bakımı | ✅ Aktif | Eski kayıtları temizleme |
| WF10 | Fiyat Hesaplama | ✅ Aktif | Konaklama fiyatı hesaplama |
| WF14 | Çoklu Dil Desteği | ✅ Aktif | Dil tespiti ve çeviri desteği |
| WF16 | Iyzico Ödeme | ✅ Aktif | Online ödeme işleme (entegrasyon) |

---

## 4. Çoklu Dil Desteği

Sistem **3 dilde** hizmet vermektedir:

| Dil | Kod | Tespit Yöntemi | Beklenen Doğruluk |
|-----|-----|-----------------|-------------------|
| Türkçe | tr | Karakter + anahtar kelime | ~%92 |
| İngilizce | en | Anahtar kelime puanlama | ~%88 |
| Arapça | ar | Unicode script analizi | ~%99 |

Dil tespiti Unicode script analizi, karakter tespiti ve anahtar kelime puanlaması ile 3 aşamalı olarak yapılır. Tespit edilen dil `conversation_states` tablosunda saklanır ve sonraki mesajlarda kullanılır.

---

## 5. Veritabanı Şeması

### Ana Tablolar

- **conversation_states** — Konuşma durumu, dil tercihi, state makinesi
  - `phone_number` (TEXT, PK)
  - `state` (TEXT) — Mevcut state (greeting, asking_date, asking_guests, vb.)
  - `context` (JSONB) — Konuşma bağlamı
  - `preferred_language` (TEXT, default 'tr')
  - `language_detected_at` (TIMESTAMPTZ)
  - `language_switch_count` (INTEGER)
  - `language_history` (JSONB)
  - `onboarding_state` (TEXT)
  - `created_at` / `updated_at` (TIMESTAMPTZ)

- **reservations** — Rezervasyon kayıtları
- **notification_logs** — Bildirim geçmişi
- **otp_codes** — Tek kullanımlık şifreler
- **owner_settings** — Yönetici ayarları

---

## 6. QA Durumu (Son — LLM-as-judge)

| Metrik | Skor | Hedef | Durum |
|--------|------|-------|-------|
| İnsana Benzerlik (H) | 93.7 | ≥ 99 | ❌ |
| Güvenilirlik (T) | 93.9 | ≥ 99 | ❌ |
| Satış (S) | 92.0 | ≥ 98 | ❌ |
| **Toplam** | **93.2** | ≥ 98 | ❌ 5 puan altında |

- **43 senaryo**, 5 kategoride test edildi (keyword dönemi: 99.5 ✅)
- **LLM-as-judge** sistemi devrede (`qa_master_runner.py` + 9Router)
- Prompt iyileştirme ve model tuning ile hedefe ulaşılması bekleniyor

---

## 7. Altyapı

- **n8n Sunucu:** Çalışıyor (status=ok)
- **SQLite API (bungalov-db):** Çalışıyor, auth middleware eklendi (X-API-Key)
- **SQLite API Public:** `https://bungalov-db.merman.sbs` (Coolify deploy bekliyor)
- **Evolution API:** WhatsApp mesajlaşma aktif
- **9Router:** AI yanıt sağlayıcı aktif
- **Telegram Bot:** Bildirimler için aktif
- **Iyzico:** Ödeme entegrasyonu (entegrasyon aşamasında)

---

## 8. Güvenlik

- **SQLite API Auth** (2026-07-03): X-API-Key middleware eklendi (`/health`, `/docs`, `/openapi.json` hariç)
- **HMAC İmzalama** (WF02): Mesaj doğrulama için HMAC imzalama
- **Environment Variable Yönetimi**: Tüm secret'lar environment variable olarak saklanır
- **select/order injection koruması**: `select` parametresi artık sadece güvenli kolon adlarına izin verir

---

## 9. Bilinen Riskler

1. **WF07 Smoke Route**: POST /webhook/smoke-test 404/kayıtlı değil — E2E pipeline doğrulanamıyor
2. **WF01/WF02 HMAC**: Son smoke testlerde geçersiz HMAC imza hatası
3. **QA Hedef Altı**: LLM-as-judge skoru 93.2/100 (hedef 98) — prompt/model iyileştirme gerekli
4. **SQLite API Auth**: Middleware koda eklendi ancak Coolify deploy bekliyor
5. **Owner Panel Test Modu**: Süresi dolmuş deneme sürümü hala "trialing" gösteriyor
6. **DB Yedekleme Yok**: SQLite tek dosya, otomatik yedek mekanizması kurulmadı
