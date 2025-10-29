<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { $api } from "@/utils/api";
import { formatDate } from "@/@core/utils/formatters";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Audit Log",
    embeddedSubtitle: "Track all system events and changes",
  },
});

interface AuditEntry {
  id: string;
  event: string;
  entity: string;
  entityId: string;
  actorUserId?: string;
  actorUserName?: string;
  diff?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

const loading = ref(false);
const entries = ref<AuditEntry[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const eventFilter = ref("");
const entityFilter = ref("");
const searchTerm = ref("");
const dateFrom = ref("");
const dateTo = ref("");

const eventTypes = [
  { title: "All Events", value: "" },
  { title: "Design Submitted", value: "design.submit" },
  { title: "Gang Sheet Status", value: "gangsheet.status_change" },
  { title: "Order Created", value: "order.created" },
  { title: "Product Updated", value: "product.updated" },
  { title: "Supplier Updated", value: "supplier.update" },
  { title: "User Login", value: "user.login" },
  { title: "Config Changed", value: "config.changed" },
];

const entityTypes = [
  { title: "All Entities", value: "" },
  { title: "Design", value: "DesignDocument" },
  { title: "Gang Sheet", value: "GangSheet" },
  { title: "Order", value: "Order" },
  { title: "Product", value: "Product" },
  { title: "Supplier", value: "SupplierProfile" },
  { title: "User", value: "User" },
];

const filteredEntries = computed(() => {
  let list = entries.value;

  if (searchTerm.value.trim()) {
    const needle = searchTerm.value.trim().toLowerCase();
    list = list.filter(entry =>
      entry.event.toLowerCase().includes(needle) ||
      entry.entity.toLowerCase().includes(needle) ||
      entry.entityId.toLowerCase().includes(needle) ||
      entry.actorUserName?.toLowerCase?.().includes(needle)
    );
  }

  return list;
});

async function loadAuditLog() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("page", page.value.toString());
    params.append("limit", pageSize.value.toString());
    
    if (eventFilter.value) params.append("event", eventFilter.value);
    if (entityFilter.value) params.append("entity", entityFilter.value);
    if (dateFrom.value) params.append("from", dateFrom.value);
    if (dateTo.value) params.append("to", dateTo.value);

    const response = await $api<{ data: { entries: AuditEntry[]; total: number } }>(`/audit?${params}`);
    
    entries.value = response.data?.entries ?? [];
    total.value = response.data?.total ?? 0;
  } catch (error) {
    console.error("[audit] Failed to load audit log:", error);
    
    // Mock data for demo
    entries.value = [
      {
        id: "1",
        event: "design.submit",
        entity: "DesignDocument",
        entityId: "abc123",
        actorUserName: "John Merchant",
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: "2",
        event: "gangsheet.status_change",
        entity: "GangSheet",
        entityId: "gs-120",
        actorUserName: "System",
        diff: { status: { from: "draft", to: "ready" } },
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: "3",
        event: "order.created",
        entity: "Order",
        entityId: "10245",
        actorUserName: "Customer (Jane Doe)",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ];
    total.value = 3;
  } finally {
    loading.value = false;
  }
}

function getEventIcon(event: string) {
  if (event.includes("design")) return "tabler-brush";
  if (event.includes("gangsheet")) return "tabler-layout-grid";
  if (event.includes("order")) return "tabler-shopping-cart";
  if (event.includes("product")) return "tabler-package";
  if (event.includes("supplier")) return "tabler-building-factory";
  if (event.includes("user")) return "tabler-user";
  return "tabler-circle-dot";
}

function getEventColor(event: string) {
  if (event.includes("submit") || event.includes("created")) return "success";
  if (event.includes("status_change") || event.includes("updated")) return "primary";
  if (event.includes("delete")) return "error";
  if (event.includes("login")) return "info";
  return "secondary";
}

function formatDiff(diff: Record<string, any> | undefined) {
  if (!diff) return null;
  
  return Object.entries(diff).map(([key, value]) => {
    if (typeof value === "object" && value.from !== undefined && value.to !== undefined) {
      return `${key}: ${value.from} → ${value.to}`;
    }
    return `${key}: ${JSON.stringify(value)}`;
  }).join(", ");
}

watch([eventFilter, entityFilter, dateFrom, dateTo, page], () => {
  loadAuditLog();
});

onMounted(() => {
  loadAuditLog();
});
</script>

<template>
  <div class="audit-page">
    <VCard>
      <VCardTitle>Audit Log</VCardTitle>

      <VCardText>
        <!-- Filters -->
        <div class="filters">
          <VTextField
            v-model="searchTerm"
            prepend-inner-icon="tabler-search"
            placeholder="Search events..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />

          <VSelect
            v-model="eventFilter"
            :items="eventTypes"
            item-title="title"
            item-value="value"
            label="Event Type"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />

          <VSelect
            v-model="entityFilter"
            :items="entityTypes"
            item-title="title"
            item-value="value"
            label="Entity Type"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />

          <VTextField
            v-model="dateFrom"
            label="From Date"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />

          <VTextField
            v-model="dateTo"
            label="To Date"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </div>

        <!-- Audit Entries -->
        <VList v-if="!loading && filteredEntries.length" lines="three" class="audit-list">
          <VListItem
            v-for="entry in filteredEntries"
            :key="entry.id"
            :prepend-icon="getEventIcon(entry.event)"
            class="audit-entry"
          >
            <VListItemTitle class="d-flex align-center gap-2">
              <VChip size="small" :color="getEventColor(entry.event)" variant="tonal">
                {{ entry.event }}
              </VChip>
              <span class="text-medium-emphasis">{{ entry.entity }}</span>
              <code class="entity-id">{{ entry.entityId }}</code>
            </VListItemTitle>

            <VListItemSubtitle>
              <div class="mt-1">
                <strong>Actor:</strong> {{ entry.actorUserName || "System" }}
              </div>
              <div v-if="entry.diff" class="mt-1">
                <strong>Changes:</strong> {{ formatDiff(entry.diff) }}
              </div>
              <div class="mt-1 text-caption">
                {{ formatDate(entry.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }) }}
              </div>
            </VListItemSubtitle>
          </VListItem>
        </VList>

        <VAlert v-else-if="!loading && !filteredEntries.length" type="info" variant="tonal">
          No audit entries found matching your filters.
        </VAlert>

        <div v-if="loading" class="text-center pa-8">
          <VProgressCircular indeterminate color="primary" />
          <p class="mt-4">Loading audit log...</p>
        </div>

        <!-- Pagination -->
        <div v-if="total > pageSize" class="pagination">
          <div class="pagination-info">
            Showing {{ ((page - 1) * pageSize) + 1 }} - {{ Math.min(page * pageSize, total) }} of {{ total }} entries
          </div>
          <VPagination
            v-model="page"
            :length="Math.ceil(total / pageSize)"
            :total-visible="5"
            density="comfortable"
          />
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.audit-page {
  display: grid;
  gap: 24px;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.audit-list {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.audit-entry {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
}

.audit-entry:last-child {
  border-bottom: none;
}

.entity-id {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  font-family: 'Courier New', monospace;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}

.pagination-info {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
}

@media (max-width: 960px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .pagination {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

