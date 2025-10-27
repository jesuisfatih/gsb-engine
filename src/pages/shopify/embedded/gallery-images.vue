<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Gallery images",
    embeddedSubtitle: "Maintain reusable background and texture images for customers.",
  },
});

const gallery = Array.from({ length: 9 }).map((_, index) => ({
  name: `Gallery asset ${index + 1}`,
  size: `${(1.2 + index * 0.1).toFixed(1)} MB`,
}));
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Gallery assets</h2>
          <p>Upload background images or textures for customers to use in the builder.</p>
        </div>
        <div class="toolbar">
          <VBtn prepend-icon="tabler-folder-plus" variant="text">Create folder</VBtn>
          <VBtn prepend-icon="tabler-upload" color="primary">Upload images</VBtn>
        </div>
      </header>

      <div class="gallery-grid">
        <div v-for="item in gallery" :key="item.name" class="gallery-item">
          <div class="preview">IMG</div>
          <div class="meta">
            <p class="title">{{ item.name }}</p>
            <span class="size">{{ item.size }}</span>
          </div>
          <div class="actions">
            <VBtn icon="tabler-eye" variant="text" />
            <VBtn icon="tabler-trash" variant="text" />
          </div>
        </div>
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
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.card-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.65);
}

.toolbar {
  display: flex;
  gap: 12px;
}

.gallery-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.gallery-item {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  background: rgba(17, 18, 23, 0.02);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.preview {
  background: linear-gradient(135deg, rgba(64, 122, 252, 0.2), rgba(64, 122, 252, 0.05));
  border-radius: 12px;
  height: 120px;
  display: grid;
  place-items: center;
  color: #407afc;
  font-weight: 700;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.size {
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>
