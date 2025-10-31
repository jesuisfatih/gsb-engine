# 🚀 DEPLOYMENT GUIDE - FINAL SETUP

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Server Environment Variables

**Create/Update `server/.env`:**
```bash
# Database (Create PostgreSQL database first!)
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/gsb_engine"

# Cloudflare R2 (READY!)
R2_ACCESS_KEY_ID="<YOUR_KEY_HERE>"
R2_SECRET_ACCESS_KEY="<YOUR_SECRET_HERE>"

# Shopify Admin API
SHOPIFY_ACCESS_TOKEN="shpat_xxxxxxxxxxxx"
SHOPIFY_API_KEY="xxxxx"
SHOPIFY_API_SECRET="shpss_xxxxx"
SHOPIFY_ADMIN_API_VERSION="2024-01"

# App
NODE_ENV="production"
PORT="3000"
```

---

## 🗄️ DATABASE SETUP

### Step 1: Create PostgreSQL Database
```bash
# Option A: Local PostgreSQL
createdb gsb_engine

# Option B: Supabase (recommended)
# 1. Create project at supabase.com
# 2. Copy connection string
# 3. Update DATABASE_URL in .env
```

### Step 2: Run Prisma Migration
```bash
cd server
npx prisma migrate dev --name init_designs_table
npx prisma generate
```

This creates:
- `designs` table with all fields
- Indexes for performance
- Prisma client

---

## ☁️ CLOUDFLARE R2 SETUP

### Credentials (READY):
```
Account ID: 3b964e63af3f0e752c640e35dab68c9b
Bucket: gsb-power
CDN URL: https://power.gsb-engine.dev
```

### Required ENV:
```bash
R2_ACCESS_KEY_ID="<GET_FROM_CLOUDFLARE_DASHBOARD>"
R2_SECRET_ACCESS_KEY="<GET_FROM_CLOUDFLARE_DASHBOARD>"
```

### How to Get Access Keys:
1. Cloudflare Dashboard → R2
2. Manage R2 API Tokens
3. Create API Token
4. Copy Access Key ID + Secret
5. Add to server/.env

---

## 🔴 UPSTASH REDIS (CONFIGURED!)

**Already configured in code:**
```typescript
// server/src/services/redisCache.ts
const redis = new Redis({
  url: 'https://emerging-bonefish-31758.upstash.io',
  token: 'AXwOAAIncDJjYWY0OGJmZWMyYTk0OTAyYjQ0N2Y2NDJhNzM1ZGJmM3AyMzE3NTg',
});
```

✅ No additional setup needed!

---

## 🛍️ SHOPIFY SETUP

### Get Admin API Access Token:

**Method 1: Custom App (Recommended)**
```
1. Shopify Admin → Settings → Apps and sales channels
2. Develop apps → Create an app
3. App name: "GSB Design Manager"
4. Configure Admin API scopes:
   ✅ read_products
   ✅ write_products
   ✅ read_orders
   ✅ write_orders
   ✅ read_draft_orders
   ✅ write_draft_orders
5. Install app
6. Copy Admin API access token
7. Add to server/.env as SHOPIFY_ACCESS_TOKEN
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Install Dependencies
```bash
# Backend
cd server
npm install

# Frontend (if not done)
cd ..
npm install
```

### Step 2: Configure Environment
```bash
# Copy example
cp server/.env.example server/.env

# Edit with your credentials:
# - DATABASE_URL
# - R2_ACCESS_KEY_ID
# - R2_SECRET_ACCESS_KEY
# - SHOPIFY_ACCESS_TOKEN
```

### Step 3: Database Migration
```bash
cd server
npx prisma migrate deploy  # Production
# OR
npx prisma migrate dev --name init  # Development
```

### Step 4: Build
```bash
# From project root
npm run build
```

### Step 5: Deploy to Server
```bash
git add .
git commit -m "feat: Full backend persistence + R2 + Redis"
git push origin production-stable-v1

# SSH to server
ssh root@46.224.20.228 -i "~/.ssh/id_ed25519"

cd /srv/gsb/api
git pull origin production-stable-v1
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
docker compose restart app
```

---

## ✅ VERIFICATION

### Test Backend Endpoints:
```bash
# Health check
curl https://app.gsb-engine.dev/api/health

# Test design save
curl -X POST https://app.gsb-engine.dev/api/designs/save \
  -H "Content-Type: application/json" \
  -d '{"designId":"test_123","tenantId":"test","productGid":"gid://shopify/Product/123","variantGid":"gid://shopify/Variant/456","snapshot":{}}'

# Should return: { "success": true, "designId": "test_123", ... }
```

### Test Frontend:
```
1. Open https://app.gsb-engine.dev/editor
2. Open DevTools → Application → IndexedDB
3. Should see: GSBDesigns database
4. Create design → Check IndexedDB → Should save locally
5. Wait 30 seconds → Check Network tab → Should sync to backend
```

### Test Shopify Integration:
```
1. Visit Shopify product page with GSB block
2. Click "Customize Your Design"
3. Create design
4. Click "Add to Cart"
5. Check cart → Should have:
   - _Design_ID property
   - _Preview_URL property (CDN link)
   - Sheet Size, Item Count, etc.
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Cannot connect to database"
```
Check:
- DATABASE_URL correct?
- PostgreSQL running?
- Network accessible?

Fix:
psql -U postgres -c "CREATE DATABASE gsb_engine;"
```

### Issue: "R2 upload failed"
```
Check:
- R2_ACCESS_KEY_ID set?
- R2_SECRET_ACCESS_KEY set?
- Bucket exists?

Test:
curl https://power.gsb-engine.dev/test.txt
```

### Issue: "Shopify API 401"
```
Check:
- SHOPIFY_ACCESS_TOKEN correct?
- Admin API scopes granted?
- App installed on store?
```

---

## 📊 MONITORING

### Check Logs:
```bash
# Docker logs
docker compose logs app -f --tail=100

# Should see:
# [Design] Saved: design_abc123
# [Design] Preview uploaded: https://power.gsb-engine.dev/...
# [Shopify] Product fetch success
```

### Check Database:
```bash
cd server
npx prisma studio
# Opens GUI at http://localhost:5555
# Browse designs table
```

### Check Redis:
```bash
# Upstash Console
# https://console.upstash.com/redis/emerging-bonefish-31758
# Monitor commands, memory usage
```

---

## ✅ POST-DEPLOYMENT

### 1. Test Full Flow:
```
Müşteri → Product page → "Customize" → Editor
  → Create design → "Add to Cart"
  → Cart shows design preview
  → Checkout → Order created
  → Tüccar admin → Design preview visible
```

### 2. Monitor Performance:
```
- Design save latency: < 100ms
- Preview upload: < 2 seconds
- Cart add: < 1 second
- IndexedDB: instant
```

### 3. Check Cleanup:
```
- Old sessionStorage designs migrated?
- IndexedDB populated?
- Redis cache warming?
- No console errors?
```

---

**READY TO DEPLOY! 🚀**

