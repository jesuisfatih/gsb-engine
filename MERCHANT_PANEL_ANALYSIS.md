# Merchant Panel Eksilikler Analizi

## 📊 GENEL DURUM

**Toplam Sayfa:** 28 sayfa
**Backend Router:** 17 router
**Tespit Edilen Kritik Eksikler:** 12 kategori

---

## 🔴 KRİTİK EKSİKLER (Yüksek Öncelik)

### 1. **Dashboard Stats API'leri YOK**
**Sayfa:** `dashboard.vue`
**Eksik Endpoint'ler:**
- `GET /api/orders/stats` → 500 Internal Server Error
- `GET /api/gang-sheets/stats` → 404 Not Found
- `GET /api/designs/stats` → 404 Not Found

**Durum:** UI hazır ama backend endpoint'leri yok
**Çözüm:** Stats endpoint'lerini oluştur

---

### 2. **Shopify Integration Eksikleri**
**Sorun:** Tenant'a Shopify credentials kaydedilmiyor
**Eksikler:**
- Shopify OAuth callback'te `shopifyAccessToken` ve `shopifyDomain` tenant'a kaydedilmiyor
- `server/src/routes/auth.ts` → OAuth callback eksik
- Webhook endpoint'leri yok

**Etkilenen:**
- `/api/shopify/products` → 401 (credentials yok)
- Catalog sync çalışmıyor

**Çözüm:** OAuth callback'te tenant güncelle + webhook handler'ları ekle

---

### 3. **Designs Backend Eksiklikleri**
**Sayfa:** `designs.vue`
**Backend:** `/api/designs` var ama eksik
**Eksikler:**
- List designs endpoint yok
- Filter/search yok
- Bulk operations yok

**Çözüm:** Designs router'ını genişlet

---

### 4. **Templates Eksiklikleri**
**Sayfa:** `templates.vue`
**Backend:** `/api/templates` var
**Eksikler:**
- Template preview generation yok
- Template categories yok
- Template marketplace features yok

**Çözüm:** Templates işlevlerini ekle

---

### 5. **Gang Sheets Stats/Summary**
**Sayfa:** `operations.vue`
**Backend:** `/api/gang-sheets` var
**Eksikler:**
- Stats endpoint yok
- Status-based grouping yok
- Utilization metrics yok

**Çözüm:** Gang sheets stats ekle

---

### 6. **Webhooks Monitoring YOK**
**Sayfa:** `webhooks.vue`
**Backend:** Webhook router yok
**Eksikler:**
- Webhook logs yok
- Health monitoring yok
- Retry mechanism yok

**Çözüm:** Webhook infrastructure kur

---

### 7. **Audit Logs Backend YOK**
**Sayfa:** `audit.vue`
**Backend:** `/api/audit` var ama boş
**Eksikler:**
- Event logging yok
- Search/filter yok
- Activity tracking yok

**Çözüm:** Audit logging implement et

---

### 8. **Supplier Routing Eksikleri**
**Sayfa:** `supplier-routing.vue`
**Backend:** `/api/suppliers/routing` var
**Eksikler:**
- Auto-routing logic yok
- Region-based routing yok
- Supplier capabilities matching yok

**Çözüm:** Routing logic ekle

---

### 9. **Analytics Dashboard YOK**
**Sayfa:** `analytics.vue`
**Backend:** Analytics endpoint'leri yok
**Eksikler:**
- Revenue analytics yok
- Product performance yok
- Customer insights yok

**Çözüm:** Analytics infrastructure kur

---

### 10. **Team Management Eksikleri**
**Sayfa:** `team.vue`
**Backend:** User/team endpoint'leri yok
**Eksikler:**
- User CRUD yok
- Role management yok
- Permissions yok

**Çözüm:** User management ekle

---

### 11. **Transactions Backend Eksikleri**
**Sayfa:** `transactions.vue`
**Backend:** `/api/billing` var ama eksik
**Eksikler:**
- Transaction history yok
- Export functionality yok
- Billing periods yok

**Çözüm:** Billing/transactions ekle

---

### 12. **Image/Font Upload Infrastructure**
**Sayfa:** `gallery-images.vue`, `fonts.vue`
**Backend:** `/api/upload` var (base64 only)
**Eksikler:**
- Multipart upload yok
- CDN integration yok
- Image optimization yok
- Font validation yok

**Çözüm:** Upload infrastructure genişlet

---

## 🟡 ORTA ÖNCELİK

### 13. **Catalog Shopify Sync**
- Product import automation yok
- Inventory sync yok
- Price sync yok

### 14. **Print Techniques API**
- Frontend hazır
- Backend var ama test edilmedi

### 15. **Pricing Rules Engine**
- Frontend var
- Backend var
- Integration test edilmedi

---

## 🟢 DÜŞÜK ÖNCELİK

### 16. **Setup Wizard Progress Tracking**
- Setup steps tracking eksik
- Progress calculation yok

### 17. **Notifications System**
- In-app notifications yok
- Email notifications yok

---

## 📋 ÇÖZÜM PLANI (Öncelik Sırası)

### **Faz 1: Kritik Backend API'ler (2-3 saat)**
1. ✅ Shopify OAuth credentials kaydetme
2. ✅ Dashboard stats endpoints
3. ✅ Designs list/filter
4. ✅ Gang sheets stats

### **Faz 2: Integration & Sync (2-3 saat)**
5. ✅ Shopify webhooks
6. ✅ Product sync automation
7. ✅ Audit logging

### **Faz 3: Monitoring & Operations (1-2 saat)**
8. ✅ Webhooks monitoring
9. ✅ Supplier routing
10. ✅ Transactions

### **Faz 4: Advanced Features (2-3 saat)**
11. ✅ Analytics
12. ✅ Team management
13. ✅ Upload infrastructure

---

## 🎯 ÖNERİ

**Şimdi Başlayalım:**
1. Shopify OAuth'u düzelt (credentials kaydedilsin)
2. Dashboard stats ekle
3. Designs API'yi tamamla
4. Webhooks infrastructure kur

**Toplam Tahmini Süre:** 8-10 saat kodlama
**Etkilenen Sayfa:** 28 sayfanın 15'i düzelecek

