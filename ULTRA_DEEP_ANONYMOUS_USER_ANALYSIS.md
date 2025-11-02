# 🔬 ULTRA DERİNLEMESİNE ANONİM KULLANICI ANALİZİ

## 🎯 HEDEF

**"Anonim kullanıcı (giriş yapmamış) bile:**
- ✅ Customize button'a basabilmeli
- ✅ Editor açılmalı
- ✅ Design yapabilmeli
- ✅ Aynı tarayıcıdan tekrar geldiğinde **son tasarımını** görmeli
- ✅ Sepetindeki ürünleri görmeli
- ✅ Store password veya login engellemeden"

---

## 📊 MEVCUT DURUM ANALİZİ (KODLARDAN)

### ✅ ZATEN MEVCUT OLAN SİSTEMLER

#### 1. Anonymous Design Storage System (LocalStorage Based)

**Dosya:** `src/modules/editor/composables/useAnonymousDesignStorage.ts`

**Ne yapıyor:**
```typescript
// Storage keys
STORAGE_KEY = 'gsb:anonymous:design'
DESIGN_ID_KEY = 'gsb:anonymous:designId'

// Snapshot structure
{
  id: "anon-1234567-abc123",           // Unique anonymous ID
  items: [...],                         // Design layers
  productSlug: "tshirt",
  surfaceId: "tshirt-front",
  color: "white",
  printTech: "dtf",
  sheetWidthPx: 1400,
  sheetHeightPx: 800,
  createdAt: "2025-11-02T...",
  updatedAt: "2025-11-02T...",
  previewUrl: "data:image/png;base64..."
}
```

**Lifecycle:**
- ✅ Design değiştiğinde 2 saniye sonra localStorage'a kaydedilir
- ✅ Sayfa yenilendiğinde localStorage'tan restore edilir
- ✅ 7 gün boyunca saklanır, sonra silinir
- ✅ Checkout'tan sonra temizlenir

**Sorun:** 
- ⚠️ **Sadece localStorage kullanıyor** (iframe context'te çalışmaz)
- ⚠️ **Cart tracking yok** (sepetteki ürünleri saklamıyor)

---

#### 2. Parent Storage System (iframe için postMessage)

**Dosya:** `src/composables/useParentStorage.ts`

**Ne yapıyor:**
```typescript
// Iframe detection
isInIframe = window.self !== window.top

// Messages
GSB_DESIGN_SAVE      → Parent'a design gönder
GSB_REQUEST_SAVED_DESIGN → Parent'tan design iste
GSB_RESTORE_DESIGN   ← Parent'tan design al
```

**Lifecycle:**
- ✅ iframe mount olduğunda parent'tan saved design ister
- ✅ Design değiştiğinde parent'a gönderir
- ✅ Parent kendi localStorage'ında saklar (cross-origin bypass!)

**Sorun:**
- ⚠️ **Parent window'da listener yok!** (Shopify storefront handle etmiyor)
- ⚠️ **Sadece Shopify embedded için tasarlanmış**

---

#### 3. Session Skip Logic

**Dosya:** `src/plugins/3.session.ts`

**Ne yapıyor:**
```typescript
// Editor path check
if (path.includes('/editor')) {
  console.log('⏭️ Skipping session init')
  return // ← Session initialize SKIP!
}

// Preview theme check
if (urlParams.has('preview_theme_id')) {
  console.log('⏭️ Customer storefront detected')
  return // ← Session initialize SKIP!
}
```

**Durum:** ✅ Çalışıyor

---

#### 4. Router Guards Bypass

**Dosya:** `src/plugins/1.router/guards.ts`

**Ne yapıyor:**
```typescript
// Editor bypass
if (to.path === '/editor' || to.path === '/apps/gsb/editor') {
  return; // ← NO AUTH CHECK!
}

// Preview theme bypass
if (hasPreviewTheme) {
  console.log('Customer storefront detected - bypassing auth')
  if (to.path !== '/editor') {
    return '/editor' + window.location.search; // ← Force redirect!
  }
  return;
}
```

**Durum:** ✅ Çalışıyor (yeni eklendi)

---

#### 5. Backend Anonymous Support

**Dosya:** `server/src/routes/proxy.ts` (satır 268-395)

**Ne yapıyor:**
```typescript
// Cart endpoint
POST /api/proxy/cart

// Design creation (anonymous OK)
const design = await prisma.designDocument.create({
  data: {
    tenantId: tenantId || undefined,  // ← NULL OK!
    userId: user?.id || undefined,     // ← NULL OK!
    metadata: {
      source: user?.id ? 'authenticated' : 'guest', // ← Guest tracking!
    }
  }
});

// Cart preparation (anonymous OK)
POST /api/proxy/cart/prepare

// Design snapshot support
designSnapshot: !sessionStore.isAuthenticated ? 
  this.serializeSnapshot() : undefined
```

**Durum:** ✅ Çalışıyor

---

#### 6. Backend Auth Middleware

**Dosya:** `server/src/middlewares/authenticate.ts`

**Public paths:**
```typescript
PUBLIC_PATH_PREFIXES = [
  "/apps/gsb/",  // ← App Proxy (anonymous OK!)
  "/api/catalog", // ← Catalog (anonymous OK!)
  "/api/embed/",  // ← Embed (anonymous OK!)
]
```

**Durum:** ✅ Çalışıyor

---

## ❌ EKSİK OLAN SİSTEMLER

### 1. CART TRACKING (Sepet Hafızası) ❌

**Problem:**
- Anonim kullanıcı design yapar → Checkout
- Sepete eklenir
- **AMA** başka bir ürün customize eder
- İlk design **kaybolur** (localStorage'da yok!)

**Gerekli:**
```typescript
// localStorage cart structure
{
  "gsb:anonymous:cart": {
    items: [
      {
        designId: "anon-123",
        productSlug: "tshirt",
        variantId: "gid://...",
        quantity: 1,
        previewUrl: "data:image...",
        addedAt: "2025-11-02T..."
      }
    ]
  }
}
```

---

### 2. MULTI-DESIGN TRACKING ❌

**Problem:**
- Şu an sadece **1 design** saklanıyor (`gsb:anonymous:design`)
- Kullanıcı 3 farklı ürün customize ederse **sonuncusu diğerlerini override eder**

**Gerekli:**
```typescript
// localStorage multi-design structure
{
  "gsb:anonymous:designs": {
    "tshirt-front-white": {
      designId: "anon-123",
      snapshot: {...},
      updatedAt: "..."
    },
    "tshirt-back-black": {
      designId: "anon-456",
      snapshot: {...},
      updatedAt: "..."
    }
  }
}
```

---

### 3. BROWSER FİNGERPRINT (Cross-Session Tracking) ❌

**Problem:**
- localStorage browser-specific
- Kullanıcı **farklı device'dan** gelirse tasarımları yok
- Çerezler temizlenirse tasarımlar kaybolur

**Gerekli (İleri seviye):**
```typescript
// Backend: Anonymous user fingerprint
{
  fingerprint: "browser-fp-hash-12345",
  designs: ["anon-123", "anon-456"],
  lastSeen: "2025-11-02T...",
  ipAddress: "xxx.xxx.xxx.xxx" (hashed)
}

// Fingerprinting based on:
- User agent
- Screen resolution
- Timezone
- Language
- Canvas fingerprint
```

**⚠️ Privacy concern:** GDPR compliance gerekli!

---

### 4. PARENT WINDOW LISTENER (Shopify Storefront) ❌

**Problem:**
- `useParentStorage.ts` mesaj gönderiyor
- **AMA** Shopify storefront **listener yok!**
- `postMessage` havada kalıyor

**Gerekli:**

**Liquid snippet:** `extensions/gsb-customizer-v52/snippets/gsb-parent-listener.liquid`

```liquid
<script>
(function() {
  const STORAGE_KEY = 'gsb_customer_designs';
  
  // Listen for messages from editor iframe
  window.addEventListener('message', function(event) {
    // Verify origin
    if (!event.origin.includes('app.gsb-engine.dev')) {
      return;
    }
    
    // Handle save request
    if (event.data.type === 'GSB_DESIGN_SAVE') {
      try {
        const designs = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '{}'
        );
        
        const key = event.data.snapshot.productSlug + 
                     '-' + event.data.snapshot.surfaceId;
        
        designs[key] = {
          snapshot: event.data.snapshot,
          savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
        console.log('[GSB Parent] Design saved:', key);
      } catch (error) {
        console.error('[GSB Parent] Save failed:', error);
      }
    }
    
    // Handle restore request
    if (event.data.type === 'GSB_REQUEST_SAVED_DESIGN') {
      const urlParams = new URLSearchParams(window.location.search);
      const product = urlParams.get('product');
      const surface = urlParams.get('surface') || 'front';
      
      if (!product) return;
      
      try {
        const designs = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '{}'
        );
        
        const key = product + '-' + surface;
        const saved = designs[key];
        
        if (saved) {
          // Find iframe
          const iframe = document.querySelector('iframe[src*="app.gsb-engine.dev"]');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'GSB_RESTORE_DESIGN',
              snapshot: saved.snapshot
            }, '*');
            
            console.log('[GSB Parent] Design sent to iframe:', key);
          }
        }
      } catch (error) {
        console.error('[GSB Parent] Restore failed:', error);
      }
    }
    
    // Handle cart complete
    if (event.data.type === 'GSB_DESIGN_COMPLETE') {
      console.log('[GSB Parent] Design complete, adding to cart');
      
      const variantId = event.data.variantId;
      const properties = event.data.properties || {};
      
      if (variantId && typeof jQuery !== 'undefined') {
        // Shopify Ajax Cart API
        jQuery.post('/cart/add.js', {
          id: variantId,
          quantity: 1,
          properties: properties
        }, function(item) {
          console.log('[GSB Parent] Added to cart:', item);
          window.location.href = '/cart';
        }).fail(function(error) {
          console.error('[GSB Parent] Cart add failed:', error);
          alert('Failed to add to cart. Please try again.');
        });
      }
    }
  });
  
  console.log('[GSB Parent] Listener initialized');
})();
</script>
```

**Bu snippet theme'e eklenmeli!**

---

### 5. DOMAIN YÖNLENDİRME SORUNU (KRİTİK!) ❌

**Problem:**

**Şu anki button:**
```liquid
onclick="window.open('https://app.gsb-engine.dev/apps/gsb/editor?...')"
```

**Ne oluyor:**
```
Customer → Customize button
         ↓
https://app.gsb-engine.dev/apps/gsb/editor?shop=we-dream-studio...
         ↓
App.vue mount → Router guard → Session plugin
         ↓
src/plugins/1.router/guards.ts çalışır
         ↓ (satır 22-33)
const urlParams = new URLSearchParams(window.location.search);
const hasPreviewTheme = urlParams.has('preview_theme_id');
         ↓
FALSE! (çünkü URL'de preview_theme_id YOK)
         ↓
shopify-embedded.vue layout yüklenir
         ↓ (satır 551-561)
if (!isInIframe.value && shopDomain.value) {
  window.top?.location.replace(`https://${decodedHost}/apps/${apiKey}/shopify/embedded${query}`);
}
         ↓
ADMIN PANEL'E YÖNLENDİRİR! ❌
```

**Neden yönlendiriyor:**

1. **`preview_theme_id` param YOK** → Customer context detect edilemiyor
2. **`shop` param VAR** → Shopify embedded sanıyor
3. **`isInIframe` = false** → _blank ile açıldığı için iframe değil
4. **Layout:** Default layout yerine `shopify-embedded` layout yükleniyor
5. **Redirect logic:** Embedded olmadığını görünce admin'e yönlendiriyor

---

## 🔧 KÖK NEDEN ANALİZİ

### Problem Chain (Adım Adım):

```
1. Button Click
   ↓
2. https://app.gsb-engine.dev/apps/gsb/editor?product=x&shop=y
   ↓
3. Vue Router → Route match
   ↓
4. Route: /apps/gsb/editor
   - meta: { layout: undefined }  ← PROBLEM!
   - Path matches but layout belirsiz
   ↓
5. Vue tries to determine layout
   - Checks route meta
   - Falls back to default
   - Sees 'shop' param
   - Thinks: "Bu Shopify embedded!"
   ↓
6. shopify-embedded.vue layout load
   ↓
7. onMounted → bootstrapAppBridge()
   ↓
8. if (!isInIframe && shopDomain) {
     // "Embedded olmalıydı ama değil, admin'e yönlendir!"
     window.top.location.replace(admin panel URL)
   }
   ↓
9. REDIRECT TO ADMIN ❌
```

---

## 🎯 ÇÖZÜM STRATEJİSİ (3 SEVİYELİ)

### SEVİYE 1: ROUTE & LAYOUT FİXİ (KRİTİK!)

**Problem:** `/apps/gsb/editor` route'u explicit layout tanımı yok

**Mevcut:**
```typescript
// src/pages/editor/index.vue
definePage({ meta: { layout: "editor", public: true } });
```

**Ama `/apps/gsb/editor` bu route'a gitmiyor!**

**Çünkü:**
- File-based routing: `/editor` → `src/pages/editor/index.vue`
- Ama `/apps/gsb/editor` → **Route yok!**
- Server proxy ile serve ediliyor (static HTML)

**Çözüm seçenekleri:**

#### Seçenek A: Catch-all Route (TAVSİYE)

```typescript
// src/pages/[...catchall].vue (YENİ DOSYA)
definePage({
  meta: {
    layout: 'editor',
    public: true,
  }
})

// Route guard içinde
if (to.path.includes('/editor') || 
    to.path.startsWith('/apps/gsb/')) {
  to.meta.layout = 'editor';
  to.meta.public = true;
}
```

#### Seçenek B: Query Param Detection (MEVCUT + İYİLEŞTİRME)

```typescript
// src/plugins/1.router/guards.ts (satır 22-34)

// ŞU AN:
const hasPreviewTheme = urlParams.has('preview_theme_id');

// OLMasI GEREKEN:
const hasPreviewTheme = urlParams.has('preview_theme_id') || 
                        urlParams.has('key');

const isCustomerStorefront = hasPreviewTheme || 
                             (to.path.startsWith('/apps/gsb/editor') && 
                              !urlParams.has('host'));  // ← YENİ!

if (isCustomerStorefront) {
  // Force editor layout
  to.meta = { ...to.meta, layout: 'editor', public: true };
  return;
}
```

#### Seçenek C: Shop Param Context Detection (EN GÜVENLİ)

```typescript
// Shopify embedded vs Customer storefront ayırımı:

const shop = urlParams.get('shop');
const host = urlParams.get('host');
const embedded = urlParams.get('embedded');

// Embedded context indicators:
// - host param var (base64 encoded Shopify admin URL)
// - embedded=1
// - iframe içinde

// Customer storefront indicators:
// - shop param var
// - host param YOK!
// - embedded param YOK
// - iframe DEĞİL (veya parent Shopify storefront)

const isEmbeddedContext = Boolean(host || embedded === '1');
const isCustomerContext = Boolean(shop && !host && !embedded);

if (isCustomerContext) {
  to.meta = { layout: 'editor', public: true };
  return;
}

if (isEmbeddedContext && !isInIframe) {
  // Redirect to admin
  window.top.location.replace(...);
}
```

---

### SEVİYE 2: ANONYMOUS USER PERSISTENCE (İYİLEŞTİRME)

#### 2.1 Multi-Design Storage

**Yeni localStorage structure:**
```typescript
{
  "gsb:anonymous:designs": {
    // Key: productSlug-surfaceId-color
    "tshirt-front-white": {
      designId: "anon-123",
      snapshot: {...},
      previewUrl: "...",
      createdAt: "...",
      updatedAt: "...",
      inCart: false  // ← Sepette mi?
    },
    "hoodie-back-black": {
      designId: "anon-456",
      snapshot: {...},
      updatedAt: "...",
      inCart: true  // ← Sepette!
    }
  },
  
  "gsb:anonymous:cart": {
    items: [
      {
        designId: "anon-123",
        variantId: "gid://...",
        quantity: 1,
        addedAt: "...",
        properties: {...}
      }
    ],
    updatedAt: "..."
  },
  
  "gsb:anonymous:session": {
    id: "session-abc123",      // Session ID
    fingerprint: "fp-hash",    // Browser fingerprint
    createdAt: "...",
    lastActive: "...",
    designCount: 2,
    cartCount: 1
  }
}
```

#### 2.2 Auto-Restore Logic

```typescript
// Editor mount olduğunda
onMounted(() => {
  // 1. Check URL params
  const product = route.query.product;
  const surface = route.query.surface || 'front';
  const color = route.query.color || 'white';
  
  // 2. Try to load existing design
  const key = `${product}-${surface}-${color}`;
  const saved = getAnonymousDesign(key);
  
  if (saved && saved.snapshot.items.length > 0) {
    // Ask user: "Restore previous design?"
    if (confirm('Daha önce kaydettiğiniz tasarım var. Yüklemek ister misiniz?')) {
      editorStore.applySnapshot(saved.snapshot);
      editorStore.designId = saved.designId;
    }
  }
  
  // 3. Load cart items (show in UI)
  const cart = getAnonymousCart();
  if (cart.items.length > 0) {
    // Show notification: "Sepetinizde X ürün var"
  }
});
```

#### 2.3 Save on Change

```typescript
// Watch design changes
watch(
  () => editorStore.items,
  debounce(() => {
    const key = `${editorStore.productSlug}-${editorStore.surfaceId}-${editorStore.color}`;
    
    saveAnonymousDesign(key, {
      designId: editorStore.designId || generateAnonymousDesignId(),
      snapshot: editorStore.serializeSnapshot(),
      previewUrl: editorStore.capturePreview(),
    });
    
    console.log('[Anonymous] Design auto-saved:', key);
  }, 2000),
  { deep: true }
);
```

#### 2.4 Cart Add Tracking

```typescript
// editorStore.checkoutWithDesign() içinde
async checkoutWithDesign() {
  // ... existing code ...
  
  // After successful cart add
  if (response.data?.designId) {
    const key = `${this.productSlug}-${this.surfaceId}-${this.color}`;
    
    // Mark design as "in cart"
    updateAnonymousDesign(key, { inCart: true });
    
    // Add to cart tracking
    addToAnonymousCart({
      designId: response.data.designId,
      variantId: variantId,
      quantity: this.quantity,
      properties: lineItemProperties,
      previewUrl: previewDataUrl,
    });
    
    console.log('[Anonymous] Added to cart tracking');
  }
}
```

---

### SEVİYE 3: BACKEND ANONYMOUS SESSION (OPSIYONEL)

#### 3.1 Database Schema

```prisma
// prisma/schema.prisma

model AnonymousSession {
  id           String   @id @default(uuid())
  fingerprint  String   @unique  // Browser fingerprint hash
  ipHash       String?            // Hashed IP (privacy)
  userAgent    String?
  createdAt    DateTime @default(now())
  lastActiveAt DateTime @updatedAt
  designs      AnonymousDesign[]
  
  @@index([fingerprint])
  @@index([lastActiveAt])
}

model AnonymousDesign {
  id               String            @id @default(uuid())
  sessionId        String
  session          AnonymousSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  productSlug      String
  surfaceId        String
  snapshot         Json              // Design data
  previewUrl       String?
  addedToCart      Boolean           @default(false)
  cartAddedAt      DateTime?
  
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  @@unique([sessionId, productSlug, surfaceId])
  @@index([sessionId, updatedAt])
}
```

#### 3.2 Backend API

```typescript
// server/src/routes/anonymous.ts (YENİ)

/**
 * POST /api/anonymous/session
 * Create or retrieve anonymous session
 */
anonymousRouter.post("/session", async (req, res) => {
  const { fingerprint, userAgent } = req.body;
  const ipHash = hashIP(req.ip);
  
  // Find or create session
  let session = await prisma.anonymousSession.findUnique({
    where: { fingerprint },
    include: { designs: true }
  });
  
  if (!session) {
    session = await prisma.anonymousSession.create({
      data: { fingerprint, userAgent, ipHash },
      include: { designs: true }
    });
  } else {
    // Update last active
    session = await prisma.anonymousSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
      include: { designs: true }
    });
  }
  
  res.json({ data: session });
});

/**
 * POST /api/anonymous/designs
 * Save anonymous design to backend
 */
anonymousRouter.post("/designs", async (req, res) => {
  const { sessionId, productSlug, surfaceId, snapshot, previewUrl } = req.body;
  
  const design = await prisma.anonymousDesign.upsert({
    where: {
      sessionId_productSlug_surfaceId: {
        sessionId,
        productSlug,
        surfaceId
      }
    },
    create: {
      sessionId,
      productSlug,
      surfaceId,
      snapshot,
      previewUrl
    },
    update: {
      snapshot,
      previewUrl,
      updatedAt: new Date()
    }
  });
  
  res.json({ data: design });
});

/**
 * GET /api/anonymous/designs/:sessionId
 * Get all designs for anonymous session
 */
anonymousRouter.get("/designs/:sessionId", async (req, res) => {
  const designs = await prisma.anonymousDesign.findMany({
    where: { sessionId: req.params.sessionId },
    orderBy: { updatedAt: 'desc' }
  });
  
  res.json({ data: designs });
});
```

**Avantajlar:**
- ✅ Cross-device sync (fingerprint based)
- ✅ Çerez temizlense bile recover edilebilir
- ✅ Backend'de audit trail

**Dezavantajlar:**
- ❌ Privacy concerns (GDPR)
- ❌ Database büyümesi
- ❌ Cleanup job gerekli

---

## 📊 ÖNCELİK MATRISI

| Özellik | Öncelik | Süre | Etki |
|---------|---------|------|------|
| **Layout/Route fix** | 🔴 CRITICAL | 1-2 saat | Yönlendirme düzelir |
| **Shop param detection** | 🔴 CRITICAL | 30 dk | Customer vs Embedded ayırımı |
| **Multi-design storage** | 🟡 HIGH | 2-3 saat | Birden fazla tasarım saklanır |
| **Cart tracking** | 🟡 HIGH | 2-3 saat | Sepet hafızası |
| **Parent listener snippet** | 🟡 HIGH | 1-2 saat | iframe storage çalışır |
| **Auto-restore UI** | 🟢 MEDIUM | 2 saat | UX iyileşir |
| **Backend session** | 🔵 LOW | 1-2 gün | Cross-device sync |
| **Fingerprinting** | 🔵 LOW | 4-6 saat | Advanced tracking |

---

## 🎯 ÖNERILEN İMPLEMENTASYON PLANI

### PHASE 1: ACİL DÜZELTMEer (2-3 saat)

**1.1 Shop Param Context Detection**

```typescript
// src/plugins/1.router/guards.ts

const shop = urlParams.get('shop');
const host = urlParams.get('host');
const embedded = urlParams.get('embedded');

const isEmbeddedContext = Boolean(host || embedded === '1');
const isCustomerStorefront = to.path.includes('/editor') && 
                             shop && !host && !embedded;

if (isCustomerStorefront) {
  // Force editor layout for customer storefront
  to.meta = { ...to.meta, layout: 'editor', public: true };
  return;
}
```

**1.2 Layout Override**

```typescript
// src/App.vue veya Router setup

router.beforeEach((to) => {
  // Detect customer storefront before any other logic
  if (to.path.includes('/editor') || to.path.includes('/apps/gsb/editor')) {
    const shop = to.query.shop;
    const host = to.query.host;
    
    if (shop && !host) {
      // Customer storefront
      to.meta.layout = 'editor';
      to.meta.public = true;
      console.log('[Router] Customer storefront detected, using editor layout');
    }
  }
});
```

**1.3 Session Plugin Priority**

```typescript
// src/plugins/3.session.ts

// ÖNCE shop param check
const shop = urlParams.get('shop');
const host = urlParams.get('host');

const isCustomerStorefront = shop && !host;

if (isCustomerStorefront) {
  console.log('[SessionPlugin] ⏭️ Customer storefront - skipping init');
  useSessionStore(store); // Register only
  return;
}
```

---

### PHASE 2: ANONYMOUS PERSISTENCE (3-4 saat)

**2.1 Multi-Design Storage Composable**

```typescript
// src/composables/useAnonymousDesigns.ts (YENİ)

interface AnonymousDesignRecord {
  designId: string;
  snapshot: any;
  previewUrl?: string;
  inCart: boolean;
  createdAt: string;
  updatedAt: string;
}

const DESIGNS_KEY = 'gsb:anonymous:designs';
const CART_KEY = 'gsb:anonymous:cart';
const SESSION_KEY = 'gsb:anonymous:session';

export function useAnonymousDesigns() {
  // Get design key from context
  function getDesignKey(productSlug: string, surfaceId: string, color: string) {
    return `${productSlug}-${surfaceId}-${color}`;
  }
  
  // Save design
  function saveDesign(key: string, data: Omit<AnonymousDesignRecord, 'updatedAt'>) {
    const designs = getAllDesigns();
    designs[key] = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  }
  
  // Get design
  function getDesign(key: string): AnonymousDesignRecord | null {
    const designs = getAllDesigns();
    return designs[key] || null;
  }
  
  // Get all designs
  function getAllDesigns(): Record<string, AnonymousDesignRecord> {
    try {
      const raw = localStorage.getItem(DESIGNS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  
  // Mark design as in cart
  function markInCart(key: string) {
    const design = getDesign(key);
    if (design) {
      saveDesign(key, { ...design, inCart: true });
    }
  }
  
  // Add to cart tracking
  function addToCart(item: {
    designId: string;
    variantId: string;
    quantity: number;
    properties: Record<string, string>;
  }) {
    const cart = getCart();
    cart.items.push({
      ...item,
      addedAt: new Date().toISOString()
    });
    cart.updatedAt = new Date().toISOString();
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  
  // Get cart
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : { items: [], updatedAt: null };
    } catch {
      return { items: [], updatedAt: null };
    }
  }
  
  // Clear cart (after checkout complete)
  function clearCart() {
    localStorage.removeItem(CART_KEY);
  }
  
  // Cleanup old designs (7 days)
  function cleanup() {
    const designs = getAllDesigns();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    Object.entries(designs).forEach(([key, design]) => {
      const age = now - new Date(design.updatedAt).getTime();
      if (age > maxAge && !design.inCart) {
        delete designs[key];
      }
    });
    
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  }
  
  return {
    saveDesign,
    getDesign,
    getAllDesigns,
    markInCart,
    addToCart,
    getCart,
    clearCart,
    cleanup,
    getDesignKey
  };
}
```

**2.2 Editor Integration**

```typescript
// src/modules/editor/components/EditorShell.vue onMounted

import { useAnonymousDesigns } from '@/composables/useAnonymousDesigns';

const { getDesign, saveDesign, getDesignKey } = useAnonymousDesigns();

onMounted(() => {
  // Get context from URL
  const product = route.query.product as string;
  const variantId = route.query.variantId as string;
  
  if (product) {
    editorStore.setProduct(product);
    
    // Try to restore previous design
    const key = getDesignKey(
      editorStore.productSlug,
      editorStore.surfaceId,
      editorStore.color
    );
    
    const saved = getDesign(key);
    
    if (saved && saved.snapshot.items?.length > 0) {
      // Show restore prompt
      const restore = confirm(
        'Bu ürün için daha önce bir tasarım yapmıştınız. Kaldığınız yerden devam etmek ister misiniz?'
      );
      
      if (restore) {
        editorStore.applySnapshot(saved.snapshot);
        editorStore.designId = saved.designId;
        console.log('[Anonymous] Design restored from localStorage');
      }
    }
  }
});

// Auto-save on changes
watch(
  () => editorStore.items,
  debounce(() => {
    const sessionStore = useSessionStore();
    
    // Skip for authenticated users (backend handles)
    if (sessionStore?.isAuthenticated) return;
    
    const key = getDesignKey(
      editorStore.productSlug,
      editorStore.surfaceId,
      editorStore.color
    );
    
    saveDesign(key, {
      designId: editorStore.designId || generateAnonymousDesignId(),
      snapshot: editorStore.serializeSnapshot(),
      previewUrl: editorStore.capturePreview(),
      inCart: false,
      createdAt: new Date().toISOString()
    });
  }, 2000),
  { deep: true }
);
```

---

### PHASE 3: PARENT LISTENER (1-2 saat)

**3.1 Liquid Snippet**

`extensions/gsb-customizer-v52/snippets/gsb-parent-listener.liquid` oluştur

**3.2 Theme'e Ekle**

```liquid
<!-- theme.liquid veya sections/header.liquid -->
{% render 'gsb-parent-listener' %}
```

**3.3 Şu an için:**

Parent listener **gerekmeyebilir** çünkü:
- Editor `_blank` ile açılıyor (iframe değil)
- localStorage direkt kullanılabilir

**Eğer iframe mode istiyorsanız:**
- Button'u `_self` yap
- iframe içinde aç
- Parent listener SON

UÇ GEREKLI!

---

## 🔍 ASIL SORUNUN KÖK NEDENİ

### ❌ YANLIŞ TEŞHİS:
"Password protection engelliyor"

### ✅ GERÇEK SORUN:
"Shop param var + host yok → Shopify embedded sanıyor → Admin'e yönlendiriyor"

**Kanıt:**

**Şu anki URL:**
```
https://app.gsb-engine.dev/apps/gsb/editor?product=x&shop=we-dream-studio.myshopify.com
                                                         ↑
                                                    Bu var!
```

**shopify-embedded.vue (satır 551-561):**
```typescript
if (!isInIframe.value && shopDomain.value) {
  // shopDomain = 'we-dream-studio.myshopify.com' ✅
  // isInIframe = false ✅ (_blank ile açıldığı için)
  // → "Embedded olmalıydı, redirect et!"
  window.top.location.replace(admin URL); ← BURASI ÇALIŞIYOR!
}
```

---

## 💡 EN KOLAY ÇÖZÜM (1 SAAT)

### Fix 1: Shop Param Olmadan Aç (TAVSİYE!)

**Button değişikliği:**
```liquid
<!-- ESKİ -->
onclick="window.open('https://app.gsb-engine.dev/apps/gsb/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}&shop={{ shop.permanent_domain }}', '_blank')"

<!-- YENİ -->
onclick="window.open('https://app.gsb-engine.dev/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}', '_blank')"
```

**Ne değişti:**
- ❌ `/apps/gsb/editor` → Server proxy path (unnecessary)
- ✅ `/editor` → Direct Vue route
- ❌ `&shop=...` param kaldırıldı → Embedded context sanmaz!

**Bu basit değişiklik:**
- ✅ Yönlendirme sorununu çözer
- ✅ Editor layout kullanır
- ✅ Anonymous user çalışır
- ✅ localStorage accessible

---

### Fix 2: Context Detection İyileştirme

**Router guard:**
```typescript
// src/plugins/1.router/guards.ts (satır 9'dan sonra)

router.beforeEach(to => {
  // 1. Editor paths - always allow
  const isEditorPath = to.path === '/editor' || 
                       to.path.startsWith('/editor?') ||
                       to.path.startsWith('/apps/gsb/editor');
  
  if (isEditorPath) {
    // 2. Detect context type
    const shop = to.query.shop as string;
    const host = to.query.host as string;
    const embedded = to.query.embedded as string;
    
    // 3. Customer storefront (not embedded)
    const isCustomerContext = shop && !host && !embedded;
    
    if (isCustomerContext || !shop) {
      // Force editor layout
      to.meta = { ...to.meta, layout: 'editor', public: true };
      console.log('[Router] Customer/Standalone context - editor layout');
    }
    
    // 4. Allow navigation
    return;
  }
  
  // ... rest of guards
});
```

---

## 🎯 ANONYMOUS USER FLOW (COMPLETE)

### SENARYO 1: İLK ZİYARET

```
1. Customer → Product page
   - https://we-dream-studio.myshopify.com/products/tshirt
   
2. Customize button click
   - Opens: https://app.gsb-engine.dev/editor?product=tshirt
   
3. Editor load
   - Route: /editor
   - Layout: editor ✅
   - Public: true ✅
   - Session: skipped ✅
   
4. localStorage check
   - Key: 'gsb:anonymous:design'
   - Result: null (ilk ziyaret)
   
5. Fresh canvas
   - Empty design
   - Default product settings
   
6. User designs
   - Adds text, images
   - Auto-save → localStorage (2 secs debounce)
   
7. Checkout
   - capturePreview()
   - POST /api/proxy/cart
   - → Anonymous design created (backend)
   - → designId returned
   - → localStorage updated with designId
   - → Redirect to Shopify cart
```

### SENARYO 2: İKİNCİ ZİYARET (AYNI ÜRÜN)

```
1. Customer → Product page (same product)
   
2. Customize button click
   - Opens: https://app.gsb-engine.dev/editor?product=tshirt
   
3. Editor load
   
4. localStorage check
   - Key: 'gsb:anonymous:design'
   - Result: { items: [...], updatedAt: "..." } ✅
   
5. Auto-restore
   - Confirm dialog: "Restore previous design?"
   - User: "Yes"
   - editorStore.applySnapshot(saved)
   - **Son tasarım yüklendi!** ✅
   
6. Continue editing
   - User düzenler
   - Auto-save continues
```

### SENARYO 3: FARKLI ÜRÜN

```
1. Customer → Different product page
   - https://we-dream-studio.myshopify.com/products/hoodie
   
2. Customize button click
   - Opens: https://app.gsb-engine.dev/editor?product=hoodie
   
3. localStorage check
   - Key: 'gsb:anonymous:design'
   - Result: { productSlug: "tshirt", ... } (eski ürün)
   
4. Product mismatch
   - if (saved.productSlug !== route.query.product) {
       // Different product, don't restore
     }
   
5. Fresh canvas for hoodie
   - **Eski tshirt tasarımı kaybolur!** ❌
   
6. ÇÖZÜM: Multi-design storage
   - Key: 'gsb:anonymous:designs' (plural)
   - { "tshirt-front-white": {...}, "hoodie-front-black": {...} }
   - Her ürün ayrı saklanır ✅
```

### SENARYO 4: SEPETE EKLEME VE DEVAM

```
1. User tshirt customize eder
   
2. Checkout → Cart add
   - designId: "anon-123"
   - Cart tracking:
     localStorage['gsb:anonymous:cart'] = {
       items: [{ designId: "anon-123", variantId: "gid://...", ... }]
     }
   
3. Shopify cart'a eklenir
   
4. User geri döner, hoodie customize eder
   
5. Hoodie checkout
   - Cart tracking updated:
     items: [
       { designId: "anon-123", ... }, // tshirt
       { designId: "anon-456", ... }  // hoodie
     ]
   
6. Shopify cart view
   - 2 item görünür
   - Her birinin preview'ı var
   - Properties var
```

---

## 🏗️ ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER STOREFRONT                       │
│  https://we-dream-studio.myshopify.com/products/tshirt      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Customize Button Click
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    EDITOR (New Tab/Window)                   │
│  https://app.gsb-engine.dev/editor?product=tshirt            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Route Detection                                     │ │
│  │    - Path: /editor                                     │ │
│  │    - Query: product=tshirt, shop=undefined, host=no    │ │
│  │    - Layout: 'editor' (forced)                         │ │
│  │    - Public: true                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 2. Session Plugin                                      │ │
│  │    - Detect: path.includes('/editor')                  │ │
│  │    - Action: Skip session init                         │ │
│  │    - Store: Register only (no auth)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 3. Router Guard                                        │ │
│  │    - Editor path: Bypass auth check                    │ │
│  │    - Allow: All users (anonymous + auth)               │ │
│  └────────────────────────────────────────────────────────┘ │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 4. EditorShell Mount                                   │ │
│  │    ┌─────────────────────────────────────────────────┐ │ │
│  │    │ A. Check localStorage                           │ │ │
│  │    │    - Key: gsb:anonymous:design                  │ │ │
│  │    │    - Result: Saved design or null               │ │ │
│  │    └─────────────────────────────────────────────────┘ │ │
│  │                     ↓                                   │ │
│  │    ┌─────────────────────────────────────────────────┐ │ │
│  │    │ B. Restore or Fresh                             │ │ │
│  │    │    if (saved && product matches) {              │ │ │
│  │    │      editorStore.applySnapshot(saved)           │ │ │
│  │    │    } else {                                      │ │ │
│  │    │      // Fresh canvas                            │ │ │
│  │    │    }                                             │ │ │
│  │    └─────────────────────────────────────────────────┘ │ │
│  │                     ↓                                   │ │
│  │    ┌─────────────────────────────────────────────────┐ │ │
│  │    │ C. Setup Autosave Watcher                       │ │ │
│  │    │    watch(items) {                                │ │ │
│  │    │      debounce(2000) {                            │ │ │
│  │    │        localStorage.setItem(...)                 │ │ │
│  │    │      }                                            │ │ │
│  │    │    }                                              │ │ │
│  │    └─────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 5. User Edits Design                                   │ │
│  │    - Add text, images, shapes                          │ │
│  │    - Every change triggers autosave (2 sec debounce)   │ │
│  │    - localStorage continuously updated                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 6. Checkout                                            │ │
│  │    - Capture preview (screenshot)                      │ │
│  │    - POST /api/proxy/cart (anonymous OK!)              │ │
│  │    - Backend creates design (userId: null)             │ │
│  │    - Returns: { designId, checkoutUrl }                │ │
│  │    - Update localStorage with designId                 │ │
│  │    - Redirect to Shopify cart                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    SHOPIFY CART                              │
│  https://we-dream-studio.myshopify.com/cart                  │
│                                                              │
│  - Item: Custom Tshirt                                       │
│  - Properties:                                               │
│    * Design ID: anon-123                                     │
│    * Preview: (thumbnail)                                    │
│    * Technique: DTF                                          │
│    * Sheet Size: 300mm × 400mm                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION CHECKLIST

### PHASE 1: ACİL (BUGÜN - 2-3 SAAT)

- [ ] **1.1** Context detection fix (shop vs host param)
- [ ] **1.2** Router guard iyileştirme
- [ ] **1.3** Session plugin priority
- [ ] **1.4** Button URL fix (shop param kaldır veya context detection)
- [ ] **TEST:** Customer storefront → Editor açılmalı (admin redirect YOK)

### PHASE 2: PERSISTENCE (YARIN - 3-4 SAAT)

- [ ] **2.1** `useAnonymousDesigns.ts` composable
- [ ] **2.2** Multi-design storage
- [ ] **2.3** Cart tracking
- [ ] **2.4** Auto-restore prompt
- [ ] **2.5** EditorShell integration
- [ ] **TEST:** Design → Checkout → Yeni design → Geri dön → İlk design restore edilmeli

### PHASE 3: UX POLISH (SONRA - 2-3 SAAT)

- [ ] **3.1** Restore confirmation dialog (güzel UI)
- [ ] **3.2** Cart items indicator ("Sepetinizde 2 tasarım var")
- [ ] **3.3** Design history UI (son 5 tasarım)
- [ ] **3.4** Cleanup utility (7 gün üstü sil)
- [ ] **TEST:** UX flow smooth olmalı

### PHASE 4: ADVANCED (OPSIYONEL - 1-2 GÜN)

- [ ] **4.1** Backend anonymous session API
- [ ] **4.2** Browser fingerprinting
- [ ] **4.3** Cross-device sync
- [ ] **4.4** Parent listener snippet (eğer iframe mode)
- [ ] **4.5** GDPR compliance (anonymous data retention policy)

---

## 🚨 KRİTİK KARAR NOKTALARI

### KARAR 1: Shop Param Gerekli Mi?

**Evet gerekli ise:**
- ✅ Backend'de tenant detection için kullanılıyor
- ✅ Shopify API calls için shop domain gerekli
- ❌ Ama customer storefront vs embedded ayırımı zor

**Hayır gerekli değil ise:**
- ✅ Yönlendirme sorunu çözülür
- ✅ Layout detection kolay
- ❌ Backend'de tenant bulamayabilir
- ❌ Shopify API calls başarısız olabilir

**ÖNERİM:**
```liquid
<!-- URL'de shop param YOK -->
onclick="window.open('https://app.gsb-engine.dev/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}', '_blank')"

<!-- Backend'de shop detection -->
// server/src/routes/proxy.ts
const shop = req.headers['x-shopify-shop-domain'] ||
             req.headers.referer?.match(/https:\/\/([^/]+)\.myshopify\.com/)?.[1] ||
             null;
```

**Shop bilgisi HTTP headers'dan alınır, URL'den değil!**

---

### KARAR 2: iframe vs New Window?

**iframe Mode (Button: `_self`):**
- ✅ Modal experience (Shopify modal gibi)
- ✅ Parent window context var
- ❌ localStorage blocked (sandboxed iframe)
- ❌ Parent listener gerekli
- ❌ Cross-origin restrictions

**New Window Mode (Button: `_blank`):**
- ✅ Full localStorage access
- ✅ No sandbox restrictions
- ✅ Better UX (dedicated tab)
- ❌ Parent window iletişimi yok
- ❌ Cart add için redirect gerekli

**ŞU AN:** `_blank` kullanıyoruz (iyi!)

**ÖNERİM:** Devam edin `_blank` ile!

---

### KARAR 3: Multi-Design vs Single Design?

**Single Design (Şu an):**
- ✅ Basit
- ✅ Az yer kaplar
- ❌ Sadece 1 tasarım saklanır
- ❌ Kullanıcı farklı ürün customize ederse önceki kaybolur

**Multi-Design (Önerilen):**
- ✅ Her ürün ayrı saklanır
- ✅ Kullanıcı 10 ürün customize edebilir
- ✅ Her birini hatırlar
- ❌ localStorage dolar (limit: ~5MB)
- ❌ Cleanup logic gerekli

**ÖNERİM:** Multi-design yap! (3-4 saat)

---

## 🎬 NEXT STEPS (SIRAYLA)

### ADIM 1: IMMEDIATE FIX (30 DK)

**Button URL değiştir:**
```liquid
'https://app.gsb-engine.dev/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}'
```

**Test et:**
- Hala admin'e yönlendiriyor mu?
- Evet ise → Router guard fix gerekli
- Hayır ise → ÇÖZÜLDÜ! ✅

---

### ADIM 2: CONTEXT DETECTION FIX (1 SAAT)

**Eğer hala yönlendiriyorsa:**

```typescript
// src/plugins/1.router/guards.ts

const isEditorPath = to.path.includes('/editor');
const shop = to.query.shop;
const host = to.query.host;

if (isEditorPath && (!shop || (shop && !host))) {
  // Customer/Standalone context
  to.meta = { layout: 'editor', public: true };
  return;
}
```

---

### ADIM 3: MULTI-DESIGN STORAGE (3 SAAT)

**useAnonymousDesigns.ts** composable oluştur

**EditorShell.vue** entegre et

**Test:** Multiple products → Her biri restore edilmeli

---

### ADIM 4: CART TRACKING (2 SAAT)

**localStorage cart** implementasyonu

**Checkout'ta update** et

**UI indicator** ekle

---

## 📊 ÖZET TABLO

| Sistem | Durum | Çalışıyor mu? | Sorun | Fix Süresi |
|--------|-------|---------------|-------|------------|
| **Session Skip** | ✅ Var | ✅ Evet | - | - |
| **Auth Bypass** | ✅ Var | ✅ Evet | - | - |
| **Backend Anonymous** | ✅ Var | ✅ Evet | - | - |
| **LocalStorage Save** | ✅ Var | ✅ Evet | Single design only | 3 saat |
| **LocalStorage Restore** | ✅ Var | ⚠️ Kısmen | Product match gerekli | 1 saat |
| **Layout Detection** | ⚠️ Var | ❌ Hayır | Shop param → Embedded sanıyor | **30 dk** |
| **Admin Redirect** | ❌ Bug | ❌ Active | shopify-embedded.vue logic | **30 dk** |
| **Cart Tracking** | ❌ Yok | ❌ Hayır | Not implemented | 2 saat |
| **Multi-Design** | ❌ Yok | ❌ Hayır | Not implemented | 3 saat |
| **Parent Listener** | ⚠️ Var | ❌ Hayır | Liquid snippet missing | 1 saat |

---

## 🎯 EN KRİTİK FİX (HEMEN!)

### ÇÖZÜM A: Shop Param Kaldır (TAVSİYE!)

```liquid
<!-- Button -->
onclick="window.open('https://app.gsb-engine.dev/editor?product={{ product.handle }}&variantId={{ gsb_variant.id }}', '_blank')"

<!-- Backend shop detection -->
// Referer header'dan al
const referer = req.headers.referer;
const shop = referer?.match(/https:\/\/([^/]+)\.myshopify\.com/)?.[1];
```

**Süre:** 15 dakika  
**Etki:** Admin redirect düzelir ✅

---

### ÇÖZÜM B: Context Detection (ALTERNATİF)

```typescript
// Router guard
const isCustomerStorefront = 
  to.path.includes('/editor') && 
  to.query.shop && 
  !to.query.host &&
  !to.query.embedded;

if (isCustomerStorefront) {
  to.meta = { layout: 'editor', public: true };
  return;
}
```

**Süre:** 30 dakika  
**Etki:** Admin redirect düzelir ✅

---

## 🎉 BEKLENİLEN SONUÇ

### Senaryo: Anonim Customer

```
1. ✅ Product page → Customize button
2. ✅ New tab opens (app.gsb-engine.dev/editor)
3. ✅ Editor loads (NO LOGIN!)
4. ✅ localStorage check → Restore if exists
5. ✅ User edits design
6. ✅ Auto-save to localStorage (2 sec)
7. ✅ Checkout → POST /api/proxy/cart
8. ✅ Design saved (backend, userId: null)
9. ✅ Cart tracking (localStorage)
10. ✅ Redirect to Shopify cart
11. ✅ User returns → Restore previous design
12. ✅ Admin redirect YOK! ✅
```

---

## ❓ KARAR ALMAK İÇİN SORULAR

1. **Shop param gerekli mi?**
   - Evet → Context detection fix
   - Hayır → URL'den kaldır (TAVSİYE)

2. **Multi-design storage istiyor musunuz?**
   - Evet → 3 saat implementation
   - Hayır → Single design yeterli

3. **Cart tracking istiyor musunuz?**
   - Evet → 2 saat implementation
   - Hayır → Sadece active design

4. **iframe mode mu new window mu?**
   - iframe → Parent listener gerekli
   - New window → Mevcut yeterli (TAVSİYE)

---

## 🚀 ŞİMDİ YAPILACAK

**Size bu raporu sundum. Karar verin:**

**A)** Sadece admin redirect fix (30 dk)  
**B)** Full anonymous system (Phase 1-3, toplam 8-10 saat)  
**C)** Custom plan (hangi özellikleri istediğinizi söyleyin)

**Ben önce hangi fix'i yapalım?** 🎯

