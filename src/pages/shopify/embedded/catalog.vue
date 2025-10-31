<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import type { ShopifyProductSummary, ShopifyVariantSummary } from "@/modules/catalog/services/catalogService";
import { useShortcodeStore } from "@/modules/merchant/store/shortcodeStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Catalog & Surfaces",
    embeddedSubtitle: "Map Shopify variants to gang sheet surfaces and keep your editor in sync.",
  },
});

const catalog = useCatalogStore();
const notifications = useNotificationStore();
const shortcodeStore = useShortcodeStore();

const productSearch = ref("");
const selectedShopifyProductId = ref<string>("");

const rowSelections = reactive<Record<string, { productSlug: string | null; surfaceId: string | null; technique: string | null; shortcodeHandle: string | null }>>({});
const rowSaving = reactive<Record<string, boolean>>({});
const rowError = reactive<Record<string, string | null>>({});

const shopifyProducts = computed<ShopifyProductSummary[]>(() => catalog.shopifyProducts);
const filteredShopifyProducts = computed(() => {
  const term = productSearch.value.trim().toLowerCase();
  if (!term)
    return shopifyProducts.value;
  return shopifyProducts.value.filter(product =>
    product.title.toLowerCase().includes(term)
    || product.handle.toLowerCase().includes(term),
  );
});

const selectedShopifyProduct = computed<ShopifyProductSummary | undefined>(() =>
  shopifyProducts.value.find(product => product.id === selectedShopifyProductId.value),
);

const shopifyVariants = computed<ShopifyVariantSummary[]>(() => {
  const variants = selectedShopifyProductId.value ? catalog.variantsForProduct(selectedShopifyProductId.value) : [];
  console.log('[catalog] shopifyVariants computed:', selectedShopifyProductId.value, '→', variants.length, 'variants');
  return variants;
});

const gsbProducts = computed(() => catalog.sortedProducts);

const productOptions = computed(() =>
  gsbProducts.value.map(product => ({ title: product.title, value: product.slug })),
);

const techniqueOptions = computed(() => {
  const set = new Set<string>();
  for (const product of gsbProducts.value)
    (product.techniques ?? []).forEach(tech => set.add(tech));
  return Array.from(set).map(value => ({ title: value.toUpperCase(), value }));
});

const shortcodeOptions = computed(() =>
  shortcodeStore.items.map(item => ({
    title: item.handle,
    value: item.handle,
    subtitle: item.productTitle ?? item.productHandle ?? undefined,
  })),
);

const mappedCount = computed(() =>
  shopifyVariants.value.filter(variant => Boolean(catalog.mappingForVariant(variant.id))).length,
);

const variantHeaders = [
  { title: "Variant", key: "variant" },
  { title: "Options", key: "options" },
  { title: "GSB Product", key: "product" },
  { title: "Surface", key: "surface" },
  { title: "Technique", key: "technique" },
  { title: "Shortcode", key: "shortcode" },
  { title: "Status", key: "status", sortable: false },
];

function ensureRow(variantId: string) {
  if (!rowSelections[variantId])
    rowSelections[variantId] = { productSlug: null, surfaceId: null, technique: null, shortcodeHandle: null };
  if (rowSaving[variantId] === undefined)
    rowSaving[variantId] = false;
  if (rowError[variantId] === undefined)
    rowError[variantId] = null;
}

function getRowSelection(variantId: string) {
  ensureRow(variantId);
  return rowSelections[variantId];
}

function surfacesForProduct(productSlug: string | null) {
  if (!productSlug)
    return [];
  const product = gsbProducts.value.find(item => item.slug === productSlug);
  return product?.surfaces ?? [];
}

function surfaceOptionsForVariant(variantId: string) {
  const selection = getRowSelection(variantId);
  return surfacesForProduct(selection.productSlug).map(surface => ({ title: surface.name, value: surface.id }));
}

function hydrateRowSelections() {
  const ids = new Set(shopifyVariants.value.map(variant => variant.id));

  for (const [variantId] of Object.entries(rowSelections)) {
    if (!ids.has(variantId)) {
      delete rowSelections[variantId];
      delete rowSaving[variantId];
      delete rowError[variantId];
    }
  }

  for (const variant of shopifyVariants.value) {
    ensureRow(variant.id);
    const mapping = catalog.mappingForVariant(variant.id);
    if (mapping) {
      rowSelections[variant.id].productSlug = mapping.productSlug;
      rowSelections[variant.id].surfaceId = mapping.surfaceId;
      rowSelections[variant.id].technique = mapping.technique ?? null;
      rowSelections[variant.id].shortcodeHandle = mapping.shortcodeHandle ?? null;
      rowError[variant.id] = null;
    } else {
      if (!rowSelections[variant.id].productSlug)
        rowSelections[variant.id].productSlug = null;
      if (!rowSelections[variant.id].surfaceId)
        rowSelections[variant.id].surfaceId = null;
      if (!rowSelections[variant.id].technique)
        rowSelections[variant.id].technique = null;
      rowSelections[variant.id].shortcodeHandle = null;
    }
  }
}

async function initialise() {
  try {
    const sessionStore = useSessionStore();
    
    let attempts = 0;
    const maxAttempts = 30;
    while (!sessionStore.isAuthenticated && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }
    
    if (!sessionStore.isAuthenticated) {
      console.warn("[catalog] Authentication timeout, proceeding with limited features");
    }

    await catalog.ensureLoaded();
    await Promise.all([
      catalog.fetchShopifyCatalog().catch(error => {
        console.warn("[catalog] failed to fetch Shopify catalog", error);
        notifications.error("Shopify ürünleri alınamadı.");
      }),
      catalog.loadVariantMappings().catch(error => {
        console.warn("[catalog] failed to load variant mappings", error);
      }),
      shortcodeStore.fetchAll().catch(error => {
        console.warn("[catalog] failed to load shortcodes", error);
        notifications.error("Shortcode listesi alınamadı.");
      }),
    ]);
    hydrateRowSelections();
  } catch (error) {
    console.error("Failed to initialise catalog", error);
  }
}

async function commitRow(variantId: string) {
  const selection = getRowSelection(variantId);
  const variant = shopifyVariants.value.find(item => item.id === variantId);
  if (!variant) return;

  const productSlug = selection.productSlug;
  const surfaceId = selection.surfaceId;

  if (!productSlug || !surfaceId) {
    rowSaving[variantId] = true;
    try {
      selection.shortcodeHandle = null;
      await catalog.removeVariantMapping(variantId, { notify: false });
      rowError[variantId] = null;
    } catch (error: any) {
      rowError[variantId] = error?.response?._data?.error ?? error?.message ?? "Eşleme kaldırılamadı.";
      throw error;
    } finally {
      rowSaving[variantId] = false;
    }
    return;
  }

  const availableSurfaces = surfacesForProduct(productSlug);
  if (!availableSurfaces.length) {
    rowError[variantId] = "Bu üründe tanımlı yüzey yok.";
    return;
  }

  if (!availableSurfaces.some(surface => surface.id === surfaceId)) {
    selection.surfaceId = availableSurfaces[0]?.id ?? null;
    if (!selection.surfaceId) {
      rowError[variantId] = "Bu üründe tanımlı yüzey yok.";
      return;
    }
  }

  selection.shortcodeHandle = selection.shortcodeHandle && selection.shortcodeHandle.trim().length
    ? selection.shortcodeHandle.trim().toLowerCase()
    : null;

  rowSaving[variantId] = true;
  try {
    await catalog.mapVariant({
      productSlug,
      surfaceId: selection.surfaceId!,
      shopifyVariantId: variant.id,
      shopifyVariantTitle: variant.title,
      shopifyProductId: selectedShopifyProduct.value?.id ?? null,
      shopifyProductTitle: selectedShopifyProduct.value?.title ?? null,
      options: variant.options,
      technique: selection.technique,
      color: variant.options.Color ?? variant.options.color ?? null,
      material: variant.options.Material ?? variant.options.material ?? null,
      shortcodeHandle: selection.shortcodeHandle,
    }, { notify: false });
    rowError[variantId] = null;
  } catch (error: any) {
    rowError[variantId] = error?.response?._data?.error ?? error?.message ?? "Eşleme kaydedilemedi.";
    throw error;
  } finally {
    rowSaving[variantId] = false;
  }
}

async function handleProductChange(variantId: string, productSlug: string | null) {
  const selection = getRowSelection(variantId);
  selection.productSlug = productSlug;
  if (!productSlug) {
    selection.surfaceId = null;
    selection.shortcodeHandle = null;
    await commitRow(variantId);
    return;
  }
  const surfaces = surfacesForProduct(productSlug);
  selection.surfaceId = surfaces[0]?.id ?? null;
  selection.shortcodeHandle = null;
  await commitRow(variantId);
}

async function handleSurfaceChange(variantId: string, surfaceId: string | null) {
  const selection = getRowSelection(variantId);
  selection.surfaceId = surfaceId;
  if (!surfaceId) {
    selection.shortcodeHandle = null;
  }
  await commitRow(variantId);
}

async function handleTechniqueChange(variantId: string, technique: string | null) {
  const value = technique && technique.trim().length ? technique.trim() : null;
  getRowSelection(variantId).technique = value;
  await commitRow(variantId);
}

async function handleShortcodeChange(variantId: string, handle: string | null) {
  const selection = getRowSelection(variantId);
  selection.shortcodeHandle = handle && handle.trim().length ? handle.trim() : null;
  await commitRow(variantId);
}

async function clearMapping(variantId: string) {
  getRowSelection(variantId).productSlug = null;
  getRowSelection(variantId).surfaceId = null;
  getRowSelection(variantId).shortcodeHandle = null;
  await commitRow(variantId);
}

onMounted(async () => {
  await initialise();
});

watch(filteredShopifyProducts, products => {
  if (!products.length) {
    selectedShopifyProductId.value = "";
    return;
  }
  if (!selectedShopifyProductId.value || !products.some(product => product.id === selectedShopifyProductId.value))
    selectedShopifyProductId.value = products[0]!.id;
}, { immediate: true });

watch(selectedShopifyProductId, async id => {
  if (!id) return;
  console.log('[catalog] Selected product changed:', id);
  await catalog.fetchShopifyProductVariants(id);
  console.log('[catalog] Variants fetched, count:', catalog.variantsForProduct(id).length);
  console.log('[catalog] shopifyVariants state:', Object.keys(catalog.shopifyVariants));
  hydrateRowSelections();
});

watch(() => shopifyVariants.value.map(variant => variant.id).join("|"), () => {
  hydrateRowSelections();
});

watch(() => catalog.variantMappings, () => {
  hydrateRowSelections();
}, { deep: true });

const isBusy = computed(() => catalog.shopifyLoading || catalog.variantMappingsLoading);
</script>

<template>
  <div class="catalog-page">
    <VRow dense class="mb-4">
      <VCol cols="12">
        <VAlert type="info" variant="tonal" border="start" color="primary">
          Shopify ürünlerini seçip her varyantı doğru gang sheet yüzeyine bağlayın. Bu sayede müşteriler ürün sayfasında özelleştirmeye başladığında doğru şablon otomatik açılır.
        </VAlert>
      </VCol>
    </VRow>

    <VRow dense align="stretch">
      <VCol cols="12" md="4">
        <VCard class="h-100">
          <VCardTitle class="d-flex align-center justify-space-between">
            <span>Shopify ürünleri</span>
            <VChip size="small" color="primary" variant="tonal">{{ shopifyProducts.length }}</VChip>
          </VCardTitle>
          <VCardText>
            <VTextField
              v-model="productSearch"
              density="comfortable"
              variant="outlined"
              placeholder="Ürün ara"
              prepend-inner-icon="mdi-search"
              hide-details
            />
          </VCardText>
          <VDivider />
          <VList class="shopify-list" lines="two">
            <template v-if="catalog.shopifyLoading && !shopifyProducts.length">
              <VListItem>
                <VListItemTitle class="d-flex align-center gap-2">
                  <VProgressCircular indeterminate size="18" width="2" color="primary" />
                  Shopify ürünleri yükleniyor…
                </VListItemTitle>
              </VListItem>
            </template>
            <template v-else>
              <VListItem
                v-for="product in filteredShopifyProducts"
                :key="product.id"
                :class="['shopify-item', { 'shopify-item--active': product.id === selectedShopifyProductId }]"
                @click="selectedShopifyProductId = product.id"
              >
                <VListItemTitle>{{ product.title }}</VListItemTitle>
                <VListItemSubtitle>
                  {{ product.variantsCount }} varyant · {{ product.options.join(', ') || 'Seçenek yok' }}
                </VListItemSubtitle>
              </VListItem>
              <VListItem v-if="!filteredShopifyProducts.length">
                <VListItemTitle>Şu filtreyle ürün bulunamadı.</VListItemTitle>
              </VListItem>
            </template>
          </VList>
        </VCard>
      </VCol>

      <VCol cols="12" md="8">
        <VCard class="h-100">
          <VCardTitle class="d-flex align-center justify-space-between">
            <div>
              <span>Variant eşlemeleri</span>
              <VChip
                v-if="selectedShopifyProduct && shopifyVariants.length"
                size="small"
                color="primary"
                class="ms-2"
                variant="flat"
              >
                {{ mappedCount }} / {{ shopifyVariants.length }} eşlendi
              </VChip>
            </div>
            <div class="status-group">
              <VProgressCircular v-if="isBusy" indeterminate size="20" width="2" color="primary" />
            </div>
          </VCardTitle>
          <VCardSubtitle v-if="selectedShopifyProduct">
            {{ selectedShopifyProduct.title }} · Handle: {{ selectedShopifyProduct.handle }}
          </VCardSubtitle>
          <VDivider />
          <VCardText>
            <VAlert v-if="!selectedShopifyProductId" type="info" variant="tonal" border="start" color="primary">
              Shopify listesinde bir ürün seçerek varyantları görüntüleyin.
            </VAlert>
            <VAlert
              v-else-if="!shopifyVariants.length && !catalog.shopifyLoading"
              type="warning"
              variant="tonal"
              border="start"
              color="warning"
            >
              Seçilen Shopify ürününde varyant bulunamadı.
            </VAlert>
            <div v-else>
              <VDataTable
                :headers="variantHeaders"
                :items="shopifyVariants"
                :items-per-page="-1"
                class="variant-table"
                item-value="id"
                hide-default-footer
              >
                <template #item.variant="{ item }">
                  <div class="variant-cell">
                    <div class="variant-title">{{ item.title }}</div>
                    <div class="variant-meta">
                      <span v-if="item.sku">SKU: {{ item.sku }}</span>
                      <span v-if="item.price"> · {{ item.price }}</span>
                    </div>
                    <div class="variant-status">
                      <VChip
                        v-if="catalog.mappingForVariant(item.id)"
                        color="success"
                        size="x-small"
                        variant="tonal"
                        prepend-icon="mdi-link"
                      >
                        Eşlenmiş
                      </VChip>
                      <VChip
                        v-else
                        color="grey"
                        size="x-small"
                        variant="tonal"
                        prepend-icon="mdi-link-off"
                      >
                        Eşlenmemiş
                      </VChip>
                    </div>
                  </div>
                </template>

                <template #item.options="{ item }">
                  <div class="options-cell">
                    <span v-for="(value, key) in item.options" :key="key" class="option-pill">
                      <strong>{{ key }}:</strong> {{ value }}
                    </span>
                  </div>
                </template>

                <template #item.product="{ item }">
                  <VSelect
                    :model-value="getRowSelection(item.id).productSlug"
                    :items="productOptions"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    clearable
                    :disabled="rowSaving[item.id]"
                    @update:model-value="value => handleProductChange(item.id, value as string | null)"
                  />
                </template>

                <template #item.surface="{ item }">
                  <VSelect
                    :model-value="getRowSelection(item.id).surfaceId"
                    :items="surfaceOptionsForVariant(item.id)"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    clearable
                    :disabled="rowSaving[item.id] || !getRowSelection(item.id).productSlug"
                    :error="!!rowError[item.id] && !getRowSelection(item.id).productSlug"
                    @update:model-value="value => handleSurfaceChange(item.id, value as string | null)"
                  />
                </template>

                <template #item.technique="{ item }">
                  <VAutocomplete
                    :model-value="getRowSelection(item.id).technique"
                    :items="techniqueOptions"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    clearable
                    :disabled="rowSaving[item.id]"
                    @update:model-value="value => handleTechniqueChange(item.id, value as string | null)"
                  />
                </template>

                <template #item.shortcode="{ item }">
                  <VAutocomplete
                    :model-value="getRowSelection(item.id).shortcodeHandle"
                    :items="shortcodeOptions"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    clearable
                    :disabled="rowSaving[item.id]"
                    :loading="shortcodeStore.loading"
                    item-title="title"
                    item-value="value"
                    @update:model-value="value => handleShortcodeChange(item.id, value as string | null)"
                  />
                </template>

                <template #item.status="{ item }">
                  <div class="status-cell">
                    <div class="status-actions">
                      <VBtn
                        icon="mdi-refresh"
                        variant="text"
                        density="comfortable"
                        :loading="rowSaving[item.id]"
                        @click="commitRow(item.id)"
                      />
                      <VBtn
                        icon="mdi-x"
                        variant="text"
                        density="comfortable"
                        color="error"
                        :disabled="rowSaving[item.id]"
                        @click="clearMapping(item.id)"
                      />
                    </div>
                    <div class="status-feedback">
                      <VProgressCircular
                        v-if="rowSaving[item.id]"
                        indeterminate
                        size="16"
                        width="2"
                        color="primary"
                      />
                      <span v-else-if="rowError[item.id]" class="status-error">{{ rowError[item.id] }}</span>
                      <span v-else-if="catalog.mappingForVariant(item.id)" class="status-ok">Kaydedildi</span>
                    </div>
                  </div>
                </template>
              </VDataTable>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.catalog-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.shopify-list {
  max-height: 540px;
  overflow: auto;
}

.shopify-item {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.shopify-item--active {
  background: rgba(93, 90, 241, 0.12);
}

.variant-table {
  --v-table-row-height: auto;
}

.variant-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.variant-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.variant-meta {
  font-size: 0.78rem;
  color: rgba(17, 18, 23, 0.6);
}

.variant-status {
  display: flex;
  gap: 6px;
}

.options-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(17, 18, 23, 0.05);
  font-size: 0.78rem;
}

.status-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.status-actions {
  display: inline-flex;
  gap: 4px;
}

.status-feedback {
  min-width: 96px;
  text-align: right;
  font-size: 0.78rem;
}

.status-error {
  color: #d32f2f;
}

.status-ok {
  color: #388e3c;
}

.status-group {
  min-height: 20px;
}

@media (max-width: 960px) {
  .status-feedback {
    text-align: left;
  }
}
</style>
