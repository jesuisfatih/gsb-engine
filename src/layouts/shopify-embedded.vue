<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import { useRoute } from "vue-router";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge-utils";

type NavGroup = {
  heading: string;
  items: Array<{
    label: string;
    description?: string;
    name: string;
  }>;
};

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

const navGroups: NavGroup[] = [
  {
    heading: "Launch",
    items: [
      { label: "App Bootstrap", description: "URL & redirects", name: "shopify-embedded-bootstrap" },
      { label: "Catalog & Surfaces", description: "Products, surfaces", name: "shopify-embedded-catalog" },
      { label: "Templates & Assets", description: "Libraries, uploads", name: "shopify-embedded-templates" },
      { label: "Editor Settings", description: "Branding, defaults", name: "shopify-embedded-editor-settings" },
      { label: "Pricing", description: "DTF & gang sheet rates", name: "shopify-embedded-pricing" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { label: "Orders & Proofing", description: "Live queue", name: "shopify-embedded-orders" },
      { label: "Production Ops", description: "Gang sheets, suppliers", name: "shopify-embedded-operations" },
      { label: "Analytics", description: "Performance dashboards", name: "shopify-embedded-analytics" },
    ],
  },
  {
    heading: "Team",
    items: [
      { label: "Team & Security", description: "Staff access, audit", name: "shopify-embedded-team" },
      { label: "Support & Docs", description: "Guides, contacts", name: "shopify-embedded-support" },
    ],
  },
];

const activeNavName = computed(() => (typeof route.name === "string" ? route.name : ""));
const currentTitle = computed(() => (route.meta?.embeddedTitle as string | undefined) ?? (route.meta?.title as string | undefined) ?? "Merchant Workspace");
const currentSubtitle = computed(() => route.meta?.embeddedSubtitle as string | undefined);

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

      <div class="topbar-center">
        <h1 class="page-title">
          {{ currentTitle }}
        </h1>
        <p v-if="currentSubtitle" class="page-subtitle">
          {{ currentSubtitle }}
        </p>
      </div>

      <div class="topbar-right">
        <slot name="topbar-actions" />
      </div>
    </header>

    <div class="embedded-body">
      <aside class="embedded-sidebar">
        <nav class="sidebar-nav">
          <template v-for="group in navGroups" :key="group.heading">
            <h2 class="nav-heading">
              {{ group.heading }}
            </h2>
            <ul class="nav-list">
              <li v-for="item in group.items" :key="item.name">
                <RouterLink
                  :to="{ name: item.name, query: route.query }"
                  class="nav-link"
                  :class="{ 'is-active': activeNavName === item.name }"
                >
                  <span class="nav-label">{{ item.label }}</span>
                  <span v-if="item.description" class="nav-description">{{ item.description }}</span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </nav>
      </aside>

      <main class="embedded-main">
        <RouterView v-slot="{ Component }">
          <Suspense>
            <Component :is="Component" />
          </Suspense>
        </RouterView>
      </main>
    </div>
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

.topbar-center {
  flex: 1 1 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111213;
}

.page-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(32, 34, 35, 0.65);
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

.embedded-body {
  display: grid;
  grid-template-columns: 268px 1fr;
  flex: 1 1 auto;
  min-height: 0;
}

.embedded-sidebar {
  border-right: 1px solid rgba(32, 34, 35, 0.08);
  background: #ffffff;
  padding: 18px 20px 24px;
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.nav-heading {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 12px;
  color: rgba(32, 34, 35, 0.55);
  font-weight: 700;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #1a1c1d;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-link:hover {
  background: rgba(92, 106, 196, 0.08);
}

.nav-link.is-active {
  background: rgba(92, 106, 196, 0.16);
  color: #3f4af0;
  box-shadow: inset 0 0 0 1px rgba(92, 106, 196, 0.45);
}

.nav-label {
  font-weight: 600;
  font-size: 0.92rem;
}

.nav-description {
  font-size: 0.78rem;
  color: rgba(26, 28, 29, 0.6);
}

.embedded-main {
  padding: clamp(18px, 3vw, 32px);
  overflow-y: auto;
  background: #f9fafb;
}

@media (max-width: 1080px) {
  .embedded-body {
    grid-template-columns: 1fr;
  }

  .embedded-sidebar {
    display: none;
  }

  .embedded-main {
    padding: 20px;
  }

  .topbar-center {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
