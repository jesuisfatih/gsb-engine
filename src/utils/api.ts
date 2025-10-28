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

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
const normalisedBaseUrl = rawBaseUrl.replace(/\/+$/, '')

export const $api = ofetch.create({
  baseURL: normalisedBaseUrl,
  credentials: 'include',
  fetch: (input, init) => resolveShopifyFetch()(input as any, init as any),
  async onRequest({ options }) {
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
