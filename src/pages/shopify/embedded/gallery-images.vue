<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Gallery images",
    embeddedSubtitle: "Manage curated imagery, sorting rules, and watermark overlays for the editor gallery.",
  },
});

const builderToggles = [
  { label: "Show image gallery", enabled: true },
  { label: "Enable sort", enabled: false },
  { label: "Enable color overlay", enabled: false },
];

const gallery = Array.from({ length: 8 }).map((_, index) => ({
  name: `Gallery asset ${index + 1}`,
  size: `${(1.4 + index * 0.2).toFixed(1)} MB`,
}));
</script>

<template>
  <div class="gallery-page">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Builder settings</h2>
          <p>This section allows you to customise the appearance of the image gallery inside the builder.</p>
        </div>
        <VBtn variant="outlined" prepend-icon="tabler-arrows-sort">Sync with Shopify collections</VBtn>
      </header>

      <div class="toggle-stack">
        <label v-for="toggle in builderToggles" :key="toggle.label" class="toggle-row">
          <span>{{ toggle.label }}</span>
          <VSwitch hide-details inset :model-value="toggle.enabled" :color="toggle.enabled ? 'primary' : undefined" />
        </label>
        <div class="select-row">
          <span>Category view mode</span>
          <VSelect
            hide-details
            density="comfortable"
            :items="['Dropdown', 'Tabs', 'Collapsible']"
            model-value="Dropdown"
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
        <VSwitch hide-details inset label="Use shop logo as watermark" />
      </header>

      <div class="watermark-grid">
        <div class="slider-col">
          <VTextField label="Watermark opacity" suffix="" density="comfortable" model-value="0.4" />
          <VSlider :model-value="40" color="primary" />
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

      <div class="gallery-grid">
        <article v-for="item in gallery" :key="item.name" class="gallery-card">
          <div class="thumbnail">IMG</div>
          <div class="meta">
            <p class="title">{{ item.name }}</p>
            <span class="size">{{ item.size }}</span>
          </div>
          <div class="actions">
            <VBtn icon="tabler-eye" variant="text" />
            <VBtn icon="tabler-trash" variant="text" />
          </div>
        </article>
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

@media (max-width: 1080px) {
  .watermark-grid {
    grid-template-columns: 1fr;
  }
}
</style>
