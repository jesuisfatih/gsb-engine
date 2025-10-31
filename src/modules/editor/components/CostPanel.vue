<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useEditorStore } from "../store/editorStore";
import { useGangSheetStore } from "../store/gangSheetStore";

const store = useEditorStore();
const gangStore = useGangSheetStore();
const price = computed(() => store.price);
const stats = computed(() => store.analysis.stats);
const hasErrors = computed(() => store.analysis.hasErrors);
const templateSummary = computed(() => store.templateChecklistSummary);
const templateStatus = computed(() => {
  if (!store.activeTemplate) return "none";
  if (templateSummary.value.missing > 0) return "missing";
  if (templateSummary.value.warnings > 0) return "warning";
  return "ready";
});
const templateTitle = computed(() => store.activeTemplate?.title ?? "Template");

const showCartModal = ref(false);
const cartSubmitting = ref(false);
const combinedSubmitting = ref(false);

watch(
  () => [
    Number(store.analysis.stats.areaIn2.toFixed(2)),
    Number((store.analysis.stats.coverage ?? 0).toFixed(3)),
    store.analysis.stats.colorCount,
    store.quantity,
    store.surfaceId,
    store.printTech,
    store.productSlug,
    store.color,
  ],
  () => store.schedulePricingRefresh(),
  { immediate: true },
);

watch(
  () => store.items.length,
  () => store.schedulePricingRefresh(),
);

const sheetSummaries = computed(() =>
  gangStore.sheets.map(sheet => {
    const estimatedCost = (price.value.unit || 0) * Math.max(1, sheet.quantity);
    return {
      id: sheet.id,
      name: sheet.name,
      preview: sheet.previewUrl,
      sizeLabel: `${sheet.widthIn.toFixed(2)}" x ${sheet.heightIn.toFixed(2)}"`,
      quantity: sheet.quantity,
      utilizationPct: Math.round(Math.min(100, Math.max(0, sheet.utilization * 100))),
      status: sheet.status,
      estimatedCost,
      currency: price.value.currency,
    };
  }),
);

const modalTotal = computed(() => sheetSummaries.value.reduce((acc, sheet) => acc + sheet.estimatedCost, 0));

function openCartModal() {
  showCartModal.value = true;
}

function closeCartModal() {
  if (cartSubmitting.value) return;
  showCartModal.value = false;
}

async function confirmAddToCart() {
  if (cartSubmitting.value) return;
  try {
    cartSubmitting.value = true;
    // Use the real checkout function
    await store.checkoutWithDesign();
    showCartModal.value = false;
  } catch (err) {
    console.error('[cart] Checkout failed', err);
    const message = err instanceof Error ? err.message : 'Failed to proceed to checkout';
    window.alert(message);
  } finally {
    cartSubmitting.value = false;
  }
}

async function createDtfTransfer() {
  if (combinedSubmitting.value) return;
  try {
    combinedSubmitting.value = true;
    await gangStore.submitGangSheetPlan();
    // Use the real checkout function
    await store.checkoutWithDesign();
  } catch (err) {
    console.error('[dtf] Transfer creation failed', err);
    const message = err instanceof Error ? err.message : 'Failed to create DTF transfer';
    window.alert(message);
  } finally {
    combinedSubmitting.value = false;
  }
}
</script>

<template>
  <div class="section-body cost">
    <div class="row">
      <label>Quantity</label>
      <input
        type="number"
        min="1"
        :value="store.quantity"
        @input="store.setQuantity(+(($event.target as HTMLInputElement).value || 1))"
      />
    </div>

    <div class="divider"></div>

    <div class="kv"><span>Area used</span><b>{{ stats.areaIn2.toFixed(1) }} sq in</b></div>
    <div class="kv"><span>Colors (vec.)</span><b>{{ stats.colorCount }}</b></div>
    <div class="kv"><span>Technique</span><b>{{ store.printTech }}</b></div>
    <div class="divider"></div>

    <div
      v-if="templateStatus !== 'none'"
      class="template-banner"
      :data-status="templateStatus"
    >
      <div class="template-banner__title">{{ templateTitle }}</div>
      <div class="template-banner__message">
        <template v-if="templateStatus === 'ready'">
          All placeholders satisfied.
        </template>
        <template v-else-if="templateStatus === 'missing'">
          {{ templateSummary.missing }} required placeholder{{ templateSummary.missing === 1 ? '' : 's' }} incomplete.
        </template>
        <template v-else>
          {{ templateSummary.warnings }} placeholder{{ templateSummary.warnings === 1 ? '' : 's' }} to review.
        </template>
      </div>
    </div>

    <div class="total">
      <div class="kv">
        <span>Unit</span>
        <b>
          <span v-if="price.loading">Calculating…</span>
          <span v-else>{{ price.unit.toFixed(2) }} {{ price.currency }}</span>
        </b>
      </div>
      <div class="kv">
        <span>Total</span>
        <b>
          <span v-if="price.loading">—</span>
          <span v-else>{{ price.total.toFixed(2) }} {{ price.currency }}</span>
        </b>
      </div>
    </div>
    <div v-if="price.error" class="muted error">
      {{ price.error }} (using fallback pricing)
    </div>

    <button class="cta" type="button" :disabled="hasErrors" @click="openCartModal">
      Review &amp; add to cart
    </button>
    <button
      class="ghost-cta"
      type="button"
      :disabled="hasErrors || combinedSubmitting"
      @click="createDtfTransfer"
    >
      <span v-if="combinedSubmitting">Submitting...</span>
      <span v-else>Create DTF transfer</span>
    </button>

    <div v-if="hasErrors" class="muted">Fix design issues before submitting.</div>
  </div>

  <teleport to="body">
    <div v-if="showCartModal" class="cart-modal-backdrop" @click.self="closeCartModal">
      <div class="cart-modal" role="dialog" aria-modal="true">
        <header class="cart-modal__header">
          <h3>Review gang sheets</h3>
          <button type="button" class="close-btn" @click="closeCartModal" aria-label="Close review">
            &times;
          </button>
        </header>

        <div class="cart-modal__list">
          <div v-for="sheet in sheetSummaries" :key="sheet.id" class="cart-modal__item">
            <div class="thumb">
              <img v-if="sheet.preview" :src="sheet.preview" :alt="`${sheet.name} preview`" />
              <span v-else>{{ sheet.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div class="details">
              <strong>{{ sheet.name }}</strong>
              <span>{{ sheet.sizeLabel }} | {{ sheet.utilizationPct }}% coverage</span>
              <span>Quantity: {{ sheet.quantity }} | Status: {{ sheet.status }}</span>
            </div>
            <div class="price">
              <span>Estimated</span>
              <strong>{{ sheet.estimatedCost.toFixed(2) }} {{ sheet.currency }}</strong>
            </div>
          </div>
        </div>

        <footer class="cart-modal__footer">
          <div class="modal-total">
            <span>Total (est.)</span>
            <strong>{{ modalTotal.toFixed(2) }} {{ price.currency }}</strong>
          </div>
          <button
            type="button"
            class="cta confirm"
            :disabled="cartSubmitting"
            @click="confirmAddToCart"
          >
            <span v-if="cartSubmitting">Adding...</span>
            <span v-else>Add to Shopify cart</span>
          </button>
        </footer>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.section-body.cost {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
}

.row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px;
  align-items: center;
}
input[type="number"] {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 100%;
}
.kv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}
.divider {
  height: 1px;
  background: #eee;
  margin: 4px 0;
}
.total {
  background: #f8f8ff;
  border: 1px solid #e8e8ff;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cta {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}
.cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.cta:not(:disabled):hover {
  background: #171724;
}
.ghost-cta {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  background: linear-gradient(180deg, #eef1ff 0%, #ffffff 100%);
  color: #1f2a52;
  cursor: pointer;
  font-weight: 600;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ghost-cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ghost-cta:not(:disabled):hover {
  border-color: #7c3aed;
  box-shadow: 0 12px 24px rgba(124, 58, 237, 0.18);
}
.muted {
  color: #6b7280;
  font-size: 12px;
}

.muted.error {
  color: #b91c1c;
  margin-top: 6px;
}

.cart-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  z-index: 1200;
}
.cart-modal {
  width: min(720px, 100%);
  max-height: min(80vh, 640px);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cart-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #edf2f7;
}
.cart-modal__header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}
.close-btn {
  border: none;
  background: transparent;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s ease;
}
.close-btn:hover {
  color: #111827;
}
.cart-modal__list {
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}
.cart-modal__item {
  display: grid;
  grid-template-columns: 88px 1fr auto;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  background: #f9fafb;
}
.cart-modal__item .thumb {
  width: 88px;
  height: 88px;
  border-radius: 12px;
  overflow: hidden;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #475569;
  font-size: 18px;
}
.cart-modal__item .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cart-modal__item .details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #374151;
}
.cart-modal__item .details strong {
  font-size: 14px;
  color: #111827;
}
.cart-modal__item .price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}
.cart-modal__item .price strong {
  font-size: 16px;
  color: #111827;
}
.cart-modal__footer {
  padding: 18px 24px;
  border-top: 1px solid #edf2f7;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.cart-modal__footer .modal-total {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: #4b5563;
}
.cart-modal__footer .modal-total strong {
  font-size: 20px;
  color: #111827;
}
.cart-modal__footer .cta.confirm {
  flex: 1;
}

@media (max-width: 640px) {
  .cart-modal__item {
    grid-template-columns: 72px 1fr;
  }
  .cart-modal__item .price {
    align-items: flex-start;
  }
}
.template-banner {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(239, 246, 255, 0.6);
  color: #1e293b;
  font-size: 0.85rem;
}

.template-banner[data-status="warning"] {
  background: rgba(254, 243, 199, 0.45);
  border-color: rgba(234, 179, 8, 0.5);
}

.template-banner[data-status="missing"] {
  background: rgba(254, 226, 226, 0.45);
  border-color: rgba(220, 38, 38, 0.45);
}

.template-banner__title {
  font-weight: 600;
  font-size: 0.9rem;
}

.template-banner__message {
  color: rgba(71, 85, 105, 0.85);
}
</style>



