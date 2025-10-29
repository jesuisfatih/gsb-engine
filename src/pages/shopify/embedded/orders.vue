<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { formatDate } from "@/@core/utils/formatters";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import {
  useMerchantOrdersStore,
  type OrderStatus,
  type OrderSummary,
  type OrderTimelineEntry,
} from "@/modules/merchant/store/ordersStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Orders",
    embeddedSubtitle: "Track new submissions, fulfil gang sheets, and download print-ready files.",
  },
});

const ordersStore = useMerchantOrdersStore();
const notification = useNotificationStore();

const activeTab = ref<"unfulfilled" | "fulfilled" | "all">("unfulfilled");
const statusFilter = ref<"Any" | OrderStatus>("Any");
const searchTerm = ref("");
const selectedOrderIds = ref<Set<string>>(new Set());
const bulkActionLoading = ref(false);
const refundDialog = ref(false);
const refundOrderId = ref<string | null>(null);
const refundReason = ref("");

const unfulfilledSet = new Set<OrderStatus>(["Created", "Queued", "In production", "On hold"]);
const fulfilledSet = new Set<OrderStatus>(["Completed"]);

const statusOptions: Array<"Any" | OrderStatus> = [
  "Any",
  "Created",
  "Queued",
  "In production",
  "On hold",
  "Completed",
  "Failed",
  "Cancelled",
];

const isListLoading = computed(() => ordersStore.loadingList);
const isDetailLoading = computed(() => ordersStore.loadingDetail);

const allOrders = computed(() => ordersStore.entries);

const filteredOrders = computed(() => {
  let list = allOrders.value;

  if (activeTab.value === "unfulfilled") {
    list = list.filter(order => unfulfilledSet.has(order.status));
  }
  else if (activeTab.value === "fulfilled") {
    list = list.filter(order => fulfilledSet.has(order.status));
  }

  if (statusFilter.value !== "Any") {
    list = list.filter(order => order.status === statusFilter.value);
  }

  if (searchTerm.value.trim().length) {
    const needle = searchTerm.value.trim().toLowerCase();
    list = list.filter(order => {
      const orderNumber = order.orderNumber?.toLowerCase?.() ?? "";
      const customerName = order.customer.name?.toLowerCase?.() ?? "";
      const customerEmail = order.customer.email?.toLowerCase?.() ?? "";
      return orderNumber.includes(needle) || customerName.includes(needle) || customerEmail.includes(needle);
    });
  }

  return list;
});

const selectedOrderId = computed(() => ordersStore.selectedId);
const orderSummary = computed(() => ordersStore.selectedOrder);
const orderDetail = computed(() => ordersStore.detail);

const detailView = computed(() => {
  const summary = orderSummary.value;
  const detail = orderDetail.value;

  const primaryDesign = detail?.designs?.[0] ?? summary?.primaryDesign ?? null;
  const designOutputs = detail?.designs?.reduce((sum, design) => sum + design.outputs.length, 0);
  const downloadsCount = designOutputs ?? summary?.downloadsCompleted ?? 0;

  return {
    id: detail?.id ?? summary?.id ?? null,
    orderNumber: detail?.orderNumber ?? summary?.orderNumber ?? "",
    status: (detail?.status ?? summary?.status ?? "Created") as OrderStatus,
    createdAt: detail?.createdAt ?? summary?.createdAt ?? null,
    customerName: detail?.customer?.name ?? summary?.customer?.name ?? null,
    customerEmail: detail?.customer?.email ?? summary?.customer?.email ?? null,
    primaryDesign,
    downloadsCount,
    totals: detail?.totals ?? null,
    designs: detail?.designs ?? [],
    jobs: detail?.jobs ?? [],
    timeline: detail?.activity ?? [],
  };
});

const primaryOutputUrl = computed(() => {
  const detail = orderDetail.value;
  if (!detail)
    return null;
  for (const design of detail.designs) {
    if (design.outputs.length > 0)
      return design.outputs[0].url;
  }
  return null;
});

const downloadsLabel = computed(() => {
  if (!detailView.value.id)
    return "—";
  const count = detailView.value.downloadsCount ?? 0;
  if (count <= 0)
    return "Not downloaded";
  return `${count} file${count === 1 ? "" : "s"}`;
});

const designQualitySummary = computed(() => {
  if (!detailView.value.id)
    return "Select an order to review design quality.";
  if (!detailView.value.designs.length)
    return "No design files uploaded yet.";
  const hasPending = detailView.value.designs.some(design => design.status.toLowerCase().includes("pending"));
  if (hasPending)
    return "Design review is pending.";
  return "No quality issues detected.";
});

const designQualityState = computed(() => {
  if (!detailView.value.designs.length)
    return { label: "Waiting", color: "warning" as const };
  const hasPending = detailView.value.designs.some(design => design.status.toLowerCase().includes("pending"));
  if (hasPending)
    return { label: "Reviewing", color: "warning" as const };
  return { label: "Ready", color: "success" as const };
});

const designNotes = computed(() =>
  detailView.value.designs.map(design => ({
    id: design.id,
    title: design.name || "Untitled design",
    status: design.status,
  })),
);

const timelineEntries = computed(() => detailView.value.timeline);

const paginationLabel = computed(() => {
  if (isListLoading.value)
    return "Loading orders…";
  if (!filteredOrders.value.length)
    return "No orders match the current filters.";
  return `Showing ${filteredOrders.value.length} of ${allOrders.value.length} orders.`;
});

function formatOrderNumber(order: OrderSummary) {
  return order.orderNumber || order.id;
}

function formatCustomer(order: OrderSummary) {
  return order.customer.name || order.customer.email || "—";
}

function formatDownloads(order: OrderSummary) {
  if (!order.downloadsCompleted)
    return "—";
  return `${order.downloadsCompleted} file${order.downloadsCompleted === 1 ? "" : "s"}`;
}

function formatDimensions(dim?: { widthMm: number; heightMm: number } | null) {
  if (!dim)
    return "—";
  const widthIn = dim.widthMm ? +(dim.widthMm / 25.4).toFixed(1) : null;
  const heightIn = dim.heightMm ? +(dim.heightMm / 25.4).toFixed(1) : null;
  if (widthIn && heightIn)
    return `${widthIn}" × ${heightIn}"`;
  return `${dim.widthMm}mm × ${dim.heightMm}mm`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value)
    return "—";
  return formatDate(value, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTimelineEntry(entry: OrderTimelineEntry) {
  return formatDateTime(entry.occurredAt);
}

function isPrimaryTimelineEntry(entry: OrderTimelineEntry) {
  return entry.type === "order_created" || entry.type === "design_uploaded";
}

function orderStatusTone(status: OrderStatus) {
  switch (status) {
    case "Completed":
      return { color: "success", variant: "tonal" as const };
    case "In production":
    case "Queued":
      return { color: "primary", variant: "tonal" as const };
    case "On hold":
      return { color: "warning", variant: "tonal" as const };
    case "Failed":
    case "Cancelled":
      return { color: "error", variant: "tonal" as const };
    default:
      return { color: "primary", variant: "tonal" as const };
  }
}

async function handleSelect(orderId: string) {
  if (!orderId)
    return;
  if (ordersStore.selectedId !== orderId)
    ordersStore.selectOrder(orderId);

  try {
    await ordersStore.fetchOrderDetail(orderId);
  }
  catch (error) {
    console.error(error);
    notification.error("Failed to load order details.");
  }
}

function handleRowClick(orderId: string) {
  void handleSelect(orderId);
}

function handleTabChange(tab: "unfulfilled" | "fulfilled" | "all") {
  activeTab.value = tab;
}

watch(filteredOrders, (list) => {
  if (ordersStore.loadingList)
    return;
  if (!list.length) {
    ordersStore.selectOrder(null);
    ordersStore.$patch({ detail: null });
    return;
  }
  if (!ordersStore.selectedId || !list.some(order => order.id === ordersStore.selectedId)) {
    const nextId = list[0].id;
    ordersStore.selectOrder(nextId);
    void handleSelect(nextId);
  }
});

// Bulk Actions
const isAllSelected = computed(() => {
  return filteredOrders.value.length > 0 && filteredOrders.value.every(o => selectedOrderIds.value.has(o.id));
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedOrderIds.value.clear();
  } else {
    filteredOrders.value.forEach(o => selectedOrderIds.value.add(o.id));
  }
}

function toggleSelectOrder(orderId: string) {
  if (selectedOrderIds.value.has(orderId)) {
    selectedOrderIds.value.delete(orderId);
  } else {
    selectedOrderIds.value.add(orderId);
  }
}

async function bulkDownload() {
  if (selectedOrderIds.value.size === 0) {
    notification.warning("Please select at least one order.");
    return;
  }

  bulkActionLoading.value = true;
  try {
    await ordersStore.bulkDownloadDesigns(Array.from(selectedOrderIds.value));
    notification.success(`Downloaded ${selectedOrderIds.value.size} order(s) successfully!`);
    selectedOrderIds.value.clear();
  } catch (error: any) {
    console.error("[orders] Bulk download failed:", error);
    notification.error(error?.message || "Failed to download orders");
  } finally {
    bulkActionLoading.value = false;
  }
}

async function bulkMarkShipped() {
  if (selectedOrderIds.value.size === 0) {
    notification.warning("Please select at least one order.");
    return;
  }

  bulkActionLoading.value = true;
  try {
    await ordersStore.markAsShipped(Array.from(selectedOrderIds.value));
    notification.success(`Marked ${selectedOrderIds.value.size} order(s) as shipped!`);
    selectedOrderIds.value.clear();
  } catch (error: any) {
    console.error("[orders] Bulk mark shipped failed:", error);
    notification.error(error?.message || "Failed to mark orders as shipped");
  } finally {
    bulkActionLoading.value = false;
  }
}

async function togglePriority(orderId: string, priority: boolean) {
  try {
    await ordersStore.togglePriority(orderId, priority);
    notification.success(priority ? "Marked as priority!" : "Priority removed");
  } catch (error: any) {
    console.error("[orders] Toggle priority failed:", error);
    notification.error(error?.message || "Failed to update priority");
  }
}

function openRefundDialog(orderId: string) {
  refundOrderId.value = orderId;
  refundReason.value = "";
  refundDialog.value = true;
}

async function submitRefund() {
  if (!refundOrderId.value || !refundReason.value.trim()) {
    notification.warning("Please provide a refund reason.");
    return;
  }

  bulkActionLoading.value = true;
  try {
    await ordersStore.requestRefund(refundOrderId.value, refundReason.value.trim());
    notification.success("Refund request submitted successfully!");
    refundDialog.value = false;
    refundOrderId.value = null;
    refundReason.value = "";
  } catch (error: any) {
    console.error("[orders] Refund request failed:", error);
    notification.error(error?.message || "Failed to submit refund request");
  } finally {
    bulkActionLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await ordersStore.fetchOrders();
    const list = filteredOrders.value;
    if (list.length) {
      const initialId = ordersStore.selectedId ?? list[0].id;
      await handleSelect(initialId);
    }
  }
  catch (error) {
    console.error(error);
    notification.error("Failed to load orders.");
  }
});
</script>

<template>
  <div class="orders-layout">
    <section class="card list-card">
      <header class="card-header list-header">
        <div class="tabs">
          <button
            class="tab"
            :class="{ 'is-active': activeTab === 'unfulfilled' }"
            type="button"
            @click="handleTabChange('unfulfilled')"
          >
            Unfulfilled
          </button>
          <button
            class="tab"
            :class="{ 'is-active': activeTab === 'fulfilled' }"
            type="button"
            @click="handleTabChange('fulfilled')"
          >
            Fulfilled
          </button>
          <button
            class="tab"
            :class="{ 'is-active': activeTab === 'all' }"
            type="button"
            @click="handleTabChange('all')"
          >
            All
          </button>
        </div>

        <div class="toolbar">
          <!-- Bulk Actions (show when orders selected) -->
          <div v-if="selectedOrderIds.size > 0" class="bulk-actions">
            <VChip color="primary" variant="tonal">
              {{ selectedOrderIds.size }} selected
            </VChip>
            
            <VBtn
              prepend-icon="tabler-download"
              color="primary"
              variant="tonal"
              :loading="bulkActionLoading"
              @click="bulkDownload"
            >
              Download
            </VBtn>
            
            <VBtn
              prepend-icon="tabler-truck-delivery"
              color="success"
              variant="tonal"
              :loading="bulkActionLoading"
              @click="bulkMarkShipped"
            >
              Mark Shipped
            </VBtn>
            
            <VBtn
              icon="tabler-x"
              variant="text"
              size="small"
              @click="selectedOrderIds.clear()"
            >
              <VIcon icon="tabler-x" />
              <VTooltip activator="parent">
                Clear selection
              </VTooltip>
            </VBtn>
          </div>
          
          <!-- Regular toolbar (show when no selection) -->
          <template v-else>
            <VTextField
              v-model="searchTerm"
              hide-details
              density="comfortable"
              placeholder="Search orders"
              prepend-inner-icon="tabler-search"
              variant="outlined"
              class="search"
            />
            <VSelect
              v-model="statusFilter"
              :items="statusOptions"
              hide-details
              density="comfortable"
              label="Status"
              variant="outlined"
              class="status-filter"
            />
          </template>
        </div>
      </header>

      <div class="table-wrapper">
        <table class="data-table order-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <VCheckbox
                  :model-value="isAllSelected"
                  hide-details
                  density="compact"
                  @update:model-value="toggleSelectAll"
                />
              </th>
              <th />
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Created</th>
              <th>Downloads</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="isListLoading" class="empty-row">
              <td colspan="8">
                <div class="empty-cell">
                  <VProgressCircular indeterminate size="20" color="primary" />
                  <span>Loading orders…</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!filteredOrders.length" class="empty-row">
              <td colspan="8">
                <div class="empty-cell">
                  <p class="empty-title">No orders found</p>
                  <p class="empty-body">Try adjusting the filters or sync with Shopify.</p>
                </div>
              </td>
            </tr>
            <tr
              v-else
              v-for="order in filteredOrders"
              :key="order.id"
              :class="['order-row', { 'is-selected': order.id === selectedOrderId }]"
              role="button"
              tabindex="0"
            >
              <td class="checkbox-col" @click.stop>
                <VCheckbox
                  :model-value="selectedOrderIds.has(order.id)"
                  hide-details
                  density="compact"
                  @update:model-value="toggleSelectOrder(order.id)"
                />
              </td>
              <td 
                class="toggle"
                @click="handleRowClick(order.id)"
                @keydown.enter.prevent="handleRowClick(order.id)"
                @keydown.space.prevent="handleRowClick(order.id)"
              >
                <VBtn icon="tabler-chevron-right" variant="text" density="compact" />
              </td>
              <td>
                <a href="#" class="link" @click.prevent="handleRowClick(order.id)">
                  {{ formatOrderNumber(order) }}
                </a>
              </td>
              <td>{{ formatCustomer(order) }}</td>
              <td>
                <VChip size="small" v-bind="orderStatusTone(order.status)">
                  {{ order.status }}
                </VChip>
              </td>
              <td>{{ formatDate(order.createdAt) }}</td>
              <td>
                <span class="link">{{ formatDownloads(order) }}</span>
              </td>
              <td class="actions">
                <VBtn icon="tabler-download" variant="text" size="small" />
                <VBtn icon="tabler-eye" variant="text" size="small" />
                <VBtn icon="tabler-dots" variant="text" size="small" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="table-footer list-footer">
        <div class="pagination-info">{{ paginationLabel }}</div>
        <div class="pagination-controls">
          <VBtn icon="tabler-chevrons-left" variant="text" size="small" disabled />
          <VBtn icon="tabler-chevron-left" variant="text" size="small" disabled />
          <VBtn icon="tabler-chevron-right" variant="text" size="small" disabled />
          <VBtn icon="tabler-chevrons-right" variant="text" size="small" disabled />
        </div>
      </footer>
    </section>

    <section class="card detail-card">
      <template v-if="detailView.id">
        <header class="detail-header">
          <div>
            <p class="detail-subheading">
              {{ detailView.primaryDesign?.name ?? "Order overview" }}
            </p>
            <h2 class="detail-title">{{ detailView.orderNumber }}</h2>
          </div>
          <div class="detail-pills">
            <VChip size="small" v-bind="orderStatusTone(detailView.status)">
              {{ detailView.status }}
            </VChip>
            <VChip
              v-if="detailView.primaryDesign?.dimensions"
              variant="tonal"
              size="small"
            >
              {{ formatDimensions(detailView.primaryDesign?.dimensions ?? null) }}
            </VChip>
          </div>
        </header>

        <section class="summary-card">
          <header class="summary-top">
            <div>
              <h3>{{ detailView.primaryDesign?.name ?? "Design" }}</h3>
              <p class="summary-meta">
                {{ formatDimensions(detailView.primaryDesign?.dimensions ?? null) }}
              </p>
            </div>
            <VBtn
              variant="tonal"
              size="small"
              color="primary"
              :href="primaryOutputUrl ?? undefined"
              :disabled="!primaryOutputUrl"
              target="_blank"
            >
              Download
            </VBtn>
          </header>

          <dl class="summary-grid">
            <div>
              <dt>Customer</dt>
              <dd>{{ detailView.customerName || "—" }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ detailView.customerEmail || "—" }}</dd>
            </div>
            <div>
              <dt>Downloads</dt>
              <dd>{{ downloadsLabel }}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{{ formatDateTime(detailView.createdAt) }}</dd>
            </div>
          </dl>

          <div class="summary-actions">
            <VBtn prepend-icon="tabler-eye" variant="outlined" :disabled="isDetailLoading">
              Preview
            </VBtn>
            <VBtn prepend-icon="tabler-pencil" variant="outlined" :disabled="isDetailLoading">
              Edit
            </VBtn>
            <VBtn prepend-icon="tabler-photo" variant="outlined" :disabled="isDetailLoading">
              Assets
            </VBtn>
            <VBtn
              prepend-icon="tabler-download"
              color="primary"
              :href="primaryOutputUrl ?? undefined"
              :disabled="!primaryOutputUrl"
              target="_blank"
            >
              Download ZIP
            </VBtn>
          </div>
        </section>

        <section class="detail-section">
          <header class="section-header">
            <h3>Design quality</h3>
            <VChip
              size="small"
              variant="tonal"
              :color="designQualityState.color"
            >
              {{ designQualityState.label }}
            </VChip>
          </header>
          <p class="quality-summary">{{ designQualitySummary }}</p>
          <ul class="quality-list">
            <li v-for="item in designNotes" :key="item.id">
              <span class="bullet" />
              <div>
                <p class="quality-title">{{ item.title }}</p>
                <p class="quality-status">{{ item.status }}</p>
              </div>
            </li>
            <li v-if="!designNotes.length">
              <span class="bullet" />
              <div>
                <p class="quality-title">No design notes yet</p>
                <p class="quality-status">Upload files to run automated checks.</p>
              </div>
            </li>
          </ul>
        </section>

        <section class="detail-section">
          <header class="section-header">
            <h3>Activity</h3>
            <VBtn variant="text" size="small" prepend-icon="tabler-clock">
              View log
            </VBtn>
          </header>
          <ul class="timeline">
            <li v-for="entry in timelineEntries" :key="entry.id">
              <span class="dot" :class="{ 'dot-primary': isPrimaryTimelineEntry(entry) }" />
              <div>
                <p class="timeline-title">{{ entry.message }}</p>
                <p class="timeline-meta">{{ formatTimelineEntry(entry) }}</p>
              </div>
            </li>
            <li v-if="!timelineEntries.length">
              <span class="dot" />
              <div>
                <p class="timeline-title">No activity yet</p>
                <p class="timeline-meta">Updates will appear here once the order progresses.</p>
              </div>
            </li>
          </ul>
        </section>
      </template>

      <template v-else>
        <div class="detail-placeholder">
          <VIcon icon="tabler-clipboard-text" size="48" color="primary" />
          <h3>Select an order</h3>
          <p>Choose an order from the list to inspect files, download assets, and monitor production.</p>
        </div>
      </template>
    </section>

    <!-- Refund Dialog -->
    <VDialog v-model="refundDialog" max-width="500">
      <VCard>
        <VCardTitle class="text-h5">
          Request Refund
        </VCardTitle>
        <VCardText>
          <p class="mb-4">
            This will initiate a refund request for the selected order. Please provide a reason for the refund.
          </p>
          <VTextarea
            v-model="refundReason"
            label="Refund Reason"
            placeholder="Enter reason for refund (e.g., customer request, quality issue)..."
            rows="4"
            variant="outlined"
            :rules="[v => !!v || 'Reason is required']"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn 
            variant="text"
            @click="refundDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn 
            color="error"
            variant="flat"
            :loading="bulkActionLoading"
            :disabled="!refundReason.trim()"
            @click="submitRefund"
          >
            Submit Refund
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.orders-layout {
  display: grid;
  grid-template-columns: minmax(520px, 0.8fr) minmax(420px, 0.6fr);
  gap: 28px;
  align-items: flex-start;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: grid;
  gap: 20px;
}

.list-card {
  padding: 0;
}

.list-header {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.tabs {
  display: inline-flex;
  background: rgba(17, 18, 23, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  padding: 8px 18px;
  border-radius: 10px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab.is-active {
  background: #111217;
  color: #ffffff;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.bulk-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
}

.checkbox-col {
  width: 48px;
  padding: 8px !important;
  align-items: center;
}

.search {
  min-width: 220px;
}

.status-filter {
  min-width: 160px;
}

.table-wrapper {
  padding-inline: 24px;
  padding-bottom: 8px;
}

.order-table {
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

.order-row {
  cursor: pointer;
  transition: background 0.12s ease;
}

.order-table tbody tr.is-selected {
  background: rgba(64, 122, 252, 0.12);
}

tbody tr.order-row:hover {
  background: rgba(17, 18, 23, 0.05);
}

.toggle {
  width: 40px;
}

.link {
  color: #407afc;
  text-decoration: none;
  font-weight: 600;
}

.link:hover {
  text-decoration: underline;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.list-footer {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
  border-top: 1px solid rgba(17, 18, 23, 0.06);
}

.pagination-controls {
  display: inline-flex;
  gap: 6px;
}

.empty-row td {
  padding: 32px 16px;
}

.empty-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.95rem;
}

.empty-title {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.empty-body {
  margin: 0;
}

.detail-card {
  position: sticky;
  top: 84px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.detail-subheading {
  margin: 0 0 6px;
  font-size: 0.9rem;
  color: rgba(17, 18, 23, 0.6);
  letter-spacing: 0.02em;
}

.detail-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111217;
}

.detail-pills {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.summary-card {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: grid;
  gap: 18px;
}

.summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-top h3 {
  margin: 0 0 2px;
  font-size: 1.1rem;
  font-weight: 600;
}

.summary-meta {
  margin: 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.9rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.summary-grid dt {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(17, 18, 23, 0.6);
}

.summary-grid dd {
  margin: 4px 0 0;
  font-weight: 600;
  color: #111217;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-section {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: grid;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.quality-summary {
  margin: 0;
  color: rgba(17, 18, 23, 0.7);
  font-size: 0.95rem;
}

.quality-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.quality-list li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.bullet {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #407afc;
  margin-top: 6px;
}

.quality-title {
  margin: 0;
  font-weight: 600;
}

.quality-status {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 18px;
}

.timeline li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(17, 18, 23, 0.18);
  margin-top: 6px;
}

.dot-primary {
  background: #407afc;
}

.timeline-title {
  margin: 0;
  font-weight: 600;
}

.timeline-meta {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

.detail-placeholder {
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
  padding: 40px 20px;
  color: rgba(17, 18, 23, 0.65);
}

.detail-placeholder h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #111217;
}

.detail-placeholder p {
  margin: 0;
  max-width: 320px;
}

@media (max-width: 1280px) {
  .orders-layout {
    grid-template-columns: 1fr;
  }

  .detail-card {
    position: static;
  }

  .table-wrapper {
    padding-inline: 16px;
  }
}
</style>
