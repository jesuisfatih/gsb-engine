<!-- TÜM ORİJİNAL KOD YORUMA ALINDI - SADECE TEMEL GİRİŞ KONTROLÜ -->
<!--
<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { debugLog, debugWarn, debugError } from "@/utils/debug";

// ... TÜM ORİJİNAL KOD BURAYA YORUMA ALINDI ...
</script>

<template>
  <div class="embedded-frame">
    ... TÜM ORİJİNAL TEMPLATE BURAYA YORUMA ALINDI ...
  </div>
</template>

<style scoped>
... TÜM ORİJİNAL STYLE BURAYA YORUMA ALINDI ...
</style>
-->

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";

const route = useRoute();
const sessionStore = useSessionStore();
const isAuthenticated = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);
const sessionToken = ref<string | null>(null);

// Genel tanılama
function dumpDiagnostics(stage: string) {
  try {
    const qs = new URLSearchParams(window.location.search);
    const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const topHref = (() => { try { return window.top?.location?.href; } catch { return 'cross-origin'; } })();
    const referrer = document.referrer || 'N/A';
    const hasMeta = !!document.querySelector('meta[name="shopify-api-key"]');
    const hasScript = !!document.querySelector('script[src*="app-bridge.js"]');
    const lsHost = typeof window !== 'undefined' ? window.localStorage.getItem('shopify:host') : null;
    const authFetch = (window as any).__shopifyAuthenticatedFetch ? 'present' : 'absent';
    console.log(`[shopify-layout] 🔎 Diagnostics @ ${stage}`, {
      route: {
        name: route.name,
        path: route.path,
        fullPath: route.fullPath,
        meta: route.meta,
        query: route.query,
      },
      location: {
        href: window.location.href,
        inIframe,
        topHref,
        referrer,
      },
      appBridge: {
        meta: hasMeta,
        script: hasScript,
        windowShopifyType: typeof (window as any).shopify,
      },
      storage: { host: lsHost },
      globals: { __shopifyAuthenticatedFetch: authFetch },
      queryString: Object.fromEntries(qs.entries()),
    });
  } catch (e) {
    console.warn('[shopify-layout] diagnostics failed', e);
  }
}

// Shopify App Bridge kontrolü
async function checkShopifyConnection() {
  console.log("[shopify-layout] 🔍 Checking Shopify connection...");
  dumpDiagnostics('checkShopifyConnection/start');
  
  try {
    // 1. App Bridge script yüklendi mi?
    const script = document.querySelector('script[src*="app-bridge.js"]');
    console.log("[shopify-layout] App Bridge script found:", !!script);
    
    // 2. Meta tag var mı?
    const meta = document.querySelector('meta[name="shopify-api-key"]');
    console.log("[shopify-layout] Meta tag found:", !!meta);
    
    // 3. window.shopify var mı?
    console.log("[shopify-layout] window.shopify:", typeof window.shopify);
    
    // 4. Host parametresi var mı?
    const host = route.query.host;
    console.log("[shopify-layout] Host param:", host, "type:", typeof host);
    
    // 5. Shop parametresi var mı?
    const shop = route.query.shop;
    console.log("[shopify-layout] Shop param:", shop, "type:", typeof shop);
    
    // 6. String kontrolü
    const hostStr = typeof host === 'string' ? host : String(host || '');
    const shopStr = typeof shop === 'string' ? shop : String(shop || '');
    console.log("[shopify-layout] Host string:", hostStr, "Shop string:", shopStr);
    
    // 6. Basit sağlık sorguları
    console.log("[shopify-layout] 🔧 Starting health check...");
    try {
      console.log("[shopify-layout] 🔧 Getting API base URL...");
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
      console.log("[shopify-layout] 🔧 API base:", apiBase);
      
      const healthUrl = `${apiBase.replace(/\/+$/, '')}/health`; // server health
      console.log('[shopify-layout] 🌡️ Checking health endpoint:', healthUrl);
      
      console.log("[shopify-layout] 🔧 Making fetch request...");
      
      // Add timeout to health check (5 seconds max) - use Promise.race for compatibility
      const healthCheckPromise = fetch(healthUrl, { credentials: 'include' });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout after 5s')), 5000)
      );
      
      const resp = await Promise.race([healthCheckPromise, timeoutPromise])
        .then(r => {
          console.log('[shopify-layout] 🌡️ /health status:', (r as Response).status, 'ok:', (r as Response).ok);
          return r as Response;
        })
        .catch(err => {
          console.warn('[shopify-layout] ⚠️ Health check failed:', err?.message || err);
          return { ok: false, status: 0, err } as any;
        });
    } catch (e) {
      console.warn('[shopify-layout] health check failed', e);
    }
    
    console.log("[shopify-layout] ✅ Health check completed, continuing...");

    // 7. Session token exchange
    console.log("[shopify-layout] 🔍 Checking conditions for session exchange...");
    console.log("[shopify-layout] - host exists:", !!host, "shop exists:", !!shop);
    console.log("[shopify-layout] - host type:", typeof host, "shop type:", typeof shop);
    console.log("[shopify-layout] - hostStr length:", hostStr.length, "shopStr length:", shopStr.length);
    console.log("[shopify-layout] - hostStr truthy:", !!hostStr, "shopStr truthy:", !!shopStr);
    console.log("[shopify-layout] - hostStr value:", JSON.stringify(hostStr), "shopStr value:", JSON.stringify(shopStr));
    
    if (hostStr && shopStr) {
      console.log("[shopify-layout] 🔑 Waiting for App Bridge to be ready...");
      
      // Wait for App Bridge to be fully loaded
      let attempts = 0;
      const maxAttempts = 50; // 10 seconds
      
      while (attempts < maxAttempts) {
        if (typeof (window as any).shopify?.idToken === 'function') {
          console.log("[shopify-layout] ✅ App Bridge idToken function ready after", attempts * 200, "ms");
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (typeof (window as any).shopify?.idToken !== 'function') {
        throw new Error('App Bridge idToken function not available after waiting');
      }
      
      console.log("[shopify-layout] 🔑 Getting session token from App Bridge...");
      
      try {
        // Get token from App Bridge
        const shopify = (window as any).shopify;
        console.log("[shopify-layout] 🔍 shopify object:", typeof shopify, "idToken type:", typeof shopify?.idToken);
        
        // Wait for App Bridge to be ready before calling idToken
        if (typeof shopify?.ready === 'function') {
          console.log("[shopify-layout] ⏳ Waiting for shopify.ready()...");
          try {
            await shopify.ready();
            console.log("[shopify-layout] ✅ shopify.ready() resolved");
          } catch (readyError) {
            console.warn("[shopify-layout] ⚠️ shopify.ready() failed:", readyError);
          }
        }
        
        console.log("[shopify-layout] 🔑 Calling shopify.idToken()...");
        
        // Create timeout promise with logging
        let timeoutFired = false;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            timeoutFired = true;
            console.error("[shopify-layout] ⏱️ TIMEOUT: idToken() did not resolve within 15s");
            reject(new Error('idToken() timeout after 15s'));
          }, 15000);
        });
        
        // Create idToken promise with logging
        const idTokenPromise = shopify.idToken().then(token => {
          if (timeoutFired) {
            console.warn("[shopify-layout] ⚠️ Token received but timeout already fired");
          } else {
            console.log("[shopify-layout] ✅ idToken() promise resolved");
          }
          return token;
        }).catch(err => {
          console.error("[shopify-layout] ❌ idToken() promise rejected:", err);
          throw err;
        });
        
        const token = await Promise.race([idTokenPromise, timeoutPromise]);
        
        console.log("[shopify-layout] 🔍 Token received, type:", typeof token, "length:", token?.length);
        
        if (!token || typeof token !== 'string' || token.length === 0) {
          throw new Error('Invalid token received from App Bridge');
        }
        
        console.log("[shopify-layout] ✅ Session token received, length:", token.length);
        sessionToken.value = token;
        
        // Exchange token with backend
        console.log("[shopify-layout] 📡 Exchanging session token with backend...");
        const apiBase = (import.meta as any)?.env?.VITE_API_BASE_URL || '/api';
        const sessionUrl = `${apiBase.replace(/\/+$/, '')}/auth/shopify/session`;
        
        const response = await fetch(sessionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ token, shop: shopStr }),
        });
        
        console.log("[shopify-layout] 📡 Session exchange response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData?.error || `Session exchange failed: ${response.status}`);
        }
        
        const payload = await response.json();
        
        if (!payload?.data) {
          throw new Error('Invalid session response from backend');
        }
        
        console.log("[shopify-layout] ✅ Session exchange successful!");
        
        // Set session in store
        sessionStore.setSession({
          user: {
            id: payload.data.user.id,
            email: payload.data.user.email,
            fullName: payload.data.user.fullName || undefined,
            role: payload.data.user.role,
            tenantId: payload.data.tenantId,
            merchantId: payload.data.user.merchantId || payload.data.tenantId,
          },
          accessToken: payload.data.accessToken,
          tenants: (payload.data.tenants || []).map((t: any) => ({
            ...t,
            role: t.role || 'merchant-admin',
          })),
          tenantId: payload.data.tenantId,
        });
        
        console.log("[shopify-layout] ✅ Session stored, isAuthenticated:", sessionStore.isAuthenticated);
        
        isAuthenticated.value = true;
        error.value = null;
        
      } catch (err: any) {
        console.error("[shopify-layout] ❌ Session exchange failed:", err);
        error.value = err?.message || 'Session exchange failed';
      }
    } else {
      console.log("[shopify-layout] ⚠️ Missing required parameters");
      error.value = "Missing required parameters (host, shop)";
    }
    
  } catch (err) {
    console.error("[shopify-layout] ❌ Error:", err);
    error.value = "Connection error";
  } finally {
    dumpDiagnostics('checkShopifyConnection/end');
    loading.value = false;
  }
}

onMounted(() => {
  console.log("[shopify-layout] 🚀 Layout mounted, starting check...");
  dumpDiagnostics('onMounted');
  checkShopifyConnection();
});
</script>

<template>
  <div class="minimal-embedded-frame">
    <div class="header">
      <h1>GSB Merchant Panel</h1>
    </div>
    
    <div class="content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Bağlantı kontrol ediliyor...</p>
      </div>
      
      <div v-else-if="error" class="error">
        <h2>❌ Hata</h2>
        <p>{{ error }}</p>
        <div class="debug-info">
          <h3>Debug Bilgileri:</h3>
          <ul>
            <li>URL: {{ $route.fullPath }}</li>
            <li>Host: {{ $route.query.host || 'YOK' }}</li>
            <li>Shop: {{ $route.query.shop || 'YOK' }}</li>
            <li>App Bridge Script: {{ document.querySelector('script[src*="app-bridge.js"]') ? 'VAR' : 'YOK' }}</li>
            <li>window.shopify: {{ typeof window.shopify }}</li>
          </ul>
        </div>
      </div>
      
      <div v-else-if="isAuthenticated" class="success">
        <h2>✅ Giriş Başarılı</h2>
        <p>Merchant panel'e başarıyla giriş yapıldı.</p>
        <div class="info">
          <h3>Bağlantı Bilgileri:</h3>
          <ul>
            <li>Shop: {{ $route.query.shop }}</li>
            <li>Host: {{ $route.query.host }}</li>
            <li>App Bridge: {{ window.shopify ? 'Yüklendi' : 'Yüklenmedi' }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.minimal-embedded-frame {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.content {
  padding: 40px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.loading, .error, .success {
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error h2 {
  color: #ff6b6b;
  margin-bottom: 15px;
}

.success h2 {
  color: #51cf66;
  margin-bottom: 15px;
}

.debug-info, .info {
  margin-top: 20px;
  text-align: left;
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 8px;
}

.debug-info h3, .info h3 {
  margin-top: 0;
  color: #ffd43b;
}

.debug-info ul, .info ul {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
}

.debug-info li, .info li {
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-info li:last-child, .info li:last-child {
  border-bottom: none;
}
</style>
