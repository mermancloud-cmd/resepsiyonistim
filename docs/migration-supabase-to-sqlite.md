# Supabase → SQLite Migration

**Tarih:** 30 Haziran 2026  
**Durum:** ✅ Tamamlandı

## Neden?

Supabase `SERVICE_ROLE_KEY` env var'ında `...` karakter kesintisi oluştu. Tüm Supabase node'ları (WF02, WF03, WF06, WF07) sessizce hatalıydı. Düzeltmek mümkün olmadığı için **local SQLite** çözümüne geçildi.

## Mimari

```
┌─────────────────────────────────────────────────────┐
│                   n8n Workflow'ları                  │
│  WF01 WF02 WF03 WF04 WF05 WF06 WF07 WF08 ...        │
└──────────┬──────────────────┬───────────────────────┘
           │ HTTP              │ HTTP
           ▼                   ▼
┌──────────────────┐   ┌──────────────┐
│   Supabase (❌)   │   │  bungalov-db │ ← YENİ
│   xzmakpsong...   │   │  SQLite API  │
└──────────────────┘   └──────┬───────┘
                              │
                     ┌────────▼────────┐
                     │  /data/bungalov.db │
                     │  (SQLite WAL)   │
                     └─────────────────┘
```

## Yapılan Değişiklikler

### 1. SQLite REST API (main.py)
- **Dosya:** `sqlite-service/main.py`
- **Versiyon:** 2.0.0
- **Değişim:** Per-table route'lardan **dinamik generic routing**'e geçildi
- 1045 satır → 532 satır (`.py`)
- Tüm Supabase tabloları birebir eşleşen schema ile oluşturuldu
- **12 tablo:** conversations, reservations, rooms, bungalows, webhook_failures, tenants, room_pricing, faqs, tenant_settings, notification_logs, owner_settings, otp_codes
- **Endpoint'ler:** GET (list/single), POST, PATCH (batch/single), DELETE (batch/single)
- **Özel admin endpoint'leri:** `/health`, `/admin/tables`, `/admin/db-stats`, `/admin/import-all`
- **Supabase uyumlu filtreleme:** eq, neq, gt, gte, lt, lte, like, ilike, in
- **Kilitlenme koruması:** `busy_timeout=10000`, `timeout=30`
- **Migration desteği:** `migrate_schema()` eski tablolara otomatik kolon ekler

### 2. n8n Workflow Güncellemeleri
- **WF02 (State+AI):** Supabase URL → `http://bungalov-db:8000/rest/v1`
- **WF03 (Reservation):** Supabase URL → `http://bungalov-db:8000/rest/v1`
- **WF06 (Telegram Notifications):** Supabase URL → `http://bungalov-db:8000/rest/v1`
- `supabaseApi` credential kullanımı kaldırıldı → direct HTTP (no auth)
- `this.helpers.httpRequestWithAuthentication` → `this.helpers.httpRequest`
- Tüm workflow'lar **aktif** durumda

### 3. Veri Taşıma
- 1115 satır Supabase → SQLite (0 hata)
- Tenants: 8, Bungalows: 3, Rooms: 14, Room_Pricing: 16
- FAQs: 30, Tenant_Settings: 8, Reservations: 4
- **Conversations: 1000**, Webhook_Failures: 54

## Container Bilgileri

| Servis | URL | Dahili Port |
|--------|-----|------------|
| bungalov-db | `https://bungalov-db.merman.sbs` | 8000 |
| n8n (Dahili) | `http://bungalov-db:8000` | 8000 |

## Workflow URL Dönüşümü

```
ESKİ: https://xzmakpsongrcbnrpdvsy.supabase.co/rest/v1/{table}
YENİ: http://bungalov-db:8000/rest/v1/{table}
```

## Gelecek İyileştirmeler

- [ ] DELETE endpoint testleri
- [ ] Connection pooling (şu an her request yeni connection)
- [ ] Rate limiting ekle
- [ ] Read-only replica için salt okunur mod
