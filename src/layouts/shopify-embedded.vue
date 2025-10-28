<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import type { RoleId, SessionUser } from "@/modules/core/types/domain";

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
      { icon: "tabler-package", label: "Catalog & Surfaces", name: "shopify-embedded-products" },
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
  if (!token) return;
  if (sessionIssuedFor.value === token && isAuthenticated.value) return;
  if (exchangingSession.value) return;

  console.log("[shopify-layout] Starting session exchange...");
  exchangingSession.value = true;
  try {
    const response = await fetch(`${apiBase}/auth/shopify/session`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, shop: shopDomain.value }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error ?? `HTTP ${response.status}`;
      console.error("[shopify-layout] Session exchange failed:", message);
      throw new Error(message);
    }

    if (!payload?.data) {
      console.error("[shopify-layout] Empty session response");
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

provide("shopifyAppBridge", appBridge);
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(150deg, #f7f9ff 0%, #fbf4ff 50%, #f5f2ff 100%);
  color: #151833;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 28px;
  background: linear-gradient(100deg, #eef1ff 0%, #d6e2ff 40%, #e9d7ff 100%);
  color: #1c1f3f;
  box-shadow: 0 18px 36px -24px rgba(38, 57, 120, 0.6);
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
  background: rgba(40, 55, 130, 0.12);
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
  background: rgba(40, 55, 130, 0.2);
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
  color: rgba(28, 31, 63, 0.65);
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
  color: rgba(28, 31, 63, 0.55);
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
  background: rgba(76, 120, 255, 0.15);
  color: #2643a7;
  border: 1px solid rgba(76, 120, 255, 0.28);
}

.status-chip[data-tone="success"] {
  background: rgba(72, 199, 148, 0.15);
  color: #256f59;
  border-color: rgba(72, 199, 148, 0.25);
}

.status-chip[data-tone="warning"] {
  background: rgba(255, 205, 102, 0.18);
  color: #8a5c00;
}

.status-chip[data-tone="critical"] {
  background: rgba(255, 146, 154, 0.2);
  color: #a12532;
}

.topbar-search {
  min-width: 240px;
}

.profile-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.65);
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: 0 10px 24px -18px rgba(63, 81, 181, 0.6);
}

.profile-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(140deg, #5a61ff, #7c4dff);
  color: #ffffff;
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
  border-right: 1px solid rgba(137, 149, 255, 0.3);
  background: linear-gradient(180deg, #ffffff 0%, #eef0ff 60%, #f5f6ff 100%);
  padding: 28px 18px;
  overflow-y: auto;
  color: rgba(36, 40, 73, 0.9);
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
  color: rgba(65, 70, 110, 0.5);
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
  color: rgba(35, 40, 80, 0.85);
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.nav-link:hover {
  background: rgba(96, 92, 220, 0.15);
  color: #4631b8;
  transform: translateX(4px);
}

.nav-link.is-active {
  background: linear-gradient(120deg, #5d5af1 0%, #a855f7 100%);
  color: #ffffff;
  box-shadow: 0 18px 32px -18px rgba(93, 90, 241, 0.9);
}

.nav-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  color: #1f1f2b;
}

.nav-icon :deep(.v-icon) {
  width: 100%;
  height: 100%;
  font-size: 20px;
  display: grid;
  place-items: center;
  color: inherit;
}

.nav-icon :deep(.v-icon > i),
.nav-icon :deep(.v-icon > span),
.nav-icon :deep(.v-icon > svg) {
  width: 100%;
  height: 100%;
}

.nav-link.is-active .nav-icon {
  color: #ffffff;
}

.workspace {
  padding: 40px;
  overflow-y: auto;
  background: transparent;
}
.workspace :deep(.card) {
  background: #ffffff;
  border: 1px solid rgba(90, 96, 164, 0.12);
  box-shadow: 0 18px 32px -24px rgba(89, 70, 201, 0.25);
}

.auth-pending {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(28, 31, 63, 0.7);
  font-size: 0.95rem;
}

.auth-error {
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
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
