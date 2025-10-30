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

type ShopifyGlobal = {
  fetch?: typeof fetch;
  toast?: { show: (message: string, options?: Record<string, any>) => void };
  sessionToken?: { get: () => Promise<string> };
  idToken?: () => Promise<string>;
};

declare global {
  interface Window {
    shopify?: ShopifyGlobal;
  }
}

const shopifyApi = ref<ShopifyGlobal | null>(null);
const sessionToken = ref<string>("");
const shopifyFetch = ref<typeof fetch | null>(null);
const lastError = ref<string | null>(null);
const sessionIssuedFor = ref<string | null>(null);
const exchangingSession = ref(false);

const sessionStore = useSessionStore();
const notification = useNotificationStore();

const apiKey =
  import.meta.env.VITE_SHOPIFY_APP_API_KEY ??
  import.meta.env.VITE_SHOPIFY_API_KEY ??
  "";

const apiBase =
  (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");

const isInIframe = computed(() => {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
});

const isAuthenticated = computed(() => sessionStore.isAuthenticated);

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
  if (!apiKey) return { tone: "critical", text: "API anahtarı eksik" };
  if (!hostParam.value) return { tone: "warning", text: "Host parametresi bekleniyor" };
  if (isAuthenticated.value) return { tone: "success", text: "Shopify bağlandı" };
  if (exchangingSession.value) return { tone: "info", text: "Shopify yetkilendiriliyor…" };
  if (lastError.value) return { tone: "critical", text: "Oturum hatası" };
  if (sessionToken.value) return { tone: "info", text: "Shopify yanıtı bekleniyor…" };
  return { tone: "info", text: "Hazırlanıyor…" };
});

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
      { icon: "tabler-package", label: "Catalog & Surfaces", name: "shopify-embedded-catalog" },
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
      { icon: "tabler-receipt", label: "Pricing & Billing", name: "shopify-embedded-pricing" },
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

function waitForShopifyApi(timeout = 15000): Promise<ShopifyGlobal> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (typeof window !== "undefined" && window.shopify) {
        console.log("[shopify-layout] App Bridge API detected:", Object.keys(window.shopify));
        resolve(window.shopify);
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error("Shopify App Bridge did not initialise in time"));
        return;
      }
      setTimeout(poll, 150);
    };
    poll();
  });
}

async function getShopifySessionToken(api: ShopifyGlobal): Promise<string> {
  console.log("[shopify-layout] Attempting to get session token...");
  console.log("[shopify-layout] Available API methods:", Object.keys(api));
  
  // Try modern API first (sessionToken.get)
  if (api.sessionToken && typeof api.sessionToken.get === "function") {
    console.log("[shopify-layout] Using sessionToken.get()");
    return api.sessionToken.get();
  }
  
  // Try legacy API (idToken)
  if (typeof api.idToken === "function") {
    console.log("[shopify-layout] Using idToken()");
    return api.idToken();
  }
  
  console.error("[shopify-layout] No session token API available. API structure:", api);
  throw new Error("Shopify session token API not available");
}

async function bootstrapAppBridge() {
  console.log("[shopify-layout] Starting App Bridge bootstrap...");
  console.log("[shopify-layout] API Key:", apiKey ? `${apiKey.substring(0, 8)}...` : "MISSING");
  console.log("[shopify-layout] Host param:", hostParam.value ? "present" : "MISSING");
  console.log("[shopify-layout] Shop domain:", shopDomain.value);
  console.log("[shopify-layout] Is in iframe:", isInIframe.value);
  
  if (!apiKey) {
    lastError.value = "Missing Shopify API key - check VITE_SHOPIFY_API_KEY env variable";
    console.error("[shopify-layout]", lastError.value);
    return;
  }
  
  if (!hostParam.value) {
    lastError.value = "Missing host query parameter";
    console.error("[shopify-layout]", lastError.value);
    return;
  }

  if (!isInIframe.value && shopDomain.value && hostParam.value) {
    console.log("[shopify-layout] Not in iframe, redirecting to Shopify admin...");
    try {
      const decodedHost = atob(hostParam.value);
      const redirectUrl = `https://${decodedHost}/apps/${apiKey}/shopify/embedded${window.location.search}`;
      console.log("[shopify-layout] Redirect URL:", redirectUrl);
      window.top!.location.href = redirectUrl;
    } catch (error) {
      console.error("[shopify-layout] Failed to decode host parameter:", error);
      lastError.value = "Invalid host parameter";
    }
    return;
  }

  try {
    console.log("[shopify-layout] Waiting for Shopify App Bridge to initialize...");
    const api = await waitForShopifyApi();

    shopifyApi.value = api;
    lastError.value = null;

    shopifyFetch.value = api.fetch ? api.fetch.bind(api) : fetch;
    console.log("[shopify-layout] Shopify fetch available:", !!api.fetch);

    console.log("[shopify-layout] Getting session token from App Bridge...");
    const token = await getShopifySessionToken(api);
    console.log("[shopify-layout] Session token received, length:", token?.length || 0);
    console.log("[shopify-layout] Token preview:", token ? `${token.substring(0, 30)}...${token.substring(token.length - 10)}` : "none");
    sessionToken.value = token;
    
    // Immediately exchange session token (don't rely only on watch)
    if (token) {
      console.log("[shopify-layout] Triggering immediate session exchange...");
      void exchangeShopifySession(token);
    }
  } catch (error) {
    console.error("[shopify-layout] App Bridge init failed", error);
    lastError.value = error instanceof Error ? error.message : "Unknown App Bridge error";
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
  if (!token) {
    console.warn("[shopify-layout] No token provided, skipping session exchange");
    return;
  }
  const tokenSegments = token.split(".");
  if (tokenSegments.length !== 3 || tokenSegments.some(segment => segment.length === 0)) {
    console.error("[shopify-layout] Received malformed session token");
    lastError.value = "Shopify session token gecersiz";
    return;
  }
  if (sessionIssuedFor.value === token && isAuthenticated.value) {
    console.log("[shopify-layout] Session already exchanged for this token");
    return;
  }
  if (exchangingSession.value) {
    console.log("[shopify-layout] Session exchange already in progress, skipping");
    return;
  }

  console.log("[shopify-layout] Starting session exchange...");
  console.log("[shopify-layout] API Base:", apiBase);
  console.log("[shopify-layout] Token length:", token.length, "Shop:", shopDomain.value);
  
  exchangingSession.value = true;
  try {
    const wrappedFetch = shopifyFetch.value;
    const fetcher = wrappedFetch ?? fetch;
    const endpointUrl = `${apiBase}/auth/shopify/session`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (!wrappedFetch) {
      console.warn("[shopify-layout] Shopify authenticated fetch unavailable, falling back to window.fetch");
    }
    
    console.log("[shopify-layout] Sending POST request to:", endpointUrl);
    console.log("[shopify-layout] Request body:", { token: token.substring(0, 20) + "...", shop: shopDomain.value });
    
    const response = await fetcher(endpointUrl, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ token, shop: shopDomain.value }),
    });

    console.log("[shopify-layout] Response status:", response.status, response.statusText);
    
    const payload = await response.json().catch((e) => {
      console.error("[shopify-layout] Failed to parse JSON response:", e);
      return null;
    });
    
    if (!response.ok) {
      const message = payload?.error ?? `HTTP ${response.status}`;
      console.error("[shopify-layout] Session exchange failed:", message);
      console.error("[shopify-layout] Response payload:", payload);
      throw new Error(message);
    }

    if (!payload?.data) {
      console.error("[shopify-layout] Empty session response");
      console.error("[shopify-layout] Full payload:", payload);
      throw new Error("Oturum doğrulama yanıtı eksik");
    }

    console.log("[shopify-layout] Session exchange successful, applying payload...");
    applySessionPayload(payload.data as ShopifySessionResponse);
    sessionIssuedFor.value = token;
    lastError.value = null;
    console.log("[shopify-layout] Session applied, isAuthenticated:", isAuthenticated.value);
  } catch (error: any) {
    const message = error?.message ?? "Bilinmeyen hata";
    console.error("[shopify-layout] Session exchange error:", error);
    console.error("[shopify-layout] Error stack:", error?.stack);
    if (lastError.value !== message) {
      notification.error(`Shopify oturum doğrulaması başarısız: ${message}`);
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
    if (!token) return;
    void exchangeShopifySession(token);
  },
);

provide("shopifyAppBridge", shopifyApi);
provide("shopifySessionToken", sessionToken);
provide("shopifyShopDomain", shopDomain);
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
        <p v-if="currentSubtitle" class="page-subtitle">
          {{ currentSubtitle }}
        </p>
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
          <p>Shopify bağlantısı kuruluyor...</p>
        </div>
        <div v-else-if="lastError" class="auth-error">
          <VAlert type="error" variant="tonal">
            <div>Shopify oturum hatası: {{ lastError }}</div>
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
