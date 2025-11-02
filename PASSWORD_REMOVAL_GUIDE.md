# 🔓 Shopify Password Protection Kaldırma (ÜCRETSİZ)

## ✅ Shopify Resmi Kaynaklardan Doğrulandı

**Kaynak:** Shopify Community (Resmi)
> "Development stores are password protected by default. App proxy routes redirect to /password page."

**Çözüm:** Password protection'ı kaldır

---

## 📋 ADIM ADIM KILAVUZ (ÜCRETSİZ)

### Adım 1: Shopify Admin'e Giriş

```
https://we-dream-studio.myshopify.com/admin
```

**Login bilgilerinizle** giriş yapın.

---

### Adım 2: Online Store → Preferences

1. Sol menüden **"Online Store"** (Çevrimiçi Mağaza) seçin
2. **"Preferences"** (Tercihler) tıklayın

---

### Adım 3: Aşağı Scroll - Password Protection Bölümü

Şu başlığı bulun:
```
"Restrict access to visitors with the password"
veya
"Ziyaretçi erişimini şifre ile kısıtla"
```

Altında şöyle bir checkbox olacak:
```
☑ Enable password
```

---

### Adım 4: Checkbox'ı KALDIR

```
ÖNCE: ☑ Enable password
         [Password: ********]
         
SONRA: ☐ Enable password  ← İŞARETİ KALDIR!
```

**NOT:** Development store'larda password kaldırmak için **plan satın almanıza GEREK YOK!**

---

### Adım 5: SAVE

Sayfanın üstünde veya altında **"Save"** (Kaydet) butonu olacak.

**MUTLAKA TIKLAYIN!**

---

## 🧪 TEST (Password Kaldırıldıktan Sonra)

### Test 1: Browser'dan
```
1. https://we-dream-studio.myshopify.com adresine gidin
2. Şifre istememeli, direkt store açılmalı ✅
```

### Test 2: Customize Button
```
1. Product sayfasına gidin
2. Customize butonuna basın
3. Editor açılmalı (beyaz sayfa değil) ✅
```

### Test 3: Network Tab
```
F12 → Network → /apps/gsb/editor isteğine bakın

Beklenen Headers:
✅ HTTP/2 200 OK
✅ x-powered-by: Express
✅ content-type: text/html
✅ NO "location: /password"
```

---

## 🚨 Eğer "Save" Butonu Gri ise

Bazı development store'larda password disabled edilemiyorsa:

### Alternatif: Yeni Development Store Oluşturun

1. **Shopify Partners** → https://partners.shopify.com/
2. **Stores** → **Add store**
3. **Development store** seçin
4. Mağaza oluşturun
5. **Online Store → Preferences → Password'ü KALDIR**
6. Uygulamanızı bu store'a kurun

---

## ⏱️ Ne Kadar Sürer?

- **Password kaldırma:** 1 dakika
- **Test:** 1 dakika
- **Toplam:** 2 dakika ⚡

---

## 🎯 YAPMANIZ GEREKEN

1. ✅ Shopify Admin → https://we-dream-studio.myshopify.com/admin
2. ✅ Online Store → Preferences
3. ✅ Password protection checkbox'ını KALDIR
4. ✅ SAVE
5. ✅ Test edin
6. ✅ Sonucu bana bildirin!

---

**Development store'da password kaldırmak için PLAN GEREKMİYOR!**

Bu sadece bir ayar değişikliği. ÜCRETSİZ! 🆓

