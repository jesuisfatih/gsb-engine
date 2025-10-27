<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Support ticket",
    embeddedSubtitle: "Reach our support team or browse troubleshooting guides.",
  },
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Contact support</h2>
        <VBtn color="primary" prepend-icon="tabler-life-buoy">Open ticket</VBtn>
      </header>
      <div class="contact-grid">
        <div class="contact-card">
          <span class="icon">💬</span>
          <h3>Live chat</h3>
          <p>Reach us Monday–Friday 9am–6pm EST for quick questions.</p>
          <VBtn variant="outlined">Start chat</VBtn>
        </div>
        <div class="contact-card">
          <span class="icon">📧</span>
          <h3>Email</h3>
          <p>support@gangsheets.example — average response in under 12 hours.</p>
          <VBtn variant="outlined">Send email</VBtn>
        </div>
        <div class="contact-card">
          <span class="icon">📞</span>
          <h3>Success call</h3>
          <p>Schedule an onboarding call with our success team.</p>
          <VBtn variant="outlined">Book now</VBtn>
        </div>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Troubleshooting</h2>
      </header>
      <ul class="faq-list">
        <li>
          <div>
            <h4>Editor not loading in Shopify storefront</h4>
            <p>Confirm the theme app embed is enabled and your product mapping is complete.</p>
          </div>
          <VBtn variant="text">View guide</VBtn>
        </li>
        <li>
          <div>
            <h4>Uploaded artwork is blurry</h4>
            <p>Check the auto-resize setting and remind customers to upload 300 DPI files.</p>
          </div>
          <VBtn variant="text">View guide</VBtn>
        </li>
        <li>
          <div>
            <h4>Dropbox or Google Drive not syncing</h4>
            <p>Re-authenticate the integration and verify storage permissions.</p>
          </div>
          <VBtn variant="text">View guide</VBtn>
        </li>
      </ul>
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
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.contact-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.contact-card {
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 14px;
  background: rgba(17, 18, 23, 0.02);
  padding: 16px;
  display: grid;
  gap: 12px;
  text-align: left;
}

.icon {
  font-size: 1.5rem;
}

.contact-card h3 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.contact-card p {
  margin: 0;
  color: rgba(17, 18, 23, 0.65);
}

.faq-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
}

.faq-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
}

.faq-list h4 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.faq-list p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.9rem;
}
</style>
