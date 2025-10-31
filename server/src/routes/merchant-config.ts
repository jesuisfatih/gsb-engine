import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../../src/generated/prisma/client";
import { parseDimensionsFromVariantOptions, dimensionsToMm } from "../utils/variant-parser";

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

      // Try to find existing surface or create one from variant dimensions
      let surface = await prisma.surface.findFirst({
        where: {
          id: input.surfaceId,
          productId: product.id,
        },
      });

      // If surface doesn't exist, try to create from variant dimensions
      if (!surface && input.options) {
        console.log(`[merchant-config] Surface not found, trying to create from variant options`);
        
        const dimensions = parseDimensionsFromVariantOptions(input.options as Record<string, string>);
        if (dimensions) {
          console.log(`[merchant-config] Parsed dimensions:`, dimensions);
          const { widthMm, heightMm } = dimensionsToMm(dimensions);
          
          // Create surface with parsed dimensions
          surface = await prisma.surface.create({
            data: {
              productId: product.id,
              name: dimensions.originalText,
              widthMm,
              heightMm,
              safeArea: { marginMm: 5 },
              ppi: 300,
              metadata: {
                autoCreated: true,
                sourceVariant: input.shopifyVariantId,
                parsedFrom: dimensions.originalText,
              },
            },
          });
          
          console.log(`[merchant-config] ✅ Auto-created surface:`, surface.name, `(${widthMm}x${heightMm}mm)`);
          
          // Update input to use new surface
          input.surfaceId = surface.id;
        } else {
          console.warn(`[merchant-config] Could not parse dimensions from variant options:`, input.options);
          return res.status(404).json({
            error: "Surface not found and could not auto-create from variant dimensions",
            surfaceId: input.surfaceId,
            productId: product.id,
            variantOptions: input.options,
          });
        }
      }

      if (!surface) {
        console.warn(`[merchant-config] Surface not found: ${input.surfaceId} for product: ${product.id}`);
        return res.status(404).json({
          error: "Surface not found for this product",
          surfaceId: input.surfaceId,
          productId: product.id,
        });
      }

      // Fetch Shopify variant image if we have product/variant IDs
      let variantImageUrl: string | null = null;
      if (input.shopifyProductId && input.shopifyVariantId) {
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
          });
          
          const shopifyDomain = (tenant?.settings as any)?.shopify?.domain;
          const shopifyAccessToken = (tenant?.settings as any)?.shopify?.accessToken;
          
          if (shopifyDomain && shopifyAccessToken) {
            const productNumericId = input.shopifyProductId.includes('/') 
              ? input.shopifyProductId.split('/').pop() 
              : input.shopifyProductId;
            const variantNumericId = input.shopifyVariantId.includes('/') 
              ? input.shopifyVariantId.split('/').pop() 
              : input.shopifyVariantId;
            
            const shopifyUrl = `https://${shopifyDomain}/admin/api/2024-04/products/${productNumericId}.json`;
            const shopifyResponse = await fetch(shopifyUrl, {
              headers: { "X-Shopify-Access-Token": shopifyAccessToken },
            });
            
            if (shopifyResponse.ok) {
              const data = await shopifyResponse.json();
              const variant = data.product?.variants?.find((v: any) => v.id.toString() === variantNumericId);
              if (variant?.image_id) {
                const image = data.product?.images?.find((img: any) => img.id === variant.image_id);
                if (image?.src) {
                  variantImageUrl = image.src;
                  console.log("[merchant-config] Found variant image:", variantImageUrl);
                }
              } else if (data.product?.image?.src) {
                variantImageUrl = data.product.image.src;
                console.log("[merchant-config] Using product default image:", variantImageUrl);
              }
            }
          }
        } catch (err) {
          console.warn("[merchant-config] Failed to fetch Shopify variant image:", err);
        }
      }
      
      // Update surface with preview image if found
      if (variantImageUrl) {
        const currentMetadata = (surface.metadata as Record<string, any>) || {};
        await prisma.surface.update({
          where: { id: input.surfaceId },
          data: {
            metadata: {
              ...currentMetadata,
              previewImage: variantImageUrl,
            },
          },
        });
        console.log("[merchant-config] Updated surface with preview image");
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
