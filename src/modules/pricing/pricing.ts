import type { ProductTemplate, Technique } from "../catalog/products";

export interface PricingInput {
  product: ProductTemplate;
  technique: Technique;
  quantity: number;
  areaCm2: number;     // kullanılan alan (cm)
  colorCount: number;  // vektör renk sayısı (bitmap varsa 0 bırak)
  material?: string;
}

export interface PricingResult {
  unit: number;
  subtotal: number;
  discount: number;
  total: number;
  leadTimeDays: number;
  breakdown: {
    base: number;
    technique: number;
    colors: number;
    area: number;
  }
}

function round2(x: number) { return Math.round(x * 100) / 100; }

export function calculatePrice(input: PricingInput): PricingResult {
  const { product, technique, quantity, areaCm2, colorCount } = input;

  // Basit kategori bazlı taban maliyet (TL)
  const baseMap: Record<ProductTemplate["category"], number> = {
    textile: 80, drinkware: 70, accessories: 60, home_decor: 90
  };
  let base = baseMap[product.category] ?? 70;

  // Teknik çarpanları
  const techMul: Record<Technique, number> = {
    digital: 1.0, dtf: 1.1, sublimation: 1.15, screen: 0.9, embroidery: 1.25
  };
  const techniquePart = base * (techMul[technique] - 1);

  // Alan ek maliyeti (örnek: 0.06 TL / cm)
  const areaPart = Math.max(0, areaCm2 - 300) * 0.06;

  // Renk sayısı maliyeti (serigrafi için baskın)
  let colorPart = 0;
  if (technique === "screen" && colorCount > 1) {
    colorPart = (colorCount - 1) * 6; // ek renk başına
  }
  if (technique === "embroidery") {
    colorPart = 0; // nakışta iplik rengi maliyetini sabit sayıyoruz (basit model)
  }

  let unit = base + techniquePart + areaPart + colorPart;

  // Adet kırılımları (iskonto)
  let discountRate = 0;
  if (quantity >= 100) discountRate = 0.15;
  else if (quantity >= 50) discountRate = 0.10;
  else if (quantity >= 10) discountRate = 0.05;

  const subtotal = unit * quantity;
  const discount = round2(subtotal * discountRate);
  const total = round2(subtotal - discount);
  unit = round2(unit);

  // Basit tedarik süresi tahmini
  const leadMap: Record<Technique, number> = { digital: 2, dtf: 3, sublimation: 3, screen: 5, embroidery: 7 };

  return {
    unit, subtotal: round2(subtotal), discount, total,
    leadTimeDays: leadMap[technique] ?? 5,
    breakdown: { base: round2(base), technique: round2(techniquePart), colors: round2(colorPart), area: round2(areaPart) }
  };
}
