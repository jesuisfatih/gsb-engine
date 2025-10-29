import { Router } from "express";
import { Prisma } from "../../../src/generated/prisma/client";
import { z } from "zod";

const decimalOrNull = (value: number | null | undefined) =>
  value === null || value === undefined ? null : new Prisma.Decimal(value);

const productSizeSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1),
  widthIn: z.number().positive().optional().nullable(),
  heightIn: z.number().positive().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  maxFiles: z.number().int().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

const productConfigSchema = z.object({
  sizeOption: z.string().min(1),
  sizeUnit: z.string().min(1),
  productType: z.string().min(1),
  printFileNameTokens: z.array(z.string()).default([]),
  useCustomButtonLabel: z.boolean(),
  customButtonLabel: z.string().nullable(),
  settings: z.record(z.any()).default({}),
  sizes: z.array(productSizeSchema).default([]),
});

const builderSettingsSchema = z
  .object({
    spacing: z.object({
      duplicate: z.number(),
      artboard: z.number(),
      image: z.number(),
    }),
    toggles: z.record(z.boolean()),
    resolution: z.object({
      optimal: z.number(),
      good: z.number(),
      bad: z.number(),
      hideTerrible: z.boolean().optional().default(false),
      minimum: z.number(),
    }),
    other: z
      .object({
        allowReorder: z.boolean().optional().default(false),
        enableCustomerAccount: z.boolean().optional().default(false),
        defaultLanguage: z.string().optional().default("English"),
        enableLiveChat: z.boolean().optional().default(false),
        useStoreLogoSpinner: z.boolean().optional().default(false),
        requireLogin: z.boolean().optional().default(false),
      })
      .optional(),
  })
  .strict();

const gallerySettingsSchema = z
  .object({
    builder: z.object({
      showImageGallery: z.boolean(),
      enableSort: z.boolean(),
      enableColorOverlay: z.boolean(),
      categoryViewMode: z.string().min(1),
    }),
    watermark: z
      .object({
        useShopLogo: z.boolean(),
        opacity: z.number().min(0).max(1),
      })
      .optional(),
  })
  .strict();

const listAssetsQuery = z.object({
  type: z.string().optional().default("gallery.image"),
});

const handlePattern = /^[a-z0-9-]+$/i;

const variantMappingInputSchema = z.object({
  productSlug: z.string().min(1),
  surfaceId: z.string().min(1),
  shopifyVariantId: z.string().min(1),
  shopifyVariantTitle: z.string().optional().nullable(),
  shopifyProductId: z.string().optional().nullable(),
  shopifyProductTitle: z.string().optional().nullable(),
  technique: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  options: z.record(z.any()).optional().nullable(),
  shortcodeHandle: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(handlePattern, "Handle may only contain letters, numbers, and hyphen")
    .optional()
    .nullable(),
});

const variantMappingsPayloadSchema = z.object({
  mappings: z.array(variantMappingInputSchema).min(1),
});

const variantIdParamSchema = z.object({
  variantId: z.string().min(1),
});

type VariantMappingWithRelations = Prisma.VariantSurfaceMappingGetPayload<{
  include: {
    product: { select: { id: true; slug: true; title: true } };
    surface: { select: { id: true; name: true } };
  };
}>;

function toVariantMappingResponse(record: VariantMappingWithRelations) {
  if (!record.product || !record.surface) {
    throw new Error("Variant mapping is missing relational data");
  }

  return {
    id: record.id,
    productId: record.productId,
    productSlug: record.product.slug,
    productTitle: record.product.title,
    surfaceId: record.surfaceId,
    surfaceName: record.surface.name,
    shopifyProductId: record.shopifyProductId ?? null,
    shopifyProductTitle: record.shopifyProductTitle ?? null,
    shopifyVariantId: record.shopifyVariantId,
    shopifyVariantTitle: record.shopifyVariantTitle ?? null,
    options: record.options ?? null,
    technique: record.technique ?? null,
    color: record.color ?? null,
    material: record.material ?? null,
    shortcodeHandle: record.shortcodeHandle ?? null,
    updatedAt: record.updatedAt,
  };
}

function normaliseShortcodeHandle(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

const defaultProductConfig = {
  sizeOption: "Size",
  sizeUnit: "in",
  productType: "Gang Sheet",
  printFileNameTokens: [] as string[],
  useCustomButtonLabel: false,
  customButtonLabel: null as string | null,
  settings: {} as Record<string, unknown>,
  sizes: [] as unknown[],
};

const defaultBuilderSettings = {
  spacing: {
    duplicate: 0.5,
    artboard: 0.125,
    image: 0.125,
  },
  toggles: {
    disableBackgroundRemove: false,
    enableHalftone: false,
    disableText: false,
    useCustomTextColors: false,
    useCustomImageOverlayColors: false,
    autoBuild: true,
    openAutoBuildDefault: true,
    alwaysDisplayVariants: false,
    enableFlipOver: true,
    showGangSheetPrice: false,
    enableFolderOrganisation: false,
    enableNotesPerSheet: false,
    requireBackgroundRemovalConfirmation: false,
  },
  resolution: {
    optimal: 300,
    good: 250,
    bad: 200,
    hideTerrible: false,
    minimum: 72,
  },
  other: {
    allowReorder: true,
    enableCustomerAccount: true,
    defaultLanguage: "English",
    enableLiveChat: false,
    useStoreLogoSpinner: false,
    requireLogin: false,
  },
};

const defaultGallerySettings = {
  builder: {
    showImageGallery: true,
    enableSort: false,
    enableColorOverlay: false,
    categoryViewMode: "Dropdown",
  },
  watermark: {
    useShopLogo: false,
    opacity: 0.4,
  },
};

const generalSettingsSchema = z.object({
  merchantName: z.string().min(1),
  supportEmail: z.string().email().nullable().optional(),
  replyToEmail: z.string().email().nullable().optional(),
  defaultLanguage: z.string().min(1),
  timeZone: z.string().min(1),
  orderPrefix: z.string().max(32).nullable().optional(),
  notifications: z.object({
    newSubmission: z.boolean(),
    approvalReminder: z.boolean(),
    weeklySummary: z.boolean(),
  }),
});

const defaultGeneralSettings = {
  merchantName: "Merchant",
  supportEmail: null as string | null,
  replyToEmail: null as string | null,
  defaultLanguage: "English",
  timeZone: "America/New_York",
  orderPrefix: "",
  notifications: {
    newSubmission: true,
    approvalReminder: true,
    weeklySummary: false,
  },
};

const filenameTokenLibrary = [
  "Order Name",
  "Customer Name",
  "Order Id",
  "Variant Title",
  "Quantity",
  "Product Title",
  "Design Name",
  "Shipping Method",
  "Sku",
  "Actual Height",
  "Variant Width",
  "YYYY",
  "MM",
  "DD",
] as const;

const supportedPrintFileTypes = ["PNG", "JPG", "PDF"] as const;
const supportedDownloadBehaviours = ["browser", "download"] as const;
const supportedUploadFileTypes = ["PNG", "WEBP", "JPG", "SVG", "PSD", "AI", "EPS", "PDF"] as const;

const gangSheetSettingsSchema = z.object({
  filenameTokens: z.array(z.string().min(1)).max(16),
  preferredFileType: z.enum(supportedPrintFileTypes),
  downloadBehavior: z.enum(supportedDownloadBehaviours),
  autoTrim: z.boolean().default(true),
  includeFileName: z.boolean().default(true),
  includeBranding: z.boolean().default(false),
  allowedUploadTypes: z.array(z.enum(supportedUploadFileTypes)).default(["PNG", "SVG", "PDF"]),
  connectors: z
    .object({
      dropbox: z.boolean().default(false),
      googleDrive: z.boolean().default(false),
    })
    .default({ dropbox: false, googleDrive: false }),
});

const defaultGangSheetSettings: z.infer<typeof gangSheetSettingsSchema> = {
  filenameTokens: ["Order Name", "Customer Name", "Order Id", "Variant Title", "Quantity"],
  preferredFileType: "PNG",
  downloadBehavior: "download",
  autoTrim: true,
  includeFileName: true,
  includeBranding: false,
  allowedUploadTypes: ["PNG", "SVG", "PDF"],
  connectors: {
    dropbox: false,
    googleDrive: false,
  },
};

const setupStatusValues = ["todo", "in_progress", "done"] as const;
type SetupStatus = typeof setupStatusValues[number];

const defaultSetupSteps = [
  {
    id: "connect-shopify",
    title: "Connect Shopify store",
    description: "App installed and OAuth completed.",
    cta: { label: "View store" },
  },
  {
    id: "enable-theme-embed",
    title: "Enable theme app embed",
    description: "Editor button visible on product detail pages.",
    cta: { label: "Theme app embeds" },
  },
  {
    id: "import-products",
    title: "Import Shopify products",
    description: "Select products to map to gang sheet builders.",
    cta: { label: "Open products", route: "/shopify/embedded/products" },
  },
  {
    id: "configure-gang-sheet",
    title: "Configure gang sheet output",
    description: "File name templates, auto trim, and download options.",
    cta: { label: "Open settings", route: "/shopify/embedded/gang-sheet" },
  },
  {
    id: "customise-appearance",
    title: "Customise appearance",
    description: "Choose colours, font, and welcome popup content.",
    cta: { label: "Theme options", route: "/shopify/embedded/appearance" },
  },
  {
    id: "upload-assets",
    title: "Upload fonts & gallery assets",
    description: "Add brand-specific fonts and background images.",
    cta: { label: "Manage assets", route: "/shopify/embedded/gallery-images" },
  },
  {
    id: "review-billing",
    title: "Review billing & transactions",
    description: "Understand per-order fees and export transaction data.",
    cta: { label: "Transactions", route: "/shopify/embedded/transactions" },
  },
] as const;

const defaultSetupStatuses: Record<string, SetupStatus> = {
  "connect-shopify": "done",
  "enable-theme-embed": "done",
  "import-products": "in_progress",
  "configure-gang-sheet": "todo",
  "customise-appearance": "todo",
  "upload-assets": "todo",
  "review-billing": "todo",
};

const setupSettingsSchema = z.object({
  statuses: z.record(z.enum(setupStatusValues)).optional(),
});

const appearanceSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().min(1).optional(),
  secondaryColor: z.string().min(1).optional(),
  accentColor: z.string().min(1).optional(),
  backgroundStyle: z
    .object({
      gradient: z.array(z.string()).max(2).optional(),
      textureUrl: z.string().url().nullable().optional(),
    })
    .optional(),
  typography: z
    .object({
      headingFont: z.string().optional(),
      bodyFont: z.string().optional(),
      buttonFont: z.string().optional(),
    })
    .optional(),
  layout: z
    .object({
      mainBackground: z.string().min(1).optional(),
      sidebarBackground: z.string().min(1).optional(),
      topbarBackground: z.string().min(1).optional(),
      textColor: z.string().min(1).optional(),
    })
    .optional(),
  welcomePopup: z
    .object({
      enabled: z.boolean().optional(),
      message: z.string().max(500).nullable().optional(),
      defaultView: z.enum(["list", "gallery"]).optional(),
      quickActions: z
        .object({
          startNew: z.boolean().optional(),
          reopenPrevious: z.boolean().optional(),
          autoBuild: z.boolean().optional(),
          resumeDraft: z.boolean().optional(),
          nameAndNumber: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

const defaultAppearance = {
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  primaryColor: "#5d5af1",
  secondaryColor: "#7c4dff",
  accentColor: "#407afc",
  backgroundStyle: {
    gradient: ["#f7f9ff", "#fbf4ff"],
    textureUrl: null as string | null,
  },
  typography: {
    headingFont: "Poppins",
    bodyFont: "Inter",
    buttonFont: "DM Sans",
  },
  layout: {
    mainBackground: "#ffffff",
    sidebarBackground: "#ffffff",
    topbarBackground: "#f8fafc",
    textColor: "#0f172a",
  },
  welcomePopup: {
    enabled: true,
    message: "Welcome to our custom printing studio!",
    defaultView: "list" as "list" | "gallery",
    quickActions: {
      startNew: true,
      reopenPrevious: true,
      autoBuild: true,
      resumeDraft: true,
      nameAndNumber: false,
    },
  },
};

const imageToSheetSettingsSchema = z.object({
  printerWidth: z.number().positive().nullable().optional(),
  useVariantWidths: z.boolean().default(false),
  maxHeight: z.number().positive().nullable().optional(),
  imageMargin: z.number().nonnegative().nullable().optional(),
  artboardMargin: z.number().nonnegative().nullable().optional(),
  unit: z.string().min(1).default("in"),
  enableAllLocations: z.boolean().default(true),
  disableDownloadValidation: z.boolean().default(false),
  password: z.string().nullable().optional(),
  pricingMode: z.string().min(1).default("area"),
  pricePerUnit: z.number().nonnegative().nullable().optional(),
  pricingSide: z.string().min(1).default("Width"),
  shippingWeightRate: z.number().nonnegative().nullable().optional(),
  sizes: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        label: z.string().min(1),
        widthIn: z.number().positive().nullable().optional(),
        heightIn: z.number().positive().nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
});

const defaultImageToSheetSettings = {
  printerWidth: null as number | null,
  useVariantWidths: false,
  maxHeight: null as number | null,
  imageMargin: 0.01,
  artboardMargin: 0.01,
  unit: "in",
  enableAllLocations: true,
  disableDownloadValidation: false,
  password: null as string | null,
  pricingMode: "area",
  pricePerUnit: 0.01,
  pricingSide: "Width",
  shippingWeightRate: 0,
  sizes: [] as unknown[],
};

export const merchantConfigRouter = Router();

function requireTenant(res: Parameters<typeof merchantConfigRouter.get>[1]["res"], tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

merchantConfigRouter.get("/catalog/products", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;

    const products = await prisma.product.findMany({
      where: tenantId
        ? {
            OR: [{ tenantId }, { tenantId: null }],
            deletedAt: null,
          }
        : { deletedAt: null },
      orderBy: [{ tenantId: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        surfaces: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ data: products });
  }
  catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/catalog/mappings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const mappings = await prisma.variantSurfaceMapping.findMany({
      where: { tenantId },
      include: {
        product: { 
          select: { id: true, slug: true, title: true, deletedAt: true },
        },
        surface: { 
          select: { id: true, name: true, deletedAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Filter out mappings with missing or deleted relations
    const validMappings = mappings.filter(m => 
      m.product && m.surface && 
      !m.product.deletedAt && !m.surface.deletedAt
    );
    
    // Log orphaned mappings for cleanup
    const orphaned = mappings.filter(m => 
      !m.product || !m.surface || 
      m.product.deletedAt || m.surface.deletedAt
    );
    if (orphaned.length > 0) {
      console.warn(`[merchant-config] Found ${orphaned.length} orphaned/deleted variant mappings for tenant ${tenantId}`);
    }

    res.json({
      data: validMappings.map(m => toVariantMappingResponse({
        ...m,
        product: { id: m.product!.id, slug: m.product!.slug, title: m.product!.title },
        surface: { id: m.surface!.id, name: m.surface!.name },
      })),
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/catalog/mappings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = variantMappingsPayloadSchema.parse(req.body ?? {});
    const results: VariantMappingWithRelations[] = [];

    const requestedHandles = new Set<string>();
    for (const item of payload.mappings) {
      const normalised = normaliseShortcodeHandle(item.shortcodeHandle ?? undefined);
      if (normalised) {
        requestedHandles.add(normalised);
      }
    }

    if (requestedHandles.size) {
      const list = await prisma.shortcode.findMany({
        where: {
          tenantId,
          handle: { in: Array.from(requestedHandles) },
        },
        select: { handle: true },
      });
      const knownHandles = new Set(list.map(entry => entry.handle));
      const missing = Array.from(requestedHandles).filter(handle => !knownHandles.has(handle));
      if (missing.length) {
        res.status(422).json({
          error: `Shortcode${missing.length > 1 ? "s" : ""} ${missing.join(", ")} not found for this merchant.`,
        });
        return;
      }
    }

    for (const item of payload.mappings) {
      const shortcodeHandle = normaliseShortcodeHandle(item.shortcodeHandle ?? undefined);
      const primaryProduct = await prisma.product.findFirst({
        where: { slug: item.productSlug, tenantId },
        select: {
          id: true,
          slug: true,
          title: true,
          shopifyProductId: true,
          surfaces: {
            select: { id: true, name: true },
          },
        },
      });

      const fallbackProduct = await prisma.product.findFirst({
        where: { slug: item.productSlug, tenantId: null },
        select: {
          id: true,
          slug: true,
          title: true,
          shopifyProductId: true,
          surfaces: {
            select: { id: true, name: true },
          },
        },
      });

      const product = primaryProduct ?? fallbackProduct;
      if (!product) {
        res.status(404).json({ error: `Product "${item.productSlug}" not found.` });
        return;
      }

      const surface = product.surfaces.find(s => s.id === item.surfaceId);
      if (!surface) {
        res.status(404).json({ error: `Surface ${item.surfaceId} does not belong to product "${product.slug}".` });
        return;
      }

      const saved = await prisma.variantSurfaceMapping.upsert({
        where: {
          tenantId_shopifyVariantId: {
            tenantId,
            shopifyVariantId: item.shopifyVariantId,
          },
        },
        update: {
          productId: product.id,
          surfaceId: surface.id,
          shopifyProductId: item.shopifyProductId ?? product.shopifyProductId ?? null,
          shopifyProductTitle: item.shopifyProductTitle ?? product.title,
          shopifyVariantTitle: item.shopifyVariantTitle ?? item.shopifyVariantId,
          options: item.options ?? null,
          technique: item.technique ?? null,
          color: item.color ?? null,
          material: item.material ?? null,
          shortcodeHandle,
        },
        create: {
          tenantId,
          productId: product.id,
          surfaceId: surface.id,
          shopifyProductId: item.shopifyProductId ?? product.shopifyProductId ?? null,
          shopifyProductTitle: item.shopifyProductTitle ?? product.title,
          shopifyVariantId: item.shopifyVariantId,
          shopifyVariantTitle: item.shopifyVariantTitle ?? item.shopifyVariantId,
          options: item.options ?? null,
          technique: item.technique ?? null,
          color: item.color ?? null,
          material: item.material ?? null,
          shortcodeHandle,
        },
        include: {
          product: { select: { id: true, slug: true, title: true } },
          surface: { select: { id: true, name: true } },
        },
      });

      results.push(saved);
    }

    res.json({
      data: results.map(toVariantMappingResponse),
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.delete("/catalog/mappings/:variantId", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const { variantId } = variantIdParamSchema.parse(req.params);

    try {
      await prisma.variantSurfaceMapping.delete({
        where: {
          tenantId_shopifyVariantId: {
            tenantId,
            shopifyVariantId: variantId,
          },
        },
      });
    } catch (deleteError: any) {
      if (!(deleteError instanceof Prisma.PrismaClientKnownRequestError && deleteError.code === "P2025")) {
        throw deleteError;
      }
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/products/:productId/builder", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const productId = req.params.productId;
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        OR: [{ tenantId }, { tenantId: null }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const config = await prisma.productBuilderConfig.findUnique({
      where: {
        tenantId_productId: {
          tenantId,
          productId,
        },
      },
      include: {
        sizes: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    const payload = {
      ...defaultProductConfig,
      ...config,
      printFileNameTokens: (config?.printFileNameTokens as string[] | null) ?? [],
      settings: (config?.settings as Record<string, unknown> | undefined) ?? {},
      sizes:
        config?.sizes.map(size => ({
          id: size.id,
          label: size.label,
          widthIn: size.widthIn?.toNumber() ?? null,
          heightIn: size.heightIn?.toNumber() ?? null,
          price: size.price?.toNumber() ?? null,
          maxFiles: size.maxFiles ?? null,
          sortOrder: size.sortOrder,
        })) ?? [],
    };

    res.json({
      data: {
        product,
        config: payload,
      },
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/products/:productId/builder", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const productId = req.params.productId;

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        OR: [{ tenantId }, { tenantId: null }],
      },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const payload = productConfigSchema.parse(req.body);

    const config = await prisma.$transaction(async tx => {
      const upserted = await tx.productBuilderConfig.upsert({
        where: {
          tenantId_productId: {
            tenantId,
            productId,
          },
        },
        create: {
          tenantId,
          productId,
          sizeOption: payload.sizeOption,
          sizeUnit: payload.sizeUnit,
          productType: payload.productType,
          printFileNameTokens: payload.printFileNameTokens,
          useCustomButtonLabel: payload.useCustomButtonLabel,
          customButtonLabel: payload.customButtonLabel,
          settings: payload.settings,
        },
        update: {
          sizeOption: payload.sizeOption,
          sizeUnit: payload.sizeUnit,
          productType: payload.productType,
          printFileNameTokens: payload.printFileNameTokens,
          useCustomButtonLabel: payload.useCustomButtonLabel,
          customButtonLabel: payload.customButtonLabel,
          settings: payload.settings,
        },
      });

      if (payload.sizes) {
        await tx.productSizePreset.deleteMany({ where: { configId: upserted.id } });

        if (payload.sizes.length > 0) {
          await tx.productSizePreset.createMany({
            data: payload.sizes.map((size, index) => ({
              id: size.id,
              configId: upserted.id,
              label: size.label,
              widthIn: decimalOrNull(size.widthIn ?? null),
              heightIn: decimalOrNull(size.heightIn ?? null),
              price: decimalOrNull(size.price ?? null),
              maxFiles: size.maxFiles ?? null,
              sortOrder: size.sortOrder ?? index,
              metadata: Prisma.JsonNull,
            })),
          });
        }
      }

      return upserted;
    });

    const fresh = await prisma.productBuilderConfig.findUnique({
      where: { id: config.id },
      include: { sizes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });

    res.json({
      data: {
        ...defaultProductConfig,
        ...fresh,
        printFileNameTokens: (fresh?.printFileNameTokens as string[] | null) ?? [],
        settings: (fresh?.settings as Record<string, unknown> | undefined) ?? {},
        sizes:
          fresh?.sizes.map(size => ({
            id: size.id,
            label: size.label,
            widthIn: size.widthIn?.toNumber() ?? null,
            heightIn: size.heightIn?.toNumber() ?? null,
            price: size.price?.toNumber() ?? null,
            maxFiles: size.maxFiles ?? null,
            sortOrder: size.sortOrder,
          })) ?? [],
      },
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/builder/settings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const record = await prisma.builderSettings.findUnique({
      where: { tenantId },
    });

    const config = record?.config as Record<string, unknown> | undefined;
    const payload = config
      ? {
          ...defaultBuilderSettings,
          ...config,
          spacing: { ...defaultBuilderSettings.spacing, ...(config.spacing as Record<string, unknown> ?? {}) },
          toggles: { ...defaultBuilderSettings.toggles, ...(config.toggles as Record<string, boolean> ?? {}) },
          resolution: {
            ...defaultBuilderSettings.resolution,
            ...(config.resolution as Record<string, unknown> ?? {}),
          },
          other: { ...defaultBuilderSettings.other, ...(config.other as Record<string, unknown> ?? {}) },
        }
      : defaultBuilderSettings;

    res.json({ data: payload });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/builder/settings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = builderSettingsSchema.parse(req.body);

    const settings = await prisma.builderSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        config: payload,
      },
      update: {
        config: payload,
      },
    });

    res.json({ data: settings.config });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/gallery/settings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const record = await prisma.gallerySettings.findUnique({
      where: { tenantId },
    });

    const config = record?.builderOptions as Record<string, unknown> | undefined;
    const watermark = record?.watermark as Record<string, unknown> | undefined;

    res.json({
      data: {
        builder: { ...defaultGallerySettings.builder, ...(config ?? {}) },
        watermark: { ...defaultGallerySettings.watermark, ...(watermark ?? {}) },
      },
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/gallery/settings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = gallerySettingsSchema.parse(req.body);

    const updated = await prisma.gallerySettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        builderOptions: payload.builder,
        watermark: payload.watermark ?? defaultGallerySettings.watermark,
      },
      update: {
        builderOptions: payload.builder,
        watermark: payload.watermark ?? defaultGallerySettings.watermark,
      },
    });

    res.json({
      data: {
        builder: updated.builderOptions,
        watermark: updated.watermark,
      },
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/gallery/assets", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const query = listAssetsQuery.parse(req.query);

    const assets = await prisma.assetLibraryItem.findMany({
      where: {
        tenantId,
        type: query.type,
        deletedAt: null,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        label: true,
        url: true,
        metadata: true,
        createdAt: true,
      },
    });

    res.json({ data: assets });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/print-providers", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const providers = await prisma.supplierProfile.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: [{ tenantId: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        contactEmail: true,
        regions: true,
        techniques: true,
        leadTimeDays: true,
        metadata: true,
      },
    });

    res.json({ data: providers });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/image-to-sheet", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const settings = await prisma.imageToSheetSettings.findUnique({
      where: { tenantId },
      include: {
        sizes: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    const payload = settings
      ? {
          printerWidth: settings.printerWidth?.toNumber() ?? null,
          useVariantWidths: settings.useVariantWidths,
          maxHeight: settings.maxHeight?.toNumber() ?? null,
          imageMargin: settings.imageMargin?.toNumber() ?? null,
          artboardMargin: settings.artboardMargin?.toNumber() ?? null,
          unit: settings.unit,
          enableAllLocations: settings.enableAllLocations,
          disableDownloadValidation: settings.disableDownloadValidation,
          password: settings.password,
          pricingMode: settings.pricingMode,
          pricePerUnit: settings.pricePerUnit?.toNumber() ?? null,
          pricingSide: settings.pricingSide,
          shippingWeightRate: settings.shippingWeightRate?.toNumber() ?? null,
          sizes:
            settings.sizes.map(size => ({
              id: size.id,
              label: size.label,
              widthIn: size.widthIn?.toNumber() ?? null,
              heightIn: size.heightIn?.toNumber() ?? null,
              price: size.price?.toNumber() ?? null,
              sortOrder: size.sortOrder,
            })) ?? [],
        }
      : defaultImageToSheetSettings;

    res.json({ data: payload });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/image-to-sheet", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = imageToSheetSettingsSchema.parse(req.body);

    const upserted = await prisma.$transaction(async tx => {
      const record = await tx.imageToSheetSettings.upsert({
        where: { tenantId },
        create: {
          tenantId,
          printerWidth: decimalOrNull(payload.printerWidth ?? null),
          useVariantWidths: payload.useVariantWidths,
          maxHeight: decimalOrNull(payload.maxHeight ?? null),
          imageMargin: decimalOrNull(payload.imageMargin ?? null),
          artboardMargin: decimalOrNull(payload.artboardMargin ?? null),
          unit: payload.unit,
          enableAllLocations: payload.enableAllLocations,
          disableDownloadValidation: payload.disableDownloadValidation,
          password: payload.password ?? undefined,
          pricingMode: payload.pricingMode,
          pricePerUnit: decimalOrNull(payload.pricePerUnit ?? null),
          pricingSide: payload.pricingSide,
          shippingWeightRate: decimalOrNull(payload.shippingWeightRate ?? null),
        },
        update: {
          printerWidth: decimalOrNull(payload.printerWidth ?? null),
          useVariantWidths: payload.useVariantWidths,
          maxHeight: decimalOrNull(payload.maxHeight ?? null),
          imageMargin: decimalOrNull(payload.imageMargin ?? null),
          artboardMargin: decimalOrNull(payload.artboardMargin ?? null),
          unit: payload.unit,
          enableAllLocations: payload.enableAllLocations,
          disableDownloadValidation: payload.disableDownloadValidation,
          password: payload.password ?? undefined,
          pricingMode: payload.pricingMode,
          pricePerUnit: decimalOrNull(payload.pricePerUnit ?? null),
          pricingSide: payload.pricingSide,
          shippingWeightRate: decimalOrNull(payload.shippingWeightRate ?? null),
        },
      });

      if (payload.sizes) {
        await tx.imageToSheetSizePreset.deleteMany({ where: { settingsId: record.id } });
        if (payload.sizes.length > 0) {
          await tx.imageToSheetSizePreset.createMany({
            data: payload.sizes.map((size, index) => ({
              id: size.id,
              settingsId: record.id,
              label: size.label,
              widthIn: decimalOrNull(size.widthIn ?? null),
              heightIn: decimalOrNull(size.heightIn ?? null),
              price: decimalOrNull(size.price ?? null),
              sortOrder: size.sortOrder ?? index,
              metadata: Prisma.JsonNull,
            })),
          });
        }
      }

      return record;
    });

    const refreshed = await prisma.imageToSheetSettings.findUnique({
      where: { id: upserted.id },
      include: {
        sizes: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    const payloadResponse = refreshed
      ? {
          printerWidth: refreshed.printerWidth?.toNumber() ?? null,
          useVariantWidths: refreshed.useVariantWidths,
          maxHeight: refreshed.maxHeight?.toNumber() ?? null,
          imageMargin: refreshed.imageMargin?.toNumber() ?? null,
          artboardMargin: refreshed.artboardMargin?.toNumber() ?? null,
          unit: refreshed.unit,
          enableAllLocations: refreshed.enableAllLocations,
          disableDownloadValidation: refreshed.disableDownloadValidation,
          password: refreshed.password,
          pricingMode: refreshed.pricingMode,
          pricePerUnit: refreshed.pricePerUnit?.toNumber() ?? null,
          pricingSide: refreshed.pricingSide,
          shippingWeightRate: refreshed.shippingWeightRate?.toNumber() ?? null,
          sizes:
            refreshed.sizes.map(size => ({
              id: size.id,
              label: size.label,
              widthIn: size.widthIn?.toNumber() ?? null,
              heightIn: size.heightIn?.toNumber() ?? null,
              price: size.price?.toNumber() ?? null,
              sortOrder: size.sortOrder,
            })) ?? [],
        }
      : defaultImageToSheetSettings;

    res.json({ data: payloadResponse });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/general", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        displayName: true,
        settings: true,
      },
    });

    const settings = (tenant?.settings as Record<string, unknown> | undefined) ?? {};
    const stored = settings.general as Record<string, unknown> | undefined;
    const storedNotifications = stored?.notifications as Record<string, unknown> | undefined;

    const payload = {
      ...defaultGeneralSettings,
      ...(stored ?? {}),
      notifications: {
        ...defaultGeneralSettings.notifications,
        ...(storedNotifications ?? {}),
      },
    };

    if (!payload.merchantName) {
      payload.merchantName = tenant?.displayName ?? defaultGeneralSettings.merchantName;
    }

    res.json({ data: payload });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/general", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = generalSettingsSchema.parse({
      ...req.body,
      supportEmail: req.body?.supportEmail ?? null,
      replyToEmail: req.body?.replyToEmail ?? null,
      orderPrefix: req.body?.orderPrefix ?? "",
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, displayName: true },
    });

    const settings = (tenant?.settings as Record<string, unknown> | undefined) ?? {};
    const storedGeneral = settings.general as Record<string, unknown> | undefined;
    const storedNotifications = storedGeneral?.notifications as Record<string, unknown> | undefined;

    const mergedGeneral = {
      ...defaultGeneralSettings,
      ...(storedGeneral ?? {}),
      ...payload,
      notifications: {
        ...defaultGeneralSettings.notifications,
        ...(storedNotifications ?? {}),
        ...(payload.notifications ?? defaultGeneralSettings.notifications),
      },
    };

    const nextSettings = {
      ...settings,
      general: mergedGeneral,
    };

    const result = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        displayName: payload.merchantName ?? tenant?.displayName ?? defaultGeneralSettings.merchantName,
        settings: nextSettings,
      },
      select: {
        displayName: true,
        settings: true,
      },
    });

    const updatedSettings = (result.settings as Record<string, unknown> | undefined) ?? nextSettings;
    const updatedGeneral = updatedSettings.general as Record<string, unknown> | undefined;
    const updatedNotifications = updatedGeneral?.notifications as Record<string, unknown> | undefined;

    const responsePayload = {
      ...defaultGeneralSettings,
      ...(updatedGeneral ?? {}),
      notifications: {
        ...defaultGeneralSettings.notifications,
        ...(updatedNotifications ?? {}),
      },
      merchantName: result.displayName ?? payload.merchantName,
    };

    res.json({ data: responsePayload });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/gang-sheet", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown> | undefined) ?? {};
    const stored = settings.gangSheet as Record<string, unknown> | undefined;

    let parsed = defaultGangSheetSettings;
    if (stored) {
      const candidate = {
        ...defaultGangSheetSettings,
        ...(stored ?? {}),
      };
      const result = gangSheetSettingsSchema.safeParse(candidate);
      if (result.success) {
        parsed = {
          ...result.data,
          filenameTokens: Array.from(new Set(result.data.filenameTokens)),
          allowedUploadTypes: Array.from(new Set(result.data.allowedUploadTypes)),
        };
      }
    }

    res.json({
      data: {
        settings: parsed,
        tokens: filenameTokenLibrary,
        fileTypes: supportedPrintFileTypes,
        downloadBehaviours: supportedDownloadBehaviours,
        uploadTypes: supportedUploadFileTypes,
      },
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/gang-sheet", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = gangSheetSettingsSchema.parse(req.body ?? {});

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown> | undefined) ?? {};
    const merged = {
      ...payload,
      filenameTokens: Array.from(new Set(payload.filenameTokens)),
      allowedUploadTypes: Array.from(new Set(payload.allowedUploadTypes)),
    };

    const nextSettings = {
      ...settings,
      gangSheet: merged,
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: nextSettings,
      },
    });

    res.json({
      data: {
        settings: merged,
        tokens: filenameTokenLibrary,
        fileTypes: supportedPrintFileTypes,
        downloadBehaviours: supportedDownloadBehaviours,
        uploadTypes: supportedUploadFileTypes,
      },
    });
  } catch (error) {
    next(error);
  }
});

function normalizeSetupStatuses(stored?: Record<string, unknown> | null): Record<string, SetupStatus> {
  const normalized: Record<string, SetupStatus> = { ...defaultSetupStatuses };
  if (!stored) return normalized;
  const candidate = stored.statuses as Record<string, unknown> | undefined;
  if (!candidate) return normalized;
  for (const [key, value] of Object.entries(candidate)) {
    if (typeof value === "string" && setupStatusValues.includes(value as SetupStatus)) {
      normalized[key] = value as SetupStatus;
    }
  }
  return normalized;
}

merchantConfigRouter.get("/setup", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown> | undefined) ?? {};
    const stored = settings.setup as Record<string, unknown> | undefined;
    const statuses = normalizeSetupStatuses(stored);

    const steps = defaultSetupSteps.map(step => ({
      ...step,
      status: statuses[step.id] ?? "todo",
    }));

    const completed = steps.filter(step => step.status === "done").length;

    res.json({
      data: {
        steps,
        stats: {
          completed,
          total: steps.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/setup", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = setupSettingsSchema.parse(req.body ?? {});

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown> | undefined) ?? {};
    const existingStatuses = normalizeSetupStatuses(settings.setup as Record<string, unknown> | undefined);
    const incoming = payload.statuses ?? {};

    const merged: Record<string, SetupStatus> = { ...existingStatuses };
    for (const [key, value] of Object.entries(incoming)) {
      merged[key] = value;
    }

    const nextSettings = {
      ...settings,
      setup: {
        statuses: merged,
        updatedAt: new Date().toISOString(),
      },
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: nextSettings,
      },
    });

    const steps = defaultSetupSteps.map(step => ({
      ...step,
      status: merged[step.id] ?? "todo",
    }));
    const completed = steps.filter(step => step.status === "done").length;

    res.json({
      data: {
        steps,
        stats: {
          completed,
          total: steps.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.get("/appearance", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { branding: true },
    });

    const branding = tenant?.branding as Record<string, unknown> | undefined;
    const popup = branding?.welcomePopup as Record<string, unknown> | undefined;
    const popupActions = popup?.quickActions as Record<string, unknown> | undefined;

    const payload = {
      ...defaultAppearance,
      ...(branding ?? {}),
      backgroundStyle: {
        ...defaultAppearance.backgroundStyle,
        ...(branding?.backgroundStyle as Record<string, unknown> ?? {}),
      },
      typography: {
        ...defaultAppearance.typography,
        ...(branding?.typography as Record<string, unknown> ?? {}),
      },
      layout: {
        ...defaultAppearance.layout,
        ...(branding?.layout as Record<string, unknown> ?? {}),
      },
      welcomePopup: {
        ...defaultAppearance.welcomePopup,
        ...(popup ?? {}),
        quickActions: {
          ...defaultAppearance.welcomePopup.quickActions,
          ...(popupActions ?? {}),
        },
      },
    };

    res.json({ data: payload });
  } catch (error) {
    next(error);
  }
});

merchantConfigRouter.put("/appearance", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = appearanceSchema.parse(req.body);

    const merged = {
      ...defaultAppearance,
      ...payload,
      backgroundStyle: {
        ...defaultAppearance.backgroundStyle,
        ...(payload.backgroundStyle ?? {}),
      },
      typography: {
        ...defaultAppearance.typography,
        ...(payload.typography ?? {}),
      },
      layout: {
        ...defaultAppearance.layout,
        ...(payload.layout ?? {}),
      },
      welcomePopup: {
        ...defaultAppearance.welcomePopup,
        ...(payload.welcomePopup ?? {}),
        quickActions: {
          ...defaultAppearance.welcomePopup.quickActions,
          ...(payload.welcomePopup?.quickActions ?? {}),
        },
      },
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        branding: merged,
      },
    });

    res.json({ data: merged });
  } catch (error) {
    next(error);
  }
});
