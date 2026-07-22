# Resepsiyonistim — Canlıya Alma Kılavuzu

## Gereksinimler

| # | Anahtar | Nereden Alınır? | Hedef |
|---|---------|-----------------|-------|
| 1 | **Coolify Bearer Token** | coolify.merman.sbs → Settings → Tokens | Container restart/deploy |
| 2 | **Evolution API apiKey** | evo.merman.sbs/manager (çalıştığında) | WhatsApp instance yönetimi |
| 3 | **n8n API Key** | n8n.merman.sbs → Settings → API Keys | Workflow yönetimi |
| 4 | **OpenRouter API Key** | https://openrouter.ai/keys | AI yanıtları (qwen/qwen3.7-plus) |

## Adım Adım Kurulum

### 1. Evolution API Container'ını Çalıştır
```bash
# Coolify'de rest API ile
curl -X POST "https://coolify.merman.sbs/api/v1/deploy?uuid=EVOLUTION_API_UUID&force=true" \
  -H "Authorization: Bearer COOLIFY_TOKEN"
```

### 2. WhatsApp Instance Oluştur
```bash
# Evolution API'de instance oluştur
curl -X POST "https://evo.merman.sbs/instance/create" \
  -H "apiKey: EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "resepsiyonistim-test", "qrcode": true}'

# Çıktıdaki QR kodu telefonla tara
```

### 3. Evolution API → n8n Webhook'u Bağla
```bash
curl -X POST "https://evo.merman.sbs/webhook/set/resepsiyonistim-test" \
  -H "apiKey: EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "https://n8n.merman.sbs/webhook/whatsapp-ai",
      "enabled": true,
      "events": ["MESSAGES_UPSERT"],
      "webhookByEvents": false,
      "webhookBase64": false
    }
  }'
```

### 4. n8n Workflow'u İçe Aktar
1. n8n.merman.sbs → Workflows → Add Workflow → Import from File
2. `docs/n8n-workflow-ai-pipeline.json` dosyasını seç
3. **ÖNEMLİ:** OpenRouter credential'ı oluştur:
   - Settings → Credentials → Add → HTTP Header Auth
   - Name: `OpenRouter AI`
   - Header Name: `Authorization`
   - Header Value: `Bearer OPENROUTER_API_KEY`
4. Workflow'daki HTTP Request node'unda credential'ı seç
5. Workflow'u **aktifleştir** (toggle)

### 5. Test
```bash
# n8n webhook'unu test et
curl -X POST "https://n8n.merman.sbs/webhook/whatsapp-ai" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "key": { "remoteJid": "905427450654@s.whatsapp.net" },
      "message": { "conversation": "Merhaba, bungalovunuzda boş yer var mı?" },
      "pushName": "Ahmet"
    }
  }'
```

### 6. WhatsApp'tan Canlı Test
Test numarası **905427450654**'e WhatsApp'tan mesaj at → AI yanıt vermeli.

## Mevcut Servis Durumu (22 Temmuz 2026)

| Servis | URL | Durum | 
|--------|-----|-------|
| Landing Page | https://resepsiyonistim.com | ✅ Çalışıyor (200) |
| Yönetim Paneli | https://panel.merman.sbs | 🔴 503 (Container down) |
| n8n | https://n8n.merman.sbs | ✅ Çalışıyor |
| Evolution API | https://evo.merman.sbs | 🔴 503 (Container down) |
| Coolify | https://coolify.merman.sbs | ✅ Çalışıyor |

## Test İşletmesi Bilgileri (AI için)

| Alan | Değer |
|------|-------|
| İşletme Adı | Doğa Bungalov |
| AI Persona Adı | Defne |
| Konum | Antalya / Kaş |
| Birim Tipleri | Bungalov (3 adet), Tiny House (2 adet) |
| Gecelik Fiyat | Bungalov 2.500₺, Tiny House 1.800₺ |
| Hizmetler | Kahvaltı (300₺/kişi), WIFI, Özel havuz, Otopark |
| Giriş/Çıkış | 14:00 / 11:00 |
| Kurallar | Evcil hayvan yok, sessiz saat 23:00-08:00 |
| Acil İletişim | 905427450654 (test hattı) |

## AI Prompt (Sistem Mesajı)

Aşağıdaki sistem prompt'u n8n workflow'una gömülüdür. Gerektiğinde güncellenebilir:

```markdown
Sen bir dijital resepsiyonistsin. Bir konaklama tesisinde çalışıyorsun.

KONUŞMA KURALLARI:
1. Kısa, doğal ve samimi cevap ver - bir resepsiyonist gibi konuş
2. Asla 'AI' veya 'yapay zeka' olduğunu belli etme
3. Rezervasyon taleplerini al, ama direkt onaylama - önce tarih ve kişi sayısını sor
4. Dil tespiti yap: Türkçe, İngilizce veya Arapça'ya geçiş yapabilirsin
5. Karmaşık sorularda yardımcı olamazsan özür dileyip yönlendir
6. Telefon numarası isteme - zaten WhatsApp'tan yazıyorlar
7. Fiyat bilgisi verirken güncel rakamları kullan
8. Misafirin adını kullanarak samimi bir ton yakala
```
