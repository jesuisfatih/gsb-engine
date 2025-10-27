<template>
  <section class="panel-root">
    <header class="panel-header">
      <h1>Production Workbench</h1>
      <p>Track proofs, gang sheets, and fulfillment status for today’s queue.</p>
    </header>

    <div class="panel-grid">
      <article class="panel-card">
        <h2>Proof &amp; Approval</h2>
        <p>Review incoming designs, preflight alerts, and customer approvals.</p>
        <ul>
          <li>Autosave recovery &amp; comments</li>
          <li>Technique-specific warnings</li>
          <li>Ready-for-production filter</li>
        </ul>
      </article>

      <article class="panel-card">
        <h2>Gang Sheet Queue</h2>
        <p>Optimize layouts, export DTF print files, and monitor utilization.</p>
        <ul>
          <li>Pending sheet arrangements</li>
          <li>Material usage snapshot</li>
          <li>Export status &amp; download links</li>
        </ul>
      </article>

      <article class="panel-card">
        <h2>Fulfillment &amp; Shipping</h2>
        <p>Assign jobs, print labels, and update tracking for outgoing orders.</p>
        <ul>
          <li>Pick &amp; pack progress</li>
          <li>Carrier exceptions &amp; holds</li>
          <li>Reprint &amp; rework triggers</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { definePage } from 'unplugin-vue-router/runtime'

definePage({
  meta: {
    layout: 'default',
    action: 'read',
    subject: 'StaffWorkspace',
  },
})
</script>

<style scoped>
.panel-root {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: clamp(24px, 4vw, 48px);
}

.panel-header h1 {
  margin: 0 0 8px;
  font-size: clamp(1.7rem, 2.6vw, 2.3rem);
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.panel-header p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.95rem;
}

.panel-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.panel-card {
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
  background: rgba(var(--v-theme-surface), 0.96);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.panel-card h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.panel-card p {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.panel-card ul {
  margin: 0;
  padding-inline-start: 18px;
  display: grid;
  gap: 6px;
  font-size: 0.88rem;
  color: rgba(var(--v-theme-on-surface), 0.74);
}
</style>
