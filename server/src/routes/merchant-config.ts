import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../../src/generated/prisma/client";

export const merchantConfigRouter = Router();

/**
 * Validation schemas
 */
const variantMappingInputSchema = z.object({
  productSlug: z.string().min(1),
  surfaceId: z.string().uuid(),
  shopifyProductId: z.string().nullish(),
  shopifyProductTitle: z.string().nullish(),
  shopifyVariantId: z.string().min(1),
  shopifyVariantTitle: z.string().nullish(),
  options: z.any().nullish(),
  technique: z.string().nullish(),
  color: z.string().nullish(),
  material: z.string().nullish(),
  shortcodeHandle: z.string().nullish(),
});

const bulkUpsertSchema = z.object({
  mappings: z.array(variantMappingInputSchema).min(1),
});

const variantIdParamSchema = z.object({
  variantId: z.string().min(1),
});

/**
 * GET /api/merchant/config/catalog/mappings
 * List all variant-surface mappings for the current tenant
 */
merchantConfigRouter.get("/catalog/mappings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;

    if (!tenantId) {
      return res.status(401).json({ error: "Missing tenant context" });
    }

    console.log("[merchant-config] Fetching variant mappings for tenant:", tenantId);

    const mappings = await prisma.variantSurfaceMapping.findMany({
      where: { tenantId },
      include: {
        product: {
          select: { id: true, slug: true, title: true },
        },
        surface: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Transform to frontend format
    const data = mappings.map((mapping) => ({
      id: mapping.id,
      productId: mapping.productId,
      productSlug: mapping.product?.slug ?? null,
      productTitle: mapping.product?.title ?? null,
      surfaceId: mapping.surfaceId,
      surfaceName: mapping.surface?.name ?? null,
      shopifyProductId: mapping.shopifyProductId ?? null,
      shopifyProductTitle: mapping.shopifyProductTitle ?? null,
      shopifyVariantId: mapping.shopifyVariantId,
      shopifyVariantTitle: mapping.shopifyVariantTitle ?? null,
      options: mapping.options ?? null,
      technique: mapping.technique ?? null,
      color: mapping.color ?? null,
      material: mapping.material ?? null,
      shortcodeHandle: mapping.shortcodeHandle ?? null,
      updatedAt: mapping.updatedAt.toISOString(),
    }));

    console.log(`[merchant-config] Found ${data.length} variant mappings`);

    res.json({ data });
  } catch (error) {
    console.error("[merchant-config] Error fetching variant mappings:", error);
    next(error);
  }
});

/**
 * PUT /api/merchant/config/catalog/mappings
 * Upsert (bulk create/update) variant-surface mappings
 */
merchantConfigRouter.put("/catalog/mappings", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;

    if (!tenantId) {
      return res.status(401).json({ error: "Missing tenant context" });
    }

    const { mappings } = bulkUpsertSchema.parse(req.body);

    console.log(`[merchant-config] Upserting ${mappings.length} variant mappings for tenant:`, tenantId);

    const results = [];

    for (const input of mappings) {
      // Find the product by slug
      const product = await prisma.product.findFirst({
        where: {
          tenantId,
          slug: input.productSlug,
        },
      });

      if (!product) {
        console.warn(`[merchant-config] Product not found for slug: ${input.productSlug}`);
        return res.status(404).json({
          error: "Product not found",
          slug: input.productSlug,
        });
      }

      // Verify that the surface exists and belongs to this product
      const surface = await prisma.surface.findFirst({
        where: {
          id: input.surfaceId,
          productId: product.id,
        },
      });

      if (!surface) {
        console.warn(`[merchant-config] Surface not found: ${input.surfaceId} for product: ${product.id}`);
        return res.status(404).json({
          error: "Surface not found for this product",
          surfaceId: input.surfaceId,
          productId: product.id,
        });
      }

      // Upsert the mapping
      const mapping = await prisma.variantSurfaceMapping.upsert({
        where: {
          tenantId_shopifyVariantId: {
            tenantId,
            shopifyVariantId: input.shopifyVariantId,
          },
        },
        create: {
          tenantId,
          productId: product.id,
          surfaceId: input.surfaceId,
          shopifyProductId: input.shopifyProductId ?? null,
          shopifyProductTitle: input.shopifyProductTitle ?? null,
          shopifyVariantId: input.shopifyVariantId,
          shopifyVariantTitle: input.shopifyVariantTitle ?? null,
          options: input.options ?? null,
          technique: input.technique ?? null,
          color: input.color ?? null,
          material: input.material ?? null,
          shortcodeHandle: input.shortcodeHandle ?? null,
        },
        update: {
          productId: product.id,
          surfaceId: input.surfaceId,
          shopifyProductId: input.shopifyProductId ?? null,
          shopifyProductTitle: input.shopifyProductTitle ?? null,
          shopifyVariantTitle: input.shopifyVariantTitle ?? null,
          options: input.options ?? null,
          technique: input.technique ?? null,
          color: input.color ?? null,
          material: input.material ?? null,
          shortcodeHandle: input.shortcodeHandle ?? null,
        },
        include: {
          product: {
            select: { id: true, slug: true, title: true },
          },
          surface: {
            select: { id: true, name: true },
          },
        },
      });

      results.push({
        id: mapping.id,
        productId: mapping.productId,
        productSlug: mapping.product?.slug ?? null,
        productTitle: mapping.product?.title ?? null,
        surfaceId: mapping.surfaceId,
        surfaceName: mapping.surface?.name ?? null,
        shopifyProductId: mapping.shopifyProductId ?? null,
        shopifyProductTitle: mapping.shopifyProductTitle ?? null,
        shopifyVariantId: mapping.shopifyVariantId,
        shopifyVariantTitle: mapping.shopifyVariantTitle ?? null,
        options: mapping.options ?? null,
        technique: mapping.technique ?? null,
        color: mapping.color ?? null,
        material: mapping.material ?? null,
        shortcodeHandle: mapping.shortcodeHandle ?? null,
        updatedAt: mapping.updatedAt.toISOString(),
      });
    }

    console.log(`[merchant-config] Successfully upserted ${results.length} variant mappings`);

    res.json({ data: results });
  } catch (error) {
    console.error("[merchant-config] Error upserting variant mappings:", error);
    next(error);
  }
});

/**
 * DELETE /api/merchant/config/catalog/mappings/:variantId
 * Delete a variant-surface mapping by shopify variant ID
 */
merchantConfigRouter.delete("/catalog/mappings/:variantId", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;

    if (!tenantId) {
      return res.status(401).json({ error: "Missing tenant context" });
    }

    const { variantId } = variantIdParamSchema.parse(req.params);

    console.log("[merchant-config] Deleting variant mapping:", variantId, "for tenant:", tenantId);

    // Find the mapping first to check if it exists
    const existing = await prisma.variantSurfaceMapping.findUnique({
      where: {
        tenantId_shopifyVariantId: {
          tenantId,
          shopifyVariantId: variantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Variant mapping not found" });
    }

    // Delete the mapping
    await prisma.variantSurfaceMapping.delete({
      where: {
        tenantId_shopifyVariantId: {
          tenantId,
          shopifyVariantId: variantId,
        },
      },
    });

    console.log("[merchant-config] Successfully deleted variant mapping:", variantId);

    res.json({ success: true });
  } catch (error) {
    console.error("[merchant-config] Error deleting variant mapping:", error);
    next(error);
  }
});
