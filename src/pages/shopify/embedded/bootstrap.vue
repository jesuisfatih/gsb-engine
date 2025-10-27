<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "App Bootstrap",
    embeddedSubtitle: "Connect the embedded app to your Shopify store and verify launch readiness.",
  },
});
</script>

<template>
  <div class="section-shell">
    <section class="section-card">
      <header class="section-header">
        <h2>App Domains & Redirects</h2>
        <span class="section-tag">Launch</span>
      </header>
      <p>
        Configure embedded app URLs, redirect targets, and sanity-check Shopify allowlists before inviting merchants.
      </p>
      <ul class="section-list">
        <li>Primary app domain and CDN endpoints</li>
        <li>OAuth & proxy redirect URLs</li>
        <li>Theme app embed status</li>
      </ul>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Access Tokens</h2>
        <span class="section-tag">Security</span>
      </header>
      <p>
        Storefront, Admin, and mockup service tokens rotate from this panel. Expiry timelines and rotation policies will surface here.
      </p>
      <div class="placeholder-block">Token grid UI arriving in Day 2 implementation.</div>
    </section>

    <section class="section-card">
      <header class="section-header">
        <h2>Role Invitations</h2>
        <span class="section-tag">Team</span>
      </header>
      <p>
        Invite merchant admins and staff, monitor onboarding progress, and hand off the editor walkthrough to the right people.
      </p>
      <div class="placeholder-block">
        Staff invitation workflows migrate from the legacy overview screen in the next milestone.
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
  background: rgba(92, 106, 196, 0.12);
  color: #3f4af0;
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
