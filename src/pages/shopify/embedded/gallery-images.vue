<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { $api } from "@/utils/api";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Gallery images",
    embeddedSubtitle: "Manage curated imagery, sorting rules, and watermark overlays for the editor gallery.",
  },
});

type BuilderOptions = {
  showImageGallery: boolean;
  enableSort: boolean;
  enableColorOverlay: boolean;
  categoryViewMode: string;
};

type WatermarkSettings = {
  useShopLogo: boolean;
  opacity: number;
};

type GalleryAsset = {
  id: string;
  label: string | null;
  url: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

const notification = useNotificationStore();

const builderOptions = reactive<BuilderOptions>({
  showImageGallery: true,
  enableSort: false,
  enableColorOverlay: false,
  categoryViewMode: "Dropdown",
});

const watermark = reactive<WatermarkSettings>({
  useShopLogo: false,
  opacity: 0.4,
});

const assets = ref<GalleryAsset[]>([]);

const loadingSettings = ref(false);
const savingSettings = ref(false);
const loadingAssets = ref(false);

const watermarkOpacityPercent = computed({
  get: () => Math.round(watermark.opacity * 100),
  set: (value: number | null | undefined) => {
    const safe = Math.min(Math.max(value ?? 0, 0), 100);
    watermark.opacity = safe / 100;
  },
});

function handleOpacityInput(value: unknown) {
  const numeric = Number(value);
  if (Number.isNaN(numeric))
    return;
  watermark.opacity = Math.min(Math.max(numeric, 0), 1);
}

async function loadGallerySettings() {
  try {
    loadingSettings.value = true;
    const response = await $api<{
      data: {
        builder: BuilderOptions;
        watermark: WatermarkSettings;
      };
    }>("/merchant/config/gallery/settings");

    const { builder, watermark: wm } = response.data;
    builderOptions.showImageGallery = builder.showImageGallery;
    builderOptions.enableSort = builder.enableSort;
    builderOptions.enableColorOverlay = builder.enableColorOverlay;
    builderOptions.categoryViewMode = builder.categoryViewMode;
    watermark.useShopLogo = wm.useShopLogo;
    watermark.opacity = wm.opacity ?? 0.4;
  }
  catch (error) {
    console.error(error);
    notification.error("Gallery settings could not be loaded.");
  }
  finally {
    loadingSettings.value = false;
  }
}

async function saveGallerySettings() {
  try {
    savingSettings.value = true;
    await $api("/merchant/config/gallery/settings", {
      method: "PUT",
      body: {
        builder: builderOptions,
        watermark,
      },
    });
    notification.success("Gallery settings saved.");
  }
  catch (error) {
    console.error(error);
    notification.error("Gallery settings could not be saved.");
  }
  finally {
    savingSettings.value = false;
  }
}

async function loadAssets() {
  try {
    loadingAssets.value = true;
    const response = await $api<{ data: GalleryAsset[] }>("/merchant/config/gallery/assets");
    assets.value = response.data ?? [];
  }
  catch (error) {
    console.error(error);
    notification.error("Gallery assets could not be loaded.");
  }
  finally {
    loadingAssets.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadGallerySettings(), loadAssets()]);
});
</script>

<template>
  <div class="gallery-page">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Builder settings</h2>
          <p>This section allows you to customise the appearance of the image gallery inside the builder.</p>
        </div>
        <div class="header-actions">
          <VBtn
            color="primary"
            prepend-icon="tabler-device-floppy"
            :loading="savingSettings"
            @click="saveGallerySettings"
          >
            Save settings
          </VBtn>
        </div>
      </header>

      <VProgressLinear v-if="loadingSettings" indeterminate color="primary" />

      <div class="toggle-stack">
        <label class="toggle-row">
          <span>Show image gallery</span>
          <VSwitch hide-details inset color="primary" v-model="builderOptions.showImageGallery" />
        </label>
        <label class="toggle-row">
          <span>Enable sort</span>
          <VSwitch hide-details inset color="primary" v-model="builderOptions.enableSort" />
        </label>
        <label class="toggle-row">
          <span>Enable color overlay</span>
          <VSwitch hide-details inset color="primary" v-model="builderOptions.enableColorOverlay" />
        </label>
        <div class="select-row">
          <span>Category view mode</span>
          <VSelect
            hide-details
            density="comfortable"
            :items="['Dropdown', 'Tabs', 'Collapsible']"
            v-model="builderOptions.categoryViewMode"
          />
        </div>
      </div>
    </section>

    <section class="card watermark-card">
      <header class="card-header">
        <div>
          <h2>Watermark setting</h2>
          <p>Apply a watermark overlay on customer previews to protect your assets.</p>
        </div>
        <VSwitch hide-details inset label="Use shop logo as watermark" v-model="watermark.useShopLogo" />
      </header>

      <div class="watermark-grid">
        <div class="slider-col">
          <VTextField
            label="Watermark opacity"
            density="comfortable"
            suffix=""
            type="number"
            :model-value="watermark.opacity.toFixed(2)"
            @update:model-value="handleOpacityInput($event)"
          />
          <VSlider color="primary" :model-value="watermarkOpacityPercent" @update:model-value="watermarkOpacityPercent = $event ?? 0" />
          <VBtn variant="outlined" prepend-icon="tabler-eye">Preview watermark</VBtn>
        </div>
        <div class="preview-col">
          <div class="preview-banner">
            <span>Gang Sheet</span>
          </div>
        </div>
      </div>

      <footer class="card-actions">
        <VBtn color="primary">Apply</VBtn>
      </footer>
    </section>

    <section class="card">
      <header class="card-header">
        <div>
          <h2>Image library</h2>
          <p>Organise reusable backgrounds, textures, and clipart for your customers.</p>
        </div>
        <div class="toolbar">
          <VBtn prepend-icon="tabler-folder-plus" variant="text">Create folder</VBtn>
          <VBtn prepend-icon="tabler-upload" color="primary">Upload images</VBtn>
        </div>
      </header>

      <VProgressLinear v-if="loadingAssets" indeterminate color="primary" />

      <div class="gallery-grid">
        <article v-for="item in assets" :key="item.id" class="gallery-card">
          <div class="thumbnail">
            <img v-if="item.url" :src="item.url" alt="" />
            <span v-else>IMG</span>
          </div>
          <div class="meta">
            <p class="title">{{ item.label ?? "Untitled asset" }}</p>
            <span class="size">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="actions">
            <VBtn icon="tabler-eye" variant="text" :href="item.url" target="_blank" />
            <VBtn icon="tabler-trash" variant="text" disabled />
          </div>
        </article>
        <p v-if="!assets.length && !loadingAssets" class="empty-assets">No assets uploaded yet.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gallery-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: grid;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.card-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.6);
}

.header-actions {
  display: inline-flex;
  gap: 12px;
}

.toggle-stack {
  display: grid;
  gap: 14px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
  font-weight: 600;
}

.select-row {
  display: grid;
  gap: 8px;
  align-items: center;
  grid-template-columns: 1fr minmax(200px, 0.4fr);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
  font-weight: 600;
}

.watermark-card {
  gap: 24px;
}

.watermark-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(200px, 0.35fr) minmax(280px, 0.65fr);
}

.slider-col {
  display: grid;
  gap: 12px;
}

.preview-col {
  display: grid;
  place-items: center;
}

.preview-banner {
  width: 100%;
  min-height: 120px;
  border-radius: 16px;
  background: linear-gradient(135deg, #d9b3ff 0%, #79a8ff 100%);
  color: rgba(255, 255, 255, 0.85);
  font-weight: 700;
  font-size: 1.4rem;
  display: grid;
  place-items: center;
  text-transform: uppercase;
  overflow: hidden;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.toolbar {
  display: inline-flex;
  gap: 12px;
}

.gallery-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.gallery-card {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  padding: 16px;
  background: rgba(17, 18, 23, 0.02);
  display: grid;
  gap: 12px;
}

.thumbnail {
  height: 120px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(64, 122, 252, 0.2), rgba(125, 90, 241, 0.1));
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #407afc;
  overflow: hidden;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  margin: 0;
  font-weight: 600;
}

.size {
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
}

.actions {
  display: inline-flex;
  gap: 4px;
  justify-content: flex-end;
}

.empty-assets {
  grid-column: 1/-1;
  text-align: center;
  color: rgba(17, 18, 23, 0.55);
  padding: 16px 0;
}

@media (max-width: 1080px) {
  .watermark-grid {
    grid-template-columns: 1fr;
  }
}
</style>
