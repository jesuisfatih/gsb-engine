import { ofetch } from 'ofetch'

declare global {
  interface Window {
    __shopifyAuthenticatedFetch?: typeof fetch;
  }
}

function resolveShopifyFetch(): typeof fetch {
  if (typeof window !== 'undefined') {
    const custom = window.__shopifyAuthenticatedFetch;
    if (typeof custom === 'function')
      return custom;
  }

  return fetch;
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie)
    return null

  const segments = document.cookie.split('; ')
  for (const segment of segments) {
    if (!segment)
      continue
    const [key, ...rest] = segment.split('=')
    if (key === name)
      return decodeURIComponent(rest.join('='))
  }

  return null
}

function resolveAccessToken(): string | null {
  if (typeof window === 'undefined')
    return null

  const accessToken = readCookieValue('accessToken')
  if (accessToken)
    return accessToken

  const sid = readCookieValue('sid')
  if (sid)
    return sid

  const hostSid = readCookieValue('__Host-sid')
  if (hostSid)
    return hostSid

  return window.localStorage.getItem('gsb:accessToken')
}

function resolveTenantId(): string | undefined {
  if (typeof window === 'undefined')
    return undefined

  const cookieTenant = readCookieValue('tenantId')
  if (cookieTenant)
    return cookieTenant

  const stored = window.localStorage.getItem('gsb:tenantId')
  return stored ?? undefined
}

// Detect if running in Shopify App Proxy iframe - SHOPIFY STANDARD WAY
function isShopifyAppProxy(): boolean {
  if (typeof window === 'undefined') return false;
  // Check if URL path starts with /apps/gsb (Shopify App Proxy pattern)
  const pathname = window.location.pathname;
  return pathname.startsWith('/apps/gsb');
}

// Get API base URL - SHOPIFY STANDARD WAY
function getApiBase(): string {
  if (isShopifyAppProxy()) {
    return '/apps/gsb/api';
  }
  return '/api';
}

export const $api = ofetch.create({
  baseURL: '/api', // Static base - will be modified in onRequest
  credentials: 'include',
  fetch: (input, init) => resolveShopifyFetch()(input as any, init as any),
  async onRequest({ request, options }) {
    // FIX: Dynamically resolve base URL for each request
    const correctBase = getApiBase();
    
    // Modify baseURL for Shopify App Proxy context
    if (typeof request === 'string' && !request.startsWith('http')) {
      if (request.startsWith('/api/')) {
        // Replace /api with correct base (either /api or /apps/gsb/api)
        options.baseURL = correctBase;
        // Remove leading /api from request path
        const pathWithoutApi = request.replace(/^\/api/, '');
        request = pathWithoutApi || '/';
        
        console.log('[api] ✅ URL rewritten:', `${correctBase}${pathWithoutApi}`);
      }
    }
    
    const headers = new Headers(options.headers ?? {})

    const accessToken = resolveAccessToken()
    if (accessToken)
      headers.set('Authorization', `Bearer ${accessToken}`)

    const tenantId = resolveTenantId()
    if (tenantId)
      headers.set('x-tenant-id', tenantId)

    options.headers = headers
  },
})
export {}
