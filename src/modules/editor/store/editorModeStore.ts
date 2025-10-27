import { defineStore } from "pinia";
import type { LayerItem, PrintTech, ProductDefinition, ProductSurface } from "../types";
import { useEditorStore } from "./editorStore";

type EditorMode = "dtf" | "gang";

interface ModeSnapshot {
  items: LayerItem[];
  productSlug: string;
  surfaceId: string;
  color: string;
  printTech: PrintTech;
  sheetWidthPx: number;
  sheetHeightPx: number;
}

function cloneSnapshot(snapshot: ModeSnapshot | null): ModeSnapshot | null {
  if (!snapshot) return null;
  return {
    productSlug: snapshot.productSlug,
    surfaceId: snapshot.surfaceId,
    color: snapshot.color,
    printTech: snapshot.printTech,
    sheetWidthPx: snapshot.sheetWidthPx,
    sheetHeightPx: snapshot.sheetHeightPx,
    items: JSON.parse(JSON.stringify(snapshot.items ?? [])),
  };
}

function fallbackSlugForMode(mode: EditorMode, products: ProductDefinition[]): string {
  if (mode === "gang") return "gangsheet";
  const nonGang = products.find(p => p.slug !== "gangsheet");
  return nonGang?.slug ?? products[0]?.slug ?? "tshirt";
}

function normalizeSnapshot(
  snapshot: ModeSnapshot,
  mode: EditorMode,
  editor: ReturnType<typeof useEditorStore>
): ModeSnapshot {
  const products = editor.products as ProductDefinition[];
  const result = cloneSnapshot(snapshot);
  if (!result || !products.length) return snapshot;

  if (mode === "gang") result.productSlug = "gangsheet";
  if (mode === "dtf" && result.productSlug === "gangsheet") {
    result.productSlug = fallbackSlugForMode("dtf", products);
  }

  let product = products.find(p => p.slug === result.productSlug);
  if (!product) {
    result.productSlug = fallbackSlugForMode(mode, products);
    product = products.find(p => p.slug === result.productSlug) ?? products[0];
  }

  if (!product) return result;
  const surfaceExists = product.surfaces.some((surface: ProductSurface) => surface.id === result.surfaceId);
  if (!surfaceExists) {
    result.surfaceId = product.surfaces[0]?.id ?? result.surfaceId;
  }

  result.sheetWidthPx = result.sheetWidthPx ?? editor.sheetWpx;
  result.sheetHeightPx = result.sheetHeightPx ?? editor.sheetHpx;

  return result;
}

export const useEditorModeStore = defineStore("editorMode", {
  state: () => ({
    activeMode: "dtf" as EditorMode,
    cache: {
      dtf: null as ModeSnapshot | null,
      gang: null as ModeSnapshot | null,
    },
    lastProduct: {
      dtf: "tshirt",
      gang: "gangsheet",
    } as Record<EditorMode, string>,
  }),
  actions: {
    captureSnapshot(mode: EditorMode) {
      const editor = useEditorStore();
      this.cache[mode] = editor.serializeSnapshot();
      this.lastProduct[mode] = editor.productSlug;
    },
    switchTo(mode: EditorMode) {
      if (mode === this.activeMode) return;
      const editor = useEditorStore();
      this.captureSnapshot(this.activeMode);

      this.activeMode = mode;

      let snapshot = cloneSnapshot(this.cache[mode]);
      if (!snapshot && mode === "gang" && this.cache.dtf) {
        snapshot = cloneSnapshot(this.cache.dtf);
        if (snapshot) {
          snapshot.productSlug = "gangsheet";
          snapshot.surfaceId = snapshot.surfaceId && snapshot.surfaceId.startsWith("gangsheet")
            ? snapshot.surfaceId
            : "gangsheet-22x24";
          const gangProduct = (editor.products as ProductDefinition[]).find(p => p.slug === "gangsheet");
          const gangSurface = gangProduct?.surfaces.find((s: ProductSurface) => s.id === snapshot?.surfaceId);
          snapshot.sheetWidthPx = gangSurface?.widthPx ?? editor.sheetWpx;
          snapshot.sheetHeightPx = gangSurface?.heightPx ?? editor.sheetHpx;
        }
      }
      if (!snapshot) {
        const slug = fallbackSlugForMode(mode, editor.products as ProductDefinition[]);
        snapshot = {
          items: [],
          productSlug: slug,
          surfaceId: editor.products.find((p: ProductDefinition) => p.slug === slug)?.surfaces[0]?.id ?? "",
          color: editor.color,
          printTech: editor.printTech,
          sheetWidthPx: editor.sheetWpx,
          sheetHeightPx: editor.sheetHpx,
        };
        const fallbackProduct = (editor.products as ProductDefinition[]).find(p => p.slug === snapshot.productSlug);
        const fallbackSurface = fallbackProduct?.surfaces.find((s: ProductSurface) => s.id === snapshot?.surfaceId);
        snapshot.sheetWidthPx = fallbackSurface?.widthPx ?? snapshot.sheetWidthPx;
        snapshot.sheetHeightPx = fallbackSurface?.heightPx ?? snapshot.sheetHeightPx;
      }

      const normalized = normalizeSnapshot(snapshot, mode, editor);
      editor.applySnapshot(normalized);
      this.lastProduct[mode] = normalized.productSlug;
    },
    syncFrom(sourceMode: EditorMode) {
      const editor = useEditorStore();
      const sourceSnapshot = sourceMode === this.activeMode
        ? editor.serializeSnapshot()
        : cloneSnapshot(this.cache[sourceMode]);
      if (!sourceSnapshot) return;
      const normalized = normalizeSnapshot(sourceSnapshot, this.activeMode, editor);
      this.cache[this.activeMode] = cloneSnapshot(normalized);
      editor.applySnapshot(normalized);
      this.lastProduct[this.activeMode] = normalized.productSlug;
    },
  },
});
