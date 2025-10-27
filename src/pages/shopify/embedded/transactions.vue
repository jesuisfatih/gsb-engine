<script setup lang="ts">
import { computed, onMounted } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { formatDate } from "@/@core/utils/formatters";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useMerchantBillingStore } from "@/modules/merchant/store/billingStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Transactions",
    embeddedSubtitle: "Review usage fees, export billing history, and monitor charge status.",
  },
});

const notification = useNotificationStore();
const billingStore = useMerchantBillingStore();

const isLoading = computed(() => billingStore.chargesLoading);
const charges = computed(() => billingStore.charges);
const summary = computed(() => billingStore.summary);

const statusChips: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "warning" },
  charged: { label: "Charged", color: "info" },
  invoiced: { label: "Invoiced", color: "primary" },
  paid: { label: "Paid", color: "success" },
  waived: { label: "Waived", color: "info" },
  refunded: { label: "Refunded", color: "error" },
};

function formatStatus(status: string) {
  const key = status?.toLowerCase() ?? "";
  return statusChips[key] ?? { label: status, color: "default" };
}

function formatChargeDate(value: string) {
  return formatDate(value, { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(value: string, currency: string) {
  return `${currency} ${value}`.trim();
}

async function loadData() {
  try {
    await Promise.all([billingStore.fetchSummary(), billingStore.fetchCharges(100)]);
  } catch (error) {
    console.error(error);
    notification.error("Islem listesi yuklenemedi.");
  }
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div class="tab-bar">
          <button class="tab is-active" type="button">Daily</button>
          <button class="tab" type="button">Monthly</button>
        </div>
        <VBtn prepend-icon="tabler-download" variant="outlined">Export annual (2024)</VBtn>
      </header>
      <div class="summary-grid" v-if="summary">
        <div class="summary-card">
          <h3>{{ summary.monthToDateOrders }}</h3>
          <p>Orders this month</p>
        </div>
        <div class="summary-card">
          <h3>{{ summary.monthToDateCharges }}</h3>
          <p>Charges this month</p>
        </div>
        <div class="summary-card">
          <h3>{{ summary.pendingCharges }}</h3>
          <p>Pending charges</p>
        </div>
        <div class="summary-card">
          <h3>{{ summary.paidCharges }}</h3>
          <p>Paid charges</p>
        </div>
      </div>
      <div v-else class="chart-placeholder">
        <span>Transactions chart placeholder</span>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <div class="filters">
          <VSelect
            :items="['All time', 'Last 30 days', 'This month']"
            hide-details
            density="comfortable"
            variant="outlined"
            model-value="All time"
          />
        </div>
        <VTextField
          hide-details
          density="comfortable"
          placeholder="Order name"
          prepend-inner-icon="tabler-search"
          variant="outlined"
        />
      </header>

      <table class="data-table">
        <thead>
          <tr>
            <th>Order name</th>
            <th>Amount</th>
            <th>Charge status</th>
            <th>Date charged</th>
            <th />
          </tr>
        </thead>
        <tbody v-if="isLoading">
          <tr v-for="n in 6" :key="n">
            <td colspan="5">
              <VSkeletonLoader type="list-item-two-line" />
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-if="!charges.length" class="empty-row">
            <td colspan="5">No transactions found.</td>
          </tr>
          <tr v-for="charge in charges" :key="charge.id">
            <td><a href="#" class="link">{{ charge.description ?? charge.orderId ?? 'Unlinked order' }}</a></td>
            <td>{{ formatAmount(charge.totalAmount, charge.currency) }}</td>
            <td>
              <VChip size="small" :color="formatStatus(charge.status).color" variant="tonal">
                {{ formatStatus(charge.status).label }}
              </VChip>
            </td>
            <td>{{ charge.occurredAt ? formatChargeDate(charge.occurredAt) : '—' }}</td>
            <td class="actions">
              <VBtn variant="text" size="small">View order</VBtn>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.page-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tab-bar {
  display: inline-flex;
  background: rgba(17, 18, 23, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.6);
  cursor: pointer;
}

.tab.is-active {
  background: #111217;
  color: #ffffff;
}

.summary-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.summary-card {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  padding: 16px;
  background: rgba(17, 18, 23, 0.02);
  display: grid;
  gap: 4px;
}

.summary-card h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #111217;
}

.summary-card p {
  margin: 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.9rem;
}

.chart-placeholder {
  height: 220px;
  border-radius: 12px;
  border: 1px dashed rgba(17, 18, 23, 0.12);
  display: grid;
  place-items: center;
  color: rgba(17, 18, 23, 0.45);
  font-size: 0.9rem;
}

.filters {
  display: flex;
  gap: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

thead {
  background: rgba(17, 18, 23, 0.04);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  color: rgba(17, 18, 23, 0.6);
}

th,
td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(17, 18, 23, 0.06);
}

tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.empty-row td {
  text-align: center;
  color: rgba(17, 18, 23, 0.6);
}

.link {
  color: #407afc;
  text-decoration: none;
  font-weight: 600;
}

.actions {
  text-align: right;
}
</style>

