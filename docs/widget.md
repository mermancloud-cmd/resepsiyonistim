# Web Widget Entegrasyon Kılavuzu

Web sitenize 3 adımda sohbet widget'ı ekleyin.

## 1. Embed Kodunu Kopyalayın

Panele gidin: **Ayarlar → Web Widget Ayarları** → Embed Kodu bölümünden kodu kopyalayın.

Standart kod:

```html
<script src="https://panel.merman.sbs/widget.js" data-business-name="İşletmeniz" data-whatsapp-number="905427450654" defer></script>
```

## 2. Web Sitenize Ekleyin

Kodu web sitenizin `<head>` veya `</body>` kapanış etiketinden önce ekleyin.

### WordPress

1. **Görünüm → Tema Düzenleyici** veya **Görünüm → Widget'lar**
2. head bölümüne `<script>` etiketini yapıştırın
3. Alternatif: **Eklentiler → Yeni Ekle** → "Header Footer Code" benzeri bir eklenti kurun

### Wix

1. **Ayarlar → Özel Kod** (Custom Code)
2. **Kod Ekle** → `<script>` etiketini yapıştırın
3. **Tüm Sayfalarda Yükle** seçeneğini işaretleyin

### Squarespace

1. **Ayarlar → Gelişmiş → Kod Enjeksiyonu**
2. **Header** kısmına `<script>` etiketini yapıştırın

### Doğrudan HTML

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Diğer head etiketleri... -->
  <script src="https://panel.merman.sbs/widget.js" data-business-name="Merman Bungalov" data-whatsapp-number="905427450654" defer></script>
</head>
<body>
  <!-- Sayfa içeriğiniz -->
</body>
</html>
```

## 3. Özelleştirme

Widget'ı `data-*` attribute'ları ile özelleştirebilirsiniz:

| Attribute | Açıklama | Varsayılan |
|-----------|----------|------------|
| `data-business-name` | İşletme adı (widget başlığında görünür) | "İşletme" |
| `data-whatsapp-number` | WhatsApp numarası (başında `+` olmadan) | "905427450654" |
| `data-primary` | Ana renk (hex) | `#0f766e` |
| `data-position` | Pozisyon: `right` veya `left` | `right` |
| `data-greeting` | Karşılama mesajı | "Merhaba! Size nasıl yardımcı olabilirim?" |
| `data-placeholder` | Mesaj girdisi placeholder | "Mesajınızı yazın..." |
| `data-theme` | Tema: `light`, `dark` veya `auto` | `auto` |
| `data-logo` | Logo URL'si (yuvarlak kırpılır) | (yok) |
| `data-whatsapp-message` | Ön tanımlı WhatsApp mesajı | "Merhaba, rezervasyon hakkında bilgi almak istiyorum." |

### Örnek (tüm özelleştirmelerle)

```html
<script src="https://panel.merman.sbs/widget.js"
  data-business-name="Merman Bungalov"
  data-whatsapp-number="905427450654"
  data-primary="#059669"
  data-position="left"
  data-greeting="Merhaba! Rezervasyon için buradayız."
  data-theme="light"
  data-logo="https://siteniz.com/logo.png"
  defer></script>
```

### Programatik Kullanım

Sayfa yüklendikten sonra JavaScript ile başlatmak için:

```html
<script src="https://panel.merman.sbs/widget.js" defer></script>
<script>
  // DOM hazır olduğunda widget'ı başlat
  document.addEventListener('DOMContentLoaded', function() {
    BungalowWidget.init({
      businessName: 'Merman Bungalov',
      whatsappNumber: '905427450654',
      primary: '#0f766e',
      greeting: 'Merhaba! Size nasıl yardımcı olabilirim?',
      theme: 'auto',
    });
  });
</script>
```

> **Not:** `BungalowWidget.init()` çağrıldığında, `data-*` attribute'ları ile yapılan otomatik başlatma devre dışı kalır.

## Nasıl Çalışır

Widget bir **iframe** içinde çalışır, yani web sitenizin CSS veya JavaScript'i ile etkileşime girmez. Tamamen izole bir ortamda çalışarak sitenizin performansını veya güvenliğini etkilemez.

- Kullanıcı mesaj yazdığında **WhatsApp** üzerinden işletmenize yönlendirilir
- Widget ayarlarını panel üzerinden istediğiniz zaman değiştirebilirsiniz
- Mobil uyumludur, tüm ekran boyutlarında çalışır
