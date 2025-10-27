<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Designs",
    embeddedSubtitle: "Manage saved customer designs and proof approvals.",
  },
});

const designs = Array.from({ length: 8 }).map((_, index) => ({
  name: `Design ${1250 + index}`,
  customer: index % 2 === 0 ? "Alex Harper" : "Mayra Valverde",
  status: index % 3 === 0 ? "Awaiting approval" : "Ready",
  updated: "Jul 8, 2025 · 14:21",
  surface: index % 2 === 0 ? "Gang Sheet" : "Image to Sheet",
}));
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Saved designs</h2>
          <p>Reopen customer designs, duplicate templates, or send proof links.</p>
        </div>
        <div class="toolbar">
          <VSelect
            :items="['All statuses', 'Awaiting approval', 'Approved', 'Archived']"
            model-value="All statuses"
            density="comfortable"
            hide-details
            variant="outlined"
          />
          <VBtn prepend-icon="tabler-filter" variant="text">Filters</VBtn>
        </div>
      </header>

      <table class="data-table">
        <thead>
          <tr>
            <th>Design</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Surface</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="design in designs" :key="design.name">
            <td class="design-cell">
              <div class="thumbnail">GS</div>
              <div>
                <p class="title">{{ design.name }}</p>
                <p class="caption">Linked to order #195{{ design.name.slice(-1) }}</p>
              </div>
            </td>
            <td>{{ design.customer }}</td>
            <td>
              <VChip
                size="small"
                :color="design.status === 'Awaiting approval' ? 'warning' : 'success'"
                variant="tonal"
              >
                {{ design.status }}
              </VChip>
            </td>
            <td>{{ design.surface }}</td>
            <td>{{ design.updated }}</td>
            <td class="actions">
              <VBtn icon="tabler-external-link" variant="text" size="small" />
              <VBtn icon="tabler-copy" variant="text" size="small" />
              <VBtn icon="tabler-dots" variant="text" size="small" />
            </td>
          </tr>
        </tbody>
      </table>
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

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
}

tbody tr:hover {
  background: rgba(17, 18, 23, 0.03);
}

.design-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thumbnail {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(64, 122, 252, 0.12);
  color: #407afc;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.title {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.caption {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: rgba(17, 18, 23, 0.55);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>
