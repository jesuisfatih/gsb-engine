<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Editor Settings",
    embeddedSubtitle: "Control branding, default techniques, and customer experience inside the editor.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Brand & Theme</h2>
        <span class="section-tag">Experience</span>
      </header>
      <p>
        Align the editor with your storefront—configure logos, colour palettes, fonts, and watermark behaviour for proofs.
      </p>
      <div class="placeholder-block">
        Branding controls and font library selectors will land here after the asset + template milestones.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Technique Defaults</h2>
        <span class="section-tag">DTF Rules</span>
      </header>
      <p>
        Choose preferred print methods per product, toggle auto-mirroring for sublimation, and define alert thresholds (DPI, min stroke, contrast).
      </p>
      <ul class="section-list">
        <li>Override global technique priority for specific surfaces</li>
        <li>Enable/disable perspective tools per print process</li>
        <li>Set proof approval requirements before checkout</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Customer Journey</h2>
        <span class="section-tag">UX</span>
      </header>
      <p>
        Configure autosave behaviour, share links, allow guest editing, and control gang sheet import/export options for end-users.
      </p>
      <div class="placeholder-block">
        Toggles move from the legacy overview after we hook into real settings APIs.
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
  background: rgba(84, 214, 154, 0.16);
  color: #107457;
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
