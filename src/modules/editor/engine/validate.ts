import type {
  ImageItem,
  LayerItem,
  LineItem,
  PrintTech,
  ProductSurface,
  TextItem,
} from "../types";
import { areaPx2ToIn2, pxToMm } from "../utils/units";

export type ValidationLevel = "blocker" | "warning";

export interface ValidationAutoFix {
  action: "nudge" | "grow-text" | "thicken-stroke" | "shrink-image" | "auto-pack";
  minimum?: number;
  constrainSafeArea?: boolean;
  value?: number;
}

export interface Validation {
  level: ValidationLevel;
  code: string;
  message: string;
  affected?: string[];
  autoFix?: ValidationAutoFix;
}

interface TechniqueNumericRule {
  value: number;
  severity: ValidationLevel;
}

interface TechniqueRuleConfig {
  label: string;
  minImageDpi?: TechniqueNumericRule;
  maxColors?: TechniqueNumericRule;
  minFontPx?: TechniqueNumericRule;
  minStrokePx?: TechniqueNumericRule;
  disallowRaster?: ValidationLevel;
  requireBleed?: ValidationLevel;
}

const TECH_RULES: Record<PrintTech, TechniqueRuleConfig> = {
  dtf: {
    label: "DTF transfer",
    minImageDpi: { value: 300, severity: "blocker" },
    minFontPx: { value: 9, severity: "warning" },
    minStrokePx: { value: 1, severity: "warning" },
  },
  digital: {
    label: "Digital print",
    minImageDpi: { value: 220, severity: "warning" },
    minFontPx: { value: 8, severity: "warning" },
  },
  sublimation: {
    label: "Sublimation",
    minImageDpi: { value: 200, severity: "warning" },
    requireBleed: "warning",
  },
  screen: {
    label: "Screen print",
    maxColors: { value: 6, severity: "blocker" },
    minStrokePx: { value: 2, severity: "warning" },
    disallowRaster: "warning",
  },
  embroidery: {
    label: "Embroidery",
    minFontPx: { value: 18, severity: "blocker" },
    minStrokePx: { value: 2, severity: "blocker" },
    maxColors: { value: 12, severity: "warning" },
  },
};

type VisibleLayer = LayerItem & { visible: true };

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEG2RAD = Math.PI / 180;
const MIN_FEATURE_MM = 2.5;

function collectColors(items: VisibleLayer[]) {
  const set = new Set<string>();
  for (const it of items) {
    const fill = (it as any).fill;
    if (fill) set.add(String(fill).toLowerCase());
    const stroke = (it as any).stroke;
    const strokeWidth = (it as any).strokeWidth;
    if (stroke && strokeWidth) set.add(String(stroke).toLowerCase());
  }
  return { count: set.size, palette: Array.from(set) };
}

function minFontSize(items: VisibleLayer[]) {
  const fonts = items
    .filter((it): it is TextItem => it.kind === "text")
    .map(it => it.fontSize);
  return fonts.length ? Math.min(...fonts) : Infinity;
}

function minStrokeWidth(items: VisibleLayer[]) {
  const widths: number[] = [];
  for (const it of items) {
    const width = (it as any).strokeWidth;
    if (typeof width === "number" && width > 0) widths.push(width);
  }
  return widths.length ? Math.min(...widths) : Infinity;
}

function describeLayers(layers: VisibleLayer[], limit = 3) {
  if (!layers.length) return "";
  const names = layers.map(layer => layer.name || layer.id);
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
}

function rotatePoint(px: number, py: number, cx: number, cy: number, rotation: number) {
  if (!rotation) return { x: px, y: py };
  const rad = rotation * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function getBoundingBox(item: VisibleLayer): BoundingBox | null {
  if (item.kind === "circle") {
    return { x: item.x - item.radius, y: item.y - item.radius, w: item.radius * 2, h: item.radius * 2 };
  }

  if (item.kind === "line") {
    const line = item as LineItem;
    const points = line.points;
    if (!points.length) return null;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      xs.push(points[i]);
      ys.push(points[i + 1]);
    }
    let minX = Math.min(...xs) + line.x;
    let maxX = Math.max(...xs) + line.x;
    let minY = Math.min(...ys) + line.y;
    let maxY = Math.max(...ys) + line.y;
    const w = maxX - minX;
    const h = maxY - minY;
    if (line.rotation) {
      const cx = minX + w / 2;
      const cy = minY + h / 2;
      const corners = [
        rotatePoint(minX, minY, cx, cy, line.rotation),
        rotatePoint(maxX, minY, cx, cy, line.rotation),
        rotatePoint(maxX, maxY, cx, cy, line.rotation),
        rotatePoint(minX, maxY, cx, cy, line.rotation),
      ];
      minX = Math.min(...corners.map(c => c.x));
      maxX = Math.max(...corners.map(c => c.x));
      minY = Math.min(...corners.map(c => c.y));
      maxY = Math.max(...corners.map(c => c.y));
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  const rectLike = item as ImageItem | TextItem;
  const width = (rectLike as any).width ?? 0;
  const height = (rectLike as any).height ?? 0;
  const x = rectLike.x;
  const y = rectLike.y;
  if (!(width && height)) return { x, y, w: width, h: height };

  if (!item.rotation) return { x, y, w: width, h: height };

  const cx = x + width / 2;
  const cy = y + height / 2;
  const corners = [
    rotatePoint(x, y, cx, cy, item.rotation),
    rotatePoint(x + width, y, cx, cy, item.rotation),
    rotatePoint(x + width, y + height, cx, cy, item.rotation),
    rotatePoint(x, y + height, cx, cy, item.rotation),
  ];

  const minX = Math.min(...corners.map(c => c.x));
  const maxX = Math.max(...corners.map(c => c.x));
  const minY = Math.min(...corners.map(c => c.y));
  const maxY = Math.max(...corners.map(c => c.y));

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function computeImageDpi(item: ImageItem, ppi: number): number | null {
  const sourceW = item.sourceWidth ?? item.width;
  const sourceH = item.sourceHeight ?? item.height;
  if (!sourceW || !sourceH) return null;
  const printedWidthIn = item.width / ppi;
  const printedHeightIn = item.height / ppi;
  if (!printedWidthIn || !printedHeightIn) return null;
  const dpiX = sourceW / printedWidthIn;
  const dpiY = sourceH / printedHeightIn;
  if (!isFinite(dpiX) || !isFinite(dpiY)) return null;
  return Math.min(dpiX, dpiY);
}

function resolveTechniqueRules(tech: PrintTech, surface?: ProductSurface): TechniqueRuleConfig {
  const base = { ...TECH_RULES[tech] };
  const override = surface?.techLimits?.[tech];
  if (!override) return base;

  const ensureNumericRule = (existing: TechniqueNumericRule | undefined, value?: number, fallbackSeverity: ValidationLevel = "warning") => {
    if (value === undefined) return existing;
    if (existing) return { ...existing, value };
    return { value, severity: fallbackSeverity };
  };

  base.minImageDpi = ensureNumericRule(base.minImageDpi, override.minDpi);
  base.maxColors = ensureNumericRule(base.maxColors, override.maxColors);
  base.minFontPx = ensureNumericRule(base.minFontPx, override.minFontPx);
  base.minStrokePx = ensureNumericRule(base.minStrokePx, override.minStrokePx);

  if (override.disallowRaster !== undefined) {
    base.disallowRaster = override.disallowRaster ? (base.disallowRaster ?? "warning") : undefined;
  }
  if (override.requireBleed !== undefined) {
    base.requireBleed = override.requireBleed ? (base.requireBleed ?? "warning") : undefined;
  }

  return base;
}

export function validateDesign(
  items: LayerItem[],
  surface: ProductSurface | undefined,
  technique: PrintTech,
  stageW: number,
  stageH: number,
  options?: {
    mode?: "gang" | "dtf";
    minCoverage?: number;
    autoPackSpacing?: number;
  },
) {
  const visibleItems = items.filter((item): item is VisibleLayer => Boolean(item.visible));
  const validations: Validation[] = [];
  const margin = Math.max(0, surface?.safeMarginPx ?? 16);
  const bleed = Math.max(0, surface?.bleedMarginPx ?? 0);
  const ppi = surface?.ppi ?? 300;
  const rules = resolveTechniqueRules(technique, surface);
  const isGangMode = options?.mode === "gang";
  const minimumCoverage = options?.minCoverage ?? 0.65;
  const autoPackSpacing = options?.autoPackSpacing ?? 8;
  const sheetArea = stageW * stageH;

  if (visibleItems.length === 0) {
    validations.push({
      level: "blocker",
      code: "EMPTY_CANVAS",
      message: "Add artwork to the stage before submitting for production.",
    });
  }

  const { count: colorCount } = collectColors(visibleItems);
  const hasRaster = visibleItems.some(it => it.kind === "image");
  const minFont = minFontSize(visibleItems);
  const minStroke = minStrokeWidth(visibleItems);

  let areaPx2 = 0;
  for (const it of visibleItems) {
    if (it.kind === "circle") {
      areaPx2 += Math.PI * (it.radius * it.radius);
    } else if ((it as any).width && (it as any).height) {
      areaPx2 += (it as any).width * (it as any).height;
    } else if (it.kind === "line") {
      const line = it as LineItem;
      const pts = line.points;
      for (let i = 0; i < pts.length - 2; i += 2) {
        const dx = pts[i + 2] - pts[i];
        const dy = pts[i + 3] - pts[i + 1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const sw = (line as any).strokeWidth || 1;
        areaPx2 += len * sw;
      }
    }
  }
  const areaIn2 = areaPx2ToIn2(areaPx2, ppi);

  const stageViolations: VisibleLayer[] = [];
  const safeViolations: VisibleLayer[] = [];
  const tinyElements: VisibleLayer[] = [];
  const unionBounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  let minFeatureMm = Infinity;

  for (const item of visibleItems) {
    const bounds = getBoundingBox(item);
    if (!bounds) continue;
    const maxX = bounds.x + bounds.w;
    const maxY = bounds.y + bounds.h;
    const minSidePx = Math.min(bounds.w, bounds.h);
    if (minSidePx > 0.1) {
      const featureMm = pxToMm(minSidePx, ppi);
      if (featureMm < minFeatureMm) minFeatureMm = featureMm;
      if (
        featureMm < MIN_FEATURE_MM &&
        (item.kind === "image" || item.kind === "rect" || item.kind === "circle" || item.kind === "path")
      ) {
        tinyElements.push(item);
      }
    }

    unionBounds.minX = Math.min(unionBounds.minX, bounds.x);
    unionBounds.minY = Math.min(unionBounds.minY, bounds.y);
    unionBounds.maxX = Math.max(unionBounds.maxX, maxX);
    unionBounds.maxY = Math.max(unionBounds.maxY, maxY);

    if (bounds.x < 0 || bounds.y < 0 || maxX > stageW || maxY > stageH) {
      stageViolations.push(item);
      continue;
    }

    if (margin > 0) {
      const safeRight = stageW - margin;
      const safeBottom = stageH - margin;
      if (bounds.x < margin || bounds.y < margin || maxX > safeRight || maxY > safeBottom) {
        safeViolations.push(item);
      }
    }
  }

  if (isGangMode) {
    const coverage = sheetArea > 0 ? areaPx2 / sheetArea : 0;
    if (coverage < minimumCoverage && visibleItems.length > 1) {
      validations.push({
        level: "warning",
        code: "PACK_EFFICIENCY",
        message: `Gang sheet coverage is around ${(coverage * 100).toFixed(1)}%. Run auto-pack to reduce waste.`,
        autoFix: { action: "auto-pack", value: autoPackSpacing, minimum: Math.round(coverage * 100) },
      });
    }
  }

  if (stageViolations.length) {
    validations.push({
      level: "blocker",
      code: "OUT_OF_STAGE",
      message: `Move ${stageViolations.length} layer(s) fully inside the artboard: ${describeLayers(stageViolations)}.`,
      affected: stageViolations.map(layer => layer.id),
      autoFix: { action: "nudge" },
    });
  }

  if (safeViolations.length) {
    validations.push({
      level: "blocker",
      code: "SAFE_ZONE",
      message: `Respect the safe margin (${margin}px): ${describeLayers(safeViolations)} spill outside the safe area.`,
      affected: safeViolations.map(layer => layer.id),
      autoFix: { action: "nudge", constrainSafeArea: true },
    });
  }

  if (tinyElements.length) {
    validations.push({
      level: "warning",
      code: "TINY_FEATURE",
      message: `Some elements are smaller than ${MIN_FEATURE_MM}mm and may not hold on press: ${describeLayers(tinyElements)}.`,
      affected: tinyElements.map(layer => layer.id),
    });
  }

  const imageItems = visibleItems.filter((item): item is ImageItem & VisibleLayer => item.kind === "image");
  const dpiRecords = imageItems.map(img => ({ item: img, dpi: computeImageDpi(img, ppi) }));
  const lowestImageDpi = dpiRecords.reduce<number | null>((acc, rec) => {
    if (rec.dpi === null) return acc;
    if (acc === null) return rec.dpi;
    return Math.min(acc, rec.dpi);
  }, null);

  if (rules.minImageDpi && dpiRecords.length) {
    const offenders = dpiRecords.filter(rec => rec.dpi !== null && rec.dpi < rules.minImageDpi!.value);
    if (offenders.length) {
      validations.push({
        level: rules.minImageDpi.severity,
        code: "LOW_DPI",
        message: `Image resolution must be at least ${rules.minImageDpi.value} DPI for ${rules.label}. Fix ${describeLayers(offenders.map(o => o.item))}.`,
        affected: offenders.map(o => o.item.id),
        autoFix: { action: "shrink-image", minimum: rules.minImageDpi.value },
      });
    }
  }

  if (rules.maxColors && colorCount > rules.maxColors.value) {
    validations.push({
      level: rules.maxColors.severity,
      code: "COLOR_LIMIT",
      message: `${rules.label} allows up to ${rules.maxColors.value} spot colours; current design uses ${colorCount}.`,
    });
  }

  if (rules.disallowRaster && hasRaster) {
    validations.push({
      level: rules.disallowRaster,
      code: "RASTER_NOT_ALLOWED",
      message: `${rules.label} requires vector artwork. Remove raster images: ${describeLayers(imageItems)}.`,
      affected: imageItems.map(img => img.id),
    });
  }

  if (rules.minFontPx) {
    const offenders = visibleItems.filter((item): item is TextItem & VisibleLayer => item.kind === "text" && item.fontSize < rules.minFontPx!.value);
    if (offenders.length) {
      validations.push({
        level: rules.minFontPx.severity,
        code: "FONT_MIN",
        message: `Minimum font size for ${rules.label} is ${rules.minFontPx.value}px. Adjust ${describeLayers(offenders)}.`,
        affected: offenders.map(o => o.id),
        autoFix: { action: "grow-text", minimum: rules.minFontPx.value },
      });
    }
  }

  if (rules.minStrokePx) {
    const offenders = visibleItems.filter(layer => {
      const width = (layer as any).strokeWidth;
      return typeof width === "number" && width > 0 && width < rules.minStrokePx!.value;
    });
    if (offenders.length) {
      validations.push({
        level: rules.minStrokePx.severity,
        code: "STROKE_MIN",
        message: `Minimum stroke thickness for ${rules.label} is ${rules.minStrokePx.value}px. Thicken ${describeLayers(offenders)}.`,
        affected: offenders.map(o => o.id),
        autoFix: { action: "thicken-stroke", minimum: rules.minStrokePx.value },
      });
    }
  }

  if (areaIn2 < 4 && visibleItems.length) {
    validations.push({
      level: "warning",
      code: "AREA_LOW",
      message: `Total printed area is very small (~${areaIn2.toFixed(1)} in^2). Double-check pricing and readability.`,
    });
  }

  if (
    rules.requireBleed &&
    bleed > 0 &&
    visibleItems.length &&
    (unionBounds.minX > bleed ||
      unionBounds.minY > bleed ||
      unionBounds.maxX < stageW - bleed ||
      unionBounds.maxY < stageH - bleed)
  ) {
    validations.push({
      level: rules.requireBleed,
      code: "BLEED",
      message: `${rules.label} expects full bleed coverage (${bleed}px). Extend artwork to the edge.`,
    });
  }

  return {
    validations,
    hasErrors: validations.some(v => v.level === "blocker"),
    hasWarnings: validations.some(v => v.level === "warning"),
    stats: {
      colorCount,
      hasImage: hasRaster,
      minFontPx: minFont === Infinity ? 0 : minFont,
      minStrokePx: minStroke === Infinity ? 0 : minStroke,
      areaIn2,
      coverage: sheetArea > 0 ? Number((areaPx2 / sheetArea).toFixed(3)) : 0,
      ppi,
      lowestImageDpi: lowestImageDpi ?? undefined,
      totalImages: imageItems.length,
      minFeatureMm: minFeatureMm === Infinity ? undefined : Number(minFeatureMm.toFixed(2)),
      tinyElementCount: tinyElements.length,
    },
  };
}
