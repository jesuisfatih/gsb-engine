<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { definePage } from "unplugin-vue-router/runtime";
import { useMerchantBillingStore } from "@/modules/merchant/store/billingStore";
import { useMerchantPricingStore } from "@/modules/merchant/store/pricingStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Pricing & Billing",
    embeddedSubtitle: "Track platform usage fees and control customer-facing editor pricing.",
  },
});

const billingStore = useMerchantBillingStore();
const pricingStore = useMerchantPricingStore();

const {
  summary,
  summaryLoading,
  summaryError,
  config,
  configLoading,
  configError,
  charges,
  chargesLoading,
  chargesError,
} = storeToRefs(billingStore);

const configForm = reactive({
  currency: "USD",
  perOrderFee: null as number | null,
  freeOrderAllowance: 0,
  notes: "",
});
const configSaveLoading = ref(false);

watch(
  () => config.value,
  (value) => {
    configForm.currency = value?.currency ?? "USD";
    configForm.perOrderFee = value?.perOrderFee ? Number(value.perOrderFee) : null;
    configForm.freeOrderAllowance = value?.freeOrderAllowance ?? 0;
    configForm.notes = value?.notes ?? "";
  },
  { immediate: true },
);

const markupDrafts = reactive<Record<string, number>>({});

watchEffect(() => {
  const list = pricingStore.markupList;
  for (const item of list) {
    if (Number.isFinite(pricingStore.getPercentage(item.slug))) {
      markupDrafts[item.slug] = pricingStore.getPercentage(item.slug);
    } else if (!(item.slug in markupDrafts)) {
      markupDrafts[item.slug] = 0;
    }
  }
});

const summaryMetrics = computed(() => {
  if (!summary.value) return [];
  return [
    {
      label: "MTD Orders",
      value: summary.value.monthToDateOrders.toString(),
    },
    {
      label: "MTD Usage Fees",
      value: formatCurrency(summary.value.monthToDateCharges, summary.value.currency),
    },
    {
      label: "Pending",
      value: formatCurrency(summary.value.pendingCharges, summary.value.currency),
    },
    {
      label: "Invoiced",
      value: formatCurrency(summary.value.invoicedCharges, summary.value.currency),
    },
    {
      label: "Lifetime Paid",
      value: formatCurrency(summary.value.paidCharges, summary.value.currency),
    },
  ];
});

const chargeHeaders = [
  { title: "Date", key: "occurredAt", sortable: false },
  { title: "Description", key: "description", sortable: false },
  { title: "Type", key: "type", sortable: false },
  { title: "Status", key: "status", sortable: false },
  { title: "Amount", key: "totalAmount", sortable: false, align: "end" as const },
];

const formatCurrency = (amount: number | null | undefined, currency: string) => {
  const numeric = amount ?? 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(numeric);
  } catch {
    return `${numeric.toFixed(2)} ${currency}`;
  }
};

const formatChargeAmount = (charge: { totalAmount: string; currency: string }) =>
  formatCurrency(Number(charge.totalAmount), charge.currency);

const resolveStatusChip = (status: string) => {
  const tone =
    status === "PAID"
      ? "success"
      : status === "INVOICED"
        ? "info"
        : status === "WAIVED"
          ? "neutral"
          : status === "REFUNDED"
            ? "warning"
            : "pending";
  return { tone, label: status.toLowerCase().replace(/_/g, " ") };
};

async function saveConfig() {
  if (configSaveLoading.value) return;
  configSaveLoading.value = true;
  try {
    await billingStore.updateConfig({
      currency: configForm.currency,
      perOrderFee: configForm.perOrderFee !== null ? Number(configForm.perOrderFee) : null,
      freeOrderAllowance: Number(configForm.freeOrderAllowance ?? 0),
      notes: configForm.notes || null,
    });
    await billingStore.fetchSummary();
  } finally {
    configSaveLoading.value = false;
  }
}

async function saveMarkup(slug: string) {
  const value = Number(markupDrafts[slug] ?? 0);
  await pricingStore.saveMarkup(slug, value);
  await billingStore.fetchSummary(); // refresh to reflect change in totals if needed
}

onMounted(async () => {
  await Promise.all([
    billingStore.fetchSummary(),
    billingStore.fetchConfig(),
    billingStore.fetchCharges(50),
    pricingStore.loadMarkups(),
  ]);
});
</script>

<template>
  <div class="billing-shell">
    <section class="section-card">
      <header class="section-header">
        <div>
          <h2>Platform Usage Fees</h2>
          <p class="section-subtitle">Monitor what you owe the platform for orders processed through the editor.</p>
        </div>
        <VBtn variant="outlined" size="small" :loading="summaryLoading" @click="billingStore.fetchSummary()">
          Refresh
        </VBtn>
      </header>

      <VAlert
        v-if="summaryError"
        type="error"
        border="start"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        {{ summaryError }}
      </VAlert>

      <div v-if="summaryLoading" class="loading-placeholder">
        <VProgressCircular indeterminate color="primary" />
        <span>Loading billing summary…</span>
      </div>
      <div v-else class="metric-grid">
        <div v-for="metric in summaryMetrics" :key="metric.label" class="metric-card">
          <span class="metric-label">{{ metric.label }}</span>
          <span class="metric-value">{{ metric.value }}</span>
        </div>
      </div>

      <VDivider class="my-6" />

      <div class="config-grid">
        <div>
          <h3>Usage Fee Configuration</h3>
          <p class="config-caption">
            Set how much you pay per fulfilled order after the free allowance.
          </p>
        </div>
        <VForm @submit.prevent="saveConfig">
          <div class="form-grid">
            <VTextField
              v-model="configForm.currency"
              label="Currency"
              placeholder="USD"
              density="comfortable"
              :disabled="configLoading || configSaveLoading"
              maxlength="3"
              class="form-item"
            />
            <VTextField
              v-model.number="configForm.perOrderFee"
              label="Per-order fee"
              type="number"
              min="0"
              step="0.01"
              density="comfortable"
              :disabled="configLoading || configSaveLoading"
              class="form-item"
              prefix="$"
            />
            <VTextField
              v-model.number="configForm.freeOrderAllowance"
              label="Free orders per month"
              type="number"
              min="0"
              density="comfortable"
              :disabled="configLoading || configSaveLoading"
              class="form-item"
            />
          </div>
          <VTextarea
            v-model="configForm.notes"
            label="Notes"
            hint="Optional notes for admins or finance."
            persistent-hint
            rows="2"
            density="comfortable"
            :disabled="configLoading || configSaveLoading"
          />
          <div class="form-actions">
            <VBtn type="submit" color="primary" :loading="configSaveLoading" :disabled="configLoading">
              Save configuration
            </VBtn>
            <span v-if="configError" class="error-text">{{ configError }}</span>
          </div>
        </VForm>
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <div>
          <h2>Recent Usage Charges</h2>
          <p class="section-subtitle">Each item represents a charge applied to your account after the free allowance.</p>
        </div>
        <VBtn variant="text" size="small" :loading="chargesLoading" @click="billingStore.fetchCharges(50)">
          Reload list
        </VBtn>
      </header>

      <VAlert
        v-if="chargesError"
        type="warning"
        border="start"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        {{ chargesError }}
      </VAlert>

      <VDataTable
        :headers="chargeHeaders"
        :items="charges"
        :loading="chargesLoading"
        class="usage-table"
        density="comfortable"
        :fixed-header="true"
        height="300"
        no-data-text="No usage charges recorded yet."
      >
        <template #item.occurredAt="{ item }">
          {{ new Date(item.occurredAt).toLocaleString() }}
        </template>
        <template #item.status="{ item }">
          <VChip :color="resolveStatusChip(item.status).tone" size="small" variant="tonal">
            {{ resolveStatusChip(item.status).label }}
          </VChip>
        </template>
        <template #item.totalAmount="{ item }">
          {{ formatChargeAmount(item) }}
        </template>
      </VDataTable>
    </section>

    <section class="section-card">
      <header class="section-header">
        <div>
          <h2>Editor Markups</h2>
          <p class="section-subtitle">Control the margin applied to customer-facing prices generated by the editor.</p>
        </div>
        <VBtn variant="outlined" size="small" :loading="pricingStore.loading" @click="pricingStore.loadMarkups()">
          Refresh markups
        </VBtn>
      </header>

      <VAlert
        v-if="pricingStore.error"
        type="error"
        border="start"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        {{ pricingStore.error }}
      </VAlert>

      <div class="markup-grid">
        <div
          v-for="markup in pricingStore.markupList"
          :key="markup.slug"
          class="markup-card"
        >
          <div class="markup-header">
            <span class="markup-label">{{ markup.label }}</span>
            <VChip color="primary" variant="tonal" size="small">
              {{ (markup.multiplier - 1 >= 0 ? "+" : "") + (Math.round((markup.multiplier - 1) * 1000) / 10).toFixed(1) }}%
            </VChip>
          </div>
          <VTextField
            v-model.number="markupDrafts[markup.slug]"
            label="Markup (%)"
            type="number"
            min="-90"
            max="500"
            step="0.5"
            density="comfortable"
            :disabled="pricingStore.saving"
          />
          <VBtn
            color="primary"
            block
            :loading="pricingStore.saving"
            @click="saveMarkup(markup.slug)"
          >
            Save
          </VBtn>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.billing-shell {
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

.loading-placeholder {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(32, 34, 35, 0.6);
  font-size: 0.9rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.metric-card {
  border-radius: 12px;
  background: rgba(92, 106, 196, 0.08);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-label {
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: rgba(32, 34, 35, 0.65);
  font-weight: 600;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1c1d;
}

.config-grid {
  display: grid;
  gap: 16px;
}

.config-caption {
  margin: 8px 0 0;
  color: rgba(32, 34, 35, 0.65);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.error-text {
  color: #c72c2e;
  font-size: 0.85rem;
}

.usage-table {
  border-radius: 12px;
  border: 1px solid rgba(32, 34, 35, 0.08);
  overflow: hidden;
}

.markup-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.markup-card {
  border: 1px solid rgba(32, 34, 35, 0.08);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.markup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.markup-label {
  font-weight: 600;
  font-size: 0.98rem;
  color: #111213;
}

@media (max-width: 720px) {
  .section-card {
    padding: 20px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .metric-grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
</style>
