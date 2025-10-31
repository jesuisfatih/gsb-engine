import type { Prisma, PrismaClient } from "../../../src/generated/prisma/client";
import { Router } from "express";
import { z } from "zod";

const querySchema = z.object({
  includeVariants: z.coerce.boolean().default(true),
  includeSurfaces: z.coerce.boolean().default(true),
  includeDeleted: z.coerce.boolean().default(false),
});

const surfaceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  safeArea: z.object({}).catchall(z.any()).optional(),
  bleedArea: z.object({}).catchall(z.any()).optional(),
  maskSvg: z.string().optional(),
  ppi: z.number().int().optional(),
  metadata: z.object({}).catchall(z.any()).optional(),
});

const createProductSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  attributes: z.object({}).catchall(z.any()).optional(),
  surfaces: z.array(surfaceSchema).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  slug: z.string().min(1).optional(),
});

export const catalogRouter = Router();

// POST /api/catalog/seed - Quick seed sample product for tenant
catalogRouter.post("/seed", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    console.log("[catalog] Seeding sample product for tenant:", tenantId);

    const product = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId, slug: "canvas-poster" } },
      update: {},
      create: {
        tenantId,
        slug: "canvas-poster",
        title: "Canvas Poster",
        category: "textile",
        description: "Customizable canvas poster",
        attributes: {
          materials: ["canvas"],
          techniques: ["dtf", "sublimation"],
        },
      },
      include: { surfaces: true },
    });

    const surfaces = [
      { 
        name: "20x30 cm", 
        widthMm: 200, 
        heightMm: 300,
        metadata: {
          previewImage: "/images/mockups/canvas-20x30.png",
          note: "Canvas 20x30 cm"
        }
      },
      { 
        name: "30x40 cm", 
        widthMm: 300, 
        heightMm: 400,
        metadata: {
          previewImage: "/images/mockups/canvas-30x40.png",
          note: "Canvas 30x40 cm"
        }
      },
      { 
        name: "40x60 cm", 
        widthMm: 400, 
        heightMm: 600,
        metadata: {
          previewImage: "/images/mockups/canvas-40x60.png",
          note: "Canvas 40x60 cm"
        }
      },
    ];

    const existing = new Set(product.surfaces.map(s => s.name));
    
    for (const surf of surfaces) {
      if (existing.has(surf.name)) continue;
      await prisma.surface.create({
        data: {
          productId: product.id,
          name: surf.name,
          widthMm: surf.widthMm,
          heightMm: surf.heightMm,
          safeArea: { marginMm: 5 },
          ppi: 300,
          metadata: surf.metadata,
        },
      });
    }

    const refreshed = await prisma.product.findUnique({
      where: { id: product.id },
      include: { surfaces: true },
    });

    console.log("[catalog] Sample product ready:", refreshed?.title, "with", refreshed?.surfaces.length, "surfaces");

    res.json({ 
      success: true, 
      data: { 
        id: refreshed?.id ?? product.id, 
        slug: refreshed?.slug ?? product.slug, 
        title: refreshed?.title ?? product.title,
        surfaceCount: refreshed?.surfaces.length ?? 0
      } 
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Product already exists" });
    }
    console.error("[catalog] Seed error:", error);
    next(error);
  }
});

type ProductAccessResult =
  | { product: Awaited<ReturnType<PrismaClient["product"]["findUnique"]>> }
  | { status: number; message: string };

async function getProductWithAccess(
  prisma: PrismaClient,
  tenantId: string | undefined,
  productId: string,
  options: { allowDeleted?: boolean } = {},
): Promise<ProductAccessResult> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { status: 404, message: "Product not found" };
  if (product.tenantId && tenantId && product.tenantId !== tenantId) {
    return { status: 403, message: "Forbidden" };
  }
  if (!product.tenantId && tenantId) {
    return { status: 403, message: "Cannot modify global catalog" };
  }
  if (product.deletedAt && !options.allowDeleted) {
    return { status: 404, message: "Product not found" };
  }
  return { product };
}

catalogRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const query = querySchema.parse(req.query);

    const where: Prisma.ProductWhereInput = {
      deletedAt: query.includeDeleted ? undefined : null,
    };
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    }

    const include: Prisma.ProductInclude = {};
    if (query.includeSurfaces) {
      include.surfaces = {
        where: query.includeDeleted ? undefined : { deletedAt: null },
        orderBy: { createdAt: "asc" },
      };
    }
    if (query.includeVariants) {
      include.variants = true;
    }

    const products = await prisma.product.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: products });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const query = querySchema.parse(req.query);
    const result = await getProductWithAccess(prisma, tenantId, req.params.id, {
      allowDeleted: query.includeDeleted,
    });
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        surfaces: query.includeSurfaces
          ? {
              where: query.includeDeleted ? undefined : { deletedAt: null },
              orderBy: { createdAt: "asc" },
            }
          : undefined,
        variants: query.includeVariants ? true : undefined,
      },
    });
    return res.json({ data: product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }
    const payload = createProductSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        tenantId,
        slug: payload.slug,
        title: payload.title,
        category: payload.category,
        description: payload.description,
        attributes: payload.attributes ?? undefined,
        surfaces: payload.surfaces && payload.surfaces.length
          ? {
              create: payload.surfaces.map(surface => ({
                id: surface.id,
                name: surface.name,
                description: surface.description,
                widthMm: surface.widthMm,
                heightMm: surface.heightMm,
                safeArea: surface.safeArea,
                bleedArea: surface.bleedArea,
                maskSvg: surface.maskSvg,
                ppi: surface.ppi,
                metadata: surface.metadata ?? undefined,
              })),
            }
          : undefined,
      },
      include: {
        surfaces: true,
        variants: true,
      },
    });

    res.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.patch("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const productId = req.params.id;
    const payload = updateProductSchema.parse(req.body);

    const result = await getProductWithAccess(prisma, tenantId, productId);
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        slug: payload.slug ?? undefined,
        title: payload.title ?? undefined,
        category: payload.category ?? undefined,
        description: payload.description ?? undefined,
        attributes: payload.attributes ?? undefined,
      },
      include: {
        surfaces: {
          where: { deletedAt: null },
        },
        variants: true,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

catalogRouter.delete("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const productId = req.params.id;
    const result = await getProductWithAccess(prisma, tenantId, productId);
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    if (result.product.deletedAt) {
      return res.status(204).send();
    }

    const deletedAt = new Date();
    await prisma.$transaction(async tx => {
      await tx.surface.updateMany({
        where: { productId },
        data: { deletedAt },
      });
      await tx.product.update({
        where: { id: productId },
        data: { deletedAt },
      });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

catalogRouter.patch("/:id/restore", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const productId = req.params.id;
    const result = await getProductWithAccess(prisma, tenantId, productId, { allowDeleted: true });
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    if (!result.product.deletedAt) {
      return res.status(200).json({ data: result.product });
    }

    const restored = await prisma.$transaction(async tx => {
      await tx.surface.updateMany({
        where: { productId },
        data: { deletedAt: null },
      });

      return tx.product.update({
        where: { id: productId },
        data: { deletedAt: null },
        include: {
          surfaces: {
            where: { deletedAt: null },
          },
          variants: true,
        },
      });
    });

    res.json({ data: restored });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/:id/surfaces", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const productId = req.params.id;
    const surfacePayload = surfaceSchema.parse(req.body);
    const result = await getProductWithAccess(prisma, tenantId, productId);
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    const surface = await prisma.surface.create({
      data: {
        productId,
        id: surfacePayload.id,
        name: surfacePayload.name,
        description: surfacePayload.description,
        widthMm: surfacePayload.widthMm,
        heightMm: surfacePayload.heightMm,
        safeArea: surfacePayload.safeArea,
        bleedArea: surfacePayload.bleedArea,
        maskSvg: surfacePayload.maskSvg,
        ppi: surfacePayload.ppi,
        metadata: surfacePayload.metadata ?? undefined,
      },
    });

    res.status(201).json({ data: surface });
  } catch (error) {
    next(error);
  }
});

catalogRouter.patch("/:id/surfaces/:surfaceId", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const productId = req.params.id;
    const surfaceId = req.params.surfaceId;
    const surfacePayload = surfaceSchema.partial().parse(req.body);

    const result = await getProductWithAccess(prisma, tenantId, productId);
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    const surface = await prisma.surface.update({
      where: { id: surfaceId },
      data: {
        name: surfacePayload.name ?? undefined,
        description: surfacePayload.description ?? undefined,
        widthMm: surfacePayload.widthMm ?? undefined,
        heightMm: surfacePayload.heightMm ?? undefined,
        safeArea: surfacePayload.safeArea ?? undefined,
        bleedArea: surfacePayload.bleedArea ?? undefined,
        maskSvg: surfacePayload.maskSvg ?? undefined,
        ppi: surfacePayload.ppi ?? undefined,
        metadata: surfacePayload.metadata ?? undefined,
      },
    });

    res.json({ data: surface });
  } catch (error) {
    next(error);
  }
});

catalogRouter.delete("/:id/surfaces/:surfaceId", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const productId = req.params.id;
    const surfaceId = req.params.surfaceId;

    const result = await getProductWithAccess(prisma, tenantId, productId);
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    await prisma.surface.delete({ where: { id: surfaceId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
