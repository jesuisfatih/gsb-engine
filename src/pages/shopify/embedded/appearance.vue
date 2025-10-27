<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Appearance",
    embeddedSubtitle: "Adjust welcome popup content, layout view, and colour theme.",
  },
});

const themePresets = [
  ["#ffffff", "#ffffff", "#0f172a", "#333333"],
  ["#f8fafc", "#101828", "#3371f2", "#101828"],
  ["#ffffff", "#ffffff", "#6366f1", "#1e1e1e"],
  ["#09090b", "#111827", "#a855f7", "#e5e7eb"],
];
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Welcome popup settings</h2>
        <VSwitch hide-details inset label="Show welcome popup" color="primary" />
      </header>
      <VTextarea
        label="Welcome message"
        rows="4"
        placeholder="Welcome to our store! We are glad to have you here..."
      />
      <div class="view-mode">
        <label>
          <input type="radio" name="view" checked />
          <span>List view</span>
        </label>
        <label>
          <input type="radio" name="view" />
          <span>Gallery view</span>
        </label>
      </div>
      <div class="toggle-grid">
        <label class="toggle-item">
          <span>Start a brand new gang sheet</span>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <span>Open previously ordered gang sheet</span>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <span>Auto build</span>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <span>Open working gang sheet</span>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <span>Name and number</span>
          <VSwitch hide-details inset />
        </label>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Theme colours</h2>
      </header>
      <div class="color-grid">
        <VTextField label="Main background color" type="color" model-value="#ffffff" />
        <VTextField label="Sidebar background color" type="color" model-value="#ffffff" />
        <VTextField label="Top bar background color" type="color" model-value="#ffffff" />
        <VTextField label="Primary color" type="color" model-value="#0f172a" />
        <VTextField label="Secondary color" type="color" model-value="#019aff" />
        <VTextField label="Text color" type="color" model-value="#333333" />
      </div>

      <div class="presets">
        <h3>Presets</h3>
        <div class="preset-grid">
          <button
            v-for="(preset, index) in themePresets"
            :key="index"
            class="preset"
            type="button"
          >
            <span v-for="color in preset" :key="color" :style="{ background: color }" />
          </button>
        </div>
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

.view-mode {
  display: inline-flex;
  gap: 12px;
  background: rgba(17, 18, 23, 0.06);
  padding: 6px;
  border-radius: 10px;
}

.view-mode label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
}

.view-mode input[type="radio"] {
  accent-color: #111217;
}

.toggle-grid {
  display: grid;
  gap: 12px;
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

.color-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.presets {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.presets h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.preset-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preset {
  border: 1px solid rgba(17, 18, 23, 0.12);
  background: rgba(17, 18, 23, 0.02);
  padding: 4px;
  border-radius: 999px;
  display: inline-flex;
  gap: 4px;
  cursor: pointer;
}

.preset span {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(17, 18, 23, 0.08);
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
