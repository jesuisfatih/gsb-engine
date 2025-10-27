import { defineStore } from "pinia";
import type { ProductDefinition, ProductSurface } from "../../editor/types";
import { mmToPx } from "../../editor/utils/units";
import { fetchCatalog, fetchSeedCatalog, fetchShopifyProducts, fetchShopifyVariants, createProduct as createProductApi, updateProduct as updateProductApi, deleteProduct as deleteProductApi, createSurface as createSurfaceApi, updateSurfaceApi, deleteSurface as deleteSurfaceApi, type ShopifyProductSummary, type ShopifyVariantSummary } from "../services/catalogService";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";

interface VariantMapping {
  productSlug: string;
  variantId: string;
  surfaceId: string;
  color?: string | null;
  material?: string | null;
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

function variantKey(payload: { productSlug: string; surfaceId: string; color?: string | null; material?: string | null }) {
  const color = payload.color ?? "";
  const material = payload.material ?? "";
  return `${payload.productSlug}::${payload.surfaceId}::${color}::${material}`;
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
  }),

  getters: {
    sortedProducts(state): ProductDefinition[] {
      return [...state.products].sort((a, b) => a.title.localeCompare(b.title));
    },
    variantsForProduct: state => (productId: string) => state.shopifyVariants[productId] ?? [],
    variantMappingLookup(state) {
      const map: Record<string, string> = {};
      for (const entry of state.variantMappings)
        map[variantKey(entry)] = entry.variantId;
      return map;
    },
    variantMappingByVariantId(state) {
      const map: Record<string, VariantMapping> = {};
      for (const entry of state.variantMappings)
        map[entry.variantId] = entry;
      return map;
    },
    variantIdFor() {
      return (payload: { productSlug: string; surfaceId: string; color?: string | null; material?: string | null }) => {
        const key = variantKey(payload);
        return this.variantMappingLookup[key];
      };
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
        if (session.accessToken && !session.activeTenantId)
          await session.fetchServerSession({ silent: true }).catch(() => {});

        const data = await fetchCatalog();
        this.products = clone(data.map(normalizeProduct));
        this.loaded = true;
      } catch (primaryError: any) {
        console.warn("[catalog] API catalog fetch failed, falling back to seed data.", primaryError);
        try {
          const fallback = await fetchSeedCatalog();
          this.products = clone(fallback.map(normalizeProduct));
          this.loaded = true;
        } catch (fallbackError: any) {
          this.error = fallbackError?.message ?? primaryError?.message ?? String(fallbackError ?? primaryError);
        }
      } finally {
        this.loading = false;
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

    mapVariant(payload: VariantMapping) {
      this.variantMappings = this.variantMappings.filter(v => v.variantId !== payload.variantId);
      const existingIndex = this.variantMappings.findIndex(v => variantKey(v) === variantKey(payload));
      if (existingIndex > -1) this.variantMappings.splice(existingIndex, 1, clone(payload));
      else this.variantMappings.push(clone(payload));
    },

    removeVariantMapping(payload: { productSlug: string; surfaceId: string; color?: string | null; material?: string | null }) {
      const key = variantKey(payload);
      this.variantMappings = this.variantMappings.filter(v => variantKey(v) !== key);
    },
  },
});
