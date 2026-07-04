# Resepsiyonistim — Eleştirel Değerlendirme v3

**Tarih:** 4 Temmuz 2026
**Değerlendiren:** Hermes Agent (GLM-5.2, otomatik)
**Konu:** Projenin güncel halinin (v2'den sonra) uçtan-uca eleştirisi — altyapı, güvenlik, n8n, QA ve üretim hazırlığı
**Önceki eleştiri:** 3 Temmuz 2026 (v2) — bu döküman v2'nin yerini alır.

---

## Genel Puan: 5.5/10 -> 6.0/10

v2'de 5.5/10 olan puan **hafif yükseldi**. Sebep: WF01/WF02'deki kritik altyapı hataları bulundu ve düzeltildi, E2E test ilk kez başarıyla sonuçlandı. Ancak v2'deki **güvenlik, mimari ve operasyonel risklerin çoğu hâlâ çözülmüş değil.**

| Kategori | v2 Puanı | v3 Puanı | Değişim |
|----------|----------|----------|---------|
| Mimari & altyapı | 6.5 | 6.5 | — (Docker DNS fix iyi ama çift DB hâlâ var) |
| n8n workflow sağlığı | ? | 7.5 | **YENİ** — credential fix, E2E test başarılı |
| QA altyapısı | 6 | 6 | — (değişiklik yok) |
| Güvenlik | 4 | 3 | **⬇ DÜŞTÜ** — çift DB + public URL auth yokluğu devam |
| Operasyon/altyapı | 4 | 4 | — (yedekleme, container sürekliliği) |
| Dokümantasyon | 3 | 3 | — (güncellenmedi) |
| Ürün/satış hazırlığı | 4 | 5 | **⬆ YÜKSELDİ** — E2E test çalışıyor (önemli eşik) |

---

## 0. KRİTİK GELİŞME: WF01/WF02 Altyapı Hataları Bulundu ve Düzeltildi

**En önemli gelişme.** v2 eleştirisinden 1 gün sonra n8n workflow'larında üç kritik hata tespit edildi:

### 0.1 HTTP Node'larında "Credentials Not Found" (WF01 P0)

WF01'deki 6 HTTP Request node'u `authentication: "predefinedCredentialType"` kullanıyordu ama hiçbir credential tanımlı değildi. Bu nedenle:
- Webhook tetiklendiğinde ilk HTTP node'u "Credentials not found" hatasıyla patlıyordu
- **Tüm WF01 execution'ları sessizce hata veriyordu** (exec 20'de tespit edildi)

**Çözüm:** 6 node'da `authentication` → `"none"` yapıldı. Bu node'lar `bungalov-db`'ye doğrudan HTTP çağrısı yapıyor, ek auth gereksiz.

### 0.2 Docker DNS yanlış adres (WF01/WF02 P0)

WF01 ve WF02'deki tüm HTTP Request node'ları `http://10.0.5.2:8000` kullanıyordu. Bu IP **host machine'den** erişilebilir, ama **n8n Docker container'ından erişilemez.** WF01 bu yüzden 20 saniye timeout'a takılıp execution'u askıda bırakıyordu.

**Çözüm:** Tüm URL'ler `http://bungalov-db:8000`'e çevrildi (Docker DNS). n8n container'ı bu adresten Docker compose network'ündeki `bungalov-db` servisine erişebiliyor.

### 0.3 WF02 URL Expression'ında body. prefix Hatası (WF02 P0)

WF02'nin "Load Conversation State" HTTP node'unun URL expression'ı `$json.body?.conversationId` kullanıyordu. Oysa WF01'den gelen veriler **root seviyede JSON**, `body` altında değil. Bu yüzden URL parametreleri boş geliyor, `encodeURIComponent(undefined)` → hata.

**Çözüm:** Tüm `$json.body?.XXX` ifadeleri `($json.XXX ?? $json.body?.XXX)` ile değiştirildi.

### 0.4 WF02 Fetch Bungalows — null tenant_id'de empty URL (bulgu)

WF02'nin "Fetch Bungalows" node'u tenant_id null olduğunda boş string döndürüyordu:
```
: ""    # hata: URL parameter cannot be empty
```

**Çözüm:** Boş string yerine `http://bungalov-db:8000/rest/v1/bungalows?limit=0` limit=0 URL kullanıldı.

### 0.5 WF07 Smoke Test Webhook — Çalışıyor

v2'de "E2E pipeline hâlâ doğrulanmamış — WF07 pasif" denmişti. **Doğrulandı:** WF07 smoke test webhook'u çalışıyor (exec 24, WF01 testi başarılı). v2'deki bu madde güncelliğini yitirdi.

---

## 1. 🔴 E2E Test İlk Kez Başarılı

Tüm yukarıdaki düzeltmeler sonrası:

- **WF01 (whatsapp-incoming): exec 30 ✅ success**
- **WF02 (state-ai): exec 30 ✅ success**
- **WF01 → WF02 çağrısı: başarılı** (aynı timestamp)
- **bungalov-db erişimi: çalışıyor** (tenant, conversation, message işlemleri)
- **HMAC imzalama: doğrulandı** (evolution token ve standart HMAC metodu)

Bu, proje tarihinde **ilk kez** E2E pipeline'ın çalıştığı anlamına geliyor. v2'deki en büyük P0 sorunlarından biri çözüldü.

---

## 2. 🔴 YENİ: Çift Veritabanı Sorunu (P0 — Architecture)

Projede **iki ayrı bungalov-db instance'ı çalışıyor:**

| Instance | Adres | DB Dosyası | Çalıştıran |
|----------|-------|------------|------------|
| Host process | `10.0.5.2:8000` | `/opt/hermes/resepsiyonistim/data/bungalov.db` | Python (systemd/hand) |
| Docker container | `bungalov-db:8000` | Docker volume `zdbfcjg2668pgeck0d4on4ug` | Coolify deployment |

**İkisi farklı SQLite dosyalarına yazıyor.** n8n container'ı şimdi `bungalov-db:8000` (Docker) kullanıyor. WF01'in code node'u da `bungalov-db:8000` kullanıyor. Ama host process farklı bir DB'ye yazıyor.

**Risk:** Bir tenant host process üzerinden kaydedilmişse, Docker container'da görünmez. Staging'de veri tutarsızlığı üretimde müşteri verisi kaybına dönüşür.

**Çözüm:**
1. **Acil:** Docker volume'u host'taki DB dosyasına bind mount et (`docker run -v /opt/hermes/.../bungalov.db:/data/bungalov.db`)
2. **Kalıcı:** Sadece Docker container çalışsın, host process'i kapat

---

## 3. 🔴 WF02 Code Node'larında -- Operability Risk

### 3.1 `this.helpers.httpRequest` Kullanımı

WF01'deki `Call WF02 State+AI` code node'u ve DB sorgu kodları `this.helpers.httpRequest()` ile yapılıyor:
```javascript
const supabaseRequest = (options) => this.helpers.httpRequest(options);
```

Bu yaklaşım:
- n8n visual akış avantajını öldürür — HTTP çağrıları koda gömülü, debug UI'dan izlenemez
- Hata ayıklama zor: console.log'a güveniyor, execution UI'da düğüm bazında hata gösterimi yok
- n8n versiyon API değişikliklerinde sessizce çöker

**Çözüm:** Her DB işlemi için ayrı HTTP Request node'u oluştur, code node'larını sadece data transformation için kullan. (WF01'de zaten 6 HTTP node düzeltildi — diğer çağrılar da node'a taşınmalı.)

### 3.2 Task Runner'da `$getWorkflowStaticData` Riski

n8n v1.88+ **task runner** kullanıyor (`N8N_TASK_RUNNER_ENABLED=true`). Task runner'da `$getWorkflowStaticData` **çalışmaz** — yerine `$getWorkflowStaticData` kullanılmalı. WF02'nin bazı node'ları static data kullanıyorsa (rate limiting, state caching), sessizce patlayacak.

### 3.3 HMAC Secret Code Node'da Düz Metin

```javascript
const evoSecret = 'wVSyUNCmuWesyZkdl1JytxkguAQ9aIazlf3P0Su6gLk';
```

- Git'te görünür (private repo olsa da)
- n8n UI'da her gören okuyabilir
- Rotasyon imkansız — secret değişince code node'dan güncellemek gerek

**Çözüm:** `process.env.WEBHOOK_SIGNING_SECRET` ile environment variable'dan oku.

---

## 4. 🟡 SQLite REST API Güvenlik Açıkları (v2'den Devam, Çözülmedi)

v2'deki P0 maddelerinden biri hâlâ çözülmedi:
- **Public URL:** `bungalov-db.merman.sbs` — auth middleware yok
- **OTP leak:** `GET /rest/v1/otp_codes` → tüm login OTP'leri görünür
- **PII leak:** conversations tablosu (guest_phone, guest_name) — açık
- **SQL injection:** `select` parametresi raw query'ye giriyor, hiçbir validasyon yok

v2'deki çözüm önerisi halen geçerli:
```python
@app.middleware("http")
async def require_api_key(request: Request, call_next):
    if request.url.path == "/health": return await call_next(request)
    if request.headers.get("X-API-Key") != os.environ["API_KEY"]:
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    return await call_next(request)
```

---

## 5. 🟡 Üç Farklı Elif Persona + Model (v2'den Devam)

| Dosya | Model | Prompt tonu |
|-------|-------|-------------|
| `scripts/run_live_tests.py` | `ocg/deepseek-v4-flash` (hardcoded) | Maks 150 karakter, "AI olduğunu söyleme" |
| `scripts/qa_master_runner.py` | `ocg/qwen3.7-plus` (env override edilebilir) | Sıcak, doğal, 4096 token |
| n8n WF02 | ? (dökümanlardan görünmüyor) | ? |

**Hâlâ source-of-truth yok.** WF02'de gerçekte hangi prompt/model var — dökümanda yazmıyor. Test script'leri farklı modele gidiyor, üretim farklı model kullanıyor olabilir.

---

## 6. 🟡 QA Altyapısı: İlerleme Yok

- İki sistem yarışıyor: `qa_master_runner.py` (LLM-as-judge) vs `run_live_tests.py` (keyword matching)
- Multi-turn test senaryoları hâlâ yok (tek-tur 43 senaryo)
- Duygusal/karmaşık senaryolar hâlâ eksik
- Trend history hiç çalışmamış
- v2'deki 89.25–93.2 bandı hâlâ geçerli, hedef (≥98) yakalanamadı

---

## 7. 🟢 Düzelmiş / Kısmen Düzelmiş Maddeler

| v2 Sorunu | v3 Durum |
|-----------|----------|
| WF01/WF02 credential hatası | ✅ Çözüldü — 6 HTTP node'da auth→none |
| Docker DNS (10.0.5.2 → bungalov-db) | ✅ Çözüldü — tüm URL'ler Docker DNS |
| body. prefix hatası | ✅ Çözüldü — root field referansı |
| Fetch Bungalows empty URL | ✅ Çözüldü — limit=0 fallback |
| E2E pipeline test edilmemiş | ✅ Test edildi — WF01/WF02 success |
| HMAC çalışıyor mu? | ✅ Doğrulandı — evolution token + HMAC metot |
| WF07 smoke test pasif | ⚠️ Güncellendi — çalışıyor ama döküman güncel değil |
| SQLite API auth | ❌ Hâlâ çözülmedi |

---

## 8. 🔴 Operasyonel Riskler (Yeni Bulgular)

### 8.1 n8n Webhook'u Aktifleştirme Sorunu

WF02'nin deaktive/aktive döngüsünde `versionId` ile aktivasyon gerekli:
```
Error 400: {"code":"invalid_type","expected":"string","received":"undefined","path":["versionId"]}
```
n8n v1.88'de webhook'lar PATCH sonrası otomatik yeniden yüklenmiyor. Her PATCH sonrası manuel deactivate/activate gerekli. Operasyonel unutkanlık riski.

### 8.2 n8n UI Render Etmiyor

Hâlâ çözülmedi — Vue SPA mount olmuyor. Tüm operasyon REST API üzerinden yapılıyor. Bu:
- Debug'ı yavaşlatır (execution detayları linked JSON formatında)
- Yeni developer onboarding'ini zorlaştırır
- n8n versiyon yükseltmesi gerektirebilir

### 8.3 n8n Rate Limiting (429 Too Many Requests)

Sık API çağrılarında 429 hatası alınıyor. Fix script'leri `sleep(3)` ile çalışıyor. Bu:
- Otomasyon script'lerini yavaşlatır
- CI/CD pipeline'ında sorun çıkarır

---

## 9. 🟡 Dokümantasyon Güncel Değil (v2'den Devam)

- `PROJE_DURUMU.md`: Hâlâ Supabase (PostgreSQL) diyor, model `cx/gpt-5.4-mini` diyor
- `docs/PROJECT_OVERVIEW.md`: Aynı — eski QA skorları (99.5)
- `README.md`: Hâlâ Supabase komutları, `docker compose up` talimatları
- `check-supabase-onboarding.mjs`: Hâlâ repo'da, Supabase referansı devam ediyor
- Yeni script'ler (`qa_master_runner.py`, `test_9router_direct.py`, vs.) commit edilmemiş

---

## 10. 🟢 Codebase Hygiene (Kısmen İyileşti)

- `__pycache__` commit edilmiş → hâlâ aynı
- 10 simulate script + 2 .bat → hâlâ aynı
- Yeni script'ler commit edilmemiş → hâlâ aynı
- **Olumlu:** `fix_final_v4.py` gibi geçici fix script'leri `/tmp/`'de, repo'ya bulaşmadı

---

## 11. 🟡 "Robot musun?" / Yalan Sorunu (v2'den Devam)

Hâlâ çözülmedi. E04 testinde "Hayır, robot değilim" yanıtı dönüyor. Prompt'ta "Asla AI/bot/yapay zeka olduğunu söyleme" talimatı var. Müşteri doğrudan sorduğunda bu yalana zorluyor.

**Çözüm hâlâ geçerli:** "Sizinle Resepsiyonistim olarak konuşuyorum" pivot kullan. Ne "insanım" de ne "robotum".

---

## 12. Özet ve Öncelik Sırası (Güncellenmiş)

### Çözülen P0'lar
- ✅ WF01 HTTP credential hatası → 6 node'da auth düzeltildi
- ✅ Docker DNS hatası → tüm URL'ler bungalov-db:8000
- ✅ body. prefix hatası → root field referansları
- ✅ Fetch Bungalows empty URL → limit=0 fallback
- ✅ E2E pipeline test edildi → WF01→WF02 success

### Hâlâ Çözülmemiş P0'lar
1. 🔴 **Çift veritabanı** — host process vs Docker container, farklı DB dosyaları
2. 🔴 **SQLite API auth yok** — public URL, OTP/PII leak riski
3. 🔴 **Üç farklı persona/model** — source-of-truth yok
4. 🔴 **"Robot değilim" yalanı** — etik/legal risk
5. 🔴 **select/DELETE injection** — SQL injection açığı
6. 🔴 **HMAC secret code node'da düz metin** — env variable'a taşınmalı
7. 🔴 **Task runner uyumsuzluğu** — `$getWorkflowStaticData` çalışmayabilir

### Önerilen Öncelik Sırası (güncel)

1. **Acil:** Çift DB'yi tekilleştir (Docker volume'u host DB'ye mount et) — ~30 dk
2. **Acil:** SQLite API auth middleware ekle — ~1 saat
3. **Acil:** select/DELETE injection fix — ~30 dk
4. **Bugün:** HMAC secret'ı env variable'a taşı — ~30 dk
5. **Bugün:** Persona/model tek kaynağa çek, env variable'dan oku — ~1 saat
6. **1 gün:** "Robot musun?" prompt fix — ~1 saat
7. **1 gün:** n8n UI sorununu çöz (versiyon upgrade?) — ~2 saat
8. **2 gün:** Dokümantasyonu güncelle (Supabase referanslarını temizle) — ~3 saat
9. **2 gün:** QA'yı tek sisteme indirge (LLM-as-judge resmi olsun) — ~2 saat
10. **2 gün:** Multi-turn test senaryoları + trend tracking — ~3 saat
11. **Kalan:** Simulate script temizliği, .bat silme, __pycache__ temizliği, commit edilmemiş dosyaları commit et

---

## 13. Satışa Çıkış Hazırlığı — Yeniden Değerlendirme

**v2: HAYIR — v3: HÂLÂ HAYIR ama daha yakın.**

| Kriter | v2 | v3 | Durum |
|--------|----|----|-------|
| E2E pipeline çalışıyor | ❌ | ✅ | **GELİŞME** |
| SQLite API auth var | ❌ | ❌ | Aynı |
| "Robot değilim" yalanı yok | ❌ | ❌ | Aynı |
| QA hedef (≥98) yakalanmış | ❌ | ❌ | Aynı |
| Otomatik DB yedeği var | ❌ | ❌ | Aynı |
| Tek persona/model | ❌ | ❌ | Aynı |

**Olumlu:** E2E test çalışıyor — bu büyük bir eşik. WF01/WF02 artık güvenilir şekilde çalışıyor.

**Olumsuz:** Çift DB sorunu (yeni bulgu) production'da data inconsistency yaratır. SQLite API auth yokluğu hâlâ ilk günkü kadar kritik.

**Tahmin:** 5 kritik P0 çözülürse ve 1 full QA koşusu ≥95 yakalarsa satışa hazır. Çift DB fix'i + auth middleware + tek persona = ~1-2 gün yoğun çalışma.

---

*Değerlendirme 4 Temmuz 2026, 02:00 UTC itibarıyla günceldir. n8n WF01/WF02 fix'leri ve E2E test başarısı bu versiyona yansıtılmıştır.*
