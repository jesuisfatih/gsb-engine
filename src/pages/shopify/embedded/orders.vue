<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Orders & Proofing",
    embeddedSubtitle: "Track custom orders, customer approvals, and gang sheet submissions in real time.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Live Order Board</h2>
        <span class="section-tag">Production</span>
      </header>
      <p>
        View queued DTF transfers and gang sheets by status—pending proof, awaiting approval, ready for print, or on hold.
      </p>
      <div class="placeholder-block">
        Kanban board with drag-and-drop status changes lands with the operations integration milestone.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Proof & Approval</h2>
        <span class="section-tag">Customer</span>
      </header>
      <p>
        Centralise customer sign-off, preview proof history, and trigger reminder emails from one screen.
      </p>
      <ul class="section-list">
        <li>Proof timeline with annotated revisions</li>
        <li>Automated reminders & escalation alerts</li>
        <li>Link into editor for quick fixes</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Abandoned Drafts</h2>
        <span class="section-tag">Retention</span>
      </header>
      <p>
        Rescue revenue by monitoring designs left in draft—reassign to staff or send nudges to customers.
      </p>
      <div class="placeholder-block">
        Draft analytics will pull from editor autosave logs; follow-up tooling arrives with the template sync.
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
  background: rgba(251, 189, 4, 0.16);
  color: #a06a00;
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
