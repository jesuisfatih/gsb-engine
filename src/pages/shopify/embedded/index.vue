<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Merchant Workspace",
    embeddedSubtitle: "Select a section from the navigation to get started.",
  },
});

const router = useRouter();
const route = useRoute();

onMounted(() => {
  router.replace({
    name: "shopify-embedded-bootstrap",
    query: route.query,
  });
});
</script>

<template>
  <div class="embedded-redirect">
    <div class="loader" />
    <span>Preparing merchant workspace…</span>
  </div>
</template>

<style scoped>
.embedded-redirect {
  min-height: 60vh;
  display: grid;
  place-items: center;
  gap: 12px;
  color: rgba(32, 34, 35, 0.65);
  font-size: 0.95rem;
}

.loader {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(92, 106, 196, 0.25);
  border-top-color: rgba(92, 106, 196, 0.85);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
