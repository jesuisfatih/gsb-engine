import type { LayerItem, TemplatePlaceholder } from "@/modules/editor/types";

/** Product categories (match PRODUCT catalog slugs) */
export type ProductSlug =
  | "tshirt" | "hoodie" | "cap" | "mug" | "bag"
  | "pillow" | "poster" | "mousepad" | "magnet";

/** Template surface target (e.g. tshirt-front, mug-wrap) */
export interface TemplateSurfaceRef {
  productSlug: ProductSlug;
  surfaceId: string;
}

/** Template definition persisted for library/editor use */
export interface TemplateDefinition {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  thumbDataUrl?: string;        // optional preview thumbnail
  createdBy: "super" | "merchant";
  merchantId?: string;          // required when created by merchant
  target: TemplateSurfaceRef;
  defaultPrintTech?: "dtf" | "sublimation" | "screen" | "digital" | "embroidery";
  items: LayerItem[];           // serialized layer stack consumed by editor
  placeholders?: TemplatePlaceholder[]; // dynamic fields to capture user input
  createdAt: number;            // epoch ms
}
