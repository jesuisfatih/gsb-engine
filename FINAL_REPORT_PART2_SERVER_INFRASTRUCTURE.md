# 🖥️ PART 2: SUNUCU ALTYAPISI VE BAĞIMLILIKLAR

## 🔐 SUNUCU GİRİŞ BİLGİLERİ

### SSH Bağlantı

**IP Adresi:** `46.224.20.228`  
**Kullanıcı:** `root`  
**SSH Key:** `C:\Users\mhmmd\.ssh\id_ed25519`  
**Bağlantı Komutu:**
```bash
ssh root@46.224.20.228 -i "C:\Users\mhmmd\.ssh\id_ed25519"
```

###Proje Dizini

**Konum:** `/srv/gsb/api`  
**Git Branch:** `deploy/gsb-20251101-pnpm`  
**Git Remote:** `git@github.com:jesuisfatih/gsb-engine.git`

---

## 🐳 DOCKER SERVİSLERİ

### Aktif Container'lar

**Output: `docker compose ps`**

```
NAME        IMAGE         STATUS                  PORTS
api-app-1   node:20       Up 28 minutes           127.0.0.1:4000->4000/tcp
api-db-1    postgres:16   Up 22 hours (healthy)   0.0.0.0:5432->5432/tcp
```

### Service: app (Backend + Frontend)

**Image:** `node:20`  
**Working Dir:** `/app`  
**Mount:** `/srv/gsb/api:/app` (bind mount)  
**Port:** `127.0.0.1:4000:4000` (localhost only)  
**Command:**
```bash
corepack enable && \
corepack prepare pnpm@9 --activate && \
pnpm install --no-frozen-lockfile && \
pnpm prisma generate && \
pnpm run api:dev
```

**Environment:**
```
NODE_ENV=development
COREPACK_ENABLE_DOWNLOAD_PROMPT=0
```

**Dependencies:**
- `db` service (health check wait)

**Restart Policy:** `unless-stopped`

---

### Service: db (PostgreSQL)

**Image:** `postgres:16`  
**Data Volume:** `/mnt/pgdata:/var/lib/postgresql/data`  
**Port:** `0.0.0.0:5432:5432` (public - ⚠️ firewall gerekli!)  
**Database:** `gibi`  
**User:** `postgres`  
**Password:** `12991453`

**Health Check:**
```bash
pg_isready -U postgres -d gibi
# Interval: 5s
# Timeout: 5s
# Retries: 20
```

**Restart Policy:** `unless-stopped`

---

## 🌐 WEB SERVER (Caddy)

### Systemd Service

**Service:** `caddy.service`  
**Status:** `active (running)` (21 hours uptime)  
**Config:** `/etc/caddy/Caddyfile`  
**Binary:** `/usr/bin/caddy`  
**PID:** 850

### Port Bindings

```
tcp6  :::80   → Caddy (HTTP)
tcp6  :::443  → Caddy (HTTPS)
```

### Caddyfile Configuration

**File:** `/etc/caddy/Caddyfile`

#### Block 1: app.gsb-engine.dev (Main Domain)

```caddyfile
app.gsb-engine.dev {
    encode zstd gzip
    
    # CSP for Shopify iframe
    header Content-Security-Policy "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;"
    
    route {
        # 1. App Proxy (Shopify storefront)
        reverse_proxy /apps/gsb/* 127.0.0.1:4000
        
        # 2. API routes
        reverse_proxy /api/* 127.0.0.1:4000
        
        # 3. Static files + SPA fallback
        root * /srv/gsb/api/dist
        try_files {path} /index.html
        file_server
    }
}
```

**Route Priority:**
1. `/apps/gsb/*` → Backend (proxy router)
2. `/api/*` → Backend (API router)
3. `/*` → Static files (dist folder)

**SSL:** Auto (Let's Encrypt via Caddy)

#### Block 2: api.gsb-engine.dev (Optional API Subdomain)

```caddyfile
api.gsb-engine.dev {
    encode zstd gzip
    header Access-Control-Allow-Origin "https://app.gsb-engine.dev"
    header Access-Control-Allow-Credentials "true"
    reverse_proxy 127.0.0.1:4000
}
```

**Status:** ⚠️ **DNS not configured** (NXDOMAIN error in logs)

---

## 🔌 NETWORK PORTS

### Listening Ports (netstat)

```
PORT    SERVICE         ACCESS          PROCESS
4000    Backend API     127.0.0.1 only  Docker (api-app-1)
5432    PostgreSQL      0.0.0.0 (ALL)   Docker (api-db-1)
80      HTTP            ALL (IPv6)      Caddy
443     HTTPS           ALL (IPv6)      Caddy
53      DNS             127.0.0.x       systemd-resolved
```

**Security:**
- ✅ Backend (4000): Localhost only
- ⚠️ PostgreSQL (5432): **PUBLIC!** (güvenlik riski!)
- ✅ HTTP/HTTPS: Caddy (public, expected)

**Recommendation:**
```bash
# PostgreSQL'i sadece localhost'a çek
# docker-compose.yml:
ports:
  - "127.0.0.1:5432:5432"  # ← Bu şekilde olmalı!
```

---

## 🔧 ENVIRONMENT VARIABLES

### Backend (.env - Sunucu)

**File:** `/srv/gsb/api/.env`

```bash
# Database
DATABASE_URL=postgresql://postgres:12991453@db:5432/gibi

# Server
PORT=4000
NODE_ENV=development  # ⚠️ Production'da olmalıydı!
JWT_SECRET=gsb-production-jwt-secret-2025-random-key

# Shopify
SHOPIFY_API_KEY=fe2fa282682645ed90c6538ddf50f0e4
SHOPIFY_API_SECRET=shpss_*** (redacted)
SHOPIFY_STORE_DOMAIN=hagbiq-c9.myshopify.com
SHOPIFY_DEFAULT_TENANT_SLUG=hagbiq-c9
SHOPIFY_VALIDATE_SESSION_SIGNATURE=false
SHOPIFY_STOREFRONT_API_VERSION=2024-04

# Frontend (Vite build için)
VITE_SHOPIFY_API_KEY=fe2fa282682645ed90c6538ddf50f0e4
VITE_SHOPIFY_APP_API_KEY=fe2fa282682645ed90c6538ddf50f0e4
```

**⚠️ Uyarılar:**
1. `NODE_ENV=development` → Production'da `production` olmalı
2. Secrets exposed (report'ta visible) → Güvenlik riski
3. `SHOPIFY_STORE_DOMAIN=hagbiq-c9` → Yeni store (eski: we-dream-studio)

---

## 📦 BAĞIMLILIKLAR (Dependencies)

### System Dependencies (Server OS)

```bash
# Node.js
node --version  # v20.x (Docker container içinde)

# pnpm
pnpm --version  # v9.x (corepack ile)

# PostgreSQL
psql --version  # 16.x

# Caddy
caddy version   # v2.x

# Docker
docker --version         # 24.x+
docker compose version   # v2.x+
```

### Node.js Dependencies

**Frontend (package.json):**

**Production:**
- `vue@3.5.14` - Framework
- `vue-router@4.5.1` - Routing
- `pinia@3.0.2` - State management
- `vuetify@3.8.5` - UI framework
- `konva@9.3.22` - Canvas engine
- `vue-konva@3.2.6` - Vue wrapper for Konva
- `@shopify/app-bridge` (CDN'den yükleniyor, package.json'da yok)

**Build Tools:**
- `vite@6.3.5` - Build tool
- `typescript@5.8.3` - Type system
- `@vitejs/plugin-vue@5.2.4` - Vue support
- `unplugin-vue-router@0.8.8` - File-based routing
- `unplugin-auto-import@0.18.6` - Auto imports
- `vite-plugin-vue-meta-layouts@0.5.1` - Layout system

**Backend:**
- `express@5.1.0` - HTTP server
- `@prisma/client@6.18.0` - Database ORM
- `jsonwebtoken@9.0.2` - JWT auth
- `bcryptjs@3.0.2` - Password hashing
- `cors@2.8.5` - CORS middleware
- `cookie-parser@1.4.6` - Cookie parsing
- `zod@4.1.12` - Validation
- `dotenv@17.2.3` - Environment variables

---

## 🔨 BUILD PROCESS

### Production Build

**Command:** `npm run build` (sunucuda)

**Steps:**
```bash
1. vite build
   ↓
2. TypeScript compile (tsc)
   ↓
3. Vue SFC compile
   ↓
4. Asset optimization (images, CSS, JS)
   ↓
5. Bundle splitting
   ↓
6. Output: dist/
   - index.html
   - assets/*.js (chunked)
   - assets/*.css
   - images/
   - models/
```

**Output Location:** `/srv/gsb/api/dist/`

**Build Time:** ~1 min 7 sec (son build)

**Bundle Size:**
- Largest chunk: `index-Dfq-SIkq.js` (1.8 MB)
- Total: ~15 MB (with assets)

---

## 🔒 GÜVENLİK YAPISI

### Aktif Güvenlik Önlemleri

#### 1. JWT Authentication

**File:** `server/src/auth/jwt.ts`

**Token Structure:**
```typescript
{
  sub: userId,
  email: user.email,
  tenantMemberships: [...],
  iat: timestamp,
  exp: timestamp + 15min
}
```

**Secret:** `JWT_SECRET` env variable  
**Algorithm:** HS256  
**Expiry:** 15 minutes

#### 2. Shopify Session Token Validation

**File:** `server/src/shopify/sessionToken.ts`

**Validation:** DISABLED ⚠️
```
SHOPIFY_VALIDATE_SESSION_SIGNATURE=false
```

**⚠️ Risk:** Development için OK, production'da `true` olmalı!

#### 3. CORS Policy

**File:** `server/src/app.ts` satır 35

```typescript
cors({ origin: true, credentials: true })
```

**⚠️ Risk:** `origin: true` = Tüm origin'lere izin! Production'da kısıtlı olmalı:

```typescript
cors({ 
  origin: [
    'https://app.gsb-engine.dev',
    'https://admin.shopify.com',
    /https:\/\/[^\/]+\.myshopify\.com$/
  ],
  credentials: true 
})
```

#### 4. CSP (Content Security Policy)

**File:** `/etc/caddy/Caddyfile` satır 6

```
Content-Security-Policy: frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;
```

**✅ Good:** Shopify iframe embedding allowed

#### 5. Database Access

**Current:**
```
0.0.0.0:5432 → PostgreSQL
```

**⚠️ Risk:** Database publicly accessible!

**Fix:**
```yaml
# docker-compose.yml
ports:
  - "127.0.0.1:5432:5432"  # Localhost only
```

---

## 🗄️ DATABASE YAPISI

### PostgreSQL Configuration

**Host:** `db` (Docker network internal)  
**Port:** `5432`  
**Database:** `gibi`  
**User:** `postgres`  
**Password:** `12991453`  
**Data Location:** `/mnt/pgdata` (host volume)

### Prisma Schema

**File:** `prisma/schema.prisma`

**Key Models:**
- `Tenant` - Multi-tenant workspaces
- `User` - Users
- `TenantUser` - User-tenant relationships
- `DesignDocument` - Designs
- `Order` - Orders
- `Product` - Products
- `Template` - Templates
- `GangSheet` - Gang sheets
- `BillingCharge` - Billing
- `WebhookLog` - Webhook logs
- `AuditLog` - Audit trail

**Migrations:** 11 migrations applied (001-011)

---

## ⚙️ DEPLOYMENT FLOW

### Current Deployment (Sunucuda)

```bash
# 1. SSH connect
ssh root@46.224.20.228 -i "C:\Users\mhmmd\.ssh\id_ed25519"

# 2. Navigate
cd /srv/gsb/api

# 3. Pull latest code
git pull origin deploy/gsb-20251101-pnpm

# 4. Build frontend
npm run build  # or: pnpm build

# 5. Restart application
docker compose restart app

# 6. Verify
curl http://localhost:4000/api/health
```

**Build artifacts:**
- `/srv/gsb/api/dist/` - Static files
- `/srv/gsb/api/dist/index.html` - SPA entry point
- `/srv/gsb/api/dist/assets/` - JS/CSS bundles

### Extension Deployment

```bash
# Sunucuda
cd /srv/gsb/api
shopify app deploy --force
```

**Output:**
- Extension version: vuexy-vuejs-admin-template-64
- Shopify Dashboard: App version published
- Theme update: Automatic (app extension)

---

## 🔑 API KEYS & SECRETS

### Shopify App Credentials

**App Name:** Gang Sheet Builder By USA  
**Client ID:** `fe2fa282682645ed90c6538ddf50f0e4`  
**Client Secret:** `shpss_***` (env variable)  
**Store:** `hagbiq-c9.myshopify.com` (yeni store)

### Application URLs

**App URL:** `https://app.gsb-engine.dev`  
**API URL:** `https://app.gsb-engine.dev/api`  
**App Proxy:** `https://[store].myshopify.com/apps/gsb/*`

**OAuth Redirect URLs:**
- `https://app.gsb-engine.dev/api/auth/callback`
- `https://app.gsb-engine.dev/shopify/embedded`

### Access Scopes

```
read_orders
write_orders
read_products
write_products
```

---

## 🚨 SUNUCUDA OLASI SORUNLAR & ÇÖZ

ÜMLER

### Sorun 1: PORT 4000 Kullanımda

**Semptom:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Çözüm:**
```bash
# Eski process'i bul ve kill et
lsof -i :4000
kill -9 <PID>

# Docker restart
docker compose restart app
```

---

### Sorun 2: Build Başarısız (Out of Memory)

**Semptom:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Çözüm:**
```bash
# Node.js heap size artır
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# veya docker-compose.yml'de:
environment:
  NODE_OPTIONS: "--max-old-space-size=4096"
```

---

### Sorun 3: Prisma Generate Fail

**Semptom:**
```
Error: Generator "client" failed:
Could not find a schema.prisma file
```

**Çözüm:**
```bash
cd /srv/gsb/api
ls prisma/schema.prisma  # Dosya var mı kontrol et
pnpm prisma generate --schema=./prisma/schema.prisma
```

---

### Sorun 4: Database Connection Refused

**Semptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Çözüm:**
```bash
# Database container çalışıyor mu?
docker compose ps db

# Health check geç mi?
docker compose logs db | tail -50

# Manuel connect test
docker exec -it api-db-1 psql -U postgres -d gibi

# Restart
docker compose restart db
docker compose restart app
```

---

### Sorun 5: Caddy Config Syntax Error

**Semptom:**
```
Error: adapting config using caddyfile: ...
```

**Çözüm:**
```bash
# Config test
caddy validate --config /etc/caddy/Caddyfile

# Reload (syntax OK ise)
systemctl reload caddy

# Restart (son çare)
systemctl restart caddy

# Logs
journalctl -u caddy -f
```

---

### Sorun 6: Disk Dolu

**Semptom:**
```
ENOSPC: no space left on device
```

**Çözüm:**
```bash
# Disk usage kontrol
df -h

# Docker cleanup
docker system prune -a
docker volume prune

# Log cleanup
journalctl --vacuum-time=7d

# Node modules cleanup (dikkatli!)
cd /srv/gsb/api
rm -rf node_modules
pnpm install
```

---

### Sorun 7: pnpm Lock File Conflict

**Semptom:**
```
 ERR_PNPM_OUTDATED_LOCKFILE
```

**Çözüm:**
```bash
# Lockfile güncelle
pnpm install --no-frozen-lockfile

# veya
rm pnpm-lock.yaml
pnpm install
```

---

## 📊 MONITORING & LOGS

### Application Logs

**Backend (Express):**
```bash
# Docker logs
docker compose logs app -f --tail=50

# Grep errors
docker compose logs app | grep -i error

# Today's logs
docker compose logs app --since "2025-11-02T00:00:00"
```

**Database:**
```bash
docker compose logs db -f --tail=20
```

**Caddy:**
```bash
journalctl -u caddy -f
journalctl -u caddy --since "1 hour ago"
```

### Health Check Endpoints

**Backend:**
```bash
curl http://localhost:4000/api/health
# Response: {"status":"ok","env":"development","timestamp":"..."}
```

**Frontend (via Caddy):**
```bash
curl https://app.gsb-engine.dev/
# Response: HTML (index.html)
```

---

## 🔄 RESTART PROCEDURES

### Graceful Restart (Önerilen)

```bash
ssh root@46.224.20.228 -i "C:\Users\mhmmd\.ssh\id_ed25519"
cd /srv/gsb/api

# Pull latest
git pull origin deploy/gsb-20251101-pnpm

# Build
npm run build

# Restart
docker compose restart app

# Verify
curl http://localhost:4000/api/health
```

### Full Restart (Sorun varsa)

```bash
# Stop all
docker compose down

# Start (rebuild if needed)
docker compose up -d --build

# Check status
docker compose ps
docker compose logs app --tail=100
```

### Caddy Restart

```bash
# Reload config (zero downtime)
systemctl reload caddy

# Full restart (if needed)
systemctl restart caddy

# Status
systemctl status caddy
```

---

## 🗺️ SERVICE ARCHITECTURE

```
┌──────────────────────────────────────────────┐
│          EXTERNAL (Internet)                  │
│                                              │
│  DNS: app.gsb-engine.dev → 46.224.20.228    │
└──────────────────┬───────────────────────────┘
                   │
                   │ HTTP/HTTPS
                   ↓
┌──────────────────────────────────────────────┐
│          Caddy Web Server (Port 80/443)       │
│          Process: caddy (PID 850)             │
│          Config: /etc/caddy/Caddyfile         │
│                                              │
│  Routes:                                     │
│  • /apps/gsb/* → 127.0.0.1:4000             │
│  • /api/* → 127.0.0.1:4000                  │
│  • /* → /srv/gsb/api/dist (static)          │
└──────────────────┬───────────────────────────┘
                   │
                   │ Reverse Proxy
                   ↓
┌──────────────────────────────────────────────┐
│       Backend API (Port 4000)                 │
│       Docker: api-app-1 (node:20)             │
│       Process: node server/src/main.ts        │
│                                              │
│  Routes:                                     │
│  • /api/auth/* - Authentication              │
│  • /api/health - Health check                │
│  • /api/proxy/* - Shopify proxy              │
│  • /apps/gsb/* - App proxy (same as above)   │
│  • /api/* - Protected API                    │
└──────────────────┬───────────────────────────┘
                   │
                   │ DATABASE_URL
                   ↓
┌──────────────────────────────────────────────┐
│       PostgreSQL (Port 5432)                  │
│       Docker: api-db-1 (postgres:16)          │
│       Data: /mnt/pgdata                       │
│       Database: gibi                          │
└──────────────────────────────────────────────┘
```

---

## 📍 STATIC FILE SERVING

### Caddy → dist Folder

**Request:** `https://app.gsb-engine.dev/`

**Flow:**
```
1. Caddy receives request
2. Checks route matchers:
   - /apps/gsb/* ? No
   - /api/* ? No
   - /* ? Yes! → file_server
3. Serves: /srv/gsb/api/dist/index.html
4. Browser loads HTML
5. HTML requests: /apps/gsb/assets/index-*.js
6. Caddy:
   - /apps/gsb/* ? Yes! → reverse_proxy 4000
7. Backend (Express):
   - app.use("/apps/gsb", proxyRouter)
   - proxyRouter.use(express.static("dist"))
8. Serves: /srv/gsb/api/dist/assets/index-*.js
```

**⚠️ Kompleks:** İlk index.html static, sonra assets backend'den!

---

## 🎯 SUNUCU SAĞLIK DURUMU (ŞU AN)

### ✅ Çalışan Servisler

- ✅ Caddy: Running (21 hours uptime)
- ✅ Backend (app): Running (28 minutes uptime)
- ✅ PostgreSQL (db): Running, Healthy (22 hours uptime)
- ✅ DNS: app.gsb-engine.dev → Resolving
- ✅ SSL: Let's Encrypt certificate active

### ⚠️ Uyarılar

- ⚠️ `NODE_ENV=development` (production olmalı)
- ⚠️ PostgreSQL port public (127.0.0.1'e çekilmeli)
- ⚠️ CORS policy too permissive
- ⚠️ `api.gsb-engine.dev` DNS yok (Caddy error logs)

### ❌ Sorunlar

- ❌ Admin redirect issue (editor açılmıyor)
- ❌ Extension button URL yanlış (`/apps/gsb/editor` + shop param)

