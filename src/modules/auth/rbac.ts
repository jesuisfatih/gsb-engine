import type { Rule } from '@/plugins/casl/ability'
import type { RoleId } from '@/modules/core/types/domain'

export const ROLE_LABELS: Record<RoleId, string> = {
  'super-admin': 'Super Admin',
  'merchant-admin': 'Merchant Admin',
  'merchant-staff': 'Merchant Staff',
  'customer': 'Customer',
}

export const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  'super-admin': 'Platform owner with full visibility and global configuration rights.',
  'merchant-admin': 'Controls a merchant workspace, templates, catalog, pricing, and orders.',
  'merchant-staff': 'Runs day-to-day production, fulfillment, and order handoff tasks.',
  'customer': 'Creates designs, places orders, and manages personal assets.',
}

const customerRules: Rule[] = [
  { action: 'read', subject: 'CustomerHome' },
  { action: 'read', subject: 'ProductCatalog' },
  { action: 'read', subject: 'TemplateLibrary' },
  { action: 'create', subject: 'Design' },
  { action: 'update', subject: 'Design' },
  { action: 'read', subject: 'Editor' },
  { action: 'create', subject: 'Order' },
  { action: 'read', subject: 'Order' },
]

const merchantStaffRules: Rule[] = [
  { action: 'read', subject: 'StaffWorkspace' },
  { action: 'read', subject: 'Merchant' },
  { action: 'read', subject: 'TemplateLibrary' },
  { action: 'read', subject: 'ProductCatalog' },
  { action: 'read', subject: 'Pricing' },
  { action: 'update', subject: 'Design' },
  { action: 'read', subject: 'Editor' },
  { action: 'read', subject: 'Order' },
  { action: 'update', subject: 'Production' },
  { action: 'update', subject: 'Fulfillment' },
  { action: 'read', subject: 'Report' },
]

const merchantAdminRules: Rule[] = [
  { action: 'read', subject: 'MerchantDashboard' },
  { action: 'manage', subject: 'Merchant' },
  { action: 'manage', subject: 'TemplateLibrary' },
  { action: 'manage', subject: 'ProductCatalog' },
  { action: 'manage', subject: 'Technique' },
  { action: 'manage', subject: 'Pricing' },
  { action: 'manage', subject: 'Design' },
  { action: 'manage', subject: 'Editor' },
  { action: 'manage', subject: 'Order' },
  { action: 'manage', subject: 'Production' },
  { action: 'manage', subject: 'Fulfillment' },
  { action: 'read', subject: 'Report' },
]

const superAdminRules: Rule[] = [
  { action: 'read', subject: 'SuperAdminDashboard' },
  { action: 'manage', subject: 'all' },
]

const ROLE_ABILITY_MAP: Record<RoleId, Rule[]> = {
  'super-admin': superAdminRules,
  'merchant-admin': merchantAdminRules,
  'merchant-staff': merchantStaffRules,
  'customer': customerRules,
}

export const ELEVATED_ROLES: RoleId[] = ['super-admin', 'merchant-admin']
export const STAFF_ROLES: RoleId[] = ['merchant-admin', 'merchant-staff']
export const CUSTOMER_ROLES: RoleId[] = ['customer']
export const DEFAULT_ROLE: RoleId = 'customer'

export function abilitiesForRole(role: RoleId): Rule[] {
  return ROLE_ABILITY_MAP[role] ?? customerRules
}

export function isRoleAvailable(role: RoleId): boolean {
  return role in ROLE_ABILITY_MAP
}
