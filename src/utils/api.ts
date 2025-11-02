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

export const $api = ofetch.create({
  baseURL: '/', // Will be resolved dynamically in onRequest
  credentials: 'include',
  fetch: (input, init) => resolveShopifyFetch()(input as any, init as any),
  async onRequest({ options, request }) {
    const headers = new Headers(options.headers ?? {})

    const accessToken = resolveAccessToken()
    if (accessToken)
      headers.set('Authorization', `Bearer ${accessToken}`)

    const tenantId = resolveTenantId()
    if (tenantId)
      headers.set('x-tenant-id', tenantId)

    options.headers = headers
    
    // DYNAMIC BASE URL RESOLUTION (lazy, per-request)
    // Check if running in Shopify App Proxy context
    if (typeof window !== 'undefined') {
      const gsbBasePath = (window as any).__GSB_BASE_PATH__;
      const gsbEmbedMode = (window as any).__GSB_EMBED_MODE__;
      
      if (gsbEmbedMode && gsbBasePath) {
        // Shopify App Proxy: prepend /apps/gsb to request
        const requestStr = String(request);
        if (requestStr.startsWith('/') && !requestStr.startsWith('/apps/gsb')) {
          // Prepend /apps/gsb to the request URL
          const newUrl = `${gsbBasePath}${request}`;
          options.baseURL = '';
          Object.defineProperty(options, 'url', { value: newUrl, writable: true });
          console.log('[api] Shopify App Proxy mode - Rewriting:', request, '→', newUrl);
          return;
        }
      }
    }
    
    // Default mode: use request as-is
    options.baseURL = '';
  },
})
export {}
