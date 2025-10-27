<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Builder",
    embeddedSubtitle: "Control editor tooling, automation rules, and resolution quality gates.",
  },
});

const toolToggles = [
  { label: "Disable background remove", enabled: false },
  { label: "Enable halftone feature", enabled: false },
  { label: "Disable text feature", enabled: false },
  { label: "Use custom text colors", enabled: false },
  { label: "Use custom image overlay colors", enabled: false },
  { label: "Auto build", enabled: true },
  { label: "Open auto build as default", enabled: true },
  { label: "Always display variants in Auto Build", enabled: false },
  { label: "Enable flipping over image/text", enabled: true },
  { label: "Show gang sheet price", enabled: false },
  { label: "Enable folder organisation for uploaded images", enabled: false },
  { label: "Enable notes per sheet", enabled: false },
  {
    label: "Require confirmation for background removal before adding to cart",
    enabled: false,
  },
];

const resolutionLevels = [
  { label: "Optimal resolution", color: "#32c759", value: 300 },
  { label: "Good resolution", color: "#f4b400", value: 250 },
  { label: "Bad resolution", color: "#eb4435", value: 200 },
];
</script>

<template>
  <div class="builder-page">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Spacing & duplication</h2>
          <p>Control the default margins applied when customers place assets on the gang sheet.</p>
        </div>
        <VBtn variant="outlined" prepend-icon="tabler-restore">Reset defaults</VBtn>
      </header>

      <div class="grid">
        <VTextField label="Default auto duplicate margin size" suffix="in" model-value="0.5" />
        <VTextField label="Default artboard margin size" suffix="in" model-value="0.125" />
        <VTextField label="Default image margin size" suffix="in" model-value="0.125" />
      </div>
    </section>

    <section class="card">
      <header class="card-header compact">
        <h2>Tools</h2>
        <VSelect
          label="Auto build set up"
          density="comfortable"
          :items="['Recommended', 'Compact', 'Tight packing']"
          model-value="Recommended"
        />
      </header>

      <div class="tool-grid">
        <label v-for="toggle in toolToggles" :key="toggle.label" class="toggle-row">
          <div class="toggle-text">
            <span>{{ toggle.label }}</span>
            <small v-if="toggle.label === 'Auto build'">
              Automatically arrange uploads using MaxRects and retain bleed offsets.
            </small>
            <small v-else-if="toggle.label.includes('background removal')">
              When enabled, customers can request a manual check before the design is added to cart.
            </small>
          </div>
          <VSwitch hide-details inset :model-value="toggle.enabled" :color="toggle.enabled ? 'primary' : undefined" />
        </label>
      </div>
    </section>

    <section class="card resolution-card">
      <header class="card-header">
        <div>
          <h2>Resolution levels</h2>
          <p>Configure DPI thresholds to warn customers about blurry artwork.</p>
        </div>
        <VBtn variant="text" prepend-icon="tabler-info-circle">How resolution checks work</VBtn>
      </header>

      <div class="resolution-columns">
        <div class="resolution-levels">
          <div v-for="level in resolutionLevels" :key="level.label" class="resolution-row">
            <span class="dot" :style="{ background: level.color }" />
            <span class="label">{{ level.label }}</span>
            <VTextField
              density="compact"
              type="number"
              suffix="dpi"
              hide-details
              :model-value="level.value"
            />
          </div>
          <label class="checkbox-row">
            <VCheckbox density="compact" hide-details />
            Hide terrible resolution indicator
          </label>
          <label class="toggle-row">
            <div class="toggle-text">
              <span>Disallow lower resolution</span>
              <small>Prevent uploads that fall below minimum DPI.</small>
            </div>
            <VSwitch hide-details inset />
          </label>
          <VTextField label="Minimum resolution" suffix="dpi" density="compact" model-value="72" />
        </div>

        <div class="other-options">
          <h3>Other options</h3>
          <label class="toggle-row">
            <div class="toggle-text">
              <span>Allow reorder</span>
              <small>Enable customers to create copy orders from previous designs.</small>
            </div>
            <VSwitch hide-details inset color="primary" />
          </label>
          <label class="toggle-row">
            <div class="toggle-text">
              <span>Enable customer account</span>
              <small>Permit guests to save designs to their account.</small>
            </div>
            <VSwitch hide-details inset color="primary" />
          </label>
          <VSelect
            density="comfortable"
            label="Default language"
            :items="['English', 'Deutsch', 'Türkçe']"
            model-value="English"
          />
          <label class="toggle-row">
            <div class="toggle-text">
              <span>Enable live chat</span>
              <small>Provide support while shoppers design in the editor.</small>
            </div>
            <VSwitch hide-details inset />
          </label>
          <label class="toggle-row">
            <div class="toggle-text">
              <span>Use store logo instead of spinner while loading the builder</span>
            </div>
            <VSwitch hide-details inset />
          </label>
          <label class="toggle-row">
            <div class="toggle-text">
              <span>Require customer login before using builder</span>
              <small>Force authentication before accessing the embedded editor.</small>
            </div>
            <VSwitch hide-details inset />
          </label>
        </div>
      </div>

      <footer class="card-actions">
        <VBtn color="primary" prepend-icon="tabler-device-floppy">Save changes</VBtn>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.builder-page {
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
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.card-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.card-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.6);
}

.card-header.compact {
  align-items: center;
}

.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.tool-grid {
  display: grid;
  gap: 14px;
}

.toggle-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-weight: 600;
  color: #111217;
  max-width: 520px;
}

.toggle-text small {
  font-weight: 400;
  color: rgba(17, 18, 23, 0.6);
}

.resolution-card {
  gap: 28px;
}

.resolution-columns {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(320px, 0.7fr) minmax(280px, 0.5fr);
}

.resolution-levels {
  display: grid;
  gap: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  padding: 18px;
  background: rgba(17, 18, 23, 0.02);
}

.resolution-row {
  display: grid;
  grid-template-columns: 20px 1fr 140px;
  gap: 14px;
  align-items: center;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.label {
  font-weight: 600;
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.other-options {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  padding: 18px;
  display: grid;
  gap: 16px;
  background: rgba(17, 18, 23, 0.02);
}

.other-options h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1180px) {
  .resolution-columns {
    grid-template-columns: 1fr;
  }
}
</style>
