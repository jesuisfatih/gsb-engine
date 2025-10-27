<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Pricing",
    embeddedSubtitle: "Control DTF roll usage, gang sheet packing fees, and variant-level markups.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Technique Pricing</h2>
        <span class="section-tag">DTF / Gang Sheet</span>
      </header>
      <p>
        Manage base plate costs, colour count ladders, and minimum order amounts for each print process.
      </p>
      <div class="placeholder-block">
        Live pricing grids (connected to the newly built pricing engine) will be embedded in the next phase.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Quantity Breaks</h2>
        <span class="section-tag">Orders</span>
      </header>
      <p>
        Configure discounts based on sheet utilisation, bundle with shipping tiers, and preview customer-facing price ladders.
      </p>
      <ul class="section-list">
        <li>Breakpoints for gang sheet area (cm²)</li>
        <li>DTF roll utilisation optimiser</li>
        <li>Bulk upload via CSV or API</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Quote Sandbox</h2>
        <span class="section-tag">Simulation</span>
      </header>
      <p>
        Preview customer quotes by selecting a product, surface, and sheet size—compare technique profitability instantly.
      </p>
      <div class="placeholder-block">
        Quote sandbox will call the pricing API and cross-check technique constraints in Day 2 delivery.
      </div>
    </section>
  </div>
</template>

<style scoped>
.section-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(32, 34, 35, 0.08);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 600;
  color: #111213;
}

.section-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(115, 103, 240, 0.16);
  color: #7367f0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-list {
  margin: 0;
  padding-left: 20px;
  color: rgba(32, 34, 35, 0.7);
  display: grid;
  gap: 6px;
}

.placeholder-block {
  border: 1px dashed rgba(32, 34, 35, 0.15);
  border-radius: 12px;
  padding: 16px;
  font-size: 0.85rem;
  color: rgba(32, 34, 35, 0.65);
  background: rgba(246, 246, 247, 0.6);
}
</style>
