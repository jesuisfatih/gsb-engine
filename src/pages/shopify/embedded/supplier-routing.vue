<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { $api } from "@/utils/api";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Supplier Routing",
    embeddedSubtitle: "Configure default suppliers per technique and region",
  },
});

const notification = useNotificationStore();

interface Supplier {
  id: string;
  name: string;
  email: string;
  region: string;
  active: boolean;
}

interface RoutingRule {
  id: string;
  technique: string;
  region: string | null;
  supplierId: string;
  supplierName: string;
  minQty?: number;
  maxQty?: number;
}

const loading = ref(false);
const suppliers = ref<Supplier[]>([]);
const routingRules = ref<RoutingRule[]>([]);
const ruleDialog = ref(false);

const ruleForm = ref({
  id: "",
  technique: "dtf",
  region: "",
  supplierId: "",
  minQty: null as number | null,
  maxQty: null as number | null,
});

const techniques = [
  { title: "DTF Transfer", value: "dtf" },
  { title: "Sublimation", value: "sublimation" },
  { title: "Screen Print", value: "screen" },
  { title: "Embroidery", value: "embroidery" },
  { title: "Digital Direct", value: "digital" },
];

const regions = [
  { title: "North America", value: "NA" },
  { title: "Europe", value: "EU" },
  { title: "Asia Pacific", value: "APAC" },
  { title: "Global (Any)", value: "" },
];

async function loadSuppliers() {
  try {
    const response = await $api<{ data: Supplier[] }>("/suppliers");
    suppliers.value = response.data ?? [];
  } catch (error) {
    console.error("[supplier-routing] Failed to load suppliers:", error);
  }
}

async function loadRoutingRules() {
  loading.value = true;
  try {
    const response = await $api<{ data: RoutingRule[] }>("/suppliers/routing");
    routingRules.value = response.data ?? [];
  } catch (error) {
    console.error("[supplier-routing] Failed to load routing rules:", error);
    notification.error("Failed to load routing rules");
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  ruleForm.value = {
    id: "",
    technique: "dtf",
    region: "",
    supplierId: "",
    minQty: null,
    maxQty: null,
  };
  ruleDialog.value = true;
}

function openEditDialog(rule: RoutingRule) {
  ruleForm.value = {
    id: rule.id,
    technique: rule.technique,
    region: rule.region ?? "",
    supplierId: rule.supplierId,
    minQty: rule.minQty ?? null,
    maxQty: rule.maxQty ?? null,
  };
  ruleDialog.value = true;
}

async function saveRule() {
  try {
    const body = {
      technique: ruleForm.value.technique,
      region: ruleForm.value.region || null,
      supplierId: ruleForm.value.supplierId,
      minQty: ruleForm.value.minQty ?? undefined,
      maxQty: ruleForm.value.maxQty ?? undefined,
    };

    if (ruleForm.value.id) {
      // Update
      await $api(`/suppliers/routing/${ruleForm.value.id}`, {
        method: "PATCH",
        body,
      });
      notification.success("Routing rule updated");
    } else {
      // Create
      await $api("/suppliers/routing", {
        method: "POST",
        body,
      });
      notification.success("Routing rule created");
    }

    ruleDialog.value = false;
    await loadRoutingRules();
  } catch (error: any) {
    console.error("[supplier-routing] Failed to save rule:", error);
    notification.error(error?.message || "Failed to save routing rule");
  }
}

async function deleteRule(id: string) {
  if (!confirm("Are you sure you want to delete this routing rule?")) {
    return;
  }

  try {
    await $api(`/suppliers/routing/${id}`, { method: "DELETE" });
    notification.success("Routing rule deleted");
    await loadRoutingRules();
  } catch (error) {
    console.error("[supplier-routing] Failed to delete rule:", error);
    notification.error("Failed to delete routing rule");
  }
}

function getTechniqueName(value: string) {
  return techniques.find(t => t.value === value)?.title ?? value;
}

function getRegionName(value: string | null) {
  if (!value) return "Global (Any)";
  return regions.find(r => r.value === value)?.title ?? value;
}

function getSupplierName(id: string) {
  return suppliers.value.find(s => s.id === id)?.name ?? "Unknown";
}

onMounted(async () => {
  await loadSuppliers();
  await loadRoutingRules();
});
</script>

<template>
  <div class="supplier-routing-page">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>Supplier Routing Rules</span>
        <VBtn color="primary" prepend-icon="tabler-plus" @click="openCreateDialog">
          Add Rule
        </VBtn>
      </VCardTitle>

      <VCardText>
        <VAlert type="info" variant="tonal" class="mb-4">
          Define default suppliers for each print technique and region. Orders will automatically route based on these rules.
        </VAlert>

        <VTable v-if="!loading && routingRules.length">
          <thead>
            <tr>
              <th>Technique</th>
              <th>Region</th>
              <th>Supplier</th>
              <th>Quantity Range</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in routingRules" :key="rule.id">
              <td>
                <VChip size="small" color="primary" variant="tonal">
                  {{ getTechniqueName(rule.technique) }}
                </VChip>
              </td>
              <td>{{ getRegionName(rule.region) }}</td>
              <td>
                <div class="d-flex align-center gap-2">
                  <VIcon icon="tabler-building-factory" size="20" />
                  <strong>{{ rule.supplierName || getSupplierName(rule.supplierId) }}</strong>
                </div>
              </td>
              <td>
                <template v-if="rule.minQty || rule.maxQty">
                  {{ rule.minQty ?? "0" }} - {{ rule.maxQty ?? "∞" }}
                </template>
                <template v-else>
                  <span class="text-medium-emphasis">Any quantity</span>
                </template>
              </td>
              <td>
                <VBtn
                  icon="tabler-pencil"
                  variant="text"
                  size="small"
                  @click="openEditDialog(rule)"
                />
                <VBtn
                  icon="tabler-trash"
                  variant="text"
                  size="small"
                  color="error"
                  @click="deleteRule(rule.id)"
                />
              </td>
            </tr>
          </tbody>
        </VTable>

        <VAlert v-else-if="!loading && !routingRules.length" type="info" variant="tonal">
          No routing rules configured yet. Click "Add Rule" to create your first rule.
        </VAlert>

        <div v-if="loading" class="text-center pa-8">
          <VProgressCircular indeterminate color="primary" />
          <p class="mt-4">Loading routing rules...</p>
        </div>
      </VCardText>
    </VCard>

    <!-- Rule Dialog -->
    <VDialog v-model="ruleDialog" max-width="600">
      <VCard>
        <VCardTitle>{{ ruleForm.id ? "Edit" : "Create" }} Routing Rule</VCardTitle>
        <VCardText class="d-flex flex-column gap-4">
          <VSelect
            v-model="ruleForm.technique"
            :items="techniques"
            item-title="title"
            item-value="value"
            label="Print Technique"
            variant="outlined"
            required
          />

          <VSelect
            v-model="ruleForm.region"
            :items="regions"
            item-title="title"
            item-value="value"
            label="Region"
            variant="outlined"
            hint="Leave blank for global rule"
            persistent-hint
            clearable
          />

          <VSelect
            v-model="ruleForm.supplierId"
            :items="suppliers"
            item-title="name"
            item-value="id"
            label="Supplier"
            variant="outlined"
            required
            hint="Default supplier for this technique/region combination"
            persistent-hint
          >
            <template #prepend-inner>
              <VIcon icon="tabler-building-factory" />
            </template>
          </VSelect>

          <div class="d-flex gap-4">
            <VTextField
              v-model.number="ruleForm.minQty"
              label="Min Quantity"
              type="number"
              variant="outlined"
              hint="Optional minimum order quantity"
              persistent-hint
              clearable
            />

            <VTextField
              v-model.number="ruleForm.maxQty"
              label="Max Quantity"
              type="number"
              variant="outlined"
              hint="Optional maximum order quantity"
              persistent-hint
              clearable
            />
          </div>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="ruleDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            @click="saveRule"
            :disabled="!ruleForm.technique || !ruleForm.supplierId"
          >
            {{ ruleForm.id ? "Update" : "Create" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.supplier-routing-page {
  display: grid;
  gap: 24px;
}
</style>

