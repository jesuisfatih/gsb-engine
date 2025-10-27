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
  if (lastError.value) return { tone: "critical", text: "Session error" };
  return { tone: "info", text: "Authorising…" };
});

const navSections: NavSection[] = [
  {
    title: "Get Started",
    items: [
      { icon: "mdi-home-outline", label: "Welcome", name: "shopify-embedded-welcome" },
      { icon: "mdi-rocket-launch", label: "Set up", name: "shopify-embedded-setup" },
    ],
  },
  {
    title: "Commerce",
    items: [
      { icon: "mdi-package-variant", label: "Products", name: "shopify-embedded-products" },
      { icon: "mdi-receipt-text-outline", label: "Orders", name: "shopify-embedded-orders" },
      { icon: "mdi-image-edit-outline", label: "Designs", name: "shopify-embedded-designs" },
      { icon: "mdi-layers-triple", label: "Templates", name: "shopify-embedded-templates" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { icon: "mdi-cog-outline", label: "General", name: "shopify-embedded-general" },
      { icon: "mdi-shape-square-rounded-plus", label: "Gang Sheet", name: "shopify-embedded-gang-sheet" },
      { icon: "mdi-tools", label: "Builder", name: "shopify-embedded-builder" },
      { icon: "mdi-file-image-outline", label: "Image to Sheet", name: "shopify-embedded-image-to-sheet" },
      { icon: "mdi-palette-swatch", label: "Appearance", name: "shopify-embedded-appearance" },
      { icon: "mdi-view-gallery-outline", label: "Gallery Images", name: "shopify-embedded-gallery-images" },
      { icon: "mdi-truck-delivery-outline", label: "Print on Demand", name: "shopify-embedded-print-on-demand" },
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
          <VIcon icon="mdi-arrow-left" size="18" />
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
          <VIcon icon="mdi-shield-check" size="16" />
          {{ statusBadge.text }}
        </span>
        <div class="topbar-search">
          <VTextField
            density="comfortable"
            placeholder="Search"
            variant="solo"
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
                    <VIcon :icon="item.icon" size="18" />
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
  background: linear-gradient(155deg, #f4f5ff 0%, #eef1ff 45%, #f3f0ff 100%);
  color: #101227;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 28px;
  background: linear-gradient(100deg, #1d1745 0%, #3d2caa 45%, #6951ff 100%);
  color: #ffffff;
  box-shadow: 0 18px 40px -22px rgba(59, 43, 174, 0.8);
  position: sticky;
  top: 0;
  z-index: 20;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-button {
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.22);
  transform: translateY(-1px);
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-weight: 600;
  font-size: 0.98rem;
}

.brand-subtle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
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
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.7);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.status-chip {
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(138, 200, 255, 0.2);
  color: #d9ecff;
  border: 1px solid rgba(217, 236, 255, 0.3);
}

.status-chip[data-tone="success"] {
  background: rgba(34, 197, 127, 0.2);
  color: #befae2;
  border-color: rgba(190, 250, 226, 0.3);
}

.status-chip[data-tone="warning"] {
  background: rgba(250, 204, 97, 0.22);
  color: #ffeab7;
}

.status-chip[data-tone="critical"] {
  background: rgba(252, 129, 135, 0.22);
  color: #ffd7db;
}

.topbar-search {
  min-width: 240px;
}

.profile-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.16);
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.profile-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.82);
  color: #1d1745;
  display: grid;
  place-items: center;
  font-weight: 600;
}

.profile-name {
  font-size: 0.85rem;
}

.content-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  flex: 1 1 auto;
  min-height: 0;
}

.sidebar {
  border-right: 1px solid rgba(37, 33, 88, 0.35);
  background: linear-gradient(200deg, #181736 0%, #1f2042 55%, #262a54 100%);
  padding: 28px 18px;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.7);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.nav-section {
  margin: 0 0 10px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  padding-inline: 10px;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.nav-link:hover {
  background: rgba(96, 92, 220, 0.35);
  color: #ffffff;
  transform: translateX(4px);
}

.nav-link.is-active {
  background: linear-gradient(120deg, #5d5af1 0%, #a855f7 100%);
  color: #ffffff;
  box-shadow: 0 18px 32px -18px rgba(93, 90, 241, 0.9);
}

.nav-icon {
  width: 22px;
  display: grid;
  place-items: center;
}

.workspace {
  padding: 40px;
  overflow-y: auto;
  background: transparent;
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
