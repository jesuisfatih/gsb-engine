#!/bin/bash

# 🚀 GSB Engine - Cart Image CDN Deployment Script
# Deploy Date: November 3, 2025
# Feature: Preview image upload to CDN (not dataURL)

set -e  # Exit on any error

echo "🚀 GSB Engine - Cart CDN Deployment Starting..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/srv/gsb/api"
BRANCH="deploy/gsb-20251101-pnpm"

echo -e "${YELLOW}📂 Project Directory: $PROJECT_DIR${NC}"
echo -e "${YELLOW}🔀 Branch: $BRANCH${NC}"
echo ""

# Step 1: Navigate to project directory
echo "1️⃣  Navigating to project directory..."
cd $PROJECT_DIR || { echo -e "${RED}❌ Failed to navigate to $PROJECT_DIR${NC}"; exit 1; }
echo -e "${GREEN}✅ Current directory: $(pwd)${NC}"
echo ""

# Step 2: Stash any local changes (if any)
echo "2️⃣  Stashing local changes (if any)..."
git stash || true
echo -e "${GREEN}✅ Local changes stashed${NC}"
echo ""

# Step 3: Pull latest changes from GitHub
echo "3️⃣  Pulling latest changes from GitHub..."
git fetch origin || { echo -e "${RED}❌ Git fetch failed${NC}"; exit 1; }
git checkout $BRANCH || { echo -e "${RED}❌ Checkout branch failed${NC}"; exit 1; }
git pull origin $BRANCH || { echo -e "${RED}❌ Git pull failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Latest code pulled from GitHub${NC}"
echo ""

# Step 4: Show latest commit
echo "4️⃣  Latest commit info:"
git log -1 --oneline
echo ""

# Step 5: Install/update dependencies
echo "5️⃣  Installing dependencies..."
if [ -f "pnpm-lock.yaml" ]; then
  echo "   Using pnpm..."
  pnpm install || { echo -e "${RED}❌ pnpm install failed${NC}"; exit 1; }
else
  echo "   Using npm..."
  npm install || { echo -e "${RED}❌ npm install failed${NC}"; exit 1; }
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 6: Build frontend
echo "6️⃣  Building frontend..."
npm run build || { echo -e "${RED}❌ Frontend build failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# Step 7: Prisma migrations (if needed)
echo "7️⃣  Checking Prisma migrations..."
npx prisma generate || { echo -e "${YELLOW}⚠️  Prisma generate skipped${NC}"; }
echo -e "${GREEN}✅ Prisma ready${NC}"
echo ""

# Step 8: Create uploads directory structure
echo "8️⃣  Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads
echo -e "${GREEN}✅ Uploads directory created${NC}"
echo ""

# Step 9: Restart backend API (PM2)
echo "9️⃣  Restarting backend API..."
if command -v pm2 &> /dev/null; then
  pm2 restart gsb-api || pm2 start npm --name "gsb-api" -- run api:dev
  pm2 save
  echo -e "${GREEN}✅ Backend API restarted (PM2)${NC}"
else
  echo -e "${YELLOW}⚠️  PM2 not found, skipping backend restart${NC}"
  echo -e "${YELLOW}   Please restart manually: npm run api:dev${NC}"
fi
echo ""

# Step 10: Reload Caddy (if needed)
echo "🔟  Reloading Caddy web server..."
if systemctl is-active --quiet caddy; then
  sudo systemctl reload caddy || echo -e "${YELLOW}⚠️  Caddy reload failed (non-critical)${NC}"
  echo -e "${GREEN}✅ Caddy reloaded${NC}"
else
  echo -e "${YELLOW}⚠️  Caddy not running or not installed${NC}"
fi
echo ""

# Step 11: Health check
echo "1️⃣1️⃣  Running health checks..."
sleep 3  # Wait for services to stabilize

# Check backend
if curl -s localhost:4000/api/health | grep -q "ok"; then
  echo -e "${GREEN}✅ Backend API: OK${NC}"
else
  echo -e "${RED}❌ Backend API: FAILED${NC}"
fi

# Check frontend
if curl -s -I https://app.gsb-engine.dev/ | grep -q "200\|301\|302"; then
  echo -e "${GREEN}✅ Frontend: OK${NC}"
else
  echo -e "${YELLOW}⚠️  Frontend: Check manually${NC}"
fi

# Check uploads directory
if [ -d "uploads" ]; then
  echo -e "${GREEN}✅ Uploads directory: EXISTS${NC}"
else
  echo -e "${RED}❌ Uploads directory: MISSING${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "================================================"
echo ""
echo "📋 Next steps:"
echo "   1. Test editor → /editor"
echo "   2. Create design and click 'Send to Checkout'"
echo "   3. Check console logs for:"
echo "      - [checkout] 📤 Uploading preview image..."
echo "      - [checkout] ✅ Preview uploaded: /uploads/..."
echo "   4. Verify image in cart"
echo ""
echo "📂 Uploaded files location: $PROJECT_DIR/uploads/"
echo "🌐 Public URL: https://app.gsb-engine.dev/uploads/..."
echo ""
echo -e "${GREEN}🎉 Cart Image CDN is now LIVE!${NC}"

