# 🚀 Shopify App Proxy Setup Guide

## ⚠️ KRİTİK: Bu Adımı Yapmadan Editor Çalışmaz!

Shopify App Proxy, `we-dream-studio.myshopify.com/apps/gsb/editor` gibi URL'leri `app.gsb-engine.dev`'e yönlendiren bir reverse proxy'dir.

---

## 📋 Setup Adımları

### 1. Shopify Partner Dashboard'a Giriş Yapın

🔗 https://partners.shopify.com/

### 2. Uygulamanızı Seçin

1. **Organizations** → Organizasyonunuzu seçin
2. **Apps** → "**Gang Sheet Builder By USA**" uygulamasını seçin

### 3. App Proxy Ayarını Yapın

1. Sol menüden **Configuration** → **App proxy** seçin
2. **"Enable app proxy"** toggle'ını **AÇIN** ✅
3. Aşağıdaki ayarları girin:

```
┌─────────────────────────────────────────────┐
│ Subpath prefix:  apps                       │
│ Subpath:         gsb                        │
│ Proxy URL:       https://app.gsb-engine.dev│
└─────────────────────────────────────────────┘
```

**ÖNEMLİ NOTLAR:**
- ❌ Proxy URL'de `/api/proxy` gibi suffix EKLEMEYIN
- ✅ Sadece: `https://app.gsb-engine.dev`
- ✅ Shopify otomatik olarak `/apps/gsb/` prefix'ini ekleyecek

4. **Save** butonuna tıklayın

---

## 🧪 Test Edin

### Adım 1: Tarayıcınızı Temizleyin
```
1. Ctrl + Shift + Delete (Chrome/Edge)
2. "Cached images and files" seçin
3. Clear data
```

### Adım 2: Ürün Sayfasına Gidin
```
https://we-dream-studio.myshopify.com/products/fight-club-kanvas-tablo
```

### Adım 3: Customize Butonuna Basın

### Adım 4: Developer Tools'u Açın
```
F12 veya Ctrl + Shift + I
```

### Adım 5: Network Tab'ı Kontrol Edin

`/apps/gsb/editor` isteğini bulun ve **Response Headers**'a bakın:

#### ✅ BAŞARILI (App Proxy Çalışıyor):
```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: >0
X-Powered-By: Express
```

#### ❌ BAŞARISIZ (App Proxy Çalışmıyor):
```
HTTP/1.1 200 OK (veya 404)
Powered-By: Shopify
Content-Type: text/javascript
Content-Length: 0
```

---

## 🎯 Beklenen Sonuç

App Proxy doğru yapılandırıldığında:

### 1. URL Dönüşümü
```
Browser request:
https://we-dream-studio.myshopify.com/apps/gsb/editor?product=...

Shopify App Proxy:
→ https://app.gsb-engine.dev/apps/gsb/editor?product=...

Caddy:
→ http://127.0.0.1:4000/apps/gsb/editor

Backend (Express):
→ Serves editor HTML with corrected asset paths
```

### 2. Asset Loading
```
HTML içinde:
<link href="/apps/gsb/loader.css" />
<script src="/apps/gsb/assets/index-Cc4rmatH.js" />

Browser istekleri:
https://we-dream-studio.myshopify.com/apps/gsb/loader.css
https://we-dream-studio.myshopify.com/apps/gsb/assets/index-Cc4rmatH.js

Shopify App Proxy:
→ https://app.gsb-engine.dev/apps/gsb/loader.css
→ https://app.gsb-engine.dev/apps/gsb/assets/index-Cc4rmatH.js

Backend:
✅ Serves files from dist/ folder
```

### 3. Editor Açılır
- ✅ Loader animasyonu görünür
- ✅ Editor yüklenir
- ✅ Canvas gösterilir
- ✅ 404 hatası YOK!

---

## 🔧 Troubleshooting

### Sorun 1: "Powered-By: Shopify" görüyorum
**Çözüm:** App Proxy ayarı henüz aktif olmamış
- Shopify Partner Dashboard'a tekrar gidin
- App proxy ayarını kontrol edin
- 5-10 dakika bekleyin (Shopify cache)

### Sorun 2: 404 Hatalar Devam Ediyor
**Çözüm:** Tarayıcı cache'ini temizleyin
```bash
# Chrome/Edge:
Ctrl + Shift + Delete → Clear cache

# Firefox:
Ctrl + Shift + Delete → Clear cache
```

### Sorun 3: Editor Boş Sayfa Gösteriyor
**Kontrol Edin:**
1. Backend çalışıyor mu?
   ```bash
   curl http://localhost:4000/api/health
   ```
2. Dist klasörü var mı?
   ```bash
   ls -la /srv/gsb/api/dist/
   ```
3. Caddy çalışıyor mu?
   ```bash
   systemctl status caddy
   ```

---

## 📊 Yapılan Değişiklikler (Bu Deploy'da)

### ✅ 1. Vite Config - Base Path Eklendi
```typescript
// vite.config.ts
base: process.env.NODE_ENV === 'production' ? '/apps/gsb/' : '/',
```
**Sonuç:** Tüm asset path'leri build zamanında `/apps/gsb/` ile başlıyor

### ✅ 2. Proxy.ts - Manifest.json Handler
```typescript
proxyRouter.get("/manifest.json", ...)
```
**Sonuç:** PWA manifest path'leri düzeltiliyor

### ✅ 3. Proxy.ts - Service Worker Handler
```typescript
proxyRouter.get("/sw.js", ...)
```
**Sonuç:** Service Worker path'leri düzeltiliyor

### ✅ 4. Caddyfile - App Proxy Route
```caddyfile
reverse_proxy /apps/gsb/* 127.0.0.1:4000
```
**Sonuç:** Tüm `/apps/gsb/*` istekleri backend'e gidiyor

### ✅ 5. Extension - Shop Parameter
```liquid
onclick="...&shop={{ shop.permanent_domain }}"
```
**Sonuç:** App Bridge `shop` parametresini alıyor

---

## 🎉 Başarı Kriterleri

Aşağıdakilerin hepsi ✅ olmalı:

- [ ] Shopify Partner Dashboard → App proxy → **ENABLED**
- [ ] Network tab → `/apps/gsb/editor` → **200 OK**
- [ ] Response Header → **Content-Type: text/html**
- [ ] Response Header → **NOT "Powered-By: Shopify"**
- [ ] Console → **NO 404 errors** for loader.css
- [ ] Console → **NO 404 errors** for JS/CSS files
- [ ] Console → **NO App Bridge `shop` error**
- [ ] Editor → **Tamamen yüklenmiş**

---

## 📞 Destek

Sorun devam ediyorsa:
1. Network tab'ın screenshot'ını alın
2. Console log'larını kopyalayın
3. Bu bilgilerle destek isteyin

---

**Son Güncelleme:** 2 Kasım 2025
**Deploy Commit:** `8be7b070`

