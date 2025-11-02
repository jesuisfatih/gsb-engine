# 🚀 GSB Engine - Production Deployment Guide

**Last Updated:** November 1, 2025  
**Stable Commit:** `03d71325` (deploy/gsb-20251101-pnpm)  
**GitHub Repository:** https://github.com/jesuisfatih/gsb-engine

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Server Setup](#server-setup)
5. [Application Installation](#application-installation)
6. [Database Configuration](#database-configuration)
7. [Environment Variables](#environment-variables)
8. [Build Process](#build-process)
9. [Caddy Web Server](#caddy-web-server)
10. [Docker Deployment](#docker-deployment)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance](#maintenance)

---

## 📊 System Overview

**GSB Engine** is a multi-tenant SaaS platform for gang sheet design and DTF (Direct-to-Film) print management, integrated with Shopify as an embedded app.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Shopify Admin (iframe)                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  app.gsb-engine.dev (Frontend - Vue 3 SPA)         │    │
│  │  - Merchant Dashboard                               │    │
│  │  - Design Editor (Konva.js)                         │    │
│  │  - Gang Sheet Manager                               │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS (Caddy Reverse Proxy)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Caddy Web Server (Port 80/443)                             │
│  ├─ app.gsb-engine.dev                                      │
│  │  ├─ /api/* → localhost:4000 (Backend API)               │
│  │  └─ /* → /srv/gsb/api/dist (Static Frontend)            │
│  └─ api.gsb-engine.dev → localhost:4000                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend API (Docker Container - Port 4000)                 │
│  - Express.js + TypeScript                                  │
│  - Socket.io (Real-time collaboration)                      │
│  - Prisma ORM                                               │
│  └─ Database: PostgreSQL 16 (Port 5432)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Vue.js** | 3.5.14 | Progressive JavaScript framework |
| **Vite** | 6.3.5 | Build tool and dev server |
| **Vuetify** | 3.8.5 | Material Design component library |
| **Pinia** | 3.0.2 | State management |
| **Vue Router** | 4.5.1 | SPA routing |
| **Konva.js** | 9.3.22 | Canvas-based design editor |
| **Three.js** | 0.180.0 | 3D mockup previews |
| **TensorFlow.js** | 4.22.0 | AI quality analysis |
| **Socket.io-client** | 4.8.1 | Real-time collaboration |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | JavaScript runtime |
| **Express.js** | 5.1.0 | Web framework |
| **TypeScript** | 5.8.3 | Type-safe JavaScript |
| **Prisma** | 6.18.0 | Database ORM |
| **PostgreSQL** | 16 | Relational database |
| **Socket.io** | 4.8.1 | WebSocket server |
| **Redis** | latest | Caching & pub/sub |
| **JWT (jose)** | 5.2.3 | Authentication tokens |

### DevOps & Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | latest | Containerization |
| **Docker Compose** | v3 | Multi-container orchestration |
| **Caddy** | 2.6.2 | Web server & reverse proxy |
| **Git** | latest | Version control |

### Shopify Integration
- **Shopify App Bridge** (CDN) - Embedded app framework
- **Shopify Admin API** - Store integration
- **Shopify Storefront API** - Checkout integration
- **App Proxy** - Public storefront embedding

---

## ✅ Prerequisites

### Server Requirements
- **OS:** Ubuntu 20.04+ / Debian 11+ (or compatible Linux)
- **CPU:** 2+ cores recommended
- **RAM:** 4GB minimum, **8GB+ recommended** (for build process)
- **Disk:** 20GB+ free space
- **Network:** Public IP with ports 80, 443, 4000, 5432 accessible

### Required Software
```bash
# Check versions
node --version    # v20.x
npm --version     # v10.x
docker --version  # 20.x+
docker compose version  # v2.x
caddy version     # v2.6.2+
git --version     # 2.x+
```

### Domain Names
- Primary: `app.gsb-engine.dev` (Frontend + Embedded App)
- API: `api.gsb-engine.dev` (Optional, for direct API access)

### DNS Configuration
Point both domains to your server IP:
```
A    app.gsb-engine.dev    →  YOUR_SERVER_IP
A    api.gsb-engine.dev    →  YOUR_SERVER_IP
```

---

## 🖥 Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git build-essential

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version
```

### 2. Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 3. Install Caddy Web Server

```bash
# Install Caddy (official repository)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Verify
caddy version  # Should be 2.6.2+

# Enable and start service
sudo systemctl enable caddy
sudo systemctl start caddy
```

### 4. Create Project Directory

```bash
# Create directory structure
sudo mkdir -p /srv/gsb
sudo chown -R $USER:$USER /srv/gsb
cd /srv/gsb
```

---

## 📥 Application Installation

### 1. Clone Repository

```bash
cd /srv/gsb

# Clone the specific stable commit
git clone https://github.com/jesuisfatih/gsb-engine.git api
cd api

# Checkout the stable deployment branch
git checkout deploy/gsb-20251101-pnpm

# Verify you're on the correct commit
git log -1 --oneline
# Should show: 03d71325 fix: Caddy route directive - Use route block for proper execution order
```

### 2. Install Dependencies

**⚠️ CRITICAL: High Memory Required for Installation**

```bash
cd /srv/gsb/api

# Install dependencies with increased memory
# This prevents Out of Memory errors during postinstall scripts
NODE_OPTIONS="--max-old-space-size=8192" npm install --legacy-peer-deps

# Expected output:
# - ~1600+ packages installed
# - Takes 5-10 minutes
# - Some peer dependency warnings are normal
```

**Why `--legacy-peer-deps`?**
- Some packages have conflicting peer dependencies
- Legacy mode allows installation to proceed
- Application runs correctly despite warnings

### 3. Install Missing Runtime Dependencies

The following packages may not be in package.json but are required:

```bash
cd /srv/gsb/api

# Install critical runtime dependencies
npm install --save --legacy-peer-deps \
  lucide-vue-next \
  socket.io \
  socket.io-client \
  @tensorflow/tfjs \
  @tensorflow/tfjs-backend-webgl \
  @tensorflow/tfjs-backend-wasm \
  redis \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  @apollo/server \
  graphql \
  cross-env

# This ensures all runtime imports resolve correctly
```

---

## 🗄 Database Configuration

### 1. PostgreSQL Setup

The project uses **Docker Compose** for PostgreSQL:

```bash
cd /srv/gsb/api

# Start PostgreSQL only (first time)
docker compose up -d db

# Wait for database to be healthy
docker compose ps
# Should show db as "healthy"

# Check database logs
docker compose logs db
```

**Database Configuration (from docker-compose.yml):**
```yaml
Database: gibi
User: postgres
Password: 12991453
Port: 5432 (mapped to host)
Volume: /mnt/pgdata (persistent storage)
```

### 2. Run Database Migrations

```bash
cd /srv/gsb/api

# Generate Prisma client
npm run db:generate

# Apply all migrations
npm run db:migrate:deploy

# Seed initial data (users, etc.)
docker exec api-app-1 npm run db:seed
# Or if container not running yet:
# DATABASE_URL="postgresql://postgres:12991453@localhost:5432/gibi" npm run db:seed
```

**Seeded Users:**
- Super Admin: `superadmin@gsb.dev` / `superadmin`
- Merchant Admin: `merchantadmin@gsb.dev` / `merchantadmin`
- Merchant Staff: `merchantstaff@gsb.dev` / `merchantstaff`
- Customer: `customer@gsb.dev` / `customer`

---

## 🔐 Environment Variables

### 1. Create `.env` File

```bash
cd /srv/gsb/api
cp .env.example .env  # If exists, otherwise create new
nano .env
```

### 2. Required Environment Variables

```bash
# ============================================
# DATABASE
# ============================================
# CRITICAL: Use 'db' hostname for Docker network
DATABASE_URL=postgresql://postgres:12991453@db:5432/gibi

# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=4000

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m

# ============================================
# SHOPIFY INTEGRATION (Backend)
# ============================================
SHOPIFY_API_KEY=your-shopify-api-key-from-partner-dashboard
SHOPIFY_API_SECRET=your-shopify-api-secret-from-partner-dashboard
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_DEFAULT_TENANT_SLUG=your-store
SHOPIFY_VALIDATE_SESSION_SIGNATURE=false
SHOPIFY_STOREFRONT_API_VERSION=2024-04

# ============================================
# FRONTEND ENVIRONMENT (VITE_ prefix required!)
# ============================================
# CRITICAL: These are used during build to inject App Bridge
VITE_SHOPIFY_API_KEY=your-shopify-api-key-same-as-above
VITE_SHOPIFY_APP_API_KEY=your-shopify-api-key-same-as-above
VITE_API_BASE_URL=/api
VITE_API_PROXY=http://localhost:4000

# ============================================
# OPTIONAL SERVICES
# ============================================
REDIS_URL=redis://redis:6379
ALLOW_DEV_TENANT_HEADER=false

# ============================================
# AWS S3 / R2 (Optional - for file uploads)
# ============================================
# R2_ACCOUNT_ID=your-cloudflare-account-id
# R2_ACCESS_KEY_ID=your-r2-access-key
# R2_SECRET_ACCESS_KEY=your-r2-secret
# R2_BUCKET_NAME=your-bucket-name
# R2_PUBLIC_URL=https://your-r2-public-url
```

### 3. Critical Notes

**⚠️ DATABASE_URL:**
- For Docker deployment: Use `db:5432` (Docker service name)
- For local development: Use `localhost:5432`

**⚠️ VITE Variables:**
- **MUST** have `VITE_` prefix
- Required for build-time injection
- `VITE_SHOPIFY_API_KEY` and `VITE_SHOPIFY_APP_API_KEY` should be identical

**⚠️ Security:**
- Change `JWT_SECRET` to a random 64+ character string in production
- Never commit `.env` to Git (it's in `.gitignore`)
- Use strong passwords for PostgreSQL

---

## 🏗 Build Process

### 1. Frontend Build with Memory Fix

**⚠️ CRITICAL: High Memory Required**

The Vite build process requires **10GB+ RAM** due to:
- 1,485 source files
- 581 Vue components
- 375+ image assets
- Entire Tabler icon set (~5000 icons)
- Large dependency tree (1,600+ packages)

**Solution: Increase Node.js Memory Limit**

```bash
cd /srv/gsb/api

# Method 1: Using environment variable (RECOMMENDED)
NODE_OPTIONS="--max-old-space-size=10240" npm run build

# Method 2: Using cross-env (if installed)
npm run build  # Already configured in package.json

# Build output:
# - dist/ folder (36MB+)
# - ~3,100 modules transformed
# - Build time: 1-2 minutes
```

**Why 10240 MB (10GB)?**
- Default Node.js limit: 512MB
- Vite + TypeScript + Vue compilation peaks at ~8GB
- 10GB provides safe headroom

**package.json scripts:**
```json
{
  "scripts": {
    "build": "cross-env NODE_OPTIONS=--max-old-space-size=10240 vite build",
    "build:icons": "cross-env NODE_OPTIONS=--max-old-space-size=4096 tsx src/plugins/iconify/build-icons.ts",
    "typecheck": "cross-env NODE_OPTIONS=--max-old-space-size=8192 vue-tsc --noEmit"
  }
}
```

### 2. Backend TypeScript Compilation (Optional)

```bash
# Generate Prisma client
npm run db:generate

# Compile TypeScript to JavaScript (optional - we use tsx in production)
npm run api:build
```

### 3. Icon Generation

```bash
# Generate icon CSS bundle (automatically runs during postinstall)
NODE_OPTIONS="--max-old-space-size=4096" npm run build:icons
```

---

## 🌐 Caddy Web Server

### 1. Caddyfile Configuration

**Location:** `/etc/caddy/Caddyfile`

```caddyfile
# ---------- Frontend: app.gsb-engine.dev ----------
app.gsb-engine.dev {
	encode zstd gzip

	# CSP header for Shopify iframe embedding
	header Content-Security-Policy "frame-ancestors https://admin.shopify.com https://*.myshopify.com;"

	# Use route block to control directive execution order
	route {
		# API routes - proxy to backend (MUST BE FIRST)
		reverse_proxy /api/* 127.0.0.1:4000
		
		# Static files and SPA fallback (SECOND)
		root * /srv/gsb/api/dist
		try_files {path} /index.html
		file_server
	}
}

# ---------- API: api.gsb-engine.dev (Optional) ----------
api.gsb-engine.dev {
	encode zstd gzip
	
	# CORS headers
	header Access-Control-Allow-Origin "https://app.gsb-engine.dev"
	header Access-Control-Allow-Credentials "true"
	
	# Reverse proxy all requests
	reverse_proxy 127.0.0.1:4000
}
```

### 2. Critical Caddy Concepts

**⚠️ Directive Execution Order:**
- Caddy automatically **reorders** directives for optimization
- Use `route {}` block to **force sequential execution**
- Without `route`, `file_server` executes before `reverse_proxy`

**⚠️ Path Matching:**
- `reverse_proxy /api/*` matches any path starting with `/api/`
- Does NOT strip the `/api` prefix (unlike `handle_path`)
- Backend receives full path: `/api/health`, not `/health`

**⚠️ CSP Header:**
- `frame-ancestors` **MUST** be in HTTP header, not `<meta>` tag
- Shopify requires explicit iframe allowlist
- Header set by Caddy applies to all responses

### 3. Reload Caddy

```bash
# Validate configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload (graceful, zero-downtime)
sudo systemctl reload caddy

# Check status
sudo systemctl status caddy

# View logs
sudo journalctl -u caddy -f
```

### 4. SSL Certificates

Caddy **automatically** obtains SSL certificates from Let's Encrypt:

```bash
# Certificates stored in:
/var/lib/caddy/.local/share/caddy/certificates/

# Auto-renewal: Caddy handles this automatically
# No cron jobs needed!
```

---

## 🐳 Docker Deployment

### 1. Docker Compose Configuration

**File:** `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 12991453
      POSTGRES_DB: gibi
    volumes:
      - /mnt/pgdata:/var/lib/postgresql/data
    ports:
      - 5432:5432
    healthcheck:
      test: [CMD-SHELL, pg_isready -U postgres -d gibi]
      interval: 5s
      timeout: 5s
      retries: 20
    restart: unless-stopped

  app:
    image: node:20
    working_dir: /app
    environment:
      NODE_ENV: development
      npm_config_production: false
    volumes:
      - ./:/app
    env_file:
      - .env
    command:
      - bash
      - -lc
      - npm install && npm run api:dev
    ports:
      - 127.0.0.1:4000:4000
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
```

**Key Points:**
- **Database:** PostgreSQL 16 with health checks
- **App:** Node 20 with live reload
- **Volumes:** Source code mounted for development
- **Command:** `npm install && npm run api:dev`
- **Port:** 4000 (only accessible from localhost for security)

### 2. Start Containers

```bash
cd /srv/gsb/api

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f app
docker compose logs -f db

# Restart specific service
docker compose restart app
```

### 3. Container Health Checks

```bash
# Check if containers are running
docker ps

# Should show:
# - api-app-1: Up X minutes (port 127.0.0.1:4000->4000/tcp)
# - api-db-1: Up X minutes (healthy) (port 5432:5432/tcp)

# Test backend API directly
curl -s localhost:4000/api/health
# Expected: {"status":"ok","env":"development","timestamp":"..."}
```

---

## 🔧 Express.js Route Configuration

### Critical Route Order (server/src/app.ts)

**⚠️ IMPORTANT:** Middleware order matters in Express!

```typescript
// ✅ CORRECT ORDER:
1. CORS & body parsers
2. Authentication middleware
3. Logging
4. API routes (/api/*)           // BEFORE static files
5. App Proxy routes (/apps/gsb)
6. Static file serving
7. SPA fallback
8. Error handlers

// ❌ WRONG ORDER (causes API to return HTML):
1. Static file serving           // WRONG - catches /api/*
2. API routes                     // Never reached!
```

**Fixed Implementation:**

```typescript
// CRITICAL: API routes MUST come BEFORE static files
app.use("/api/auth", authRouter);       // Authentication endpoints
app.use("/api/health", healthRouter);   // Health check
app.use("/api/embed", embedRouter);     // Shopify embed
app.use("/api/proxy", proxyRouter);     // Shopify proxy
app.use("/api", requireAuthMiddleware, createApiRouter()); // Protected routes

// App Proxy for Shopify storefront
app.use("/apps/gsb", proxyRouter);

// Serve static files (AFTER API routes)
app.use(express.static(distPath, {
  maxAge: "1h",
  etag: true,
  lastModified: true,
}));

// SPA fallback for Vue Router
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});
```

---

## 🌍 Full Deployment Steps

### Step 1: Prepare Server

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install required software
# (Node.js, Docker, Caddy - see "Server Setup" section)

# 3. Create project directory
sudo mkdir -p /srv/gsb /mnt/pgdata
sudo chown -R $USER:$USER /srv/gsb /mnt/pgdata
```

### Step 2: Clone and Configure

```bash
# 1. Clone repository
cd /srv/gsb
git clone https://github.com/jesuisfatih/gsb-engine.git api
cd api
git checkout deploy/gsb-20251101-pnpm

# 2. Create .env file
cp .env.example .env
nano .env
# Configure all variables (see "Environment Variables" section)

# 3. Install dependencies
NODE_OPTIONS="--max-old-space-size=8192" npm install --legacy-peer-deps

# 4. Install runtime dependencies
npm install --save --legacy-peer-deps lucide-vue-next socket.io socket.io-client @tensorflow/tfjs redis cross-env
```

### Step 3: Database Setup

```bash
cd /srv/gsb/api

# 1. Start PostgreSQL
docker compose up -d db

# 2. Wait for healthy status
sleep 10
docker compose ps

# 3. Run migrations
npm run db:generate
npm run db:migrate:deploy
```

### Step 4: Build Frontend

```bash
cd /srv/gsb/api

# Build with high memory limit
NODE_OPTIONS="--max-old-space-size=10240" npm run build

# Verify dist folder created
ls -lh dist/
# Should show: 36MB+ of files
```

### Step 5: Configure Caddy

```bash
# 1. Backup existing Caddyfile
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup

# 2. Copy project Caddyfile
sudo cp /srv/gsb/api/Caddyfile /etc/caddy/Caddyfile

# 3. Validate configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# 4. Reload Caddy
sudo systemctl reload caddy

# 5. Check status
sudo systemctl status caddy
```

### Step 6: Start Backend

```bash
cd /srv/gsb/api

# Start all services
docker compose up -d

# Check logs
docker compose logs -f app

# Expected output:
# [collaboration] Socket.io server initialized
# [api] listening on http://localhost:4000
# [api] Real-time collaboration enabled
```

### Step 7: Verify Deployment

```bash
# 1. Test backend directly
curl -s localhost:4000/api/health
# Expected: {"status":"ok","env":"development",...}

# 2. Test through Caddy
curl -s https://app.gsb-engine.dev/api/health
# Expected: Same JSON response

# 3. Test frontend
curl -I https://app.gsb-engine.dev/
# Expected: HTTP/2 200

# 4. Check Shopify App Bridge injection
curl -s https://app.gsb-engine.dev/shopify/embedded | grep "shopify-api-key"
# Expected: <meta name="shopify-api-key" content="YOUR_KEY" />
```

### Step 8: Seed Database

```bash
cd /srv/gsb/api

# Seed from inside Docker container (correct DB connection)
docker exec api-app-1 npm run db:seed

# Verify users created
docker exec api-app-1 npx prisma studio
# Or check with psql:
docker exec api-db-1 psql -U postgres -d gibi -c "SELECT email FROM users;"
```

---

## 🔍 Troubleshooting

### Issue 1: Build Out of Memory

**Symptom:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=10240" npm run build

# Or edit package.json and use npm run build:
"build": "cross-env NODE_OPTIONS=--max-old-space-size=10240 vite build"
```

### Issue 2: API Returns HTML Instead of JSON

**Symptom:**
```
curl https://app.gsb-engine.dev/api/health
<!DOCTYPE html>...
```

**Cause:** Express static middleware executing before API routes

**Solution:** Check `server/src/app.ts` route order:
```typescript
// API routes MUST come BEFORE express.static()
app.use("/api/auth", authRouter);  // FIRST
app.use(express.static(distPath)); // SECOND
```

### Issue 3: Database Connection Refused

**Symptom:**
```
Can't reach database server at `localhost:5432`
```

**Cause:** Wrong host in DATABASE_URL (using localhost instead of Docker service name)

**Solution:**
```bash
# Edit .env
DATABASE_URL=postgresql://postgres:12991453@db:5432/gibi
#                                          ^^
# Use 'db' not 'localhost' for Docker deployments

# Restart app
docker compose restart app
```

### Issue 4: Shopify Session Error

**Symptom:**
```
Shopify session error: Shopify session payload is missing
```

**Causes & Solutions:**

1. **Missing VITE_ env vars:**
   ```bash
   # Add to .env:
   VITE_SHOPIFY_API_KEY=your-key
   VITE_SHOPIFY_APP_API_KEY=your-key
   
   # Rebuild frontend:
   NODE_OPTIONS="--max-old-space-size=10240" npm run build
   ```

2. **Caddy not proxying /api/*:**
   ```bash
   # Check Caddyfile has route {} block
   # Test: curl https://app.gsb-engine.dev/api/health
   # Should return JSON, not HTML
   ```

3. **CORS issues:**
   ```bash
   # Check browser console for CORS errors
   # Verify Caddyfile CORS headers match your domain
   ```

### Issue 5: Docker Container Restart Loop

**Symptom:**
```
docker ps -a
# Shows: Restarting (1) X seconds ago
```

**Common Causes:**

1. **Missing package-lock.json:**
   ```bash
   cd /srv/gsb/api
   npm install --package-lock-only --ignore-scripts
   docker compose restart app
   ```

2. **Missing dependencies:**
   ```bash
   npm install lucide-vue-next socket.io redis
   docker compose restart app
   ```

3. **Database not ready:**
   ```bash
   # Check DB health
   docker compose ps db
   # Should show "(healthy)"
   
   # Check DB logs
   docker compose logs db
   ```

### Issue 6: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution:**
```bash
# Find process using port 4000
sudo lsof -i :4000
# or
sudo netstat -tulpn | grep :4000

# Kill process
sudo kill -9 <PID>

# Restart containers
docker compose restart app
```

### Issue 7: Caddy SSL Certificate Errors

**Symptom:**
```
too many failed authorizations (5) for "api.gsb-engine.dev"
```

**Cause:** Let's Encrypt rate limiting (5 failures per hour)

**Solutions:**
1. **Wait 1 hour** for rate limit to reset
2. **Use HTTP only temporarily:**
   ```caddyfile
   http://app.gsb-engine.dev {
     # ... config
   }
   ```
3. **Fix DNS first**, then retry SSL

---

## 📦 Package Dependencies

### Core Dependencies (package.json)

```json
{
  "dependencies": {
    "@casl/ability": "6.7.3",
    "@prisma/client": "^6.18.0",
    "@tensorflow/tfjs": "^4.22.0",
    "@vueuse/core": "10.11.1",
    "express": "^5.1.0",
    "konva": "^9.3.22",
    "lucide-vue-next": "^0.552.0",
    "pinia": "3.0.2",
    "redis": "latest",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "three": "^0.180.0",
    "vue": "3.5.14",
    "vue-konva": "^3.2.6",
    "vue-router": "4.5.1",
    "vuetify": "3.8.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "cross-env": "latest",
    "prisma": "^6.18.0",
    "typescript": "5.8.3",
    "vite": "6.3.5",
    "vue-tsc": "2.2.10"
  }
}
```

### Installation Command

```bash
# Full installation with all dependencies
NODE_OPTIONS="--max-old-space-size=8192" npm install --legacy-peer-deps

# Then install missing runtime packages
npm install --save --legacy-peer-deps \
  lucide-vue-next \
  socket.io socket.io-client \
  @tensorflow/tfjs \
  redis \
  cross-env
```

---

## 🔐 Security Considerations

### 1. Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct database access from internet
sudo ufw deny 5432/tcp

# Block direct API access (Caddy only)
# Port 4000 is 127.0.0.1:4000 in docker-compose (already secured)

# Enable firewall
sudo ufw enable
```

### 2. Secure Cookies

In production, cookies are configured as:
```typescript
SameSite=None; Secure; Partitioned; HttpOnly
```

For Shopify embedded apps (third-party iframe context):
- `SameSite=None` - Required for cross-site cookies
- `Secure` - HTTPS only
- `Partitioned` - Better third-party cookie support
- `HttpOnly` - Prevents XSS attacks

### 3. Environment Secrets

**Never commit:**
- `.env` file
- Database passwords
- JWT secrets
- API keys

**Use `.env.example` for reference:**
```bash
cp .env.example .env
# Edit .env with real values
```

---

## 🚦 Monitoring & Maintenance

### 1. Health Checks

```bash
# Backend API
curl -s localhost:4000/api/health

# Through Caddy proxy
curl -s https://app.gsb-engine.dev/api/health

# Database
docker exec api-db-1 pg_isready -U postgres -d gibi

# Caddy
systemctl is-active caddy
```

### 2. Logs

```bash
# Backend API logs
docker compose logs -f app

# Database logs
docker compose logs -f db

# Caddy logs
sudo journalctl -u caddy -f

# System logs
sudo journalctl -xe
```

### 3. Restart Services

```bash
# Restart backend only
docker compose restart app

# Restart all containers
docker compose restart

# Reload Caddy (zero-downtime)
sudo systemctl reload caddy

# Full restart (if needed)
docker compose down && docker compose up -d
```

### 4. Database Backup

```bash
# Backup database
docker exec api-db-1 pg_dump -U postgres gibi > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i api-db-1 psql -U postgres gibi < backup_20251101.sql
```

### 5. Update Application

```bash
cd /srv/gsb/api

# Pull latest changes
git fetch origin
git checkout deploy/gsb-20251101-pnpm
git pull origin deploy/gsb-20251101-pnpm

# Install new dependencies
NODE_OPTIONS="--max-old-space-size=8192" npm install --legacy-peer-deps

# Run migrations
npm run db:migrate:deploy

# Rebuild frontend
NODE_OPTIONS="--max-old-space-size=10240" npm run build

# Restart services
docker compose restart app
sudo systemctl reload caddy
```

---

## 📚 Commit History & Versioning

### Stable Commit (RECOMMENDED)

```
Commit: 03d71325
Branch: deploy/gsb-20251101-pnpm
Date: November 1, 2025
Message: fix: Caddy route directive - Use route block for proper execution order
```

**To checkout this specific commit:**
```bash
git checkout deploy/gsb-20251101-pnpm
git reset --hard 03d71325
```

### Recent Critical Commits

| Commit | Description | Impact |
|--------|-------------|--------|
| `03d71325` | Caddy route directive fix | ✅ API proxy working |
| `c9db816c` | Caddy handle directive | ⚠️ Partial fix |
| `6544792f` | Dependencies + Route order | ✅ Major stability fix |
| `c4365c2e` | pnpm migration | ✅ Build fixes |

---

## 🎯 Production Checklist

### Pre-Deployment

- [ ] Server meets minimum requirements (4GB RAM, 2 CPU cores)
- [ ] DNS records point to server IP
- [ ] Domain names accessible
- [ ] Firewall configured (ports 80, 443 open)

### Installation

- [ ] Node.js 20.x installed
- [ ] Docker & Docker Compose installed
- [ ] Caddy installed and running
- [ ] Project cloned at `/srv/gsb/api`
- [ ] On commit `03d71325` or later

### Configuration

- [ ] `.env` file created with all required variables
- [ ] `DATABASE_URL` uses `db:5432` (not localhost)
- [ ] `VITE_SHOPIFY_API_KEY` matches `SHOPIFY_API_KEY`
- [ ] Shopify credentials valid

### Build & Deploy

- [ ] `npm install` completed successfully
- [ ] Runtime dependencies installed
- [ ] Database migrations applied
- [ ] Database seeded with initial users
- [ ] Frontend built with `NODE_OPTIONS="--max-old-space-size=10240"`
- [ ] `dist/` folder exists (~36MB)

### Web Server

- [ ] Caddyfile copied to `/etc/caddy/Caddyfile`
- [ ] Caddyfile validated successfully
- [ ] Caddy reloaded/restarted
- [ ] SSL certificates obtained (or HTTP working)

### Docker

- [ ] `docker compose up -d` successful
- [ ] Both containers running (app, db)
- [ ] Database shows "(healthy)" status
- [ ] App container not in restart loop

### Verification

- [ ] `curl localhost:4000/api/health` returns JSON
- [ ] `curl https://app.gsb-engine.dev/api/health` returns JSON
- [ ] `curl https://app.gsb-engine.dev/` returns HTML
- [ ] App Bridge meta tag in HTML source
- [ ] Shopify embedded URL accessible

### Shopify Integration

- [ ] App URL set to `https://app.gsb-engine.dev/shopify/embedded`
- [ ] Allowed redirect URLs configured
- [ ] API key in Shopify Partner Dashboard matches `.env`
- [ ] Test install in development store

---

## 💡 Performance Tips

### 1. Enable Prisma Query Logging (Development Only)

```typescript
// prisma.ts
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});
```

### 2. Redis Caching (Optional)

```bash
# Add Redis to docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - 127.0.0.1:6379:6379

# Update .env
REDIS_URL=redis://redis:6379
```

### 3. Build Optimization

**Reduce bundle size:**
- Remove unused demo components from `src/views/demos/`
- Configure Vite `manualChunks` for better code splitting
- Enable `rollup-plugin-visualizer` to analyze bundle

**Future optimization (not yet implemented):**
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['vue', 'vue-router', 'pinia'],
        'vuetify': ['vuetify'],
        'charts': ['apexcharts', 'chart.js'],
        'editor': ['konva', 'three'],
      },
    },
  },
  sourcemap: false,  // Disable in production
},
```

---

## 📞 Support & Resources

### Documentation

- API Server: `docs/api-server.md`
- Database Schema: `docs/database-schema.md`
- Shopify Integration: `docs/shopify-app-embed.md`
- Frontend Integration: `docs/frontend-integration.md`
- Autosave Flow: `docs/autosave-flow.md`

### Logs Location

- Caddy: `sudo journalctl -u caddy -f`
- Backend: `docker compose logs -f app`
- Database: `docker compose logs -f db`
- System: `sudo journalctl -xe`

### Common Commands

```bash
# Full restart
cd /srv/gsb/api
docker compose down
docker compose up -d
sudo systemctl restart caddy

# Quick rebuild
NODE_OPTIONS="--max-old-space-size=10240" npm run build
sudo systemctl reload caddy

# Check everything
docker ps
systemctl status caddy
curl -s localhost:4000/api/health
curl -s https://app.gsb-engine.dev/api/health
```

---

## 🏆 Success Criteria

Your deployment is successful when:

✅ **Backend API**
```bash
curl localhost:4000/api/health
{"status":"ok","env":"development","timestamp":"..."}
```

✅ **Frontend**
```bash
curl -I https://app.gsb-engine.dev/
HTTP/2 200
```

✅ **API Proxy**
```bash
curl https://app.gsb-engine.dev/api/health
{"status":"ok",...}  # JSON, not HTML
```

✅ **App Bridge**
```bash
curl -s https://app.gsb-engine.dev/shopify/embedded | grep shopify-api-key
<meta name="shopify-api-key" content="YOUR_KEY" />
```

✅ **Database**
```bash
docker exec api-db-1 pg_isready
accepting connections
```

✅ **Containers**
```bash
docker ps
# Shows: api-app-1 (Up), api-db-1 (Up, healthy)
```

---

## 🔄 Deployment Flow Summary

```
1. Server Setup (Ubuntu + Node + Docker + Caddy)
   └─> 2. Clone Repo (commit 03d71325)
       └─> 3. Configure .env (DATABASE_URL, Shopify keys, VITE_ vars)
           └─> 4. Install Dependencies (npm install with high memory)
               └─> 5. Install Runtime Packages (lucide, socket.io, etc.)
                   └─> 6. Database (docker compose up db + migrations + seed)
                       └─> 7. Build Frontend (NODE_OPTIONS=10GB)
                           └─> 8. Configure Caddy (/etc/caddy/Caddyfile)
                               └─> 9. Start Backend (docker compose up -d)
                                   └─> 10. Verify (curl tests)
                                       └─> ✅ LIVE!
```

---

## 📝 Quick Start (TL;DR)

For experienced DevOps engineers:

```bash
# 1. Server prep
sudo apt update && sudo apt install -y nodejs docker.io caddy git

# 2. Clone
cd /srv && git clone https://github.com/jesuisfatih/gsb-engine.git gsb/api
cd gsb/api && git checkout 03d71325

# 3. Configure
cp .env.example .env && nano .env
# Set DATABASE_URL, SHOPIFY_*, VITE_* variables

# 4. Install
NODE_OPTIONS="--max-old-space-size=8192" npm install --legacy-peer-deps
npm install --save --legacy-peer-deps lucide-vue-next socket.io socket.io-client @tensorflow/tfjs redis cross-env

# 5. Database
docker compose up -d db && sleep 10
npm run db:generate && npm run db:migrate:deploy
docker exec api-app-1 npm run db:seed

# 6. Build
NODE_OPTIONS="--max-old-space-size=10240" npm run build

# 7. Web server
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy

# 8. Start
docker compose up -d

# 9. Verify
curl localhost:4000/api/health
curl https://app.gsb-engine.dev/api/health
```

---

## 📄 License & Credits

**Project:** GSB Engine - Gang Sheet Builder  
**Repository:** https://github.com/jesuisfatih/gsb-engine  
**License:** (Check repository)

**Built with:**
- Vuexy Admin Template (Vue 3)
- Shopify App Bridge
- Prisma ORM
- Caddy Web Server

---

**End of Deployment Guide** 🎉

For issues, check logs and troubleshooting section above.

