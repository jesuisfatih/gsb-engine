<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Welcome",
    embeddedSubtitle: "Quick overview of the gang sheet builder workspace.",
  },
});
</script>

<template>
  <div class="page-section">
    <section class="card highlight">
      <header class="card-header">
        <h2>Welcome aboard!</h2>
        <span class="tag ready">Onboarding</span>
      </header>
      <p>
        Use the checklist below to configure your Shopify store, map products, and start accepting custom gang sheet orders.
      </p>
      <ul class="checklist">
        <li class="done">
          <span class="bullet">✔</span>
          Connect Shopify store
        </li>
        <li class="done">
          <span class="bullet">✔</span>
          Install theme app embed
        </li>
        <li>
          <span class="bullet">1</span>
          Map products to builder and sync variants
        </li>
        <li>
          <span class="bullet">2</span>
          Configure gang sheet output, margins, and file naming
        </li>
        <li>
          <span class="bullet">3</span>
          Customise colours, fonts, and welcome popup
        </li>
      </ul>
      <div class="actions">
        <VBtn color="primary" size="large">Open Set Up Wizard</VBtn>
        <VBtn variant="outlined" size="large">View Documentation</VBtn>
      </div>
    </section>

    <div class="grid">
      <section class="card">
        <header class="card-header">
          <h3>Helpful links</h3>
        </header>
        <ul class="link-list">
          <li><a href="#">Product mapping tutorial</a></li>
          <li><a href="#">Recommended art templates</a></li>
          <li><a href="#">Managing fonts and assets</a></li>
          <li><a href="#">Production best practices</a></li>
        </ul>
      </section>
      <section class="card">
        <header class="card-header">
          <h3>Latest updates</h3>
        </header>
        <ul class="updates">
          <li>
            <strong>07 Jul 2025</strong>
            Added Dropbox and Google Drive connectors for print-ready files.
          </li>
          <li>
            <strong>30 Jun 2025</strong>
            New appearance presets and font management improvements.
          </li>
          <li>
            <strong>22 Jun 2025</strong>
            Transactions export now supports monthly breakdown by tenant.
          </li>
        </ul>
      </section>
    </div>
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
  gap: 16px;
}

.highlight {
  background: linear-gradient(135deg, rgba(64, 122, 252, 0.08), rgba(17, 18, 23, 0.02));
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header h2,
.card-header h3 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.tag {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-radius: 999px;
  padding: 4px 10px;
}

.ready {
  background: rgba(64, 122, 252, 0.12);
  color: #407afc;
}

.checklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.checklist li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
}

.checklist li.done {
  border-color: rgba(64, 122, 252, 0.2);
  background: rgba(64, 122, 252, 0.08);
}

.bullet {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #111217;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.checklist li.done .bullet {
  background: #407afc;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.link-list,
.updates {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
  color: rgba(17, 18, 23, 0.75);
}

.link-list a {
  color: #407afc;
  text-decoration: none;
  font-weight: 500;
}
</style>
