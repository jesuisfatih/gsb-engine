# 🔍 KOD ANALİZ RAPORU - Shopify Embedded App Sorunu

## 📊 Tespit Edilen Sorunlar

### ❌ **KRİTİK SORUN #1: TypeScript Type Tanımı Eksik**

**Dosya:** `env.d.ts` (Satır 8)
```typescript
layout?: 'blank' | 'default'
```

**SORUN:** `shopify-embedded` layout'u type tanımında yok!

**ETKİ:** TypeScript layout'u tanımıyor, bu da runtime'da sorun yaratabilir.

---

### ❌ **KRİTİK SORUN #2: Layout Mount Olmuyor**

**Console Log Analizi:**
- ✅ App Bridge script HTML'de mevcut (sunucu HTML'inde görüldü)
- ❌ Browser'da `.embedded-frame` elementi **YOK**
- ❌ `window.shopify` **undefined**
- ❌ `[shopify-layout]` logları **YOK** (onMounted hiç çalışmıyor)

**SONUÇ:** `shopify-embedded.vue` layout component'i hiç mount olmamış!

---

### ❌ **KRİTİK SORUN #3: Route Meta Layout Uyumsuzluğu**

**Sayfalar:**
- `src/pages/shopify/embedded/index.vue` → `layout: "shopify-embedded"` ✅
- `src/pages/shopify/embedded/dashboard.vue` → `layout: "shopify-embedded"` ✅

**Type Definition:**
- `env.d.ts` → `layout?: 'blank' | 'default'` ❌ (shopify-embedded YOK)

**Plugin Config:**
- `vite.config.ts` → `MetaLayouts({ target: './src/layouts', defaultLayout: 'default' })` ✅

**SONUÇ:** Plugin layout dosyasını görebilir ama TypeScript type check'te hata olabilir.

---

### ❌ **KRİTİK SORUN #4: App Bridge Script Timing**

**Sunucu HTML Çıktısı:**
```html
<!-- ✅ DOĞRU: Script head'de ilk sırada -->
<meta name="shopify-api-key" content="fe2fa282862645ed90c6538ddf50f0e4" />
<script type="text/javascript" src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

**Browser Console:**
- ❌ `App Bridge script: false` → Script DOM'da bulunamıyor

**OLASILIK:** 
1. Script yükleniyor ama layout mount olmadan önce kontrol ediliyor
2. Script yüklense bile `window.shopify` henüz initialize olmamış

---

## 🔄 Mevcut Kod Akışı

### 1. Route Yükleme
```
URL: /shopify/embedded?shop=xxx&host=xxx
↓
Router: unplugin-vue-router otomatik route oluşturuyor
↓
Page: src/pages/shopify/embedded/index.vue
↓
Meta: { layout: "shopify-embedded" }
```

### 2. Layout Yükleme (TEORİK)
```
MetaLayouts Plugin: setupLayouts([route])
↓
Layout Component: src/layouts/shopify-embedded.vue
↓
onMounted(): bootstrapAppBridge() çağrılmalı
```

### 3. App Bridge Bootstrap (ÇALIŞMIYOR)
```
bootstrapAppBridge() → ensureAppBridgeAssets()
↓
window.shopify bekleniyor (10 saniye)
↓
window.shopify.idToken() çağrılıyor
```

---

## 🎯 SORUNUN KÖK NEDENİ ANALİZİ

### Senaryo A: Layout Hiç Mount Olmuyor ❌ (EN OLASI)

**Göstergeler Department:**
- `.embedded-frame` yok
- `[shopify-layout]` logları yok
- `bootstrapAppBridge()` hiç çalışmıyor

**Olası Nedenler:**
1. **TypeScript type mismatch:** `env.d.ts`'de `shopify-embedded` yok
2. **MetaLayouts plugin hatası:** Layout'u bulamıyor veya yükleyemiyor
3. **Route guard engelleme:** `src/plugins/1.router/guards.ts` layout yüklenmeden önce redirect yapıyor olabilir

### Senaryo B: Layout Mount Oluyor Ama Script Yüklenmiyor ❌

**Göstergeler:**
- Layout mount oldu ama App Bridge script yok
- `ensureAppBridgeAssets()` çalıştı ama script DOM'a eklenmedi

**Olası Nedenler:**
1. **CSP Policy:** Content Security Policy script'i engelliyor
2. **Network Error:** CDN'den script indirilemiyor
3. **Script Load Timing:** Script yüklenmeden `window.shopify` kontrol ediliyor

---

## 🔍 DETAYLI KOD İNCELEMESİ

### src/layouts/shopify-embedded.vue

**Satır 738-740:**
```typescript
onMounted(() => {
  bootstrapAppBridge(); // ← BU ÇALIŞMIYOR
});
```

**Satır 472-588:**
```typescript
async function bootstrapAppBridge() {
  // ...
  await ensureAppBridgeAssets(); // ← Script injection
  // ...
  window.shopify bekleniyor // ← UNDEFINED KALIYOR
}
```

**Satır 201-264:**
```typescript
async function ensureAppBridgeAssets() {
  // Meta tag kontrolü
  // Script tag kontrolü
  // Script yoksa oluşturuluyor
}
```

### src/plugins/1.router/index.ts

**Satır 11-19:**
```typescript
function recursiveLayouts(route: RouteRecordRaw): RouteRecordRaw {
  if (route.children) {
    // ...
  }
  return setupLayouts([route])[0] // ← Layout burada uygulanıyor
}
```

**Satır 30-35:**
```typescript
extendRoutes: pages => [
  ...redirects,
  ...[...pages, ...routes].map(route => recursiveLayouts(route)),
]
```

### env.d.ts

**Satır 8:**
```typescript
layout?: 'blank' | 'default' // ← shopify-embedded YOK!
```

---

## 📋 ÖNERİLEN ÇÖZÜMLER (Öncelik Sırasına Göre)

### 🔴 **ÖNCELİK 1: Type Definition Düzelt**

**Dosya:** `env.d.ts`
```typescript
layout?: 'blank' | 'default' | 'shopify-embedded' | 'editor'
```

**ETKİ:** TypeScript artık `shopify-embedded` layout'unu tanıyacak.

---

### 🔴 **ÖNCELİK 2: Router Guard Kontrolü**

**Dosya:** `src/plugins/1.router/guards.ts`

**Kontrol:** Layout yüklenmeden önce redirect yapılıyor mu?

**ETKİ:** Route guard'ı layout'u engelliyorsa, guard'ı düzelt.

---

### 🔴 **ÖNCELİK 3: Layout Mount Debug**

**Dosya:** `src/layouts/shopify-embedded.vue`

**Eklemek:**
```typescript
onBeforeMount(() => {
  console.log('[shopify-layout] ⚠️ onBeforeMount - Layout mounting...');
});

onMounted(() => {
  console.log('[shopify-layout] ✅ onMounted - Layout mounted, bootstrapping App Bridge...');
  bootstrapAppBridge();
});
```

**ETKİ:** Layout'un gerçekten mount olup olmadığını göreceğiz.

---

### 🟡 **ÖNCELİK 4: App Bridge Script Timing**

**Dosya:** `src/layouts/shopify-embedded.vue`

**Mevcut:**
```typescript
async function ensureAppBridgeAssets() {
  // Script yoksa oluştur
  // Ama script yüklenmesini beklemiyor
}
```

**Düzeltme:**
```typescript
async function ensureAppBridgeAssets() {
  // Script oluştur
  // Script load event'ini bekle
  await new Promise((resolve) => {
    script.onload = resolve;
    script.onerror = resolve; // Hata durumunda da devam et
  });
}
```

---

## 🎬 SONUÇ VE SONRAKİ ADIMLAR

### Kesin Tespit:
1. ❌ **Layout mount olmuyor** (en büyük sorun)
2. ❌ **TypeScript type tanımı eksik**
3. ⚠️ **App Bridge script timing sorunu** (muhtemel)

### Hemen Yapılması Gerekenler:
1. ✅ `env.d.ts`'e `shopify-embedded` ekle
2. ✅ Layout'a `onBeforeMount` + `onMounted` debug logları ekle
3. ✅ Router guard'ı kontrol et
4. ✅ Browser console'da tekrar test et

### Test Komutu (Browser Console):
```javascript
// 1. Layout mount oldu mu?
console.log('Layout exists:', document.querySelector('.embedded-frame') !== null);

// 2. App Bridge script var mı?
console.log('Script tag:', document.querySelector('script[src*="app-bridge"]') !== null);

// 3. window.shopify var mı?
console.log('window.shopify:', typeof window.shopify);

// 4. Route meta kontrol
console.log('Current route:', window.location.pathname);
```

---

## 📝 NOTLAR

- **MetaLayouts Plugin:** `vite-plugin-vue-meta-layouts` build zamanında çalışıyor
- **Virtual Module:** `virtual:meta-layouts` build tarafından oluşturuluyor
- **Layout Dosyası:** `src/layouts/shopify-embedded.vue` mevcut ve doğru görünüyor
- **Route Definition:** Sayfalarda `meta.layout = "shopify-embedded"` doğru

**SONUÇ:** Sorun layout'un mount olmamasında. Type definition ve router guard kontrolü şart!

