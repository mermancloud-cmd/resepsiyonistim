# Merman Bungalov AI Resepsiyonist — n8n Workflow Envanteri

**Son güncelleme:** 2026-07-04
**Kaynak:** Canlı n8n REST API sorgulaması + arşivlenmiş çalışma alanı yapıtları

> ⚠️ **KRİTİK NOT:** 4 Temmuz 2026 itibarıyla n8n PostgreSQL volume'u silinmiş, tüm workflow'lar (WF07 hariç) kayıptır.
> WF02 export JSON'ları repo'da `data/exports/latest/` altında mevcuttur ancak Supabase URL'leri içerir (SQLite API'e dönüştürülmeli).
> Diğer workflow'lar için hiçbir yedek bulunmamaktadır. Ayrıntılar: [GitHub Issue #6](https://github.com/mermancloud-cmd/bungalovresepsiyonist54/issues/6)

---

## 1. Özet

| Metrik | Değer |
|--------|-------|
| Toplam Workflow | 25 (eskiden) / 1 (şu an n8n'de) |
| Aktif Workflow | 1 (yalnızca WF07) |
| Pasif/Devre Dışı | 24 (kayıp/n8n'de yok) |

---

## 2. Workflow Listesi

| ID | İsim | Durum | Açıklama | Son QA |
|----|------|-------|----------|--------|
| WF01 | Gelen Mesaj İşleme | ❌ Kayıp | WhatsApp webhook'larını karşılama ve ön işleme, HMAC doğrulama | Export yok |
| **WF02** | **State+AI Pipeline** | **⚠️ Export var (SQLite uyarlaması gerekli)** | **Ana AI akışı — durum yönetimi, dil tespiti, AI yanıt üretimi** | Export'ta Supabase URL'leri |
| WF03 | Rezervasyon | ❌ Kayıp | Rezervasyon oluşturma ve yönetim | Export yok |
| WF04 | Stok/Kullanılabilirlik | ❌ Kayıp | Oda/müsaitlik sorgulama | Export yok |
| WF05 | Human Handoff | ❌ Kayıp | Karmaşık sorgular için insan operatöre devir | Export yok |
| WF06 | Telegram Bildirimleri | ❌ Kayıp | Rezervasyon olayları için yönetici bildirimleri | Export yok |
| WF07 | Smoke Test | ✅ **AKTİF** | Sistem sağlık kontrolü — POST /webhook/smoke-test | ✅ HTTP 200, status:ok |
| WF08 | Veritabanı Bakımı | ❌ Kayıp | Eski kayıtları temizleme (cleanup_old_failures) | Export yok |
| WF09 | — | — | — | — |
| WF10 | Fiyat Hesaplama | ❌ Kayıp | Konaklama fiyatı hesaplama | Export yok |
| WF11 | — | — | — | — |
| WF12 | — | — | — | — |
| WF13 | — | — | — | — |
| WF14 | Çoklu Dil Desteği | ❌ Kayıp | Dil tespiti ve dil-specific prompt oluşturma | Export yok |
| WF15 | — | — | — | — |
| **WF16** | **Iyzico Ödeme** | **❌ Kayıp** | **Online ödeme işleme (Iyzico entegrasyonu)** | Export yok |
| WF17 | — | — | — | — |
| WF18 | — | — | — | — |
| WF19 | — | — | — | — |
| WF20 | Owner Panel | ❌ Kayıp | Yönetici paneli backend | Export yok |
| WF21 | — | — | — | — |
| WF22 | — | — | — | — |
| WF23 | — | — | — | — |
| WF24 | — | — | — | — |

> **Not:** WF09, WF11-WF15, WF17-WF19, WF21-WF24 kimlikleri hakkında arşivlerde veri bulunmamaktadır.

---

## 3. Ana Workflow: WF02 State+AI Pipeline

### Genel Bakış

WF02, Elif AI sisteminin ana işlem hattıdır. WhatsApp üzerinden gelen müşteri mesajlarını işler, dilini tespit eder, durum makinesini yönetir ve AI yanıtı üretir.

**WF02 ID (n8n):** `LYWTQz4QGYuHm4YA`

### Düğüm Sırası

```
1. Gelen Webhook (WhatsApp mesajı)
    ↓
2. Load Conversation State (Supabase'den durum yükleme)
    ↓
3. Detect Language (3 aşamalı Unicode + keyword tespiti)
    ↓
4. Human Handoff Guard (İnsan operatör kontrolü)
    ↓
5. State Transition Logic (Durum makinesi geçişi)
    ↓
6. Update State (Supabase'de durum güncelleme)
    ↓
7. Save Language Preference (Dil tercihi kaydetme)
    ↓
8. Build AI Prompt (Dil-specific prompt oluşturma)
    ↓
9. 9Router Chat Completion (AI yanıtı)
    ↓
10. Parse AI Response (Yanıt ayrıştırma)
    ↓
11. Validate Price & Availability (Fiyat/müsaitlik doğrulama)
    ↓
12. Send via Evolution API (WhatsApp yanıtı gönderme)
```

### State Makinesi Durumları

| State | Açıklama |
|-------|----------|
| greeting | İlk karşılama |
| asking_date | Tarih sorma |
| asking_guests | Kişi sayısı sorma |
| asking_unit_type | Birim tipi sorma (bungalov/tiny house/villa) |
| checking_availability | Müsaitlik kontrolü |
| asking_deposit | Kapora bilgisi |
| confirming | Rezervasyon onaylama |
| handoff | İnsan operatöre devir |
| completed | Rezervasyon tamamlandı |
| cancelled | İptal |

### Dil Desteği

- **Desteklenen Diller:** Türkçe (tr), İngilizce (en), Arapça (ar)
- **Algılama Yöntemi:** Unicode script + karakter tespiti + anahtar kelime puanlaması
- **Depolama:** `conversation_states.preferred_language` sütunu

---

## 4. Desteklenen Workflow'lar

### WF01 — Gelen Mesaj İşleme

**ID:** `yuJXr0wwQfAHPXOH`

WhatsApp webhook'larını Evolution API'den alır, HMAC imzasını doğrular, WF02'ye iletir.

### WF03 — Rezervasyon

Rezervasyon oluşturma, güncelleme ve iptal işlemlerini yönetir. Supabase `reservations` tablosu ile çalışır.

### WF05 — Human Handoff

AI'nın çözemediği karmaşık sorgular için insan operatöre devir mekanizması sağlar.

### WF06 — Telegram Bildirimleri

**ID:** `LQP00ytB2oAuDlWs`

9 olay türü için Telegram yönetici bildirimleri:

| Olay | Emoji | Açıklama |
|------|-------|----------|
| reservation_created | 🆕 | Yeni rezervasyon |
| reservation_hold | 🆕 | Yeni rezervasyon (beklemede) |
| deposit_received | 💰 | Kapora alındı |
| deposit_confirmed | 💰 | Kapora onaylandı |
| owner_approved | ✅ | Yönetici onayladı |
| owner_rejected | ❌ | Yönetici reddetti |
| double_booking_blocked | ⚠️ | Çifte rezervasyon engellendi |
| reservation_cancelled | 🚫 | Rezervasyon iptal edildi |
| reservation_timed_out | ⏰ | Rezervasyon zaman aşımına uğradı |

### WF07 — Smoke Test (Pasif)

Sistem sağlık kontrolü için smoke test webhook'u. **Şu anda POST /webhook/smoke-test 404 döndürüyor** — webhook'un yeniden kaydedilmesi gerekiyor.

### WF16 — Iyzico Ödeme

Online ödeme işleme. **Stripe canlı faturalama** gerçek Stripe kimlik bilgileri ve null Stripe ID'leri nedeniyle bloke durumda.

---

## 5. Altyapı Bağlantıları

| Bağlantı | Tip | Detay |
|----------|-----|-------|
| n8n API | REST | https://n8n.merman.sbs/api/v1/workflows |
| Supabase | REST | Supabase URL + Service Role Key ile erişim |
| Evolution API | REST | WhatsApp mesajlaşma |
| 9Router | REST | AI chat completion |
| Telegram Bot API | REST | Bildirim gönderme |

---

## 6. Bilinen Sorunlar

| ID | Sorun | Etki |
|----|-------|------|
| WF01 | HMAC imza doğrulama hatası | Smoke test geçemiyor |
| WF02 | HMAC imza doğrulama hatası | Load Conversation State credential-node hatası |
| WF02 | 60s timeout (7/7 E2E test başarısız) | AI yanıt üretilemiyor |
| WF07 | Webhook kayıtlı değil (POST 404) | Smoke test çalıştırılamıyor |
| WF16 | Stripe canlı fatura bloke | Gerçek ödeme alınamıyor |
| WF20 | Owner panel test modu UX hataları | expired trial hala trialing, onboarding_state eksik |
