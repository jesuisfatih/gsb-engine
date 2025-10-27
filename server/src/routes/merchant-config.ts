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

merchantConfigRouter.get("/appearance", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { branding: true },
    });

    const branding = tenant?.branding as Record<string, unknown> | undefined;
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
