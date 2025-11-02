# 🚀 Yeni Shopify Store - Kurulum ve Migration Guide

## ✅ Neden Yeni Store?

Development store'da:
- ❌ Password protection zorunlu
- ❌ App Proxy customer storefront'ta çalışmıyor
- ❌ Extension test edilemiyor

Production store'da (Trial):
- ✅ Password protection opsiyonel (kaldırılabilir)
- ✅ App Proxy tam çalışır
- ✅ Extension'lar canlı test edilir
- ✅ İlk 3 ay $1/month

---

## 📋 ADIM 1: Yeni Store Kur

### 1.1 Shopify'a Kaydol (Yeni Email ile VEYA Mevcut)

```
https://www.shopify.com/free-trial
```

**Bilgiler:**
- Store name: `your-brand-name` (istediğiniz)
- Email: Mevcut veya yeni email
- Plan: **Basic** ($1/month ilk 3 ay)

### 1.2 İlk Kurulum

```
1. Store bilgilerini doldurun
2. "Skip" ile hızlı geçin
3. Admin panel'e ulaşın
```

---

## 📋 ADIM 2: Password Protection'ı HEMEN KALDIR

### 2.1 Öncelikli!

```
Shopify Admin → Online Store → Preferences
→ Password protection → Toggle OFF ✅
→ SAVE
```

**Bu adımı atlarsanız aynı sorun olur!**

---

## 📋 ADIM 3: Shopify App'i Yeni Store'a Kur

### 3.1 Shopify Partner Dashboard

```
https://partners.shopify.com/
→ Apps → Gang Sheet Builder By USA
→ Test your app
→ Select store → [YENİ STORE'UNUZU SEÇİN]
```

### 3.2 App Install

```
1. Yeni store seçin
2. "Install app" tıklayın
3. Permissions onaylayın
4. App yüklenecek
```

---

## 📋 ADIM 4: Extension'ı Deploy Et

### 4.1 Sunucudan Deploy

```bash
ssh root@46.224.20.228 -i "C:\Users\mhmmd\.ssh\id_ed25519"
cd /srv/gsb/api
shopify app deploy
```

**Sorular:**
```
? Select a store: [YENİ STORE'UNUZU SEÇİN]
? Release version: Yes
```

---

## 📋 ADIM 5: .env Dosyasını Güncelle

### 5.1 Yeni Store Domain

```bash
ssh root@46.224.20.228
cd /srv/gsb/api
nano .env
```

**Değiştirilecekler:**
```bash
# ÖNCE (eski):
SHOPIFY_STORE_DOMAIN=we-dream-studio.myshopify.com
SHOPIFY_DEFAULT_TENANT_SLUG=we-dream-studio

# SONRA (yeni):
SHOPIFY_STORE_DOMAIN=your-new-store.myshopify.com
SHOPIFY_DEFAULT_TENANT_SLUG=your-new-store
```

**SAVE:** `Ctrl+O` → Enter → `Ctrl+X`

### 5.2 Backend Restart

```bash
docker compose restart app
```

---

## 📋 ADIM 6: Theme'e Extension Ekle

### 6.1 Online Store → Themes

```
Shopify Admin → Online Store → Themes
→ Customize (aktif tema)
```

### 6.2 Product Template

```
1. Templates → Product → Default product
2. Add block → "Gang Sheet Builder"
3. Bloğu ekleyin
4. SAVE
```

---

## 📋 ADIM 7: Test Product Oluştur

### 7.1 Yeni Product

```
Products → Add product
Name: Test Product
Price: $10
SAVE
```

### 7.2 Product'ı Aç

```
View product (storefront)
→ Customize butonunu görmelisiniz ✅
```

---

## 🧪 TEST

### Test 1: Customer Storefront

```
https://your-new-store.myshopify.com/products/test-product
→ ✅ Şifre OLMAMALI!
→ ✅ Customize butonu GÖRMELİ!
→ Customize'a bas
→ ✅ Editor AÇILMALI!
```

### Test 2: Merchant Panel

```
https://admin.shopify.com/store/your-new-store/apps/gang-sheet-builder
→ ✅ Editor açılmalı!
```

---

## ⏱️ Ne Kadar Sürer?

| Adım | Süre |
|------|------|
| Store kurulum | 5 dakika |
| Password kapat | 1 dakika |
| App install | 2 dakika |
| Extension deploy | 3 dakika |
| .env güncelle | 2 dakika |
| Test product | 2 dakika |
| **TOPLAM** | **15 dakika** |

---

## 💰 Maliyet

```
Basic Plan:
- İlk 3 ay: $1/month
- Sonrası: $39/month (veya iptal)

Trial:
- 3 gün ücretsiz
- Kredi kartı gerekli
```

---

## 🎯 Migration Özeti

```
ESKİ: we-dream-studio (dev store, password locked)
      ↓
YENİ: your-brand (production, password free)
      ↓
SONUÇ: Her yerden çalışır! ✅
```

---

## 📞 Destek

Yeni store kurduktan sonra:

1. ✅ Password'ü kapat
2. ✅ App'i kur
3. ✅ Extension deploy et
4. ✅ .env güncelle
5. ✅ Test et

**15 dakikada bitecek!**

---

**Yeni store kurmak ister misiniz?**

