<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import { useRoute } from "vue-router";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge-utils";

type NavSection = {
  title: string;
  items: Array<{
    icon: string;
    label: string;
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
  if (!hostParam.value) return { tone: "warning", text: "Waiting for host" };
  if (sessionToken.value) return { tone: "success", text: "Connected" };
  if (lastError.value) return { tone: "critical", text: "Session token error" };
  return { tone: "info", text: "Authorising…" };
});

const navSections: NavSection[] = [
  {
    title: "Get Started",
    items: [
      { icon: "mdi-home", label: "Welcome", name: "shopify-embedded-welcome" },
      { icon: "mdi-rocket-launch", label: "Set up", name: "shopify-embedded-setup" },
    ],
  },
  {
    title: "Commerce",
    items: [
      { icon: "mdi-package-variant", label: "Products", name: "shopify-embedded-products" },
      { icon: "mdi-receipt-text", label: "Orders", name: "shopify-embedded-orders" },
      { icon: "mdi-brush-variant", label: "Designs", name: "shopify-embedded-designs" },
      { icon: "mdi-layers-triple", label: "Templates", name: "shopify-embedded-templates" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { icon: "mdi-cog", label: "General", name: "shopify-embedded-general" },
      { icon: "mdi-shape-square-plus", label: "Gang Sheet", name: "shopify-embedded-gang-sheet" },
      { icon: "mdi-tools", label: "Builder", name: "shopify-embedded-builder" },
      { icon: "mdi-file-image", label: "Image to Sheet", name: "shopify-embedded-image-to-sheet" },
      { icon: "mdi-palette-swatch", label: "Appearance", name: "shopify-embedded-appearance" },
      { icon: "mdi-view-gallery", label: "Gallery Images", name: "shopify-embedded-gallery-images" },
      { icon: "mdi-truck-delivery", label: "Print on Demand", name: "shopify-embedded-print-on-demand" },
    ],
  },
  {
    title: "Operations",
    items: [
      { icon: "mdi-finance", label: "Transactions", name: "shopify-embedded-transactions" },
      { icon: "mdi-format-font", label: "Fonts", name: "shopify-embedded-fonts" },
      { icon: "mdi-lifebuoy", label: "Support Ticket", name: "shopify-embedded-support" },
    ],
  },
];

const activeNavName = computed(() => (typeof route.name === "string" ? route.name : ""));
const currentTitle = computed(() => (route.meta?.embeddedTitle as string | undefined) ?? (route.meta?.title as string | undefined) ?? "Workspace");
const currentSubtitle = computed(() => route.meta?.embeddedSubtitle as string | undefined);

async function bootstrapAppBridge() {
  if (!apiKey || !hostParam.value) {
    lastError.value = !apiKey
      ? "Missing Shopify API key"
      : "Missing host query parameter";
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
    lastError.value = error instanceof Error ? error.message : "Unknown App Bridge error";
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
  <div class="embedded-frame">
    <header class="topbar">
      <div class="topbar-left">
        <button type="button" class="icon-button" aria-label="Back">
          ‹
        </button>
        <div class="brand">
          <span class="brand-title">Build a Gang Sheet</span>
          <span v-if="shopDomain" class="brand-subtle">{{ shopDomain }}</span>
        </div>
      </div>
      <div class="topbar-center">
        <h1 class="page-title">{{ currentTitle }}</h1>
        <p v-if="currentSubtitle" class="page-subtitle">
          {{ currentSubtitle }}
        </p>
      </div>
      <div class="topbar-right">
        <span class="status-chip" :data-tone="statusBadge.tone">
          {{ statusBadge.text }}
        </span>
        <div class="topbar-search">
          <VTextField
            density="comfortable"
            placeholder="Search"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-magnify"
          />
        </div>
        <div class="profile-chip">
          <span class="profile-avatar">GS</span>
          <span class="profile-name">Gang Sheet</span>
        </div>
      </div>
    </header>

    <div class="content-shell">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <template v-for="section in navSections" :key="section.title">
            <p class="nav-section">{{ section.title }}</p>
            <ul class="nav-list">
              <li v-for="item in section.items" :key="item.name">
                <RouterLink
                  :to="{ name: item.name, query: route.query }"
                  class="nav-link"
                  :class="{ 'is-active': activeNavName === item.name }"
                >
                  <span class="nav-icon">
                    <i :class="item.icon" aria-hidden="true"></i>
                  </span>
                  <span class="nav-text">{{ item.label }}</span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </nav>
      </aside>

      <main class="workspace">
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
.embedded-frame {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
  color: #111217;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: #111217;
  color: #ffffff;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-button {
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1rem;
  cursor: pointer;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.brand-subtle {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.6);
}

.topbar-center {
  flex: 1 1 auto;
  text-align: center;
}

.page-title {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 600;
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 0.86rem;
  color: rgba(255, 255, 255, 0.65);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-chip {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(125, 176, 255, 0.2);
  color: #7db0ff;
}

.status-chip[data-tone="success"] {
  background: rgba(38, 189, 110, 0.2);
  color: #2adb6e;
}

.status-chip[data-tone="warning"] {
  background: rgba(245, 183, 49, 0.2);
  color: #f7c045;
}

.status-chip[data-tone="critical"] {
  background: rgba(252, 92, 101, 0.22);
  color: #ff6b6b;
}

.topbar-search {
  min-width: 220px;
}

.profile-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 999px;
}

.profile-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  color: #111217;
  display: grid;
  place-items: center;
  font-weight: 600;
}

.profile-name {
  font-size: 0.82rem;
}

.content-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  flex: 1 1 auto;
  min-height: 0;
}

.sidebar {
  border-right: 1px solid rgba(17, 18, 23, 0.08);
  background: #ffffff;
  padding: 20px 16px;
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.nav-section {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.45);
  padding-inline: 8px;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  text-decoration: none;
  color: #12141a;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-link:hover {
  background: rgba(17, 18, 23, 0.08);
}

.nav-link.is-active {
  background: #111217;
  color: #ffffff;
}

.nav-icon {
  width: 20px;
  text-align: center;
  font-size: 1rem;
}

.workspace {
  padding: 32px;
  overflow-y: auto;
  background: #f3f4f6;
}

@media (max-width: 1080px) {
  .content-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .topbar {
    flex-wrap: wrap;
  }
}
</style>
