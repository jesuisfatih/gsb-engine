import { defineStore } from 'pinia'
import { ability } from '@/plugins/casl/ability'
import type { Rule } from '@/plugins/casl/ability'
import { abilitiesForRole, DEFAULT_ROLE } from '@/modules/auth/rbac'
import type { RoleId, SessionUser } from '@/modules/core/types/domain'
import { $api } from '@/utils/api'

export interface SessionTenant {
  id: string
  slug?: string | null
  name: string
  role: RoleId
  isActive?: boolean
}

export interface SessionState {
  user: SessionUser | null
  accessToken: string | null
  role: RoleId
  abilityRules: Rule[]
  tenants: SessionTenant[]
  activeTenantId: string | null
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined')
    return null
  return window.localStorage.getItem('gsb:accessToken')
}

function writeStoredToken(token: string | null) {
  if (typeof window === 'undefined')
    return
  if (!token)
    window.localStorage.removeItem('gsb:accessToken')
  else
    window.localStorage.setItem('gsb:accessToken', token)

  if (typeof document !== 'undefined') {
    if (!token) {
      document.cookie = 'accessToken=; Path=/; Max-Age=0; SameSite=None; Secure'
    }
    else {
      document.cookie = `accessToken=${token}; Path=/; SameSite=None; Secure`
    }
  }
}

function readStoredUser(): SessionUser | null {
  if (typeof window === 'undefined')
    return null
  const raw = window.localStorage.getItem('gsb:userData')
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

function writeStoredUser(user: SessionUser | null) {
  if (typeof window === 'undefined')
    return
  if (!user)
    window.localStorage.removeItem('gsb:userData')
  else
    window.localStorage.setItem('gsb:userData', JSON.stringify(user))
}

function updateAbility(rules: Rule[]) {
  ability.update(rules)
  useCookie('userAbilityRules').value = rules
}

function updateTenantContext(tenantId?: string | null) {
  const tenantCookie = useCookie<string | null>('tenantId', { default: () => null })
  if (tenantId) {
    tenantCookie.value = tenantId
    if (typeof window !== 'undefined')
      window.localStorage.setItem('gsb:tenantId', tenantId)
    if (typeof document !== 'undefined')
      document.cookie = `tenantId=${tenantId}; Path=/; SameSite=None; Secure`
  } else {
    tenantCookie.value = null
    if (typeof window !== 'undefined')
      window.localStorage.removeItem('gsb:tenantId')
    if (typeof document !== 'undefined')
      document.cookie = 'tenantId=; Path=/; Max-Age=0; SameSite=None; Secure'
  }
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    user: null,
    accessToken: null,
    role: DEFAULT_ROLE,
    abilityRules: abilitiesForRole(DEFAULT_ROLE),
    tenants: [],
    activeTenantId: null,
  }),

  getters: {
    isAuthenticated: state => Boolean(state.user && state.accessToken),
  },

  actions: {
    initialize() {
      const userCookie = useCookie<SessionUser | null>('userData')
      const tokenCookie = useCookie<string | null>('accessToken')
      const abilityCookie = useCookie<Rule[] | null>('userAbilityRules')

      const storedUser = userCookie.value ?? readStoredUser()
      const storedToken = tokenCookie.value ?? readStoredToken()

      if (!storedUser || !storedToken) {
        this.user = null
        this.accessToken = null
        this.role = DEFAULT_ROLE
        this.abilityRules = []
        this.tenants = []
        this.activeTenantId = null
        updateAbility([])
        updateTenantContext(null)
        abilityCookie.value = []
        writeStoredUser(null)
        writeStoredToken(null)
        return
      }

      const role = (storedUser.role ?? DEFAULT_ROLE) as RoleId
      const rules = abilityCookie.value && abilityCookie.value.length ? abilityCookie.value : abilitiesForRole(role)

      this.user = storedUser
      this.accessToken = storedToken
      this.role = role
      this.abilityRules = rules
      this.tenants = []
      this.activeTenantId = storedUser.tenantId ?? null

      updateAbility(rules)
      updateTenantContext(storedUser.tenantId ?? null)
      abilityCookie.value = rules

      if (!userCookie.value)
        userCookie.value = storedUser
      if (!tokenCookie.value)
        tokenCookie.value = storedToken

      writeStoredUser(storedUser)
      writeStoredToken(storedToken)

      if (this.accessToken)
        void this.fetchServerSession({ silent: true })
    },

    setSession(payload: {
      user: SessionUser
      accessToken: string
      abilityRules?: Rule[]
      tenantId?: string | null
      tenants?: SessionTenant[]
    }) {
      const abilityRules = payload.abilityRules && payload.abilityRules.length
        ? payload.abilityRules
        : abilitiesForRole(payload.user.role)

      const resolvedTenantId = payload.tenantId ?? payload.user.tenantId ?? this.activeTenantId ?? null
      const sessionUser: SessionUser = {
        ...payload.user,
        tenantId: resolvedTenantId ?? undefined,
        merchantId: payload.user.merchantId ?? resolvedTenantId ?? undefined,
      }

      this.user = sessionUser
      this.accessToken = payload.accessToken
      this.role = sessionUser.role
      this.abilityRules = abilityRules
      this.tenants = payload.tenants ?? this.tenants ?? []
      this.activeTenantId = resolvedTenantId

      updateAbility(abilityRules)
      updateTenantContext(resolvedTenantId)

      useCookie('userData').value = sessionUser
      useCookie('accessToken').value = payload.accessToken
      useCookie('userAbilityRules').value = abilityRules
      writeStoredUser(sessionUser)
      writeStoredToken(payload.accessToken)
    },

    clearSession() {
      this.user = null
      this.accessToken = null
      this.role = DEFAULT_ROLE
      this.abilityRules = []
      this.tenants = []
      this.activeTenantId = null

      updateAbility([])
      updateTenantContext(null)

      useCookie('userData').value = null
      useCookie('accessToken').value = null
      useCookie('userAbilityRules').value = this.abilityRules
      writeStoredUser(null)
      writeStoredToken(null)
    },

    async fetchServerSession(options?: { silent?: boolean }) {
      if (!this.accessToken)
        return

      try {
        const response = await $api<{
          user: {
            id: string
            email: string
            fullName?: string | null
            role: RoleId
            tenantId?: string | null
            merchantId?: string | null
          }
          tenants?: SessionTenant[]
          activeTenantId?: string | null
        }>('/auth/session')

        const activeTenantId = response.activeTenantId ?? response.user.tenantId ?? null

        const sessionUser: SessionUser = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName ?? undefined,
          role: response.user.role,
          tenantId: activeTenantId ?? undefined,
          merchantId: response.user.merchantId ?? activeTenantId ?? undefined,
        }

        this.setSession({
          user: sessionUser,
          accessToken: this.accessToken,
          abilityRules: abilitiesForRole(sessionUser.role),
          tenantId: activeTenantId,
          tenants: response.tenants ?? [],
        })
      }
      catch (error: any) {
        const status = error?.response?.status
        if (status === 401)
          this.clearSession()

        if (!options?.silent)
          throw error
      }
    },
  },
})
