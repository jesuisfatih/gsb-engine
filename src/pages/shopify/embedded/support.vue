<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Support & Docs",
    embeddedSubtitle: "Give merchants the resources they need to run production smoothly.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Onboarding Guides</h2>
        <span class="section-tag">Enablement</span>
      </header>
      <p>
        Host quick-start videos, printable SOPs, and walkthroughs tailored to gang sheet workflows.
      </p>
      <div class="placeholder-block">
        Markdown renderer + video embed support gets added once content service is connected.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Troubleshooter</h2>
        <span class="section-tag">Self-Serve</span>
      </header>
      <p>
        Common issues (mockup not loading, DPI warnings, Shopify sync errors) will be surfaced here with step-by-step fixes.
      </p>
      <ul class="section-list">
        <li>Interactive decision tree</li>
        <li>Error code search</li>
        <li>Escalation to support team</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Contact & SLA</h2>
        <span class="section-tag">Operations</span>
      </header>
      <p>
        Keep merchants aligned on response times, escalation channels, and maintenance calendars.
      </p>
      <div class="placeholder-block">
        SLA tracker pulls from operations metrics; contact cards integrate with helpdesk in Day 3 delivery.
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
  background: rgba(255, 214, 102, 0.18);
  color: #a15c00;
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
