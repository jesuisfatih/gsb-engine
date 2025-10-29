# Shopify App Kurulum Rehberi

Bu rehber, GSB Engine Shopify uygulamasının kurulumu ve yaygın sorunların çözümü için hazırlanmıştır.

## 🔧 Gerekli Environment Variables

Projenizin kök dizininde `.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gsb_engine"

# Server Configuration
NODE_ENV="production"  # veya "development"
PORT=4000

# JWT Configuration
JWT_SECRET="your-secret-key-here-change-in-production"
JWT_EXPIRES_IN="15m"

# Shopify App Configuration (Backend)
SHOPIFY_API_KEY="your-shopify-api-key"
SHOPIFY_API_SECRET="your-shopify-api-secret"
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_TOKEN="your-storefront-access-token"
SHOPIFY_STOREFRONT_API_VERSION="2024-04"
SHOPIFY_DEFAULT_TENANT_SLUG="your-tenant-slug"
SHOPIFY_VALIDATE_SESSION_SIGNATURE=true

# Frontend Environment Variables (VITE_ prefix zorunlu!)
VITE_SHOPIFY_API_KEY="your-shopify-api-key"
VITE_SHOPIFY_APP_API_KEY="your-shopify-api-key"
VITE_API_BASE_URL="/api"
VITE_API_PROXY="http://localhost:4000"

# Optional
ALLOW_DEV_TENANT_HEADER=false
```

**ÖNEMLİ:** 
- `VITE_SHOPIFY_API_KEY` ve `VITE_SHOPIFY_APP_API_KEY` aynı değere sahip olmalı
- Bu değer Shopify Partner Dashboard'dan alınan Client ID olmalı
- Frontend'de kullanılacak tüm değişkenler `VITE_` prefix'i ile başlamalı

## 📋 Shopify Partner Dashboard Ayarları

1. **App URL**: `https://app.gsb-engine.dev/shopify/embedded`
2. **Allowed redirection URL(s)**: 
   - `https://app.gsb-engine.dev/api/auth/callback`
   - `https://app.gsb-engine.dev/shopify/embedded`

3. **App proxy** (opsiyonel): 
   - Subpath prefix: `apps/gsb-engine`
   - Proxy URL: `https://app.gsb-engine.dev/api/proxy`

## 🚀 Yapılan Düzeltmeler

### 1. Vite Config - HTML Placeholder Replacement
- `index.html` içindeki `%VITE_SHOPIFY_APP_API_KEY%` artık doğru şekilde replace ediliyor
- Build sırasında environment variable'lar HTML'e inject ediliyor

### 2. Modern Shopify App Bridge
- App Bridge CDN'den modern versiyonu kullanılıyor
- `data-api-key` attribute ile otomatik initialization
- `window.shopify` API'si otomatik olarak oluşturuluyor

### 3. Geliştirilmiş Hata Ayıklama
- Detaylı console log'ları eklendi
- AppBridge initialization sürecini izleyebilirsiniz
- Session token alımı için fallback mekanizması

### 4. Cookie Ayarları
- Production'da: `SameSite=None; Secure; Partitioned`
- Development'ta: `SameSite=Lax` (test kolaylığı için)
- Shopify embedded apps için doğru cookie configuration

## 🔍 Sorun Giderme

### 1. "Missing Shopify API key" Hatası
**Çözüm:**
```bash
# .env dosyasına ekleyin
VITE_SHOPIFY_API_KEY="your-api-key"
VITE_SHOPIFY_APP_API_KEY="your-api-key"
```

Sonra:
```bash
npm run build  # veya
npm run dev
```

### 2. "Shopify App Bridge did not initialise in time" Hatası
**Olası Nedenler:**
- App Bridge script yüklenemedi (CDN problemi)
- API key yanlış veya eksik
- Browser console'da detaylı logları kontrol edin

**Çözüm:**
1. Browser DevTools > Console açın
2. `[shopify-layout]` ile başlayan logları inceleyin
3. `window.shopify` objesinin var olup olmadığını kontrol edin:
   ```javascript
   console.log(window.shopify)
   ```

### 3. "401 Unauthorized" - Catalog API Hatası
**Olası Nedenler:**
- Session token doğru oluşturulamadı
- Cookie'ler set edilemedi
- CORS problemi

**Çözüm:**
1. DevTools > Network tab'ı açın
2. `/api/auth/shopify/session` isteğini inceleyin
3. Response headers'da `Set-Cookie` olup olmadığını kontrol edin
4. Application tab > Cookies'de cookie'lerin set edilip edilmediğini kontrol edin

### 4. Cookies Görünmüyor
**Production'da:**
- Domain'iniz HTTPS olmalı
- `Secure` ve `SameSite=None` gerekli
- Third-party cookies aktif olmalı

**Development'ta:**
- `NODE_ENV=development` olmalı
- Localhost üzerinde çalışıyorsa problem olmamalı

**Kontrol:**
```bash
# Server logs kontrol edin
# "[shopify-auth] Setting session cookies:" ile başlayan log'u bulun
```

### 5. "404" Hatası - app.gsb-engine.dev'den Geri Dönüyor
**Olası Nedenler:**
- Frontend route'ları doğru yapılandırılmamış
- Nginx/proxy ayarları eksik
- Build dosyaları doğru serve edilmiyor

**Çözüm:**
1. `/shopify/embedded` route'unun var olduğunu kontrol edin
2. Vue Router yapılandırmasını kontrol edin
3. Server'ın SPA fallback'i yapılandırıldığından emin olun

## 📝 Test Adımları

1. **Environment Variables Kontrolü:**
```bash
npm run shopify:check
```

2. **Backend Başlatma:**
```bash
npm run api:dev
```

3. **Frontend Başlatma:**
```bash
npm run dev
```

4. **Shopify Admin'den Test:**
- Shopify mağazanıza giriş yapın
- Apps > Your App Name'e tıklayın
- Browser console'u açık tutun ve log'ları izleyin

## 🌐 Production Deployment

Production'a deploy ederken:

1. **.env dosyasını güncelle:**
```bash
NODE_ENV="production"
```

2. **Build:**
```bash
npm run build
```

3. **HTTPS zorunlu:**
- SSL sertifikası kurulu olmalı
- Tüm API endpoint'leri HTTPS üzerinden erişilebilir olmalı

4. **Shopify Partner Dashboard'u güncelle:**
- App URL ve Redirect URL'leri production domain'inizi göstersin

## 📞 Destek

Sorun devam ediyorsa:
1. Browser console log'larını kaydedin
2. Server log'larını kaydedin  
3. `/api/auth/shopify/session` request/response'unu kaydedin
4. Shopify Partner Dashboard ayarlarını kontrol edin

---

**Son Güncelleme:** ${new Date().toISOString()}

