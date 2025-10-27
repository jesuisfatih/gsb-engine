import { defineStore } from "pinia";
import { byCategory, getProduct, PRODUCTS, type Category, type Technique } from "../../catalog/products";
import { useEditorStore } from "./editorStore";
import { validateDesign } from "../engine/constraints";
import { cropDataURL, composeMockup2D } from "../engine/mockup";

const MM_PER_INCH = 25.4;

export const useProductStore = defineStore("product", {
  state: () => ({
    category: "textile" as Category,
    productId: "tshirt-front" as string,
    technique: "dtf" as Technique,
    color: "White" as string | null,
    material: "Cotton" as string | null,
    quantity: 1,
  }),
  getters: {
    product(state) { return getProduct(state.productId)!; },
    productsByCat(state) { return byCategory(state.category); },
    pxPerMm(state) { return this.product.dpi / MM_PER_INCH; },
    // Baský alanýný sahneye ortalarýz
    designAreaPx(): { x:number;y:number;w:number;h:number } {
      const ed = useEditorStore();
      const p = this.product;
      const pxPerMm = this.pxPerMm;
      const w = Math.round(p.area.widthMm * pxPerMm);
      const h = Math.round(p.area.heightMm * pxPerMm);
      const x = Math.round((ed.sheetWpx - w) / 2);
      const y = Math.round((ed.sheetHpx - h) / 2);
      return { x, y, w, h };
    },
    safeMarginPx(): number {
      return Math.round(this.product.area.safeMarginMm * this.pxPerMm);
    },
    // Doðrulama sonucu
    validation(): ReturnType<typeof validateDesign> {
      const ed = useEditorStore();
      return validateDesign(ed.items, this.product, this.technique, this.designAreaPx, this.pxPerMm);
    },
  },
  actions: {
    setCategory(cat: Category) {
      this.category = cat;
      const list = byCategory(cat);
      if (list.length) this.productId = list[0].id;
    },
    exportCroppedPNG(): string | null {
      const ed = useEditorStore();
      if (!ed._stage) return null;
      const a = this.designAreaPx;
      return ed._stage.toDataURL({ x: a.x, y: a.y, width: a.w, height: a.h, pixelRatio: 2, mimeType: "image/png" });
    },
    async exportMockup2D(): Promise<string | null> {
      const png = this.exportCroppedPNG();
      if (!png) return null;
      const m = this.product.mockup;
      if (!m?.baseUrl || !m?.placementPx) return png;
      return await composeMockup2D(m.baseUrl, png, m.placementPx);
    },
    // Üretime gönderilecek paket
    async buildProductionPayload() {
      const ed = useEditorStore();
      const a = this.designAreaPx;
      const stageUrl = ed._stage!.toDataURL({ pixelRatio: 2 });
      const design = await cropDataURL(stageUrl, { x: a.x, y: a.y, width: a.w, height: a.h });

      return {
        productId: this.productId,
        technique: this.technique,
        color: this.color,
        material: this.material,
        quantity: this.quantity,
        dpi: this.product.dpi,
        widthMm: this.product.area.widthMm,
        heightMm: this.product.area.heightMm,
        designPNG: design
      };
    }
  }
});

