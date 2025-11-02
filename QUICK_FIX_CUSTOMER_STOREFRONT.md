# 🔧 Customer Storefront Quick Fix

## Sorun
- ✅ Merchant panel → Editor çalışıyor
- ❌ Customer storefront → Giriş istiyor (password protection)

## Çözüm 1: Password Protection KAPAT (ÖNERİLEN)

```
Shopify Admin → Online Store → Preferences
→ Password protection → Toggle OFF
→ SAVE
```

**Development store'da bu mümkün olmayabilir!**

---

## Çözüm 2: Extension'ı Sadece Preview'da Göster

Theme editor'da:
1. Product template'i aç
2. GSB block'u ekle
3. **Visibility** → "Admin preview only"

Böylece:
- ✅ Merchant tema customize'da görebilir
- ❌ Customer'lar göremez

---

## Çözüm 3: Store'u Live Yap

Development store → Production:
```
Shopify Admin → Settings → Plan
→ Select a plan (Basic $1/month ilk 3 ay)
→ Store live olunca password opsiyonel
```

---

## 🎯 Önerilen Aksiyon

**Merchant panel'de zaten çalışıyor!** 

Customer storefront için:
1. Password'ü kaldırmayı deneyin
2. Olmazsa, extension'ı sadece merchant preview'da kullanın
3. Veya production store kullanın

---

**Hangisini tercih edersiniz?**

