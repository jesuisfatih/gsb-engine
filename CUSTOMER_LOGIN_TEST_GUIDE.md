# CUSTOMER LOGIN İLE TEST REHBERİ

## 🎯 AMAÇ

Development store'da **gerçek customer** olarak giriş yapıp customize button'u test etmek.

---

## ✅ ADIM 1: TEST CUSTOMER OLUŞTUR

### Admin Panel

```
https://admin.shopify.com/store/we-dream-studio/customers
```

### Yeni Customer Ekle

1. **"Add customer"** butonuna tıkla
2. **First name:** Test
3. **Last name:** Customer
4. **Email:** `testcustomer@example.com`
5. **Phone:** (optional)
6. **"Customer accounts"** section:
   - ⚠️ **"Send account invite email"** seçeneğini **KAPATMA**
   - ✅ Bunun yerine **manuel password** belirle
7. **Password:** `TestPass123!` (unutmayın!)
8. **"Save customer"** butonuna bas

✅ Customer oluşturuldu!

---

## ✅ ADIM 2: PREVIEW LINK AL (PASSWORD BYPASS)

### Theme Customize

```
https://admin.shopify.com/store/we-dream-studio/online_store/themes
```

### Preview Mode

1. **"Customize"** butonuna tıkla (mevcut temanızda)
2. Sağ üstte **göz ikonu** (👁️) veya **"Preview"** dropdown
3. **"Default"** seçeneğini tıkla
4. **Yeni tab açılır:** 
   ```
   https://we-dream-studio.myshopify.com?preview_theme_id=XXXXX&key=YYYYY
   ```
5. **Bu URL'yi KOPYALA!** 📋

**Bu URL:**
- ✅ Password protection bypass edilmiş
- ✅ Store herkese açık (geçici)
- ✅ Customer login yapılabilir

---

## ✅ ADIM 3: CUSTOMER OLARAK GİRİŞ YAP

### Yeni Incognito Window

1. Browser → **New incognito window** aç
2. **Preview URL'yi yapıştır:**
   ```
   https://we-dream-studio.myshopify.com?preview_theme_id=XXXXX&key=YYYYY
   ```
3. Store açılır (password YOK! ✅)

### Login

1. Sağ üstte **"Account"** veya **profile icon** tıkla
2. **"Log in"** seçeneğine tıkla
3. **Login form:**
   - Email: `testcustomer@example.com`
   - Password: `TestPass123!`
4. **"Sign in"** butonuna bas

✅ Customer olarak giriş yaptınız!

---

## ✅ ADIM 4: CUSTOMIZE BUTTON'U TEST ET

### Product Page'e Git

1. Navigation'dan **"Products"** veya **"Shop"** seçeneğine tıkla
2. Bir **ürün seçin** (örn: Fight Club Kanvas Tablo)
3. Ürün detay sayfası açılır

### Customize Button

1. **"Customize & Add to cart"** butonunu göreceksiniz
2. **Butona tıkla**
3. **Ne olmalı:**
   - ✅ Yeni tab açılmalı
   - ✅ Editor yüklenmeli
   - ✅ Customer olarak authenticate olmuş durumdasınız
   - ✅ Design yapabilmelisiniz
   - ✅ Checkout çalışmalı

### Console Check (Developer Tools)

```javascript
// F12 → Console
console.log('User authenticated:', !!localStorage.getItem('gsb:accessToken'))
console.log('Session:', localStorage.getItem('gsb:userData'))
```

**Beklenen:**
- `User authenticated: false` (çünkü app user değil, Shopify customer)
- **Ama editor yine de çalışmalı** (anonymous user olarak)

---

## 🐛 OLASI PROBLEMLER & ÇÖZÜMLER

### Problem 1: Preview Link Expire Oldu

**Hata:** Password screen tekrar geldi

**Çözüm:** Preview link'i yeniden al (ADIM 2'yi tekrarla)

---

### Problem 2: Login Butonunu Bulamıyorum

**Çözüm 1:** URL'ye direkt git:
```
https://we-dream-studio.myshopify.com/account/login?preview_theme_id=XXXXX&key=YYYYY
```

**Çözüm 2:** Theme'de customer accounts açık mı kontrol et:
```
Admin → Online Store → Themes → Customize → Theme settings → Customer accounts
```

---

### Problem 3: Customize Button Yine Admin'e Yönlendiriyor

**Neden:** `_self` target admin redirect'i tetikliyor

**Zaten düzelttik:**
- ✅ `_blank` kullanıyoruz (yeni tab)

**Test edin:**
- Yeni tab açılmalı
- O tab'de de preview link geçerli olmalı

---

### Problem 4: Editor "no_cookie_auth_token" Hatası

**Hata:**
```
admin.shopify.com/login?errorHint=no_cookie_auth_token
```

**Neden:** 
- Editor App Bridge kullanmaya çalışıyor
- Ama storefront'tan açıldığında App Bridge yok

**Çözüm:** Editor'ün context detection'ını düzelt

**Check:**
```javascript
// Editor'de
console.log('Current URL:', window.location.href)
console.log('Referrer:', document.referrer)

// Eğer myshopify.com'dan geliyorsa → Storefront mode
// Eğer admin.shopify.com'dan geliyorsa → Embedded mode
```

---

## 🎯 BAŞARI KRİTERLERİ

✅ **Adım 1:** Customer oluşturuldu  
✅ **Adım 2:** Preview link alındı  
✅ **Adım 3:** Customer olarak giriş yapıldı  
✅ **Adım 4:** Customize button'a basıldı  
✅ **Adım 5:** Editor açıldı (yeni tab)  
✅ **Adım 6:** Design yapıldı  
✅ **Adım 7:** Checkout çalıştı  

---

## 📸 EKRAN GÖRÜNTÜLERİ İSTENİLEN

Eğer çalışmazsa, şu ekran görüntülerini atın:

1. **Preview link URL'si** (key'i blur edin)
2. **Customer login ekranı**
3. **Logged in customer (sağ üst köşe)**
4. **Product page with customize button**
5. **Console (F12)** - errors varsa
6. **Network tab** - 404/401 errors varsa

---

## 🎉 BAŞARILI OLURSA

**Tebrikler!** ✅

- Customer olarak test ettiniz
- Anonymous user flow çalışıyor
- Public app'e gerek YOK (preview link yeterli!)

**Ama:**
- ⚠️ Preview link expire olur (birkaç saat)
- ⚠️ Gerçek customers için Public app şart

---

## 🚀 PUBLIC APP GEREKLİ Mİ?

| Durum | Preview Link | Public App |
|-------|--------------|------------|
| **Development test** | ✅ Yeterli | ❌ Gerekli değil |
| **Real customers** | ❌ Expire olur | ✅ Şart |
| **Production** | ❌ Kullanılamaz | ✅ Şart |
| **Long-term** | ❌ Sürdürülemez | ✅ Şart |

**Sonuç:**
- **Şimdi test için:** Preview link YETERLİ! ✅
- **Production için:** Public app ŞART! ✅

---

## 📝 NEXT STEPS

1. **Şimdi:** Preview link ile customer test edin
2. **Sonra:** Public app başvurusuna devam edin
   - GDPR webhooks
   - Privacy policy
   - Screenshots
   - Submit
3. **2-4 hafta sonra:** Real store'da test edin

**İlk önce customer test edin! Çalışmazsa ekran görüntüleri atın!** 🚀

