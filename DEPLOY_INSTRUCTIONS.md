# 🚀 DEPLOY INSTRUCTIONS - Cart Image CDN

**Tarih:** 3 Kasım 2025  
**Feature:** Preview image upload (dataURL → CDN)  
**Commit:** `35f99409`

---

## 📋 SUNUCUYA DEPLOY ADIMLARI

### **1. SSH ile Sunucuya Bağlan:**

```bash
ssh root@app.gsb-engine.dev
# veya
ssh ubuntu@app.gsb-engine.dev
# SSH şifrenizi girin
```

---

### **2. Deploy Scriptini Çalıştır:**

```bash
# Proje dizinine git
cd /srv/gsb/api

# Deploy scriptini çalıştır
chmod +x deploy-cart-cdn.sh
./deploy-cart-cdn.sh
```

**Script otomatik olarak şunları yapacak:**
- ✅ Git pull (latest changes)
- ✅ npm/pnpm install
- ✅ npm run build
- ✅ Prisma generate
- ✅ uploads/ klasörü oluştur
- ✅ PM2 restart
- ✅ Caddy reload
- ✅ Health check

---

### **3. Manuel Deploy (Eğer Script Çalışmazsa):**

```bash
# 1. Proje dizinine git
cd /srv/gsb/api

# 2. Git pull
git fetch origin
git checkout deploy/gsb-20251101-pnpm
git pull origin deploy/gsb-20251101-pnpm

# 3. Dependencies install
pnpm install  # veya npm install

# 4. Build
npm run build

# 5. Prisma
npx prisma generate

# 6. Uploads klasörü oluştur
mkdir -p uploads
chmod 755 uploads

# 7. Backend restart
pm2 restart gsb-api
# veya
pm2 restart all

# 8. Caddy reload (optional)
sudo systemctl reload caddy

# 9. Health check
curl localhost:4000/api/health
curl https://app.gsb-engine.dev/api/health
```

---

### **4. Verify Deployment:**

```bash
# Backend health
curl -s localhost:4000/api/health | jq

# Frontend
curl -I https://app.gsb-engine.dev/

# Uploads directory
ls -la /srv/gsb/api/uploads/

# PM2 status
pm2 status

# PM2 logs
pm2 logs gsb-api --lines 50
```

---

### **5. Test Cart CDN:**

1. **Browser'da aç:**
   ```
   https://app.gsb-engine.dev/editor?shopifyVariantId=123&shopifyProductGid=gid://shopify/Product/123
   ```

2. **Tasarım yap ve "Send to Checkout" butonuna bas**

3. **Console loglarını kontrol et:**
   ```
   [checkout] 📤 Uploading preview image...
   [checkout] ✅ Preview uploaded: /uploads/tenant123/designs/design-xxx.png
   [checkout] ✅ Redirecting to cart
   ```

4. **Backend loglarını kontrol et (PM2):**
   ```bash
   pm2 logs gsb-api --lines 100
   ```
   
   Şunları göreceksin:
   ```
   [upload] Using default tenant for anonymous user: xxx
   [upload] Saved base64 image: /uploads/.../xxx.png (123456 bytes)
   [proxy/cart] ✅ Converted relative URL to absolute
   [proxy/cart] ✅ Created anonymous design: xxx
   ```

5. **Upload edilen dosyayı kontrol et:**
   ```bash
   ls -lh /srv/gsb/api/uploads/
   ```

6. **Browser'da resmi aç:**
   ```
   https://app.gsb-engine.dev/uploads/{tenantId}/designs/design-xxx.png
   ```

---

## 🔧 TROUBLESHOOTING

### **Sorun 1: "uploads/ directory not writable"**

**Çözüm:**
```bash
cd /srv/gsb/api
mkdir -p uploads
chmod 755 uploads
chown -R www-data:www-data uploads  # veya
chown -R $(whoami):$(whoami) uploads
```

---

### **Sorun 2: "Upload endpoint returns 500"**

**Çözüm:**
```bash
# Backend loglarını kontrol et
pm2 logs gsb-api --lines 100

# Tenant var mı kontrol et
cd /srv/gsb/api
npx tsx --env-file=.env prisma/seed.ts
```

---

### **Sorun 3: "Image not accessible via URL"**

**Çözüm:**
```bash
# Static middleware çalışıyor mu?
curl -I https://app.gsb-engine.dev/uploads/test.txt

# Caddy config kontrol et
sudo systemctl status caddy
sudo caddy validate --config /etc/caddy/Caddyfile
```

---

### **Sorun 4: "PM2 not found"**

**Çözüm:**
```bash
# PM2 install
npm install -g pm2

# Start backend
cd /srv/gsb/api
pm2 start npm --name "gsb-api" -- run api:dev
pm2 save
pm2 startup
```

---

## 📊 SHOPIFY CART VERIFICATION

### **Line Item Properties Kontrolü:**

Shopify Admin → Orders → Son sipariş → Line item properties

Şunları göreceksin:
```json
{
  "Product Color": "White",
  "Print Technique": "DTF",
  "_design_id": "clxxx123",
  "_preview_url": "https://app.gsb-engine.dev/uploads/.../xxx.png",
  "_mode": "dtf",
  "_sheet_dimensions": "400mm × 500mm"
}
```

**✅ Doğrulama:**
- `_preview_url` kısa URL (< 255 char) ✅
- URL erişilebilir (HTTP 200) ✅
- Görsel cart'ta görünüyor ✅

---

## 🎯 ROLLBACK (Eğer Sorun Olursa)

```bash
cd /srv/gsb/api

# Önceki commit'e dön
git log --oneline  # Önceki commit hash'ini bul
git checkout <previous-commit-hash>

# Build + Restart
npm run build
pm2 restart gsb-api

# Verify
curl localhost:4000/api/health
```

---

## 📝 POST-DEPLOYMENT CHECKLIST

- [ ] ✅ Backend API çalışıyor (`/api/health` → 200)
- [ ] ✅ Frontend çalışıyor (`/` → 200)
- [ ] ✅ `uploads/` klasörü var ve writable
- [ ] ✅ Preview upload test edildi (console logs)
- [ ] ✅ Cart'a ekleme test edildi
- [ ] ✅ Shopify order'da görsel görünüyor
- [ ] ✅ PM2 logs temiz (error yok)
- [ ] ✅ Caddy logs temiz (error yok)

---

## 🎉 SUCCESS CRITERIA

### **Frontend Console:**
```
[checkout] 📤 Uploading preview image...
[checkout] ✅ Preview uploaded: /uploads/tenant123/designs/design-1730678901234.png
[checkout] Request body: { previewUrl: "https://app.gsb-engine.dev/uploads/...", ... }
[checkout] ✅ Redirecting to cart: /cart
```

### **Backend Logs (PM2):**
```
[upload] Using default tenant for anonymous user: tenant123
[upload] Saved base64 image: /uploads/tenant123/designs/xxx.png (123456 bytes)
[proxy/cart] ✅ Converted relative URL to absolute
[proxy/cart] ✅ Created anonymous design: clxxx123
```

### **File System:**
```bash
$ ls -lh /srv/gsb/api/uploads/
drwxr-xr-x 3 ubuntu ubuntu 4.0K Nov  3 10:00 tenant123
```

### **Public URL:**
```bash
$ curl -I https://app.gsb-engine.dev/uploads/tenant123/designs/design-xxx.png
HTTP/2 200
content-type: image/png
content-length: 123456
```

---

## 📞 SUPPORT

Sorun olursa:
1. PM2 logs kontrol et: `pm2 logs gsb-api --lines 200`
2. Caddy logs kontrol et: `sudo journalctl -u caddy --no-pager -n 100`
3. Browser console kontrol et (F12 → Console)
4. Network tab kontrol et (F12 → Network → `/api/upload/base64`)

---

**Deploy Status:** ⏳ PENDING  
**Last Updated:** 3 Kasım 2025  
**Next Deploy:** Shopify deploy (theme app extension) - opsiyonel

---

✅ **TÜM ADIMLAR HAZIR - DEPLOY EDEBILIRSINIZ!** 🚀

