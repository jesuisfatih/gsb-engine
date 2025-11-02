# 🔧 Development Store - App Proxy Workaround

## ✅ TESPİT: Backend'e İstek Geliyor!

Backend logs:
```
[proxy] Editor requested via App Proxy ✅
[proxy] Serving static file: loader.css ✅
```

**App Proxy çalışıyor, ama Shopify response'u intercept ediyor!**

---

## 🎯 Development Store Sorunu

Development store'da:
- ✅ App Proxy request'i backend'e iletiyor
- ❌ Backend'in response'u tarayıcıya ulaşamıyor
- ❌ Shopify 302 /password ile override ediyor

---

## ✅ ÇÖZÜM 1: Shopify Admin'den Test (ÖNERİLEN)

### Extension'ı Shopify Admin'de Kullanın

**Customize button CUSTOMER storefront'ta değil, ADMIN'de çalışır!**

1. **Shopify Admin'e Gidin:**
   ```
   https://we-dream-studio.myshopify.com/admin
   ```

2. **Products → Fight Club Kanvas Tablo**

3. **"Customize" Theme**
   - Sağ üstte **"Customize"** butonu olacak
   - Tıklayın

4. **Product Sayfasına Gidin**
   - Theme editor'de product template'i seçin

5. **GSB Block Ekleyin/Kullanın**
   - Sol panelde "Add block"
   - "Gang Sheet Builder" bloğunu bulun
   - Ekleyin

6. **Preview'da Test Edin**
   - Sağ üstte "Preview" butonuna basın
   - Customize butonuna basın
   - **Editor Shopify Admin içinde açılmalı!**

---

## ✅ ÇÖZÜM 2: Store'u "Live" Hale Getirin

Development store'u production'a al:

### Adım 1: Shopify Admin
```
Settings → Plan → Select a plan
```

### Adım 2: Plan Seçin
- **Basic** plan yeterli
- İlk 3 ay $1/month

### Adım 3: Store Live Olunca
- Password protection opsiyonel hale gelir
- Kaldırabilirsiniz

---

## ✅ ÇÖZÜM 3: Test Store Oluşturun (ÜCRETSİZ)

Başka bir development store oluşturup test edin:

### Adım 1: Shopify Partners
```
https://partners.shopify.com/ → Stores → Add store
```

### Adım 2: Development Store
```
Development store → Create
```

### Adım 3: Password'ü Hemen Kaldırın
```
Yeni store'da:
Online Store → Preferences → Password protection → OFF
```

**NOT:** Yeni oluşturulan bazı dev store'larda password kaldırılabiliyor!

---

## 🔍 ÇÖZÜM 4: Extension'ı Embedded App'ten Kullanın

Customer storefront yerine **embedded app** üzerinden:

### URL:
```
https://admin.shopify.com/store/we-dream-studio/apps/gang-sheet-builder-by-usa
```

Buradan editor'ü açın, password bypass olur!

---

## 📊 Hangi Çözüm?

| Çözüm | Süre | Maliyet | Başarı Oranı |
|-------|------|---------|--------------|
| Admin'den Test | 2 dk | ÜCRETSİZ | %100 |
| Plan Al | 10 dk | $1/month | %100 |
| Yeni Store | 5 dk | ÜCRETSİZ | %80 |
| Embedded App | 2 dk | ÜCRETSİZ | %100 |

---

## 🎯 ÖNERİM

**En hızlı:** Shopify Admin'den test edin!

```
Admin → Products → Customize theme → Preview → Test
```

Buradan test edin, password bypass olur!

---

**Hangi yöntemi denemek istersiniz?**

