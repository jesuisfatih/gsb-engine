<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Builder configuration",
    embeddedSubtitle: "Fine tune uploads, spacing, and tool availability inside the editor.",
  },
});

const supportedTypes = ["PNG", "WEBP", "JPG", "SVG", "PSD", "AI/EPS", "PDF"];
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Artwork uploads</h2>
      </header>
      <div class="toggle-grid">
        <div class="multi-checkbox">
          <p>Supported file types</p>
          <div class="chips">
            <label
              v-for="type in supportedTypes"
              :key="type"
              class="chip"
            >
              <input type="checkbox" checked />
              <span>{{ type }}</span>
            </label>
          </div>
        </div>
        <label class="toggle-item">
          <span>Auto resize image to meet 300 DPI</span>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <span>Enable Canva</span>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <span>Enable Dropbox</span>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <span>Enable background warning</span>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <span>Enable transparent warning</span>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <span>Automatically resize image for single variant</span>
          <VSwitch hide-details inset color="primary" />
        </label>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Spacing</h2>
      </header>
      <div class="spacing-grid">
        <div class="spacing-group">
          <label class="toggle-item">
            <span>Enable image margin as default</span>
            <VSwitch hide-details inset color="primary" />
          </label>
          <label class="toggle-item">
            <span>Lock image margin</span>
            <VSwitch hide-details inset />
          </label>
          <VTextField label="Default image margin size" suffix="in" model-value="0.125" />
        </div>
        <div class="spacing-group">
          <label class="toggle-item">
            <span>Enable artboard margin as default</span>
            <VSwitch hide-details inset color="primary" />
          </label>
          <label class="toggle-item">
            <span>Lock artboard margin</span>
            <VSwitch hide-details inset />
          </label>
          <VTextField label="Default artboard margin size" suffix="in" model-value="0.125" />
        </div>
        <VTextField label="Default auto duplicate margin size" suffix="in" model-value="0.5" />
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Tools</h2>
      </header>
      <div class="toggle-grid">
        <label class="toggle-item">
          <span>Disable background remove</span>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <span>Enable halftone feature</span>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <span>Disable text feature</span>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <span>Use custom text colours</span>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <span>Use custom image overlay colours</span>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <span>Auto build</span>
          <VSwitch hide-details inset color="primary" />
        </label>
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
  gap: 20px;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.toggle-grid {
  display: grid;
  gap: 16px;
}

.multi-checkbox p {
  margin: 0 0 8px;
  font-weight: 600;
  color: #111217;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid rgba(17, 18, 23, 0.12);
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(17, 18, 23, 0.02);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.chip input {
  accent-color: #111217;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
}

.spacing-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.spacing-group {
  display: grid;
  gap: 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
