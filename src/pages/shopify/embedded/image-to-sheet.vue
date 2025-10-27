<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Image to Sheet",
    embeddedSubtitle: "Default artboard sizes, pricing mode, and weight calculations for image uploads.",
  },
});

const pricingModes = ["By image square area", "By width", "Fixed price"];
const units = ["in", "cm", "mm"];
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Artboard settings</h2>
      </header>
      <div class="form-grid">
        <VTextField label="Printer width (default)" suffix="in" model-value="22" />
        <VSwitch hide-details inset label="Use different printer widths by product type" />
        <VTextField label="Max height" suffix="in" model-value="360" />
        <VTextField label="Image margin" suffix="in" model-value="0.01" />
        <VTextField label="Artboard margin" suffix="in" model-value="0.01" />
        <VSelect :items="units" label="Unit" model-value="in" />
        <VSwitch hide-details inset label="Enable all locations for variant availability" />
        <VSwitch hide-details inset label="Disable download link validation" />
        <VTextField label="Password" type="password" placeholder="Optional password" />
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Default product sizes & prices</h2>
      </header>
      <div class="pricing-grid">
        <VSelect :items="pricingModes" label="Pricing mode" model-value="By image square area" />
        <VTextField label="Price / in²" prefix="$" suffix="/ in²" model-value="0.01" />
        <VSelect :items="['Width', 'Height']" label="Side" model-value="Width" />
        <VTextField label="Shipping weight rate" suffix="pounds/in²" model-value="0" />
      </div>
      <div class="size-table">
        <header>
          <span>Sizes</span>
          <VBtn prepend-icon="mdi-plus" variant="text">Add size</VBtn>
        </header>
        <div class="size-row">
          <VTextField label="Title" model-value="S" />
          <VTextField label="Width" suffix="in" model-value="2" />
          <VBtn icon="mdi-delete" variant="text" />
        </div>
        <div class="size-row">
          <VTextField label="Title" model-value="M" />
          <VTextField label="Width" suffix="in" model-value="3" />
          <VBtn icon="mdi-delete" variant="text" />
        </div>
        <div class="size-row">
          <VTextField label="Title" model-value="L" />
          <VTextField label="Width" suffix="in" model-value="4" />
          <VBtn icon="mdi-delete" variant="text" />
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

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
