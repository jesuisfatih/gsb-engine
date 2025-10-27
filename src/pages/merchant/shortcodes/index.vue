<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useShortcodeStore } from "@/modules/merchant/store/shortcodeStore";
import type { ShortcodeRecord } from "@/modules/merchant/store/shortcodeStore";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";
import type { ProductDefinition, ProductSurface } from "@/modules/editor/types";

definePage({
  meta: {
    layout: "default",
    action: "manage",
    subject: "Merchant",
  },
});

const catalog = useCatalogStore();
const shortcodeStore = useShortcodeStore();

const selectedProduct = ref<string | null>(null);
const selectedSurface = ref<string | null>(null);
const selectedTechnique = ref<string | null>(null);
const handle = ref("");

const products = computed(() => catalog.products as ProductDefinition[]);
const surfaces = computed<ProductSurface[]>(() => {
  if (!selectedProduct.value) return [];
  const product = products.value.find(p => p.id === selectedProduct.value || p.slug === selectedProduct.value);
  if (!product) return [];
  return (product.surfaces ?? []) as ProductSurface[];
});

const selectedProductRecord = computed(() => {
  if (!selectedProduct.value) return null;
  return products.value.find(p => p.id === selectedProduct.value || p.slug === selectedProduct.value) ?? null;
});

const canCreate = computed(() => Boolean(handle.value.trim() && selectedProductRecord.value));
const embedSnippet = (item: { handle: string }) => `<div data-gsb-shortcode="${item.handle}"></div>`;
const scriptSnippet = computed(() => {
  if (typeof window === "undefined") {
    return `<script src="/gsb-shortcode.js" data-api-url="/api/embed/shortcodes" data-editor-url="/editor" defer><\\/script>`;
  }
  const origin = window.location.origin;
  return `<script src="${origin}/gsb-shortcode.js" data-api-url="${origin}/api/embed/shortcodes" data-editor-url="/editor" defer><\\/script>`;
});

function formatUsage(item: ShortcodeRecord) {
  const last7 = item.usageLast7 ?? 0;
  const total = item.usageTotal ?? 0;
  return `${last7} / ${total}`;
}

async function createShortcode() {
  if (!canCreate.value || !selectedProductRecord.value) return;
  const product = selectedProductRecord.value;
  try {
    await shortcodeStore.create({
      handle: handle.value.trim(),
      productId: product.id,
      productGid: product.shopifyProductId ?? product.slug,
      productTitle: product.title,
      productHandle: product.slug,
      surfaceId: selectedSurface.value ?? undefined,
      technique: selectedTechnique.value ?? undefined,
    });
    handle.value = "";
  } catch (error) {
    console.warn("[shortcodes] create failed", error);
  }
}

function resetForm() {
  handle.value = "";
  selectedProduct.value = null;
  selectedSurface.value = null;
  selectedTechnique.value = null;
}

onMounted(() => {
  if (!catalog.loaded && !catalog.loading) {
    catalog.ensureLoaded().catch(err => console.warn("[catalog] load failed", err));
  }
  shortcodeStore.fetchAll().catch(err => console.warn("[shortcodes] load failed", err));
});
</script>

<template>
  <div class="merchant-shortcodes pa-4 pa-sm-6">
    <VRow>
      <VCol cols="12" lg="5">
        <VCard class="pa-4 form-card" elevation="2">
          <header class="mb-4">
            <h2 class="text-h6 mb-1">Generate Shortcode</h2>
            <p class="text-body-2 text-medium-emphasis">
              Map a Shopify product to an editor configuration. Place the generated snippet on the product page to expose the
              "Edit design" button.
            </p>
          </header>
          <VForm @submit.prevent="createShortcode">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="handle"
                  label="Shortcode Handle"
                  placeholder="e.g. dtf-tshirt-front"
                  hint="Only letters, numbers, and hyphen"
                  persistent-hint
                />
              </VCol>

              <VCol cols="12">
                <VSelect
                  v-model="selectedProduct"
                  :items="products"
                  item-title="title"
                  item-value="id"
                  label="Shopify Product"
                  return-object="false"
                  placeholder="Select a product"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="selectedSurface"
                  :items="surfaces"
                  item-title="name"
                  item-value="id"
                  label="Surface (optional)"
                  :disabled="!surfaces.length"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  v-model="selectedTechnique"
                  label="Technique (optional)"
                  placeholder="DTF"
                />
              </VCol>

              <VCol cols="12" class="d-flex gap-3">
                <VBtn color="primary" :disabled="!canCreate" type="submit">Generate</VBtn>
                <VBtn variant="outlined" color="secondary" @click="resetForm">Reset</VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCard>
      </VCol>

      <VCol cols="12" lg="7">
        <VCard class="pa-4" elevation="2">
          <header class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
            <div>
              <h2 class="text-h6 mb-1">Existing Shortcodes</h2>
              <p class="text-body-2 text-medium-emphasis mb-1">
                1. Place the embed container where the button should render.
              </p>
              <code class="d-block mb-2">{{ embedSnippet({ handle: "example-handle" }) }}</code>
              <p class="text-body-2 text-medium-emphasis mb-1">
                2. Include the loader script once (for example in theme.liquid footer).
              </p>
              <code class="d-block">{{ scriptSnippet }}</code>
            </div>
            <VChip color="primary" variant="tonal">{{ shortcodeStore.items.length }} total</VChip>
          </header>

          <VTable density="compact">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Product</th>
                <th>Surface</th>
                <th>Usage<br /><span class="table-caption">(7d / total)</span></th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="shortcodeStore.loading">
                <td colspan="5" class="text-center text-medium-emphasis py-6">Loading shortcodes...</td>
              </tr>
              <tr v-else-if="!shortcodeStore.items.length">
                <td colspan="5" class="text-center text-medium-emphasis py-6">No shortcodes yet.</td>
              </tr>
              <tr
                v-for="item in shortcodeStore.items"
                :key="item.id"
              >
                <td>
                  <div class="d-flex flex-column">
                    <span class="font-weight-medium">{{ item.handle }}</span>
                    <span class="text-caption text-medium-emphasis">{{ item.embed?.div ?? embedSnippet(item) }}</span>
                  </div>
                </td>
                <td>
                  <div class="d-flex flex-column">
                    <span>{{ item.productTitle ?? "Â·" }}</span>
                    <span class="text-caption text-medium-emphasis">{{ item.productGid }}</span>
                  </div>
                </td>
                <td>
                  <span>{{ item.surfaceId ?? "Default" }}</span>
                </td>
                <td>
                  <span class="font-mono">{{ formatUsage(item) }}</span>
                </td>
                <td class="text-right">
                  <VBtn
                    variant="text"
                    color="error"
                    @click="shortcodeStore.remove(item.handle)"
                  >
                    Remove
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.merchant-shortcodes {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-card {
  position: sticky;
  top: 88px;
}

code {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.18);
}
</style>
