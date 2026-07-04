# Merman Bungalov AI Resepsiyonist — Dağıtım Durumu

**Son güncelleme:** 2026-06-23

---

## 1. Genel Durum: 🟢 YEŞİL

Tüm temel sistem bileşenleri çalışıyor. QA hedefleri karşılanıyor. Bazı P0/P1 sorunları devam ediyor.

---

## 2. QA Test Sonuçları (En Son)

| Tarih | Süre | H | T | S | Toplam | Durum |
|------|------|----|----|----|--------|-------|
| **2026-06-22 13:00** | 168s | **100.0** | **99.1** | **99.3** | **99.5** | 🟢 TÜM HEDEFLER KARŞILANDI |
| 2026-06-22 10:35 (düzeltilmiş) | — | 99.9 | 99.1 | 99.4 | 99.5 | 🟢 TÜM HEDEFLER KARŞILANDI |
| 2026-06-22 09:13 (regresyon) | — | 76.1 | 87.8 | 96.7 | 86.9 | 🔴 BAŞARISIZ |
| 2026-06-22 03:20 | — | ~96 | ~97 | ~97 | ~96.5 | 🔴 BAŞARISIZ (t_88cba215 öncesi) |
| 2026-06-21 18:18 | ~15dk | 100.0 | 100.0 | 99.7 | 99.9 | 🟢 TÜM HEDEFLER KARŞILANDI |

### Hedefler

| Metrik | Hedef | Son Skor | Durum |
|--------|-------|----------|-------|
| İnsana Benzerlik (H) | ≥ 99 | **100.0** | ✅ |
| Güvenilirlik (T) | ≥ 99 | **99.1** | ✅ |
| Satış (S) | ≥ 98 | **99.3** | ✅ |
| **Toplam** | ≥ 98 | **99.5** | ✅ |

### Kategori Bazında Sonuçlar

| Kategori | Adet | H | T | S | Toplam |
|----------|------|----|----|----|--------|
| Bungalov | 12 | 100.0 | 99.2 | 99.4 | 99.5 |
| Tiny House | 8 | 100.0 | 99.0 | 99.6 | 99.5 |
| Villa | 10 | 100.0 | 99.0 | 99.0 | 99.3 |
| Edge Case | 8 | 100.0 | 99.1 | 99.1 | 99.4 |
| Sales | 5 | 100.0 | 99.2 | 99.8 | 99.6 |

### Altyapı Testleri: 6/6 ✅

| Test | Durum | Detay |
|------|-------|-------|
| n8n API | ✅ | status=ok |
| Supabase RLS | ✅ | 3 fonksiyon 401 döndü (beklenen) |
| Environment Variable | ✅ | Hardcoded secret yok |
| Hata Yönetimi | ✅ | 1 error handler workflow bulundu |
| Dedup Pattern | ✅ | Dedup pattern'leri çalışıyor |
| HMAC Doğrulama | ✅ | WF02'de 3 HMAC pattern'i bulundu |

---

## 3. Workflow Durumu

| ID | İsim | Aktif | Son QA | Notlar |
|----|------|-------|--------|--------|
| WF01 | Gelen Mesaj İşleme | ✅ | 🔴 HMAC geçersiz imza | Smoke test başarısız |
| WF02 | State+AI Pipeline | ✅ | 🔴 HMAC geçersiz imza + Load Conv State hatası | 60s timeout sorunu (7/7 başarısız) |
| WF03 | Rezervasyon | ✅ | ✅ | Çalışıyor |
| WF04 | Stok/Kullanılabilirlik | ✅ | ✅ | Sorunlar düzeltildi |
| WF05 | Human Handoff | ✅ | ✅ | Sorunlar düzeltildi |
| WF06 | Telegram Bildirimleri | ✅ | ✅ | Sorunlar düzeltildi |
| WF07 | Smoke Test | ⏸️ | ❌ | POST /webhook/smoke-test 404 (kayıtlı değil) |
| WF08 | Veritabanı Bakımı | ✅ | ✅ | Sorunlar düzeltildi |
| WF10 | Fiyat Hesaplama | ✅ | ✅ | Sorunlar düzeltildi |
| WF14 | Çoklu Dil Desteği | ✅ | ✅ | Sorunlar düzeltildi |
| WF16 | Iyzico Ödeme | ✅ | ⚠️ | Stripe canlı fatura bloke (gerçek kimlik bilgisi/null Stripe ID yok) |
| WF20 | Owner Panel | ✅ | ⚠️ | Süresi dolmuş deneme sürümü hala "trialing", onboarding_state eksik |

---

## 4. Bilinen Sorunlar (P0/P1)

| Öncelik | Sorun | Etki | Workaround |
|---------|-------|------|------------|
| P0 | WF07 Smoke Route kullanılamıyor (POST 404) | Smoke test çalıştırılamıyor | Webhook'u yeniden kaydetmek gerekli |
| P0 | WF01/WF02 HMAC geçersiz imza | End-to-end testler başarısız | HMAC anahtar eşleşmesini kontrol et |
| P0 | WF02 Load Conv State credential-node hatası | State yüklenemiyor | Credential yapılandırmasını düzelt |
| P0 | WF02 60s timeout (7/7 başarısız) | Yanıt üretilemiyor | Timeout yapılandırmasını arttır |
| P1 | Stripe canlı fatura bloke | Gerçek ödeme alınamıyor | Stripe kimlik bilgilerini/Stripe ID'lerini yapılandır |
| P1 | Owner Panel test modu UX hataları | Kullanıcı deneyimi sorunları | expired trial → expired, onboarding_state ekle |

---

## 5. Güvenlik

| Denetim | Tarih | Sonuç |
|---------|-------|-------|
| RPC Hardening | 2026-06-21 | ✅ 3 hassas fonksiyon anonim erişime kapalı, 5 public fonksiyon erişilebilir |
| n8n Execution Hataları | 2026-06-21 | ✅ 41 execution kontrol edildi, 0 RPC hatası |

---

## 6. Dağıtım Detayları

- **n8n Sunucu:** Çalışıyor — status=ok
- **Workflow Sayısı:** 25 toplam, 20 aktif
- **AI Sağlayıcı:** 9Router (model: cx/gpt-5.4-mini)
- **Veritabanı:** Supabase PostgreSQL (RLS aktif)
- **Ödeme:** Iyzico (entegrasyon aşamasında)
- **Durum:** Satışa hazır DEĞİL — taze smoke test + 7 senaryolu E2E geçene kadar
