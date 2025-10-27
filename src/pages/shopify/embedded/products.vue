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

const productRows = [
  { name: "Custom Printing - Gang Sheet", artboard: "Gang Sheet", sizes: 41, selected: true },
  { name: "Build Your Own UV DTF Gang Sheets", artboard: "Gang Sheet", sizes: 7 },
  { name: "Free DTF Gang Sheet Builder", artboard: "Gang Sheet", sizes: 14 },
  { name: "Glitter DTF Gang Sheet Builder", artboard: "Gang Sheet", sizes: 17 },
];

const sizeRows = Array.from({ length: 20 }).map((_, index) => ({
  size: `22"×${96 + index * 6}"`,
  width: 22,
  height: 96 + index * 6,
  price: 63 + index * 3,
  maxFiles: "Unlimited",
}));
</script>

<template>
  <div class="products-layout">
    <section class="card list-card">
      <header class="card-header list-header">
        <div>
          <h2>Products</h2>
          <p>Assign builders or image-to-sheet workflows to your Shopify products.</p>
        </div>
        <VBtn prepend-icon="tabler-database-import" color="primary">Import products</VBtn>
      </header>

      <div class="table-tabs">
        <button class="tab is-active" type="button">Builders</button>
        <button class="tab" type="button">Image to Sheet</button>
      </div>

      <table class="data-table product-table">
        <thead>
          <tr>
            <th />
            <th>Product name</th>
            <th>Artboard</th>
            <th>Sizes</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in productRows"
            :key="product.name"
            :class="{ 'is-selected': product.selected }"
          >
            <td>
              <VCheckbox hide-details density="compact" :model-value="product.selected" />
            </td>
            <td>
              <span class="product-name">{{ product.name }}</span>
            </td>
            <td>
              <VChip color="primary" variant="tonal" size="small">{{ product.artboard }}</VChip>
            </td>
            <td>{{ product.sizes }}</td>
            <td class="actions">
              <VBtn icon="tabler-link" variant="text" size="small" />
              <VBtn icon="tabler-pencil" variant="text" size="small" />
              <VBtn icon="tabler-dots" variant="text" size="small" />
            </td>
          </tr>
        </tbody>
      </table>

      <footer class="table-footer list-footer">
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
          <VBtn icon="tabler-chevrons-left" variant="text" size="small" />
          <VBtn icon="tabler-chevron-left" variant="text" size="small" />
          <VBtn icon="tabler-chevron-right" variant="text" size="small" />
          <VBtn icon="tabler-chevrons-right" variant="text" size="small" />
        </div>
      </footer>
    </section>

    <section class="card detail-card">
      <header class="detail-header">
        <button type="button" class="ghost-btn">
          <VIcon icon="tabler-arrow-left" size="18" />
        </button>
        <div class="detail-heading">
          <span class="crumb">Custom Printing · Gang Sheet</span>
          <h2>Custom Printing - Gang Sheet</h2>
        </div>
        <div class="header-actions">
          <VSwitch hide-details inset label="Live" color="primary" />
          <VSwitch hide-details inset label="Allow builder" />
        </div>
      </header>

      <div class="form-ribbon">
        <VSelect label="Size option" :items="['Size', 'Length', 'Area']" model-value="Size" />
        <VSelect label="Size unit" :items="['in', 'cm', 'mm']" model-value="in" />
        <VSelect label="Product type" :items="['Gang Sheet', 'DTF Roll']" model-value="Gang Sheet" />
        <VSelect label="Print file name" :items="['Default', 'Custom']" model-value="Default" />
        <VSwitch hide-details inset label="Use custom button label" />
      </div>

      <div class="tab-bar">
        <button class="tab is-active" type="button">Sizes & Prices</button>
        <button class="tab" type="button">Settings</button>
      </div>

      <div class="tab-panel">
        <table class="size-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>Width</th>
              <th>Height</th>
              <th>Price</th>
              <th>Max Allowed Files</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sizeRows" :key="row.size">
              <td>
                <VTextField density="compact" hide-details :model-value="row.size" />
              </td>
              <td>
                <VTextField density="compact" type="number" suffix="in" hide-details :model-value="row.width" />
              </td>
              <td>
                <VTextField density="compact" type="number" suffix="in" hide-details :model-value="row.height" />
              </td>
              <td>
                <VTextField density="compact" prefix="$" hide-details :model-value="row.price" />
              </td>
              <td>
                <VSelect
                  density="compact"
                  hide-details
                  :items="['Unlimited', '1', '3', '5']"
                  model-value="Unlimited"
                />
              </td>
              <td class="row-actions">
                <VBtn icon="tabler-plus" variant="text" size="small" />
                <VBtn icon="tabler-trash" variant="text" size="small" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="tab-panel secondary">
        <div class="settings-grid">
          <div class="setting-block">
            <h3>Auto build</h3>
            <p>Enable the automatic panel arrangement for uploaded assets.</p>
            <VSwitch hide-details inset label="Auto build default" color="primary" />
            <VSelect
              density="compact"
              label="Strategy"
              :items="['Recommended', 'Compact', 'Space saving']"
              model-value="Recommended"
            />
          </div>
          <div class="setting-block">
            <h3>Button label</h3>
            <p>Override the call-to-action button shown to your customers.</p>
            <VTextField label="Label text" placeholder="Start building" />
          </div>
          <div class="setting-block">
            <h3>File visibility</h3>
            <p>Control how many uploads customers can attach per order.</p>
            <VSwitch hide-details inset label="Show upload preview" />
            <VSwitch hide-details inset label="Allow drag & drop reorder" />
            <VSwitch hide-details inset label="Enable proof approval" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.products-layout {
  display: grid;
  grid-template-columns: minmax(520px, 0.8fr) minmax(460px, 0.6fr);
  gap: 28px;
  align-items: flex-start;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: grid;
  gap: 20px;
}

.list-card {
  padding: 0;
}

.list-header {
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.list-header h2 {
  margin: 0;
  font-weight: 600;
}

.list-header p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.6);
}

.table-tabs {
  display: inline-flex;
  background: rgba(17, 18, 23, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  margin-inline: 24px;
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

.product-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.product-table thead {
  background: rgba(17, 18, 23, 0.04);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  color: rgba(17, 18, 23, 0.6);
}

.product-table th,
.product-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(17, 18, 23, 0.06);
}

.product-table tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.product-table tbody tr.is-selected {
  background: rgba(64, 122, 252, 0.08);
}

.product-name {
  font-weight: 600;
  color: #111217;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.list-footer {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
}

.per-page {
  max-width: 72px;
}

.detail-card {
  position: sticky;
  top: 24px;
  gap: 24px;
}

.detail-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
}

.detail-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-heading h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.crumb {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(17, 18, 23, 0.55);
  letter-spacing: 0.04em;
}

.ghost-btn {
  border: none;
  background: rgba(17, 18, 23, 0.05);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-ribbon {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.tab-bar {
  display: inline-flex;
  gap: 8px;
  background: rgba(17, 18, 23, 0.06);
  padding: 4px;
  border-radius: 12px;
}

.tab-panel {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 18px;
  background: rgba(17, 18, 23, 0.02);
}

.size-table {
  width: 100%;
  border-collapse: collapse;
}

.size-table thead {
  background: rgba(17, 18, 23, 0.04);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  color: rgba(17, 18, 23, 0.6);
}

.size-table th,
.size-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(17, 18, 23, 0.06);
}

.size-table tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.row-actions {
  display: inline-flex;
  gap: 4px;
  justify-content: flex-end;
}

.secondary {
  background: #ffffff;
}

.settings-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.setting-block {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: grid;
  gap: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.setting-block h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.setting-block p {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

@media (max-width: 1280px) {
  .products-layout {
    grid-template-columns: 1fr;
  }

  .detail-card {
    position: static;
  }
}
</style>
