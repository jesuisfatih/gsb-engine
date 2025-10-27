<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";
import type { ProductDefinition, ProductSurface } from "@/modules/editor/types";
import { pxToMm, mmToPx } from "@/modules/editor/utils/units";

definePage({ meta: { layout: "default", action: "manage", subject: "ProductCatalog" } });

const catalog = useCatalogStore();
const selectedSlug = ref<string>("");
const productDialog = ref(false);
const surfaceDialog = ref(false);

const productForm = reactive({
  title: "",
  slug: "",
  category: "textile",
  colors: [] as string[],
  materials: [] as string[],
  base: 100,
  perSqIn: 0.2,
  colorAdder: 0,
  techniques: ["dtf"] as string[],
});

const surfaceForm = reactive({
  mode: "create" as "create" | "edit",
  productSlug: "",
  id: "",
  name: "",
  widthMm: 200,
  heightMm: 200,
  safeMarginMm: 5,
  bleedMarginMm: 0,
  ppi: 300,
  previewImage: "",
  maskPath: "",
});

const shopifyProductId = ref<string>("");

const categories = [
  { title: "Textile", value: "textile" },
  { title: "Drinkware", value: "drinkware" },
  { title: "Accessories", value: "accessories" },
  { title: "Home Décor", value: "home_decor" },
];

const techniques = [
  { title: "Digital", value: "digital" },
  { title: "DTF", value: "dtf" },
  { title: "Sublimation", value: "sublimation" },
  { title: "Screen", value: "screen" },
  { title: "Embroidery", value: "embroidery" },
];

const selectedProduct = computed<ProductDefinition | undefined>(() =>
  catalog.sortedProducts.find(p => p.slug === selectedSlug.value)
);

const surfaces = computed(() => selectedProduct.value?.surfaces ?? []);

onMounted(async () => {
  await catalog.ensureLoaded();
  if (!selectedSlug.value && catalog.sortedProducts.length)
    selectedSlug.value = catalog.sortedProducts[0].slug;
});

watch(
  () => catalog.sortedProducts.length,
  length => {
    if (!length) {
      selectedSlug.value = "";
      return;
    }
    if (!selectedSlug.value) selectedSlug.value = catalog.sortedProducts[0].slug;
  }
);

watch(shopifyProductId, async id => {
  if (!id) return;
  await catalog.fetchShopifyProductVariants(id);
});

function resetProductForm() {
  productForm.title = "";
  productForm.slug = "";
  productForm.category = "textile";
  productForm.colors = [];
  productForm.materials = [];
  productForm.base = 100;
  productForm.perSqIn = 0.2;
  productForm.colorAdder = 0;
  productForm.techniques = ["dtf"];
}

function openCreateProduct() {
  resetProductForm();
  productDialog.value = true;
}

function generateSlug(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function saveProduct() {
  const slug = productForm.slug || generateSlug(productForm.title);
  if (!slug) return;
  const newProduct: ProductDefinition = {
    slug,
    title: productForm.title || slug,
    category: productForm.category,
    materials: [...productForm.materials],
    colors: [...productForm.colors],
    techniques: [...productForm.techniques],
    surfaces: [],
    pricing: {
      base: productForm.base,
      perSqIn: productForm.perSqIn,
      colorAdder: productForm.colorAdder,
      techMultipliers: {
        digital: 1,
        dtf: 1,
        sublimation: 1,
        screen: 1,
        embroidery: 1,
      },
      quantityBreaks: [],
    },
  };
  try {
    await catalog.addProduct(newProduct);
    productDialog.value = false;
    selectedSlug.value = slug;
  } catch (error) {
    console.error("Failed to create product", error);
  }
}

function loadSurface(surface: ProductSurface, productSlug: string, mode: "create" | "edit") {
  surfaceForm.mode = mode;
  surfaceForm.productSlug = productSlug;
  surfaceForm.id = surface.id;
  surfaceForm.name = surface.name;
  const ppi = surface.ppi ?? 300;
  surfaceForm.widthMm = surface.widthMm ?? pxToMm(surface.widthPx, ppi);
  surfaceForm.heightMm = surface.heightMm ?? pxToMm(surface.heightPx, ppi);
  surfaceForm.safeMarginMm = surface.safeMarginMm ?? pxToMm(surface.safeMarginPx ?? 0, ppi);
  surfaceForm.bleedMarginMm = surface.bleedMarginMm ?? pxToMm(surface.bleedMarginPx ?? 0, ppi);
  surfaceForm.ppi = ppi;
  surfaceForm.previewImage = surface.previewImage ?? "";
  surfaceForm.maskPath = surface.maskPath ?? "";
  surfaceDialog.value = true;
}

function createSurface(productSlug: string) {
  surfaceForm.mode = "create";
  surfaceForm.productSlug = productSlug;
  surfaceForm.id = `surface-${Date.now()}`;
  surfaceForm.name = "New Surface";
  surfaceForm.widthMm = 200;
  surfaceForm.heightMm = 200;
  surfaceForm.safeMarginMm = 5;
  surfaceForm.bleedMarginMm = 0;
  surfaceForm.ppi = 300;
  surfaceForm.previewImage = "";
  surfaceForm.maskPath = "";
  surfaceDialog.value = true;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePreviewUpload(files: File[] | File | null) {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  if (!list.length) return;
  surfaceForm.previewImage = await fileToDataUrl(list[0]);
}

async function handleMaskUpload(files: File[] | File | null) {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  if (!list.length) return;
  surfaceForm.maskPath = await fileToDataUrl(list[0]);
}

async function persistSurface() {
  const surface: ProductSurface = {
    id: surfaceForm.id,
    name: surfaceForm.name,
    widthPx: mmToPx(surfaceForm.widthMm, surfaceForm.ppi),
    heightPx: mmToPx(surfaceForm.heightMm, surfaceForm.ppi),
    safeMarginPx: mmToPx(surfaceForm.safeMarginMm, surfaceForm.ppi),
    bleedMarginPx: surfaceForm.bleedMarginMm ? mmToPx(surfaceForm.bleedMarginMm, surfaceForm.ppi) : undefined,
    widthMm: surfaceForm.widthMm,
    heightMm: surfaceForm.heightMm,
    safeMarginMm: surfaceForm.safeMarginMm,
    bleedMarginMm: surfaceForm.bleedMarginMm,
    ppi: surfaceForm.ppi,
    previewImage: surfaceForm.previewImage,
    maskPath: surfaceForm.maskPath,
  };
  try {
    if (surfaceForm.mode === "create")
      await catalog.addSurface(surfaceForm.productSlug, surface);
    else
      await catalog.updateSurface(surfaceForm.productSlug, surfaceForm.id, surface);
    surfaceDialog.value = false;
  } catch (error) {
    console.error("Failed to persist surface", error);
  }
}

async function removeSurface(productSlug: string, surfaceId: string) {
  try {
    await catalog.removeSurface(productSlug, surfaceId);
  } catch (error) {
    console.error("Failed to remove surface", error);
  }
}

const shopifyProducts = computed(() => catalog.shopifyProducts);
const shopifyVariants = computed(() =>
  shopifyProductId.value ? catalog.variantsForProduct(shopifyProductId.value) : []
);

function surfaceName(surfaceId: string) {
  return surfaces.value.find(s => s.id === surfaceId)?.name ?? surfaceId;
}

function mappingForVariant(variantId: string) {
  return catalog.variantMappingByVariantId[variantId];
}

function onVariantSurfaceChange(variantId: string, surfaceId: string | null) {
  const variant = shopifyVariants.value.find(v => v.id === variantId);
  if (!selectedProduct.value || !variant) return;
  const color = variant.options.Color ?? variant.options.color ?? null;
  const material = variant.options.Material ?? variant.options.material ?? null;
  if (surfaceId) {
    catalog.mapVariant({ productSlug: selectedProduct.value.slug, variantId, surfaceId, color, material });
  } else {
    const existing = catalog.variantMappingByVariantId[variantId];
    if (existing)
      catalog.removeVariantMapping({ productSlug: selectedProduct.value.slug, surfaceId: existing.surfaceId, color: existing.color, material: existing.material });
  }
}
</script>

<template>
  <VContainer fluid class="py-6">
    <VRow align="stretch" dense>
      <VCol cols="12" md="4">
        <VCard>
          <VCardTitle class="d-flex justify-space-between align-center">
            <span>Product Catalog</span>
            <VBtn size="small" color="primary" @click="openCreateProduct">New Product</VBtn>
          </VCardTitle>
          <VDataTable
            :items="catalog.sortedProducts"
            :headers="[
              { title: 'Title', key: 'title' },
              { title: 'Colors', key: 'colors' },
              { title: 'Surfaces', key: 'surfaceCount' },
            ]"
            item-key="slug"
            :items-per-page="10"
            class="elevation-0"
          >
            <template #item.colors="{ item }">
              <span>{{ item.raw.colors?.length ?? 0 }}</span>
            </template>
            <template #item.surfaceCount="{ item }">
              <span>{{ item.raw.surfaces.length }}</span>
            </template>
            <template #item.title="{ item }">
              <VListItem
                :class="['catalog-row', { 'catalog-row--active': item.raw.slug === selectedSlug }]"
                @click="selectedSlug = item.raw.slug"
              >
                <VListItemTitle>{{ item.raw.title }}</VListItemTitle>
                <VListItemSubtitle>{{ item.raw.slug }}</VListItemSubtitle>
              </VListItem>
            </template>
          </VDataTable>
        </VCard>
      </VCol>

      <VCol cols="12" md="8" class="d-flex flex-column gap-4">
        <VCard v-if="selectedProduct">
          <VCardTitle>
            {{ selectedProduct.title }}
          </VCardTitle>
          <VCardSubtitle class="text-caption">
            {{ selectedProduct.slug }} · Colors: {{ selectedProduct.colors?.join(', ') || 'Default' }} · Materials: {{ selectedProduct.materials?.join(', ') || 'Default' }}
          </VCardSubtitle>
          <VDivider class="my-3" />
          <VCardText>
            <div class="d-flex justify-space-between align-center mb-3">
              <h4 class="text-subtitle-1 mb-0">Surfaces</h4>
              <VBtn size="small" variant="tonal" @click="createSurface(selectedProduct.slug)">Add Surface</VBtn>
            </div>
            <VDataTable
              :items="surfaces"
              :headers="[
                { title: 'Name', key: 'name' },
                { title: 'Size (mm)', key: 'size' },
                { title: 'Safe/Bleed', key: 'safe' },
                { title: 'PPI', key: 'ppi' },
                { title: 'Actions', key: 'actions', sortable: false },
              ]"
              hide-default-footer
            >
              <template #item.size="{ item }">
                {{ (item.raw.widthMm ?? pxToMm(item.raw.widthPx, item.raw.ppi ?? 300)).toFixed(1) }} ×
                {{ (item.raw.heightMm ?? pxToMm(item.raw.heightPx, item.raw.ppi ?? 300)).toFixed(1) }}
              </template>
              <template #item.safe="{ item }">
                Safe {{ (item.raw.safeMarginMm ?? pxToMm(item.raw.safeMarginPx ?? 0, item.raw.ppi ?? 300)).toFixed(1) }}mm
                <span v-if="item.raw.bleedMarginMm || item.raw.bleedMarginPx"> · Bleed {{ (item.raw.bleedMarginMm ?? pxToMm(item.raw.bleedMarginPx ?? 0, item.raw.ppi ?? 300)).toFixed(1) }}mm</span>
              </template>
              <template #item.ppi="{ item }">
                {{ item.raw.ppi ?? 300 }}
              </template>
              <template #item.actions="{ item }">
                <VBtn variant="text" size="small" @click="loadSurface(item.raw, selectedProduct.slug, 'edit')">Edit</VBtn>
                <VBtn variant="text" size="small" color="error" @click="removeSurface(selectedProduct.slug, item.raw.id)">Remove</VBtn>
              </template>
            </VDataTable>
          </VCardText>
        </VCard>

        <VCard>
          <VCardTitle class="d-flex justify-space-between align-center">
            <span>Shopify Variant Mapping</span>
            <div class="d-flex gap-2">
              <VBtn size="small" variant="outlined" @click="catalog.fetchShopifyCatalog" :loading="catalog.shopifyLoading">Fetch Products</VBtn>
              <VSelect
                v-model="shopifyProductId"
                :items="shopifyProducts"
                item-title="title"
                item-value="id"
                label="Shopify Product"
                density="compact"
                style="width: 220px;"
              />
            </div>
          </VCardTitle>
          <VCardText v-if="shopifyProductId && shopifyVariants.length">
            <VDataTable
              :items="shopifyVariants"
              :headers="[
                { title: 'Variant', key: 'title' },
                { title: 'Options', key: 'options' },
                { title: 'Surface Mapping', key: 'mapping', sortable: false },
              ]"
              hide-default-footer
            >
              <template #item.options="{ item }">
                <div class="text-caption">
                  <div v-for="(val, key) in item.raw.options" :key="key">{{ key }}: {{ val }}</div>
                </div>
              </template>
              <template #item.mapping="{ item }">
                <VSelect
                  :items="[{ title: '— Select surface —', value: null }, ...surfaces.map(s => ({ title: s.name, value: s.id }))]"
                  :model-value="mappingForVariant(item.raw.id)?.surfaceId ?? null"
                  density="compact"
                  class="max-w-200"
                  @update:model-value="value => onVariantSurfaceChange(item.raw.id, value)"
                />
              </template>
            </VDataTable>
          </VCardText>
          <VCardText v-else class="text-medium-emphasis">
            Select a Shopify product to view variants and map them to surfaces.
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="productDialog" max-width="520">
      <VCard>
        <VCardTitle>New Product</VCardTitle>
        <VCardText class="d-flex flex-column gap-4">
          <VTextField v-model="productForm.title" label="Title" required />
          <VTextField v-model="productForm.slug" label="Slug" hint="Optional – autogenerated from title" />
          <VSelect v-model="productForm.category" :items="categories" label="Category" />
          <VCombobox v-model="productForm.colors" label="Colors" multiple chips hint="Enter and press enter" />
          <VCombobox v-model="productForm.materials" label="Materials" multiple chips />
          <VSelect v-model="productForm.techniques" :items="techniques" multiple chips label="Techniques" />
          <div class="d-flex gap-4">
            <VTextField v-model.number="productForm.base" label="Base Price" type="number" prefix="₺" />
            <VTextField v-model.number="productForm.perSqIn" label="Per SqIn" type="number" />
            <VTextField v-model.number="productForm.colorAdder" label="Color Adder" type="number" />
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="productDialog = false">Cancel</VBtn>
          <VBtn color="primary" @click="saveProduct">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="surfaceDialog" max-width="600">
      <VCard>
        <VCardTitle>{{ surfaceForm.mode === 'create' ? 'New Surface' : 'Edit Surface' }}</VCardTitle>
        <VCardText class="d-flex flex-column gap-4">
          <VTextField v-model="surfaceForm.name" label="Name" required />
          <div class="d-flex gap-4">
            <VTextField v-model.number="surfaceForm.widthMm" label="Width (mm)" type="number" />
            <VTextField v-model.number="surfaceForm.heightMm" label="Height (mm)" type="number" />
          </div>
          <div class="d-flex gap-4">
            <VTextField v-model.number="surfaceForm.safeMarginMm" label="Safe Margin (mm)" type="number" />
            <VTextField v-model.number="surfaceForm.bleedMarginMm" label="Bleed (mm)" type="number" />
            <VTextField v-model.number="surfaceForm.ppi" label="PPI" type="number" />
          </div>
          <VFileInput label="Preview Image" accept="image/*" @update:model-value="handlePreviewUpload" />
          <VFileInput label="Mask Image" accept="image/*" @update:model-value="handleMaskUpload" />
          <div class="d-flex gap-4" v-if="surfaceForm.previewImage">
            <VImg :src="surfaceForm.previewImage" width="160" class="elevation-1" />
            <VImg v-if="surfaceForm.maskPath" :src="surfaceForm.maskPath" width="160" class="elevation-1" />
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="surfaceDialog = false">Cancel</VBtn>
          <VBtn color="primary" @click="persistSurface">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.catalog-row {
  border-radius: 8px;
  cursor: pointer;
  padding-block: 8px;
}
.catalog-row--active {
  background: rgba(103, 80, 164, 0.12);
}
.max-w-200 {
  max-width: 200px;
}
</style>
