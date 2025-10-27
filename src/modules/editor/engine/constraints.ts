import type { LayerItem } from "../../editor/types";
import type { ProductTemplate, Technique } from "../../catalog/products";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  colorCount: number;
  outOfBoundsCount: number;
  tooSmallTextCount: number;
}

function unique<T>(a: T[]) { return Array.from(new Set(a)); }

// kaba renk sayımı: text/rect/circle/line (image hariç)
function countVectorColors(items: LayerItem[]): number {
  const colors: string[] = [];
  for (const it of items) {
    if (it.kind === "text") { colors.push((it as any).fill); }
    else if (it.kind === "rect" || it.kind === "circle" || it.kind === "line") {
      const k: any = it;
      if (k.fill) colors.push(k.fill);
      if (k.stroke) colors.push(k.stroke);
    }
  }
  return unique(colors.filter(Boolean)).length;
}

export function validateDesign(items: LayerItem[], product: ProductTemplate, technique: Technique, areaPx: {x:number;y:number;w:number;h:number}, pxPerMm: number): ValidationResult {
  const res: ValidationResult = { errors: [], warnings: [], colorCount: 0, outOfBoundsCount: 0, tooSmallTextCount: 0 };

  const colors = countVectorColors(items);
  res.colorCount = colors;

  const rule = product.rules[technique];

  // Görsel (bitmap) kullanımı kontrolü
  const hasImage = items.some(i => i.kind === "image");
  if (hasImage && rule && rule.imageAllowed === false) {
    res.errors.push("Seçilen baskı tekniği görsel (bitmap) içermez.");
  }

  // Serigrafi renk limiti
  if (rule?.maxColors && colors > rule.maxColors) {
    res.errors.push(`Renk sayısı limiti aşıldı (${colors} > ${rule.maxColors}).`);
  }

  // Min yazı boyutu
  if (rule?.minTextPt) {
    for (const it of items) {
      if (it.kind === "text") {
        const fs = (it as any).fontSize as number;
        // 1pt  1.333px
        const pt = fs / 1.333;
        if (pt < rule.minTextPt) res.tooSmallTextCount++;
      }
    }
    if (res.tooSmallTextCount > 0) res.warnings.push(`Min yazı boyutu uyarısı: ${res.tooSmallTextCount} metin çok küçük.`);
  }

  // Alan dışına taşma (basit bbox)
  for (const it of items) {
    const k: any = it;
    const w = k.width ?? (k.radius ? k.radius * 2 : (k.points ? Math.abs(k.points[2] - k.points[0]) : 0));
    const h = k.height ?? (k.radius ? k.radius * 2 : (k.points ? Math.abs(k.points[3] - k.points[1]) : 0));
    const right = k.x + w, bottom = k.y + h;
    const out = (k.x < areaPx.x) || (k.y < areaPx.y) || (right > areaPx.x + areaPx.w) || (bottom > areaPx.y + areaPx.h);
    if (out) res.outOfBoundsCount++;
  }
  if (res.outOfBoundsCount > 0) res.errors.push(`Baskı alanı dışına taşan öğe var (${res.outOfBoundsCount}).`);

  // Nakış min stroke vs. burada ek kontrol edilebilir

  return res;
}
