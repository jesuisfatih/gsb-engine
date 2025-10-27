<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { definePage } from 'unplugin-vue-router/runtime'

definePage({
  meta: {
    layout: 'default',
    public: true,
  },
})

const router = useRouter()
const route = useRoute()

const hasShopifyContext =
  typeof route.query.host === 'string' ||
  typeof route.query.shop === 'string' ||
  route.query.embedded === '1'

if (hasShopifyContext) {
  router.replace({ path: '/shopify/embedded', query: route.query })
} else {
  router.replace({ path: '/merchant/overview' })
}
</script>

<template>
  <div class="redirecting-screen">
    <VProgressCircular indeterminate color="primary" size="32" />
    <span>Loading workspace…</span>
  </div>
</template>

<style scoped>
.redirecting-screen {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 60vh;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.95rem;
}
</style>
