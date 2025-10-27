import { createMongoAbility } from '@casl/ability'

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage'

export type Subjects =
  | 'Platform'
  | 'Merchant'
  | 'MerchantDashboard'
  | 'SuperAdminDashboard'
  | 'StaffWorkspace'
  | 'CustomerHome'
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

export interface Rule { action: Actions; subject: Subjects }

export const ability = createMongoAbility<[Actions, Subjects]>()
