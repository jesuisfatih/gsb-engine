<script setup lang="ts">
import { computed, watch } from "vue";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";
import { useEditorStore } from "../store/editorStore";
import { useEditorModeStore } from "../store/editorModeStore";
import { pxToMm } from "../utils/units";

const store = useEditorStore();
const modeStore = useEditorModeStore();
const catalogStore = useCatalogStore();

const isGangMode = computed(() => modeStore.activeMode === "gang");
const allProducts = computed(() => store.products);
const selectableProducts = computed(() => {
  if (isGangMode.value) return allProducts.value.filter(p => p.slug === "gangsheet");
  return allProducts.value.filter(p => p.slug !== "gangsheet");
});

const dtfFallbackSlug = computed(() => {
  const preferred = modeStore.lastProduct.dtf;
  if (preferred && preferred !== "gangsheet") {
    const match = selectableProducts.value.find(p => p.slug === preferred);
    if (match) return match.slug;
  }
  return selectableProducts.value[0]?.slug;
});

watch(isGangMode, gang => {
  if (gang) {
    if (store.productSlug !== "gangsheet") store.setProduct("gangsheet");
  } else {
    if (store.productSlug === "gangsheet") {
      const fallbackSlug = dtfFallbackSlug.value;
      if (fallbackSlug) store.setProduct(fallbackSlug);
    }
  }
}, { immediate: true });

watch(() => store.productSlug, slug => {
  if (!slug) return;
  if (isGangMode.value) {
    modeStore.lastProduct.gang = slug;
  } else if (slug !== "gangsheet") {
    modeStore.lastProduct.dtf = slug;
  }
});

const product = computed(() => store.activeProduct);
const surface = computed(() => store.activeSurface);
const analysis = computed(() => store.analysis);
const validations = computed(() => analysis.value.validations);
const blockerCount = computed(() => validations.value.filter(v => v.level === "blocker").length);
const warningCount = computed(() => validations.value.filter(v => v.level === "warning").length);
const stats = computed(() => analysis.value.stats);
const lowestImageDpi = computed(() => analysis.value.stats.lowestImageDpi ? Math.round(analysis.value.stats.lowestImageDpi!) : null);

const surfaceMetrics = computed(() => {
  const surf = surface.value;
  if (!surf) return null;
  const ppi = surf.ppi ?? store.ppi;
  const widthMm = surf.widthMm ?? pxToMm(surf.widthPx, ppi);
  const heightMm = surf.heightMm ?? pxToMm(surf.heightPx, ppi);
  const safePx = store.safeMarginPx;
  const safeMm = surf.safeMarginMm ?? pxToMm(safePx, ppi);
  const bleedPx = store.bleedMarginPx;
  const bleedMm = surf.bleedMarginMm ?? (bleedPx ? pxToMm(bleedPx, ppi) : 0);
  return {
    widthMm,
    heightMm,
    safePx,
    safeMm,
    bleedPx,
    bleedMm,
    ppi,
    note: surf.note,
  };
});
</script>

<template>
  <div class="section-body">
    <div v-if="catalogStore.error" class="panel-notice error">
      Catalog sync failed. Showing offline data.
    </div>
    <div v-else-if="catalogStore.loading" class="panel-notice">
      Loading product catalog...
    </div>
    <details class="group" open>
      <summary>Product Setup</summary>
      <div class="group-body">
        <div class="row" v-if="!isGangMode && selectableProducts.length">
          <label class="row-label" for="editor-product-select">
            <svg class="row-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6l5-3 3 4 3-4 5 3-2 4-2-.9V20H8V9.1l-2 .9z" fill="currentColor" />
            </svg>
            <span>Product Type</span>
          </label>
          <div class="field">
            <select
              id="editor-product-select"
              :value="store.productSlug"
              @change="store.setProduct(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="p in selectableProducts" :key="p.slug" :value="p.slug">{{ p.title }}</option>
            </select>
          </div>
        </div>

        <div class="row" v-if="product && product.surfaces && product.surfaces.length > 0">
          <label class="row-label" for="editor-surface-select">
            <svg class="row-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M12 3v9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path d="M20 7.5l-8 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path d="M4 7.5l8 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span>Print Surface</span>
          </label>
          <div class="field">
            <select
              id="editor-surface-select"
              :value="store.surfaceId"
              @change="store.setSurface(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="s in product.surfaces" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>
        
        <!-- Debug info for missing surfaces -->
        <div class="row" v-if="product && (!product.surfaces || product.surfaces.length === 0)">
          <div class="panel-notice error" style="grid-column: 1 / -1;">
            Product has no surfaces defined. Please configure surfaces in merchant panel.
          </div>
        </div>

        <div class="row" v-if="!isGangMode && product?.colors?.length">
          <label class="row-label" for="editor-color-select">
            <svg class="row-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3c-3.2 3.9-6 6.6-6 10a6 6 0 0 0 12 0c0-3.4-2.8-6.1-6-10z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
              <circle cx="10" cy="13.5" r="1.2" fill="currentColor" />
              <circle cx="13.8" cy="11.8" r="1.2" fill="currentColor" />
              <circle cx="11.8" cy="16" r="1.1" fill="currentColor" />
            </svg>
            <span>Base Colour</span>
          </label>
          <div class="field">
            <select
              id="editor-color-select"
              :value="store.color"
              @change="store.setColor(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="c in product!.colors!" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div class="row">
          <label class="row-label" for="editor-technique-select">
            <svg class="row-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 2L3 14h6l-1 8 10-12h-6z" fill="currentColor" />
            </svg>
            <span>Technique</span>
          </label>
          <div class="field">
            <select
              id="editor-technique-select"
              :value="store.printTech"
              @change="store.setPrintTech(($event.target as HTMLSelectElement).value as any)"
            >
              <option value="dtf">DTF</option>
              <option value="digital">Digital</option>
              <option value="sublimation">Sublimation</option>
              <option value="screen">Screen Print</option>
              <option value="embroidery">Embroidery</option>
            </select>
          </div>
        </div>
      </div>
    </details>

    <details class="group" open v-if="surfaceMetrics || validations.length">
      <summary>Constraints & Checks</summary>
      <div class="group-body">
        <div class="preflight-pills">
          <span class="chip" :class="{ blocker: blockerCount }">
            Blockers <b>{{ blockerCount }}</b>
          </span>
          <span class="chip warning">
            Warnings <b>{{ warningCount }}</b>
          </span>
          <span class="chip muted">
            Colours <b>{{ stats.colorCount }}</b>
          </span>
          <span class="chip muted" v-if="stats.totalImages">
            Min DPI <b>{{ lowestImageDpi ?? "—" }}</b>
          </span>
          <span class="chip muted">
            Area <b>{{ stats.areaIn2.toFixed(1) }} in&sup2;</b>
          </span>
        </div>

        <div class="hint" v-if="surfaceMetrics">
          <div>Surface: <b>{{ surface?.name }}</b></div>
          <div>Size: <b>{{ surfaceMetrics.widthMm.toFixed(1) }} &times; {{ surfaceMetrics.heightMm.toFixed(1) }} mm</b></div>
          <div>Safe margin: <b>{{ surfaceMetrics.safeMm.toFixed(1) }} mm</b> ({{ surfaceMetrics.safePx }} px)</div>
          <div v-if="surfaceMetrics.bleedPx">Bleed: <b>{{ surfaceMetrics.bleedMm.toFixed(1) }} mm</b> ({{ surfaceMetrics.bleedPx }} px)</div>
          <div>PPI: <b>{{ surfaceMetrics.ppi }}</b></div>
          <div v-if="surfaceMetrics.note" class="note">{{ surfaceMetrics.note }}</div>
        </div>

        <div class="val" v-for="v in validations" :key="v.code" :class="v.level">
          <b>{{ v.level.toUpperCase() }}</b> {{ v.message }}
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.section-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: var(--surface-card);
  border: 1px solid var(--divider);
  box-shadow: var(--panel-glow);
  font-family: var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
}

.group {
  border: 1px solid var(--divider);
  border-radius: 14px;
  overflow: visible; /* ✅ FIX: Allow details to expand/collapse fully */
  background: var(--surface-solid);
  backdrop-filter: blur(6px);
}

.group summary {
  padding: 10px 14px;
  font: 600 13px/1.3 var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  background: rgba(var(--v-theme-primary), 0.14);
  cursor: pointer;
  list-style: none;
  color: var(--text-primary);
  border-radius: 13px; /* ✅ FIX: Fully rounded when collapsed */
  transition: border-radius 0.2s ease;
}

.group[open] summary {
  border-radius: 13px 13px 0 0; /* ✅ Only top rounded when open */
}

.group summary::-webkit-details-marker {
  display: none;
}

.group summary::after {
  content: "\\25BC";
  float: right;
  transition: transform 0.2s ease;
  font-size: 12px;
  color: var(--text-muted);
}

.group[open] summary::after {
  transform: rotate(180deg);
}

.group-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 16px;
  border-radius: 0 0 13px 13px; /* ✅ FIX: Bottom corners rounded */
  background: var(--surface-solid); /* ✅ Ensure background continuity */
}

.row {
  display: grid;
  align-items: center;
  gap: 12px;
  grid-template-columns: auto 1fr;
  width: 100%;
  min-height: 44px;
}

.row-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  max-width: 160px;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-family: var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  flex-shrink: 0;
}

.row-label span:last-child {
  font-size: 12px;
  letter-spacing: 0.08em;
}

.row-icon {
  width: 18px;
  height: 18px;
  color: var(--editor-accent);
}

.field {
  position: relative;
  color: var(--editor-accent);
  min-width: 0;
  flex: 1;
  width: 100%;
}

select {
  appearance: none;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--surface-solid);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  padding: 10px 40px 10px 12px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  color: var(--text-primary);
  font: 500 13px/1.4 var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-color: var(--surface-solid);
  cursor: pointer;
}

.field::after {
  content: "";
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  pointer-events: none;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M6.293 9.293a1 1 0 0 1 1.414 0L12 13.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414Z'/%3E%3C/svg%3E") no-repeat center / contain;
  color: var(--editor-accent);
}

select:focus {
  border-color: var(--editor-accent);
  box-shadow: 0 0 0 3px rgba(76, 29, 149, 0.18);
  outline: none;
}

.hint {
  display: grid;
  color: var(--text-muted);
  font: 12px/1.45 "Public Sans", "Inter", system-ui, sans-serif;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
}

.preflight-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  background: rgba(var(--v-theme-surface-variant), 0.24);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}
.chip b {
  color: var(--text-primary);
  font-weight: 700;
}
.chip.blocker {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(254, 226, 226, 0.45);
  color: #991b1b;
}
.chip.warning {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(253, 230, 138, 0.4);
  color: #78350f;
}
.chip.muted {
  color: var(--text-muted);
}

.note {
  color: var(--text-muted);
  font-style: italic;
}

.panel-notice {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  color: var(--text-muted);
}
.panel-notice.error {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
  color: #b91c1c;
}

.val {
  border-radius: 12px;
  font: 12px/1.35 "Public Sans", "Inter", system-ui, sans-serif;
  padding-block: 8px;
  padding-inline: 10px;
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  background: rgba(var(--v-theme-surface-variant), 0.25);
}

.val.warning {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(253, 230, 138, 0.35);
}

.val.blocker {
  border-color: rgba(239, 68, 68, 0.55);
  background: rgba(254, 226, 226, 0.45);
  color: #991b1b;
}

@media (max-width: 460px) {
  .row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .row-label {
    min-width: 0;
    margin-bottom: 2px;
  }
}
</style>
