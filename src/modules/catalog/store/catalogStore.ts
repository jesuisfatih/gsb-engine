import { defineStore } from "pinia";
import type { ProductDefinition, ProductSurface } from "../../editor/types";
import { mmToPx } from "../../editor/utils/units";
import {
  fetchCatalog,
  fetchSeedCatalog,
  fetchShopifyProducts,
  fetchShopifyVariants,
  fetchVariantSurfaceMappings,
  upsertVariantSurfaceMapping,
  deleteVariantSurfaceMapping,
  createProduct as createProductApi,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
  createSurface as createSurfaceApi,
  updateSurfaceApi,
  deleteSurface as deleteSurfaceApi,
  type ShopifyProductSummary,
  type ShopifyVariantSummary,
  type VariantSurfaceMappingRecord,
} from "../services/catalogService";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";

interface VariantMapping {
  id: string;
  productId: string;
  productSlug: string;
  productTitle?: string | null;
  surfaceId: string;
  surfaceName?: string | null;
  shopifyProductId?: string | null;
  shopifyProductTitle?: string | null;
  shopifyVariantId: string;
  shopifyVariantTitle?: string | null;
  options?: Record<string, unknown> | null;
  technique?: string | null;
  color?: string | null;
  material?: string | null;
  updatedAt?: string | Date;
  shortcodeHandle?: string | null;
}

interface VariantMappingInput {
  productSlug: string;
  productId?: string;
  surfaceId: string;
  shopifyVariantId: string;
  shopifyProductId?: string | null;
  shopifyProductTitle?: string | null;
  shopifyVariantTitle?: string | null;
  options?: Record<string, unknown> | null;
  technique?: string | null;
  color?: string | null;
  material?: string | null;
  shortcodeHandle?: string | null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSurface(surface: ProductSurface): ProductSurface {
  const ppi = surface.ppi ?? 300;
  const widthPx = surface.widthPx ?? (surface.widthMm !== undefined ? mmToPx(surface.widthMm, ppi) : 0);
  const heightPx = surface.heightPx ?? (surface.heightMm !== undefined ? mmToPx(surface.heightMm, ppi) : 0);
  const safeMarginPx = surface.safeMarginPx ?? (surface.safeMarginMm !== undefined ? mmToPx(surface.safeMarginMm, ppi) : 0);
  const bleedMarginPx = surface.bleedMarginPx ?? (surface.bleedMarginMm !== undefined ? mmToPx(surface.bleedMarginMm, ppi) : undefined);
  return {
    ...surface,
    widthPx,
    heightPx,
    safeMarginPx,
    bleedMarginPx,
  };
}

function normalizeProduct(product: ProductDefinition): ProductDefinition {
  const normalizedSurfaces = (product.surfaces ?? []).map(normalizeSurface);
  return {
    ...product,
    surfaces: normalizedSurfaces,
  };
}

function normalizeVariantMapping(record: VariantSurfaceMappingRecord): VariantMapping {
  return {
    id: record.id,
    productId: record.productId,
    productSlug: record.productSlug,
    productTitle: record.productTitle ?? null,
    surfaceId: record.surfaceId,
    surfaceName: record.surfaceName ?? null,
    shopifyProductId: record.shopifyProductId ?? null,
    shopifyProductTitle: record.shopifyProductTitle ?? null,
    shopifyVariantId: record.shopifyVariantId,
    shopifyVariantTitle: record.shopifyVariantTitle ?? null,
    options: record.options ?? null,
    technique: record.technique ?? null,
    color: record.color ?? null,
    material: record.material ?? null,
    shortcodeHandle: record.shortcodeHandle ?? null,
    updatedAt: record.updatedAt ?? undefined,
  };
}

export const useCatalogStore = defineStore("catalog", {
  state: () => ({
  products: [] as ProductDefinition[],
  loading: false,
  loaded: false,
  error: null as string | null,
  shopifyProducts: [] as ShopifyProductSummary[],
  shopifyLoading: false,
  shopifyVariants: {} as Record<string, ShopifyVariantSummary[]>,
  variantMappings: [] as VariantMapping[],
  variantMappingsLoading: false,
  }),

  getters: {
    sortedProducts(state): ProductDefinition[] {
      return [...state.products].sort((a, b) => a.title.localeCompare(b.title));
    },
    variantsForProduct: state => (productId: string) => state.shopifyVariants[productId] ?? [],
    variantMappingLookup(state) {
      const map: Record<string, VariantMapping> = {};
      for (const entry of state.variantMappings)
        map[entry.shopifyVariantId] = entry;
      return map;
    },
    mappingForVariant: state => (variantId: string) =>
      state.variantMappings.find(entry => entry.shopifyVariantId === variantId) ?? null,
    mappingForSurface: state => (payload: { productSlug: string; surfaceId: string; color?: string | null; material?: string | null }) => {
      return state.variantMappings.find(entry => {
        if (entry.productSlug !== payload.productSlug) return false;
        if (entry.surfaceId !== payload.surfaceId) return false;
        if (payload.color !== undefined && payload.color !== null) {
          if ((entry.color ?? null) !== payload.color) return false;
        }
        if (payload.material !== undefined && payload.material !== null) {
          if ((entry.material ?? null) !== payload.material) return false;
        }
        return true;
      }) ?? null;
    },
  },

  actions: {
    async ensureLoaded(force = false) {
      if (this.loaded && !force)
        return;
      this.loading = true;
      this.error = null;
      try {
        const session = useSessionStore();
        
        if (!session.accessToken) {
          console.warn("[catalog] No access token available, using seed data");
          const fallback = await fetchSeedCatalog();
          this.products = clone(fallback.map(normalizeProduct));
          // Do not mark as loaded so we retry once auth is established.
          this.loaded = false;
          return;
        }

        if (session.accessToken && !session.activeTenantId)
          await session.fetchServerSession({ silent: true }).catch(() => {});

        const data = await fetchCatalog();
        this.products = clone(data.map(normalizeProduct));
        this.loaded = true;
      } catch (primaryError: any) {
        const status = primaryError?.response?.status;
        if (status === 401 || status === 403) {
          console.warn("[catalog] Authentication failed, using seed data");
        } else {
          console.warn("[catalog] API catalog fetch failed, falling back to seed data.", primaryError);
        }
        
        try {
          const fallback = await fetchSeedCatalog();
          this.products = clone(fallback.map(normalizeProduct));
          // If auth failed, allow future retries once session is valid.
          const authFailure = status === 401 || status === 403;
          this.loaded = !authFailure;
        } catch (fallbackError: any) {
          this.error = fallbackError?.message ?? primaryError?.message ?? String(fallbackError ?? primaryError);
        }
      } finally {
        this.loading = false;
      }
    },

    async loadVariantMappings(force = false) {
      if (this.variantMappings.length && !force)
        return this.variantMappings;
      this.variantMappingsLoading = true;
      try {
        const records = await fetchVariantSurfaceMappings();
        this.variantMappings = records.map(normalizeVariantMapping);
        return this.variantMappings;
      } catch (error) {
        console.warn("[catalog] failed to load variant mappings", error);
        this.variantMappings = [];
        throw error;
      } finally {
        this.variantMappingsLoading = false;
      }
    },

    async addProduct(product: ProductDefinition) {
      const notifications = useNotificationStore();
      const optimistic = normalizeProduct(product);
      this.products.push(clone(optimistic));
      try {
        const saved = await createProductApi(product);
        const idx = this.products.findIndex(p => p.slug === optimistic.slug);
        if (idx > -1)
          this.products[idx] = normalizeProduct(saved);
        notifications.success("Product created");
      } catch (error: any) {
        this.products = this.products.filter(p => p.slug !== optimistic.slug);
        notifications.error(error?.message ?? "Unable to create product");
        throw error;
      }
    },

    async updateProduct(slug: string, patch: Partial<ProductDefinition>) {
      const notifications = useNotificationStore();
      const idx = this.products.findIndex(p => p.slug === slug);
      if (idx === -1) return;
      const current = this.products[idx];
      const merged = normalizeProduct({ ...current, ...clone(patch) });
      this.products[idx] = merged;

      if (!current.id) {
        notifications.error("This product cannot be updated until it is saved to the server.");
        this.products[idx] = current;
        throw new Error("Missing product id");
      }

      try {
        const saved = await updateProductApi(current.id, { ...merged });
        this.products[idx] = normalizeProduct(saved);
        notifications.success("Product updated");
      } catch (error: any) {
        this.products[idx] = current;
        notifications.error(error?.message ?? "Unable to update product");
        throw error;
      }
    },

    async addSurface(productSlug: string, surface: ProductSurface) {
      const notifications = useNotificationStore();
      const product = this.products.find(p => p.slug === productSlug);
      if (!product) return;
      if (!product.surfaces) product.surfaces = [];
      const optimistic = normalizeSurface(surface);
      product.surfaces.push(clone(optimistic));

      if (!product.id) {
        notifications.error("Cannot add a surface before the product is saved.");
        product.surfaces = product.surfaces.filter(s => s.id !== optimistic.id);
        throw new Error("Missing product id");
      }

      try {
        const saved = await createSurfaceApi(product.id, surface);
        const idx = product.surfaces.findIndex(s => s.id === optimistic.id);
        if (idx > -1)
          product.surfaces.splice(idx, 1, normalizeSurface(saved));
        else
          product.surfaces.push(normalizeSurface(saved));
        notifications.success("Surface added");
      } catch (error: any) {
        product.surfaces = product.surfaces.filter(s => s.id !== optimistic.id);
        notifications.error(error?.message ?? "Unable to add surface");
        throw error;
      }
    },

    async updateSurface(productSlug: string, surfaceId: string, patch: Partial<ProductSurface>) {
      const notifications = useNotificationStore();
      const product = this.products.find(p => p.slug === productSlug);
      if (!product) return;
      const idx = product.surfaces.findIndex(s => s.id === surfaceId);
      if (idx === -1) return;
      const original = product.surfaces[idx];
      const mergedSurface = normalizeSurface({ ...original, ...clone(patch) });
      product.surfaces.splice(idx, 1, mergedSurface);

      if (!product.id) {
        notifications.error("Cannot update surfaces while offline.");
        product.surfaces.splice(idx, 1, original);
        throw new Error("Missing product id");
      }

      try {
        const saved = await updateSurfaceApi(product.id, { ...mergedSurface, id: surfaceId });
        product.surfaces.splice(idx, 1, normalizeSurface(saved));
        notifications.success("Surface updated");
      } catch (error: any) {
        product.surfaces.splice(idx, 1, original);
        notifications.error(error?.message ?? "Unable to update surface");
        throw error;
      }
    },

    async removeSurface(productSlug: string, surfaceId: string) {
      const notifications = useNotificationStore();
      const product = this.products.find(p => p.slug === productSlug);
      if (!product) return;
      const index = product.surfaces.findIndex(s => s.id === surfaceId);
      if (index === -1) return;
      const [existing] = product.surfaces.splice(index, 1);
      const previousMappings = [...this.variantMappings];
      this.variantMappings = this.variantMappings.filter(m => !(m.productSlug === productSlug && m.surfaceId === surfaceId));

      if (!product.id) {
        notifications.error("Cannot remove surfaces before the product is saved.");
        product.surfaces.splice(index, 0, existing);
        this.variantMappings = previousMappings;
        throw new Error("Missing product id");
      }

      try {
        await deleteSurfaceApi(product.id, surfaceId);
        notifications.success("Surface removed");
      } catch (error: any) {
        product.surfaces.splice(index, 0, existing);
        this.variantMappings = previousMappings;
        notifications.error(error?.message ?? "Unable to remove surface");
        throw error;
      }
    },

    async deleteProduct(slug: string) {
      const notifications = useNotificationStore();
      const idx = this.products.findIndex(p => p.slug === slug);
      if (idx === -1) return;
      const product = this.products[idx];
      if (!product.id) {
        notifications.error("Cannot delete a product that is not saved on the server.");
        throw new Error("Missing product id");
      }
      this.products.splice(idx, 1);
      try {
        await deleteProductApi(product.id);
        notifications.success("Product deleted");
      } catch (error: any) {
        this.products.splice(idx, 0, product);
        notifications.error(error?.message ?? "Unable to delete product");
        throw error;
      }
    },

    async fetchShopifyCatalog() {
      this.shopifyLoading = true;
      try {
        this.shopifyProducts = await fetchShopifyProducts();
      } finally {
        this.shopifyLoading = false;
      }
    },

    async fetchShopifyProductVariants(productId: string) {
      this.shopifyLoading = true;
      try {
        const variants = await fetchShopifyVariants(productId);
        this.shopifyVariants = { ...this.shopifyVariants, [productId]: variants };
      } finally {
        this.shopifyLoading = false;
      }
    },

    async mapVariant(payload: VariantMappingInput, options: { notify?: boolean } = {}) {
      const { notify = true } = options;
      const notifications = useNotificationStore();

      const product =
        (payload.productId ? this.products.find(p => p.id === payload.productId) : undefined) ??
        this.products.find(p => p.slug === payload.productSlug);

      if (!product || !product.id) {
        const message = `Product "${payload.productSlug}" bulunamadı.`;
        if (notify)
          notifications.error(message);
        throw new Error(message);
      }

      const surface = product.surfaces?.find(s => s.id === payload.surfaceId);
      if (!surface) {
        const message = `Surface eşleşmesi (${payload.surfaceId}) bulunamadı.`;
        if (notify)
          notifications.error(message);
        throw new Error(message);
      }

      try {
        const saved = await upsertVariantSurfaceMapping({
          productSlug: product.slug,
          surfaceId: surface.id,
          shopifyVariantId: payload.shopifyVariantId,
          shopifyVariantTitle: payload.shopifyVariantTitle ?? payload.shopifyVariantId,
          shopifyProductId: payload.shopifyProductId ?? product.shopifyProductId ?? null,
          shopifyProductTitle: payload.shopifyProductTitle ?? product.title,
          options: payload.options ?? null,
          technique: payload.technique ?? null,
          color: payload.color ?? null,
          material: payload.material ?? null,
          shortcodeHandle: payload.shortcodeHandle ?? null,
        });

        const normalized = normalizeVariantMapping(saved);
        this.variantMappings = this.variantMappings.filter(entry => entry.shopifyVariantId !== normalized.shopifyVariantId);
        this.variantMappings.push(normalized);

        if (notify)
          notifications.success("Shopify varyant eşlemesi kaydedildi.");

        return normalized;
      } catch (error: any) {
        console.warn("[catalog] mapVariant failed", error);
        if (notify)
          notifications.error(error?.response?._data?.error ?? error?.message ?? "Varyant eşlemesi kaydedilemedi.");
        throw error;
      }
    },

    async removeVariantMapping(variantId: string, options: { notify?: boolean } = {}) {
      const { notify = true } = options;
      const notifications = useNotificationStore();
      const snapshot = [...this.variantMappings];
      this.variantMappings = this.variantMappings.filter(entry => entry.shopifyVariantId !== variantId);

      try {
        await deleteVariantSurfaceMapping(variantId);
        if (notify)
          notifications.info("Varyant eşlemesi kaldırıldı.");
      } catch (error: any) {
        console.warn("[catalog] removeVariantMapping failed", error);
        this.variantMappings = snapshot;
        if (notify)
          notifications.error(error?.response?._data?.error ?? error?.message ?? "Varyant eşlemesi kaldırılamadı.");
        throw error;
      }
    },
  },
});
