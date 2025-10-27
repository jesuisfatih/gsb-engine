import type { LayerItem, PrintTech, ProductDefinition } from '@/modules/editor/types'

export type RoleId = 'super-admin' | 'merchant-admin' | 'merchant-staff' | 'customer'

export interface TenantPlan {
  id: string
  name: string
  description?: string
  seats: number
  monthlyOrderQuota: number
  storageGb: number
  features: string[]
}

export interface SupplierProfile {
  id: string
  name: string
  supportedTechniques: PrintTech[]
  regions: string[]
  slaDays: number
  contactEmail: string
  notes?: string
}

export interface MerchantBranding {
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  fonts?: string[]
  watermarkUrl?: string
}

export interface MerchantSettings {
  id: string
  tenantId: string
  name: string
  slug: string
  planId: string
  defaultLocale: string
  availableLocales: string[]
  defaultCurrency: string
  branding: MerchantBranding
  themeEmbedEnabled: boolean
}

export interface SurfaceConstraint {
  safeMarginMm: number
  bleedMm: number
  dpiMin?: number
  minFontPt?: number
  minStrokeMm?: number
  noPrintZones?: string[]
}

export interface SurfaceDefinition {
  id: string
  name: string
  widthMm: number
  heightMm: number
  previewMaskUrl?: string
  constraints: Partial<SurfaceConstraint>
  supportedTechniques?: PrintTech[]
}

export interface TechniqueRule {
  id: PrintTech
  name: string
  description?: string
  minDpi?: number
  maxColors?: number
  allowWhiteInk?: boolean
  autoMirror?: boolean
  notes?: string
}

export interface TemplateTarget {
  productSlug: string
  surfaceId: string
  defaultTechnique: PrintTech
}

export type TemplateFieldKind = 'text' | 'image' | 'number' | 'choice'

export interface TemplateField {
  id: string
  kind: TemplateFieldKind
  label: string
  required: boolean
  maxLength?: number
  options?: string[]
  locked?: boolean
}

export interface TemplateDefinition {
  id: string
  name: string
  description?: string
  ownerMerchantId?: string
  visibility: 'global' | 'merchant'
  tags?: string[]
  target: TemplateTarget
  fields: TemplateField[]
  items: LayerItem[]
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
}

export interface DesignDocument {
  id: string
  merchantId?: string
  customerId?: string
  templateId?: string
  productSlug: string
  surfaceId: string
  technique: PrintTech
  widthMm: number
  heightMm: number
  status: 'draft' | 'pending-proof' | 'approved' | 'archived'
  items: LayerItem[]
  previews: string[]
  priceSnapshot: number
  createdAt: string
  updatedAt: string
  notes?: string
}

export interface PricingRule {
  id: string
  scope: 'global' | 'tenant' | 'merchant' | 'product' | 'technique'
  merchantId?: string
  tenantId?: string
  productSlug?: string
  technique?: PrintTech
  expression: string
  minQty?: number
  maxQty?: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductionOutput {
  type: 'png' | 'pdf' | 'svg' | 'dst' | 'pes'
  url: string
  description?: string
}

export interface JobTicket {
  id: string
  orderId: string
  designId: string
  merchantId: string
  supplierId: string
  technique: PrintTech
  status: 'pending' | 'scheduled' | 'in-production' | 'ready' | 'shipped' | 'cancelled'
  scheduledAt?: string
  completedAt?: string
  outputs: ProductionOutput[]
  gangSheetId?: string
}

export interface ProductVariantMapping {
  variantId: string
  options: Record<string, string>
  surfaceIds: string[]
}

export interface MerchantCatalogItem {
  product: ProductDefinition
  enabled: boolean
  variantMappings: ProductVariantMapping[]
}

export interface RoleAssignment {
  role: RoleId
  merchantId?: string
  tenantId?: string
}

export interface SessionUser {
  id: number | string
  email: string
  fullName?: string
  avatar?: string
  role: RoleId
  merchantId?: string
  tenantId?: string
}
