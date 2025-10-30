# 🎯 SORUN LOKASYONU ANALİZİ

## 📍 Sorun Hangi Sayfada?

### Ana Layout Dosyası
**Dosya:** `src/layouts/shopify-embedded.vue`
**Satır:** 738-740

```vue
onMounted(() => {
  bootstrapAppBridge();
});
```

**Bu layout kullanılan tüm sayfalar:**

1. ✅ **Entry Point:**
   - `src/pages/shopify/embedded/index.vue` (Satır 8: `layout: "shopify-embedded"`)
   - Bu sayfa `/shopify/embedded` route'una girdiğinizde yükleniyor
   - `onMounted` içinde dashboard'a redirect yapıyor (Satır 18-23)

2. ✅ **Dashboard:**
   - `src/pages/shopify/embedded/dashboard.vue`
   - Ana dashboard sayfası

3. ✅ **Tüm Shopify Embedded Sayfaları (30+ sayfa):**
   - `src/pages/shopify/embedded/catalog.vue`
   - `src/pages/shopify/embedded/orders.vue`
   - `src/pages/shopify/embedded/designs.vue`
   - `src/pages/shopify/embedded/templates.vue`
   - ... ve 26 sayfa daha

## 🔍 Sorunun Akışı

### 1. Sayfa Yüklenir
```
URL: https://app.gsb-engine.dev/shopify/embedded?shop=xxx&host=xxx
↓
Router: /shopify/embedded route'u bulunur
↓
Sayfa: src/pages/shopify/embedded/index.vue yüklenir
↓
Layout: MetaLayouts plugin otomatik olarak "shopify-embedded" layout'unu yükler
```

### 2. Layout Mount Olur
```
src/layouts/shopify-embedded.vue
↓
onMounted() çalışır (Satır 738)
↓
bootstrapAppBridge() çağrılır (Satır 739)
```

### 3. BootstrapAppBridge Fonksiyonu
```
bootstrapAppBridge() başlar (Satır 472)
↓
1. API Key kontrolü (Satır 479-483)
2. Host parametresi kontrolü (Satır 485-489)
3. Iframe kontrolü (Satır 491-503)
4. ensureAppBridgeAssets() (Satır 506)
5. Gem window.shopify bekle (Satır 511-522)
6. shopify.ready() bekle (Satır 530-545)
7. shopify.idToken() çağır (Satır 564-570)
```

## ⚠️ Potansiyel Sorun Noktaları

### Sorun 1: `bootstrapAppBridge()` hiç çağrılmıyor olabilir
- **Kontrol:** Browser console'da `[shopify-layout] 🚀 Starting App Bridge bootstrap...` logu var mı?
- **Çözüm:** Layout'un mount olduğunu doğrula

### Sorun 2: `window.shopify` hiç gelmiyor
- **Kontrol:** Console'da `[shopify-layout] ⏳ Waiting for window.shopify global...` sonrası log var mı?
- **Çözüm:** App Bridge script'in yüklendiğini kontrol et

### Sorun 3: `idToken()` timeout oluyor
- **Kontrol:** `[shopify-layout] 🔑 Calling shopify.idToken()...` sonrası 15 saniye bekliyor mu?
- **Çözüm:** Host parametresi ve meta tag kontrolü

## 📝 Test Komutu

Browser console'da şunu çalıştırın:

```javascript
// 1. Layout yüklendi mi?
console.log('Layout mounted:', document.querySelector('.embedded-frame') !== null);

// 2. App Bridge script yüklendi mi?
console.log('App Bridge script:', document.querySelector('script[src*="app-bridge.js"]') !== null);

// 3. Meta tag var mı?
console.log('Meta tag:', document.querySelector('meta[name="shopify-api-key"]')?.content);

// 4. window.shopify var mı?
console.log('window.shopify:', typeof window.shopify !== 'undefined');
console.log('window.shopify.idToken:', typeof window.shopify?.idToken === 'function');

// 5. Host parametresi var mı?
console.log('URL host param:', new URLSearchParams(window.location.search).get('host'));
console.log('Route query host:', window.location.pathname.includes('/shopify/embedded'));

// 6. bootstrapAppBridge çağrıldı mı?
console.log('Check logs for [shopify-layout] messages');
```

## 🎯 Sorunun Kesin Lokasyonu

**SORUN:** `src/layouts/shopify-embedded.vue` dosyasında:
- **Satır 512:** Syntax hatası (düzeltildi)
- **Satır 472-588:** `bootstrapAppBridge()` fonksiyonu
- **Satır 738-740:** `onMounted()` hook - bu çalışıyor mu?

**KONTROL ET:**
1. Browser console'da `[shopify-layout]` logları görünüyor mu?
2. `bootstrapAppBridge()` çağrılıyor mu?
3. `window.shopify` 10 saniye içinde geliyor mu?

