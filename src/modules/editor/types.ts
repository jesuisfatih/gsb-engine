export type LayerKind = "image" | "text" | "rect" | "circle" | "line" | "path";

export interface NormalizedFrame {
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  scaleX?: number;
  scaleY?: number;
}

export interface BaseItem {
  id: string;
  kind: LayerKind;
  name: string;
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  normalized?: NormalizedFrame;
  template?: TemplateMeta;
}

export interface Size { width: number; height: number }

export interface ImageItem extends BaseItem, Size {
  kind: "image";
  src: string;
  sourceWidth?: number;
  sourceHeight?: number;
}

export interface TextItem extends BaseItem, Size {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: "left" | "center" | "right";
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface RectItem extends BaseItem, Size {
  kind: "rect";
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  dash?: number[];
  shadowColor?: string;
  shadowBlur?: number;
}

export interface CircleItem extends BaseItem {
  kind: "circle";
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
}

export interface LineItem extends BaseItem {
  kind: "line";
  points: number[];
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  dash?: number[];
}

export interface PathItem extends BaseItem {
  kind: "path";
  path: string;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
}

export type LayerItem = ImageItem | TextItem | RectItem | CircleItem | LineItem | PathItem;

export type PrintTech = "digital" | "sublimation" | "screen" | "dtf" | "embroidery";

export interface TemplatePlaceholder {
  key: string;
  label: string;
  type: "text" | "image";
  description?: string;
  required?: boolean;
  lockFont?: boolean;
  lockColor?: boolean;
  maxLength?: number;
  minLength?: number;
  initialValue?: string;
  defaultImageUrl?: string;
  allowedFonts?: string[];
  allowedColors?: string[];
  notes?: string;
}

export interface TemplateMeta {
  sourceTemplateId?: string;
  lockPosition?: boolean;
  lockSizing?: boolean;
  lockRotation?: boolean;
  lockStyle?: boolean;
  preventDeletion?: boolean;
  placeholder?: TemplatePlaceholder;
}

export interface TechniqueRuleOverride {
  minDpi?: number;
  maxColors?: number;
  minFontPx?: number;
  minStrokePx?: number;
  requireBleed?: boolean;
  disallowRaster?: boolean;
}

export interface ProductSurface {
  id: string;
  name: string;
  widthPx: number;
  heightPx: number;
  safeMarginPx: number;
  productId?: string;
  widthMm?: number;
  heightMm?: number;
  safeMarginMm?: number;
  bleedMarginPx?: number;
  bleedMarginMm?: number;
  ppi?: number;
  previewImage?: string;
  maskPath?: string;
  note?: string;
  noPrintZones?: string[];
  techLimits?: Partial<Record<PrintTech, TechniqueRuleOverride>>;
}

export interface ProductPricing {
  base: number;
  perSqIn?: number;
  colorAdder?: number;
  techMultipliers?: Partial<Record<PrintTech, number>>;
  quantityBreaks?: { qty: number; discountPct: number }[];
}

export interface ProductDefinition {
  id?: string;
  tenantId?: string;
  slug: string;
  title: string;
  category?: string;
  description?: string;
  materials: string[];
  colors?: string[];
  techniques?: string[];
  attributes?: Record<string, unknown>;
  pricing: ProductPricing;
  surfaces: ProductSurface[];
}
