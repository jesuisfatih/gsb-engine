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

type ShopifyAppInstance = {
  dispatch: (...args: any[]) => unknown;
  getState?: () => unknown;
};

type ShopifyGlobal = {
  fetch?: typeof fetch;
  toast?: { show: (message: string, options?: Record<string, unknown>) => void };
  sessionToken?: { get?: () => Promise<string> | string } | (() => Promise<string>);
  idToken?: () => Promise<string>;
  ready?: (() => Promise<void>) | Promise<void>;
  app?: {
    ready?: (() => Promise<void>) | Promise<void>;
  };
};

type ShopifyAppBridgeActions = {
  SessionToken?: {
    request?: (app: ShopifyAppInstance) => Promise<string | { token?: string }>;
  };
  [key: string]: unknown;
};

type AppBridgeModule = {
  default?: (config: { apiKey: string; host: string }) => ShopifyAppInstance & { actions?: ShopifyAppBridgeActions };
  createApp?: (config: { apiKey: string; host: string }) => ShopifyAppInstance;
  actions?: ShopifyAppBridgeActions;
};

type AppBridgeUtilsModule = {
  getSessionToken?: (app: ShopifyAppInstance) => Promise<string>;
  authenticatedFetch?: (app: ShopifyAppInstance) => (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

declare global {
  interface Window {
    shopify?: ShopifyGlobal;
    Shopify?: {
      AppBridge?: {
        createApp?: (config: { apiKey: string; host: string }) => ShopifyAppInstance;
      };
    };
    __shopifyAuthenticatedFetch?: typeof fetch;
    ["app-bridge"]?: AppBridgeModule;
    ["app-bridge-utils"]?: AppBridgeUtilsModule;
    appBridge?: AppBridgeModule;
    appBridgeUtils?: AppBridgeUtilsModule;
  }
}

const shopifyApi = ref<ShopifyGlobal | ShopifyAppInstance | null>(null);
const shopifyAppInstance = ref<ShopifyAppInstance | null>(null);
const sessionToken = ref<string>("");
const shopifyFetch = ref<typeof fetch | null>(null);
const lastError = ref<string | null>(null);
const sessionIssuedFor = ref<string | null>(null);
const exchangingSession = ref(false);
const shopifyAuthenticated = ref(false);

const sessionStore = useSessionStore();
const notification = useNotificationStore();

const apiKey =
  import.meta.env.VITE_SHOPIFY_APP_API_KEY ??
  import.meta.env.VITE_SHOPIFY_API_KEY ??
  "";

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

function persistLocalValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readLocalValue(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

const hostParam = computed<string | undefined>(() => {
  const fromRoute = route.query.host;
  if (typeof fromRoute === "string" && fromRoute.length > 0) {
    if (typeof window !== "undefined") {
      persistLocalValue("shopify:host", fromRoute);
    }
    return fromRoute;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  const searchHost = new URLSearchParams(window.location.search).get("host");
  if (typeof searchHost === "string" && searchHost.length > 0) {
    persistLocalValue("shopify:host", searchHost);
    return searchHost;
  }
  return readLocalValue("shopify:host");
});

const shopDomain = computed<string | undefined>(() => {
  const fromRoute = route.query.shop;
  if (typeof fromRoute === "string" && fromRoute.length > 0) {
    if (typeof window !== "undefined") {
      persistLocalValue("shopify:shop", fromRoute);
    }
    return fromRoute;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  const searchShop = new URLSearchParams(window.location.search).get("shop");
  if (typeof searchShop === "string" && searchShop.length > 0) {
    persistLocalValue("shopify:shop", searchShop);
    return searchShop;
  }
  return readLocalValue("shopify:shop");
});

const statusBadge = computed(() => {
  if (!apiKey) return { tone: "critical", text: "API key missing" };
  if (!hostParam.value) return { tone: "warning", text: "Waiting for host parameter" };
  if (lastError.value) return { tone: "critical", text: "Session error" };
  if (exchangingSession.value) return { tone: "info", text: "Authorising with Shopify" };
  if (isAuthenticated.value) return { tone: "success", text: "Shopify connected" };
  if (sessionToken.value) return { tone: "info", text: "Awaiting confirmation" };
  return { tone: "info", text: "Preparing session" };
});

const navSections: NavSection[] = [
  {
    title: "Get Started",
    items: [
      { icon: "mdi-view-dashboard", label: "Welcome", name: "shopify-embedded-welcome" },
      { icon: "mdi-rocket-launch", label: "Set up", name: "shopify-embedded-setup" },
    ],
  },
  {
    title: "Commerce",
    items: [
      { icon: "mdi-package-variant", label: "Catalog & Surfaces", name: "shopify-embedded-catalog" },
      { icon: "mdi-receipt-text", label: "Orders", name: "shopify-embedded-orders" },
      { icon: "mdi-palette", label: "Designs", name: "shopify-embedded-designs" },
      { icon: "mdi-layers", label: "Templates", name: "shopify-embedded-templates" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { icon: "mdi-cog", label: "General", name: "shopify-embedded-general" },
      { icon: "mdi-view-grid", label: "Gang Sheet", name: "shopify-embedded-gang-sheet" },
      { icon: "mdi-tools", label: "Builder", name: "shopify-embedded-builder" },
      { icon: "mdi-image", label: "Image to Sheet", name: "shopify-embedded-image-to-sheet" },
      { icon: "mdi-palette-swatch", label: "Appearance", name: "shopify-embedded-appearance" },
      { icon: "mdi-image-multiple", label: "Gallery Images", name: "shopify-embedded-gallery-images" },
      { icon: "mdi-printer", label: "Print on Demand", name: "shopify-embedded-print-on-demand" },
      { icon: "mdi-spray", label: "Print Techniques", name: "shopify-embedded-print-techniques" },
      { icon: "mdi-receipt", label: "Pricing & Billing", name: "shopify-embedded-pricing" },
    ],
  },
  {
    title: "Operations",
    items: [
      { icon: "mdi-account-group", label: "Customers", name: "shopify-embedded-customers" },
      { icon: "mdi-chart-bar", label: "Analytics", name: "shopify-embedded-analytics" },
      { icon: "mdi-credit-card", label: "Payments", name: "shopify-embedded-payments" },
      { icon: "mdi-star", label: "Reviews", name: "shopify-embedded-reviews" },
    ],
  },
];

const activeNavName = computed(() => (typeof route.name === "string" ? route.name : ""));

const currentTitle = computed(
  () => (route.meta?.embeddedTitle as string | undefined) ?? (route.meta?.title as string | undefined) ?? "Workspace",
);

const currentSubtitle = computed(() => route.meta?.embeddedSubtitle as string | undefined);

type ShopifyRuntimeResources = {
  appBridgeModule: AppBridgeModule | null;
  utilsModule: AppBridgeUtilsModule | null;
  legacyApi: ShopifyGlobal | null;
};

function resolveAppBridgeModule(): AppBridgeModule | null {
  if (typeof window === "undefined") return null;
  const candidate = window["app-bridge"] ?? window.appBridge ?? null;
  return candidate ?? null;
}

function resolveAppBridgeUtilsModule(): AppBridgeUtilsModule | null {
  if (typeof window === "undefined") return null;
  const candidate = window["app-bridge-utils"] ?? window.appBridgeUtils ?? null;
  return candidate ?? null;
}

function resolveLegacyShopifyApi(): ShopifyGlobal | null {
  if (typeof window === "undefined") return null;
  return window.shopify ?? null;
}

function ensureAuthenticatedFetch(fetchImpl: typeof fetch | null | undefined) {
  if (typeof window === "undefined") return;
  if (typeof fetchImpl === "function") {
    window.__shopifyAuthenticatedFetch = fetchImpl;
  } else if (window.__shopifyAuthenticatedFetch) {
    delete window.__shopifyAuthenticatedFetch;
  }
}

async function ensureAppBridgeAssets(): Promise<void> {
  if (typeof document === "undefined" || !apiKey) return;
  const head = document.head;
  if (!head) return;

  let meta = head.querySelector('meta[name="shopify-api-key"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "shopify-api-key";
    meta.content = apiKey;
    head.insertBefore(meta, head.firstChild);
  } else if (meta.content !== apiKey) {
    meta.content = apiKey;
  }

  const scriptSrc = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
  let script = Array.from(head.querySelectorAll("script")).find(node =>
    typeof node.src === "string" && node.src.includes("shopifycloud/app-bridge.js"),
  ) as HTMLScriptElement | undefined;

  if (!script) {
    await new Promise<void>((resolve, reject) => {
      const newScript = document.createElement("script");
      newScript.type = "text/javascript";
      newScript.src = scriptSrc;
      newScript.async = false;
      newScript.defer = false;
      newScript.dataset.injected = "true";
      newScript.addEventListener("load", () => resolve(), { once: true });
      newScript.addEventListener("error", () => reject(new Error("Failed to load Shopify App Bridge script")), {
        once: true,
      });
      head.appendChild(newScript);
      script = newScript;
    });
  }

  if (typeof window !== "undefined" && !window["app-bridge"]) {
    await Promise.race([
      new Promise<void>(resolve => {
        const poll = () => {
          if (window["app-bridge"]) {
            resolve();
          } else {
            requestAnimationFrame(poll);
          }
        };
        poll();
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("app-bridge module load timeout")), 5000)
      ),
    ]).catch(() => {
      // Module didn't load in time, continue anyway
    });
  }
}

function waitForAppBridgeResources(timeout = 5000): Promise<ShopifyRuntimeResources> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const poll = () => {
      const appBridgeModule = resolveAppBridgeModule();
      const utilsModule = resolveAppBridgeUtilsModule();
      const legacyApi = resolveLegacyShopifyApi();

      if (appBridgeModule || legacyApi) {
        resolve({ appBridgeModule, utilsModule, legacyApi });
        return;
      }

      if (Date.now() > deadline) {
        reject(new Error("Shopify App Bridge did not initialise in time"));
        return;
      }

      setTimeout(poll, 150);
    };

    poll();
  });
}

async function waitForLegacyReady(legacy: ShopifyGlobal, timeout = 3000): Promise<void> {
  const candidate = legacy.ready ?? legacy.app?.ready;
  if (!candidate) return;

  let promise: Promise<unknown> | null = null;
  if (typeof candidate === "function") {
    try {
      const result = candidate();
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        promise = result as Promise<unknown>;
      }
    } catch {
      return;
    }
  } else if (candidate && typeof (candidate as PromiseLike<unknown>).then === "function") {
    promise = candidate as Promise<unknown>;
  }
  if (!promise) return;

  await Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Shopify ready timeout")), timeout)),
  ]).catch(() => undefined);
}

async function retrieveSessionToken(options: {
  appBridgeModule?: AppBridgeModule | null;
  appInstance?: ShopifyAppInstance | null;
  utilsModule?: AppBridgeUtilsModule | null;
  legacyApi?: ShopifyGlobal | null;
}): Promise<string> {
  const { appBridgeModule, appInstance, utilsModule } = options;
  const legacyApi = options.legacyApi ?? resolveLegacyShopifyApi();

  if (appInstance && appBridgeModule) {
    const actions = appBridgeModule.actions ?? appBridgeModule.default?.actions;
    const requestFn = actions?.SessionToken?.request ?? (actions as Record<string, any> | undefined)?.sessionToken?.request;
    if (typeof requestFn === "function") {
      const result = await requestFn(appInstance);
      if (typeof result === "string" && result.length > 0) return result;
      if (result && typeof result === "object") {
        const token = (result as { token?: string }).token;
        if (typeof token === "string" && token.length > 0) return token;
      }
    }
  }

  if (appInstance && utilsModule?.getSessionToken) {
    const token = await utilsModule.getSessionToken(appInstance);
    if (typeof token === "string" && token.length > 0) return token;
  }

  if (legacyApi?.sessionToken) {
    const getter = typeof legacyApi.sessionToken === "function"
      ? legacyApi.sessionToken
      : legacyApi.sessionToken.get;
    if (typeof getter === "function") {
      const token = await getter.call(legacyApi.sessionToken);
      if (typeof token === "string" && token.length > 0) return token;
    }
  }

  if (legacyApi?.idToken) {
    await waitForLegacyReady(legacyApi);
    const token = await Promise.race([
      legacyApi.idToken(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Shopify idToken timeout")), 6000)),
    ]);
    if (typeof token === "string" && token.length > 0) return token;
  }

  throw new Error("Unable to obtain Shopify session token");
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
  if (!/^[^.]+\.[^.]+\.[^.]+$/.test(token)) {
    const message = "Shopify session token is invalid";
    if (lastError.value !== message) {
      notification.error(message);
    }
    lastError.value = message;
    return;
  }
  if (sessionIssuedFor.value === token && isAuthenticated.value) return;
  if (exchangingSession.value) return;

  exchangingSession.value = true;

  try {
    const fetcher = shopifyFetch.value ?? fetch;
    const response = await fetcher(`${apiBase}/auth/shopify/session`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token, shop: shopDomain.value }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`;
      if (lastError.value !== message) {
        notification.error(`Shopify session exchange failed: ${message}`);
      }
      lastError.value = message;
      return;
    }

    if (!payload?.data) {
      const message = "Shopify session payload is missing";
      if (lastError.value !== message) {
        notification.error(message);
      }
      lastError.value = message;
      return;
    }

    applySessionPayload(payload.data as ShopifySessionResponse);
    sessionIssuedFor.value = token;
    lastError.value = null;
    shopifyAuthenticated.value = true;

    await new Promise(resolve => setTimeout(resolve, 80));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (lastError.value !== message) {
      notification.error(`Shopify session exchange failed: ${message}`);
    }
    lastError.value = message;
  } finally {
    exchangingSession.value = false;
  }
}

async function bootstrapAppBridge() {
  if (!apiKey) {
    const message = "Missing Shopify API key";
    lastError.value = message;
    notification.error(message);
    return;
  }

  const host = hostParam.value;
  if (!host) {
    lastError.value = "Missing Shopify host parameter";
    return;
  }

  if (!isInIframe.value && shopDomain.value && typeof window !== "undefined") {
    try {
      const decodedHost = atob(host);
      const query = window.location.search ?? "";
      window.top?.location.replace(`https://${decodedHost}/apps/${apiKey}/shopify/embedded${query}`);
    } catch {
      const message = "Unable to redirect to Shopify admin";
      lastError.value = message;
      notification.error(message);
    }
    return;
  }

  try {
    await ensureAppBridgeAssets();
    const resources = await waitForAppBridgeResources();

    let appInstance = shopifyAppInstance.value;

    if (!appInstance && resources.appBridgeModule) {
      const factory =
        resources.appBridgeModule.createApp ??
        (typeof resources.appBridgeModule.default === "function"
          ? resources.appBridgeModule.default
          : undefined);
      if (factory) {
        appInstance = factory({ apiKey, host });
      }
    }

    if (appInstance) {
      shopifyAppInstance.value = appInstance;
    }

    shopifyApi.value = appInstance ?? resources.legacyApi ?? null;

    let fetchImpl: typeof fetch | null = null;
    if (appInstance && resources.utilsModule?.authenticatedFetch) {
      fetchImpl = resources.utilsModule.authenticatedFetch(appInstance);
    } else if (resources.legacyApi?.fetch) {
      fetchImpl = resources.legacyApi.fetch.bind(resources.legacyApi);
    }

    shopifyFetch.value = fetchImpl;
    ensureAuthenticatedFetch(fetchImpl ?? undefined);

    const token = await retrieveSessionToken({
      appBridgeModule: resources.appBridgeModule,
      appInstance,
      utilsModule: resources.utilsModule,
      legacyApi: resources.legacyApi,
    });

    sessionToken.value = token;
    lastError.value = null;

    if (token) {
      void exchangeShopifySession(token);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (lastError.value !== message) {
      notification.error(`Shopify App Bridge error: ${message}`);
    }
    lastError.value = message;
  }
}

onMounted(() => {
  void bootstrapAppBridge();
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
        <VBtn color="primary" variant="flat">New action</VBtn>
      </div>
    </header>

    <div class="content-shell">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">Workspace navigation</div>
          <div class="sidebar-subtitle">Quick access to every area</div>
        </div>

        <nav class="sidebar-nav" aria-label="Workspace sections">
          <template v-for="section in navSections" :key="section.title">
            <h2 class="nav-section">{{ section.title }}</h2>
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
            <div>Shopify session error: {{ lastError }}</div>
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
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9ff 0%, #eef1ff 60%, #ffffff 100%);
  color: #242849;
}

.topbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 24px 36px;
  background: #ffffff;
  border-bottom: 1px solid rgba(137, 149, 255, 0.25);
  box-shadow: 0 18px 28px -22px rgba(61, 63, 152, 0.45);
  position: sticky;
  top: 0;
  z-index: 10;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(93, 90, 241, 0.12);
  background: rgba(93, 90, 241, 0.08);
  color: #4536d3;
  transition: background 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.icon-button :deep(.v-icon) {
  color: currentColor;
}

.icon-button:hover {
  background: rgba(93, 90, 241, 0.18);
  transform: translateX(-2px);
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-subtle {
  font-size: 0.85rem;
  color: rgba(36, 40, 73, 0.6);
}

.topbar-center {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
}

.page-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e2055;
}

.page-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(36, 40, 73, 0.65);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  background: rgba(96, 92, 220, 0.12);
  color: #5d5af1;
}

.status-chip :deep(.v-icon) {
  color: currentColor;
}

.status-chip[data-tone="critical"] {
  background: rgba(220, 73, 92, 0.12);
  color: #d14358;
}

.status-chip[data-tone="warning"] {
  background: rgba(255, 186, 73, 0.16);
  color: #b06800;
}

.status-chip[data-tone="success"] {
  background: rgba(65, 180, 125, 0.16);
  color: #2e8c5d;
}

.topbar-search {
  width: 220px;
}

.content-shell {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: calc(100vh - 96px);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 32px 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f5ff 45%, #f9f9ff 100%);
  border-right: 1px solid rgba(137, 149, 255, 0.18);
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1e2055;
}

.sidebar-subtitle {
  font-size: 0.85rem;
  color: rgba(36, 40, 73, 0.6);
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
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  color: #4a4a6a;
}

.nav-icon :deep(.v-icon) {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: currentColor;
  font-size: 20px;
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
  background: transparent;
  overflow-y: auto;
}

.workspace :deep(.card) {
  border: 1px solid rgba(90, 96, 164, 0.12);
  background: #ffffff;
  box-shadow: 0 18px 32px -24px rgba(89, 70, 201, 0.25);
}

.auth-pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(28, 31, 63, 0.7);
  font-size: 0.95rem;
  gap: 16px;
  min-height: 60vh;
}

.auth-error {
  padding: 24px;
  margin: 0 auto;
  max-width: 600px;
}

@media (max-width: 1080px) {
  .content-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .topbar {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .topbar-right {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
