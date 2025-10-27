<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import { useRoute } from "vue-router";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge-utils";

const route = useRoute();

const appBridge = ref<ReturnType<typeof createApp> | null>(null);
const sessionToken = ref<string>("");
const lastError = ref<string | null>(null);

const apiKey =
  import.meta.env.VITE_SHOPIFY_APP_API_KEY ??
  import.meta.env.VITE_SHOPIFY_API_KEY ??
  "";

const hostParam = computed<string | undefined>(() => {
  const fromRoute = route.query.host;
  if (typeof fromRoute === "string" && fromRoute.length > 0) return fromRoute;

  if (typeof window === "undefined") return undefined;
  const search = new URLSearchParams(window.location.search);
  const host = search.get("host");
  return host ?? undefined;
});

const shopDomain = computed<string | undefined>(() => {
  const fromRoute = route.query.shop;
  if (typeof fromRoute === "string" && fromRoute.length > 0) return fromRoute;

  if (typeof window === "undefined") return undefined;
  const search = new URLSearchParams(window.location.search);
  const shop = search.get("shop");
  return shop ?? undefined;
});

const statusBadge = computed(() => {
  if (!apiKey) return { tone: "critical", text: "API key missing" };
  if (!hostParam.value) return { tone: "warning", text: "Host param yok" };
  if (sessionToken.value) return { tone: "success", text: "Connected" };
  if (lastError.value) return { tone: "critical", text: "Token alinamadi" };
  return { tone: "info", text: "Hazirlaniyor" };
});

async function bootstrapAppBridge() {
  if (!apiKey || !hostParam.value) {
    lastError.value = !apiKey
      ? "VITE_SHOPIFY_APP_API_KEY tanimli degil"
      : "host query param yok";
    return;
  }

  try {
    const app = createApp({
      apiKey,
      host: hostParam.value,
      forceRedirect: true,
    });

    appBridge.value = app;
    lastError.value = null;
    sessionToken.value = await getSessionToken(app);
  } catch (error) {
    console.error("[shopify-layout] App Bridge init failed", error);
    lastError.value =
      error instanceof Error ? error.message : "Bilinmeyen App Bridge hatasi";
  }
}

onMounted(() => {
  bootstrapAppBridge();
});

provide("shopifyAppBridge", appBridge);
provide("shopifySessionToken", sessionToken);
provide("shopifyShopDomain", shopDomain);
</script>

<template>
  <div class="shopify-embedded-frame">
    <header class="embedded-topbar">
      <div class="topbar-left">
        <div class="brand-step">
          <span class="brand-title">Gang Sheet Builder</span>
          <span v-if="shopDomain" class="brand-subtle">· {{ shopDomain }}</span>
        </div>
        <div class="status-chip" :data-tone="statusBadge.tone">
          {{ statusBadge.text }}
        </div>
      </div>
      <div class="topbar-right">
        <slot name="topbar-actions" />
      </div>
    </header>

    <main class="embedded-main">
      <RouterView v-slot="{ Component }">
        <Suspense>
          <Component :is="Component" />
        </Suspense>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.shopify-embedded-frame {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f6f6f7;
  color: #1a1a1a;
}

.embedded-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-step {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.95rem;
}

.brand-title {
  font-weight: 600;
  color: #202223;
}

.brand-subtle {
  color: rgba(32, 34, 35, 0.64);
}

.status-chip {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-chip[data-tone="success"] {
  background: rgba(0, 128, 96, 0.08);
  color: #006c4f;
}

.status-chip[data-tone="warning"] {
  background: rgba(185, 137, 0, 0.12);
  color: #8a6116;
}

.status-chip[data-tone="critical"] {
  background: rgba(216, 31, 38, 0.12);
  color: #c72c2e;
}

.status-chip[data-tone="info"] {
  background: rgba(62, 85, 229, 0.1);
  color: #3f4af0;
}

.embedded-main {
  flex: 1;
  padding: clamp(16px, 3vw, 32px);
}
</style>
