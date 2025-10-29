<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { $api } from "@/utils/api";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Print Techniques",
    embeddedSubtitle: "Configure DTF and Gang Sheet pricing calculations",
  },
});

const notification = useNotificationStore();

type TechniqueConfig = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
  tenantId: string | null;
  config: DtfConfig | GangSheetConfig | null;
};

type DtfConfig = {
  kind: "DTF";
  currency: string;
  baseSetup: number;
  squareCmRate: number;
  minCharge: number;
  whiteUnderbaseMarkup?: number;
  coverageAdjustments?: Array<{ maxCoverage: number; multiplier: number }>;
  quantityBreaks?: Array<{ minQty: number; multiplier: number }>;
};

type GangSheetConfig = {
  kind: "GANG_SHEET";
  currency: string;
  sheetWidthCm: number;
  sheetHeightCm: number;
  sheetCost: number;
  minCoverage?: number;
  lowCoverageSurcharge?: number;
  wasteMultiplier?: number;
  quantityBreaks?: Array<{ minSheets: number; sheetCost: number }>;
};

type PricingRule = {
  id: string;
  name: string;
  scope: string;
  active: boolean;
  formula: any;
  criteria: any;
  startsAt: string | null;
  endsAt: string | null;
};

const loading = ref(false);
const techniques = ref<TechniqueConfig[]>([]);
const selectedTechniqueId = ref<string | null>(null);
const editDialog = ref(false);
const rulesDialog = ref(false);

const pricingRules = ref<PricingRule[]>([]);
const rulesLoading = ref(false);

const editForm = reactive({
  id: "",
  name: "",
  description: "",
  kind: "DTF" as "DTF" | "GANG_SHEET",
  currency: "USD",
  // DTF fields
  baseSetup: 0,
  squareCmRate: 0.01,
  minCharge: 0,
  whiteUnderbaseMarkup: 0.12,
  // Gang Sheet fields
  sheetWidthCm: 55.88,
  sheetHeightCm: 60.96,
  sheetCost: 50,
  minCoverage: 0.7,
  lowCoverageSurcharge: 10,
  wasteMultiplier: 1.2,
});

const selectedTechnique = computed(() => 
  techniques.value.find(t => t.id === selectedTechniqueId.value)
);

async function loadTechniques() {
  loading.value = true;
  try {
    const response = await $api<{ data: TechniqueConfig[] }>("/pricing/configs");
    techniques.value = response.data || [];
    if (!selectedTechniqueId.value && techniques.value.length > 0) {
      selectedTechniqueId.value = techniques.value[0].id;
    }
  } catch (error: any) {
    console.error("[print-techniques] Failed to load:", error);
    notification.error(error?.message || "Failed to load print techniques");
  } finally {
    loading.value = false;
  }
}

async function loadPricingRules() {
  rulesLoading.value = true;
  try {
    const response = await $api<{ data: PricingRule[] }>("/pricing/rules");
    pricingRules.value = response.data || [];
  } catch (error: any) {
    console.error("[print-techniques] Failed to load rules:", error);
    notification.error(error?.message || "Failed to load pricing rules");
  } finally {
    rulesLoading.value = false;
  }
}

function openEditDialog(technique: TechniqueConfig) {
  editForm.id = technique.id;
  editForm.name = technique.name;
  editForm.description = technique.description || "";
  
  if (!technique.config) {
    // Default DTF config
    editForm.kind = "DTF";
    editForm.currency = "USD";
    editForm.baseSetup = 0;
    editForm.squareCmRate = 0.01;
    editForm.minCharge = 0;
    editForm.whiteUnderbaseMarkup = 0.12;
  } else if (technique.config.kind === "DTF") {
    editForm.kind = "DTF";
    editForm.currency = technique.config.currency;
    editForm.baseSetup = technique.config.baseSetup;
    editForm.squareCmRate = technique.config.squareCmRate;
    editForm.minCharge = technique.config.minCharge;
    editForm.whiteUnderbaseMarkup = technique.config.whiteUnderbaseMarkup || 0.12;
  } else if (technique.config.kind === "GANG_SHEET") {
    editForm.kind = "GANG_SHEET";
    editForm.currency = technique.config.currency;
    editForm.sheetWidthCm = technique.config.sheetWidthCm;
    editForm.sheetHeightCm = technique.config.sheetHeightCm;
    editForm.sheetCost = technique.config.sheetCost;
    editForm.minCoverage = technique.config.minCoverage || 0.7;
    editForm.lowCoverageSurcharge = technique.config.lowCoverageSurcharge || 10;
    editForm.wasteMultiplier = technique.config.wasteMultiplier || 1.2;
  }
  
  editDialog.value = true;
}

async function saveTechnique() {
  try {
    const config: DtfConfig | GangSheetConfig = editForm.kind === "DTF" 
      ? {
          kind: "DTF",
          currency: editForm.currency,
          baseSetup: editForm.baseSetup,
          squareCmRate: editForm.squareCmRate,
          minCharge: editForm.minCharge,
          whiteUnderbaseMarkup: editForm.whiteUnderbaseMarkup,
        }
      : {
          kind: "GANG_SHEET",
          currency: editForm.currency,
          sheetWidthCm: editForm.sheetWidthCm,
          sheetHeightCm: editForm.sheetHeightCm,
          sheetCost: editForm.sheetCost,
          minCoverage: editForm.minCoverage,
          lowCoverageSurcharge: editForm.lowCoverageSurcharge,
          wasteMultiplier: editForm.wasteMultiplier,
        };

    await $api(`/pricing/configs/${editForm.id}`, {
      method: "PUT",
      body: {
        name: editForm.name,
        description: editForm.description || null,
        config,
      },
    });

    notification.success("Print technique updated successfully!");
    editDialog.value = false;
    await loadTechniques();
  } catch (error: any) {
    console.error("[print-techniques] Failed to save:", error);
    notification.error(error?.message || "Failed to save print technique");
  }
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

onMounted(async () => {
  await Promise.all([loadTechniques(), loadPricingRules()]);
});
</script>

<template>
  <div class="techniques-shell">
    <!-- Techniques List -->
    <section class="section-card">
      <header class="section-header">
        <div>
          <h2>Print Techniques Configuration</h2>
          <p class="section-subtitle">
            Configure base pricing calculations for DTF and Gang Sheet production methods
          </p>
        </div>
        <VBtn color="primary" variant="outlined" size="small" :loading="loading" @click="loadTechniques">
          Refresh
        </VBtn>
      </header>

      <VAlert type="info" variant="tonal" density="comfortable" class="mb-4">
        <template #prepend>
          <VIcon icon="tabler-info-circle" />
        </template>
        These settings control how the pricing engine calculates quotes for customer orders. Changes affect all future quotes.
      </VAlert>

      <div v-if="loading" class="loading-state">
        <VProgressCircular indeterminate color="primary" />
        <p>Loading print techniques...</p>
      </div>

      <div v-else class="techniques-grid">
        <VCard
          v-for="technique in techniques"
          :key="technique.id"
          :class="{ 'technique-card': true, 'active': technique.id === selectedTechniqueId }"
          variant="outlined"
          @click="selectedTechniqueId = technique.id"
        >
          <VCardText>
            <div class="technique-header">
              <h3>{{ technique.name }}</h3>
              <VChip
                :color="technique.config?.kind === 'DTF' ? 'primary' : 'success'"
                size="small"
                variant="tonal"
              >
                {{ technique.config?.kind || 'Not configured' }}
              </VChip>
            </div>
            
            <p v-if="technique.description" class="technique-description">
              {{ technique.description }}
            </p>

            <div v-if="technique.config" class="technique-summary">
              <!-- DTF Summary -->
              <template v-if="technique.config.kind === 'DTF'">
                <div class="summary-row">
                  <span>Base Setup:</span>
                  <strong>{{ formatCurrency(technique.config.baseSetup, technique.config.currency) }}</strong>
                </div>
                <div class="summary-row">
                  <span>Per cm²:</span>
                  <strong>{{ formatCurrency(technique.config.squareCmRate, technique.config.currency) }}</strong>
                </div>
                <div class="summary-row">
                  <span>Min Charge:</span>
                  <strong>{{ formatCurrency(technique.config.minCharge, technique.config.currency) }}</strong>
                </div>
              </template>

              <!-- Gang Sheet Summary -->
              <template v-else-if="technique.config.kind === 'GANG_SHEET'">
                <div class="summary-row">
                  <span>Sheet Size:</span>
                  <strong>{{ technique.config.sheetWidthCm }} × {{ technique.config.sheetHeightCm }} cm</strong>
                </div>
                <div class="summary-row">
                  <span>Sheet Cost:</span>
                  <strong>{{ formatCurrency(technique.config.sheetCost, technique.config.currency) }}</strong>
                </div>
                <div class="summary-row">
                  <span>Min Coverage:</span>
                  <strong>{{ ((technique.config.minCoverage || 0) * 100).toFixed(0) }}%</strong>
                </div>
              </template>
            </div>

            <VBtn
              color="primary"
              variant="tonal"
              block
              class="mt-4"
              @click.stop="openEditDialog(technique)"
            >
              Configure
            </VBtn>
          </VCardText>
        </VCard>
      </div>
    </section>

    <!-- Pricing Rules Section -->
    <section class="section-card">
      <header class="section-header">
        <div>
          <h2>Dynamic Pricing Rules</h2>
          <p class="section-subtitle">
            Create custom rules for promotions, rush fees, and technique-specific adjustments
          </p>
        </div>
        <VBtn color="success" prepend-icon="tabler-plus" size="small" @click="rulesDialog = true">
          Add Rule
        </VBtn>
      </header>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mb-4">
        <template #prepend>
          <VIcon icon="tabler-alert-triangle" />
        </template>
        This feature is coming soon. Use print technique configs for base pricing.
      </VAlert>

      <VDataTable
        :headers="[
          { title: 'Name', key: 'name' },
          { title: 'Scope', key: 'scope' },
          { title: 'Active', key: 'active' },
          { title: 'Actions', key: 'actions', sortable: false },
        ]"
        :items="pricingRules"
        :loading="rulesLoading"
        density="comfortable"
        no-data-text="No pricing rules configured yet"
      >
        <template #item.active="{ item }">
          <VChip :color="item.active ? 'success' : 'default'" size="small" variant="tonal">
            {{ item.active ? 'Active' : 'Inactive' }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <VBtn icon="tabler-edit" size="small" variant="text" />
          <VBtn icon="tabler-trash" size="small" variant="text" color="error" />
        </template>
      </VDataTable>
    </section>

    <!-- Edit Technique Dialog -->
    <VDialog v-model="editDialog" max-width="700" persistent>
      <VCard>
        <VCardTitle class="dialog-title">
          <h3>Configure {{ editForm.name }}</h3>
          <VBtn icon="tabler-x" variant="text" size="small" @click="editDialog = false" />
        </VCardTitle>

        <VCardText>
          <VTabs v-model="editForm.kind" bg-color="transparent" class="mb-4">
            <VTab value="DTF">DTF Configuration</VTab>
            <VTab value="GANG_SHEET">Gang Sheet Configuration</VTab>
          </VTabs>

          <VWindow v-model="editForm.kind">
            <!-- DTF Config -->
            <VWindowItem value="DTF">
              <div class="config-form">
                <VTextField
                  v-model="editForm.currency"
                  label="Currency"
                  hint="ISO 4217 currency code (e.g., USD, EUR)"
                  persistent-hint
                />

                <VTextField
                  v-model.number="editForm.baseSetup"
                  label="Base Setup Fee"
                  type="number"
                  step="0.01"
                  min="0"
                  hint="Flat fee added to every order"
                  persistent-hint
                />

                <VTextField
                  v-model.number="editForm.squareCmRate"
                  label="Rate per Square Centimeter"
                  type="number"
                  step="0.0001"
                  min="0"
                  hint="Cost multiplied by total printed area"
                  persistent-hint
                />

                <VTextField
                  v-model.number="editForm.minCharge"
                  label="Minimum Charge"
                  type="number"
                  step="0.01"
                  min="0"
                  hint="Minimum invoice amount regardless of area"
                  persistent-hint
                />

                <VTextField
                  v-model.number="editForm.whiteUnderbaseMarkup"
                  label="White Underbase Markup"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  hint="Additional % for white underbase (e.g., 0.12 = 12%)"
                  persistent-hint
                />
              </div>
            </VWindowItem>

            <!-- Gang Sheet Config -->
            <VWindowItem value="GANG_SHEET">
              <div class="config-form">
                <VTextField
                  v-model="editForm.currency"
                  label="Currency"
                  hint="ISO 4217 currency code"
                  persistent-hint
                />

                <div class="form-row">
                  <VTextField
                    v-model.number="editForm.sheetWidthCm"
                    label="Sheet Width (cm)"
                    type="number"
                    step="0.1"
                    min="0"
                  />
                  <VTextField
                    v-model.number="editForm.sheetHeightCm"
                    label="Sheet Height (cm)"
                    type="number"
                    step="0.1"
                    min="0"
                  />
                </div>

                <VTextField
                  v-model.number="editForm.sheetCost"
                  label="Cost per Sheet"
                  type="number"
                  step="0.01"
                  min="0"
                  hint="Base price for a full gang sheet"
                  persistent-hint
                />

                <VTextField
                  v-model.number="editForm.minCoverage"
                  label="Minimum Coverage Ratio"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  hint="Minimum sheet utilization (e.g., 0.7 = 70%)"
                  persistent-hint
                />

                <VTextField
                  v-model.number="editForm.lowCoverageSurcharge"
                  label="Low Coverage Surcharge"
                  type="number"
                  step="0.01"
                  min="0"
                  hint="Flat fee added when coverage is below minimum"
                  persistent-hint
                />

                <VTextField
                  v-model.number="editForm.wasteMultiplier"
                  label="Waste Multiplier"
                  type="number"
                  step="0.01"
                  min="1"
                  hint="Price multiplier for low coverage (e.g., 1.2 = 20% increase)"
                  persistent-hint
                />
              </div>
            </VWindowItem>
          </VWindow>
        </VCardText>

        <VCardActions class="dialog-actions">
          <VSpacer />
          <VBtn variant="text" @click="editDialog = false">Cancel</VBtn>
          <VBtn color="primary" @click="saveTechnique">Save Configuration</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.techniques-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(32, 34, 35, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #111213;
}

.section-subtitle {
  margin: 4px 0 0;
  color: rgba(32, 34, 35, 0.68);
  font-size: 0.88rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: rgba(32, 34, 35, 0.6);
}

.techniques-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.technique-card {
  cursor: pointer;
  transition: all 0.2s;
}

.technique-card:hover {
  border-color: rgba(92, 106, 196, 0.5);
}

.technique-card.active {
  border-color: rgb(92, 106, 196);
  background: rgba(92, 106, 196, 0.04);
}

.technique-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.technique-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #111213;
}

.technique-description {
  margin: 8px 0;
  color: rgba(32, 34, 35, 0.68);
  font-size: 0.9rem;
}

.technique-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(32, 34, 35, 0.08);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.summary-row span {
  color: rgba(32, 34, 35, 0.68);
}

.summary-row strong {
  color: #111213;
  font-weight: 600;
}

.dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(32, 34, 35, 0.08);
}

.dialog-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(32, 34, 35, 0.08);
}

@media (max-width: 720px) {
  .techniques-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

