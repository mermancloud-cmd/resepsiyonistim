# Site İçi Sohbet Widgeti

Web sitenize ekleyebileceğiniz, misafirlerin size doğrudan mesaj göndermesini sağlayan sohbet widgeti.

---

## 1. Embed Kodu

Widget'ı web sitenize eklemek için aşağıdaki `<script>` etiketini sayfanızın `</body>` etiketinden hemen önce yapıştırın:

```html
<script
  src="https://panel.merman.sbs/widget-embed.js"
  data-tenant="TENANT_UUID"
  data-color="0f766e"
  data-position="right"
  data-greeting="Merhaba! Size nasıl yardımcı olabilirim?"
  data-name="Bungalov Adı"
  data-logo=""
  defer
></script>
```

Bu kodu ayarlar sayfasından (Ayarlar > Site İçi Sohbet Widgeti) otomatik oluşturabilirsiniz.

---

## 2. Yapılandırma Parametreleri

| Parametre | Zorunlu | Varsayılan | Açıklama |
|-----------|---------|------------|----------|
| `data-tenant` | **Evet** | — | Tenant UUID (panelinizden alabilirsiniz) |
| `data-color` | Hayır | `0f766e` | Ana renk (hex, `#` işareti olmadan) |
| `data-position` | Hayır | `right` | Widget konumu (`right` veya `left`) |
| `data-greeting` | Hayır | `"Merhaba! Size nasıl yardımcı olabilirim?"` | Karşılama mesajı |
| `data-name` | Hayır | `"Bungalov"` | Sohbette görünecek işletme adı |
| `data-logo` | Hayır | — | Sohbet başlığında gösterilecek logo URL'si |

---

## 3. Nasıl Çalışır?

1. **Ziyaretçi**, web sitenizde sağ alt köşedeki sohbet butonuna tıklar.
2. **Form** açılır: ziyaretçi adını, telefon numarasını ve isteğe bağlı mesajını girer.
3. **Gönder** butonuna basınca, sistemde yeni bir `conversation` oluşturulur ve ilk mesaj kaydedilir.
4. **Siz veya AI asistanınız**, paneldeki Aktif Sohbetler sayfasından bu konuşmayı görebilir ve yanıtlayabilirsiniz.
5. **Ziyaretçiye**, mesajının alındığına dair bir onay gösterilir.

---

## Gelişmiş: Doğrudan iframe Kullanımı

Widget'ı doğrudan iframe olarak da kullanabilirsiniz:

```html
<iframe
  src="https://panel.merman.sbs/widget/embed?tenant=TENANT_UUID&color=0f766e&position=right"
  width="0"
  height="0"
  frameborder="0"
  style="position:fixed;bottom:0;right:0;z-index:999999;border:none;overflow:hidden;"
  title="Bungalov Sohbet"
></iframe>
```

**Not:** Statik export modunda iframe yöntemi önerilir. API tabanlı script yöntemi yalnızca standalone (Node.js) deployment'da çalışır.

---

## Teknik Detaylar

- Widget, ziyaretçinin tarayıcısından doğrudan Supabase'e bağlanır (anon key ile).
- Conversation ve message oluşturma yetkisi, Supabase RLS politikalarıyla korunur.
- Güvenlik için tenant_id her kayıtta otomatik eklenir.
- Mesaj iletildikten sonra AI asistanı otomatik olarak yanıt verebilir.
- iframe boyutlandırması `postMessage` API'si ile yönetilir.
