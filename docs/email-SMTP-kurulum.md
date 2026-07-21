# E-posta / SMTP Kurulum ve Optimizasyon Kılavuzu

**Proje:** Resepsiyonistim  
**Domain:** resepsiyonistim.com  
**Güncelleme:** 21 Temmuz 2026

---

## 1. Mevcut Durum Analizi

| Bileşen | Durum | Detay |
|---------|-------|-------|
| **Domain MX** | ✅ Hostinger | mx1.hostinger.com (priority 5), mx2.hostinger.com (priority 10) |
| **SPF Kaydı** | ⚠️ Sadece Hostinger | `v=spf1 include:_spf.mail.hostinger.com ~all` |
| **DKIM** | ❌ Yok | Eklenmeli |
| **DMARC** | ❌ Yok | Eklenmeli |
| **Supabase Auth SMTP** | ❌ Built-in | Custom SMTP yapılandırılmamış |
| **n8n Email Node** | ❌ Yapılandırılmamış | n8n çalışıyor ama email node ayarlı değil |

**Etkisi:** Supabase built-in SMTP kısıtlı rate limit'e sahiptir, e-postalar spam klasörüne düşebilir. Custom SMTP ile:
- `noreply@resepsiyonistim.com` adresinden gönderim
- Çok daha yüksek teslim edilebilirlik (deliverability)
- Kendi gönderim limitlerinizi kontrol etme
- Profesyonel marka imajı

---

## 2. DNS Kayıt Güncellemeleri

Hostinger DNS panelinde aşağıdaki kayıtları ekleyin/güncelleyin.

### 2.1 SPF Kaydı Güncelleme

**Mevcut:** `v=spf1 include:_spf.mail.hostinger.com ~all`

**Yeni:** Hostinger + Supabase email gönderimi için:
```
v=spf1 include:_spf.mail.hostinger.com include:supabase.com ~all
```

SPF kaydı **TXT** kaydı olarak eklenir. Hostinger panelinde:
- **Tür:** TXT
- **Ad:** `@` (veya boş)
- **Değer:** `v=spf1 include:_spf.mail.hostinger.com include:supabase.com ~all`
- **TTL:** 3600 (1 saat) veya 14400 (4 saat)

> **Not:** Eğer Resend kullanırsanız: `include:_spf.resend.com`  
> Eğer SendGrid kullanırsanız: `include:sendgrid.net`

### 2.2 DKIM Kaydı

DKIM, e-postaların taklit edilmesini önler. Supabase custom SMTP için DKIM ayarları, SMTP sağlayıcınıza göre değişir.

**Hostinger SMTP için DKIM:**
Hostinger panelinde:
1. Hostinger → E-posta → DKIM ayarları
2. DKIM'i aktifleştirin
3. Hostinger otomatik olarak DKIM kaydını ekler

**Resend için DKIM:**
Resend Dashboard → Domains → resepsiyonistim.com → Verify
Size verilen CNAME/DKIM kaydını Hostinger DNS'e ekleyin.

### 2.3 DMARC Kaydı

DMARC, SPF ve DKIM'in birlikte çalışmasını sağlar. **Önce SPF ve DKIM çalışır hale gelmeli.**

```
_dmarc.resepsiyonistim.com.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@resepsiyonistim.com; pct=100"
```

- **Tür:** TXT
- **Ad:** `_dmarc`
- **Değer:** `v=DMARC1; p=none; rua=mailto:dmarc@resepsiyonistim.com; pct=100`
- **TTL:** 3600

**Aşamalı DMARC:**
1. **Hafta 1-2:** `p=none` (sadece izleme, engelleme yok)
2. **Hafta 3-4:** `p=quarantine` (spam, problemli e-postaları karantina)
3. **1. Ay sonra:** `p=reject` (başarısız e-postaları tamamen reddet)

---

## 3. Supabase Custom SMTP Kurulumu

### Adım Adım

1. **Supabase Dashboard'a girin:** https://supabase.com/dashboard/project/xzmakpsongrcbnrpdvsy
2. **Authentication** → **Settings** → **SMTP Settings** bölümüne gidin
3. **Enable Custom SMTP** butonuna tıklayın
4. Aşağıdaki bilgileri girin:

#### Seçenek A: Hostinger SMTP (Mevcut hosting)

| Alan | Değer |
|------|-------|
| **SMTP Host** | `smtp.hostinger.com` |
| **SMTP Port** | `465` (SSL) veya `587` (TLS) |
| **SMTP Username** | Hostinger e-posta adresiniz (örn: `noreply@resepsiyonistim.com`) |
| **SMTP Password** | Hostinger e-posta şifreniz |
| **Sender Email** | `noreply@resepsiyonistim.com` |
| **Sender Name** | `Resepsiyonistim` |

#### Seçenek B: Resend (Önerilen - en iyi deliverability)

Resend modern, yüksek deliverability'li bir e-posta API servisidir.

1. **Kayıt:** https://resend.com → "Start for Free"
2. **Domain doğrulama:** resepsiyonistim.com domain'inizi ekleyin
3. **DNS kayıtlarını ekleyin:** Resend'in verdiği DKIM CNAME kaydını Hostinger DNS'e ekleyin
4. **API Key alın:** Resend Dashboard → API Keys
5. **SMTP bilgileri:**

| Alan | Değer |
|------|-------|
| **SMTP Host** | `smtp.resend.com` |
| **SMTP Port** | `465` (SSL) veya `587` (TLS) |
| **SMTP Username** | `resend` |
| **SMTP Password** | Resend API Key |
| **Sender Email** | `noreply@resepsiyonistim.com` |
| **Sender Name** | `Resepsiyonistim` |

5. **"Save"** butonuna tıklayın
6. **Test:** "Send Test Email" ile test e-postası gönderin

### Önemli Supabase Auth Ayarları

Supabase Dashboard → Authentication → Settings:

| Ayar | Değer |
|------|-------|
| **Site URL** | `https://resepsiyonistim.com` |
| **Redirect URLs** | `https://resepsiyonistim.com/verify.html`, `https://resepsiyonistim.com/reset-password.html` |
| **Enable email confirmations** | Closed (manuel satış için) veya Open (self-servis için) |

---

## 4. n8n Email Workflow Kurulumu

Transactional e-postalar (hoş geldin, bildirim, fatura) için n8n email node'u kullanılabilir.

### n8n'de SMTP Credential Ekleme

1. **n8n Dashboard:** https://n8n.merman.sbs
2. **Settings** → **Credentials** → **Add** → **SMTP**
3. Bilgileri girin:

| Alan | Değer |
|------|-------|
| **Name** | `Resepsiyonistim SMTP` |
| **Host** | `smtp.hostinger.com` (veya smtp.resend.com) |
| **Port** | `465` |
| **SSL/TLS** | true |
| **User** | `noreply@resepsiyonistim.com` |
| **Password** | SMTP şifresi |

### Hoş Geldiniz E-postası Workflow'u

`docs/n8n-email-workflow.json` dosyasında hazır workflow template'i bulunur.

**Workflow akışı:**
1. **Webhook trigger** → Supabase'den yeni kayıt bildirimi gelir
2. **Set** → E-posta içeriğini hazırla
3. **SMTP node** → E-postayı gönder
4. **Supabase node** → Gönderim durumunu logla

### n8n'e Workflow Import

1. n8n Dashboard → Workflows → **Add Workflow** → **Import from File**
2. `docs/n8n-email-workflow.json` dosyasını seçin
3. SMTP credential'ı bağlayın
4. **Activate** butonuna tıklayın

---

## 5. Test ve Doğrulama

### DNS Kayıtları Testi
```bash
# MX sorgula
nslookup -type=mx resepsiyonistim.com

# SPF sorgula
nslookup -type=txt resepsiyonistim.com

# DMARC sorgula
nslookup -type=txt _dmarc.resepsiyonistim.com
```

### E-posta Teslim Edilebilirlik Testi
1. https://www.mail-tester.com adresine test e-postası gönderin
2. https://deliverability.test Google Postmaster Tools
3. Supabase Dashboard'dan "Send Test Email" butonu

### n8n Workflow Testi
1. n8n'de workflow'u açın
2. **Execute Workflow** butonuna tıklayın
3. E-postanın ulaştığını kontrol edin

---

## 6. Özet: Yapılacaklar Listesi

| # | İşlem | Nerede | Süre |
|---|-------|--------|------|
| 1 | Hostinger'da `noreply@resepsiyonistim.com` e-posta adresi oluştur | Hostinger Panel | 5 dk |
| 2 | SPF kaydını güncelle (`include:supabase.com` ekle) | Hostinger DNS | 2 dk |
| 3 | DMARC kaydı ekle (`p=none`) | Hostinger DNS | 2 dk |
| 4 | Supabase SMTP ayarlarını yap (Hostinger veya Resend) | Supabase Dashboard | 5 dk |
| 5 | Test e-postası gönder | Supabase Dashboard | 1 dk |
| 6 | n8n SMTP credential ekle | n8n Dashboard | 2 dk |
| 7 | n8n "Hoş Geldiniz" workflow'unu import et ve aktifleştir | n8n Dashboard | 5 dk |
| 8 | Mail-tester ile deliverability testi | mail-tester.com | 5 dk |

**Toplam: ~25 dakika**

---

## 7. Sık Sorulanlar

**S: Neden custom SMTP gerekli?**  
C: Supabase built-in SMTP'nin rate limiti düşüktür ve e-postalar spam klasörüne düşebilir. Custom SMTP ile markanıza ait adresten (noreply@resepsiyonistim.com) yüksek deliverability ile gönderim yaparsınız.

**S: Hostinger mı Resend mi?**  
C: Hostinger mevcut ve ücretsiz (zaten hosting paketiniz var). Resend daha yüksek deliverability ve developer experience sunar. Başlangıç için Hostinger yeterlidir, sonra Resend'e geçebilirsiniz.

**S: DMARC'ı neden p=none ile başlatıyoruz?**  
C: p=none engelleme yapmaz, sadece raporlar. Bu sayede SPF/DKIM'de hata varsa e-postalarınız engellenmez. 1-2 hafta sonra p=quarantine'e geçebilirsiniz.

**S: Bu değişiklikler ne zaman etki eder?**  
C: DNS değişiklikleri 1-48 saat içinde yayılır. SMTP değişiklikleri anında etki eder.
