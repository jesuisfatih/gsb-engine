<template>
  <section class="panel-root">
    <header class="panel-header">
      <h1>Super Admin Control Center</h1>
      <p>High-level visibility for tenants, global assets, and platform health.</p>
    </header>

    <div class="panel-grid">
      <article class="panel-card">
        <h2>Tenant Operations</h2>
        <p>Review onboarding, plan usage, and compliance status across all merchants.</p>
        <ul>
          <li>Pending approvals &amp; escalations</li>
          <li>Plan limits and overages</li>
          <li>Recent billing events</li>
        </ul>
      </article>

      <article class="panel-card">
        <h2>Global Libraries</h2>
        <p>Manage default templates, print techniques, suppliers, and pricing rules.</p>
        <ul>
          <li>Template curation workflow</li>
          <li>Technique rule updates</li>
          <li>Supplier SLAs &amp; coverage</li>
        </ul>
      </article>

      <article class="panel-card">
        <h2>Platform Health</h2>
        <p>Track API uptime, webhook delivery, background jobs, and autosave telemetry.</p>
        <ul>
          <li>Live SLA dashboards</li>
          <li>Audit trails &amp; security alerts</li>
          <li>Upcoming maintenance windows</li>
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
    subject: 'SuperAdminDashboard',
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
  font-size: clamp(1.8rem, 2.8vw, 2.4rem);
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
  font-size: 1.1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.panel-card p {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.panel-card ul {
  margin: 0;
  padding-inline-start: 18px;
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.74);
}
</style>
