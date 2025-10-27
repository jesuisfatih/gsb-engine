<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { formatDate } from "@/@core/utils/formatters";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useMerchantDesignsStore } from "@/modules/merchant/store/designsStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Designs",
    embeddedSubtitle: "Manage saved customer designs and proof approvals.",
  },
});

const notification = useNotificationStore();
const designsStore = useMerchantDesignsStore();

const statusOptions = [
  { label: "All statuses", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Archived", value: "ARCHIVED" },
];

const statusChips: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "info" },
  SUBMITTED: { label: "Awaiting approval", color: "warning" },
  APPROVED: { label: "Ready", color: "success" },
  REJECTED: { label: "Rejected", color: "error" },
  ARCHIVED: { label: "Archived", color: "info" },
};

const selectedStatus = ref(statusOptions[0]);
const searchTerm = ref("");

const isLoading = computed(() => designsStore.loading);

const filteredDesigns = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return designsStore.items.filter(design => {
    const customer = design.customer ? design.customer.toLowerCase() : "";
    const orderNumber = design.orderNumber ? design.orderNumber.toLowerCase() : "";
    const matchesSearch =
      !term ||
      design.title.toLowerCase().includes(term) ||
      customer.includes(term) ||
      orderNumber.includes(term);
    return matchesSearch;
  });
});

function formatStatus(designStatus: string) {
  return statusChips[designStatus] ?? { label: designStatus, color: "info" };
}

function formatUpdated(value: string) {
  return formatDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function loadDesigns() {
  try {
    const status = selectedStatus.value.value === "ALL" ? undefined : selectedStatus.value.value;
    await designsStore.fetchDesigns({ status, limit: 50 });
  } catch (error) {
    console.error(error);
    notification.error("Design listesi yuklenemedi.");
  }
}

watch(selectedStatus, () => {
  void loadDesigns();
});

onMounted(() => {
  void loadDesigns();
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Saved designs</h2>
          <p>Reopen customer designs, duplicate templates, or send proof links.</p>
        </div>
        <div class="toolbar">
          <VSelect
            v-model="selectedStatus"
            :items="statusOptions"
            item-title="label"
            return-object
            density="comfortable"
            hide-details
            variant="outlined"
            class="status-select"
          />
          <VTextField
            v-model="searchTerm"
            hide-details
            density="comfortable"
            placeholder="Search designs"
            prepend-inner-icon="tabler-search"
            variant="outlined"
          />
          <VBtn prepend-icon="tabler-filter" variant="text">Filters</VBtn>
        </div>
      </header>

      <table class="data-table">
        <thead>
          <tr>
            <th>Design</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Surface</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody v-if="isLoading">
          <tr v-for="n in 6" :key="n">
            <td colspan="6">
              <VSkeletonLoader type="list-item-two-line" />
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-if="!filteredDesigns.length" class="empty-row">
            <td colspan="6">No designs found.</td>
          </tr>
          <tr v-for="design in filteredDesigns" :key="design.id">
            <td class="design-cell">
              <div class="thumbnail">{{ design.title.slice(0, 2).toUpperCase() }}</div>
              <div>
                <p class="title">{{ design.title }}</p>
                <p class="caption">
                  {{ design.orderNumber ? 'Linked to order ' + design.orderNumber : 'No linked order' }}
                </p>
              </div>
            </td>
            <td>{{ design.customer ?? '—' }}</td>
            <td>
              <VChip
                size="small"
                :color="formatStatus(design.status).color"
                variant="tonal"
              >
                {{ formatStatus(design.status).label }}
              </VChip>
            </td>
            <td>{{ design.surface ?? '—' }}</td>
            <td>{{ formatUpdated(design.updatedAt) }}</td>
            <td class="actions">
              <VBtn icon="tabler-external-link" variant="text" size="small" />
              <VBtn icon="tabler-copy" variant="text" size="small" />
              <VBtn icon="tabler-dots" variant="text" size="small" />
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

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.card-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.65);
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.status-select {
  min-width: 200px;
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
  vertical-align: middle;
}

tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.empty-row td {
  text-align: center;
  color: rgba(17, 18, 23, 0.6);
}

.design-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thumbnail {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(64, 122, 252, 0.12);
  color: #407afc;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.title {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.caption {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: rgba(17, 18, 23, 0.55);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>

