export const PRODUCT_TYPES = {
  TSHIRT: 'tshirt',
  HOODIE: 'hoodie',
  CANVAS_POSTER: 'canvas-poster',
  MUG: 'mug',
  TUMBLER: 'tumbler',
  PILLOW: 'pillow',
  TOTE_BAG: 'tote-bag',
  WALL_DECAL: 'wall-decal',
  MOUSE_PAD: 'mouse-pad',
  PHONE_CASE: 'phone-case',
  CREWNECK: 'crewneck',
  BEANIE: 'beanie',
  CAP: 'cap',
  POSTER: 'poster',
  FRIDGE_MAGNET: 'fridge-magnet',
  CERAMIC_MUG: 'ceramic-mug',
  GANGSHEET: 'gangsheet',
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  [PRODUCT_TYPES.TSHIRT]: 'T-Shirt',
  [PRODUCT_TYPES.HOODIE]: 'Hoodie',
  [PRODUCT_TYPES.CANVAS_POSTER]: 'Canvas Poster',
  [PRODUCT_TYPES.MUG]: 'Mug',
  [PRODUCT_TYPES.TUMBLER]: 'Tumbler',
  [PRODUCT_TYPES.PILLOW]: 'Pillow Cover',
  [PRODUCT_TYPES.TOTE_BAG]: 'Tote Bag',
  [PRODUCT_TYPES.WALL_DECAL]: 'Wall Decal',
  [PRODUCT_TYPES.MOUSE_PAD]: 'Mouse Pad',
  [PRODUCT_TYPES.PHONE_CASE]: 'Phone Case',
  [PRODUCT_TYPES.CREWNECK]: 'Crewneck Sweatshirt',
  [PRODUCT_TYPES.BEANIE]: 'Beanie',
  [PRODUCT_TYPES.CAP]: 'Cap',
  [PRODUCT_TYPES.POSTER]: 'Poster',
  [PRODUCT_TYPES.FRIDGE_MAGNET]: 'Fridge Magnet',
  [PRODUCT_TYPES.CERAMIC_MUG]: 'Ceramic Mug',
  [PRODUCT_TYPES.GANGSHEET]: 'Gang Sheet',
};

export function getProductTypeLabel(type: ProductType | string): string {
  return PRODUCT_TYPE_LABELS[type as ProductType] || type;
}

