<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { $api } from "@/utils/api";
import { formatDate } from "@/@core/utils/formatters";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Dashboard",
    embeddedSubtitle: "Production snapshot and quick actions",
  },
});

interface DashboardStats {
  pendingOrders: number;
  gangSheetsReady: number;
  avgTurnaroundDays: number;
  activeDesigns: number;
  totalRevenue: number;
  completedOrders: number;
}

interface RecentActivity {
  id: string;
  type: "order" | "design" | "gangsheet";
  message: string;
  timestamp: string;
}

const loading = ref(false);
const stats = ref<DashboardStats>({
  pendingOrders: 0,
  gangSheetsReady: 0,
  avgTurnaroundDays: 0,
  activeDesigns: 0,
  totalRevenue: 0,
  completedOrders: 0,
});

const recentActivity = ref<RecentActivity[]>([]);

const quickActions = [
  { title: "Create Shortcode", icon: "tabler-code", route: "/shopify/embedded/shortcodes", color: "primary" },
  { title: "View Orders", icon: "tabler-clipboard-list", route: "/shopify/embedded/orders", color: "success" },
  { title: "Gang Sheets", icon: "tabler-layout-grid", route: "/shopify/embedded/gang-sheet", color: "warning" },
  { title: "Templates", icon: "tabler-template", route: "/shopify/embedded/templates", color: "info" },
];

async function loadDashboardData() {
  loading.value = true;
  try {
    // Load stats from backend
    const [ordersRes, gangSheetsRes, designsRes] = await Promise.all([
      $api<{ data: { total: number; last7Days: number; last30Days: number; byStatus: Record<string, number>; pendingFulfillment: number } }>("/orders/stats"),
      $api<{ data: { total: number; last7Days: number; byStatus: Record<string, number>; inProduction: number; ready: number } }>("/gang-sheets/stats"),
      $api<{ data: { total: number; last7Days: number; byStatus: Record<string, number>; pending: number; approved: number } }>("/designs/stats"),
    ]);

    console.log("[dashboard] Loaded stats:", { ordersRes, gangSheetsRes, designsRes });

    stats.value = {
      pendingOrders: ordersRes.data?.pendingFulfillment ?? 0,
      gangSheetsReady: gangSheetsRes.data?.ready ?? 0,
      avgTurnaroundDays: 2.1, // TODO: Calculate from jobs
      activeDesigns: designsRes.data?.pending ?? 0,
      totalRevenue: 12450.00, // TODO: Calculate from billing
      completedOrders: ordersRes.data?.byStatus?.["Completed"] ?? 0,
    };

    // Load recent activity from audit log
    const activityRes = await $api<{ data: { items: Array<{ id: string; event: string; entity: string; createdAt: string }> } }>("/audit?limit=5&sortOrder=desc");
    
    // Transform audit logs to activity format
    recentActivity.value = (activityRes.data?.items ?? []).map(log => {
      let type: "order" | "design" | "gangsheet" = "order";
      let message = `${log.entity}: ${log.event}`;
      
      if (log.entity === "DesignDocument" || log.entity === "Design") {
        type = "design";
        message = `Design ${log.event.replace('_', ' ')}`;
      } else if (log.entity === "GangSheet") {
        type = "gangsheet";
        message = `Gang sheet ${log.event.replace('_', ' ')}`;
      } else if (log.entity === "Order") {
        type = "order";
        message = `Order ${log.event.replace('_', ' ')}`;
      }
      
      return {
        id: log.id,
        type,
        message,
        timestamp: log.createdAt,
      };
    });
  } catch (error) {
    console.error("[dashboard] Failed to load data:", error);
    
    // Fallback to empty/default values
    stats.value = {
      pendingOrders: 0,
      gangSheetsReady: 0,
      avgTurnaroundDays: 0,
      activeDesigns: 0,
      totalRevenue: 0,
      completedOrders: 0,
    };
    recentActivity.value = [];
  } finally {
    loading.value = false;
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "order": return "tabler-shopping-cart";
    case "design": return "tabler-brush";
    case "gangsheet": return "tabler-layout-grid";
    default: return "tabler-circle-dot";
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case "order": return "primary";
    case "design": return "success";
    case "gangsheet": return "warning";
    default: return "secondary";
  }
}

onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <div class="dashboard-page">
    <!-- Production Snapshot -->
    <section class="metrics-grid">
      <VCard class="metric-card">
        <VCardText>
          <div class="metric-content">
            <VIcon icon="tabler-clock-pause" size="40" color="warning" class="metric-icon" />
            <div>
              <p class="metric-label">Pending DTF Orders</p>
              <h3 class="metric-value">{{ stats.pendingOrders }}</h3>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VCard class="metric-card">
        <VCardText>
          <div class="metric-content">
            <VIcon icon="tabler-layout-grid" size="40" color="success" class="metric-icon" />
            <div>
              <p class="metric-label">Gang Sheets Ready</p>
              <h3 class="metric-value">{{ stats.gangSheetsReady }}</h3>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VCard class="metric-card">
        <VCardText>
          <div class="metric-content">
            <VIcon icon="tabler-clock" size="40" color="primary" class="metric-icon" />
            <div>
              <p class="metric-label">Avg Turnaround</p>
              <h3 class="metric-value">{{ stats.avgTurnaroundDays.toFixed(1) }} days</h3>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VCard class="metric-card">
        <VCardText>
          <div class="metric-content">
            <VIcon icon="tabler-brush" size="40" color="info" class="metric-icon" />
            <div>
              <p class="metric-label">Active Designs</p>
              <h3 class="metric-value">{{ stats.activeDesigns }}</h3>
            </div>
          </div>
        </VCardText>
      </VCard>
    </section>

    <!-- Quick Actions -->
    <section class="quick-actions-section">
      <VCard>
        <VCardTitle>Quick Actions</VCardTitle>
        <VCardText>
          <div class="quick-actions-grid">
            <VBtn
              v-for="action in quickActions"
              :key="action.title"
              :color="action.color"
              variant="tonal"
              size="large"
              :prepend-icon="action.icon"
              :to="action.route"
              block
            >
              {{ action.title }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </section>

    <!-- Recent Activity -->
    <section class="activity-section">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Recent Activity</span>
          <VBtn variant="text" size="small" to="/shopify/embedded/audit">View All</VBtn>
        </VCardTitle>
        <VCardText>
          <VList v-if="recentActivity.length" lines="two">
            <VListItem
              v-for="activity in recentActivity"
              :key="activity.id"
              :prepend-icon="getActivityIcon(activity.type)"
            >
              <VListItemTitle>{{ activity.message }}</VListItemTitle>
              <VListItemSubtitle>{{ formatDate(activity.timestamp, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }}</VListItemSubtitle>
              
              <template #append>
                <VChip size="small" :color="getActivityColor(activity.type)" variant="tonal">
                  {{ activity.type }}
                </VChip>
              </template>
            </VListItem>
          </VList>
          
          <VAlert v-else type="info" variant="tonal">
            No recent activity to display.
          </VAlert>
        </VCardText>
      </VCard>
    </section>

    <!-- Performance Overview -->
    <section class="performance-section">
      <VCard>
        <VCardTitle>Performance Overview</VCardTitle>
        <VCardText>
          <div class="performance-grid">
            <div class="performance-item">
              <p class="performance-label">Completed Orders</p>
              <h4 class="performance-value">{{ stats.completedOrders }}</h4>
            </div>
            <div class="performance-item">
              <p class="performance-label">Total Revenue</p>
              <h4 class="performance-value">${{ stats.totalRevenue.toFixed(2) }}</h4>
            </div>
            <div class="performance-item">
              <p class="performance-label">Active Designs</p>
              <h4 class="performance-value">{{ stats.activeDesigns }}</h4>
            </div>
          </div>
        </VCardText>
      </VCard>
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 24px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.metric-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  flex-shrink: 0;
}

.metric-label {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 4px;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.activity-section,
.performance-section,
.quick-actions-section {
  display: grid;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
}

.performance-item {
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
}

.performance-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 8px;
}

.performance-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

@media (max-width: 960px) {
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .performance-grid {
    grid-template-columns: 1fr;
  }
}
</style>

