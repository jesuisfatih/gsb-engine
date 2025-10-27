<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Set up wizard",
    embeddedSubtitle: "Complete the essential configuration to launch your gang sheet builder.",
  },
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>Configuration steps</h2>
        <span class="tag in-progress">4 / 7 complete</span>
      </header>
      <div class="steps">
        <div class="step done">
          <div class="step-index">1</div>
          <div class="step-content">
            <h3>Connect Shopify store</h3>
            <p>App installed and OAuth completed.</p>
          </div>
          <VBtn variant="text" disabled>Completed</VBtn>
        </div>
        <div class="step done">
          <div class="step-index">2</div>
          <div class="step-content">
            <h3>Enable theme app embed</h3>
            <p>Editor button visible on product detail pages.</p>
          </div>
          <VBtn variant="text" disabled>Completed</VBtn>
        </div>
        <div class="step active">
          <div class="step-index">3</div>
          <div class="step-content">
            <h3>Import Shopify products</h3>
            <p>Select products to map to gang sheet builders.</p>
          </div>
          <VBtn color="primary">Open products</VBtn>
        </div>
        <div class="step">
          <div class="step-index">4</div>
          <div class="step-content">
            <h3>Configure gang sheet output</h3>
            <p>File name templates, auto trim, and download options.</p>
          </div>
          <VBtn variant="outlined">Open settings</VBtn>
        </div>
        <div class="step">
          <div class="step-index">5</div>
          <div class="step-content">
            <h3>Customise appearance</h3>
            <p>Choose colours, font, and welcome popup content.</p>
          </div>
          <VBtn variant="outlined">Theme options</VBtn>
        </div>
        <div class="step">
          <div class="step-index">6</div>
          <div class="step-content">
            <h3>Upload fonts & gallery assets</h3>
            <p>Add brand-specific fonts and background images.</p>
          </div>
          <VBtn variant="outlined">Manage assets</VBtn>
        </div>
        <div class="step">
          <div class="step-index">7</div>
          <div class="step-content">
            <h3>Review billing & transactions</h3>
            <p>Understand per-order fees and export transaction data.</p>
          </div>
          <VBtn variant="outlined">Transactions</VBtn>
        </div>
      </div>
    </section>

    <section class="card secondary">
      <header class="card-header">
        <h2>Need assistance?</h2>
      </header>
      <p>
        Book an onboarding session with our success team or browse the knowledge base for step-by-step guides.
      </p>
      <div class="cta-row">
        <VBtn color="primary">Schedule call</VBtn>
        <VBtn variant="text">View documentation</VBtn>
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
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card.secondary {
  max-width: 480px;
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

.tag {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(64, 122, 252, 0.12);
  color: #407afc;
}

.steps {
  display: grid;
  gap: 12px;
}

.step {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.step.done {
  background: rgba(64, 122, 252, 0.08);
  border-color: rgba(64, 122, 252, 0.2);
}

.step.active {
  border-color: #407afc;
}

.step-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #111217;
  color: #ffffff;
  font-weight: 600;
  display: grid;
  place-items: center;
}

.step.done .step-index {
  background: #407afc;
}

.step-content h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111217;
}

.step-content p {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.65);
  font-size: 0.88rem;
}

.cta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
