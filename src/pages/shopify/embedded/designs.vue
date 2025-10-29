<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { formatDate } from "@/@core/utils/formatters";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useMerchantDesignsStore } from "@/modules/merchant/store/designsStore";
import type { DesignFilters } from "@/modules/merchant/store/designsStore";

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
const dateRange = ref<[string, string] | null>(null);
const sortBy = ref<"createdAt" | "updatedAt" | "name">("updatedAt");
const sortOrder = ref<"asc" | "desc">("desc");
const showFilters = ref(false);
const actionLoading = ref<Record<string, boolean>>({});
const rejectDialog = ref(false);
const rejectDesignId = ref<string | null>(null);
const rejectReason = ref("");
const templateDialog = ref(false);
const templateDesignId = ref<string | null>(null);
const templateTitle = ref("");
const templateTags = ref<string[]>([]);

const isLoading = computed(() => designsStore.loading);
const designs = computed(() => designsStore.items);
const totalDesigns = computed(() => designsStore.total);

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
    const filters: DesignFilters = {
      limit: 50,
      offset: 0,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    };

    // Status filter
    if (selectedStatus.value.value !== "ALL") {
      filters.status = selectedStatus.value.value;
    }

    // Search filter
    if (searchTerm.value.trim()) {
      filters.search = searchTerm.value.trim();
    }

    // Date range filter
    if (dateRange.value && dateRange.value.length === 2) {
      filters.fromDate = dateRange.value[0];
      filters.toDate = dateRange.value[1];
    }

    await designsStore.fetchDesigns(filters);
  } catch (error) {
    console.error(error);
    notification.error("Design listesi yüklenemedi.");
  }
}

// Watch for filter changes
watch([selectedStatus, searchTerm, dateRange, sortBy, sortOrder], () => {
  void loadDesigns();
}, { deep: true });

function clearFilters() {
  dateRange.value = null;
  sortBy.value = "updatedAt";
  sortOrder.value = "desc";
}

// Action handlers
async function approveDesign(designId: string) {
  actionLoading.value[designId] = true;
  try {
    await designsStore.approveDesign(designId);
    notification.success("Design approved!");
  } catch (error: any) {
    console.error("[designs] Approve failed:", error);
    notification.error(error?.message || "Failed to approve design");
  } finally {
    actionLoading.value[designId] = false;
  }
}

function openRejectDialog(designId: string) {
  rejectDesignId.value = designId;
  rejectReason.value = "";
  rejectDialog.value = true;
}

async function submitReject() {
  if (!rejectDesignId.value || !rejectReason.value.trim()) {
    notification.warning("Please provide a rejection reason.");
    return;
  }

  const designId = rejectDesignId.value;
  actionLoading.value[designId] = true;

  try {
    await designsStore.rejectDesign(designId, rejectReason.value.trim());
    notification.success("Design rejected");
    rejectDialog.value = false;
    rejectDesignId.value = null;
    rejectReason.value = "";
  } catch (error: any) {
    console.error("[designs] Reject failed:", error);
    notification.error(error?.message || "Failed to reject design");
  } finally {
    actionLoading.value[designId] = false;
  }
}

async function downloadPNG(designId: string) {
  actionLoading.value[designId] = true;
  try {
    await designsStore.downloadPNG(designId);
    notification.success("PNG downloaded!");
  } catch (error: any) {
    console.error("[designs] PNG download failed:", error);
    notification.error(error?.message || "Failed to download PNG");
  } finally {
    actionLoading.value[designId] = false;
  }
}

async function downloadPDF(designId: string) {
  actionLoading.value[designId] = true;
  try {
    await designsStore.downloadPDF(designId);
    notification.success("PDF downloaded!");
  } catch (error: any) {
    console.error("[designs] PDF download failed:", error);
    notification.error(error?.message || "Failed to download PDF");
  } finally {
    actionLoading.value[designId] = false;
  }
}

async function duplicateDesign(designId: string) {
  actionLoading.value[designId] = true;
  try {
    await designsStore.duplicateDesign(designId);
    notification.success("Design duplicated!");
  } catch (error: any) {
    console.error("[designs] Duplicate failed:", error);
    notification.error(error?.message || "Failed to duplicate design");
  } finally {
    actionLoading.value[designId] = false;
  }
}

function openTemplateDialog(designId: string) {
  templateDesignId.value = designId;
  templateTitle.value = "";
  templateTags.value = [];
  templateDialog.value = true;
}

async function submitTemplate() {
  if (!templateDesignId.value || !templateTitle.value.trim()) {
    notification.warning("Please provide a template title.");
    return;
  }

  const designId = templateDesignId.value;
  actionLoading.value[designId] = true;

  try {
    await designsStore.convertToTemplate(designId, templateTitle.value.trim(), templateTags.value);
    notification.success("Template created successfully!");
    templateDialog.value = false;
    templateDesignId.value = null;
    templateTitle.value = "";
    templateTags.value = [];
  } catch (error: any) {
    console.error("[designs] Convert to template failed:", error);
    notification.error(error?.message || "Failed to create template");
  } finally {
    actionLoading.value[designId] = false;
  }
}

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
          <VBtn prepend-icon="tabler-filter" variant="text" @click="showFilters = !showFilters">
            Filters
          </VBtn>
        </div>
      </header>

      <!-- Advanced Filters -->
      <VExpandTransition>
        <div v-if="showFilters" class="filters-panel">
          <VRow dense>
            <VCol cols="12" md="6">
              <VSelect
                v-model="sortBy"
                :items="[
                  { label: 'Created Date', value: 'createdAt' },
                  { label: 'Updated Date', value: 'updatedAt' },
                  { label: 'Name', value: 'name' },
                ]"
                label="Sort by"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="sortOrder"
                :items="[
                  { label: 'Newest first', value: 'desc' },
                  { label: 'Oldest first', value: 'asc' },
                ]"
                label="Order"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
          </VRow>
          <div class="filter-actions">
            <VBtn variant="text" @click="clearFilters">Clear filters</VBtn>
            <VBtn color="primary" @click="showFilters = false">Apply</VBtn>
          </div>
        </div>
      </VExpandTransition>

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
          <tr v-if="!designs.length" class="empty-row">
            <td colspan="6">No designs found.</td>
          </tr>
          <tr v-for="design in designs" :key="design.id">
            <td class="design-cell">
              <div class="thumbnail">{{ design.title.slice(0, 2).toUpperCase() }}</div>
              <div>
                <p class="title">{{ design.title }}</p>
                <p class="caption">
                  {{ design.orderNumber ? 'Linked to order ' + design.orderNumber : 'No linked order' }}
                </p>
              </div>
            </td>
            <td>{{ design.customer ?? '�' }}</td>
            <td>
              <VChip
                size="small"
                :color="formatStatus(design.status).color"
                variant="tonal"
              >
                {{ formatStatus(design.status).label }}
              </VChip>
            </td>
            <td>{{ design.surface ?? '�' }}</td>
            <td>{{ formatUpdated(design.updatedAt) }}</td>
            <td class="actions">
              <VMenu>
                <template #activator="{ props }">
                  <VBtn 
                    icon="tabler-dots" 
                    variant="text" 
                    size="small"
                    :loading="actionLoading[design.id]"
                    v-bind="props"
                  />
                </template>
                
                <VList>
                  <!-- Approve (if SUBMITTED) -->
                  <VListItem
                    v-if="design.status === 'SUBMITTED'"
                    prepend-icon="tabler-check"
                    title="Approve"
                    @click="approveDesign(design.id)"
                  />
                  
                  <!-- Reject (if SUBMITTED or APPROVED) -->
                  <VListItem
                    v-if="design.status === 'SUBMITTED' || design.status === 'APPROVED'"
                    prepend-icon="tabler-x"
                    title="Reject"
                    @click="openRejectDialog(design.id)"
                  />
                  
                  <VDivider />
                  
                  <!-- Download PNG -->
                  <VListItem
                    prepend-icon="tabler-photo"
                    title="Download PNG"
                    @click="downloadPNG(design.id)"
                  />
                  
                  <!-- Download PDF -->
                  <VListItem
                    prepend-icon="tabler-file-type-pdf"
                    title="Download PDF"
                    @click="downloadPDF(design.id)"
                  />
                  
                  <VDivider />
                  
                  <!-- Duplicate -->
                  <VListItem
                    prepend-icon="tabler-copy"
                    title="Duplicate"
                    @click="duplicateDesign(design.id)"
                  />
                  
                  <!-- Save as Template -->
                  <VListItem
                    prepend-icon="tabler-template"
                    title="Save as Template"
                    @click="openTemplateDialog(design.id)"
                  />
                </VList>
              </VMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Reject Dialog -->
    <VDialog v-model="rejectDialog" max-width="500">
      <VCard>
        <VCardTitle class="text-h5">
          Reject Design
        </VCardTitle>
        <VCardText>
          <p class="mb-4">
            Please provide a reason for rejecting this design. The customer will be notified.
          </p>
          <VTextarea
            v-model="rejectReason"
            label="Rejection Reason"
            placeholder="Enter reason (e.g., low resolution, incorrect dimensions)..."
            rows="4"
            variant="outlined"
            :rules="[v => !!v || 'Reason is required']"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn 
            variant="text"
            @click="rejectDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn 
            color="error"
            variant="flat"
            :loading="rejectDesignId ? actionLoading[rejectDesignId] : false"
            :disabled="!rejectReason.trim()"
            @click="submitReject"
          >
            Reject Design
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Convert to Template Dialog -->
    <VDialog v-model="templateDialog" max-width="600">
      <VCard>
        <VCardTitle class="text-h5">
          Save as Template
        </VCardTitle>
        <VCardText>
          <p class="mb-4">
            Convert this design into a reusable template that can be assigned to products.
          </p>
          <VTextField
            v-model="templateTitle"
            label="Template Title"
            placeholder="e.g., Summer Collection T-shirt"
            variant="outlined"
            class="mb-4"
            :rules="[v => !!v || 'Title is required']"
          />
          <VCombobox
            v-model="templateTags"
            label="Tags"
            placeholder="Add tags for categorization"
            variant="outlined"
            multiple
            chips
            hint="Press enter to add a tag"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn 
            variant="text"
            @click="templateDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn 
            color="primary"
            variant="flat"
            :loading="templateDesignId ? actionLoading[templateDesignId] : false"
            :disabled="!templateTitle.trim()"
            @click="submitTemplate"
          >
            Create Template
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
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

.filters-panel {
  padding: 16px;
  background: rgba(17, 18, 23, 0.02);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

