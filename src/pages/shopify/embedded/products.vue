<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { $api } from "@/utils/api";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Products",
    embeddedSubtitle: "Sync products from Shopify and map them to gang sheet builders.",
  },
});

type ProductSummary = {
  id: string;
  title: string;
  slug: string;
  surfaces?: Array<{ id: string; name: string }>;
};

type BuilderSizeRow = {
  id?: string;
  label: string;
  widthIn: number | null;
  heightIn: number | null;
  price: number | null;
  maxFiles: number | null;
  sortOrder: number;
};

type BuilderConfigForm = {
  sizeOption: string;
  sizeUnit: string;
  productType: string;
  printFileNameTokens: string[];
  useCustomButtonLabel: boolean;
  customButtonLabel: string | null;
  settings: Record<string, unknown>;
  sizes?: BuilderSizeRow[];
};

const products = ref<ProductSummary[]>([]);
const selectedProductId = ref<string | null>(null);
const loadingList = ref(false);
const loadingConfig = ref(false);
const savingConfig = ref(false);

const builderForm = reactive<BuilderConfigForm>({
  sizeOption: "Size",
  sizeUnit: "in",
  productType: "Gang Sheet",
  printFileNameTokens: [],
  useCustomButtonLabel: false,
  customButtonLabel: null,
  settings: {},
});

const sizeRows = ref<BuilderSizeRow[]>([]);

const notification = useNotificationStore();

const selectedProduct = computed(() => products.value.find(p => p.id === selectedProductId.value) ?? null);

const fallbackProducts: ProductSummary[] = [
  {
    id: "sample-product",
    title: "Sample T-Shirt",
    slug: "sample-tshirt",
    surfaces: [
      { id: "tshirt-front", name: "Front" },
      { id: "tshirt-back", name: "Back" },
    ],
  },
];

const fallbackConfig: BuilderConfigForm & { sizes: BuilderSizeRow[] } = {
  sizeOption: "Size",
  sizeUnit: "in",
  productType: "Gang Sheet",
  printFileNameTokens: ["Order Id", "Variant Title"],
  useCustomButtonLabel: false,
  customButtonLabel: null,
  settings: {},
  sizes: [
    {
      id: "sample-size",
      label: '22" x 180"',
      widthIn: 22,
      heightIn: 180,
      price: 15,
      maxFiles: 10,
      sortOrder: 0,
    },
  ],
};

function resetForm() {
  builderForm.sizeOption = "Size";
  builderForm.sizeUnit = "in";
  builderForm.productType = "Gang Sheet";
  builderForm.printFileNameTokens = [];
  builderForm.useCustomButtonLabel = false;
  builderForm.customButtonLabel = null;
  builderForm.settings = {};
  sizeRows.value = [];
}

async function loadProducts() {
  try {
    loadingList.value = true;
    const response = await $api<{ data: ProductSummary[] }>("/merchant/catalog/products");
    products.value = response.data ?? [];
    if (!selectedProductId.value && products.value.length > 0) {
      selectedProductId.value = products.value[0].id;
    }
  }
  catch (error) {
    console.error(error);
    if (!products.value.length) {
      products.value = fallbackProducts;
      selectedProductId.value = products.value[0]?.id ?? null;
      notification.info("Products could not be fetched; showing sample data.");
    } else {
      notification.info("Products could not be refreshed; keeping cached list.");
    }
  }
  finally {
    loadingList.value = false;
  }
}

async function loadBuilderConfig(productId: string) {
  try {
    loadingConfig.value = true;
    const response = await $api<{
      data: {
        product: ProductSummary;
        config: BuilderConfigForm & { sizes: BuilderSizeRow[] };
      };
    }>(`/merchant/config/products/${productId}/builder`);

    const { config } = response.data;
    builderForm.sizeOption = config.sizeOption;
    builderForm.sizeUnit = config.sizeUnit;
    builderForm.productType = config.productType;
    builderForm.printFileNameTokens = [...(config.printFileNameTokens ?? [])];
    builderForm.useCustomButtonLabel = config.useCustomButtonLabel;
    builderForm.customButtonLabel = config.customButtonLabel;
    builderForm.settings = config.settings ?? {};
    sizeRows.value = (config.sizes ?? []).map((row, index) => ({
      id: row.id,
      label: row.label,
      widthIn: row.widthIn ?? null,
      heightIn: row.heightIn ?? null,
      price: row.price ?? null,
      maxFiles: row.maxFiles ?? null,
      sortOrder: row.sortOrder ?? index,
    }));
  }
  catch (error) {
    console.error(error);
    notification.info("Product configuration could not be loaded; using defaults.");
    builderForm.sizeOption = fallbackConfig.sizeOption;
    builderForm.sizeUnit = fallbackConfig.sizeUnit;
    builderForm.productType = fallbackConfig.productType;
    builderForm.printFileNameTokens = [...fallbackConfig.printFileNameTokens];
    builderForm.useCustomButtonLabel = fallbackConfig.useCustomButtonLabel;
    builderForm.customButtonLabel = fallbackConfig.customButtonLabel;
    builderForm.settings = {};
    sizeRows.value = fallbackConfig.sizes.map(row => ({ ...row }));
  }
  finally {
    loadingConfig.value = false;
  }
}

async function saveBuilderConfig() {
  if (!selectedProductId.value)
    return;

  try {
    savingConfig.value = true;
    await $api(`/merchant/config/products/${selectedProductId.value}/builder`, {
      method: "PUT",
      body: {
        ...builderForm,
        sizes: sizeRows.value.map((row, index) => ({
          id: row.id,
          label: row.label,
          widthIn: row.widthIn,
          heightIn: row.heightIn,
          price: row.price,
          maxFiles: row.maxFiles,
          sortOrder: row.sortOrder ?? index,
        })),
      },
    });
    notification.success("Ürün ayarları kaydedildi.");
    await loadBuilderConfig(selectedProductId.value);
  }
  catch (error) {
    console.error(error);
    notification.error("Ürün ayarları kaydedilemedi.");
  }
  finally {
    savingConfig.value = false;
  }
}

function addSizeRow() {
  const nextOrder = sizeRows.value.length > 0 ? Math.max(...sizeRows.value.map(row => row.sortOrder)) + 1 : 0;
  sizeRows.value = [
    ...sizeRows.value,
    {
      label: "New size",
      widthIn: null,
      heightIn: null,
      price: null,
      maxFiles: null,
      sortOrder: nextOrder,
    },
  ];
}

function removeSizeRow(index: number) {
  sizeRows.value = sizeRows.value.filter((_, position) => position !== index);
}

function updateSizeRow(index: number, key: keyof BuilderSizeRow, value: unknown) {
  const current = sizeRows.value[index];
  if (!current)
    return;
  sizeRows.value = sizeRows.value.map((row, position) =>
    position === index ? { ...row, [key]: value } : row,
  );
}

watch(selectedProductId, async (next) => {
  if (!next)
    return;
  await loadBuilderConfig(next);
});

onMounted(async () => {
  await loadProducts();
  if (selectedProductId.value)
    await loadBuilderConfig(selectedProductId.value);
});
</script>

<template>
  <div class="products-layout">
    <section class="card list-card">
      <header class="card-header list-header">
        <div>
          <h2>Products</h2>
          <p>Assign builders or image-to-sheet workflows to your Shopify products.</p>
        </div>
        <div class="header-actions">
          <VBtn prepend-icon="tabler-refresh" variant="text" :loading="loadingList" @click="loadProducts">
            Refresh
          </VBtn>
          <VBtn prepend-icon="tabler-database-import" color="primary">Import products</VBtn>
        </div>
      </header>

      <div class="table-tabs">
        <button class="tab is-active" type="button">Builders</button>
        <button class="tab" type="button" disabled>Image to Sheet</button>
      </div>

      <table class="data-table product-table">
        <thead>
          <tr>
            <th />
            <th>Product name</th>
            <th>Surfaces</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in products"
            :key="product.id"
            :class="{ 'is-selected': product.id === selectedProductId }"
            @click="selectedProductId = product.id"
          >
            <td>
              <VCheckbox hide-details density="compact" :model-value="product.id === selectedProductId" />
            </td>
            <td>
              <span class="product-name">{{ product.title }}</span>
              <span class="product-slug">{{ product.slug }}</span>
            </td>
            <td>
              <VChip
                v-for="surface in product.surfaces || []"
                :key="surface.id"
                size="small"
                class="surface-chip"
              >
                {{ surface.name }}
              </VChip>
              <span v-if="!product.surfaces?.length" class="placeholder">Not mapped</span>
            </td>
            <td class="actions">
              <VBtn icon="tabler-link" variant="text" size="small" />
              <VBtn icon="tabler-pencil" variant="text" size="small" />
              <VBtn icon="tabler-dots" variant="text" size="small" />
            </td>
          </tr>
          <tr v-if="!products.length && !loadingList">
            <td colspan="4" class="empty-state">No products found.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="selectedProduct" class="card detail-card">
      <header class="detail-header">
        <div>
          <p class="detail-subheading">Custom Printing · Gang Sheet</p>
          <h2 class="detail-title">{{ selectedProduct.title }}</h2>
        </div>
        <div class="detail-actions">
          <VBtn
            color="primary"
            prepend-icon="tabler-device-floppy"
            :loading="savingConfig"
            @click="saveBuilderConfig"
          >
            Save changes
          </VBtn>
        </div>
      </header>

      <VProgressLinear v-if="loadingConfig" indeterminate color="primary" />

      <div class="form-ribbon">
        <VSelect label="Size option" :items="['Size', 'Length', 'Area']" v-model="builderForm.sizeOption" />
        <VSelect label="Size unit" :items="['in', 'cm', 'mm']" v-model="builderForm.sizeUnit" />
        <VSelect label="Product type" :items="['Gang Sheet', 'DTF Roll']" v-model="builderForm.productType" />
        <VSwitch hide-details inset label="Use custom button label" v-model="builderForm.useCustomButtonLabel" />
        <VTextField
          label="Custom button label"
          placeholder="Start building"
          :disabled="!builderForm.useCustomButtonLabel"
          v-model="builderForm.customButtonLabel"
        />
      </div>

      <div class="tab-bar">
        <button class="tab is-active" type="button">Sizes & Prices</button>
        <button class="tab" type="button" disabled>Settings</button>
      </div>

      <div class="tab-panel">
        <header class="size-panel-header">
          <span>Sizes</span>
          <VBtn prepend-icon="tabler-plus" variant="text" @click="addSizeRow">Add size</VBtn>
        </header>
        <table class="size-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Width (in)</th>
              <th>Height (in)</th>
              <th>Price</th>
              <th>Max files</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in sizeRows" :key="row.id ?? index">
              <td>
                <VTextField density="compact" hide-details v-model="row.label" />
              </td>
              <td>
                <VTextField
                  density="compact"
                  type="number"
                  suffix="in"
                  hide-details
                  :model-value="row.widthIn"
                  @update:model-value="updateSizeRow(index, 'widthIn', $event ? Number($event) : null)"
                />
              </td>
              <td>
                <VTextField
                  density="compact"
                  type="number"
                  suffix="in"
                  hide-details
                  :model-value="row.heightIn"
                  @update:model-value="updateSizeRow(index, 'heightIn', $event ? Number($event) : null)"
                />
              </td>
              <td>
                <VTextField
                  density="compact"
                  prefix="$"
                  hide-details
                  :model-value="row.price"
                  @update:model-value="updateSizeRow(index, 'price', $event ? Number($event) : null)"
                />
              </td>
              <td>
                <VTextField
                  density="compact"
                  hide-details
                  type="number"
                  :model-value="row.maxFiles"
                  @update:model-value="updateSizeRow(index, 'maxFiles', $event ? Number($event) : null)"
                />
              </td>
              <td class="row-actions">
                <VBtn icon="tabler-trash" variant="text" size="small" @click="removeSizeRow(index)" />
              </td>
            </tr>
            <tr v-if="!sizeRows.length">
              <td colspan="6" class="empty-state">No size presets configured.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="card detail-card empty-detail">
      <div class="empty-content">
        <h3>Select a product</h3>
        <p>Choose a product on the left to manage its builder configuration.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.products-layout {
  display: grid;
  grid-template-columns: minmax(520px, 0.75fr) minmax(420px, 0.6fr);
  gap: 28px;
  align-items: flex-start;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: grid;
  gap: 20px;
}

.list-card {
  padding: 0;
}

.list-header {
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.list-header h2 {
  margin: 0;
  font-weight: 600;
}

.list-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.6);
}

.header-actions {
  display: inline-flex;
  gap: 12px;
}

.table-tabs {
  display: inline-flex;
  background: rgba(17, 18, 23, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  margin-inline: 24px;
}

.tab {
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.6);
  cursor: pointer;
}

.tab.is-active {
  background: #111217;
  color: #ffffff;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.product-table thead {
  background: rgba(17, 18, 23, 0.04);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  color: rgba(17, 18, 23, 0.6);
}

.product-table th,
.product-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(17, 18, 23, 0.06);
}

.product-table tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.product-table tbody tr.is-selected {
  background: rgba(64, 122, 252, 0.08);
}

.product-name {
  font-weight: 600;
  color: #111217;
}

.product-slug {
  display: block;
  font-size: 0.8rem;
  color: rgba(17, 18, 23, 0.55);
}

.surface-chip {
  margin-right: 4px;
  margin-bottom: 4px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: rgba(17, 18, 23, 0.55);
}

.placeholder {
  color: rgba(17, 18, 23, 0.4);
}

.detail-card {
  position: sticky;
  top: 24px;
  gap: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.detail-subheading {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(17, 18, 23, 0.55);
  font-weight: 600;
}

.detail-title {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.detail-actions {
  display: inline-flex;
  gap: 12px;
}

.form-ribbon {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.tab-bar {
  display: inline-flex;
  gap: 8px;
  background: rgba(17, 18, 23, 0.06);
  padding: 4px;
  border-radius: 12px;
}

.tab-panel {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 18px;
  background: rgba(17, 18, 23, 0.02);
}

.size-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
}

.size-table {
  width: 100%;
  border-collapse: collapse;
}

.size-table thead {
  background: rgba(17, 18, 23, 0.04);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  color: rgba(17, 18, 23, 0.6);
}

.size-table th,
.size-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(17, 18, 23, 0.06);
}

.size-table tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.row-actions {
  display: inline-flex;
  gap: 4px;
  justify-content: flex-end;
}

.empty-detail {
  place-items: center;
  min-height: 320px;
}

.empty-content {
  text-align: center;
  color: rgba(17, 18, 23, 0.6);
  display: grid;
  gap: 8px;
}

@media (max-width: 1280px) {
  .products-layout {
    grid-template-columns: 1fr;
  }

  .detail-card {
    position: static;
  }
}
</style>
