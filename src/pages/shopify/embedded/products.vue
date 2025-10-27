<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Products",
    embeddedSubtitle: "Sync products from Shopify and map them to gang sheet builders.",
  },
});

const products = [
  { name: "Custom Printing - Gang Sheet", artboard: "N/A", sizes: 41 },
  { name: "Build Your Own UV DTF Gang Sheets", artboard: "Gang Sheet", sizes: 7 },
  { name: "Free DTF Gang Sheet Builder", artboard: "Gang Sheet", sizes: 14 },
  { name: "Glitter DTF Gang Sheet Builder", artboard: "Gang Sheet", sizes: 17 },
];
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Products</h2>
          <p>Assign builders or image-to-sheet workflows to your Shopify products.</p>
        </div>
        <VBtn prepend-icon="mdi-database-import" color="primary">Import products</VBtn>
      </header>

      <div class="table-tabs">
        <button class="tab is-active" type="button">Builders</button>
        <button class="tab" type="button">Images to Sheet</button>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th class="checkbox-cell">
              <VCheckbox hide-details density="compact" />
            </th>
            <th>Product name</th>
            <th>Artboard</th>
            <th>Sizes</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.name">
            <td class="checkbox-cell">
              <VCheckbox hide-details density="compact" />
            </td>
            <td>
              <span class="product-name">{{ product.name }}</span>
            </td>
            <td>
              <VChip v-if="product.artboard !== 'N/A'" color="primary" variant="tonal" size="small">
                {{ product.artboard }}
              </VChip>
              <span v-else class="placeholder">N/A</span>
            </td>
            <td>{{ product.sizes }}</td>
            <td class="actions">
              <VBtn icon="mdi-open-in-new" variant="text" size="small" />
              <VBtn icon="mdi-link" variant="text" size="small" />
              <VBtn icon="mdi-pencil" variant="text" size="small" />
            </td>
          </tr>
        </tbody>
      </table>

      <footer class="table-footer">
        <div class="pagination-info">
          Per page
          <VSelect
            :items="[10, 20, 50]"
            model-value="20"
            hide-details
            density="compact"
            class="per-page"
          />
        </div>
        <div class="pagination-controls">
          <VBtn icon="mdi-chevron-double-left" variant="text" size="small" />
          <VBtn icon="mdi-chevron-left" variant="text" size="small" />
          <VBtn icon="mdi-chevron-right" variant="text" size="small" />
          <VBtn icon="mdi-chevron-double-right" variant="text" size="small" />
        </div>
      </footer>
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
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.card-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.65);
}

.table-tabs {
  display: inline-flex;
  background: rgba(17, 18, 23, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.6);
  cursor: pointer;
}

.tab.is-active {
  background: #111217;
  color: #ffffff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.data-table thead {
  background: rgba(17, 18, 23, 0.04);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  color: rgba(17, 18, 23, 0.6);
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(17, 18, 23, 0.06);
}

.data-table tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.checkbox-cell {
  width: 48px;
}

.product-name {
  font-weight: 600;
  color: #111217;
}

.placeholder {
  color: rgba(17, 18, 23, 0.4);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
}

.pagination-controls {
  display: inline-flex;
  gap: 4px;
}

.per-page {
  max-width: 72px;
}
</style>
