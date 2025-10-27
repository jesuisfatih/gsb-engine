import type { RoleId } from '@/modules/core/types/domain'

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage'

export type Subjects =
  | 'Platform'
  | 'Merchant'
  | 'TemplateLibrary'
  | 'ProductCatalog'
  | 'Technique'
  | 'Pricing'
  | 'Design'
  | 'Editor'
  | 'Order'
  | 'Production'
  | 'Fulfillment'
  | 'Report'
  | 'CustomerSupport'
  | 'all'

export interface UserAbilityRule {
  action: Actions
  subject: Subjects
}

export interface User {
  id: number
  fullName?: string
  username: string
  password: string
  avatar?: string
  email: string
  role: RoleId
  tenantId?: string
  merchantId?: string
  abilityRules: UserAbilityRule[]
}

export interface UserOut {
  userAbilityRules: User['abilityRules']
  accessToken: string
  userData: Omit<User, 'abilities' | 'password'>
}

export interface LoginResponse {
  accessToken: string
  userData: User
  userAbilityRules: User['abilityRules']
}

export interface RegisterResponse {
  accessToken: string
  userData: User
  userAbilityRules: User['abilityRules']
}
