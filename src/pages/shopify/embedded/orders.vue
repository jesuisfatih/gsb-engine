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

const orders = Array.from({ length: 18 }).map((_, index) => ({
  name: `#${1962 - index}`,
  customer: index % 2 === 0 ? "Joanna Feehan" : "Erick Lara",
  status: index === 0 ? "Created" : "Pending",
  date: "Jul 9, 2025",
  downloads: index === 0 ? "1 / 1" : "0 / 0",
}));

const selectedOrder = {
  name: "#1962",
  product: "Free DTF Gang Sheet Builder",
  surface: '22"×180"',
  workflow: "Gang Sheet",
  status: "Created",
  createdAt: "Jul 9, 2025",
  downloadedAt: "Jul 8, 2025",
  downloads: "1 / 1",
  designQuality: "No design quality issues detected.",
  designNotes: [
    { title: "Bleed check", status: "Passed" },
    { title: "Resolution", status: "Optimal" },
  ],
};
</script>

<template>
  <div class="orders-layout">
    <section class="card list-card">
      <header class="card-header list-header">
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

      <table class="data-table order-table">
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
          <tr
            v-for="order in orders"
            :key="order.name"
            :class="{ 'is-selected': order.name === selectedOrder.name }"
          >
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

      <footer class="table-footer list-footer">
        <div class="pagination-info">Showing 1–15 of 329 orders</div>
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
        <div>
          <p class="detail-subheading">Custom Printing · Gang Sheet</p>
          <h2 class="detail-title">{{ selectedOrder.name }}</h2>
        </div>
        <div class="detail-pills">
          <VChip variant="tonal" color="primary" size="small">{{ selectedOrder.workflow }}</VChip>
          <VChip variant="tonal" size="small">22" roll</VChip>
        </div>
      </header>

      <section class="summary-card">
        <header class="summary-top">
          <div>
            <h3>{{ selectedOrder.product }}</h3>
            <p class="summary-meta">{{ selectedOrder.surface }}</p>
          </div>
          <VBtn variant="tonal" size="small" color="primary">Allow</VBtn>
        </header>

        <dl class="summary-grid">
          <div>
            <dt>Status</dt>
            <dd>
              <VChip color="primary" size="small" variant="tonal">{{ selectedOrder.status }}</VChip>
            </dd>
          </div>
          <div>
            <dt>Downloaded</dt>
            <dd>{{ selectedOrder.downloadedAt }}</dd>
          </div>
          <div>
            <dt>Downloads</dt>
            <dd>{{ selectedOrder.downloads }}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{{ selectedOrder.createdAt }}</dd>
          </div>
        </dl>

        <div class="summary-actions">
          <VBtn prepend-icon="tabler-eye" variant="outlined">Preview</VBtn>
          <VBtn prepend-icon="tabler-pencil" variant="outlined">Edit</VBtn>
          <VBtn prepend-icon="tabler-photo" variant="outlined">Images</VBtn>
          <VBtn prepend-icon="tabler-download" color="primary">Download ZIP</VBtn>
        </div>
      </section>

      <section class="detail-section">
        <header class="section-header">
          <h3>Design quality</h3>
          <VChip color="primary" variant="tonal" size="small">
            {{ selectedOrder.designQuality }}
          </VChip>
        </header>
        <ul class="quality-list">
          <li v-for="item in selectedOrder.designNotes" :key="item.title">
            <span class="bullet" />
            <div>
              <p class="quality-title">{{ item.title }}</p>
              <p class="quality-status">{{ item.status }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="detail-section">
        <header class="section-header">
          <h3>Activity</h3>
          <VBtn variant="text" size="small" prepend-icon="tabler-clock">Timeline</VBtn>
        </header>
        <ul class="timeline">
          <li>
            <span class="dot dot-primary" />
            <div>
              <p class="timeline-title">Order created</p>
              <p class="timeline-meta">Jul 9, 2025 at 09:12 · Shopify checkout</p>
            </div>
          </li>
          <li>
            <span class="dot" />
            <div>
              <p class="timeline-title">Design uploaded</p>
              <p class="timeline-meta">Jul 9, 2025 at 09:35 · Customer</p>
            </div>
          </li>
          <li>
            <span class="dot" />
            <div>
              <p class="timeline-title">Download prepared</p>
              <p class="timeline-meta">Jul 8, 2025 at 18:04 · Auto build</p>
            </div>
          </li>
        </ul>
      </section>
    </section>
  </div>
</template>

<style scoped>
.orders-layout {
  display: grid;
  grid-template-columns: minmax(520px, 0.8fr) minmax(420px, 0.6fr);
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

.order-table {
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

.order-table tbody tr.is-selected {
  background: rgba(64, 122, 252, 0.08);
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

.list-footer {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
}

.pagination-controls {
  display: inline-flex;
  gap: 4px;
}

.detail-card {
  padding: 24px;
  display: grid;
  gap: 24px;
  position: sticky;
  top: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.detail-subheading {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.55);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-title {
  margin: 4px 0 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.detail-pills {
  display: inline-flex;
  gap: 8px;
}

.summary-card {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: grid;
  gap: 18px;
  background: rgba(17, 18, 23, 0.02);
}

.summary-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.summary-top h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.summary-meta {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.9rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.summary-grid dt {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(17, 18, 23, 0.6);
}

.summary-grid dd {
  margin: 4px 0 0;
  font-weight: 600;
  color: #111217;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-section {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: grid;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.quality-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.quality-list li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.bullet {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #407afc;
  margin-top: 6px;
}

.quality-title {
  margin: 0;
  font-weight: 600;
}

.quality-status {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 18px;
}

.timeline li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(17, 18, 23, 0.18);
  margin-top: 6px;
}

.dot-primary {
  background: #407afc;
}

.timeline-title {
  margin: 0;
  font-weight: 600;
}

.timeline-meta {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

@media (max-width: 1280px) {
  .orders-layout {
    grid-template-columns: 1fr;
  }

  .detail-card {
    position: static;
  }
}
</style>
