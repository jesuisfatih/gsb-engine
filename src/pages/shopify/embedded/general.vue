<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "General settings",
    embeddedSubtitle: "Storewide preferences for order naming, language, and notifications.",
  },
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Store profile</h2>
        <VBtn variant="outlined">View store</VBtn>
      </header>
      <div class="form-grid">
        <VTextField label="Merchant name" placeholder="Acme Transfers" />
        <VTextField label="Support email" placeholder="support@example.com" />
        <VTextField label="Default reply-to" placeholder="hello@example.com" />
        <VSelect
          :items="['English', 'Spanish', 'French']"
          label="Default language"
          placeholder="Choose language"
        />
        <VTextField label="Default time zone" placeholder="America/New_York" />
        <VTextField label="Order prefix" placeholder="GSB-" />
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Notifications</h2>
      </header>
      <div class="toggle-list">
        <label class="toggle-item">
          <div>
            <p>Notify merchant when a new order is submitted</p>
            <span>Email and Slack notifications.</span>
          </div>
          <VSwitch hide-details inset color="primary" />
        </label>
        <label class="toggle-item">
          <div>
            <p>Send reminder to customers for pending approvals</p>
            <span>Automatic reminder email after 24 hours.</span>
          </div>
          <VSwitch hide-details inset />
        </label>
        <label class="toggle-item">
          <div>
            <p>Enable weekly performance summary</p>
            <span>Orders completed, abandoned carts, and production stats.</span>
          </div>
          <VSwitch hide-details inset />
        </label>
      </div>
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
  gap: 18px;
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

.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.toggle-item p {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.toggle-item span {
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}
</style>
