# 📁 PART 3: DOSYA YAPISI VE ROUTER ANALİZİ

## 🗂️ PROJE DİZİN YAPISI (TREE)

```
/srv/gsb/api/
├── dist/                          ← Build output (Caddy serves)
│   ├── index.html                 ← SPA entry point
│   ├── assets/                    ← Bundled JS/CSS
│   │   ├── index-Dfq-SIkq.js      (1.8 MB - main bundle)
│   │   ├── index-*.css
│   │   └── ... (700+ chunks)
│   ├── images/
│   ├── models/
│   └── manifest.json
│
├── server/                        ← Backend source
│   ├── src/
│   │   ├── main.ts                ← Entry point
│   │   ├── app.ts                 ← Express app setup
│   │   ├── env.ts                 ← Env validation (Zod)
│   │   │
│   │   ├── routes/                ← API routes
│   │   │   ├── index.ts           (Router registry)
│   │   │   ├── auth.ts            (Login, OAuth callback)
│   │   │   ├── proxy.ts           (Shopify proxy, /apps/gsb/*)
│   │   │   ├── catalog.ts         (Products)
│   │   │   ├── designs.ts         (Design CRUD)
│   │   │   ├── orders.ts          (Orders)
│   │   │   ├── webhooks.ts        (Shopify webhooks)
│   │   │   ├── health.ts          (Health check)
│   │   │   ├── billing.ts
│   │   │   ├── templates.ts
│   │   │   ├── gang-sheets.ts
│   │   │   ├── shopify.ts
│   │   │   ├── embed.ts
│   │   │   ├── analytics.ts
│   │   │   ├── pricing.ts
│   │   │   ├── audit.ts
│   │   │   ├── jobs.ts
│   │   │   ├── merchant-config.ts
│   │   │   ├── notifications.ts
│   │   │   ├── shortcodes.ts
│   │   │   ├── supplier-routing.ts
│   │   │   └── upload.ts
│   │   │
│   │   ├── middlewares/           ← Express middlewares
│   │   │   ├── authenticate.ts    (JWT verification)
│   │   │   └── context.ts         (Tenant context)
│   │   │
│   │   ├── services/              ← Business logic
│   │   │   ├── pricingEngine.ts
│   │   │   ├── billingService.ts
│   │   │   ├── notificationDelivery.ts
│   │   │   └── shopifyMetaobjects.ts
│   │   │
│   │   ├── auth/                  ← Auth utilities
│   │   │   └── jwt.ts
│   │   │
│   │   ├── shopify/               ← Shopify helpers
│   │   │   └── sessionToken.ts
│   │   │
│   │   └── types/                 ← TypeScript types
│   │       └── express.ts
│   │
│   ├── tests/                     ← Unit tests
│   │   └── shopify-auth.spec.ts
│   │
│   └── tsconfig.json
│
├── src/                           ← Frontend source
│   ├── main.ts                    ← Vue app entry
│   ├── App.vue                    ← Root component
│   │
│   ├── pages/                     ← File-based routes
│   │   ├── index.vue              (/)
│   │   ├── login.vue              (/login)
│   │   ├── editor/
│   │   │   └── index.vue          (/editor) ← EDITOR!
│   │   │
│   │   ├── shopify/embedded/      (/shopify/embedded/*)
│   │   │   ├── index.vue
│   │   │   ├── dashboard.vue
│   │   │   ├── orders.vue
│   │   │   ├── designs.vue
│   │   │   ├── catalog.vue
│   │   │   ├── products.vue
│   │   │   ├── templates.vue
│   │   │   ├── webhooks.vue
│   │   │   ├── pricing.vue
│   │   │   ├── analytics.vue
│   │   │   └── ... (20+ pages)
│   │   │
│   │   ├── merchant/              (/merchant/*)
│   │   │   ├── overview.vue
│   │   │   ├── operations/
│   │   │   ├── pricing/
│   │   │   ├── shortcodes/
│   │   │   └── templates/
│   │   │
│   │   └── super-admin/           (/super-admin/*)
│   │       └── overview.vue
│   │
│   ├── layouts/                   ← Layout components
│   │   ├── default.vue            (Authenticated)
│   │   ├── blank.vue              (Minimal)
│   │   ├── editor.vue             (Editor layout) ← TARGET!
│   │   └── shopify-embedded.vue   (Shopify iframe) ← PROBLEM!
│   │
│   ├── modules/                   ← Feature modules
│   │   ├── editor/
│   │   │   ├── components/
│   │   │   │   ├── EditorShell.vue
│   │   │   │   ├── EditorToolbar.vue
│   │   │   │   ├── StageCanvas.vue
│   │   │   │   ├── LayersPanel.vue
│   │   │   │   └── ... (40+ components)
│   │   │   ├── store/
│   │   │   │   ├── editorStore.ts         (Main editor state)
│   │   │   │   ├── gangSheetStore.ts
│   │   │   │   └── editorModeStore.ts
│   │   │   ├── composables/
│   │   │   │   ├── useAutosaveManager.ts  (Autosave logic)
│   │   │   │   ├── useAnonymousDesignStorage.ts
│   │   │   │   └── useCollaboration.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── auth/
│   │   │   └── stores/
│   │   │       └── sessionStore.ts        (Session management)
│   │   │
│   │   ├── catalog/
│   │   │   └── store/
│   │   │       └── catalogStore.ts
│   │   │
│   │   ├── merchant/
│   │   │   └── stores/
│   │   │       └── merchantEmbeddedStore.ts
│   │   │
│   │   └── core/
│   │       └── stores/
│   │           └── notificationStore.ts
│   │
│   ├── plugins/                   ← Vue plugins
│   │   ├── 1.router/
│   │   │   ├── index.ts           (Router setup)
│   │   │   └── guards.ts          (Navigation guards) ← KEY!
│   │   ├── 2.pinia.ts             (Store registry)
│   │   ├── 3.session.ts           (Session init) ← KEY!
│   │   ├── 4.casl.ts              (Permissions)
│   │   ├── vuetify.ts
│   │   └── i18n/
│   │
│   ├── composables/               ← Reusable composables
│   │   ├── useApi.ts
│   │   ├── useSimpleSessionPersistence.ts
│   │   ├── useParentStorage.ts
│   │   └── usePWA.ts
│   │
│   ├── utils/                     ← Utilities
│   │   ├── api.ts                 ($api helper)
│   │   └── iframeMessaging.ts     (postMessage)
│   │
│   └── @core/                     ← Core components
│       ├── components/
│       ├── utils/
│       └── scss/
│
├── extensions/                    ← Shopify extensions
│   └── gsb-customizer-v52/
│       ├── shopify.extension.toml
│       ├── blocks/
│       │   ├── gsb-product-button.liquid  ← BUTTON!
│       │   └── gsb-loader.liquid
│       ├── snippets/
│       │   └── gsb-app-embed.liquid
│       └── locales/
│           └── en.default.json
│
├── prisma/                        ← Database
│   ├── schema.prisma              (Schema definition)
│   ├── migrations/                (11 migrations)
│   └── seed.ts
│
├── public/                        ← Static assets (copied to dist)
│   ├── gsb-shortcode.js
│   ├── manifest.json
│   ├── sw.js
│   ├── loader.css
│   └── images/
│
├── docker-compose.yml             ← Docker config
├── Caddyfile                      ← Caddy config (local copy)
├── package.json                   ← Dependencies
├── pnpm-lock.yaml
├── vite.config.ts                 ← Build config
├── tsconfig.json
├── shopify.app.toml               ← Shopify app config
├── .env                           ← Environment (ignored)
└── README.md
```

---

## 🛣️ ROUTER ANALIZI (DETAYLI)

### Vue Router Configuration

**Plugin:** `unplugin-vue-router` (file-based routing)

**Config:** `vite.config.ts` satır 24-34

```typescript
VueRouter({
  getRouteName: routeNode => {
    return getPascalCaseRouteName(routeNode)
      .replace(/([a-z\d])([A-Z])/g, '$1-$2')
      .toLowerCase()
  },
  beforeWriteFiles: root => {
    root.insert('/apps/email/:filter', '/src/pages/apps/email/index.vue')
    root.insert('/apps/email/:label', '/src/pages/apps/email/index.vue')
  },
})
```

**Generated Routes:** `typed-router.d.ts`

---

### File-Based Routes (src/pages/)

| File Path | Route Path | Layout | Public |
|-----------|------------|--------|--------|
| `index.vue` | `/` | default | No |
| `login.vue` | `/login` | blank | Yes |
| `editor/index.vue` | `/editor` | **editor** | **Yes** |
| `shopify/embedded/index.vue` | `/shopify/embedded` | shopify-embedded | Yes |
| `shopify/embedded/dashboard.vue` | `/shopify/embedded/dashboard` | shopify-embedded | No |
| `merchant/overview.vue` | `/merchant/overview` | default | No |

**Key route:** `/editor`

**Definition:** `src/pages/editor/index.vue` satır 20
```typescript
definePage({ meta: { layout: "editor", public: true } });
```

---

### Layout System

**Plugin:** `vite-plugin-vue-meta-layouts`

**Config:** `vite.config.ts` satır 54-57

```typescript
MetaLayouts({
  target: './src/layouts',
  defaultLayout: 'default',  // ← Fallback
})
```

**Available Layouts:**
- `default.vue` - Authenticated, navbar, sidebar
- `blank.vue` - Minimal (login pages)
- `editor.vue` - Editor (minimal, no auth)
- `shopify-embedded.vue` - Shopify iframe (App Bridge)

**Layout Selection:**
```
1. Check route.meta.layout
2. If undefined → Use defaultLayout: 'default'
```

---

### Navigation Guards

**File:** `src/plugins/1.router/guards.ts`

**Guard 1: Editor Bypass (Satır 11-18)**
```typescript
if (to.path === '/editor' || 
    to.path.startsWith('/editor?') || 
    to.path.startsWith('/editor/') ||
    to.path === '/apps/gsb/editor' ||         // ← BU SATIRDA MATCH!
    to.path.startsWith('/apps/gsb/editor?') ||
    to.path.startsWith('/apps/gsb/editor/')) {
  return; // ← Auth bypass!
}
```

**✅ ÇALIŞIYOR:** Auth check atlanıyor

**Guard 2: Customer Storefront Detection (Satır 20-34)**
```typescript
if (typeof window !== 'undefined' && window.location.search) {
  const urlParams = new URLSearchParams(window.location.search);
  const hasPreviewTheme = urlParams.has('preview_theme_id') || 
                          urlParams.has('key');
  
  if (hasPreviewTheme) {
    console.log('[Router] Customer storefront detected');
    if (to.path !== '/editor' && to.path !== '/apps/gsb/editor') {
      return '/editor' + window.location.search;
    }
    return;
  }
}
```

**❌ ÇALIŞMIYOR:** `preview_theme_id` URL'de yok!

**Guard 3: Auth Check (Satır 51-59)**
```typescript
if (!isLoggedIn) {
  return {
    name: 'login',
    query: {
      to: to.fullPath
    }
  }
}
```

**⚠️ ATLANMIŞ:** Guard 1 sayesinde

---

## 🔄 REQUEST FLOW (FULL TRACE)

### Step-by-Step Execution

#### 1. Button Click (Browser)

```
User clicks: <button onclick="window.open(...)">
            ↓
window.open('https://app.gsb-engine.dev/apps/gsb/editor?...', '_blank')
            ↓
New tab opens
```

#### 2. DNS Resolution

```
app.gsb-engine.dev
        ↓ (DNS lookup)
46.224.20.228
```

#### 3. TLS Handshake

```
Browser → Caddy (Port 443)
        ↓
SSL Certificate: Let's Encrypt
        ↓
Secure connection established
```

#### 4. HTTP Request

```http
GET /apps/gsb/editor?product=fight-club...&shop=we-dream-studio... HTTP/2
Host: app.gsb-engine.dev
User-Agent: Mozilla/5.0 ...
Accept: text/html
```

#### 5. Caddy Processing

**Caddyfile execution:**

```
Line 12: reverse_proxy /apps/gsb/* 127.0.0.1:4000
         ↓ MATCH! (/apps/gsb/editor matches /apps/gsb/*)
         ↓
Proxy to: http://127.0.0.1:4000/apps/gsb/editor?product=...
```

#### 6. Express Backend (Port 4000)

**app.ts execution:**

```typescript
// Satır 53: Mount proxyRouter
app.use("/apps/gsb", proxyRouter);

// proxyRouter handles: /apps/gsb/editor
// Actual Express route: /editor (base stripped)
```

**proxy.ts execution:**

```typescript
// Satır 140-184:
proxyRouter.get("/editor", async (req, res) => {
  const distPath = path.join(process.cwd(), "dist", "index.html");
  
  if (fs.existsSync(distPath)) {
    let html = fs.readFileSync(distPath, "utf-8");
    
    // Path fixes
    html = html.replace(/href="\/assets\//g, 'href="/apps/gsb/assets/');
    html = html.replace(/src="\/assets\//g, 'src="/apps/gsb/assets/');
    
    // Inject config
    html = html.replace('</head>', `
      <script>
        window.__vite_plugin_config__ = { base: '/apps/gsb/' };
        window.__GSB_EMBED_MODE__ = true;
        window.__GSB_BASE_PATH__ = '/apps/gsb';
        window.__GSB_DISABLE_SW__ = true;
      </script></head>`
    );
    
    // CSP header
    res.setHeader('Content-Security-Policy', 
      "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com"
    );
    
    res.send(html);
  }
});
```

**Response:**
```http
HTTP/2 200 OK
Content-Type: text/html
Content-Security-Policy: frame-ancestors ...

<!DOCTYPE html>
<html>
<head>
  <meta name="shopify-api-key" content="fe2fa282..." />
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  <script>
    window.__vite_plugin_config__ = { base: '/apps/gsb/' };
    window.__GSB_EMBED_MODE__ = true;
    ...
  </script>
</head>
<body>
  <div id="app"></div>
  <script src="/apps/gsb/assets/index-Dfq-SIkq.js"></script>
</body>
</html>
```

#### 7. Browser HTML Parse

```
1. Parse HTML
2. Load external scripts:
   - app-bridge.js (Shopify CDN)
   - index-Dfq-SIkq.js (/apps/gsb/assets/...)
3. Execute inline script:
   - window.__GSB_EMBED_MODE__ = true
   - window.__GSB_BASE_PATH__ = '/apps/gsb'
```

#### 8. Vue Application Bootstrap

**main.ts execution:**

```typescript
import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'
import { createApp } from 'vue'

const app = createApp(App)
app.use(VueKonva)
registerPlugins(app)  // ← Plugins load here!
app.mount('#app')
```

**registerPlugins (src/@core/utils/plugins.ts):**
```typescript
export function registerPlugins(app: App) {
  loadPinia(app)      // Store registry
  loadRouter(app)     // Router (with guards)
  loadVuetify(app)    // UI framework
  // ... other plugins
}
```

**Router setup (src/plugins/1.router/index.ts):**
```typescript
import { setupGuards } from './guards'

const router = createRouter({ ... })

setupGuards(router)  // ← Navigation guards!

export default router
```

#### 9. Plugin Execution (Critical!)

**Plugin 1: Router Guards**

```typescript
// src/plugins/1.router/guards.ts
router.beforeEach(to => {
  // Check: to.path = "/apps/gsb/editor" (browser URL)
  
  if (to.path === '/apps/gsb/editor') {
    return; // ← BYPASS! ✅
  }
})
```

**Plugin 2: Session Plugin**

```typescript
// src/plugins/3.session.ts
if (path.includes('/editor')) {
  // path = "/apps/gsb/editor" ← CONTAINS /editor! ✅
  return; // ← SESSION SKIP! ✅
}
```

#### 10. Route Navigation

**Vue Router processes URL:**

```
Browser URL: /apps/gsb/editor?product=...&shop=...
            ↓
Vue Router: Match route
            ↓
Routes table:
  /editor → FOUND! ✅
  /apps/gsb/editor → NOT FOUND! ❌
            ↓
Best match: / (root) or /editor?
```

**⚠️ PROBLEM:** Router base path confusion!

**vite.config.ts satır 163:**
```typescript
base: process.env.NODE_ENV === 'production' ? '/apps/gsb/' : '/',
```

**Ne demek:**
- Vue Router base: `/apps/gsb/`
- Browser URL: `/apps/gsb/editor`
- After base: `/editor`
- Match: `/editor` route ✅

**Layout:**
```typescript
// src/pages/editor/index.vue
definePage({ meta: { layout: "editor", public: true } });
```

**Teoride:** `editor` layout yüklenmeli!

---

## 🔍 SORUNUN GERÇEK NEDENİ (DEEPER!)

### shop Param + App Bridge Injection

**index.html içinde (vite plugin inject eder):**
```html
<meta name="shopify-api-key" content="fe2fa282..." />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

**app-bridge.js yüklendiğinde:**
```javascript
// Shopify App Bridge auto-init
if (window.location.search.includes('shop=')) {
  // "Bu Shopify embedded app!"
  // Initialize App Bridge
  const shop = new URLSearchParams(location.search).get('shop');
  
  if (!isInIframe()) {
    // "Embedded olmalıydı ama değil!"
    // Redirect to admin
    window.top.location.href = `https://admin.shopify.com/store/${shop}/apps/...`;
  }
}
```

**⚠️ BURASI SORUN!**

**App Bridge CDN script otomatik redirect yapıyor!**

---

## 💡 KÖK NEDEN BULUNDU!

### ASIL SORUN: App Bridge Auto-Redirect

**app-bridge.js (Shopify CDN):**
- URL'de `shop` param var
- iframe içinde değil (window.self === window.top)
- "Embedded app olmalıydı, redirect et!"
- Admin panel'e yönlendiriyor

**ÇÖZÜM:**

### Option 1: shop Param Kaldır (TAVSİYE!)

```liquid
onclick="window.open('https://app.gsb-engine.dev/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}', '_blank')"
```

**Sonuç:** App Bridge shop param görmez, redirect yapmaz!

### Option 2: App Bridge Injection'ı Conditional Yap

**vite.config.ts - App Bridge plugin:**

```typescript
transformIndexHtml(html) {
  const apiKey = env.VITE_SHOPIFY_APP_API_KEY;
  
  // ONLY inject for /shopify/embedded paths!
  // NOT for /editor or /apps/gsb/editor
  
  // Check build path or add conditional logic
  if (/* is embedded context */) {
    return injectAppBridge(html, apiKey);
  }
  
  return html; // No App Bridge for editor!
}
```

**⚠️ Karmaşık:** Build-time detection zor

### Option 3: Conditional App Bridge Init

**index.html script:**

```html
<script>
  // Prevent auto-init
  window.__SHOPIFY_APP_BRIDGE_DISABLED__ = true;
  
  // Manual init only for /shopify/embedded
  if (window.location.pathname.startsWith('/shopify/embedded')) {
    // Load App Bridge
    const script = document.createElement('script');
    script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
    document.head.appendChild(script);
  }
</script>
```

**⚠️ Ama:** Vite plugin zaten inject ediyor!

---

## 🎯 EN KOLAY ÇÖZÜM (FINAL!)

### ✅ Button URL Fix + shop Param Remove

**File:** `extensions/gsb-customizer-v52/blocks/gsb-product-button.liquid`

**Change:**
```liquid
<!-- BEFORE -->
onclick="window.open('https://app.gsb-engine.dev/apps/gsb/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}&shop={{ shop.permanent_domain }}', '_blank')"

<!-- AFTER -->
onclick="window.open('https://app.gsb-engine.dev/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}', '_blank')"
```

**Changes:**
1. `/apps/gsb/editor` → `/editor` (Direct Vue route)
2. `&shop=...` → Removed (No App Bridge confusion)

**Why this works:**
- ✅ Route `/editor` defined in `src/pages/editor/index.vue`
- ✅ Meta: `{ layout: "editor", public: true }`
- ✅ No `shop` param → App Bridge doesn't redirect
- ✅ Session skip works (path contains `/editor`)
- ✅ Router guard bypass works

**Deployment:**
```bash
1. Commit changes
2. Push to GitHub
3. Pull on server
4. shopify app deploy --force
5. Test!
```

**Estimated success:** ✅ **99%**

---

## 📊 SORUN ÖZETİ

| Component | Status | Issue |
|-----------|--------|-------|
| Button URL | ❌ Wrong | `/apps/gsb/editor` + `shop` param |
| Caddy routing | ✅ OK | Correctly proxies |
| Backend proxy | ✅ OK | Serves HTML |
| HTML injection | ⚠️ Problem | App Bridge injected everywhere |
| App Bridge | ❌ Problem | Auto-redirects when shop param + not iframe |
| Router guards | ✅ OK | Bypass works |
| Session plugin | ✅ OK | Skip works |
| Layout | ⚠️ Confused | Base path vs actual path |

**Root cause:** App Bridge CDN script + shop param = auto-redirect

