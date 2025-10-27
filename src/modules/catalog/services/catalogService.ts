import { $api } from "@/utils/api";
import type { ProductDefinition, ProductSurface, ProductPricing } from "../../editor/types";
import { mmToPx, pxToMm } from "../../editor/utils/units";
import { PRODUCTS as SEED_PRODUCTS } from "../../editor/data/products";

export interface ShopifyProductSummary {
  id: string;
  title: string;
  handle: string;
  options: string[];
  variantsCount: number;
}

export interface ShopifyVariantSummary {
  id: string;
  title: string;
  sku?: string;
  price?: string;
  options: Record<string, string>;
}

type Nullable<T> = { [K in keyof T]: T[K] | null };

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

interface ApiSurface extends Nullable<{
  id: string;
  productId: string;
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  safeArea: Record<string, unknown>;
  bleedArea: Record<string, unknown>;
  maskSvg: string;
  ppi: number;
  metadata: Record<string, unknown>;
}> {}

interface ApiProduct extends Nullable<{
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  attributes: Record<string, unknown>;
  surfaces: ApiSurface[];
}> {}

interface CreateProductRequest {
  slug: string;
  title: string;
  category?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  surfaces?: ApiSurfacePayload[];
}

interface UpdateProductRequest extends Partial<CreateProductRequest> {}

interface ApiSurfacePayload {
  id?: string;
  name: string;
  description?: string;
  widthMm: number;
  heightMm: number;
  safeArea?: Record<string, unknown>;
  bleedArea?: Record<string, unknown>;
  maskSvg?: string;
  ppi?: number;
  metadata?: Record<string, unknown>;
}

function ensureArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function ensurePricing(value: unknown): ProductPricing {
  if (typeof value !== "object" || value === null) {
    return { base: 0, perSqIn: 0, techMultipliers: {}, quantityBreaks: [] };
  }
  const raw = value as Record<string, unknown>;
  return {
    base: typeof raw.base === "number" ? raw.base : 0,
    perSqIn: typeof raw.perSqIn === "number" ? raw.perSqIn : 0,
    colorAdder: typeof raw.colorAdder === "number" ? raw.colorAdder : undefined,
    techMultipliers: (raw.techMultipliers as Record<string, number>) ?? {},
    quantityBreaks: ensureArray<{ qty: number; discountPct: number }>(raw.quantityBreaks, []),
  };
}

function toProductSurface(surface: ApiSurface): ProductSurface {
  const metadata = (surface.metadata ?? {}) as Record<string, unknown>;
  const ppi = typeof surface.ppi === "number" ? surface.ppi : typeof metadata.ppi === "number" ? (metadata.ppi as number) : 300;
  const widthMm = typeof surface.widthMm === "number" ? surface.widthMm : typeof metadata.widthMm === "number" ? (metadata.widthMm as number) : 0;
  const heightMm = typeof surface.heightMm === "number" ? surface.heightMm : typeof metadata.heightMm === "number" ? (metadata.heightMm as number) : 0;
  const safeMarginMm = typeof metadata.safeMarginMm === "number"
    ? (metadata.safeMarginMm as number)
    : typeof surface.safeArea === "object" && surface.safeArea !== null && typeof (surface.safeArea as Record<string, unknown>).marginMm === "number"
      ? ((surface.safeArea as Record<string, unknown>).marginMm as number)
      : 0;
  const bleedMarginMm = typeof metadata.bleedMarginMm === "number"
    ? (metadata.bleedMarginMm as number)
    : typeof surface.bleedArea === "object" && surface.bleedArea !== null && typeof (surface.bleedArea as Record<string, unknown>).marginMm === "number"
      ? ((surface.bleedArea as Record<string, unknown>).marginMm as number)
      : undefined;

  return {
    id: surface.id ?? generateId("surface"),
    productId: surface.productId ?? undefined,
    name: surface.name ?? "Surface",
    widthPx: mmToPx(widthMm, ppi),
    heightPx: mmToPx(heightMm, ppi),
    safeMarginPx: mmToPx(safeMarginMm, ppi),
    bleedMarginPx: typeof bleedMarginMm === "number" ? mmToPx(bleedMarginMm, ppi) : undefined,
    widthMm,
    heightMm,
    safeMarginMm,
    bleedMarginMm,
    ppi,
    previewImage: typeof metadata.previewImage === "string" ? (metadata.previewImage as string) : undefined,
    maskPath: surface.maskSvg ?? (typeof metadata.maskPath === "string" ? (metadata.maskPath as string) : undefined),
    note: typeof metadata.note === "string" ? (metadata.note as string) : surface.description ?? undefined,
    techLimits: metadata.techLimits as ProductSurface["techLimits"] ?? undefined,
  };
}

function toProductDefinition(product: ApiProduct): ProductDefinition {
  const attributes = (product.attributes ?? {}) as Record<string, unknown>;
  const materials = ensureArray<string>(attributes.materials, []);
  const colors = attributes.colors ? ensureArray<string>(attributes.colors, []) : undefined;
  const techniques = attributes.techniques ? ensureArray<string>(attributes.techniques, []) : undefined;
  return {
    id: product.id ?? undefined,
    tenantId: product.tenantId ?? undefined,
    slug: product.slug ?? "",
    title: product.title ?? "",
    category: product.category ?? undefined,
    description: product.description ?? undefined,
    materials,
    colors,
    techniques,
    attributes,
    pricing: ensurePricing(attributes.pricing),
    surfaces: ensureArray<ApiSurface>(product.surfaces, []).map(toProductSurface),
  };
}

function pruneUndefined<T extends Record<string, unknown>>(input: T): T {
  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null)
      clone[key] = value;
  }
  return clone as T;
}

function buildProductPayload(product: ProductDefinition): CreateProductRequest {
  const attributes: Record<string, unknown> = {
    materials: product.materials,
    colors: product.colors,
    pricing: product.pricing,
    techniques: product.techniques,
  };

  return pruneUndefined({
    slug: product.slug,
    title: product.title,
    category: product.category,
    description: product.description,
    attributes,
    surfaces: product.surfaces?.length ? product.surfaces.map(buildSurfacePayload) : undefined,
  });
}

function buildProductUpdatePayload(patch: Partial<ProductDefinition>): UpdateProductRequest {
  const attributes: Record<string, unknown> = {};
  if ("materials" in patch) attributes.materials = patch.materials;
  if ("colors" in patch) attributes.colors = patch.colors;
  if ("pricing" in patch) attributes.pricing = patch.pricing;
  if ("techniques" in patch) attributes.techniques = patch.techniques;

  return pruneUndefined({
    slug: patch.slug,
    title: patch.title,
    category: patch.category,
    description: patch.description,
    attributes: Object.keys(attributes).length ? attributes : undefined,
  });
}

function buildSurfacePayload(surface: ProductSurface): ApiSurfacePayload {
  const ppi = surface.ppi ?? 300;
  const widthMm = surface.widthMm ?? pxToMm(surface.widthPx, ppi);
  const heightMm = surface.heightMm ?? pxToMm(surface.heightPx, ppi);
  const safeMarginMm = surface.safeMarginMm ?? pxToMm(surface.safeMarginPx ?? 0, ppi);
  const bleedMarginMm = surface.bleedMarginMm ?? (surface.bleedMarginPx ? pxToMm(surface.bleedMarginPx, ppi) : undefined);

  const metadata: Record<string, unknown> = pruneUndefined({
    safeMarginMm,
    safeMarginPx: surface.safeMarginPx,
    bleedMarginMm,
    bleedMarginPx: surface.bleedMarginPx,
    previewImage: surface.previewImage,
    note: surface.note,
    techLimits: surface.techLimits,
    maskPath: surface.maskPath,
    widthMm,
    heightMm,
    ppi,
  });

  return pruneUndefined({
    id: surface.id,
    name: surface.name,
    description: surface.note,
    widthMm,
    heightMm,
    safeArea: { marginMm: safeMarginMm },
    bleedArea: typeof bleedMarginMm === "number" ? { marginMm: bleedMarginMm } : undefined,
    maskSvg: surface.maskPath,
    ppi,
    metadata,
  });
}

export async function fetchCatalog(): Promise<ProductDefinition[]> {
  const response = await $api<{ data: ApiProduct[] }>("/catalog");
  return response.data.map(toProductDefinition);
}

export async function fetchSeedCatalog(): Promise<ProductDefinition[]> {
  return Promise.resolve(JSON.parse(JSON.stringify(SEED_PRODUCTS)) as ProductDefinition[]);
}

export async function createProduct(product: ProductDefinition): Promise<ProductDefinition> {
  const response = await $api<{ data: ApiProduct }>("/catalog", {
    method: "POST",
    body: buildProductPayload(product),
  });
  return toProductDefinition(response.data);
}

export async function updateProduct(productId: string, patch: Partial<ProductDefinition>): Promise<ProductDefinition> {
  const response = await $api<{ data: ApiProduct }>(`/catalog/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: buildProductUpdatePayload(patch),
  });
  return toProductDefinition(response.data);
}

export async function deleteProduct(productId: string): Promise<void> {
  await $api(`/catalog/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

export async function createSurface(productId: string, surface: ProductSurface): Promise<ProductSurface> {
  const response = await $api<{ data: ApiSurface }>(`/catalog/${encodeURIComponent(productId)}/surfaces`, {
    method: "POST",
    body: buildSurfacePayload(surface),
  });
  return toProductSurface(response.data);
}

export async function updateSurfaceApi(productId: string, surface: ProductSurface): Promise<ProductSurface> {
  const response = await $api<{ data: ApiSurface }>(`/catalog/${encodeURIComponent(productId)}/surfaces/${encodeURIComponent(surface.id)}`, {
    method: "PATCH",
    body: buildSurfacePayload(surface),
  });
  return toProductSurface(response.data);
}

export async function deleteSurface(productId: string, surfaceId: string): Promise<void> {
  await $api(`/catalog/${encodeURIComponent(productId)}/surfaces/${encodeURIComponent(surfaceId)}`, { method: "DELETE" });
}

export async function fetchShopifyProducts(): Promise<ShopifyProductSummary[]> {
  const res = await fetch("/api/shopify/products");
  if (!res.ok)
    throw new Error("Failed to fetch Shopify products");
  return await res.json();
}

export async function fetchShopifyVariants(productId: string): Promise<ShopifyVariantSummary[]> {
  const res = await fetch(`/api/shopify/products/${encodeURIComponent(productId)}/variants`);
  if (!res.ok)
    throw new Error("Failed to fetch Shopify variants");
  return await res.json();
}
