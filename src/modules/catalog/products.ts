export type Category = "textile" | "drinkware" | "accessories" | "home_decor";
export type Technique = "digital" | "sublimation" | "screen" | "dtf" | "embroidery";

export interface TechniqueRule {
  maxColors?: number;        // serigrafi için renk limiti
  imageAllowed?: boolean;    // görsel (bitmap) izinli mi
  minTextPt?: number;        // min yazı boyutu (pt)
  minStrokeMm?: number;      // min çizgi kalınlığı (mm)
  notes?: string;
}

export interface ProductTemplate {
  id: string;
  name: string;
  category: Category;
  dpi: number;
  colors?: string[];         // varyant renkleri
  materials?: string[];      // varyant malzeme
  techniques: Technique[];
  rules: Partial<Record<Technique, TechniqueRule>>;
  area: {
    shape: "rect" | "circle";
    widthMm: number;         // baskı alanı genişlik
    heightMm: number;        // baskı alanı yükseklik
    radiusMm?: number;       // shape=circle ise
    safeMarginMm: number;    // güvenlik payı
  };
  mockup?: {
    // 2D mockup için taban görsel; (örnek amaçlı URL alanı)
    baseUrl?: string;
    // tasarımın base görsel üzerinde konumlandırılacağı yer (px cinsinden)
    placementPx?: { x: number; y: number; w: number; h: number };
  }
}

export const PRODUCTS: ProductTemplate[] = [
  {
    id: "tshirt-front",
    name: "Tişört (Ön)",
    category: "textile",
    dpi: 300,
    colors: ["White", "Black", "Navy", "Red"],
    materials: ["Cotton", "Polyester"],
    techniques: ["digital", "dtf", "screen", "embroidery"],
    rules: {
      digital:  { imageAllowed: true,  minTextPt: 6, notes: "Tam renk, fotoğraf OK." },
      dtf:      { imageAllowed: true,  minTextPt: 6, notes: "DTF film kesimi; ince detayda dikkat." },
      screen:   { imageAllowed: false, maxColors: 6, minTextPt: 8, notes: "Serigrafide bitmap yok, vektör ve düz renk." },
      embroidery:{ imageAllowed: false, minTextPt: 10, minStrokeMm: 1.2, notes: "Nakışta min dikiş/harf sınırları." }
    },
    area: { shape: "rect", widthMm: 300, heightMm: 400, safeMarginMm: 5 },
    mockup: {
      baseUrl: "", // istersen burada bir base mockup görseli kullan
      placementPx: { x: 450, y: 300, w: 1000, h: 1300 }
    }
  },
  {
    id: "mug-11oz-wrap",
    name: "Kupa 11oz (Wrap)",
    category: "drinkware",
    dpi: 300,
    colors: ["White"],
    materials: ["Ceramic"],
    techniques: ["sublimation", "dtf"],
    rules: {
      sublimation: { imageAllowed: true, minTextPt: 6, notes: "Tam sarmal, fotoğraf OK." },
      dtf: { imageAllowed: true, minTextPt: 6, notes: "DTF patch olarak uygulanır." }
    },
    area: { shape: "rect", widthMm: 200, heightMm: 85, safeMarginMm: 3 },
    mockup: {
      baseUrl: "",
      placementPx: { x: 620, y: 270, w: 780, h: 320 }
    }
  },
  {
    id: "cap-front",
    name: "Şapka (Ön Panel)",
    category: "accessories",
    dpi: 300,
    colors: ["Black", "White"],
    materials: ["Cotton"],
    techniques: ["embroidery", "dtf"],
    rules: {
      embroidery: { imageAllowed: false, minTextPt: 12, minStrokeMm: 1.4, notes: "Nakış için önerilen sınırlar." },
      dtf: { imageAllowed: true, minTextPt: 8, notes: "DTF patch olarak uygulanır." }
    },
    area: { shape: "rect", widthMm: 120, heightMm: 60, safeMarginMm: 3 },
    mockup: { baseUrl: "" }
  }
];

export function getProduct(id: string) {
  return PRODUCTS.find(p => p.id === id) ?? null;
}
export function byCategory(cat: Category) {
  return PRODUCTS.filter(p => p.category === cat);
}
