import { saveAs } from "file-saver";
import { defineStore } from "pinia";
import type Konva from "konva";
import { loadHTMLImageFromURL } from "../utils/imageLoader";
import { autoPack } from "../engine/packer";
import { PRODUCTS } from "../data/products";
import { pxToMm, mmToPx } from "../utils/units";
import { validateDesign } from "../engine/validate";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import { FONT_LIBRARY } from "../constants/fonts";
import { $api } from "@/utils/api";
import { fetchPricingConfigs, fetchPricingQuote, type PricingQuote } from "../services/pricingService";
import type { TemplateDefinition } from "@/modules/templates/types";

import type {
  CircleItem,
  ImageItem,
  LayerItem,
  LineItem,
  NormalizedFrame,
  PathItem,
  RectItem,
  TextItem,
  PrintTech,
  ProductDefinition,
  ProductSurface,
  TemplatePlaceholder,
} from "../types";

type DesignStatusType = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "ARCHIVED";
type AutosaveHistoryKind = "autosave" | "save" | "error";
interface AutosaveHistoryEntry {
  id: string;
  timestamp: string;
  kind: AutosaveHistoryKind;
  message: string;
  status?: DesignStatusType;
}

const MAX_HISTORY_LENGTH = 30;

function uid() { return Math.random().toString(36).slice(2, 9); }
function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function computeLineBounds(points: number[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
  };
}

function approximateBounds(item: LayerItem) {
  if (item.kind === "circle") {
    return { width: item.radius * 2, height: item.radius * 2, offsetX: item.radius, offsetY: item.radius };
  }
  if (item.kind === "line") {
    const line = item as LineItem;
    const { width, height, minX, minY } = computeLineBounds(line.points);
    return { width, height, offsetX: -minX, offsetY: -minY };
  }
  const dims = item as any;
  const width = Number(dims.width) || 0;
  const height = Number(dims.height) || 0;
  return { width, height, offsetX: 0, offsetY: 0 };
}

function computeNormalizedFrame(item: LayerItem, sheetW: number, sheetH: number): NormalizedFrame {
  const safeSheetW = sheetW || 1;
  const safeSheetH = sheetH || 1;
  const norm: NormalizedFrame = {
    x: item.x / safeSheetW,
    y: item.y / safeSheetH,
  };

  switch (item.kind) {
    case "image":
    case "text":
    case "rect":
      norm.width = (item as ImageItem | TextItem | RectItem).width / safeSheetW;
      norm.height = (item as ImageItem | TextItem | RectItem).height / safeSheetH;
      break;
    case "path": {
      const pathItem = item as PathItem;
      norm.width = pathItem.width / safeSheetW;
      norm.height = pathItem.height / safeSheetH;
      norm.scaleX = pathItem.scaleX;
      norm.scaleY = pathItem.scaleY;
      break;
    }
    case "circle":
      norm.radius = (item as CircleItem).radius / safeSheetW;
      break;
    case "line": {
      const line = item as LineItem;
      norm.points = line.points.map((val, idx) => val / (idx % 2 === 0 ? safeSheetW : safeSheetH));
      const { width, height } = computeLineBounds(line.points);
      norm.width = width / safeSheetW;
      norm.height = height / safeSheetH;
      break;
    }
    default:
      break;
  }

  norm.x = clamp(norm.x, -1, 2);
  norm.y = clamp(norm.y, -1, 2);
  if (norm.width !== undefined) norm.width = clamp(norm.width, 0, 2);
  if (norm.height !== undefined) norm.height = clamp(norm.height, 0, 2);
  if (norm.radius !== undefined) norm.radius = clamp(norm.radius, 0, 2);

  return norm;
}

function applyNormalizedFrame(item: LayerItem, sheetW: number, sheetH: number) {
  const safeSheetW = sheetW || 1;
  const safeSheetH = sheetH || 1;
  const norm = item.normalized ?? computeNormalizedFrame(item, safeSheetW, safeSheetH);

  item.x = clamp(norm.x ?? 0, -1, 2) * safeSheetW;
  item.y = clamp(norm.y ?? 0, -1, 2) * safeSheetH;

  switch (item.kind) {
    case "image":
    case "text":
    case "rect": {
      const dims = item as ImageItem | TextItem | RectItem;
      const widthRatio = norm.width ?? clamp(dims.width / safeSheetW, 0, 2);
      const heightRatio = norm.height ?? clamp(dims.height / safeSheetH, 0, 2);
      dims.width = Math.max(1, Math.round(widthRatio * safeSheetW));
      dims.height = Math.max(1, Math.round(heightRatio * safeSheetH));
      break;
    }
    case "path": {
      const pathItem = item as PathItem;
      const widthRatio = norm.width ?? clamp(pathItem.width / safeSheetW, 0, 2);
      const heightRatio = norm.height ?? clamp(pathItem.height / safeSheetH, 0, 2);
      pathItem.width = Math.max(1, Math.round(widthRatio * safeSheetW));
      pathItem.height = Math.max(1, Math.round(heightRatio * safeSheetH));
      if (norm.scaleX !== undefined) pathItem.scaleX = norm.scaleX;
      if (norm.scaleY !== undefined) pathItem.scaleY = norm.scaleY;
      break;
    }
    case "circle": {
      const circle = item as CircleItem;
      const radiusRatio = norm.radius ?? clamp(circle.radius / safeSheetW, 0, 2);
      circle.radius = Math.max(1, Math.round(radiusRatio * safeSheetW));
      break;
    }
    case "line": {
      const line = item as LineItem;
      if (norm.points && norm.points.length === line.points.length) {
        line.points = norm.points.map((val, idx) => val * (idx % 2 === 0 ? safeSheetW : safeSheetH));
      }
      break;
    }
    default:
      break;
  }

  item.normalized = computeNormalizedFrame(item, safeSheetW, safeSheetH);
}

interface TemplateChecklistEntry {
  key: string;
  label: string;
  type: "text" | "image";
  required: boolean;
  status: "ok" | "warning" | "missing";
  message: string | null;
  layers: string[];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function humanizePlaceholderKey(key: string) {
  return key
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, chr => chr.toUpperCase());
}

function evaluatePlaceholder(meta: TemplatePlaceholder, layers: LayerItem[]): TemplateChecklistEntry {
  const label = meta.label?.trim() || humanizePlaceholderKey(meta.key);
  const type: "text" | "image" = meta.type ?? (layers.find(layer => layer.kind === "image") ? "image" : "text");
  const required = Boolean(meta.required);
  const layerNames = layers.map(layer => layer.name || layer.id);
  const messages: string[] = [];
  let status: "ok" | "warning" | "missing" = "ok";

  if (!layers.length) {
    status = required ? "missing" : "warning";
    messages.push(required ? "Add a layer linked to this placeholder." : "Placeholder is not used in the current design.");
    return { key: meta.key, label, type, required, status, message: messages.join(" "), layers: layerNames };
  }

  if (type === "text") {
    const textLayers = layers.filter((layer): layer is TextItem => layer.kind === "text");
    const trimmedValues = textLayers.map(layer => (layer.text ?? "").trim());
    const hasContent = trimmedValues.some(text => text.length > 0);
    if (!hasContent) {
      status = required ? "missing" : "warning";
      messages.push("Enter text for this placeholder.");
    }
    const minLength = meta.minLength ?? 0;
    if (minLength > 0 && trimmedValues.some(text => text.length > 0 && text.length < minLength)) {
      if (status !== "missing") status = "warning";
      messages.push(`Use at least ${minLength} characters.`);
    }
    const maxLength = meta.maxLength ?? 0;
    if (maxLength > 0 && trimmedValues.some(text => text.length > maxLength)) {
      if (status !== "missing") status = "warning";
      messages.push(`Limit to ${maxLength} characters.`);
    }
    if (meta.allowedFonts?.length) {
      const allowed = meta.allowedFonts.map(font => font.toLowerCase());
      const fontMismatch = textLayers.some(layer => {
        const family = (layer.fontFamily ?? "").toLowerCase();
        return !allowed.some(font => family.includes(font));
      });
      if (fontMismatch) {
        if (status !== "missing") status = "warning";
        messages.push("Uses a font outside the allowed set.");
      }
    }
  } else if (type === "image") {
    const imageLayers = layers.filter((layer): layer is ImageItem => layer.kind === "image");
    const hasImage = imageLayers.some(layer => Boolean(layer.src));
    if (!hasImage) {
      status = required ? "missing" : "warning";
      messages.push("Upload an image for this placeholder.");
    }
  }

  return {
    key: meta.key,
    label,
    type,
    required,
    status,
    message: messages.length ? messages.join(" ") : null,
    layers: layerNames,
  };
}

function computeTemplateChecklist(template: TemplateDefinition | null, items: LayerItem[]): TemplateChecklistEntry[] {
  if (!template) return [];

  const map = new Map<string, TemplatePlaceholder>();
  (template.placeholders ?? []).forEach(placeholder => map.set(placeholder.key, placeholder));

  for (const item of items) {
    const placeholder = item.template?.placeholder;
    if (!placeholder?.key) continue;
    if (!map.has(placeholder.key)) {
      map.set(placeholder.key, {
        key: placeholder.key,
        label: placeholder.label ?? humanizePlaceholderKey(placeholder.key),
        type: placeholder.type ?? (item.kind === "image" ? "image" : "text"),
        description: placeholder.description,
        required: placeholder.required,
        lockFont: placeholder.lockFont,
        lockColor: placeholder.lockColor,
        maxLength: placeholder.maxLength,
        minLength: placeholder.minLength,
        initialValue: placeholder.initialValue,
        defaultImageUrl: placeholder.defaultImageUrl,
        allowedFonts: placeholder.allowedFonts,
        allowedColors: placeholder.allowedColors,
        notes: placeholder.notes,
      });
    }
  }

  const checklist: TemplateChecklistEntry[] = [];
  map.forEach(meta => {
    const layers = items.filter(layer => layer.template?.placeholder?.key === meta.key);
    checklist.push(evaluatePlaceholder(meta, layers));
  });

  const statusRank: Record<TemplateChecklistEntry["status"], number> = { missing: 0, warning: 1, ok: 2 };
  checklist.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    if (a.status !== b.status) return statusRank[a.status] - statusRank[b.status];
    return a.label.localeCompare(b.label);
  });

  return checklist;
}

function getItemSize(item: LayerItem) {
  if (item.kind === "circle") {
    const radius = (item as CircleItem).radius ?? 0;
    const diameter = radius * 2;
    return { width: diameter, height: diameter };
  }
  if (item.kind === "line") {
    const bounds = computeLineBounds((item as LineItem).points ?? []);
    return { width: bounds.width, height: bounds.height };
  }
  return {
    width: (item as ImageItem | TextItem | RectItem | PathItem).width ?? 0,
    height: (item as ImageItem | TextItem | RectItem | PathItem).height ?? 0,
  };
}

function autoAlignToChest(item: LayerItem, sheetW: number, sheetH: number, safeMargin = 0) {
  const CHEST_CENTER_U = 0.5;
  const CHEST_CENTER_V = 0.5;
  const size = getItemSize(item);
  const innerWidth = Math.max(sheetW - safeMargin * 2, 1);
  const innerHeight = Math.max(sheetH - safeMargin * 2, 1);
  const chestX = safeMargin + innerWidth * CHEST_CENTER_U;
  const chestY = safeMargin + innerHeight * (1 - CHEST_CENTER_V);
  const alignedX = chestX - size.width / 2;
  const alignedY = chestY - size.height / 2;
  const minX = safeMargin;
  const maxX = Math.max(minX, sheetW - safeMargin - size.width);
  const minY = safeMargin;
  const maxY = Math.max(minY, sheetH - safeMargin - size.height);
  return {
    x: clamp(alignedX, minX, maxX),
    y: clamp(alignedY, minY, maxY),
  };
}

const DEFAULT_PRODUCT = PRODUCTS.find((p: ProductDefinition) => p.slug === "tshirt") ?? PRODUCTS[0];
const DEFAULT_SURFACE = DEFAULT_PRODUCT?.surfaces[0];
const DEFAULT_SAFE_MARGIN = DEFAULT_SURFACE
  ? DEFAULT_SURFACE.safeMarginPx ?? (DEFAULT_SURFACE.safeMarginMm !== undefined ? mmToPx(DEFAULT_SURFACE.safeMarginMm, DEFAULT_SURFACE.ppi ?? 300) : 16)
  : 16;

export const useEditorStore = defineStore("editor", {
  state: () => ({
    /* Tasar?m ??eleri */
    items: [] as LayerItem[],
    selectedId: null as string | null,

    /* Sahne ?l??leri (UI boyutu; containerdan gelir) */
    stageWpx: DEFAULT_SURFACE?.widthPx ?? 1400,
    stageHpx: DEFAULT_SURFACE?.heightPx ?? 800,
    viewportW: 0,
    viewportH: 0,

    /* Grid & g?r?n?m */
    gridEnabled: true,
    gridPx: 20,
    marginPx: DEFAULT_SAFE_MARGIN,

    scale: 1,
    _stage: null as Konva.Stage | null,

    /* ?r?n durumu */
    catalogCache: PRODUCTS as ProductDefinition[],
    productSlug: DEFAULT_PRODUCT?.slug ?? "tshirt",
    surfaceId: DEFAULT_SURFACE?.id ?? "tshirt-front",
    color: DEFAULT_PRODUCT?.colors?.[0] ?? "white",
    printTech: "dtf" as PrintTech,
    quantity: 1,
    designId: null as string | null,
    designSaving: false,
    lastSavedAt: null as string | null,
    lastAutosaveAt: null as string | null,
    autosaveError: null as string | null,
    designStatus: "DRAFT" as DesignStatusType,
    autosaveHistory: [] as AutosaveHistoryEntry[],

    activeTemplate: null as TemplateDefinition | null,
    activeTemplateId: null as string | null,
    templateAppliedAt: null as number | null,
    isApplyingTemplate: false,

    /* Undo/redo */
    _history: [] as LayerItem[][],
    _histIndex: -1,
    _clipboard: [] as LayerItem[],

    /* Pricing */
    pricingQuote: null as PricingQuote | null,
    pricingLoading: false,
    pricingError: null as string | null,
    pricingTechniques: {} as Record<string, { id: string; slug: string; name: string }>,
    pricingConfigsLoaded: false,
    _pricingRefreshHandle: null as ReturnType<typeof setTimeout> | null,
  }),

  getters: {
    products(): ProductDefinition[] {
      const catalog = useCatalogStore();
      return catalog.products.length ? catalog.products : this.catalogCache;
    },

    selected(state) {
      return state.items.find((i: LayerItem) => i.id === state.selectedId) ?? null;
    },

    activeProduct(): ProductDefinition | undefined {
      return this.products.find((p: ProductDefinition) => p.slug === this.productSlug);
    },

    activeSurface(): ProductSurface | undefined {
      return this.activeProduct?.surfaces.find((sf: ProductSurface) => sf.id === this.surfaceId);
    },

    sheetWpx(): number {
      return this.activeSurface?.widthPx ?? this.stageWpx;
    },

    sheetHpx(): number {
      return this.activeSurface?.heightPx ?? this.stageHpx;
    },

    gridSize(state) {
      return state.gridPx;
    },

    ppi(): number {
      return this.activeSurface?.ppi ?? 300;
    },

    safeMarginPx(): number {
      const surf = this.activeSurface;
      if (!surf) return this.marginPx;
      if (surf.safeMarginPx) return surf.safeMarginPx;
      if (surf.safeMarginMm !== undefined) return mmToPx(surf.safeMarginMm, surf.ppi ?? 300);
      return this.marginPx;
    },

    bleedMarginPx(): number {
      const surf = this.activeSurface;
      if (!surf) return 0;
      if (surf.bleedMarginPx) return surf.bleedMarginPx;
      if (surf.bleedMarginMm !== undefined) return mmToPx(surf.bleedMarginMm, surf.ppi ?? 300);
      return 0;
    },

    analysis() {
      const surf = this.activeSurface;
      const mode = this.productSlug === "gangsheet" ? "gang" : "dtf";
      const base = validateDesign(this.items, surf, this.printTech, this.sheetWpx, this.sheetHpx, {
        mode,
        autoPackSpacing: this.gridPx,
      });

      const checklist = computeTemplateChecklist(this.activeTemplate, this.items);
      const validations = [...base.validations];

      for (const entry of checklist) {
        if (entry.status === "ok") continue;
        validations.push({
          level: entry.status === "missing" ? "blocker" : "warning",
          code: entry.status === "missing" ? "TEMPLATE_PLACEHOLDER_MISSING" : "TEMPLATE_PLACEHOLDER_WARNING",
          message: entry.message ?? `${entry.label} placeholder needs attention.`,
          affected: entry.layers,
        });
      }

      const hasErrors = validations.some(entry => entry.level === "blocker");
      const hasWarnings = validations.some(entry => entry.level === "warning");

      return {
        ...base,
        validations,
        hasErrors,
        hasWarnings,
        templateChecklist: checklist,
      };
    },

    templateChecklist(): TemplateChecklistEntry[] {
      return computeTemplateChecklist(this.activeTemplate, this.items);
    },

    templateChecklistSummary() {
      const entries = this.templateChecklist;
      const missing = entries.filter(entry => entry.status === "missing").length;
      const warnings = entries.filter(entry => entry.status === "warning").length;
      return {
        total: entries.length,
        missing,
        warnings,
      };
    },

    isTemplateReady(): boolean {
      return this.templateChecklist.every(entry => entry.status !== "missing");
    },

    usedAreaIn2(): number {
      return this.analysis.stats.areaIn2;
    },

    fallbackPrice(): { unit: number; total: number } {
      const product = this.activeProduct;
      if (!product) return { unit: 0, total: 0 };
      const analysis = this.analysis;
      const colorCount = analysis.stats.colorCount;

      const areaIn2 = analysis.stats.areaIn2;

      // Fallback for anonymous users without pricing data
      const pricing = product.pricing || { base: 0, perSqIn: 0, colorAdder: 0, techMultipliers: {} };
      const perSqIn = pricing.perSqIn ?? 0;
      const colorAdder = (pricing.colorAdder ?? 0) * colorCount;
      const techMul = pricing.techMultipliers?.[this.printTech] ?? 1;
      let unit = (pricing.base + perSqIn * areaIn2 + colorAdder) * techMul;

      const breaks = pricing.quantityBreaks ?? [];
      const best = [...breaks].filter(b => this.quantity >= b.qty).sort((a, b) => b.qty - a.qty)[0];
      if (best) unit = unit * (1 - best.discountPct / 100);

      unit = Math.max(0, Math.round(unit * 100) / 100);
      return { unit, total: Math.round(unit * this.quantity * 100) / 100 };
    },

    price():
      { unit: number; total: number; currency: string; loading: boolean; error: string | null; source: "remote" | "fallback" } {
      const quote = this.pricingQuote;
      const currency = quote?.currency ?? "USD";
      if (quote) {
        return {
          unit: quote.unitPrice,
          total: quote.total,
          currency,
          loading: this.pricingLoading,
          error: this.pricingError,
          source: "remote",
        };
      }
      const fallback = this.fallbackPrice;
      return {
        unit: fallback.unit,
        total: fallback.total,
        currency,
        loading: this.pricingLoading,
        error: this.pricingError,
        source: "fallback",
      };
    },
  },

  actions: {
    setActiveTemplate(template: TemplateDefinition | null) {
      if (template) {
        this.activeTemplate = deepClone(template);
        this.activeTemplateId = template.id;
        this.templateAppliedAt = Date.now();
      } else {
        this.activeTemplate = null;
        this.activeTemplateId = null;
        this.templateAppliedAt = null;
      }
    },

    clearActiveTemplate() {
      this.setActiveTemplate(null);
    },

    applyTemplateDefinition(template: TemplateDefinition) {
      const snapshot = deepClone(template);
      this.isApplyingTemplate = true;
      try {
        this.setActiveTemplate(snapshot);
        this.setProduct(snapshot.target.productSlug);
        this.setSurface(snapshot.target.surfaceId);
        if (snapshot.defaultPrintTech)
          this.setPrintTech(snapshot.defaultPrintTech as PrintTech);
        this.items = deepClone(snapshot.items ?? []);
        this.selectedId = null;
        this.snapshot();
      } finally {
        this.isApplyingTemplate = false;
      }
    },

    resetToTemplateDefaults() {
      if (!this.activeTemplate) return;
      this.items = deepClone(this.activeTemplate.items ?? []);
      this.selectedId = null;
      this.snapshot();
    },

    async ensurePricingTechniques(force = false) {
      // Skip for anonymous users
      const sessionStore = useSessionStore();
      if (!sessionStore?.isAuthenticated) {
        console.log('[pricing] Skipping for anonymous user');
        return;
      }
      
      if (this.pricingConfigsLoaded && !force)
        return;
      try {
        const configs = await fetchPricingConfigs();
        const map: Record<string, { id: string; slug: string; name: string }> = {};
        for (const entry of configs) {
          if (!entry.slug || !entry.id) continue;
          map[entry.slug] = { id: entry.id, slug: entry.slug, name: entry.name };
        }
        this.pricingTechniques = map;
        this.pricingConfigsLoaded = true;
      } catch (error: any) {
        console.warn("[pricing] failed to load configs", error);
        if (!this.pricingError)
          this.pricingError = error?.message ?? "Unable to load pricing configurations";
      }
    },

    schedulePricingRefresh(delay = 250) {
      if (typeof window === "undefined")
        return;
      if (this._pricingRefreshHandle)
        window.clearTimeout(this._pricingRefreshHandle);
      this._pricingRefreshHandle = window.setTimeout(() => {
        this.refreshPricingQuote().catch(err => console.warn("[pricing] refresh error", err));
      }, delay);
    },

    clearPricingRefreshTimer() {
      if (typeof window === "undefined")
        return;
      if (this._pricingRefreshHandle) {
        window.clearTimeout(this._pricingRefreshHandle);
        this._pricingRefreshHandle = null;
      }
    },

    async refreshPricingQuote(force = false) {
      // Skip for anonymous users
      const sessionStore = useSessionStore();
      if (!sessionStore?.isAuthenticated) {
        this.pricingQuote = null;
        this.pricingLoading = false;
        this.pricingError = null;
        return;
      }
      
      try {
        await this.ensurePricingTechniques();
        const product = this.activeProduct;
        const surface = this.activeSurface;
        if (!product?.id || !surface?.id) {
          if (!force) {
            this.pricingQuote = null;
            this.pricingError = "Design not linked to a saved product surface yet.";
          }
          return;
        }

        let techniqueSlug = this.printTech;
        if (this.productSlug === "gangsheet")
          techniqueSlug = "gangsheet";

        const technique = this.pricingTechniques[techniqueSlug];
        if (!technique) {
          this.pricingQuote = null;
          this.pricingError = `Pricing not configured for technique "${techniqueSlug}".`;
          return;
        }

        const analysis = this.analysis;
        const areaIn2 = analysis.stats.areaIn2 || 0;
        const areaSquareCm = Number((areaIn2 * 6.4516).toFixed(2));
        const coverage = analysis.stats.coverage ?? undefined;
        const sheetCoverage = this.productSlug === "gangsheet" ? coverage : undefined;
        const whiteUnderbase = this.printTech === "dtf" && this.color && this.color.toLowerCase() !== "white";

        this.pricingLoading = true;
        this.pricingError = null;
        const quote = await fetchPricingQuote({
          productId: product.id,
          surfaceId: surface.id,
          printTechniqueId: technique.id,
          areaSquareCm,
          quantity: this.quantity,
          colors: analysis.stats.colorCount || undefined,
          coverageRatio: coverage,
          sheetCoverageRatio: sheetCoverage,
          whiteUnderbase,
        });
        this.pricingQuote = quote;
      } catch (error: any) {
        this.pricingQuote = null;
        this.pricingError = error?.response?._data?.error ?? error?.message ?? "Unable to calculate pricing";
      } finally {
        this.pricingLoading = false;
        this.clearPricingRefreshTimer();
      }
    },

    /* Stage */
    setStage(stage: Konva.Stage) { this._stage = stage; },
    setViewportSize(w: number, h: number) { this.viewportW = w; this.viewportH = h; },

    /* ?r?n kontrol */
    setProduct(slug: string) {
      const p = this.products.find((x: ProductDefinition) => x.slug === slug);
      if (!p) return;
      if (!this.isApplyingTemplate && this.activeTemplate && this.activeTemplate.target.productSlug !== slug)
        this.clearActiveTemplate();
      this.productSlug = slug;
      const defaultSurface = p.surfaces[0];
      if (defaultSurface)
        this.setSurface(defaultSurface.id);
      this.schedulePricingRefresh();
    },
    setSurface(id: string) {
      const p = this.products.find((x: ProductDefinition) => x.slug === this.productSlug);
      const srf = p?.surfaces.find((s: ProductSurface) => s.id === id);
      if (!srf) return;
      if (!this.isApplyingTemplate && this.activeTemplate && this.activeTemplate.target.surfaceId !== id)
        this.clearActiveTemplate();
      this.surfaceId = id;
      const ppi = srf.ppi ?? 300;
      const widthPx = srf.widthPx ?? (srf.widthMm ? mmToPx(srf.widthMm, ppi) : this.stageWpx);
      const heightPx = srf.heightPx ?? (srf.heightMm ? mmToPx(srf.heightMm, ppi) : this.stageHpx);
      this.stageWpx = widthPx;
      this.stageHpx = heightPx;
      const safePx = srf.safeMarginPx ?? (srf.safeMarginMm !== undefined ? mmToPx(srf.safeMarginMm, ppi) : this.marginPx);
      this.marginPx = safePx;
      this.reflowFromNormalized();
      this.schedulePricingRefresh();
    },
    setSheetSizePx(widthPx: number, heightPx: number) {
      const safeWidth = Math.max(120, Math.round(widthPx || this.stageWpx));
      const safeHeight = Math.max(120, Math.round(heightPx || this.stageHpx));
      this.stageWpx = safeWidth;
      this.stageHpx = safeHeight;
      const sheetW = this.sheetWpx;
      const sheetH = this.sheetHpx;
      this.items.forEach((item: LayerItem) => {
        item.normalized = computeNormalizedFrame(item, sheetW, sheetH);
      });
      this._stage?.batchDraw?.();
    },
    setSheetSizeInches(widthIn: number, heightIn: number) {
      const wPx = Math.round((widthIn || 0) * this.ppi);
      const hPx = Math.round((heightIn || 0) * this.ppi);
      this.setSheetSizePx(wPx, hPx);
    },
    recordAutosaveHistory(entry: Omit<AutosaveHistoryEntry, "id"> & { id?: string }) {
      const normalized: AutosaveHistoryEntry = {
        id: entry.id ?? uid(),
        timestamp: entry.timestamp ?? new Date().toISOString(),
        kind: entry.kind,
        message: entry.message,
        status: entry.status,
      };
      this.autosaveHistory.unshift(normalized);
      if (this.autosaveHistory.length > MAX_HISTORY_LENGTH)
        this.autosaveHistory.splice(MAX_HISTORY_LENGTH);
    },
    setQuantity(q: number) { this.quantity = Math.max(1, Math.round(q)); this.schedulePricingRefresh(); },
    setColor(c: string) { this.color = c; this.schedulePricingRefresh(); },
    setPrintTech(t: PrintTech) { this.printTech = t; this.schedulePricingRefresh(); },
    reflowFromNormalized() {
      const sheetW = this.sheetWpx;
      const sheetH = this.sheetHpx;
      this.items.forEach((item: LayerItem) => {
        applyNormalizedFrame(item, sheetW, sheetH);
      });
      this.items = this.items.slice();
      this._stage?.batchDraw?.();
    },
    normalizeToStage(options?: { constrainSafeArea?: boolean }) {
      const stageW = this.sheetWpx;
      const stageH = this.sheetHpx;
      const margin = options?.constrainSafeArea ? this.marginPx : 0;
      const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

      const updated = this.items.map((layer: LayerItem) => {
        const clone = JSON.parse(JSON.stringify(layer)) as LayerItem;
        const node = this._stage?.findOne(`#${clone.id}`) as Konva.Node | undefined;
        const width = (clone as any).width ?? (node as any)?.width?.() ?? 0;
        const height = (clone as any).height ?? (node as any)?.height?.() ?? 0;
        const minX = margin;
        const minY = margin;
        const maxX = Math.max(margin, stageW - width - margin);
        const maxY = Math.max(margin, stageH - height - margin);

        clone.x = clampValue(clone.x, minX, maxX);
        clone.y = clampValue(clone.y, minY, maxY);
        clone.normalized = computeNormalizedFrame(clone, stageW, stageH);
        return clone;
      });

      this.items = updated;
      this.selectedId = null;
      this.snapshot();
      this._stage?.batchDraw?.();
    },
    ensureMinimumTextSize(minPx: number, targetIds?: string[]) {
      if (!minPx || minPx <= 0) return;
      const ids = targetIds && targetIds.length ? new Set(targetIds) : null;
      let updated = false;
      const sheetW = this.sheetWpx;
      const sheetH = this.sheetHpx;
      const next = this.items.map(layer => {
        if (layer.kind !== "text") return layer;
        if (ids && !ids.has(layer.id)) return layer;
        const currentSize = layer.fontSize ?? 0;
        if (!currentSize || currentSize >= minPx) return layer;
        const clone = JSON.parse(JSON.stringify(layer)) as TextItem;
        const ratio = minPx / currentSize;
        clone.fontSize = minPx;
        if (typeof clone.width === "number" && clone.width > 0) {
          clone.width = Math.round(clone.width * ratio);
        }
        if (typeof clone.height === "number" && clone.height > 0) {
          clone.height = Math.round(clone.height * ratio);
        }
        clone.normalized = computeNormalizedFrame(clone, sheetW, sheetH);
        updated = true;
        return clone;
      });
      if (updated) {
        this.items = next;
        this.snapshot();
        this._stage?.batchDraw?.();
      }
    },
    ensureMinimumStrokeWidth(minPx: number, targetIds?: string[]) {
      if (!minPx || minPx <= 0) return;
      const ids = targetIds && targetIds.length ? new Set(targetIds) : null;
      let updated = false;
      const sheetW = this.sheetWpx;
      const sheetH = this.sheetHpx;
      const next = this.items.map(layer => {
        const width = (layer as any).strokeWidth;
        if (typeof width !== "number" || width >= minPx) return layer;
        if (ids && !ids.has(layer.id)) return layer;
        const clone = JSON.parse(JSON.stringify(layer)) as LayerItem;
        (clone as any).strokeWidth = minPx;
        clone.normalized = computeNormalizedFrame(clone, sheetW, sheetH);
        updated = true;
        return clone;
      });
      if (updated) {
        this.items = next;
        this.snapshot();
        this._stage?.batchDraw?.();
      }
    },
    shrinkImagesToMeetDpi(minDpi: number, targetIds?: string[]) {
      if (!minDpi || minDpi <= 0) return;
      const ids = targetIds && targetIds.length ? new Set(targetIds) : null;
      let updated = false;
      const sheetW = this.sheetWpx;
      const sheetH = this.sheetHpx;
      const ppi = this.ppi;
      const next = this.items.map(layer => {
        if (layer.kind !== "image") return layer;
        if (ids && !ids.has(layer.id)) return layer;
        const img = JSON.parse(JSON.stringify(layer)) as ImageItem;
        const sourceW = img.sourceWidth ?? img.width;
        const sourceH = img.sourceHeight ?? img.height;
        if (!sourceW || !sourceH || !img.width || !img.height) return layer;
        const printedWidthIn = img.width / ppi;
        const printedHeightIn = img.height / ppi;
        if (!printedWidthIn || !printedHeightIn) return layer;
        const currentDpi = Math.min(sourceW / printedWidthIn, sourceH / printedHeightIn);
        if (!Number.isFinite(currentDpi) || currentDpi >= minDpi) return layer;
        const ratio = currentDpi / minDpi;
        if (ratio <= 0 || ratio >= 1) return layer;
        const newWidth = Math.max(4, Math.round(img.width * ratio));
        const newHeight = Math.max(4, Math.round(img.height * ratio));
        const centerX = img.x + img.width / 2;
        const centerY = img.y + img.height / 2;
        img.width = newWidth;
        img.height = newHeight;
        img.x = Math.round(centerX - newWidth / 2);
        img.y = Math.round(centerY - newHeight / 2);
        img.normalized = computeNormalizedFrame(img, sheetW, sheetH);
        updated = true;
        return img;
      });
      if (updated) {
        this.items = next;
        this.normalizeToStage({ constrainSafeArea: true });
        this._stage?.batchDraw?.();
      }
    },
    /* Se?im */
    select(id: string | null) { this.selectedId = id; },

    centerPosition(w: number, h: number) {
      const sheetWidth = this.sheetWpx;
      const sheetHeight = this.sheetHpx;
      const x = Math.round((sheetWidth - w) / 2);
      const y = Math.round((sheetHeight - h) / 2);
      return { x, y };
    },

    /* Ekleme Ara?lar? */
    addText(fontFamily?: string) {
      const width = 300, height = 60;
      const { x, y } = this.centerPosition(width, height);
      const chosenFont = fontFamily ?? FONT_LIBRARY[0]?.value ?? "Inter, Arial";
      const item: TextItem = {
        id: uid(), kind: "text", name: "Text",
        x, y, width, height, rotation: 0, visible: true, locked: false,
        text: "Yeni Yazi", fontSize: 36, fontFamily: chosenFont, fill: "#111", align: "left",
        shadowColor: "rgba(0,0,0,0)", shadowBlur: 0, stroke: "#000", strokeWidth: 0, opacity: 1
      };
      item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
      this.items.push(item);
      this.items = this.items.slice();
      this.select(item.id);
      this.snapshot();
    },
    addRect() {
      const width = 300, height = 180;
      const { x, y } = this.centerPosition(width, height);
      const item: RectItem = {
        id: uid(), kind: "rect", name: "Rect",
        x, y, width, height, rotation: 0, visible: true, locked: false,
        fill: "#eeeeee", stroke: "#333333", strokeWidth: 2, opacity: 1, dash: []
      };
      item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
      this.items.push(item);
      this.items = this.items.slice();
      this.select(item.id);
      this.snapshot();
    },
    addCircle() {
      const radius = 80;
      const { x, y } = this.centerPosition(radius * 2, radius * 2);
      const item: CircleItem = {
        id: uid(), kind: "circle", name: "Circle",
        x: x + radius, y: y + radius, rotation: 0, visible: true, locked: false,
        radius, fill: "#eeeeee", stroke: "#333", strokeWidth: 2, opacity: 1
      };
      item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
      this.items.push(item);
      this.items = this.items.slice();
      this.select(item.id);
      this.snapshot();
    },
    addLine() {
      const { x, y } = this.centerPosition(200, 0);
      const item: LineItem = {
        id: uid(), kind: "line", name: "Line",
        x, y, rotation: 0, visible: true, locked: false,
        points: [0, 0, 200, 0], stroke: "#111", strokeWidth: 2, opacity: 1, dash: []
      };
      item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
      this.items.push(item);
      this.items = this.items.slice();
      this.select(item.id);
      this.snapshot();
    },
    async addImageFiles(files: FileList) {
      const newItems: ImageItem[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const url = URL.createObjectURL(file);
        const img = await loadHTMLImageFromURL(url);
        const maxW = Math.min(this.sheetWpx * 0.5, img.width);
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const item: ImageItem = {
          id: uid(),
          kind: "image",
          name: file.name,
          x: 0,
          y: 0,
          width: w,
          height: h,
          rotation: 0,
          visible: true,
          locked: false,
          src: url,
          sourceWidth: img.width,
          sourceHeight: img.height,
        };
        const aligned = autoAlignToChest(item, this.sheetWpx, this.sheetHpx, this.safeMarginPx);
        item.x = aligned.x;
        item.y = aligned.y;
        item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
        newItems.push(item);
      }
      if (!newItems.length) return;
      this.items.push(...newItems);
      this.items = this.items.slice();
      this.select(newItems[newItems.length - 1].id);
      this.snapshot();
    },
    alignSelectedToChest() {
      if (!this.selectedId) return;
      const idx = this.items.findIndex((i: LayerItem) => i.id === this.selectedId);
      if (idx === -1) return;
      const item = this.items[idx];
    const aligned = autoAlignToChest(item, this.sheetWpx, this.sheetHpx, this.safeMarginPx);
    this.updateItemPartial(item.id, { x: aligned.x, y: aligned.y } as any);
    this.snapshot();
    },
    snapSelectionToSafeArea() {
      if (!this.selectedId) return;
      const idx = this.items.findIndex((i: LayerItem) => i.id === this.selectedId);
      if (idx === -1) return;
      const item = this.items[idx];
      const { width, height, offsetX, offsetY } = approximateBounds(item);
      const margin = this.safeMarginPx;
      const sheetW = this.sheetWpx;
      const sheetH = this.sheetHpx;
      const maxX = sheetW - margin - width;
      const maxY = sheetH - margin - height;
      const targetX = clamp(item.x + offsetX, margin, Math.max(margin, maxX)) - offsetX;
      const targetY = clamp(item.y + offsetY, margin, Math.max(margin, maxY)) - offsetY;
      this.updateItemPartial(item.id, { x: Math.round(targetX), y: Math.round(targetY) } as any);
      this.snapshot();
    },

    async addRemoteImage(options: { url: string; name: string; maxWidthRatio?: number }) {
      let resolvedUrl = options.url;
      try {
        const response = await fetch(options.url, { mode: "cors" });
        if (response.ok) {
          const blob = await response.blob();
          resolvedUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn("Remote asset fetch failed, using original URL", err);
      }
      const img = await loadHTMLImageFromURL(resolvedUrl);
      const limit = options.maxWidthRatio ? this.sheetWpx * options.maxWidthRatio : this.sheetWpx * 0.6;
      const maxW = Math.min(limit, img.width);
      const scale = img.width > 0 ? Math.min(1, maxW / img.width) : 1;
      const w = Math.max(32, Math.round(img.width * scale || img.width));
      const h = Math.max(32, Math.round(img.height * scale || img.height));
      const item: ImageItem = {
        id: uid(),
        kind: "image",
        name: options.name,
        x: 0,
        y: 0,
        width: w,
        height: h,
        rotation: 0,
        visible: true,
        locked: false,
        src: resolvedUrl,
        sourceWidth: img.width,
        sourceHeight: img.height,
      };
      const aligned = autoAlignToChest(item, this.sheetWpx, this.sheetHpx, this.safeMarginPx);
      item.x = aligned.x;
      item.y = aligned.y;
      item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
      this.items.push(item);
      this.items = this.items.slice();
      this.select(item.id);
      this.snapshot();
    },
    addIconPath(icon: { id: string; name: string; path: string; viewBox: number; stroke?: string; strokeWidth?: number }) {
      const baseSize = icon.viewBox || 24;
      const target = Math.min(this.sheetWpx * 0.28, 220);
      const scale = baseSize > 0 ? target / baseSize : 1;
      const displayW = Math.round(baseSize * scale);
      const displayH = Math.round(baseSize * scale);
      const { x, y } = this.centerPosition(displayW, displayH);
      const item: PathItem = {
        id: uid(),
        kind: "path",
        name: icon.name,
        x,
        y,
        width: displayW,
        height: displayH,
        rotation: 0,
        visible: true,
        locked: false,
        path: icon.path,
        scaleX: scale,
        scaleY: scale,
        fill: icon.stroke ? "transparent" : "#18181b",
        stroke: icon.stroke ?? "#18181b",
        strokeWidth: icon.strokeWidth ?? (icon.stroke ? icon.strokeWidth ?? 1.6 : 0),
        opacity: 1,
      };
      item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
      this.items.push(item);
      this.items = this.items.slice();
      this.select(item.id);
      this.snapshot();
    },
    addNoteCard(payload: { title: string; body: string }) {
      const width = Math.min(this.sheetWpx * 0.4, 320);
      const height = 160;
      const { x, y } = this.centerPosition(width, height);
      const text = `${payload.title}\n${payload.body}`;
      const item: TextItem = {
        id: uid(),
        kind: "text",
        name: payload.title,
        x, y,
        width,
        height,
        rotation: 0,
        visible: true,
        locked: false,
        text,
        fontSize: 18,
        fontFamily: "Inter, Arial, sans-serif",
        fill: "#1f2933",
        align: "left",
        opacity: 1,
        shadowColor: "rgba(0,0,0,0)",
        shadowBlur: 0,
        stroke: "#000000",
        strokeWidth: 0,
      };
      item.normalized = computeNormalizedFrame(item, this.sheetWpx, this.sheetHpx);
      this.items.push(item);
      this.items = this.items.slice();
      this.select(item.id);
      this.snapshot();
    },

    updateItemPartial<T extends Partial<LayerItem>>(id: string, patch: T) {
      const idx = this.items.findIndex((i: LayerItem) => i.id === id);
      if (idx === -1) return;
      const current = this.items[idx];
      const next: LayerItem = { ...current, ...patch } as LayerItem;
      if (next.kind === "line" && patch.points) next.points = [...patch.points];
      if (next.kind === "path" && patch.path) next.path = patch.path;
      next.normalized = computeNormalizedFrame(next, this.sheetWpx, this.sheetHpx);
      this.items.splice(idx, 1, next);
      this.items = this.items.slice();
    },
    removeItems(ids: string[]) {
      if (!ids.length) return;
      const idSet = new Set(ids);
      this.items = this.items.filter((i: LayerItem) => !idSet.has(i.id));
      if (this.selectedId && idSet.has(this.selectedId)) this.select(null);
      this.snapshot();
    },
    removeSelected() {
      if (!this.selectedId) return;
      this.removeItems([this.selectedId]);
    },
    copySelection(ids?: string[]) {
      const targetIds = ids && ids.length ? ids : (this.selectedId ? [this.selectedId] : []);
      if (!targetIds.length) return;
      const clones = targetIds
        .map(id => this.items.find((i: LayerItem) => i.id === id))
        .filter((it): it is LayerItem => Boolean(it))
        .map(it => JSON.parse(JSON.stringify(it)) as LayerItem);
      this._clipboard = clones;
    },
    cutSelection(ids?: string[]) {
      const targetIds = ids && ids.length ? ids : (this.selectedId ? [this.selectedId] : []);
      if (!targetIds.length) return;
      this.copySelection(targetIds);
      this.removeItems(targetIds);
    },
    pasteClipboard(offset = 28) {
      if (!this._clipboard.length) return [] as string[];
      const clones = this._clipboard.map((item) => {
        const clone = JSON.parse(JSON.stringify(item)) as LayerItem;
        clone.id = uid();
        if (typeof (clone as any).x === "number") (clone as any).x = ((clone as any).x ?? 0) + offset;
        if (typeof (clone as any).y === "number") (clone as any).y = ((clone as any).y ?? 0) + offset;
        if (typeof clone.name === "string") clone.name = clone.name.endsWith("copy") ? clone.name : `${clone.name} copy`;
        clone.normalized = computeNormalizedFrame(clone, this.sheetWpx, this.sheetHpx);
        return clone;
      });
      if (!clones.length) return [];
      this.items.push(...clones);
      this.items = this.items.slice();
      this.select(clones[clones.length - 1].id);
      this.snapshot();
      this._clipboard = clones.map(clone => JSON.parse(JSON.stringify(clone)) as LayerItem);
      return clones.map(clone => clone.id);
    },
    duplicateSelection(ids?: string[], offset = 28) {
      const targetIds = ids && ids.length ? ids : (this.selectedId ? [this.selectedId] : []);
      if (!targetIds.length) return [] as string[];
      this.copySelection(targetIds);
      return this.pasteClipboard(offset);
    },
    bringForward(id: string) {
      const i = this.items.findIndex((x: LayerItem) => x.id === id);
      if (i < 0 || i === this.items.length - 1) return;
      const [it] = this.items.splice(i, 1);
      this.items.splice(i + 1, 0, it);
      this.snapshot();
    },
    sendBackward(id: string) {
      const i = this.items.findIndex((x: LayerItem) => x.id === id);
      if (i <= 0) return;
      const [it] = this.items.splice(i, 1);
      this.items.splice(i - 1, 0, it);
      this.snapshot();
    },
    toggleVisibility(id: string) {
      const it = this.items.find((i: LayerItem) => i.id === id); if (!it) return;
      it.visible = !it.visible; this.snapshot();
    },
    toggleLock(id: string) {
      const it = this.items.find((i: LayerItem) => i.id === id); if (!it) return;
      it.locked = !it.locked; this.snapshot();
    },

    /* Undo/Redo */
    snapshot() {
      if (this._histIndex < this._history.length - 1) this._history.splice(this._histIndex + 1);
      this._history.push(JSON.parse(JSON.stringify(this.items)));
      this._histIndex = this._history.length - 1;
    },
    undo() {
      if (this._histIndex <= 0) return;
      this._histIndex--;
      this.items = JSON.parse(JSON.stringify(this._history[this._histIndex]));
      if (!this.items.find((i: LayerItem) => i.id === this.selectedId)) this.select(null);
    },
    redo() {
      if (this._histIndex >= this._history.length - 1) return;
      this._histIndex++;
      this.items = JSON.parse(JSON.stringify(this._history[this._histIndex]));
      if (!this.items.find((i: LayerItem) => i.id === this.selectedId)) this.select(null);
    },

    /* Auto-pack */
    autoArrange(spacing = 8) {
      const pos = autoPack(this.items, this.sheetWpx, this.sheetHpx, spacing);
      for (const p of pos) this.updateItemPartial(p.id, { x: p.x, y: p.y } as any);
      this.snapshot();
    },

    /* Export */
    exportAs(mime: "image/png" | "image/jpeg") {
      if (!this._stage) return;
      const dataUrl = this._stage.toDataURL({ mimeType: mime, pixelRatio: 2 });
      const arr = dataUrl.split(","); const bstr = atob(arr[1]); let n = bstr.length; const u8 = new Uint8Array(n);
      while (n--) u8[n] = bstr.charCodeAt(n);
      saveAs(new Blob([u8], { type: arr[0].match(/:(.*?);/)?.[1] || mime }), mime === "image/png" ? "design.png" : "design.jpg");
    },

    capturePreview(options?: { pixelRatio?: number; mimeType?: string }) {
      if (!this._stage) return null;
      try {
        return this._stage.toDataURL({
          pixelRatio: options?.pixelRatio ?? 1,
          mimeType: options?.mimeType ?? "image/png",
        });
      } catch (err) {
        console.warn("Preview capture failed", err);
        return null;
      }
    },

    async removeImageBackground(id: string, tolerance = 40) {
      const found = this.items.find((i: LayerItem) => i.id === id);
      if (!found || found.kind !== "image") return false;
      try {
        const img = await loadHTMLImageFromURL(found.src);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;
        const width = canvas.width;
        const height = canvas.height;
        const samplePoints = [
          { x: 0, y: 0 },
          { x: width - 1, y: 0 },
          { x: 0, y: height - 1 },
          { x: width - 1, y: height - 1 },
          { x: Math.floor(width / 2), y: Math.floor(height / 2) },
        ];
        const samples = samplePoints
          .filter(pt => pt.x >= 0 && pt.y >= 0 && pt.x < width && pt.y < height)
          .map(pt => {
            const idx = (pt.y * width + pt.x) * 4;
            return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
          });
        const base = samples.reduce((acc, cur) => ({
          r: acc.r + cur.r,
          g: acc.g + cur.g,
          b: acc.b + cur.b,
        }), { r: 0, g: 0, b: 0 });
        const count = Math.max(samples.length, 1);
        base.r /= count;
        base.g /= count;
        base.b /= count;
        const variance = samples.reduce((acc, cur) => {
          const dr = cur.r - base.r;
          const dg = cur.g - base.g;
          const db = cur.b - base.b;
          return acc + (dr * dr + dg * dg + db * db) / 3;
        }, 0) / count;
        const dynamicTol = Math.sqrt(Math.max(variance, 0));
        const adjustedTolerance = tolerance + dynamicTol * 0.5;
        const tolSq = adjustedTolerance * adjustedTolerance * 3;
        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - base.r;
          const dg = data[i + 1] - base.g;
          const db = data[i + 2] - base.b;
          const distSq = dr * dr + dg * dg + db * db;
          if (distSq <= tolSq) data[i + 3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        const nextUrl = canvas.toDataURL("image/png");
        if (found.src.startsWith("blob:")) {
          try { URL.revokeObjectURL(found.src); } catch { /* noop */ }
        }
        this.updateItemPartial(found.id, { src: nextUrl });
        this.snapshot();
        return true;
      } catch (err) {
        console.warn("removeImageBackground failed", err);
        return false;
      }
    },

    /* Cart (Shopify App Proxy stub) */
    async addToCart() {
      if (!this._stage) throw new Error("Stage not ready");
      const dataUrl = this._stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
      const prod = this.products.find((pp: ProductDefinition) => pp.slug === this.productSlug);
      const surf = prod?.surfaces.find((sf: ProductSurface) => sf.id === this.surfaceId);
      const ppi = surf?.ppi ?? 300;
      const widthPx = surf?.widthPx ?? this.sheetWpx;
      const heightPx = surf?.heightPx ?? this.sheetHpx;
      const widthMm = Math.round(pxToMm(widthPx, ppi));
      const heightMm = Math.round(pxToMm(heightPx, ppi));
      await this.persistDesign({ previewUrl: dataUrl });
      const designId = this.designId ?? Math.random().toString(36).slice(2, 10);
      const catalog = useCatalogStore();
      const mappedVariantId = catalog.variantIdFor({
        productSlug: this.productSlug,
        surfaceId: this.surfaceId,
        color: this.color,
        material: undefined,
      });
      const payload: Record<string, unknown> = {
        designId,
        productSlug: this.productSlug,
        surfaceId: this.surfaceId,
        technique: this.printTech,
        quantity: this.quantity,
        color: this.color,
        widthMm,
        heightMm,
        previewUrl: dataUrl,
      };
      if (mappedVariantId)
        payload.shopifyVariantId = mappedVariantId;

      const r = await fetch("/api/cart/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Cart add failed");
      return await r.json();
    },
    serializeSnapshot() {
      return {
        items: JSON.parse(JSON.stringify(this.items)),
        productSlug: this.productSlug,
        surfaceId: this.surfaceId,
        color: this.color,
        printTech: this.printTech,
        sheetWidthPx: this.sheetWpx,
        sheetHeightPx: this.sheetHpx,
      };
    },
    async persistDesign(options?: { previewUrl?: string; autosave?: boolean }) {
      const autosave = options?.autosave === true;
      const product = this.activeProduct;
      const surface = this.activeSurface;
      const snapshot = this.serializeSnapshot();
      const analysis = this.analysis;
      const payload: Record<string, unknown> = {
        name: product?.title ?? "Untitled Design",
        snapshot,
        sheetWidthMm: pxToMm(this.sheetWpx, this.ppi),
        sheetHeightMm: pxToMm(this.sheetHpx, this.ppi),
        metrics: {
          stats: analysis.stats,
          summary: {
            blockers: analysis.validations.filter(v => v.level === "blocker").length,
            warnings: analysis.validations.filter(v => v.level === "warning").length,
          },
          updatedAt: new Date().toISOString(),
        },
      };

      const productId = (product as any)?.id;
      if (isUuid(productId)) payload.productId = productId;
      const surfaceId = surface?.id;
      if (isUuid(surfaceId)) payload.surfaceId = surfaceId;

      if (autosave) payload.autosave = true;

      const previewSource = options?.previewUrl;
      if (previewSource !== undefined) {
        payload.previewUrl = previewSource;
      } else if (!autosave) {
        const generatedPreview = this.capturePreview({ pixelRatio: 1, mimeType: "image/png" }) ?? undefined;
        if (generatedPreview !== undefined) payload.previewUrl = generatedPreview;
      }

      this.designSaving = true;
      if (autosave) this.autosaveError = null;

      const nowIso = () => new Date().toISOString();

      const session = useSessionStore();
      if (session.accessToken && !session.activeTenantId) {
        await session.fetchServerSession({ silent: true }).catch(() => {});
      }

      const attemptPersist = async () => {
        if (this.designId) {
          return await $api<{ data: any }>(`/designs/${this.designId}`, {
            method: "PATCH",
            body: payload,
          });
        }
        return await $api<{ data: any }>("/designs", {
          method: "POST",
          body: payload,
        });
      };

      try {
        let response: { data: any };
        try {
          response = await attemptPersist();
        } catch (primaryError: any) {
          const status = primaryError?.response?.status ?? primaryError?.status;
          const shouldRetry = status === 401;
          if (shouldRetry) {
            await session.fetchServerSession({ silent: true }).catch(() => {});
            response = await attemptPersist();
          } else {
            throw primaryError;
          }
        }

        const data = response.data ?? {};
        this.designId = data.id ?? this.designId;
        if (data.status) this.designStatus = data.status as DesignStatusType;

        const timestamp = autosave
          ? data.autosaveAt ?? nowIso()
          : data.updatedAt ?? nowIso();

        if (autosave) {
          this.lastAutosaveAt = timestamp;
          this.lastSavedAt = timestamp;
          this.autosaveError = null;
        } else {
          this.lastSavedAt = timestamp;
          this.lastAutosaveAt = data.autosaveAt ?? this.lastAutosaveAt;
        }

        const statusLabel = this.designStatus;
        const message = autosave ? "Autosaved draft" : "Saved design";
        this.recordAutosaveHistory({
          kind: autosave ? "autosave" : "save",
          message: statusLabel && !autosave ? `${message} ? ${statusLabel}` : message,
          timestamp,
          status: statusLabel,
        });
      } catch (error: any) {
        if (autosave) {
          const reason = error?.message ?? "Autosave failed";
          this.autosaveError = reason.toLowerCase().startsWith("autosave failed") ? reason : `Autosave failed: ${reason}`;
          this.recordAutosaveHistory({
            kind: "error",
            message: this.autosaveError,
            timestamp: nowIso(),
            status: this.designStatus,
          });
        }
        throw error;
      } finally {
        this.designSaving = false;
      }
    },
    async submitDesign(options?: { previewUrl?: string }) {
      await this.persistDesign({ previewUrl: options?.previewUrl });
      if (!this.designId) throw new Error("Design did not persist.");
      const response = await $api<{ data: any }>(`/designs/${this.designId}/submit`, {
        method: "POST",
      });
      const data = response.data ?? {};
      if (data.status) this.designStatus = data.status;
      return data;
    },
    async checkoutWithDesign(options?: { returnUrl?: string }) {
      const previewDataUrl = this.capturePreview({ pixelRatio: 1, mimeType: "image/png" }) ?? undefined;
      
      // For authenticated users, use existing submit flow
      const sessionStore = useSessionStore();
      if (sessionStore.isAuthenticated) {
        await this.submitDesign({ previewUrl: previewDataUrl });
      }

      const catalog = useCatalogStore();
      const product = this.activeProduct;
      const variantId = catalog.variantIdFor({
        productSlug: this.productSlug,
        surfaceId: this.surfaceId,
        color: this.color,
        material: undefined,
      }) ?? null;
      const productGid = product?.shopifyProductId ?? product?.slug ?? this.productSlug;
      const sheetWidthMm = pxToMm(this.sheetWpx, this.ppi);
      const sheetHeightMm = pxToMm(this.sheetHpx, this.ppi);
      const stats = this.analysis.stats;
      const safeMarginMm = Math.round(pxToMm(this.safeMarginPx, this.ppi));
      const lineItemProperties: Record<string, string> = {};
      if (this.color) lineItemProperties["Product Color"] = String(this.color);
      if (this.printTech) lineItemProperties["Print Technique"] = this.printTech.toUpperCase();
      if (safeMarginMm) lineItemProperties["Safe Margin (mm)"] = String(safeMarginMm);
      if (this.activeSurface?.name) lineItemProperties["Surface Label"] = this.activeSurface.name;

      // For anonymous users, send design snapshot
      const designSnapshot = !sessionStore.isAuthenticated ? this.serializeSnapshot() : undefined;

      const response = await $api<{ data: { checkoutUrl?: string; lineItem?: Record<string, unknown> } }>("/proxy/cart", {
        method: "POST",
        body: {
          designId: this.designId,
          designSnapshot,
          productGid,
          productTitle: product?.title,
          quantity: this.quantity,
          variantId: variantId ?? undefined,
          technique: this.printTech,
          surfaceId: this.surfaceId,
          previewUrl: previewDataUrl,
          sheetWidthMm,
          sheetHeightMm,
          printAreaIn2: stats.areaIn2,
          colorCount: stats.colorCount,
          dpiFloor: stats.lowestImageDpi,
          lineItemProperties,
          returnUrl: options?.returnUrl ?? (typeof window !== "undefined" ? window.location.href : undefined),
        },
      });

      // Update designId from backend response (for anonymous users)
      if (response.data?.designId) {
        this.designId = response.data.designId;
        console.log('[checkout] Design ID from backend:', this.designId);
      }

      const checkoutUrl = response.data?.checkoutUrl;
      if (checkoutUrl) {
        const absolute = checkoutUrl.startsWith("http")
          ? checkoutUrl
          : `${window.location.origin}${checkoutUrl.startsWith("/") ? checkoutUrl : `/${checkoutUrl}`}`;
        
        console.log('[checkout] Redirecting to:', absolute);
        window.location.href = absolute;
      } else {
        console.error('[checkout] No checkout URL received from backend');
        throw new Error('No checkout URL received');
      }
      return checkoutUrl;
    },
    applySnapshot(snapshot: {
      items: LayerItem[];
      productSlug: string;
      surfaceId: string;
      color: string;
      printTech: PrintTech;
      sheetWidthPx?: number;
      sheetHeightPx?: number;
    }) {
      if (!snapshot) return;
      if (snapshot.productSlug) this.setProduct(snapshot.productSlug);
      if (snapshot.surfaceId) this.setSurface(snapshot.surfaceId);
      if (snapshot.color) this.color = snapshot.color;
      if (snapshot.printTech) this.printTech = snapshot.printTech;
      this.items = JSON.parse(JSON.stringify(snapshot.items ?? []));
      if (snapshot.sheetWidthPx || snapshot.sheetHeightPx) {
        const widthPx = snapshot.sheetWidthPx ?? this.sheetWpx;
        const heightPx = snapshot.sheetHeightPx ?? this.sheetHpx;
        this.setSheetSizePx(widthPx, heightPx);
      } else {
        const sheetW = this.sheetWpx;
        const sheetH = this.sheetHpx;
        this.items.forEach((item: LayerItem) => {
          if (item.kind === "line") item.points = [...(item.points ?? [])];
          applyNormalizedFrame(item, sheetW, sheetH);
        });
      }
      this.items = this.items.slice();
      this.selectedId = null;
      this.snapshot();
    },
    clearDesign() {
      this.items = [];
      this.selectedId = null;
      this.snapshot();
      this.designId = null;
      this.designStatus = "DRAFT";
      this.lastSavedAt = null;
      this.lastAutosaveAt = null;
      this.autosaveError = null;
      this.designSaving = false;
      this.autosaveHistory = [];
    },
  },
});

























