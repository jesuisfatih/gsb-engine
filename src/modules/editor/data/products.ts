import type { ProductDefinition, ProductSurface } from "../types";
import { mmToPx } from "../utils/units";

type SurfaceInit = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  safeMarginMm?: number;
  safeMarginPx?: number;
  bleedMarginMm?: number;
  bleedMarginPx?: number;
  ppi?: number;
  previewImage?: string;
  note?: string;
  techLimits?: ProductSurface["techLimits"];
};

const surface = (init: SurfaceInit): ProductSurface => {
  const ppi = init.ppi ?? 300;
  const widthPx = mmToPx(init.widthMm, ppi);
  const heightPx = mmToPx(init.heightMm, ppi);
  const safePx = init.safeMarginPx ?? (init.safeMarginMm !== undefined ? mmToPx(init.safeMarginMm, ppi) : 0);
  const bleedPx = init.bleedMarginPx ?? (init.bleedMarginMm !== undefined ? mmToPx(init.bleedMarginMm, ppi) : undefined);

  return {
    id: init.id,
    name: init.name,
    widthPx,
    heightPx,
    safeMarginPx: safePx,
    widthMm: init.widthMm,
    heightMm: init.heightMm,
    safeMarginMm: init.safeMarginMm,
    bleedMarginPx: bleedPx,
    bleedMarginMm: init.bleedMarginMm,
    ppi,
    previewImage: init.previewImage,
    note: init.note,
    techLimits: init.techLimits,
  };
};

export const PRODUCTS: ProductDefinition[] = [
  // Generic canvas/poster for unmapped Shopify products
  {
    slug: "canvas-poster",
    title: "Canvas / Poster",
    materials: ["canvas", "poster-paper"],
    colors: undefined,
    surfaces: [
      surface({
        id: "canvas-front",
        name: "Canvas Front",
        widthMm: 400,
        heightMm: 600,
        safeMarginMm: 10,
        bleedMarginMm: 3,
        note: "Generic canvas surface for unmapped products",
      }),
    ],
    pricing: {
      base: 25,
      perSqIn: 0.15,
      techMultipliers: { dtf: 1.0 },
      quantityBreaks: [],
    },
  },
  {
    slug: "gangsheet",
    title: "DTF Gang Sheet",
    materials: ["dtf-film"],
    colors: undefined,
    surfaces: [
      surface({
        id: "gangsheet-22x24",
        name: '22" x 24" Sheet',
        widthMm: 558.8,
        heightMm: 609.6,
        safeMarginMm: 3.175,
        bleedMarginMm: 3.175,
        note: "Standard short-run gang sheet. Auto-pack optimised.",
      }),
      surface({
        id: "gangsheet-22x60",
        name: '22" x 60" Sheet',
        widthMm: 558.8,
        heightMm: 1524,
        safeMarginMm: 3.175,
        bleedMarginMm: 3.175,
        note: "Extended roll segment ideal for auto build batches.",
      }),
    ],
    pricing: {
      base: 180,
      perSqIn: 0.18,
      techMultipliers: { dtf: 1.0 },
      quantityBreaks: [
        { qty: 5, discountPct: 5 },
        { qty: 15, discountPct: 9 },
        { qty: 30, discountPct: 14 },
      ],
    },
  },
  {
    slug: "tshirt",
    title: "T-Shirt",
    materials: ["cotton", "cotton-poly blend"],
    colors: ["white", "black", "navy", "heather-gray", "red", "forest"],
    surfaces: [
      surface({
        id: "tshirt-front",
        name: "Front",
        widthMm: 380,
        heightMm: 520,
        safeMarginMm: 25,
        bleedMarginMm: 5,
        techLimits: { embroidery: { minFontPx: 20, minStrokePx: 2 }, screen: { maxColors: 6 } },
        note: "Avoid placing artwork over seams or neck label area.",
      }),
      surface({
        id: "tshirt-back",
        name: "Back",
        widthMm: 380,
        heightMm: 520,
        safeMarginMm: 25,
        bleedMarginMm: 5,
        techLimits: { embroidery: { minFontPx: 20, minStrokePx: 2 }, screen: { maxColors: 6 } },
      }),
      surface({
        id: "tshirt-sleeve-left",
        name: "Sleeve Left",
        widthMm: 120,
        heightMm: 300,
        safeMarginMm: 12,
        bleedMarginMm: 3,
        techLimits: { embroidery: { minFontPx: 18, minStrokePx: 2 } },
      }),
      surface({
        id: "tshirt-sleeve-right",
        name: "Sleeve Right",
        widthMm: 120,
        heightMm: 300,
        safeMarginMm: 12,
        bleedMarginMm: 3,
        techLimits: { embroidery: { minFontPx: 18, minStrokePx: 2 } },
      }),
    ],
    pricing: {
      base: 125,
      perSqIn: 0.26,
      colorAdder: 6,
      techMultipliers: { dtf: 1.0, digital: 1.0, sublimation: 1.05, screen: 0.85, embroidery: 1.4 },
      quantityBreaks: [
        { qty: 10, discountPct: 8 },
        { qty: 25, discountPct: 12 },
        { qty: 50, discountPct: 18 },
      ],
    },
  },
  {
    slug: "hoodie",
    title: "Hoodie",
    materials: ["fleece", "cotton-poly blend"],
    colors: ["white", "black", "charcoal", "sand", "navy"],
    surfaces: [
      surface({
        id: "hoodie-front",
        name: "Front",
        widthMm: 400,
        heightMm: 540,
        safeMarginMm: 30,
        bleedMarginMm: 6,
        techLimits: { embroidery: { minFontPx: 22, minStrokePx: 2 }, screen: { maxColors: 6 } },
        note: "Keep zipper channel clear for full-zip styles.",
      }),
      surface({
        id: "hoodie-back",
        name: "Back",
        widthMm: 400,
        heightMm: 540,
        safeMarginMm: 30,
        bleedMarginMm: 6,
        techLimits: { embroidery: { minFontPx: 22, minStrokePx: 2 }, screen: { maxColors: 6 } },
      }),
      surface({
        id: "hoodie-hood",
        name: "Hood",
        widthMm: 260,
        heightMm: 320,
        safeMarginMm: 16,
        bleedMarginMm: 4,
        note: "Curved surface; use center-safe placement.",
      }),
      surface({
        id: "hoodie-sleeve-left",
        name: "Sleeve Left",
        widthMm: 130,
        heightMm: 360,
        safeMarginMm: 14,
        bleedMarginMm: 4,
      }),
      surface({
        id: "hoodie-sleeve-right",
        name: "Sleeve Right",
        widthMm: 130,
        heightMm: 360,
        safeMarginMm: 14,
        bleedMarginMm: 4,
      }),
    ],
    pricing: {
      base: 210,
      perSqIn: 0.32,
      colorAdder: 7,
      techMultipliers: { dtf: 1.05, digital: 1.05, sublimation: 1.1, screen: 0.9, embroidery: 1.45 },
      quantityBreaks: [
        { qty: 12, discountPct: 8 },
        { qty: 36, discountPct: 14 },
        { qty: 72, discountPct: 18 },
      ],
    },
  },
  {
    slug: "sweatshirt",
    title: "Crewneck Sweatshirt",
    materials: ["fleece", "cotton-poly blend"],
    colors: ["white", "black", "maroon", "navy", "ash"],
    surfaces: [
      surface({
        id: "sweatshirt-front",
        name: "Front",
        widthMm: 380,
        heightMm: 520,
        safeMarginMm: 24,
        bleedMarginMm: 5,
      }),
      surface({
        id: "sweatshirt-back",
        name: "Back",
        widthMm: 380,
        heightMm: 520,
        safeMarginMm: 24,
        bleedMarginMm: 5,
      }),
    ],
    pricing: {
      base: 175,
      perSqIn: 0.28,
      colorAdder: 6,
      techMultipliers: { dtf: 1.0, digital: 1.0, sublimation: 1.05, screen: 0.88, embroidery: 1.4 },
      quantityBreaks: [
        { qty: 12, discountPct: 7 },
        { qty: 36, discountPct: 12 },
        { qty: 72, discountPct: 17 },
      ],
    },
  },
  {
    slug: "cap",
    title: "Cap",
    materials: ["polyester", "cotton"],
    colors: ["black", "navy", "red", "khaki"],
    surfaces: [
      surface({
        id: "cap-front",
        name: "Front Panel",
        widthMm: 220,
        heightMm: 120,
        safeMarginMm: 8,
        bleedMarginMm: 2,
        techLimits: { embroidery: { minFontPx: 22, minStrokePx: 2, maxColors: 6 } },
        note: "Slight curvature; keep within center safe zone.",
      }),
      surface({
        id: "cap-side-left",
        name: "Side Left",
        widthMm: 120,
        heightMm: 110,
        safeMarginMm: 6,
        bleedMarginMm: 2,
      }),
      surface({
        id: "cap-side-right",
        name: "Side Right",
        widthMm: 120,
        heightMm: 110,
        safeMarginMm: 6,
        bleedMarginMm: 2,
      }),
    ],
    pricing: {
      base: 98,
      perSqIn: 0.23,
      colorAdder: 5,
      techMultipliers: { embroidery: 1.5, dtf: 1.12, digital: 1.0, screen: 0.95 },
      quantityBreaks: [
        { qty: 24, discountPct: 8 },
        { qty: 48, discountPct: 13 },
        { qty: 96, discountPct: 18 },
      ],
    },
  },
  {
    slug: "beanie",
    title: "Beanie",
    materials: ["acrylic", "wool"],
    colors: ["black", "charcoal", "olive", "cream"],
    surfaces: [
      surface({
        id: "beanie-front",
        name: "Front Patch",
        widthMm: 140,
        heightMm: 90,
        safeMarginMm: 6,
        bleedMarginMm: 2,
        techLimits: { embroidery: { minFontPx: 20, minStrokePx: 2 } },
        note: "Best for woven labels or small crests.",
      }),
    ],
    pricing: {
      base: 80,
      perSqIn: 0.24,
      colorAdder: 4,
      techMultipliers: { embroidery: 1.55, dtf: 1.2 },
      quantityBreaks: [
        { qty: 24, discountPct: 7 },
        { qty: 72, discountPct: 12 },
      ],
    },
  },
  {
    slug: "mug",
    title: "Ceramic Mug",
    materials: ["ceramic"],
    colors: ["white", "black", "navy"],
    surfaces: [
      surface({
        id: "mug-wrap",
        name: "Full Wrap",
        widthMm: 210,
        heightMm: 95,
        safeMarginMm: 8,
        bleedMarginMm: 3,
        techLimits: { screen: { maxColors: 4 } },
        note: "Add mirrored bleed for sublimation jobs.",
      }),
      surface({
        id: "mug-panel-left",
        name: "Panel Left",
        widthMm: 95,
        heightMm: 95,
        safeMarginMm: 6,
        bleedMarginMm: 2,
      }),
      surface({
        id: "mug-panel-right",
        name: "Panel Right",
        widthMm: 95,
        heightMm: 95,
        safeMarginMm: 6,
        bleedMarginMm: 2,
      }),
    ],
    pricing: {
      base: 72,
      perSqIn: 0.16,
      colorAdder: 4,
      techMultipliers: { sublimation: 1.0, digital: 1.0, screen: 0.82, dtf: 1.25 },
      quantityBreaks: [
        { qty: 24, discountPct: 9 },
        { qty: 72, discountPct: 15 },
        { qty: 144, discountPct: 20 },
      ],
    },
  },
  {
    slug: "tumbler",
    title: "Tumbler",
    materials: ["stainless steel"],
    colors: ["silver", "white", "matte-black"],
    surfaces: [
      surface({
        id: "tumbler-wrap",
        name: "Full Wrap",
        widthMm: 230,
        heightMm: 160,
        safeMarginMm: 10,
        bleedMarginMm: 4,
        note: "Tapered body; enable warp guides for precise placement.",
      }),
    ],
    pricing: {
      base: 140,
      perSqIn: 0.19,
      techMultipliers: { sublimation: 1.05, uv: 1.15, dtf: 1.2 },
      quantityBreaks: [
        { qty: 24, discountPct: 8 },
        { qty: 72, discountPct: 14 },
      ],
    },
  },
  {
    slug: "tote-bag",
    title: "Tote Bag",
    materials: ["canvas", "cotton"],
    colors: ["natural", "black", "navy"],
    surfaces: [
      surface({
        id: "totebag-front",
        name: "Front",
        widthMm: 330,
        heightMm: 360,
        safeMarginMm: 18,
        bleedMarginMm: 6,
      }),
      surface({
        id: "totebag-back",
        name: "Back",
        widthMm: 330,
        heightMm: 360,
        safeMarginMm: 18,
        bleedMarginMm: 6,
      }),
    ],
    pricing: {
      base: 95,
      perSqIn: 0.21,
      colorAdder: 4,
      techMultipliers: { dtf: 1.05, digital: 1.0, screen: 0.88 },
      quantityBreaks: [
        { qty: 24, discountPct: 8 },
        { qty: 72, discountPct: 13 },
      ],
    },
  },
  {
    slug: "pillow",
    title: "Pillow Cover",
    materials: ["polyester", "linen"],
    colors: ["white", "natural", "heather"],
    surfaces: [
      surface({
        id: "pillow-front",
        name: "Front",
        widthMm: 460,
        heightMm: 460,
        safeMarginMm: 18,
        bleedMarginMm: 5,
      }),
      surface({
        id: "pillow-back",
        name: "Back",
        widthMm: 460,
        heightMm: 460,
        safeMarginMm: 18,
        bleedMarginMm: 5,
      }),
    ],
    pricing: {
      base: 130,
      perSqIn: 0.18,
      colorAdder: 4,
      techMultipliers: { sublimation: 1.0, dtf: 1.05, digital: 1.05 },
      quantityBreaks: [
        { qty: 16, discountPct: 7 },
        { qty: 48, discountPct: 12 },
      ],
    },
  },
  {
    slug: "poster",
    title: "Poster",
    materials: ["matte paper", "gloss paper"],
    colors: undefined,
    surfaces: [
      surface({
        id: "poster-a2",
        name: "A2",
        widthMm: 420,
        heightMm: 594,
        safeMarginMm: 0,
        bleedMarginMm: 3,
        note: "Include crop marks for giclee output.",
      }),
      surface({
        id: "poster-a3",
        name: "A3",
        widthMm: 297,
        heightMm: 420,
        safeMarginMm: 0,
        bleedMarginMm: 3,
      }),
    ],
    pricing: {
      base: 65,
      perSqIn: 0.12,
      techMultipliers: { digital: 1.0, screen: 0.9, sublimation: 1.1 },
      quantityBreaks: [
        { qty: 25, discountPct: 10 },
        { qty: 100, discountPct: 18 },
      ],
    },
  },
  {
    slug: "wall-decal",
    title: "Wall Decal",
    materials: ["vinyl"],
    colors: undefined,
    surfaces: [
      surface({
        id: "wall-decal-rectangle",
        name: "Rectangle",
        widthMm: 600,
        heightMm: 900,
        safeMarginMm: 12,
        bleedMarginMm: 5,
        note: "Add contour cut path for kiss-cut decals.",
      }),
    ],
    pricing: {
      base: 110,
      perSqIn: 0.2,
      techMultipliers: { digital: 1.0, uv: 1.1 },
      quantityBreaks: [
        { qty: 10, discountPct: 8 },
        { qty: 30, discountPct: 12 },
      ],
    },
  },
  {
    slug: "mousepad",
    title: "Mouse Pad",
    materials: ["neoprene"],
    colors: undefined,
    surfaces: [
      surface({
        id: "mousepad-standard",
        name: "Standard",
        widthMm: 235,
        heightMm: 195,
        safeMarginMm: 8,
        bleedMarginMm: 3,
      }),
    ],
    pricing: {
      base: 55,
      perSqIn: 0.17,
      techMultipliers: { sublimation: 1.0, dtf: 1.15, digital: 1.1 },
      quantityBreaks: [
        { qty: 24, discountPct: 8 },
        { qty: 72, discountPct: 13 },
      ],
    },
  },
  {
    slug: "magnet",
    title: "Fridge Magnet",
    materials: ["flexible magnet"],
    colors: undefined,
    surfaces: [
      surface({
        id: "magnet-rect",
        name: "Rectangle",
        widthMm: 90,
        heightMm: 60,
        safeMarginMm: 4,
        bleedMarginMm: 2,
      }),
      surface({
        id: "magnet-square",
        name: "Square",
        widthMm: 70,
        heightMm: 70,
        safeMarginMm: 4,
        bleedMarginMm: 2,
      }),
    ],
    pricing: {
      base: 35,
      perSqIn: 0.14,
      techMultipliers: { digital: 1.0, uv: 1.1 },
      quantityBreaks: [
        { qty: 50, discountPct: 10 },
        { qty: 200, discountPct: 18 },
      ],
    },
  },
];
