<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { $api } from "@/utils/api";
import { useTheme } from "vuetify";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Analytics",
    embeddedSubtitle: "Monitor sales performance, editor usage, and gang sheet efficiency.",
  },
});

const theme = useTheme();
const loading = ref(true);

// Stats data
const ordersStats = ref<any>(null);
const gangSheetsStats = ref<any>(null);
const designsStats = ref<any>(null);

// Revenue chart data
const revenueChartSeries = ref<any[]>([]);
const revenueChartOptions = computed(() => ({
  chart: {
    type: 'area',
    height: 300,
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  colors: [theme.current.value.colors.primary],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.1,
      stops: [0, 90, 100]
    }
  },
  xaxis: {
    categories: ['7 days ago', '6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday', 'Today'],
    labels: { style: { colors: theme.current.value.colors['on-surface'] } }
  },
  yaxis: {
    labels: {
      style: { colors: theme.current.value.colors['on-surface'] },
      formatter: (val: number) => `$${val.toFixed(0)}`
    }
  },
  grid: {
    borderColor: theme.current.value.colors['surface-variant'],
    strokeDashArray: 5,
  },
  tooltip: {
    theme: theme.current.value.dark ? 'dark' : 'light',
    y: {
      formatter: (val: number) => `$${val.toFixed(2)}`
    }
  }
}));

// Orders chart data
const ordersChartSeries = ref<any[]>([]);
const ordersChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 300,
    toolbar: { show: false },
  },
  colors: [theme.current.value.colors.success],
  plotOptions: {
    bar: {
      borderRadius: 8,
      distributed: false,
      columnWidth: '60%',
    }
  },
  dataLabels: { enabled: false },
  xaxis: {
    categories: ['7 days ago', '6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday', 'Today'],
    labels: { style: { colors: theme.current.value.colors['on-surface'] } }
  },
  yaxis: {
    labels: {
      style: { colors: theme.current.value.colors['on-surface'] }
    }
  },
  grid: {
    borderColor: theme.current.value.colors['surface-variant'],
    strokeDashArray: 5,
  },
  tooltip: {
    theme: theme.current.value.dark ? 'dark' : 'light',
  }
}));

// Gang Sheet Utilization chart
const utilizationChartSeries = ref<number[]>([]);
const utilizationChartOptions = computed(() => ({
  chart: {
    type: 'radialBar',
    height: 280,
  },
  colors: [theme.current.value.colors.warning],
  plotOptions: {
    radialBar: {
      hollow: {
        size: '60%',
      },
      dataLabels: {
        name: {
          fontSize: '16px',
          color: theme.current.value.colors['on-surface'],
        },
        value: {
          fontSize: '24px',
          fontWeight: 700,
          color: theme.current.value.colors.warning,
          formatter: (val: number) => `${val.toFixed(1)}%`
        }
      }
    }
  },
  labels: ['Avg Utilization'],
}));

// Order Status Distribution chart
const statusDistributionSeries = ref<number[]>([]);
const statusDistributionOptions = computed(() => ({
  chart: {
    type: 'donut',
    height: 300,
  },
  colors: [
    theme.current.value.colors.info,
    theme.current.value.colors.warning,
    theme.current.value.colors.success,
    theme.current.value.colors.error,
  ],
  labels: ['Created', 'In Progress', 'Completed', 'Failed'],
  legend: {
    position: 'bottom',
    labels: {
      colors: theme.current.value.colors['on-surface']
    }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total Orders',
            color: theme.current.value.colors['on-surface'],
            formatter: (w: any) => {
              return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
            }
          }
        }
      }
    }
  },
  tooltip: {
    theme: theme.current.value.dark ? 'dark' : 'light',
  }
}));

async function loadAnalytics() {
  loading.value = true;
  try {
    // Fetch stats and analytics data from backend
    const [ordersRes, gangSheetsRes, designsRes, revenueRes, ordersTrendRes, utilizationRes] = await Promise.all([
      $api<{ data: any }>("/orders/stats"),
      $api<{ data: any }>("/gang-sheets/stats"),
      $api<{ data: any }>("/designs/stats"),
      $api<{ data: { labels: string[]; series: number[] } }>("/analytics/revenue?days=7").catch(() => ({ data: null })),
      $api<{ data: { labels: string[]; series: number[] } }>("/analytics/orders?days=7").catch(() => ({ data: null })),
      $api<{ data: { average: number } }>("/analytics/utilization").catch(() => ({ data: null })),
    ]);

    ordersStats.value = ordersRes.data;
    gangSheetsStats.value = gangSheetsRes.data;
    designsStats.value = designsRes.data;

    // Revenue chart from backend
    if (revenueRes.data) {
      revenueChartSeries.value = [{
        name: 'Revenue',
        data: revenueRes.data.series
      }];
    } else {
      // Fallback to empty chart
      revenueChartSeries.value = [{ name: 'Revenue', data: Array(8).fill(0) }];
    }

    // Orders trend from backend
    if (ordersTrendRes.data) {
      ordersChartSeries.value = [{
        name: 'Orders',
        data: ordersTrendRes.data.series
      }];
    } else {
      // Fallback to empty chart
      ordersChartSeries.value = [{ name: 'Orders', data: Array(8).fill(0) }];
    }

    // Gang sheet utilization from backend
    if (utilizationRes.data) {
      utilizationChartSeries.value = [utilizationRes.data.average];
    } else {
      utilizationChartSeries.value = [0];
    }

    // Order status distribution from orders stats
    const byStatus = ordersRes.data?.byStatus || {};
    statusDistributionSeries.value = [
      byStatus["Created"] || 0,
      (byStatus["Queued"] || 0) + (byStatus["In production"] || 0),
      byStatus["Completed"] || 0,
      (byStatus["Failed"] || 0) + (byStatus["Cancelled"] || 0),
    ];

  } catch (error) {
    // Error logging is handled by debug utility
    if (import.meta.env.DEV) {
      console.error("[analytics] Failed to load data:", error);
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAnalytics();
});
</script>

<template>
  <div class="section-shell">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <VProgressCircular indeterminate color="primary" size="64" />
      <p class="mt-4">Loading analytics...</p>
    </div>

    <!-- Charts Grid -->
    <template v-else>
      <!-- Revenue Chart -->
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Revenue Trend</span>
          <VChip color="success" variant="tonal" size="small">
            Last 7 Days
          </VChip>
        </VCardTitle>
        <VCardText>
          <VueApexCharts
            type="area"
            height="300"
            :options="revenueChartOptions"
            :series="revenueChartSeries"
          />
        </VCardText>
      </VCard>

      <!-- Orders Chart -->
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Orders Volume</span>
          <VChip color="primary" variant="tonal" size="small">
            Last 7 Days
          </VChip>
        </VCardTitle>
        <VCardText>
          <VueApexCharts
            type="bar"
            height="300"
            :options="ordersChartOptions"
            :series="ordersChartSeries"
          />
        </VCardText>
      </VCard>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <!-- Gang Sheet Utilization -->
        <VCard>
          <VCardTitle>Gang Sheet Utilization</VCardTitle>
          <VCardText>
            <VueApexCharts
              type="radialBar"
              height="280"
              :options="utilizationChartOptions"
              :series="utilizationChartSeries"
            />
            <div class="text-center mt-2">
              <p class="text-body-2 text-medium-emphasis">
                {{ gangSheetsStats?.total || 0 }} total sheets
              </p>
            </div>
          </VCardText>
        </VCard>

        <!-- Order Status Distribution -->
        <VCard>
          <VCardTitle>Order Status</VCardTitle>
          <VCardText>
            <VueApexCharts
              type="donut"
              height="300"
              :options="statusDistributionOptions"
              :series="statusDistributionSeries"
            />
          </VCardText>
        </VCard>
      </div>

      <!-- Key Metrics Cards -->
      <div class="metrics-grid">
        <VCard>
          <VCardText class="d-flex align-center">
            <VIcon icon="tabler-shopping-cart" size="40" color="primary" class="me-4" />
            <div>
              <p class="text-caption text-medium-emphasis mb-1">Total Orders</p>
              <h3 class="text-h4">{{ ordersStats?.total || 0 }}</h3>
              <p class="text-caption text-success">
                +{{ ordersStats?.last7Days || 0 }} this week
              </p>
            </div>
          </VCardText>
        </VCard>

        <VCard>
          <VCardText class="d-flex align-center">
            <VIcon icon="tabler-layout-grid" size="40" color="success" class="me-4" />
            <div>
              <p class="text-caption text-medium-emphasis mb-1">Gang Sheets</p>
              <h3 class="text-h4">{{ gangSheetsStats?.total || 0 }}</h3>
              <p class="text-caption text-success">
                +{{ gangSheetsStats?.last7Days || 0 }} this week
              </p>
            </div>
          </VCardText>
        </VCard>

        <VCard>
          <VCardText class="d-flex align-center">
            <VIcon icon="tabler-brush" size="40" color="warning" class="me-4" />
            <div>
              <p class="text-caption text-medium-emphasis mb-1">Active Designs</p>
              <h3 class="text-h4">{{ designsStats?.pending || 0 }}</h3>
              <p class="text-caption text-info">
                {{ designsStats?.total || 0 }} total
              </p>
            </div>
          </VCardText>
        </VCard>

        <VCard>
          <VCardText class="d-flex align-center">
            <VIcon icon="tabler-check-circle" size="40" color="info" class="me-4" />
            <div>
              <p class="text-caption text-medium-emphasis mb-1">Pending Fulfillment</p>
              <h3 class="text-h4">{{ ordersStats?.pendingFulfillment || 0 }}</h3>
              <p class="text-caption text-warning">
                Needs attention
              </p>
            </div>
          </VCardText>
        </VCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.section-shell {
  display: grid;
  gap: 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
