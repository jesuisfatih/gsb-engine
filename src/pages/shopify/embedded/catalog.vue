<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Catalog & Surfaces",
    embeddedSubtitle: "Sync Shopify products, map variants to surfaces, and prepare editor-ready blueprints.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Product Sync</h2>
        <span class="section-tag">Catalog</span>
      </header>
      <p>
        Monitor imports from Shopify, spot missing metafields, and track automatic refresh cadence.
      </p>
      <div class="placeholder-block">
        Product sync timeline and retry controls will surface here during the data integration milestone.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Variant ↔ Surface Mapper</h2>
        <span class="section-tag">DTF / Gang Sheet</span>
      </header>
      <p>
        Attach editor surfaces to Shopify variants so customers see the correct template when customising a product.
      </p>
      <div class="placeholder-block">
        Interactive mapper (React grid) arrives with the catalog integration build; expect drag-to-map, bulk tagging, and surface previews.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Surface Library</h2>
        <span class="section-tag">Surfaces</span>
      </header>
      <p>
        Define print widths, safe zones, bleed, and mockup masks for each printable area before exposing products in the editor.
      </p>
      <ul class="section-list">
        <li>Import SVG masks or upload PNG traces</li>
        <li>Set default print techniques per surface</li>
        <li>Preview editor frame & safe area overlays</li>
      </ul>
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
  background: rgba(59, 152, 221, 0.14);
  color: #1f6cb3;
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
