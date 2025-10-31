/**
 * GraphQL Resolvers
 * Business logic for GraphQL queries and mutations
 */

import type { PrismaClient } from "../generated/prisma/client";
import { fetchPricingQuote } from "../services/pricingService";

interface Context {
  prisma: PrismaClient;
  tenantId?: string | null;
  user?: any;
}

export const resolvers = {
  Query: {
    // Get full catalog (products + surfaces + techniques)
    catalog: async (_: any, { tenantId }: { tenantId: string }, { prisma }: Context) => {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { tenantId },
            { tenantId: null }, // Global products
          ],
          deletedAt: null,
        },
        include: {
          surfaces: {
            where: { deletedAt: null },
          },
        },
      });

      const techniques = await prisma.printTechnique.findMany({
        where: {
          OR: [
            { tenantId },
            { tenantId: null },
          ],
        },
      });

      const surfaces = products.flatMap(p => p.surfaces);

      return { products, surfaces, techniques };
    },

    // Get single product with surfaces
    product: async (_: any, { id, tenantId }: { id: string; tenantId: string }, { prisma }: Context) => {
      return await prisma.product.findFirst({
        where: {
          id,
          OR: [
            { tenantId },
            { tenantId: null },
          ],
          deletedAt: null,
        },
        include: {
          surfaces: {
            where: { deletedAt: null },
          },
        },
      });
    },

    // Get design by ID
    design: async (_: any, { id }: { id: string }, { prisma }: Context) => {
      return await prisma.designDocument.findUnique({
        where: { id },
        include: {
          product: true,
          surface: true,
          printTechnique: true,
        },
      });
    },

    // Get pricing quote
    pricingQuote: async (
      _: any,
      { input }: { input: any },
      { prisma, tenantId }: Context
    ) => {
      if (!tenantId) {
        throw new Error('Tenant context required');
      }

      try {
        const quote = await fetchPricingQuote({
          tenantId,
          productSlug: input.productSlug,
          surfaceId: input.surfaceId,
          technique: input.technique,
          quantity: input.quantity,
          areaIn2: input.areaIn2,
          colorCount: input.colorCount,
        });

        return quote;
      } catch (error) {
        throw new Error(`Failed to calculate pricing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    // Get customer designs
    customerDesigns: async (
      _: any,
      { customerId, limit = 50 }: { customerId?: string; limit?: number },
      { prisma, user }: Context
    ) => {
      const userId = customerId || user?.id;
      if (!userId) {
        throw new Error('User context required');
      }

      return await prisma.designDocument.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
          surface: true,
          printTechnique: true,
        },
      });
    },
  },

  Mutation: {
    // Create new design
    createDesign: async (
      _: any,
      { input }: { input: any },
      { prisma, tenantId, user }: Context
    ) => {
      if (!tenantId) {
        throw new Error('Tenant context required');
      }

      const product = await prisma.product.findFirst({
        where: {
          slug: input.productSlug,
          OR: [{ tenantId }, { tenantId: null }],
        },
      });

      const design = await prisma.designDocument.create({
        data: {
          tenantId,
          userId: user?.id,
          productId: product?.id,
          surfaceId: input.surfaceId,
          snapshot: input.items,
          productSlug: input.productSlug,
          color: input.color,
          printTech: input.technique,
          previewUrl: input.previewUrl,
          status: 'DRAFT',
        },
        include: {
          product: true,
          surface: true,
        },
      });

      return { design, errors: [] };
    },

    // Update existing design
    updateDesign: async (
      _: any,
      { id, input }: { id: string; input: any },
      { prisma }: Context
    ) => {
      const design = await prisma.designDocument.update({
        where: { id },
        data: {
          snapshot: input.items || undefined,
          previewUrl: input.previewUrl || undefined,
          printTech: input.technique || undefined,
          color: input.color || undefined,
          updatedAt: new Date(),
        },
        include: {
          product: true,
          surface: true,
        },
      });

      return { design, errors: [] };
    },

    // Submit design for production
    submitDesign: async (_: any, { id }: { id: string }, { prisma }: Context) => {
      const design = await prisma.designDocument.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          autosaveSnapshot: null,
          autosaveAt: null,
        },
        include: {
          product: true,
          surface: true,
        },
      });

      return { design, errors: [] };
    },

    // Checkout with design
    checkoutWithDesign: async (
      _: any,
      { input }: { input: any },
      { prisma, tenantId }: Context
    ) => {
      // This will be handled by proxy/cart endpoint
      // GraphQL wrapper for consistency
      const response = await fetch('/api/proxy/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const data = await response.json();

      return {
        designId: data.data.designId,
        checkoutUrl: data.data.checkoutUrl,
        cartId: data.data.lineItem?.cartId,
      };
    },
  },

  // Field resolvers for complex types
  Design: {
    dimensions: (parent: any) => {
      if (!parent.sheetWidthMm || !parent.sheetHeightMm) return null;
      
      // Calculate pixels from mm and PPI
      const surface = parent.surface;
      const ppi = surface?.ppi || 300;
      const widthPx = Math.round((parent.sheetWidthMm / 25.4) * ppi);
      const heightPx = Math.round((parent.sheetHeightMm / 25.4) * ppi);

      return {
        widthMm: parent.sheetWidthMm,
        heightMm: parent.sheetHeightMm,
        widthPx,
        heightPx,
      };
    },

    stats: (parent: any) => {
      const metrics = parent.metrics || {};
      return {
        areaIn2: metrics.areaIn2 || 0,
        colorCount: metrics.colorCount || 0,
        lowestImageDpi: metrics.lowestImageDpi || null,
        coverage: metrics.coverage || 0,
      };
    },
  },
};

