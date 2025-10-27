<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Analytics",
    embeddedSubtitle: "Monitor sales performance, editor usage, and gang sheet efficiency.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Sales Performance</h2>
        <span class="section-tag">Revenue</span>
      </header>
      <p>
        Track orders by product, template, and print technique to understand demand across DTF and gang sheet offerings.
      </p>
      <div class="placeholder-block">
        Charting widgets (ApexCharts) will render here once analytics endpoints are wired up.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Editor Engagement</h2>
        <span class="section-tag">Usage</span>
      </header>
      <p>
        Monitor template adoption, abandoned sessions, and save/share behaviour to iterate on the customer journey.
      </p>
      <ul class="section-list">
        <li>Completion funnel with drop-off reasons</li>
        <li>Asset usage breakdown per campaign</li>
        <li>Device and locale insights</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Production Health</h2>
        <span class="section-tag">Ops</span>
      </header>
      <p>
        Visualise SLA breaches, reprints, and supplier comparisons to keep production tight.
      </p>
      <div class="placeholder-block">
        KPI tiles, trend lines, and anomaly alerts will plug into the operations data service in Day 3.
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
  background: rgba(79, 209, 197, 0.16);
  color: #0b7d74;
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
