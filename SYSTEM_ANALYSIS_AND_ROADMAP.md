# 🎯 GSB ENGINE - SİSTEM ANALİZİ VE SHOPIFY STANDARTLARI ROADMAP

**Tarih:** 2025-10-31
**Durum:** Editor açılıyor ama yapı istikrarsız
**Hedef:** Shopify resmi standartlarıyla uyumlu, production-ready sistem

---

## ✅ ÇALIŞAN SİSTEMLER (Bugün Tamamlanan)

### 1. **Sunucu Infrastructure** ✅
- Ubuntu 24 Server
- Node.js 22.21.0
- PostgreSQL 16 (Docker)
- PM2 (auto-restart)
- Caddy (HTTPS/SSL)
- Domain: app.gsb-engine.dev

### 2. **Backend API'ler** ✅
- Express + Prisma
- Shopify OAuth (credentials kaydediliyor)
- Session management
- `/api/catalog` - GSB products
- `/api/merchant/config/catalog/mappings` - Variant mapping
- `/api/embed/shortcodes` - Shortcode lookup
- `/api/embed/catalog/mappings` - Public mapping API
- `/api/shopify/products` - Shopify product sync

### 3. **Merchant Panel** ✅
- Shopify embedded app çalışıyor
- Session ~2.5 saniyede kuruluyor
- Lucide SVG icons
- Catalog & Surfaces sayfası çalışıyor
- Variant mapping UI aktif
- Products menüsü var

### 4. **Variant Mapping Akışı** ⚠️ (Çalışıyor ama iyileştirme gerek)
- Shopify variant'lar çekiliyor
- GSB product/surface eşlemesi yapılıyor
- Otomatik kayıt çalışıyor
- Database'e kaydediliyor

### 5. **Customer Tarafı** ⚠️ (Workaround ile çalışıyor)
- Custom Liquid ile buton eklendi
- Inline JavaScript ile mapping fetch ediliyor
- Editor açılıyor (public access bypass)
- **SORUN:** Theme app extension deploy edilmedi

---

## ❌ SORUNLAR VE WORKAROUND'LAR

### **1. Theme App Extension Deploy Edilmedi** 🔴 KRİTİK

**Mevcut Durum:**
- Extension dosyaları hazır: `extensions/gsb-embed/`
- Shopify'a deploy edilmedi
- Custom Liquid block ile workaround yapıldı

**Shopify Standardı:**
```bash
shopify app deploy
```

**Ne Yapılmalı:**
1. `shopify.app.toml` güncel mi kontrol et
2. `shopify app deploy` komutu çalıştır
3. Shopify Partner Dashboard'da extension'ı onayla
4. Theme editor'da "Gang Sheet Builder" block görünecek

---

### **2. Shopify App Proxy Yok** 🔴 KRİTİK

**Mevcut Durum:**
- Editor direct URL: `https://app.gsb-engine.dev/editor`
- Script direct URL: `https://app.gsb-engine.dev/gsb-shortcode.js`
- CORS sorunları olabilir
- Session sharing zor

**Shopify Standardı:**
```
Customer storefront → /apps/gsb-engine/editor
                   ↓
Shopify Proxy     → https://app.gsb-engine.dev/api/proxy/editor
                   ↓
Backend handles request
```

**shopify.app.toml'de Ekle:**
```toml
[app_proxy]
url = "https://app.gsb-engine.dev/api/proxy"
subpath = "gsb-engine"
prefix = "apps"
```

**Backend'de Proxy Route:**
```typescript
// server/src/routes/proxy.ts
proxyRouter.all("/*", async (req, res) => {
  // Handle proxied requests from Shopify storefront
  // Can access shop, customer, cart data from Shopify
});
```

---

### **3. Product Metafield Kullanılmıyor** 🟡 ORTA

**Mevcut Durum:**
- Mapping sadece database'de
- Shopify product'ta metafield yok
- Theme Liquid'de metafield okuyamıyor

**Shopify Standardı:**
```javascript
// Mapping kaydedilirken:
await shopifyAdmin.graphql(`
  mutation {
    productUpdate(input: {
      id: "${productGid}",
      metafields: [{
        namespace: "gsb",
        key: "customizable",
        value: "true",
        type: "boolean"
      }]
    }) {
      product { id }
    }
  }
`);
```

**Liquid'de Kullan:**
```liquid
{% if product.metafields.gsb.customizable %}
  <!-- Show customize button -->
{% endif %}
```

---

### **4. Editor Public Access - Workaround** 🟡 ORTA

**Mevcut Durum:**
- Router guard bypass edildi
- Auth middleware skip ediliyor
- Catalog manuel fetch ediliyor
- Autosave kapatıldı

**Doğru Yöntem:**
- Editor için **anonymous session** oluştur
- LocalStorage'da `designId` sakla
- Checkout'ta design'ı kaydet
- Order'a linkle

**Veya:**
- Shopify Customer Account API kullan
- Customer login olunca design'ı customer'a bağla

---

### **5. Session Token Sorunları** 🟡 ORTA

**Mevcut Durum:**
- Her deploy sonrası token'lar expire oluyor
- JWT_SECRET .env'den değişiyor olabilir
- Customer'da session yok

**Çözüm:**
```bash
# .env'de sabit tut
JWT_SECRET=<sabit-değer-buraya>
```

---

## 🎯 SHOPIFY STANDARTLARINA UYGUN ROADMAP

### **FAZ 1: Extension Deploy** (30 dakika)

**Adımlar:**
1. `shopify.app.toml` kontrol et
2. `shopify app deploy` çalıştır
3. Shopify Partner'da onayla
4. Theme editor'da test et

**Sonuç:**
- ✅ Custom Liquid gereksiz olacak
- ✅ Extension block theme'de çalışacak
- ✅ Resmi Shopify yöntemi

---

### **FAZ 2: App Proxy Kurulumu** (1 saat)

**Adımlar:**
1. `shopify.app.toml`'e proxy config ekle
2. Backend'de `/api/proxy/*` route'ları ekle
3. Editor URL'i `/apps/gsb-engine/editor` yap
4. Script URL'i `/apps/gsb-engine/script.js` yap

**Sonuç:**
- ✅ CORS sorunu olmaz
- ✅ Shopify session erişimi
- ✅ Customer data erişimi

---

### **FAZ 3: Metafield Integration** (1 saat)

**Adımlar:**
1. Mapping kaydederken Shopify metafield güncelle
2. Theme Liquid'de metafield oku
3. Conditional rendering (sadece customizable ürünlerde buton)

**Sonuç:**
- ✅ Mapping Shopify'da da saklanır
- ✅ Theme bağımsız çalışır
- ✅ Yedekleme mekanizması

---

### **FAZ 4: Customer Session Management** (2 saat)

**Adımlar:**
1. Anonymous design için UUID oluştur
2. LocalStorage'da sakla
3. Checkout'ta backend'e gönder
4. Order'a linkle

**Sonuç:**
- ✅ Customer tasarımı kaybetmez
- ✅ Merchant design'ı görebilir
- ✅ Production tracking

---

## 🚨 ACİL YAPILMASI GEREKENLER

### **ŞİMDİ (Bugün):**

1. **Extension Deploy** → Custom Liquid kaldır
2. **JWT_SECRET Sabitle** → Token expire sorunu çöz
3. **Editor Product Loading Fix** → Canvas Poster düzgün yüklensin

### **Yarın:**

4. **App Proxy** → Resmi Shopify routing
5. **Metafield** → Mapping'i Shopify'a da yaz

### **Bu Hafta:**

6. **Customer Session** → Design tracking
7. **Order Integration** → Checkout akışı
8. **Test & QA** → End-to-end test

---

## 💡 ÖNERİM

**Şimdi 3 seçenek:**

**A) Extension Deploy Et** (30 dk - Hızlı kazanç)
- `shopify app deploy`
- Custom Liquid'den kurtar
- Resmi yöntem

**B) Editor'ü Düzelt** (1 saat - Mevcut akışı tamamla)
- Canvas Poster yüklensin
- Customer tasarım yapabilsin
- Checkout'a gönderebilsin

**C) Derin Refactor** (1 gün - Temiz mimari)
- App Proxy
- Metafield
- Session Management
- Production-ready

**HANGİSİNİ YAPALIM?**

Ben **SEÇENEK B** öneriyorum - önce mevcut akış çalışsın, sonra refactor ederiz! 🎯

