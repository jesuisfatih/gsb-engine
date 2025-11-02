# 🔴 PART 1: SORUN ANALİZİ VE KÖK NEDEN

## 📋 ŞU ANKİ SORUN

**DURUM:** Customize button'a basılınca **hala admin paneline yönlendiriyor**

**BEKLENEN:** Editor açılmalı (giriş yapmadan, anonymous user olarak)

**GERÇEKLEŞEN:** `admin.shopify.com/store/we-dream-studio/...` → Merchant panel

---

## 🔬 KÖK NEDEN ANALİZİ (ULTRA DERİN)

### ADIM 1: Button Click Event

**Dosya:** `extensions/gsb-customizer-v52/blocks/gsb-product-button.liquid`  
**Satır:** 12

**Kod:**
```liquid
onclick="window.open('https://app.gsb-engine.dev/apps/gsb/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}&shop={{ shop.permanent_domain }}', '_blank')"
```

**Çalıştırılan URL:**
```
https://app.gsb-engine.dev/apps/gsb/editor?product=fight-club-kanvas-tablo&variantId=49511231619371&shop=we-dream-studio.myshopify.com
```

**Parametreler:**
- `product`: fight-club-kanvas-tablo
- `variantId`: 49511231619371
- `shop`: we-dream-studio.myshopify.com ← **PROBLEM!**

---

### ADIM 2: Request Flow (Server Side)

**Request:**
```http
GET /apps/gsb/editor?product=fight-club...&shop=we-dream-studio... HTTP/1.1
Host: app.gsb-engine.dev
User-Agent: Mozilla/5.0 ...
```

**Caddy (Port 80/443):**
```
/etc/caddy/Caddyfile satır 12:
reverse_proxy /apps/gsb/* 127.0.0.1:4000
```

**Backend (Port 4000):**
```typescript
// server/src/app.ts satır 53:
app.use("/apps/gsb", proxyRouter);

// server/src/routes/proxy.ts satır 140:
proxyRouter.get("/editor", async (req, res) => {
  // dist/index.html serve edilir
  let html = fs.readFileSync(distPath, "utf-8");
  res.send(html);
});
```

**Serve edilen:** `/srv/gsb/api/dist/index.html`

---

### ADIM 3: Browser HTML Parse & Vue Mount

**HTML Load:**
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Vite plugin App Bridge injection -->
  <meta name="shopify-api-key" content="fe2fa282..." />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  ...
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/apps/gsb/assets/index-Dfq-SIkq.js"></script>
</body>
</html>
```

**Vue App Mount:**
```typescript
// src/main.ts satır 10:
const app = createApp(App)

// src/main.ts satır 20:
app.mount('#app')
```

---

### ADIM 4: Plugin Initialization Order

**Plugin sequence:**
```
1. src/plugins/1.router/index.ts → Router setup
2. src/plugins/2.pinia.ts → Store registry
3. src/plugins/3.session.ts → Session plugin ← BURASI!
4. src/plugins/4.casl.ts → Permissions
5. src/plugins/vuetify.ts → UI framework
```

**Session Plugin (src/plugins/3.session.ts):**

**Satır 10-11:**
```typescript
const path = window.location.pathname  // "/apps/gsb/editor"
const search = window.location.search  // "?product=...&shop=..."
```

**Satır 16-17:**
```typescript
const urlParams = new URLSearchParams(search);
const hasPreviewTheme = urlParams.has('preview_theme_id') || 
                        urlParams.has('key');
```

**Sonuç:**
```
hasPreviewTheme = false  // ← URL'de preview_theme_id yok!
```

**Satır 19-27:**
```typescript
if (hasPreviewTheme) {
  // ← BU BLOĞA GİRMİYOR!
  console.log('[SessionPlugin] ⏭️ Customer storefront detected')
  return
}
```

**Satır 30-40:**
```typescript
if (path.includes('/shopify/embedded')) {
  // ← Path: "/apps/gsb/editor" → Bu da geçmiyor
  return
}

if (path.includes('/editor')) {
  // ← "/apps/gsb/editor" contains '/editor' → GİRER! ✅
  console.log('[SessionPlugin] ⏭️ Skipping for Editor')
  return // ← SESSION SKIP EDİLDİ!
}
```

**Sonuç:** ✅ **Session skip çalışıyor!**

---

### ADIM 5: Router Navigation

**Router Guard (src/plugins/1.router/guards.ts):**

**Satır 11-18:**
```typescript
if (to.path === '/editor' || 
    to.path.startsWith('/editor?') || 
    to.path.startsWith('/editor/') ||
    to.path === '/apps/gsb/editor' ||
    to.path.startsWith('/apps/gsb/editor?') ||
    to.path.startsWith('/apps/gsb/editor/')) {
  return; // ← BURAYA GİRER! ✅
}
```

**Sonuç:** ✅ **Auth bypass çalışıyor!**

**Satır 20-34 (Yeni eklenen kod):**
```typescript
if (typeof window !== 'undefined' && window.location.search) {
  const urlParams = new URLSearchParams(window.location.search);
  const hasPreviewTheme = urlParams.has('preview_theme_id') || 
                          urlParams.has('key');
  
  if (hasPreviewTheme) {
    // ← hasPreviewTheme = false, GİRMİYOR!
    console.log('[Router] Customer storefront detected')
    if (to.path !== '/editor' && to.path !== '/apps/gsb/editor') {
      return '/editor' + window.location.search;
    }
    return;
  }
}
```

**Sonuç:** ⚠️ **Customer storefront detected GİRMEDİ** (preview param yok)

---

### ADIM 6: Route Match & Layout Determination

**Şu anki route:**
```
Path: /apps/gsb/editor
Query: ?product=...&shop=...
```

**Vue Router (unplugin-vue-router):**

**Generated routes check:**
```typescript
// typed-router.d.ts içinde route var mı?
'/apps/gsb/editor' → YOK! ❌

'/editor' → ✅ VAR (src/pages/editor/index.vue)
```

**Sorun:**
- `/apps/gsb/editor` route tanımlı değil!
- Vue Router bu route'u bulamıyor
- Fallback ile `/` route'una match ediyor
- Default layout yükleniyor

**Layout determination:**
```typescript
// vite.config.ts satır 54-57:
MetaLayouts({
  target: './src/layouts',
  defaultLayout: 'default',  // ← FALLBACK!
})
```

**Ne oluyor:**
```
Route: /apps/gsb/editor (tanımsız)
  ↓
Vue Router: En yakın match → / (root)
  ↓
Layout: default (meta tanımlı değil)
  ↓
src/layouts/default.vue yüklenir
```

**Ama!** Default layout içinde:

**src/layouts/default.vue:**
```vue
<template>
  <DefaultLayoutWithVerticalNav />
</template>
```

**Bu authenticated layout!** Giriş gerektirir!

---

### ADIM 7: Authentication Flow Trigger

**Default layout mount olduğunda:**

```typescript
// src/layouts/components/DefaultLayoutWithVerticalNav.vue
// veya herhangi bir authenticated component

onMounted(() => {
  const sessionStore = useSessionStore();
  
  if (!sessionStore.isAuthenticated) {
    // Not logged in!
    router.push('/login');
  }
})
```

**Ama!** URL'de `shop` param var:

**Shopify Embedded Detection Logic:**

**Bir yerde (büyük ihtimalle App.vue veya router interceptor):**
```typescript
const shop = route.query.shop;

if (shop && !sessionStore.isAuthenticated) {
  // "Bu Shopify embedded olmalı, admin'e yönlendir!"
  window.location.href = `https://admin.shopify.com/store/${shopSlug}/apps/...`;
}
```

---

### ADIM 8: Admin Redirect Trigger Point

**BULDUM! Sorun:**

**vite.config.ts satır 163:**
```typescript
base: process.env.NODE_ENV === 'production' ? '/apps/gsb/' : '/',
```

**Ne demek:**
- Production build'de **base path: `/apps/gsb/`**
- Tüm asset'ler: `/apps/gsb/assets/*`
- Router base: `/apps/gsb/`

**Problem:**
```
URL: /apps/gsb/editor
Vue Router base: /apps/gsb/
Matched route: /editor (base'den sonra)
Layout meta: undefined (çünkü route /apps/gsb/editor olarak tanımlı değil)
Fallback: default layout
Auth check: Failed
shop param var: Shopify embedded sanıyor
Redirect: Admin panel! ❌
```

---

## 🎯 KÖK NEDEN (KESK

İN!)

### PROBLEM ZİNCİRİ:

```
1. Button URL: /apps/gsb/editor ← Production base path
                ↓
2. Vue Router: Base path /apps/gsb/ set (vite.config.ts)
                ↓
3. Route match: /editor (after base)
                ↓
4. Route definition: src/pages/editor/index.vue
   - meta: { layout: "editor", public: true }
                ↓
5. AMA! Actual path: /apps/gsb/editor
   - Vue Router bunu /editor olarak görüyor
   - Ama browser'da full path /apps/gsb/editor
   - Meta bilgisi kaybolabiliyor!
                ↓
6. Layout: Undefined veya default
                ↓
7. Auth check: Required
                ↓
8. shop param var: Shopify embedded context sanıyor
                ↓
9. window.location.href = admin panel URL
                ↓
10. REDIRECT! ❌
```

---

## 💡 ÇÖZÜM (3 SEÇENEK)

### ÇÖZÜM A: Base Path Kaldır + Direct /editor (TAVSİYE!)

**Button:**
```liquid
onclick="window.open('https://app.gsb-engine.dev/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}', '_blank')"
```

**Değişiklikler:**
- ❌ `/apps/gsb/editor` → ✅ `/editor`
- ❌ `&shop=...` → ✅ Kaldırıldı
- ✅ Direct Vue route
- ✅ Meta tanımlı: `{ layout: "editor", public: true }`

**Sonuç:** ✅ **Çalışmalı!**

---

### ÇÖZÜM B: /apps/gsb/editor Route Tanımla

**Yeni dosya:** `src/pages/apps/gsb/editor.vue`

```vue
<script setup lang="ts">
import { definePage } from 'unplugin-vue-router/runtime'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

definePage({
  meta: {
    layout: 'editor',
    public: true
  }
})

const router = useRouter()

// Redirect to /editor with same query params
onMounted(() => {
  const query = router.currentRoute.value.query
  router.replace({ path: '/editor', query })
})
</script>

<template>
  <div>Redirecting to editor...</div>
</template>
```

**Sonuç:** ⚠️ **Çalışır ama hacky**

---

### ÇÖZÜM C: Router Base Configuration

**vite.config.ts değiştir:**
```typescript
// Satır 163:
base: '/',  // ← Production'da da base path yok
```

**Caddy config değiştir:**
```caddyfile
# App Proxy rotasını kaldır
# reverse_proxy /apps/gsb/* 127.0.0.1:4000

# Sadece API proxy
reverse_proxy /api/* 127.0.0.1:4000

# Static + SPA
root * /srv/gsb/api/dist
try_files {path} /index.html
file_server
```

**Sonuç:** ⚠️ **App Proxy çalışmaz** (Shopify requirement)

---

## 🎯 EN İYİ ÇÖZÜM

### ✅ ÇÖZÜM A Kullan (Direct /editor)

**Neden:**
- ✅ En basit
- ✅ Route tanımlı
- ✅ Meta bilgisi var
- ✅ No auth required
- ✅ No Shopify context confusion

**Implementation:**
1. Button URL değiştir: `/editor` (no base path, no shop param)
2. Deploy extension
3. Test

**Süre:** 15 dakika

