<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Production Ops",
    embeddedSubtitle: "Coordinate gang sheet packing, supplier routing, and print floor operations.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Gang Sheet Planner</h2>
        <span class="section-tag">Layout</span>
      </header>
      <p>
        Visualise scheduled gang sheets, review auto-pack runs, and download production-ready sheets for each supplier.
      </p>
      <div class="placeholder-block">
        Planner UI connects to the gang sheet engine in an upcoming milestone—expect utilisation bars, rotate/fit toggles, and PDF exports.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Supplier Routing</h2>
        <span class="section-tag">Fulfilment</span>
      </header>
      <p>
        Define supplier preferences per technique, track SLAs, and auto-route orders based on geography or workload.
      </p>
      <ul class="section-list">
        <li>Real-time SLA and error-rate indicators</li>
        <li>Manual overrides with reason logging</li>
        <li>Batch export for outsource partners</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Packaging & Dispatch</h2>
        <span class="section-tag">Logistics</span>
      </header>
      <p>
        Generate barcodes, pick lists, and packaging checklists tailored for DTF transfers and accessory bundles.
      </p>
      <div class="placeholder-block">
        Packaging widgets migrate from the existing operations prototype; shipping integrations follow in Day 3.
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
  background: rgba(255, 159, 243, 0.16);
  color: #a3479c;
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
