# ANONYMOUS USER TEST REHBERİ

## ✅ MEVCUT DURUM: ANONYMOUS DESTEĞ İ VAR!

### Backend Anonymous Support

**server/src/routes/proxy.ts:**
- ✅ `tenantId` optional
- ✅ `userId` optional
- ✅ Guest/authenticated tracking
- ✅ Anonymous design creation

**server/src/middlewares/authenticate.ts:**
- ✅ `/apps/gsb/` public path
- ✅ No auth required

### Frontend Anonymous Support

**src/plugins/3.session.ts:**
- ✅ Editor path skip session init
- ✅ Store registered but not initialized

**src/plugins/1.router/guards.ts:**
- ✅ Editor path bypass auth guard
- ✅ `/apps/gsb/editor` bypass auth guard

---

## 🧪 TEST SENARYOSU

### Test 1: Admin Panel (Authenticated Context)

**URL:**
```
https://admin.shopify.com/store/we-dream-studio/products
```

**Adımlar:**
1. Product'a git
2. Customize button varsa tıkla
3. Editor açılmalı (embedded iframe)
4. Design yap
5. Checkout

**Beklenen:**
- ✅ Editor açılır
- ✅ Design yapılabilir
- ✅ `tenantId` ve `userId` var
- ✅ Authenticated flow

---

### Test 2: Customer Storefront (Anonymous - ÇA LIŞMAZ)

**URL:**
```
https://we-dream-studio.myshopify.com/products/[product]
```

**Adımlar:**
1. Customize button'a tıkla
2. Password screen gelir ❌
3. Login olunca admin panel'e gider ❌

**Neden çalışmaz:**
- ❌ Development store password protection
- ❌ Kaldırılamaz
- ❌ Customer access blocked

**Çözüm:**
- Paid store ($39/month) veya
- Public app (2-4 hafta sonra $1/month store)

---

### Test 3: Direct Editor URL (Anonymous - ÇALIŞMALI)

**URL:**
```
https://app.gsb-engine.dev/editor?product=x&variantId=y&shop=z
```

**Adımlar:**
1. Browser incognito mode
2. URL'yi aç (direct access)
3. Editor açılmalı
4. Design yap
5. Checkout

**Beklenen:**
- ✅ Editor açılır (no login required)
- ✅ Design yapılabilir
- ✅ `tenantId` NULL, `userId` NULL
- ✅ Anonymous flow (`guest` source)
- ✅ Cart'a eklenebilir

**TEST EDİN! ↑ Bu çalışmalı!**

---

## 🔍 DEBUG: Network Tab

### Başarılı Anonymous Request

```http
POST /api/proxy/cart/prepare
Content-Type: application/json

{
  "snapshot": { ... },
  "previewDataUrl": "data:image/png...",
  "shopifyProductGid": "gid://...",
  "shopifyVariantId": "gid://...",
  "quantity": 1
}
```

**Response:**
```json
{
  "designId": "uuid-123",
  "previewUrl": "https://..."
}
```

**Database check:**
```typescript
// design.metadata.source = 'guest'
// design.tenantId = null
// design.userId = null
```

### Başarısız Request (Auth Required)

```http
POST /api/catalog
Authorization: Bearer xxx

401 Unauthorized
{
  "error": "Authentication required"
}
```

---

## ⚙️ EK İYİLEŞTİRMELER (Opsiyonel)

### 1. Guest Session Tracking

**Frontend localStorage:**
```typescript
// Store guest designs locally
const guestDesigns = JSON.parse(
  localStorage.getItem('gsb:guestDesigns') || '[]'
)
guestDesigns.push(designId)
localStorage.setItem('gsb:guestDesigns', JSON.stringify(guestDesigns))
```

### 2. Guest → User Migration

**Backend logic:**
```typescript
// When guest logs in, claim their designs
await prisma.designDocument.updateMany({
  where: {
    id: { in: guestDesignIds },
    userId: null,
  },
  data: {
    userId: authenticatedUserId,
  }
})
```

### 3. Anonymous Rate Limiting

**Backend middleware:**
```typescript
// Limit anonymous users to 5 designs/hour
const anonymousRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  skip: (req) => Boolean(req.auth), // Skip for authenticated
})

proxyRouter.post("/cart/prepare", anonymousRateLimit, ...)
```

### 4. Guest Design Cleanup

**Cron job:**
```typescript
// Delete anonymous designs older than 7 days
await prisma.designDocument.deleteMany({
  where: {
    userId: null,
    createdAt: {
      lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  }
})
```

---

## 📊 SONUÇ

### ✅ ZATEN VAR
- Backend anonymous support
- Frontend auth bypass
- Guest design creation
- Public API endpoints

### ❌ ÇALIŞMIYOR (Dev Store Nedeniyle)
- Customer storefront access
  → Password protection

### ✅ ÇALIŞMALI
- Direct editor URL access
  → `https://app.gsb-engine.dev/editor?...`

### ⏳ İLERİDE ÇALIŞACAK
- Public app olduktan sonra
  → Paid store'da ($1/month)
  → Password yok
  → Customer storefront ✅

---

## 🎯 ŞİMDİ TEST EDİN

**Direct URL ile test edin:**

```
https://app.gsb-engine.dev/editor?product=test&variantId=123&shop=we-dream-studio.myshopify.com
```

**Incognito mode'da:**
1. Browser → New incognito window
2. URL'yi yapıştır
3. Editor açılmalı (no login!)
4. Network tab → `/api/proxy/cart/prepare` → 200 OK
5. Design yap
6. "Add to cart" bas
7. Shopify checkout'a yönlendirilmeli

**BU ÇALIŞMALI! ✅**

Eğer çalışmıyorsa:
- Console error'ları atın
- Network tab screenshot atın
- Beraber debug edelim

