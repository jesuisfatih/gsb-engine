<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Transactions",
    embeddedSubtitle: "Review usage fees, export billing history, and monitor charge status.",
  },
});

const transactions = Array.from({ length: 12 }).map((_, index) => ({
  order: `#${1962 - index}`,
  amount: `$ ${(4.5 - Math.floor(index / 4)).toFixed(2)}`,
  status: "Charged",
  date: "Jul 9, 2025",
}));
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <div class="tab-bar">
          <button class="tab is-active" type="button">Daily</button>
          <button class="tab" type="button">Monthly</button>
        </div>
        <VBtn prepend-icon="tabler-download" variant="outlined">Export annual (2024)</VBtn>
      </header>
      <div class="chart-placeholder">
        <span>Transactions chart placeholder</span>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <div class="filters">
          <VSelect
            :items="['All time', 'Last 30 days', 'This month']"
            hide-details
            density="comfortable"
            variant="outlined"
            model-value="All time"
          />
        </div>
        <VTextField
          hide-details
          density="comfortable"
          placeholder="Order name"
          prepend-inner-icon="tabler-search"
          variant="outlined"
        />
      </header>

      <table class="data-table">
        <thead>
          <tr>
            <th>Order name</th>
            <th>Amount</th>
            <th>Charge status</th>
            <th>Date charged</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in transactions" :key="item.order">
            <td><a href="#" class="link">{{ item.order }}</a></td>
            <td>{{ item.amount }}</td>
            <td>
              <VChip size="small" color="success" variant="tonal">{{ item.status }}</VChip>
            </td>
            <td>{{ item.date }}</td>
            <td class="actions">
              <VBtn variant="text" size="small">View order</VBtn>
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

.tab-bar {
  display: inline-flex;
  background: rgba(17, 18, 23, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tab {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.6);
  cursor: pointer;
}

.tab.is-active {
  background: #111217;
  color: #ffffff;
}

.chart-placeholder {
  height: 220px;
  border-radius: 12px;
  border: 1px dashed rgba(17, 18, 23, 0.12);
  display: grid;
  place-items: center;
  color: rgba(17, 18, 23, 0.45);
  font-size: 0.9rem;
}

.filters {
  display: flex;
  gap: 12px;
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

.link {
  color: #407afc;
  text-decoration: none;
  font-weight: 600;
}

.actions {
  text-align: right;
}
</style>
