<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Print on demand",
    embeddedSubtitle: "Connect external production partners and route orders automatically.",
  },
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Partner integrations</h2>
        <VBtn color="primary" prepend-icon="tabler-link">Discover partners</VBtn>
      </header>

      <div class="partner-list">
        <div class="partner">
          <div class="info">
            <span class="icon">🏭</span>
            <div>
              <h3>Printful</h3>
              <p>DTF, DTG, embroidery, and global fulfilment.</p>
            </div>
          </div>
          <VSwitch hide-details inset />
        </div>
        <div class="partner">
          <div class="info">
            <span class="icon">🖨️</span>
            <div>
              <h3>Supacolor</h3>
              <p>Hybrid transfers with ultra-fast turnaround.</p>
            </div>
          </div>
          <VSwitch hide-details inset />
        </div>
        <div class="partner">
          <div class="info">
            <span class="icon">🌎</span>
            <div>
              <h3>Local supplier</h3>
              <p>Route orders by geography and technique.</p>
            </div>
          </div>
          <VSwitch hide-details inset color="primary" />
        </div>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Routing rules</h2>
        <VBtn variant="text" prepend-icon="tabler-plus">Add rule</VBtn>
      </header>
      <div class="rule-row">
        <VSelect :items="['DTF', 'Gang sheet', 'Embroidery']" label="Technique" model-value="DTF" />
        <VTextField label="Region" placeholder="North America" />
        <VTextField label="Min qty" model-value="1" type="number" />
        <VTextField label="Max qty" model-value="50" type="number" />
        <VSelect :items="['Printful', 'Supacolor', 'Local supplier']" label="Supplier" model-value="Local supplier" />
        <VBtn icon="tabler-trash" variant="text" />
      </div>
      <div class="rule-row">
        <VSelect :items="['DTF', 'Gang sheet', 'Embroidery']" label="Technique" model-value="Gang sheet" />
        <VTextField label="Region" placeholder="EU" />
        <VTextField label="Min qty" model-value="10" type="number" />
        <VTextField label="Max qty" model-value="500" type="number" />
        <VSelect :items="['Printful', 'Supacolor', 'Local supplier']" label="Supplier" model-value="Supacolor" />
        <VBtn icon="tabler-trash" variant="text" />
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

.partner-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.partner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
}

.info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.info p {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

.icon {
  font-size: 1.4rem;
}

.rule-row {
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
