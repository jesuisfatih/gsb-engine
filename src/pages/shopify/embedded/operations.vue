<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { $api } from "@/utils/api";
import { useRouter } from "vue-router";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Production Ops",
    embeddedSubtitle: "Coordinate gang sheet packing, supplier routing, and print floor operations.",
  },
});

const router = useRouter();

interface GangSheetSummary {
  id: string;
  name: string;
  status: "draft" | "ready" | "queued" | "in_production";
  utilization: number;
  widthIn: number;
  heightIn: number;
  designCount: number;
}

const loading = ref(false);
const gangSheets = ref<GangSheetSummary[]>([]);

const sheetsByStatus = computed(() => {
  return {
    draft: gangSheets.value.filter(s => s.status === "draft"),
    ready: gangSheets.value.filter(s => s.status === "ready"),
    queued: gangSheets.value.filter(s => s.status === "queued"),
    inProduction: gangSheets.value.filter(s => s.status === "in_production"),
  };
});

async function loadGangSheets() {
  loading.value = true;
  try {
    const response = await $api<{ data: GangSheetSummary[] }>("/gang-sheets?limit=10");
    gangSheets.value = response.data ?? [];
  } catch (error) {
    console.error("[operations] Failed to load gang sheets:", error);
    // Mock data
    gangSheets.value = [
      { id: "gs-120", name: "Sheet #GS-120", status: "draft", utilization: 62, widthIn: 22, heightIn: 24, designCount: 12 },
      { id: "gs-121", name: "Sheet #GS-121", status: "ready", utilization: 85, widthIn: 22, heightIn: 24, designCount: 18 },
      { id: "gs-122", name: "Sheet #GS-122", status: "queued", utilization: 78, widthIn: 22, heightIn: 24, designCount: 15 },
    ];
  } finally {
    loading.value = false;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "draft": return "secondary";
    case "ready": return "success";
    case "queued": return "primary";
    case "in_production": return "warning";
    default: return "secondary";
  }
}

function viewSheet(id: string) {
  router.push(`/shopify/embedded/gang-sheet?id=${id}`);
}

onMounted(() => {
  loadGangSheets();
});
</script>

<template>
  <div class="section-shell">
    <!-- Gang Sheet Kanban -->
    <section class="section-card">
      <header class="section-header">
        <div>
          <h2>Gang Sheet Board</h2>
          <p class="section-subtitle">Visual workflow for batch production management</p>
        </div>
        <VBtn color="primary" prepend-icon="tabler-layout-grid" to="/shopify/embedded/gang-sheet">
          Open Planner
        </VBtn>
      </header>

      <div v-if="loading" class="text-center pa-8">
        <VProgressCircular indeterminate color="primary" />
        <p class="mt-4">Loading gang sheets...</p>
      </div>

      <div v-else class="kanban-board">
        <!-- Draft Column -->
        <div class="kanban-column">
          <div class="column-header">
            <h3>Draft</h3>
            <VChip size="small" color="secondary" variant="tonal">
              {{ sheetsByStatus.draft.length }}
            </VChip>
          </div>
          <div class="column-body">
            <VCard
              v-for="sheet in sheetsByStatus.draft"
              :key="sheet.id"
              class="sheet-card"
              variant="outlined"
              @click="viewSheet(sheet.id)"
            >
              <VCardText>
                <p class="sheet-name">{{ sheet.name }}</p>
                <p class="sheet-meta">{{ sheet.designCount }} designs</p>
                <VProgressLinear
                  :model-value="sheet.utilization"
                  height="6"
                  color="secondary"
                  class="mt-2"
                />
                <p class="sheet-util">{{ sheet.utilization }}% utilized</p>
              </VCardText>
            </VCard>
          </div>
        </div>

        <!-- Ready Column -->
        <div class="kanban-column">
          <div class="column-header">
            <h3>Ready</h3>
            <VChip size="small" color="success" variant="tonal">
              {{ sheetsByStatus.ready.length }}
            </VChip>
          </div>
          <div class="column-body">
            <VCard
              v-for="sheet in sheetsByStatus.ready"
              :key="sheet.id"
              class="sheet-card highlighted"
              variant="outlined"
              @click="viewSheet(sheet.id)"
            >
              <VCardText>
                <p class="sheet-name">{{ sheet.name }}</p>
                <p class="sheet-meta">{{ sheet.designCount }} designs</p>
                <VProgressLinear
                  :model-value="sheet.utilization"
                  height="6"
                  color="success"
                  class="mt-2"
                />
                <p class="sheet-util">{{ sheet.utilization }}% utilized</p>
              </VCardText>
            </VCard>
          </div>
        </div>

        <!-- Queued Column -->
        <div class="kanban-column">
          <div class="column-header">
            <h3>Queued</h3>
            <VChip size="small" color="primary" variant="tonal">
              {{ sheetsByStatus.queued.length }}
            </VChip>
          </div>
          <div class="column-body">
            <VCard
              v-for="sheet in sheetsByStatus.queued"
              :key="sheet.id"
              class="sheet-card"
              variant="outlined"
              @click="viewSheet(sheet.id)"
            >
              <VCardText>
                <p class="sheet-name">{{ sheet.name }}</p>
                <p class="sheet-meta">{{ sheet.designCount }} designs</p>
                <VProgressLinear
                  :model-value="sheet.utilization"
                  height="6"
                  color="primary"
                  class="mt-2"
                />
                <p class="sheet-util">{{ sheet.utilization }}% utilized</p>
              </VCardText>
            </VCard>
          </div>
        </div>

        <!-- In Production Column -->
        <div class="kanban-column">
          <div class="column-header">
            <h3>In Production</h3>
            <VChip size="small" color="warning" variant="tonal">
              {{ sheetsByStatus.inProduction.length }}
            </VChip>
          </div>
          <div class="column-body">
            <VCard
              v-for="sheet in sheetsByStatus.inProduction"
              :key="sheet.id"
              class="sheet-card"
              variant="outlined"
              @click="viewSheet(sheet.id)"
            >
              <VCardText>
                <p class="sheet-name">{{ sheet.name }}</p>
                <p class="sheet-meta">{{ sheet.designCount }} designs</p>
                <VProgressLinear
                  :model-value="sheet.utilization"
                  height="6"
                  color="warning"
                  class="mt-2"
                />
                <p class="sheet-util">{{ sheet.utilization }}% utilized</p>
              </VCardText>
            </VCard>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Actions Grid -->
    <div class="actions-grid">
      <VCard>
        <VCardText class="d-flex flex-column align-center justify-center text-center pa-6">
          <VIcon icon="tabler-building-factory" size="48" color="primary" class="mb-3" />
          <h3 class="text-h6 mb-2">Supplier Routing</h3>
          <p class="text-sm mb-4">Configure default suppliers per technique and region</p>
          <VBtn color="primary" variant="tonal" to="/shopify/embedded/supplier-routing">
            Manage Routing
          </VBtn>
        </VCardText>
      </VCard>

      <VCard>
        <VCardText class="d-flex flex-column align-center justify-center text-center pa-6">
          <VIcon icon="tabler-webhook" size="48" color="success" class="mb-3" />
          <h3 class="text-h6 mb-2">Webhooks</h3>
          <p class="text-sm mb-4">Monitor Shopify webhook delivery health</p>
          <VBtn color="success" variant="tonal" to="/shopify/embedded/webhooks">
            View Status
          </VBtn>
        </VCardText>
      </VCard>

      <VCard>
        <VCardText class="d-flex flex-column align-center justify-center text-center pa-6">
          <VIcon icon="tabler-timeline" size="48" color="warning" class="mb-3" />
          <h3 class="text-h6 mb-2">Audit Log</h3>
          <p class="text-sm mb-4">Track system events and changes</p>
          <VBtn color="warning" variant="tonal" to="/shopify/embedded/audit">
            View Log
          </VBtn>
        </VCardText>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.section-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(32, 34, 35, 0.08);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-header h2 {
  margin: 0 0 4px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111213;
}

.section-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(32, 34, 35, 0.6);
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.kanban-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  background: rgba(32, 34, 35, 0.04);
  border-radius: 12px;
}

.column-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.column-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}

.sheet-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(32, 34, 35, 0.12);
}

.sheet-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(32, 34, 35, 0.1);
}

.sheet-card.highlighted {
  border-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.05);
}

.sheet-name {
  margin: 0 0 4px;
  font-weight: 600;
  font-size: 0.95rem;
}

.sheet-meta {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(32, 34, 35, 0.6);
}

.sheet-util {
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: rgba(32, 34, 35, 0.6);
  text-align: right;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

@media (max-width: 960px) {
  .kanban-board {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
