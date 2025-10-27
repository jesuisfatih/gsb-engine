<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import {
  fetchPricingConfigs,
  fetchPricingRules,
  updatePricingConfig,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  type PricingRuleRecord,
  type TechniqueConfigResponse,
} from "@/modules/editor/services/pricingService";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";

definePage({
  meta: {
    layout: "default",
    action: "manage",
    subject: "MerchantPricing",
  },
});

const notifications = useNotificationStore();

const loading = ref(true);
const savingTechnique = ref(false);
const configs = ref<TechniqueConfigResponse[]>([]);
const rules = ref<PricingRuleRecord[]>([]);
const selectedTechniqueSlug = ref<string | null>(null);
const techniqueForm = reactive<Record<string, any>>({});
const coverageJson = ref("[]");
const quantityJson = ref("[]");
const sheetBreaksJson = ref("[]");
const techniqueError = ref<string | null>(null);

const rulesLoading = ref(false);
const ruleDialog = ref(false);
const ruleSaving = ref(false);
const editingRuleId = ref<string | null>(null);
const ruleForm = reactive({
  name: "",
  scope: "",
  type: "PERCENTAGE",
  percentageValue: 0,
  appliesTo: "total",
  flatValue: 0,
  techniqueSlug: "",
  multiplier: 1,
  criteriaJson: "{}",
  startsAt: "",
  endsAt: "",
  active: true,
});

const selectedTechnique = computed(() =>
  configs.value.find((cfg) => cfg.slug === selectedTechniqueSlug.value) ?? null,
);

const isDtf = computed(() => selectedTechnique.value?.config?.kind === "DTF");
const isGang = computed(() => selectedTechnique.value?.config?.kind === "GANG_SHEET");

function resetTechniqueForm() {
  const cfg = selectedTechnique.value?.config;
  techniqueError.value = null;
  Object.keys(techniqueForm).forEach((key) => delete techniqueForm[key]);
  coverageJson.value = "[]";
  quantityJson.value = "[]";
  sheetBreaksJson.value = "[]";
  if (!cfg) return;
  Object.assign(techniqueForm, JSON.parse(JSON.stringify(cfg)));
  if (cfg.kind === "DTF") {
    coverageJson.value = JSON.stringify(cfg.coverageAdjustments ?? [], null, 2);
    quantityJson.value = JSON.stringify(cfg.quantityBreaks ?? [], null, 2);
  } else if (cfg.kind === "GANG_SHEET") {
    sheetBreaksJson.value = JSON.stringify(cfg.quantityBreaks ?? [], null, 2);
  }
}

function openRuleDialog(rule?: PricingRuleRecord) {
  if (rule) {
    editingRuleId.value = rule.id;
    ruleForm.name = rule.name;
    ruleForm.scope = rule.scope;
    ruleForm.criteriaJson = JSON.stringify(rule.criteria ?? {}, null, 2);
    ruleForm.active = rule.active;
    ruleForm.startsAt = rule.startsAt ?? "";
    ruleForm.endsAt = rule.endsAt ?? "";
    const formula = rule.formula as any;
    if (formula.type === "PERCENTAGE") {
      ruleForm.type = "PERCENTAGE";
      ruleForm.percentageValue = formula.value ?? 0;
      ruleForm.appliesTo = formula.appliesTo ?? "total";
    } else if (formula.type === "FLAT_FEE") {
      ruleForm.type = "FLAT_FEE";
      ruleForm.flatValue = formula.value ?? 0;
    } else if (formula.type === "TECHNIQUE_MULTIPLIER") {
      ruleForm.type = "TECHNIQUE_MULTIPLIER";
      ruleForm.techniqueSlug = formula.techniqueSlug ?? "";
      ruleForm.multiplier = formula.multiplier ?? 1;
    }
  } else {
    editingRuleId.value = null;
    ruleForm.name = "";
    ruleForm.scope = "";
    ruleForm.type = "PERCENTAGE";
    ruleForm.percentageValue = 0.1;
    ruleForm.appliesTo = "total";
    ruleForm.flatValue = 0;
    ruleForm.techniqueSlug = "";
    ruleForm.multiplier = 1;
    ruleForm.criteriaJson = "{}";
    ruleForm.startsAt = "";
    ruleForm.endsAt = "";
    ruleForm.active = true;
  }
  ruleDialog.value = true;
}

async function loadData() {
  loading.value = true;
  try {
    const [techConfigs, tenantRules] = await Promise.all([
      fetchPricingConfigs(),
      fetchPricingRules(),
    ]);
    configs.value = techConfigs;
    rules.value = tenantRules;
    if (!selectedTechniqueSlug.value && techConfigs.length) {
      selectedTechniqueSlug.value = techConfigs.find((entry) => entry.slug === "dtf")?.slug ?? techConfigs[0].slug;
    }
    resetTechniqueForm();
  } catch (error: any) {
    notifications.error(error?.message ?? "Pricing verileri yüklenemedi.");
  } finally {
    loading.value = false;
  }
}

async function refreshRules() {
  rulesLoading.value = true;
  try {
    rules.value = await fetchPricingRules();
  } catch (error: any) {
    notifications.error(error?.message ?? "Pricing rule listesi alınamadı.");
  } finally {
    rulesLoading.value = false;
  }
}

function parseJsonField(field: string, raw: string) {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch (error: any) {
    throw new Error(`${field} JSON formatında olmalı: ${error.message ?? error}`);
  }
}

async function saveTechnique() {
  const technique = selectedTechnique.value;
  if (!technique) return;
  try {
    savingTechnique.value = true;
    const payload: Record<string, any> = JSON.parse(JSON.stringify(techniqueForm));
    if (payload.kind === "DTF") {
      payload.coverageAdjustments = parseJsonField("Coverage adjustments", coverageJson.value) ?? [];
      payload.quantityBreaks = parseJsonField("Quantity breaks", quantityJson.value) ?? [];
    }
    if (payload.kind === "GANG_SHEET") {
      payload.quantityBreaks = parseJsonField("Sheet quantity breaks", sheetBreaksJson.value) ?? [];
    }
    await updatePricingConfig(technique.id, {
      name: technique.name,
      description: technique.description ?? null,
      config: payload,
    });
    notifications.success("Teknik fiyatlandırma güncellendi.");
    await loadData();
  } catch (error: any) {
    techniqueError.value = error?.message ?? "Teknik kaydedilemedi.";
    notifications.error(techniqueError.value);
  } finally {
    savingTechnique.value = false;
  }
}

function buildRulePayload() {
  const criteria = parseJsonField("Kriter", ruleForm.criteriaJson) ?? null;
  let formula: Record<string, unknown>;
  if (ruleForm.type === "PERCENTAGE") {
    formula = {
      type: "PERCENTAGE",
      value: Number(ruleForm.percentageValue),
      appliesTo: ruleForm.appliesTo,
    };
  } else if (ruleForm.type === "FLAT_FEE") {
    formula = {
      type: "FLAT_FEE",
      value: Number(ruleForm.flatValue),
    };
  } else {
    formula = {
      type: "TECHNIQUE_MULTIPLIER",
      techniqueSlug: ruleForm.techniqueSlug,
      multiplier: Number(ruleForm.multiplier),
    };
  }
  return {
    name: ruleForm.name,
    scope: ruleForm.scope,
    criteria,
    formula,
    active: ruleForm.active,
    startsAt: ruleForm.startsAt || null,
    endsAt: ruleForm.endsAt || null,
  };
}

async function saveRule() {
  try {
    ruleSaving.value = true;
    const payload = buildRulePayload();
    if (editingRuleId.value) {
      await updatePricingRule(editingRuleId.value, payload);
      notifications.success("Kural güncellendi.");
    } else {
      await createPricingRule(payload);
      notifications.success("Kural oluşturuldu.");
    }
    ruleDialog.value = false;
    await refreshRules();
  } catch (error: any) {
    notifications.error(error?.message ?? "Kural kaydedilemedi.");
  } finally {
    ruleSaving.value = false;
  }
}

async function removeRule(rule: PricingRuleRecord) {
  if (!confirm(`'${rule.name}' kuralını silmek istediğinize emin misiniz?`))
    return;
  try {
    await deletePricingRule(rule.id);
    notifications.success("Kural silindi.");
    await refreshRules();
  } catch (error: any) {
    notifications.error(error?.message ?? "Kural silinemedi.");
  }
}

onMounted(async () => {
  await loadData();
});

</script>

<template>
  <VContainer fluid class="pa-0 merchant-pricing">
    <VRow>
      <VCol cols="12" lg="5" class="pe-lg-4">
        <VCard rounded="xl" elevation="2" class="pa-4 mb-6">
          <header class="card-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Teknik Fiyatlandırması</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                DTF ve gang sheet maliyet parametrelerini yapılandırın.
              </p>
            </div>
            <VChip color="primary" variant="tonal">Techniques</VChip>
          </header>

          <VSelect
            v-model="selectedTechniqueSlug"
            :items="configs.map(cfg => ({ title: `${cfg.name}${cfg.tenantId ? '' : ' · Global'}`, value: cfg.slug }))"
            label="Teknik seçin"
            density="comfortable"
            class="mb-4"
            :disabled="loading"
            @update:model-value="resetTechniqueForm"
          />

          <div v-if="loading" class="text-medium-emphasis">Teknik bilgileri yükleniyor…</div>
          <div v-else-if="!selectedTechnique">Tanımlı teknik bulunamadı.</div>

          <template v-else>
            <VAlert
              v-if="selectedTechnique.tenantId === null"
              type="info"
              variant="tonal"
              class="mb-4"
            >
              Bu teknik tüm tenant’lar için geçerlidir. Güncelleme platform yöneticisi yetkisi gerektirir.
            </VAlert>

            <div v-if="isDtf" class="tech-form">
              <VTextField
                v-model="techniqueForm.currency"
                label="Para birimi"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.baseSetup"
                type="number"
                label="Setup ücreti (USD)"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.squareCmRate"
                type="number"
                label="cm² başına ücret"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.minCharge"
                type="number"
                label="Minimum iş ücreti"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.whiteUnderbaseMarkup"
                type="number"
                label="White underbase (%)"
                hint="Örn: 0.12 = %12 artış"
                density="comfortable"
                class="mb-3"
              />
              <VTextarea
                v-model="coverageJson"
                label="Coverage adjustments (JSON)"
                rows="4"
                hint='Örn: [{"maxCoverage":0.3,"multiplier":1.18}]'
                class="mb-3"
              />
              <VTextarea
                v-model="quantityJson"
                label="Quantity breaks (JSON)"
                rows="4"
                hint='Örn: [{"minQty":25,"multiplier":0.95}]'
                class="mb-3"
              />
            </div>

            <div v-else-if="isGang" class="tech-form">
              <VTextField
                v-model="techniqueForm.currency"
                label="Para birimi"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.sheetWidthCm"
                type="number"
                label="Sheet genişliği (cm)"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.sheetHeightCm"
                type="number"
                label="Sheet yüksekliği (cm)"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.sheetCost"
                type="number"
                label="Sheet maliyeti (USD)"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.minCoverage"
                type="number"
                label="Minimum coverage"
                hint="0-1 arası"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.lowCoverageSurcharge"
                type="number"
                label="Düşük coverage ek ücreti"
                density="comfortable"
                class="mb-3"
              />
              <VTextField
                v-model.number="techniqueForm.wasteMultiplier"
                type="number"
                label="Atık çarpanı"
                density="comfortable"
                class="mb-3"
              />
              <VTextarea
                v-model="sheetBreaksJson"
                label="Sheet quantity breaks (JSON)"
                rows="4"
                hint='Örn: [{"minSheets":5,"sheetCost":16}]'
              />
            </div>

            <div v-else class="text-medium-emphasis">
              Bu teknik türü henüz form ile düzenlenemiyor. Lütfen JSON yapılandırmasını manuel güncelleyin.
            </div>

            <VAlert
              v-if="techniqueError"
              type="error"
              variant="tonal"
              class="mt-3"
            >
              {{ techniqueError }}
            </VAlert>

            <div class="d-flex justify-end mt-4">
              <VBtn
                color="primary"
                :loading="savingTechnique"
                :disabled="savingTechnique || !selectedTechnique"
                append-icon="tabler-device-floppy"
                @click="saveTechnique"
              >
                Kaydet
              </VBtn>
            </div>
          </template>
        </VCard>
      </VCol>

      <VCol cols="12" lg="7">
        <VCard rounded="xl" elevation="2" class="pa-4 mb-6">
          <header class="card-header">
            <div>
              <h2 class="text-h5 font-weight-semibold mb-1">Fiyat Kuralları</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Tenant bazlı kampanya, rush veya indirim kurallarını yönetin.
              </p>
            </div>
            <VBtn color="primary" variant="tonal" prepend-icon="tabler-plus" @click="openRuleDialog()">
              Kural ekle
            </VBtn>
          </header>

          <VDataTable
            :headers="[
              { title: 'Ad', key: 'name' },
              { title: 'Scope', key: 'scope' },
              { title: 'Formül', key: 'formulaSummary', sortable: false },
              { title: 'Aktif', key: 'active', sortable: false },
              { title: 'İşlem', key: 'actions', sortable: false },
            ]"
            :items="rules.map(rule => ({
              ...rule,
              formulaSummary: (() => {
                const f = rule.formula as any;
                if (!f) return '-';
                if (f.type === 'PERCENTAGE') return `${(f.value * 100).toFixed(1)}% ${f.appliesTo ?? 'total'}`;
                if (f.type === 'FLAT_FEE') return `Flat ${f.value}`;
                if (f.type === 'TECHNIQUE_MULTIPLIER') return `${f.techniqueSlug ?? '-'} × ${f.multiplier}`;
                return f.type ?? '-';
              })(),
            }))"
            density="compact"
            :loading="rulesLoading"
            hide-default-footer
          >
            <template #item.active="{ item }">
              <VChip :color="item.columns.active ? 'success' : 'warning'" size="small" variant="tonal">
                {{ item.columns.active ? "Aktif" : "Pasif" }}
              </VChip>
            </template>
            <template #item.actions="{ item }">
              <VBtn variant="text" size="small" @click="openRuleDialog(item.raw)">Düzenle</VBtn>
              <VBtn variant="text" size="small" color="error" @click="removeRule(item.raw)">Sil</VBtn>
            </template>
          </VDataTable>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="ruleDialog" max-width="520">
      <VCard rounded="xl">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>{{ editingRuleId ? "Kuralı düzenle" : "Yeni fiyat kuralı" }}</span>
          <VBtn icon variant="text" @click="ruleDialog = false">
            <VIcon icon="tabler-x" />
          </VBtn>
        </VCardTitle>
        <VCardText>
          <VTextField v-model="ruleForm.name" label="Ad" density="comfortable" class="mb-3" />
          <VTextField v-model="ruleForm.scope" label="Scope" density="comfortable" class="mb-3" />
          <VTextarea
            v-model="ruleForm.criteriaJson"
            label="Kriter (JSON)"
            rows="3"
            hint='Örn: {"minQty":50}'
            class="mb-3"
          />
          <VSelect
            v-model="ruleForm.type"
            :items="[
              { title: 'Yüzde', value: 'PERCENTAGE' },
              { title: 'Sabit ücret', value: 'FLAT_FEE' },
              { title: 'Teknik çarpanı', value: 'TECHNIQUE_MULTIPLIER' },
            ]"
            label="Formül tipi"
            density="comfortable"
            class="mb-4"
          />

          <div v-if="ruleForm.type === 'PERCENTAGE'" class="mb-4">
            <VTextField
              v-model.number="ruleForm.percentageValue"
              type="number"
              label="Yüzde (örn 0.1 = %10)"
              density="comfortable"
              class="mb-3"
            />
            <VSelect
              v-model="ruleForm.appliesTo"
              :items="[
                { title: 'Total', value: 'total' },
                { title: 'Area cost', value: 'area' },
              ]"
              label="Uygulama alanı"
              density="comfortable"
            />
          </div>
          <div v-else-if="ruleForm.type === 'FLAT_FEE'" class="mb-4">
            <VTextField
              v-model.number="ruleForm.flatValue"
              type="number"
              label="Sabit ücret"
              density="comfortable"
            />
          </div>
          <div v-else class="mb-4">
            <VTextField
              v-model="ruleForm.techniqueSlug"
              label="Teknik slug"
              hint="Örn: dtf, gangsheet"
              density="comfortable"
              class="mb-3"
            />
            <VTextField
              v-model.number="ruleForm.multiplier"
              type="number"
              label="Çarpan (örn 1.05)"
              density="comfortable"
            />
          </div>

          <div class="d-flex gap-3 mb-3">
            <VTextField
              v-model="ruleForm.startsAt"
              type="datetime-local"
              label="Başlangıç"
              density="comfortable"
            />
            <VTextField
              v-model="ruleForm.endsAt"
              type="datetime-local"
              label="Bitiş"
              density="comfortable"
            />
          </div>

          <VSwitch
            v-model="ruleForm.active"
            label="Aktif"
          />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="ruleDialog = false">İptal</VBtn>
          <VBtn
            color="primary"
            :loading="ruleSaving"
            :disabled="ruleSaving"
            @click="saveRule"
          >
            Kaydet
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.merchant-pricing {
  padding: clamp(16px, 4vw, 32px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.tech-form {
  display: flex;
  flex-direction: column;
}

.d-flex.gap-3 {
  gap: 12px;
}
</style>
