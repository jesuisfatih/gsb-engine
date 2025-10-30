<script setup lang="ts">
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import type { RoleId, SessionUser } from "@/modules/core/types/domain";
import { computed, onMounted, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";

type NavSection = {
  title: string;
  items: Array<{
    icon: string;
    label: string;
    name: string;
  }>;
};

const route = useRoute();
const sessionToken = ref<string>("");
const shopifyFetch = ref<typeof fetch | null>(null);
const lastError = ref<string | null>(null);
const sessionIssuedFor = ref<string | null>(null);
const exchangingSession = ref(false);
const shopifyAuthenticated = ref(false);

const sessionStore = useSessionStore();
const notification = useNotificationStore();

const apiKey = import.meta.env.VITE_SHOPIFY_APP_API_KEY ?? import.meta.env.VITE_SHOPIFY_API_KEY ?? "";
const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");

const isInIframe = computed(() => {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
});

const isAuthenticated = computed(() => shopifyAuthenticated.value || sessionStore.isAuthenticated);

const hostParam = computed<string | undefined>(() => {
  const fromRoute = route.query.host;
  if (typeof fromRoute === "string" && fromRoute.length > 0) {
    if (typeof window !== "undefined") window.localStorage.setItem("shopify:host", fromRoute);
    return fromRoute;
  }
  if (typeof window === "undefined") return undefined;
  const searchHost = new URLSearchParams(window.location.search).get("host");
  if (typeof searchHost === "string" && searchHost.length > 0) {
    window.localStorage.setItem("shopify:host", searchHost);
    return searchHost;
  }
  return window.localStorage.getItem("shopify:host") ?? undefined;
});

const shopDomain = computed<string | undefined>(() => {
  const fromRoute = route.query.shop;
  if (typeof fromRoute === "string" && fromRoute.length > 0) {
    if (typeof window !== "undefined") window.localStorage.setItem("shopify:shop", fromRoute);
    return fromRoute;
  }
  if (typeof window === "undefined") return undefined;
  const search = new URLSearchParams(window.location.search);
  const shop = search.get("shop");
  if (typeof shop === "string" && shop.length > 0) {
    window.localStorage.setItem("shopify:shop", shop);
    return shop;
  }
  return window.localStorage.getItem("shopify:shop") ?? undefined;
});

const statusBadge = computed(() => {
  if (!apiKey) return { tone: "critical", text: "API key missing" };
  if (!hostParam.value) return { tone: "warning", text: "Waiting for host" };
  if (isAuthenticated.value) return { tone: "success", text: "Connected" };
  if (exchangingSession.value) return { tone: "info", text: "Authorizing..." };
  if (lastError.value) return { tone: "critical", text: "Session error" };
  if (sessionToken.value) return { tone: "info", text: "Connecting..." };
  return { tone: "info", text: "Loading..." };
});

async function bootstrapAppBridge() {
  if (!apiKey || !hostParam.value) {
    lastError.value = "Missing configuration";
    return;
  }

  if (!isInIframe.value && shopDomain.value && hostParam.value) {
    try {
      const decodedHost = atob(hostParam.value);
      const redirectUrl = `https://${decodedHost}/apps/${apiKey}/shopify/embedded${window.location.search}`;
      window.top!.location.href = redirectUrl;
    } catch {
      lastError.value = "Invalid host parameter";
    }
    return;
  }

  try {
    let shopifyGlobal: any = null;
    for (let i = 0; i < 40; i++) {
      shopifyGlobal = window.shopify ?? null;
      if (shopifyGlobal?.idToken) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (!shopifyGlobal?.idToken) {
      lastError.value = "Shopify not available";
      return;
    }

    if (shopifyGlobal.ready) {
      const readyFn = typeof shopifyGlobal.ready === "function" ? shopifyGlobal.ready() : shopifyGlobal.ready;
      if (readyFn?.then) {
        await Promise.race([readyFn, new Promise((_, reject) => setTimeout(() => reject(), 8000))]).catch(() => {});
      }
    }

    shopifyFetch.value = shopifyGlobal.fetch?.bind(shopifyGlobal) ?? null;
    lastError.value = null;

    const token = await Promise.race([
      shopifyGlobal.idToken(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
    ]);

    if (token && typeof token === "string" && token.length > 0) {
      sessionToken.value = token;
      void exchangeShopifySession(token);
    }
  } catch (err) {
    lastError.value = err instanceof Error ? err.message : "Unknown error";
  }
}

const KNOWN_ROLES: RoleId[] = ["super-admin", "merchant-admin", "merchant-staff", "customer"];

function coerceRole(value?: string): RoleId {
  return KNOWN_ROLES.includes(value as RoleId) ? (value as RoleId) : "merchant-admin";
}

type ShopifySessionResponse = {
  accessToken: string;
  tenantId: string;
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    role: string;
    merchantId?: string | null;
  };
  tenants?: Array<{
    id: string;
    slug?: string | null;
    name: string;
    role: string;
    isActive?: boolean;
  }>;
};

function applySessionPayload(payload: ShopifySessionResponse) {
  const sessionUser: SessionUser = {
    id: payload.user.id,
    email: payload.user.email,
    fullName: payload.user.fullName ?? undefined,
    role: coerceRole(payload.user.role),
    tenantId: payload.tenantId,
    merchantId: payload.user.merchantId ?? payload.tenantId,
  };

  sessionStore.setSession({
    user: sessionUser,
    accessToken: payload.accessToken,
    tenants: (payload.tenants ?? []).map(tenant => ({
      ...tenant,
      role: coerceRole(tenant.role),
    })),
    tenantId: payload.tenantId,
  });
}

async function exchangeShopifySession(token: string) {
  if (!token || exchangingSession.value) return;

  const tokenSegments = token.split(".");
  if (tokenSegments.length !== 3 || tokenSegments.some(segment => segment.length === 0)) {
    lastError.value = "Invalid token";
    return;
  }

  if (sessionIssuedFor.value === token && isAuthenticated.value) return;

  exchangingSession.value = true;
  try {
    const fetcher = shopifyFetch.value ?? fetch;
    const endpointUrl = `${apiBase}/auth/shopify/session`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const response = await fetcher(endpointUrl, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ token, shop: shopDomain.value }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error ?? `HTTP ${response.status}`;
      throw new Error(message);
    }

    if (!payload?.data) {
      throw new Error("Empty response");
    }

    applySessionPayload(payload.data as ShopifySessionResponse);
    sessionIssuedFor.value = token;
    lastError.value = null;
    shopifyAuthenticated.value = true;

    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (lastError.value !== message) {
      notification.error(`Session failed: ${message}`);
    }
    lastError.value = message;
  } finally {
    exchangingSession.value = false;
  }
}

onMounted(() => {
  bootstrapAppBridge();
});

watch(
  () => sessionToken.value,
  token => {
    if (token) void exchangeShopifySession(token);
  }
);

provide("shopifySessionToken", sessionToken);
provide("shopifyShopDomain", shopDomain);

const navSections: NavSection[] = [
  {
    title: "Get Started",
    items: [
      { icon: "tabler-layout-dashboard", label: "Welcome", name: "shopify-embedded-welcome" },
      { icon: "tabler-rocket", label: "Set up", name: "shopify-embedded-setup" },
    ],
  },
  {
    title: "Commerce",
    items: [
      { icon: "tabler-package", label: "Catalog and Surfaces", name: "shopify-embedded-catalog" },
      { icon: "tabler-receipt-2", label: "Orders", name: "shopify-embedded-orders" },
      { icon: "tabler-brush", label: "Designs", name: "shopify-embedded-designs" },
      { icon: "tabler-stack-2", label: "Templates", name: "shopify-embedded-templates" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { icon: "tabler-settings", label: "General", name: "shopify-embedded-general" },
      { icon: "tabler-layout-collage", label: "Gang Sheet", name: "shopify-embedded-gang-sheet" },
      { icon: "tabler-tools", label: "Builder", name: "shopify-embedded-builder" },
      { icon: "tabler-photo", label: "Image to Sheet", name: "shopify-embedded-image-to-sheet" },
      { icon: "tabler-color-swatch", label: "Appearance", name: "shopify-embedded-appearance" },
      { icon: "tabler-photo-scan", label: "Gallery Images", name: "shopify-embedded-gallery-images" },
      { icon: "tabler-truck-delivery", label: "Print on Demand", name: "shopify-embedded-print-on-demand" },
      { icon: "tabler-coin", label: "Print Techniques", name: "shopify-embedded-print-techniques" },
      { icon: "tabler-receipt", label: "Pricing and Billing", name: "shopify-embedded-pricing" },
    ],
  },
  {
    title: "Operations",
    items: [
      { icon: "tabler-chart-line", label: "Transactions", name: "shopify-embedded-transactions" },
      { icon: "tabler-typography", label: "Fonts", name: "shopify-embedded-fonts" },
      { icon: "tabler-life-buoy", label: "Support Ticket", name: "shopify-embedded-support" },
    ],
  },
];

const activeNavName = computed(() => (typeof route.name === "string" ? route.name : ""));
const currentTitle = computed(() => (route.meta?.embeddedTitle as string | undefined) ?? (route.meta?.title as string | undefined) ?? "Workspace");
const currentSubtitle = computed(() => route.meta?.embeddedSubtitle as string | undefined);
</script>

<template>
  <div class="embedded-frame">
    <header class="topbar">
      <div class="topbar-left">
        <button type="button" class="icon-button" aria-label="Back">
          <VIcon icon="tabler-arrow-left" size="18" />
        </button>
        <div class="brand">
          <span class="brand-title">Build a Gang Sheet</span>
          <span v-if="shopDomain" class="brand-subtle">{{ shopDomain }}</span>
        </div>
      </div>
      <div class="topbar-center">
        <h1 class="page-title">{{ currentTitle }}</h1>
        <p v-if="currentSubtitle" class="page-subtitle">{{ currentSubtitle }}</p>
      </div>
      <div class="topbar-right">
        <span class="status-chip" :data-tone="statusBadge.tone">
          <VIcon icon="tabler-shield-check" size="16" />
          {{ statusBadge.text }}
        </span>
        <div class="topbar-search">
          <VTextField
            density="comfortable"
            placeholder="Search"
            variant="solo"
            hide-details
            prepend-inner-icon="tabler-search"
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
        <div v-if="!isAuthenticated && !lastError" class="auth-pending">
          <VProgressCircular indeterminate color="primary" />
          <p>Connecting to Shopify...</p>
        </div>
        <div v-else-if="lastError" class="auth-error">
          <VAlert type="error" variant="tonal">
            <div>Session error: {{ lastError }}</div>
          </VAlert>
        </div>
        <RouterView v-else v-slot="{ Component }">
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
  display: flex;
  flex-direction: column;
  background: linear-gradient(150deg, #f7f9ff 0%, #fbf4ff 50%, #f5f2ff 100%);
  color: #151833;
  min-block-size: 100vh;
}

.topbar {
  position: sticky;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(100deg, #eef1ff 0%, #d6e2ff 40%, #e9d7ff 100%);
  box-shadow: 0 18px 36px -24px rgba(38, 57, 120, 60%);
  color: #1c1f3f;
  gap: 16px;
  inset-block-start: 0;
  padding-block: 16px;
  padding-inline: 28px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-button {
  display: grid;
  border: none;
  border-radius: 50%;
  background: rgba(40, 55, 130, 12%);
  block-size: 38px;
  color: inherit;
  cursor: pointer;
  inline-size: 38px;
  place-items: center;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.icon-button:hover {
  background: rgba(40, 55, 130, 20%);
  transform: translateY(-1px);
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-size: 0.98rem;
  font-weight: 600;
}

.brand-subtle {
  color: rgba(28, 31, 63, 65%);
  font-size: 0.8rem;
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
  color: rgba(28, 31, 63, 55%);
  font-size: 0.88rem;
  margin-block: 4px 0;
  margin-inline: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(76, 120, 255, 28%);
  border-radius: 999px;
  background: rgba(76, 120, 255, 15%);
  color: #2643a7;
  font-size: 0.76rem;
  gap: 6px;
  letter-spacing: 0.04em;
  padding-block: 6px;
  padding-inline: 16px;
  text-transform: uppercase;
}

.status-chip[data-tone="success"] {
  border-color: rgba(72, 199, 148, 25%);
  background: rgba(72, 199, 148, 15%);
  color: #256f59;
}

.status-chip[data-tone="warning"] {
  background: rgba(255, 205, 102, 18%);
  color: #8a5c00;
}

.status-chip[data-tone="critical"] {
  background: rgba(255, 146, 154, 20%);
  color: #a12532;
}

.topbar-search {
  min-inline-size: 240px;
}

.profile-chip {
  display: flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 65%);
  box-shadow: 0 10px 24px -18px rgba(63, 81, 181, 60%);
  gap: 10px;
  padding-block: 8px;
  padding-inline: 16px;
}

.profile-avatar {
  display: grid;
  border-radius: 50%;
  background: linear-gradient(140deg, #5a61ff, #7c4dff);
  block-size: 30px;
  color: #fff;
  font-weight: 600;
  inline-size: 30px;
  place-items: center;
}

.profile-name {
  font-size: 0.85rem;
}

.content-shell {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: 260px 1fr;
  min-block-size: 0;
}

.sidebar {
  background: linear-gradient(180deg, #fff 0%, #eef0ff 60%, #f5f6ff 100%);
  border-inline-end: 1px solid rgba(137, 149, 255, 30%);
  color: rgba(36, 40, 73, 90%);
  overflow-y: auto;
  padding-block: 28px;
  padding-inline: 18px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.nav-section {
  color: rgba(65, 70, 110, 50%);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-block: 0 10px;
  margin-inline: 0;
  padding-inline: 10px;
  text-transform: uppercase;
}

.nav-list {
  display: grid;
  padding: 0;
  margin: 0;
  gap: 6px;
  list-style: none;
}

.nav-link {
  display: flex;
  align-items: center;
  border-radius: 12px;
  color: rgba(35, 40, 80, 85%);
  font-size: 0.95rem;
  font-weight: 500;
  gap: 12px;
  padding-block: 12px;
  padding-inline: 16px;
  text-decoration: none;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.nav-link:hover {
  background: rgba(96, 92, 220, 15%);
  color: #4631b8;
  transform: translateX(4px);
}

.nav-link.is-active {
  background: linear-gradient(120deg, #5d5af1 0%, #a855f7 100%);
  box-shadow: 0 18px 32px -18px rgba(93, 90, 241, 90%);
  color: #fff;
}

.nav-icon {
  display: grid;
  block-size: 22px;
  color: #1f1f2b;
  inline-size: 22px;
  place-items: center;
}

.nav-icon :deep(.v-icon) {
  display: grid;
  block-size: 100%;
  color: inherit;
  font-size: 20px;
  inline-size: 100%;
  place-items: center;
}

.nav-icon :deep(.v-icon > i),
.nav-icon :deep(.v-icon > span),
.nav-icon :deep(.v-icon > svg) {
  block-size: 100%;
  inline-size: 100%;
}

.nav-link.is-active .nav-icon {
  color: #fff;
}

.workspace {
  padding: 40px;
  background: transparent;
  overflow-y: auto;
}

.workspace :deep(.card) {
  border: 1px solid rgba(90, 96, 164, 12%);
  background: #fff;
  box-shadow: 0 18px 32px -24px rgba(89, 70, 201, 25%);
}

.auth-pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(28, 31, 63, 70%);
  font-size: 0.95rem;
  gap: 16px;
  min-block-size: 60vh;
}

.auth-error {
  padding: 24px;
  margin-block: 0;
  margin-inline: auto;
  max-inline-size: 600px;
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
