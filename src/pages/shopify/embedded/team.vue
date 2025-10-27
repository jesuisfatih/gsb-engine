<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Team & Security",
    embeddedSubtitle: "Invite staff, manage access levels, and enforce security policies.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>Staff Directory</h2>
        <span class="section-tag">Access</span>
      </header>
      <p>
        View merchant admins, production staff, and support seats. Control which modules they can access.
      </p>
      <div class="placeholder-block">
        Role assignment table (with CASL integration) moves here from the legacy overview during the next sprint.
      </div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Security Policies</h2>
        <span class="section-tag">Governance</span>
      </header>
      <p>
        Define MFA requirements, session timeouts, and audit notification rules tailored for each merchant.
      </p>
      <ul class="section-list">
        <li>MFA enforcement for merchant admins</li>
        <li>Session duration & idle lock</li>
        <li>Critical action approvals</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Audit Trail</h2>
        <span class="section-tag">Compliance</span>
      </header>
      <p>
        Keep track of who changed templates, pricing, and production settings—filterable by date and module.
      </p>
      <div class="placeholder-block">
        Audit log timeline hooks into backend events once event streaming is enabled.
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
  background: rgba(130, 177, 255, 0.18);
  color: #2f6fd6;
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
