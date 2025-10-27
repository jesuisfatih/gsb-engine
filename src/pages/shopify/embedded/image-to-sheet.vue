<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { $api } from "@/utils/api";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Image to Sheet",
    embeddedSubtitle: "Default artboard sizes, pricing mode, and weight calculations for image uploads.",
  },
});

const pricingModes = ["area", "width", "fixed"] as const;
const pricingModeLabels: Record<string, string> = {
  area: "By image square area",
  width: "By width",
  fixed: "Fixed price",
};
const units = ["in", "cm", "mm"];
const pricingSides = ["Width", "Height"];

type SizePreset = {
  id?: string;
  label: string;
  widthIn: number | null;
  heightIn: number | null;
  price: number | null;
  sortOrder: number;
};

type ImageToSheetForm = {
  printerWidth: number | null;
  useVariantWidths: boolean;
  maxHeight: number | null;
  imageMargin: number | null;
  artboardMargin: number | null;
  unit: string;
  enableAllLocations: boolean;
  disableDownloadValidation: boolean;
  password: string | null;
  pricingMode: string;
  pricePerUnit: number | null;
  pricingSide: string;
  shippingWeightRate: number | null;
};

const form = reactive<ImageToSheetForm>({
  printerWidth: null,
  useVariantWidths: false,
  maxHeight: null,
  imageMargin: 0.01,
  artboardMargin: 0.01,
  unit: "in",
  enableAllLocations: true,
  disableDownloadValidation: false,
  password: null,
  pricingMode: "area",
  pricePerUnit: 0.01,
  pricingSide: "Width",
  shippingWeightRate: 0,
});

const sizeRows = ref<SizePreset[]>([]);

const loading = ref(false);
const saving = ref(false);

const notification = useNotificationStore();

function updateSizeRow(index: number, key: keyof SizePreset, value: unknown) {
  const current = sizeRows.value[index];
  if (!current)
    return;

  sizeRows.value = sizeRows.value.map((row, position) =>
    position === index
      ? {
          ...row,
          [key]: value === "" ? null : typeof value === "number" ? value : Number(value),
        }
      : row,
  );
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
      sortOrder: nextOrder,
    },
  ];
}

function removeSizeRow(index: number) {
  sizeRows.value = sizeRows.value.filter((_, position) => position !== index);
}

async function loadSettings() {
  try {
    loading.value = true;
    const response = await $api<{
      data: ImageToSheetForm & { sizes?: SizePreset[] };
    }>("/merchant/config/image-to-sheet");

    const data = response.data;
    form.printerWidth = data.printerWidth ?? null;
    form.useVariantWidths = data.useVariantWidths ?? false;
    form.maxHeight = data.maxHeight ?? null;
    form.imageMargin = data.imageMargin ?? null;
    form.artboardMargin = data.artboardMargin ?? null;
    form.unit = data.unit ?? "in";
    form.enableAllLocations = data.enableAllLocations ?? true;
    form.disableDownloadValidation = data.disableDownloadValidation ?? false;
    form.password = data.password ?? null;
    form.pricingMode = data.pricingMode ?? "area";
    form.pricePerUnit = data.pricePerUnit ?? null;
    form.pricingSide = data.pricingSide ?? "Width";
    form.shippingWeightRate = data.shippingWeightRate ?? null;

    sizeRows.value = (data.sizes ?? []).map((row, index) => ({
      id: row.id,
      label: row.label,
      widthIn: row.widthIn ?? null,
      heightIn: row.heightIn ?? null,
      price: row.price ?? null,
      sortOrder: row.sortOrder ?? index,
    }));
  }
  catch (error) {
    console.error(error);
    notification.error("Image to Sheet settings could not be loaded.");
  }
  finally {
    loading.value = false;
  }
}

async function saveSettings() {
  try {
    saving.value = true;
    await $api("/merchant/config/image-to-sheet", {
      method: "PUT",
      body: {
        ...form,
        sizes: sizeRows.value.map((row, index) => ({
          id: row.id,
          label: row.label,
          widthIn: row.widthIn,
          heightIn: row.heightIn,
          price: row.price,
          sortOrder: row.sortOrder ?? index,
        })),
      },
    });
    notification.success("Image to Sheet settings saved.");
    await loadSettings();
  }
  catch (error) {
    console.error(error);
    notification.error("Image to Sheet settings could not be saved.");
  }
  finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Artboard settings</h2>
        <VBtn color="primary" prepend-icon="tabler-device-floppy" :loading="saving" @click="saveSettings">
          Save settings
        </VBtn>
      </header>

      <VProgressLinear v-if="loading" indeterminate color="primary" />

      <div class="form-grid">
        <VTextField
          label="Printer width (default)"
          suffix="in"
          type="number"
          :model-value="form.printerWidth"
          @update:model-value="form.printerWidth = $event === '' ? null : Number($event)"
        />
        <VSwitch
          hide-details
          inset
          label="Use different printer widths by product type"
          v-model="form.useVariantWidths"
        />
        <VTextField
          label="Max height"
          suffix="in"
          type="number"
          :model-value="form.maxHeight"
          @update:model-value="form.maxHeight = $event === '' ? null : Number($event)"
        />
        <VTextField
          label="Image margin"
          suffix="in"
          type="number"
          :model-value="form.imageMargin"
          @update:model-value="form.imageMargin = $event === '' ? null : Number($event)"
        />
        <VTextField
          label="Artboard margin"
          suffix="in"
          type="number"
          :model-value="form.artboardMargin"
          @update:model-value="form.artboardMargin = $event === '' ? null : Number($event)"
        />
        <VSelect :items="units" label="Unit" v-model="form.unit" />
        <VSwitch hide-details inset label="Enable all locations for variant availability" v-model="form.enableAllLocations" />
        <VSwitch hide-details inset label="Disable download link validation" v-model="form.disableDownloadValidation" />
        <VTextField label="Password" type="password" placeholder="Optional password" v-model="form.password" />
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Default product sizes & prices</h2>
      </header>
      <div class="pricing-grid">
        <VSelect
          :items="pricingModes"
          :item-title="mode => pricingModeLabels[mode]"
          label="Pricing mode"
          v-model="form.pricingMode"
        />
        <VTextField
          label="Price / in²"
          prefix="$"
          type="number"
          :model-value="form.pricePerUnit"
          @update:model-value="form.pricePerUnit = $event === '' ? null : Number($event)"
        />
        <VSelect :items="pricingSides" label="Side" v-model="form.pricingSide" />
        <VTextField
          label="Shipping weight rate"
          suffix="pounds/in²"
          type="number"
          :model-value="form.shippingWeightRate"
          @update:model-value="form.shippingWeightRate = $event === '' ? null : Number($event)"
        />
      </div>
      <div class="size-table">
        <header>
          <span>Sizes</span>
          <VBtn prepend-icon="tabler-plus" variant="text" @click="addSizeRow">Add size</VBtn>
        </header>
        <div v-for="(row, index) in sizeRows" :key="row.id ?? index" class="size-row">
          <VTextField label="Title" v-model="row.label" />
          <VTextField
            label="Width"
            suffix="in"
            type="number"
            :model-value="row.widthIn"
            @update:model-value="updateSizeRow(index, 'widthIn', $event === '' ? null : Number($event))"
          />
          <VTextField
            label="Height"
            suffix="in"
            type="number"
            :model-value="row.heightIn"
            @update:model-value="updateSizeRow(index, 'heightIn', $event === '' ? null : Number($event))"
          />
          <VTextField
            label="Price"
            prefix="$"
            type="number"
            :model-value="row.price"
            @update:model-value="updateSizeRow(index, 'price', $event === '' ? null : Number($event))"
          />
          <VBtn icon="tabler-trash" variant="text" @click="removeSizeRow(index)" />
        </div>
        <p v-if="!sizeRows.length" class="empty-state">No size presets configured.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.pricing-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.size-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  padding: 16px;
  background: rgba(17, 18, 23, 0.02);
}

.size-table header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.size-row {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) auto;
  align-items: center;
}

.empty-state {
  text-align: center;
  color: rgba(17, 18, 23, 0.55);
}
</style>
