<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Print on demand",
    embeddedSubtitle: "Connect with fulfilment partners or offer your own managed print services.",
  },
});
</script>

<template>
  <div class="pod-page">
    <section class="card hero-card">
      <div class="icon-bubble">
        <VIcon icon="tabler-printer" size="32" />
      </div>
      <h2>Print on Demand</h2>
      <p>
        Connect with a wide range of print providers or become a printer yourself. Our platform offers an extensive
        network of reliable and approved production services ready to fulfil your gang sheet orders.
      </p>
      <div class="cta-group">
        <VBtn color="primary" prepend-icon="tabler-search">Select a printer</VBtn>
        <VBtn variant="tonal" prepend-icon="tabler-briefcase">Become a printer</VBtn>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pod-page {
  display: grid;
  place-items: center;
  min-height: 420px;
  padding: 40px 0;
}

.card {
  background: #ffffff;
  border-radius: 24px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 48px 56px;
  max-width: 640px;
  text-align: center;
  display: grid;
  gap: 18px;
  box-shadow: 0 32px 60px -40px rgba(64, 122, 252, 0.45);
}

.icon-bubble {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  margin: 0 auto 8px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(64, 122, 252, 0.18), rgba(125, 90, 241, 0.12));
  color: #3f51f5;
}

h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #111217;
}

p {
  margin: 0;
  color: rgba(17, 18, 23, 0.65);
  font-size: 1rem;
  line-height: 1.6;
}

.cta-group {
  display: inline-flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .card {
    padding: 36px 28px;
  }
}
</style>
