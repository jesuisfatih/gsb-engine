# 🔧 Shopify App Proxy Fix - Community Workaround

## 📚 Kaynak: Shopify Community Documentation

**Problem:** Shopify CLI 3.84+ sonrası App Proxy otomatik sync olmuyor

**Kaynak:** https://community.shopify.dev/t/after-new-dev-platform-update-3-84-proxy-doesnt-work-anymore/22752

---

## ✅ Doğrulanmış Çözüm (Shopify Mühendisleri Tarafından)

### Adım 1: App Proxy'yi Geçici Devre Dışı Bırak

```bash
# shopify.app.toml dosyasında:
# [app_proxy] kısmını comment out yap
```

✅ **YAPILDI** - Commit: `ba019695`

---

### Adım 2: Sunucuda Deploy (Proxy Olmadan)

```bash
ssh root@46.224.20.228 -i "C:\Users\mhmmd\.ssh\id_ed25519"
cd /srv/gsb/api
shopify app deploy
```

**NOT:** İlk kez login yapmanız gerekebilir:
```bash
shopify auth login
# Browser açılacak, Shopify Partners hesabınızla login yapın
```

---

### Adım 3: App Proxy'yi Tekrar Aktif Et

```bash
# shopify.app.toml dosyasında:
# Comment'leri kaldır:

[app_proxy]
url = "https://app.gsb-engine.dev"
subpath = "gsb"
prefix = "apps"
```

---

### Adım 4: Tekrar Deploy

```bash
shopify app deploy
```

Bu işlem App Proxy ayarlarını **sıfırlayıp yeniden kaydediyor**.

---

## 🔍 Password Protection Araştırması

### Shopify Resmi Dokümantasyonunda:

❓ Password protection'ın App Proxy'yi engelleyip engellemediği **AÇIKÇA BELİRTİLMEMİŞ**.

### Test Sonucu:
```bash
curl https://we-dream-studio.myshopify.com/apps/gsb/editor

HTTP/2 302
location: /password   ← Şifre sayfasına yönlendiriyor
```

**İhtimal:**
- Password protected store'larda **public storefront URL'leri** redirect oluyor
- `/apps/gsb/*` URL'leri de etkileniyor olabilir

---

## 🎯 Önerilen Aksiyon Planı

### Seçenek A: Shopify CLI Workaround (Önerilen)

```bash
1. App proxy'yi disable et ✅ YAPILDI
2. shopify app deploy
3. App proxy'yi enable et
4. shopify app deploy
```

### Seçenek B: Password Protection Test

```bash
1. Shopify Admin → Online Store → Preferences
2. Password protection'ı KAPAT
3. Test et
4. Sonucu gör
```

---

## 🛠️ Manuel Adımlar (Sunucuda Yapılacak)

### 1. SSH ile Bağlan
```bash
ssh root@46.224.20.228 -i "C:\Users\mhmmd\.ssh\id_ed25519"
cd /srv/gsb/api
```

### 2. Shopify Login (İlk Kez)
```bash
shopify auth login
```
- Browser açılacak
- Shopify Partners hesabınızla login yapın
- Terminal'e dönün

### 3. İlk Deploy (Proxy Disabled)
```bash
shopify app deploy
```

Soracak:
```
? Select an app: 
  → Gang Sheet Builder By USA
```

### 4. App Proxy'yi Aktif Et
```bash
nano shopify.app.toml
# Comment'leri kaldır:

[app_proxy]
url = "https://app.gsb-engine.dev"
subpath = "gsb"
prefix = "apps"
```

### 5. İkinci Deploy (Proxy Enabled)
```bash
shopify app deploy
```

---

## 🧪 Test

Deploy sonrası:

```bash
curl -I https://we-dream-studio.myshopify.com/apps/gsb/editor
```

**Beklenen:**
```
HTTP/2 200 OK
x-powered-by: Express
content-type: text/html
```

---

## 📊 Hangi Seçeneği Deneyelim?

1. **Shopify CLI Workaround** (Community'den doğrulanmış)
2. **Password Protection'ı Kapat** (Test için)

Her ikisini de deneyebiliriz!

---

**Hangisini önce yapmamı istersiniz?**

