<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Templates & Assets",
    embeddedSubtitle: "Curate template libraries, upload branding assets, and manage personalization rules.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Template Library</h2>
        <span class="section-tag">Creative</span>
      </header>
      <p>
        Build merchant-exclusive templates, group them by campaign, and control which surfaces & print techniques they target.
      </p>
      <div class="placeholder-block">
        Template grid, duplicate-from-global, and placeholder field editor migrate here in the next milestone.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Asset Library</h2>
        <span class="section-tag">Branding</span>
      </header>
      <p>
        Upload logos, clipart, and texture packs; govern who can access premium assets during editor sessions.
      </p>
      <ul class="section-list">
        <li>Bulk upload with automatic categorisation</li>
        <li>Tag assets for DTF vs gang sheet usage</li>
        <li>Toggle watermarking and download protection</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Personalisation Rules</h2>
        <span class="section-tag">Dynamic Fields</span>
      </header>
      <p>
        Lock fonts, enforce character limits, and define required placeholders for customer-facing templates.
      </p>
      <div class="placeholder-block">
        Rule builder UI—including preview in the editor—will be implemented in the template services milestone.
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
  background: rgba(244, 162, 97, 0.16);
  color: #c05621;
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
