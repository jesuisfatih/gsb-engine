# PLATFORM ADMIN PANELİ GEREKSİNİMLERİ

## 🎯 SORULAN SORU

**"Uygulama sahibi (platform admin) olarak:**
- Kaç mağaza yükledi?
- Kaç mağaza ücretli pakete geçti?
- Mağazalar hakkında istatistikler?

**görmek için süper admin paneli gerekli mi?"**

---

## ✅ CEVAP: 2 SEVİYE VAR

### 1️⃣ SHOPIFY PARTNER DASHBOARD (Otomatik - Hiçbir Kod Gerekmez)

**Public app olduktan sonra otomatik gelir!**

```
https://partners.shopify.com/4605854/apps/8989906/metrics
```

#### Shopify'ın Sunduğu Metrikler:

**📊 Installation Metrics:**
- ✅ **Total Installs** - Toplam yükleme sayısı
- ✅ **Active Installs** - Şu an aktif olan mağaza sayısı
- ✅ **New Installs (Last 30 days)** - Son 30 günde yeni yüklemeler
- ✅ **Uninstalls** - Kaldırılanlar
- ✅ **Churn Rate** - Terk oranı

**💰 Revenue Metrics (Eğer paid app ise):**
- ✅ **Monthly Recurring Revenue (MRR)**
- ✅ **Total Revenue**
- ✅ **Average Revenue Per User (ARPU)**
- ✅ **Conversion Rate** (Free → Paid)
- ✅ **Subscriber Count** (Ücretli kullanıcı sayısı)

**👥 User Engagement:**
- ✅ **Daily Active Users (DAU)**
- ✅ **Monthly Active Users (MAU)**
- ✅ **Session Duration**
- ✅ **Feature Usage** (hangi özellikler kullanılıyor)

**📍 Demographics:**
- ✅ **Geographic Distribution** (hangi ülkelerden)
- ✅ **Store Size** (küçük/orta/büyük mağazalar)
- ✅ **Industry Breakdown**

**⭐ Quality Metrics:**
- ✅ **App Rating** (yıldız puanı)
- ✅ **Reviews Count** (yorum sayısı)
- ✅ **Support Ticket Volume**
- ✅ **Bug Reports**

**📈 Trend Analysis:**
- ✅ Daily/Weekly/Monthly graphs
- ✅ Cohort analysis
- ✅ Retention curves

---

### 2️⃣ KENDİ APP'İNİZDE PLATFORM ADMIN (Opsiyonel)

#### Mevcut Durumunuz:

**Frontend:**
```vue
// src/pages/super-admin/overview.vue
✅ VAR - Ama sadece UI mockup (placeholder)
```

**Backend:**
```typescript
// server/src/routes/analytics.ts
❌ YOK - Sadece tenant-specific analytics var
❌ YOK - Platform-level (all tenants) yok
```

**Database:**
```prisma
// prisma/schema.prisma
✅ Tenant model var
✅ BillingCharge model var
✅ Order model var
✅ WebhookLog model var

// Bu datalardan platform istatistikleri çıkarılabilir!
```

---

## 🔧 KENDİ PLATFORM ADMIN PANELİ OLUŞTURMAK

### Neden Yapılır?

**Shopify Partner Dashboard yetmiyorsa:**
- ✅ Custom business logic
- ✅ Internal metrics (Shopify'ın vermedikleri)
- ✅ Automated actions (örn: overdue payment olan mağazaları suspend et)
- ✅ Custom reporting
- ✅ Integration with other tools

### Ne Gerekir?

#### PHASE 1: Backend API (4-6 saat)

**Yeni route:** `server/src/routes/platform-admin.ts`

```typescript
import { Router } from "express";

export const platformAdminRouter = Router();

// Middleware: Sadece SUPER_ADMIN erişebilir
platformAdminRouter.use(async (req, res, next) => {
  const { memberships } = req.context;
  // Check if user has SUPER_ADMIN role in ANY tenant
  // (Platform admin = special tenant for app owner)
  const isAdmin = memberships?.some(m => m.role === "SUPER_ADMIN");
  
  if (!isAdmin) {
    return res.status(403).json({ error: "Platform admin access required" });
  }
  
  next();
});

/**
 * GET /api/platform-admin/dashboard
 * Overview statistics
 */
platformAdminRouter.get("/dashboard", async (req, res) => {
  const { prisma } = req.context;
  
  const stats = await Promise.all([
    // Total tenants
    prisma.tenant.count(),
    
    // Active tenants
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    
    // Total revenue (last 30 days)
    prisma.billingCharge.aggregate({
      where: {
        status: "PAID",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      _sum: { amount: true }
    }),
    
    // Total orders (all time)
    prisma.order.count(),
    
    // New tenants (last 30 days)
    prisma.tenant.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    }),
  ]);
  
  res.json({
    data: {
      totalTenants: stats[0],
      activeTenants: stats[1],
      monthlyRevenue: stats[2]._sum.amount || 0,
      totalOrders: stats[3],
      newTenants30d: stats[4],
    }
  });
});

/**
 * GET /api/platform-admin/tenants
 * List all tenants with stats
 */
platformAdminRouter.get("/tenants", async (req, res) => {
  const { prisma } = req.context;
  
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        displayName: true,
        status: true,
        createdAt: true,
        planId: true,
        plan: {
          select: {
            name: true,
            priceMonthly: true,
          }
        },
        _count: {
          select: {
            orders: true,
            designs: true,
            users: true,
          }
        },
        settings: true, // For shopifyDomain
      }
    }),
    prisma.tenant.count(),
  ]);
  
  // Enrich with revenue
  const tenantsWithRevenue = await Promise.all(
    tenants.map(async (tenant) => {
      const revenue = await prisma.billingCharge.aggregate({
        where: {
          tenantId: tenant.id,
          status: "PAID",
        },
        _sum: { amount: true }
      });
      
      return {
        ...tenant,
        shopifyDomain: (tenant.settings as any)?.shopify?.domain || null,
        totalRevenue: revenue._sum.amount || 0,
        orderCount: tenant._count.orders,
        designCount: tenant._count.designs,
        userCount: tenant._count.users,
      };
    })
  );
  
  res.json({
    data: {
      tenants: tenantsWithRevenue,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    }
  });
});

/**
 * GET /api/platform-admin/tenants/:id
 * Detailed tenant info
 */
platformAdminRouter.get("/tenants/:id", async (req, res) => {
  const { prisma } = req.context;
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: {
      plan: true,
      users: {
        include: {
          user: {
            select: {
              email: true,
              displayName: true,
              status: true,
            }
          }
        }
      },
      billingCharges: {
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          subtotal: true,
          createdAt: true,
        }
      }
    }
  });
  
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  
  res.json({ data: tenant });
});

/**
 * GET /api/platform-admin/revenue
 * Revenue analytics
 */
platformAdminRouter.get("/revenue", async (req, res) => {
  const { prisma } = req.context;
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const charges = await prisma.billingCharge.findMany({
    where: {
      status: "PAID",
      createdAt: { gte: startDate }
    },
    select: {
      amount: true,
      createdAt: true,
      tenantId: true,
    }
  });
  
  // Group by day
  const dailyRevenue: Record<string, number> = {};
  
  charges.forEach(charge => {
    const dateKey = charge.createdAt.toISOString().split("T")[0];
    dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (charge.amount.toNumber() || 0);
  });
  
  const labels = Object.keys(dailyRevenue).sort();
  const data = labels.map(key => dailyRevenue[key]);
  
  res.json({
    data: {
      labels,
      series: data,
      totalRevenue: data.reduce((sum, val) => sum + val, 0),
      totalCharges: charges.length,
    }
  });
});

/**
 * POST /api/platform-admin/tenants/:id/suspend
 * Suspend a tenant
 */
platformAdminRouter.post("/tenants/:id/suspend", async (req, res) => {
  const { prisma } = req.context;
  
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { status: "SUSPENDED" }
  });
  
  // TODO: Notify tenant, disable access, etc.
  
  res.json({ data: tenant });
});
```

**Register route:**
```typescript
// server/src/routes/index.ts
import { platformAdminRouter } from "./platform-admin";

apiRouter.use("/platform-admin", platformAdminRouter);
```

---

#### PHASE 2: Frontend Dashboard (4-6 saat)

**Güncelle:** `src/pages/super-admin/overview.vue`

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { $api } from '@/utils/api'

const stats = ref({
  totalTenants: 0,
  activeTenants: 0,
  monthlyRevenue: 0,
  totalOrders: 0,
  newTenants30d: 0,
})

const tenants = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [dashboardRes, tenantsRes] = await Promise.all([
      $api('/api/platform-admin/dashboard'),
      $api('/api/platform-admin/tenants?limit=10'),
    ])
    
    stats.value = dashboardRes.data
    tenants.value = tenantsRes.data.tenants
  } catch (error) {
    console.error('Failed to load platform stats:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="pa-6">
    <h1 class="text-h4 mb-4">Platform Admin Dashboard</h1>
    
    <!-- Stats Cards -->
    <VRow>
      <VCol cols="12" md="3">
        <VCard>
          <VCardText>
            <div class="text-caption">Total Merchants</div>
            <div class="text-h5">{{ stats.totalTenants }}</div>
          </VCardText>
        </VCard>
      </VCol>
      
      <VCol cols="12" md="3">
        <VCard>
          <VCardText>
            <div class="text-caption">Active Merchants</div>
            <div class="text-h5">{{ stats.activeTenants }}</div>
          </VCardText>
        </VCard>
      </VCol>
      
      <VCol cols="12" md="3">
        <VCard>
          <VCardText>
            <div class="text-caption">Monthly Revenue</div>
            <div class="text-h5">${{ stats.monthlyRevenue.toFixed(2) }}</div>
          </VCardText>
        </VCard>
      </VCol>
      
      <VCol cols="12" md="3">
        <VCard>
          <VCardText>
            <div class="text-caption">New (30 days)</div>
            <div class="text-h5">{{ stats.newTenants30d }}</div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    
    <!-- Tenants Table -->
    <VCard class="mt-6">
      <VCardTitle>Recent Merchants</VCardTitle>
      <VTable>
        <thead>
          <tr>
            <th>Store Name</th>
            <th>Shopify Domain</th>
            <th>Plan</th>
            <th>Orders</th>
            <th>Revenue</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tenant in tenants" :key="tenant.id">
            <td>{{ tenant.displayName }}</td>
            <td>{{ tenant.shopifyDomain || '-' }}</td>
            <td>{{ tenant.plan?.name || 'Free' }}</td>
            <td>{{ tenant.orderCount }}</td>
            <td>${{ tenant.totalRevenue.toFixed(2) }}</td>
            <td>
              <VChip 
                :color="tenant.status === 'ACTIVE' ? 'success' : 'error'"
                size="small"
              >
                {{ tenant.status }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </div>
</template>
```

---

#### PHASE 3: Access Control (1-2 saat)

**Problem:** Platform admin kim olacak?

**Çözüm:** Özel bir "Platform" tenant oluştur

```typescript
// Database seed or manual creation
await prisma.tenant.create({
  data: {
    slug: 'platform',
    displayName: 'Platform Administration',
    status: 'ACTIVE',
    users: {
      create: {
        userId: '<YOUR_USER_ID>',
        role: 'SUPER_ADMIN',
      }
    }
  }
})
```

**Route guard:**
```vue
// src/pages/super-admin/overview.vue
definePage({
  meta: {
    layout: 'default',
    action: 'read',
    subject: 'SuperAdminDashboard',
    requiresAuth: true, // ← Ekle
  },
})
```

```typescript
// src/plugins/casl/ability.ts
// SUPER_ADMIN rolüne SuperAdminDashboard yetkisi ver
```

---

## 📊 KARŞILAŞTIRMA

| Özellik | Shopify Partner Dashboard | Kendi Platform Admin |
|---------|---------------------------|----------------------|
| **Setup Süresi** | 0 saat (Otomatik) | 10-15 saat |
| **Maliyet** | Ücretsiz | Development time |
| **Installs** | ✅ Otomatik | ✅ Manual query |
| **Revenue** | ✅ Otomatik (eğer paid) | ✅ Custom logic |
| **Demographics** | ✅ Shopify provides | ❌ Kendiniz toplamalısınız |
| **Custom Metrics** | ❌ Limited | ✅ Her şey |
| **Actions** | ❌ Read-only | ✅ Suspend, notify, etc. |
| **Integrations** | ❌ Shopify only | ✅ Your tools |
| **Real-time** | ⏰ 24h delay | ✅ Instant |

---

## 🎯 ÖNERİM

### PUBLIC APP İÇİN:

**✅ Shopify Partner Dashboard yeterlidir!**

Çünkü:
- ✅ Hiçbir kod gerekmez
- ✅ Public app olduktan sonra otomatik gelir
- ✅ Tüm temel metrikler var
- ✅ Industry standard
- ✅ Shopify support

**❌ Kendi platform admin'e gerek yok** (şimdilik)

---

### İLERİDE (Optional):

Eğer:
- ✅ Custom business logic gerekirse
- ✅ Automated actions istiyorsanız (suspend, notify, etc.)
- ✅ Internal metrics gerekirse
- ✅ Third-party integrations yapacaksanız

**O zaman** kendi platform admin panel geliştirin.

**Ama ilk başta gerekli değil!**

---

## ✅ SONUÇ

**Soru:** "Süper admin paneli gerekli mi?"

**Cevap:**
1. **Shopify Partner Dashboard** → ✅ Otomatik gelir (Public app olduktan sonra)
2. **Kendi Platform Admin** → ❌ Şu an gerekli değil (ileride optional)

**Şu an yapılacak:**
1. ✅ Public app başvurusu yap (GDPR, Privacy Policy, etc.)
2. ✅ Approve edilsin
3. ✅ Shopify Partner Dashboard'u kullan
4. ⏳ İleride ihtiyaç olursa kendi admin panel ekle

---

## 📝 NEXT STEP

**Public app başvurusuna devam edelim mi?**

Priority:
1. 🔴 GDPR webhooks
2. 🔴 Privacy Policy
3. 🔴 App logo
4. 🔴 Screenshots
5. 🔴 Submit!

**Platform admin** → Sonraya bırakabiliriz ✅

