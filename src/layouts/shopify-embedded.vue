<script setup lang="ts">
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { debugLog, debugWarn, debugError } from "@/utils/debug";
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
  toast?: { show: (message: string, options?: Record<string, any>) => void };
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
  [key: string]: any;
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

const shopifyAuthenticated = ref(false);
const isAuthenticated = computed(() => shopifyAuthenticated.value || sessionStore.isAuthenticated);

const hostParam = computed<string | undefined>(() => {
  // Priority 1: Route query parameter (most reliable)
  const fromRoute = route.query.host;
  if (typeof fromRoute === "string" && fromRoute.length > 0) {
    console.log("[shopify-layout] 📍 Host from route.query:", fromRoute.substring(0, 20) + "...");
    if (typeof window !== "undefined")
      window.localStorage.setItem("shopify:host", fromRoute);
    return fromRoute;
  }

  if (typeof window === "undefined") return undefined;
  
  // Priority 2: URL search params (in case route.query missed it)
  const searchHost = new URLSearchParams(window.location.search).get("host");
  if (typeof searchHost === "string" && searchHost.length > 0) {
    console.log("[shopify-layout] 📍 Host from URL search:", searchHost.substring(0, 20) + "...");
    window.localStorage.setItem("shopify:host", searchHost);
    return searchHost;
  }

  // Priority 3: localStorage (fallback)
  const stored = window.localStorage.getItem("shopify:host");
  if (stored) {
    console.log("[shopify-layout] 📍 Host from localStorage:", stored.substring(0, 20) + "...");
  } else {
    console.error("[shopify-layout] ❌ Host parameter NOT FOUND in:");
    console.error("[shopify-layout]   - route.query.host:", route.query.host);
    console.error("[shopify-layout]   - window.location.search:", window.location.search);
    console.error("[shopify-layout]   - localStorage:", stored);
    console.error("[shopify-layout] 💡 This will cause App Bridge idToken() to timeout!");
  }
  
  return stored ?? undefined;
});

const shopDomain = computed<string | undefined>(() => {
  const fromRoute = route.query.shop;
  if (typeof fromRoute === "string" && fromRoute.length > 0) {
    if (typeof window !== "undefined")
      window.localStorage.setItem("shopify:shop", fromRoute);
    return fromRoute;
  }

  if (typeof window === "undefined") return undefined;
  const search = new URLSearchParams(window.location.search);
  const shop = search.get("shop");
  if (typeof shop === "string" && shop.length > 0) {
    window.localStorage.setItem("shopify:shop", shop);
    return shop;
  }

  const stored = window.localStorage.getItem("shopify:shop");
  return stored ?? undefined;
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

function resolveAppBridgeModule(): AppBridgeModule | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as Record<string, unknown>)["app-bridge"]
    ?? (window as unknown as Record<string, unknown>).appBridge
    ?? null;
  if (!candidate) return null;
  return candidate as AppBridgeModule;
}

function resolveAppBridgeUtilsModule(): AppBridgeUtilsModule | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as Record<string, unknown>)["app-bridge-utils"]
    ?? (window as unknown as Record<string, unknown>).appBridgeUtils
    ?? null;
  if (!candidate) return null;
  return candidate as AppBridgeUtilsModule;
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
  if (typeof document === "undefined") return;
  const head = document.head;
  if (!head) return;

  if (!apiKey) {
    console.error("[shopify-layout] ❌ Cannot inject App Bridge assets: API key missing");
    console.error("[shopify-layout] Check VITE_SHOPIFY_APP_API_KEY environment variable");
    return;
  }

  // CRITICAL: Check if meta tag exists in DOM
  let meta = head.querySelector('meta[name="shopify-api-key"]') as HTMLMetaElement | null;
  
  console.log("[shopify-layout] 🔍 Checking App Bridge meta tag...");
  console.log("[shopify-layout] Meta tag found in DOM:", !!meta);
  
  if (!meta) {
    console.warn("[shopify-layout] ⚠️ Meta tag not found in DOM, creating it dynamically...");
    meta = document.createElement("meta");
    meta.name = "shopify-api-key";
    meta.content = apiKey;
    // Insert as first child of head (Shopify requirement)
    head.insertBefore(meta, head.firstChild);
    console.log("[shopify-layout] ✅ Meta tag created and inserted");
  } else {
    if (meta.content !== apiKey) {
      console.warn("[shopify-layout] ⚠️ Meta tag content mismatch, updating...");
      meta.content = apiKey;
    }
    console.log("[shopify-layout] ✅ Meta tag verified:", meta.content.substring(0, 8) + "...");
  }

  const scriptSrc = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
  let script = Array.from(head.querySelectorAll("script"))
    .find(node => typeof node.src === "string" && node.src.includes("shopifycloud/app-bridge.js")) as HTMLScriptElement | undefined;

  if (!script) {
    script = document.createElement("script");
    script.type = "text/javascript";
    script.src = scriptSrc;
    script.defer = false;
    script.async = false;
    script.dataset.injected = "true";
    const once = <T>(event: string, handler: (ev: Event) => void) => {
      script?.addEventListener(event, handler, { once: true });
    };
    const loadPromise = new Promise<void>((resolve, reject) => {
      once("load", () => resolve());
      once("error", () => reject(new Error("Failed to load Shopify App Bridge script")));
    });
    head.appendChild(script);
    await loadPromise;
  } else if (!window["app-bridge"]) {
    await new Promise<void>(resolve => {
      const poll = () => {
        if (window["app-bridge"])
          resolve();
        else
          requestAnimationFrame(poll);
      };
      poll();
    });
  }
}


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

type ShopifyRuntimeResources = {
  appBridgeModule: AppBridgeModule | null;
  utilsModule: AppBridgeUtilsModule | null;
  legacyApi: ShopifyGlobal | null;
};

function waitForAppBridgeResources(timeout = 15000): Promise<ShopifyRuntimeResources> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const poll = () => {
      const appBridgeModule = resolveAppBridgeModule();
      const utilsModule = resolveAppBridgeUtilsModule();
      const legacyApi = resolveLegacyShopifyApi();

      if (appBridgeModule || legacyApi) {
        console.log("[shopify-layout] App Bridge runtime detected", {
          hasModule: !!appBridgeModule,
          hasLegacyApi: !!legacyApi,
          hasUtils: !!utilsModule,
        });
        resolve({ appBridgeModule, utilsModule, legacyApi });
        return;
      }

      if (Date.now() - start > timeout) {
        console.error("[shopify-layout] App Bridge runtime did not initialise within timeout");
        reject(new Error("Shopify App Bridge did not initialise in time"));
        return;
      }

      setTimeout(poll, 150);
    };

    poll();
  });
}

async function getShopifySessionToken(options: {
  appBridgeModule?: AppBridgeModule | null;
  appInstance?: ShopifyAppInstance | null;
  utilsModule?: AppBridgeUtilsModule | null;
  legacyApi?: ShopifyGlobal | null;
}): Promise<string> {
  const { appBridgeModule, appInstance, utilsModule, legacyApi } = options;

  console.log("[shopify-layout] Attempting to get session token...");

  if (appInstance && appBridgeModule) {
    const moduleActions = (appBridgeModule as unknown as { actions?: ShopifyAppBridgeActions }).actions
      ?? (appBridgeModule as unknown as { default?: { actions?: ShopifyAppBridgeActions } }).default?.actions;

    const sessionTokenAction = moduleActions?.SessionToken ?? (moduleActions as any)?.sessionToken;
    const requestFn = sessionTokenAction?.request;

    if (typeof requestFn === "function") {
      console.log("[shopify-layout] Using App Bridge actions.SessionToken.request()");
      try {
        const result = await requestFn(appInstance);
        if (typeof result === "string" && result.length > 0)
          return result;
        if (result && typeof result === "object" && typeof result.token === "string" && result.token.length > 0)
          return result.token;
      } catch (error) {
        console.error("[shopify-layout] actions.SessionToken.request() failed:", error);
      }
    }
  }

  if (appInstance && utilsModule?.getSessionToken) {
    console.log("[shopify-layout] Using app-bridge-utils.getSessionToken");
    try {
      const token = await utilsModule.getSessionToken(appInstance);
      console.log("[shopify-layout] Session token received via getSessionToken(), length:", token?.length ?? 0);
      return token;
    } catch (error) {
      console.error("[shopify-layout] getSessionToken(app) failed:", error);
      throw error instanceof Error ? error : new Error("getSessionToken(app) failed");
    }
  }

  const legacy = legacyApi ?? resolveLegacyShopifyApi();
  if (legacy?.sessionToken) {
    const sessionTokenGetter = typeof legacy.sessionToken === "function"
      ? legacy.sessionToken
      : legacy.sessionToken.get;

    if (typeof sessionTokenGetter === "function") {
      console.log("[shopify-layout] Using legacy sessionToken.get()");
      try {
        const token = await sessionTokenGetter.call(legacy.sessionToken);
        if (!token) throw new Error("sessionToken.get() returned empty token");
        console.log("[shopify-layout] Token received via sessionToken.get(), length:", token.length);
        return token;
      } catch (error) {
        console.error("[shopify-layout] sessionToken.get() failed:", error);
        throw error instanceof Error ? error : new Error("sessionToken.get() failed");
      }
    }
  }

  if (legacy?.idToken) {
    console.log("[shopify-layout] Using legacy idToken() - waiting for App Bridge ready state...");
    
    // CRITICAL: Wait for App Bridge ready state before calling idToken()
    // Modern App Bridge CDN requires this
    const readyPromise = (legacy as any).ready;
    if (readyPromise && typeof readyPromise === "function") {
      console.log("[shopify-layout] Waiting for ready() function...");
      try {
        await Promise.race([
          readyPromise(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("ready() timeout after 8 seconds")), 8000);
          }),
        ]);
        console.log("[shopify-layout] ✅ App Bridge ready() completed");
      } catch (error) {
        console.error("[shopify-layout] ⚠️ ready() timeout or failed, proceeding anyway:", error);
      }
    } else if (readyPromise && readyPromise instanceof Promise) {
      console.log("[shopify-layout] Waiting for ready Promise...");
      try {
        await Promise.race([
          readyPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("ready Promise timeout after 8 seconds")), 8000);
          }),
        ]);
        console.log("[shopify-layout] ✅ App Bridge ready Promise resolved");
      } catch (error) {
        console.error("[shopify-layout] ⚠️ ready Promise timeout or failed, proceeding anyway:", error);
      }
    } else {
      // No ready method, wait a bit for App Bridge to initialize
      console.log("[shopify-layout] No ready() method found, waiting 3 seconds...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    try {
      console.log("[shopify-layout] Calling idToken()...");
      const token = await Promise.race([
        legacy.idToken(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("idToken() timeout after 15 seconds")), 15000);
        }),
      ]);
      if (!token || token.length === 0) throw new Error("idToken() returned empty token");
      console.log("[shopify-layout] ✅ Token received via idToken(), length:", token.length);
      return token;
    } catch (error) {
      console.error("[shopify-layout] ❌ idToken() failed or timed out:", error);
      throw error instanceof Error ? error : new Error("idToken() failed");
    }
  }

  console.error("[shopify-layout] No session token API available. Legacy API state:", legacy);
  throw new Error("Shopify session token API not available");
}
async function bootstrapAppBridge() {
  debugLog("[shopify-layout] Starting App Bridge bootstrap...");
  debugLog("[shopify-layout] API Key:", apiKey ? `${apiKey.substring(0, 8)}...` : "MISSING");
  debugLog("[shopify-layout] Host param:", hostParam.value ? "present" : "MISSING");
  debugLog("[shopify-layout] Shop domain:", shopDomain.value);
  debugLog("[shopify-layout] Is in iframe:", isInIframe.value);

  if (!apiKey) {
    lastError.value = "Missing Shopify API key - check VITE_SHOPIFY_API_KEY env variable";
    debugError("[shopify-layout]", lastError.value);
    return;
  }

  if (!hostParam.value) {
    lastError.value = "Missing host query parameter";
    debugError("[shopify-layout]", lastError.value);
    return;
  }

  if (!isInIframe.value && shopDomain.value && hostParam.value) {
    debugLog("[shopify-layout] Not in iframe, redirecting to Shopify admin...");
    try {
      const decodedHost = atob(hostParam.value);
      const redirectUrl = `https://${decodedHost}/apps/${apiKey}/shopify/embedded${window.location.search}`;
      debugLog("[shopify-layout] Redirect URL:", redirectUrl);
      window.top!.location.href = redirectUrl;
    } catch (error) {
      debugError("[shopify-layout] Failed to decode host parameter:", error);
      lastError.value = "Invalid host parameter";
    }
    return;
  }

  try {
    await ensureAppBridgeAssets();

    const resources = await waitForAppBridgeResources();
    const { appBridgeModule, utilsModule } = resources;
    const initialLegacyApi = resources.legacyApi ?? resolveLegacyShopifyApi();

    let createAppFn: ((config: { apiKey: string; host: string }) => ShopifyAppInstance) | undefined;
    if (typeof appBridgeModule === "function") {
      createAppFn = appBridgeModule as unknown as (config: { apiKey: string; host: string }) => ShopifyAppInstance;
    } else if (appBridgeModule?.default && typeof appBridgeModule.default === "function") {
      createAppFn = appBridgeModule.default;
    } else if (appBridgeModule?.createApp && typeof appBridgeModule.createApp === "function") {
      createAppFn = appBridgeModule.createApp;
    } else if (window.Shopify?.AppBridge?.createApp && typeof window.Shopify.AppBridge.createApp === "function") {
      createAppFn = window.Shopify.AppBridge.createApp;
    }

    let appInstance: ShopifyAppInstance | null = null;
    if (createAppFn) {
      try {
        appInstance = createAppFn({ apiKey, host: hostParam.value! });
        debugLog("[shopify-layout] App Bridge instance created");
      } catch (error) {
        console.error("[shopify-layout] createApp() failed:", error);
        appInstance = null;
      }
    } else {
      console.warn("[shopify-layout] App Bridge createApp function not available - falling back to legacy API");
    }

    const updatedLegacyApi = resolveLegacyShopifyApi() ?? initialLegacyApi ?? null;

    shopifyAppInstance.value = appInstance;
    shopifyApi.value = appInstance ?? updatedLegacyApi;

    if (appInstance && utilsModule?.authenticatedFetch) {
      debugLog("[shopify-layout] Using authenticatedFetch from app-bridge-utils");
      shopifyFetch.value = utilsModule.authenticatedFetch(appInstance);
    } else if (updatedLegacyApi?.fetch) {
      debugLog("[shopify-layout] Using legacy embedded fetch implementation");
      shopifyFetch.value = updatedLegacyApi.fetch.bind(updatedLegacyApi);
    } else {
      debugWarn("[shopify-layout] No authenticated fetch available; falling back to window.fetch");
      shopifyFetch.value = null;
    }

    ensureAuthenticatedFetch(shopifyFetch.value ?? undefined);

    lastError.value = null;

    const token = await getShopifySessionToken({
      appBridgeModule,
      appInstance,
      utilsModule,
      legacyApi: updatedLegacyApi ?? undefined,
    });

    const tokenValue = token ?? "";
    const tokenLength = tokenValue.length;
    const tokenPreview = tokenLength > 20
      ? `${tokenValue.slice(0, 12)}...${tokenValue.slice(-8)}`
      : (token ?? "none");

    debugLog("[shopify-layout] Session token received, length:", tokenLength);
    debugLog("[shopify-layout] Token preview:", tokenPreview);
    sessionToken.value = token;

    if (token) {
      debugLog("[shopify-layout] Triggering immediate session exchange...");
      void exchangeShopifySession(token);
    }
  } catch (error) {
    debugError("[shopify-layout] App Bridge init failed", error);
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

  debugLog("[shopify-layout] Setting session with user:", sessionUser.email, "tenantId:", payload.tenantId);
  sessionStore.setSession({
    user: sessionUser,
    accessToken: payload.accessToken,
    tenants: (payload.tenants ?? []).map(tenant => ({
      ...tenant,
      role: coerceRole(tenant.role),
    })),
    tenantId: payload.tenantId,
  });
  
  // Verify session was set
  debugLog("[shopify-layout] Session set - isAuthenticated:", sessionStore.isAuthenticated, "user:", !!sessionStore.user, "token:", !!sessionStore.accessToken);
}

async function exchangeShopifySession(token: string) {
  if (!token) {
    console.warn("[shopify-layout] ⚠️ No token provided, skipping session exchange"); // Always log
    debugWarn("[shopify-layout] No token provided, skipping session exchange");
    return;
  }
  const tokenSegments = token.split(".");
  if (tokenSegments.length !== 3 || tokenSegments.some(segment => segment.length === 0)) {
    debugError("[shopify-layout] Received malformed session token");
    lastError.value = "Shopify session token gecersiz";
    return;
  }
  if (sessionIssuedFor.value === token && isAuthenticated.value) {
    debugLog("[shopify-layout] Session already exchanged for this token");
    return;
  }
  if (exchangingSession.value) {
    debugLog("[shopify-layout] Session exchange already in progress, skipping");
    return;
  }

    console.log("[shopify-layout] 🎯 Starting session exchange..."); // Always log
    console.log("[shopify-layout] 🔑 API Base:", apiBase, "Token length:", token.length, "Shop:", shopDomain.value); // Always log
    debugLog("[shopify-layout] Starting session exchange...");
    debugLog("[shopify-layout] API Base:", apiBase);
    debugLog("[shopify-layout] Token length:", token.length, "Shop:", shopDomain.value);
    
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
      debugWarn("[shopify-layout] Shopify authenticated fetch unavailable, falling back to window.fetch");
    }
    
    console.log("[shopify-layout] 🚀 Sending POST request to:", endpointUrl); // Always log
    console.log("[shopify-layout] 📦 Request body token length:", token.length, "shop:", shopDomain.value); // Always log
    debugLog("[shopify-layout] Request body:", { token: token.substring(0, 20) + "...", shop: shopDomain.value });
    
    const response = await fetcher(endpointUrl, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ token, shop: shopDomain.value }),
    });

    console.log("[shopify-layout] 📡 Response status:", response.status, response.statusText); // Always log
    debugLog("[shopify-layout] Response status:", response.status, response.statusText);
    
    const payload = await response.json().catch((e) => {
      console.error("[shopify-layout] ❌ Failed to parse JSON response:", e); // Always log
      debugError("[shopify-layout] Failed to parse JSON response:", e);
      return null;
    });
    
    if (!response.ok) {
      const message = payload?.error ?? `HTTP ${response.status}`;
      console.error("[shopify-layout] ❌ Session exchange failed:", message, payload); // Always log
      debugError("[shopify-layout] Session exchange failed:", message);
      debugError("[shopify-layout] Response payload:", payload);
      throw new Error(message);
    }

    if (!payload?.data) {
      debugError("[shopify-layout] Empty session response");
      debugError("[shopify-layout] Full payload:", payload);
      throw new Error("Oturum doğrulama yanıtı eksik");
    }

    debugLog("[shopify-layout] Session exchange successful, applying payload...");
    console.log("[shopify-layout] ✅ Session exchange successful, applying payload..."); // Always log in production
    applySessionPayload(payload.data as ShopifySessionResponse);
    sessionIssuedFor.value = token;
    lastError.value = null;
    shopifyAuthenticated.value = true;
    
    // Wait a bit for Pinia reactivity to propagate
    await new Promise(resolve => setTimeout(resolve, 100));
    
    debugLog("[shopify-layout] Session applied - isAuthenticated:", isAuthenticated.value, "sessionStore.isAuthenticated:", sessionStore.isAuthenticated, "hasAccessToken:", !!sessionStore.accessToken);
    console.log("[shopify-layout] ✅ Session applied - isAuthenticated:", isAuthenticated.value, "hasAccessToken:", !!sessionStore.accessToken); // Always log in production
  } catch (error: any) {
    const message = error?.message ?? "Bilinmeyen hata";
    debugError("[shopify-layout] Session exchange error:", error);
    debugError("[shopify-layout] Error stack:", error?.stack);
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


