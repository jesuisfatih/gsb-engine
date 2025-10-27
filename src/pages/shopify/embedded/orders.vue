<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Orders",
    embeddedSubtitle: "Track new submissions, fulfil gang sheets, and download print-ready files.",
  },
});

const orders = Array.from({ length: 15 }).map((_, index) => ({
  name: `#${1962 - index}`,
  customer: index % 2 === 0 ? "Joanna Feehan" : "Erick Lara",
  status: "Created",
  date: "Jul 9, 2025",
  downloads: index % 4 === 0 ? "1 / 1" : "0 / 0",
}));
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div class="tabs">
          <button class="tab is-active" type="button">Unfulfilled</button>
          <button class="tab" type="button">Fulfilled</button>
          <button class="tab" type="button">All</button>
        </div>
        <div class="toolbar">
          <VTextField
            hide-details
            density="comfortable"
            placeholder="Search orders"
            prepend-inner-icon="tabler-search"
            variant="outlined"
            class="search"
          />
          <VSelect
            :items="['Any', 'Created', 'Approved', 'In production']"
            hide-details
            density="comfortable"
            label="Status"
            variant="outlined"
            class="status-filter"
            model-value="Any"
          />
        </div>
      </header>

      <table class="data-table">
        <thead>
          <tr>
            <th />
            <th>Name</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Order date</th>
            <th>Downloaded</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.name">
            <td class="toggle">
              <VBtn icon="tabler-chevron-right" variant="text" density="compact" />
            </td>
            <td><a href="#" class="link">{{ order.name }}</a></td>
            <td>{{ order.customer }}</td>
            <td>
              <VChip size="small" color="primary" variant="tonal">{{ order.status }}</VChip>
            </td>
            <td>{{ order.date }}</td>
            <td>
              <a href="#" class="link">{{ order.downloads }}</a>
            </td>
            <td class="actions">
              <VBtn icon="tabler-download" variant="text" size="small" />
              <VBtn icon="tabler-eye" variant="text" size="small" />
              <VBtn icon="tabler-dots" variant="text" size="small" />
            </td>
          </tr>
        </tbody>
      </table>

      <footer class="table-footer">
        <div class="pagination-info">
          Showing 1–15 of 329 orders
        </div>
        <div class="pagination-controls">
          <VBtn icon="tabler-chevrons-left" variant="text" size="small" />
          <VBtn icon="tabler-chevron-left" variant="text" size="small" />
          <VBtn icon="tabler-chevron-right" variant="text" size="small" />
          <VBtn icon="tabler-chevrons-right" variant="text" size="small" />
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
  gap: 24px;
}

.tabs {
  display: inline-flex;
  background: rgba(17, 18, 23, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  padding: 8px 18px;
  border-radius: 10px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.6);
  cursor: pointer;
}

.tab.is-active {
  background: #111217;
  color: #ffffff;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.search {
  min-width: 220px;
}

.status-filter {
  min-width: 160px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

thead {
  background: rgba(17, 18, 23, 0.04);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  color: rgba(17, 18, 23, 0.6);
}

th,
td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(17, 18, 23, 0.06);
  vertical-align: middle;
}

tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.toggle {
  width: 40px;
}

.link {
  color: #407afc;
  text-decoration: none;
  font-weight: 600;
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
  padding-top: 8px;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
}

.pagination-controls {
  display: inline-flex;
  gap: 4px;
}
</style>
