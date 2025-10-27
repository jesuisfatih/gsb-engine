<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Gang sheet settings",
    embeddedSubtitle: "Control print-ready output, allowed file types, and storage destinations.",
  },
});

const tags = [
  "Product Title",
  "Design Name",
  "Shipping Method",
  "Sku",
  "Actual Height",
  "Variant Width",
  "YYYY",
  "MM",
  "DD",
];

const fileTypes = ["PNG", "WEBP", "JPG", "SVG", "PSD", "AI/EPS", "PDF"];
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>File name format</h2>
      </header>
      <div class="token-input">
        <div class="token">
          Order Name
          <button type="button">×</button>
        </div>
        <div class="token">
          Customer Name
          <button type="button">×</button>
        </div>
        <div class="token">
          Order Id
          <button type="button">×</button>
        </div>
        <div class="token">
          Variant Title
          <button type="button">×</button>
        </div>
        <div class="token">
          Quantity
          <button type="button">×</button>
        </div>
      </div>
      <div class="tag-bank">
        <span class="tag" v-for="tag in tags" :key="tag">{{ tag }}</span>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Print ready file</h2>
      </header>
      <div class="form-grid">
        <VSelect :items="['PNG', 'JPG', 'PDF']" label="File type" placeholder="Select file type" />
        <VSelect :items="['Open with browser', 'Download']" label="Download file" placeholder="Choose action" />
        <VSwitch hide-details inset label="Auto trim (default)" color="primary" />
        <VSwitch hide-details inset label="Print file name (default)" />
        <VSwitch hide-details inset label="Print QR / Logo" />
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Upload product file types</h2>
      </header>
      <div class="file-type-grid">
        <label v-for="type in fileTypes" :key="type" class="file-type">
          <input type="checkbox" checked />
          <span>{{ type }}</span>
        </label>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Cloud storage connectors</h2>
      </header>
      <div class="connector">
        <div class="connector-info">
          <span class="icon">📦</span>
          <div>
            <h3>Dropbox</h3>
            <p>Upload gang sheet files to Dropbox storage.</p>
          </div>
        </div>
        <VSwitch hide-details inset />
      </div>
      <div class="connector">
        <div class="connector-info">
          <span class="icon">☁️</span>
          <div>
            <h3>Google Drive</h3>
            <p>Upload gang sheet files to Google Drive storage.</p>
          </div>
        </div>
        <VSwitch hide-details inset />
      </div>
      <div class="actions">
        <VBtn color="primary">Save</VBtn>
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
  gap: 18px;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.token-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(17, 18, 23, 0.12);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.token {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #111217;
  color: #ffffff;
  border-radius: 999px;
  font-size: 0.85rem;
}

.token button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.tag-bank {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(17, 18, 23, 0.06);
  font-size: 0.82rem;
  color: rgba(17, 18, 23, 0.7);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.file-type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.file-type {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgba(17, 18, 23, 0.12);
  border-radius: 999px;
  font-weight: 600;
}

.connector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.connector-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connector-info h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.connector-info p {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

.icon {
  font-size: 1.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
