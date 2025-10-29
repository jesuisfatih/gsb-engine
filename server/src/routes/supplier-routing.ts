import { Router } from "express";
import { z } from "zod";

const listQuerySchema = z.object({
  technique: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
});

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  supplierId: z.string().uuid(),
  technique: z.string().min(1),
  region: z.string().min(1).nullable().optional(),
  minQty: z.number().int().nullable().optional(),
  maxQty: z.number().int().nullable().optional(),
});

export const supplierRoutingRouter = Router();

function requireTenant(res: any, tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

supplierRoutingRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const query = listQuerySchema.parse(req.query);
    const rules = await prisma.supplierRoutingRule.findMany({
      where: {
        tenantId,
        technique: query.technique ?? undefined,
        region: query.region ?? undefined,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            slug: true,
            regions: true,
            leadTimeDays: true,
          },
        },
      },
      orderBy: [{ technique: "asc" }, { region: "asc" }],
    });

    res.json({ data: rules });
  } catch (error) {
    next(error);
  }
});

supplierRoutingRouter.post("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const payload = upsertSchema.parse(req.body);

    const supplier = await prisma.supplierProfile.findFirst({
      where: { id: payload.supplierId, OR: [{ tenantId }, { tenantId: null }] },
      select: { id: true },
    });

    if (!supplier) {
      return res.status(400).json({ error: "Invalid supplier reference" });
    }

    if (payload.id) {
      const rule = await prisma.supplierRoutingRule.findFirst({
        where: { id: payload.id, tenantId },
        select: { id: true },
      });
      if (!rule) {
        return res.status(404).json({ error: "Routing rule not found" });
      }
    }

    const data = {
      tenantId,
      supplierId: payload.supplierId,
      technique: payload.technique,
      region: payload.region ?? null,
      minQty: payload.minQty ?? null,
      maxQty: payload.maxQty ?? null,
    };

    const rule = payload.id
      ? await prisma.supplierRoutingRule.update({
          where: { id: payload.id },
          data,
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                slug: true,
                regions: true,
                leadTimeDays: true,
              },
            },
          },
        })
      : await prisma.supplierRoutingRule.create({
          data,
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                slug: true,
                regions: true,
                leadTimeDays: true,
              },
            },
          },
        });

    res.status(payload.id ? 200 : 201).json({ data: rule });
  } catch (error) {
    next(error);
  }
});

supplierRoutingRouter.delete("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const { id } = req.params;

    const rule = await prisma.supplierRoutingRule.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!rule) {
      return res.status(404).json({ error: "Routing rule not found" });
    }

    await prisma.supplierRoutingRule.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/suppliers/routing/auto-route
 * Automatically select best supplier for a job
 */
const autoRouteSchema = z.object({
  technique: z.string().min(1),
  region: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
});

supplierRoutingRouter.post("/auto-route", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const payload = autoRouteSchema.parse(req.body);
    
    const supplier = await autoRouteSupplier(
      prisma,
      tenantId,
      payload.technique,
      payload.region,
      payload.quantity
    );

    if (!supplier) {
      return res.status(404).json({ 
        error: "No suitable supplier found",
        hint: "Configure routing rules in Supplier Routing settings",
      });
    }

    res.json({ data: supplier });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/suppliers/routing/suppliers
 * List all available suppliers
 */
supplierRoutingRouter.get("/suppliers", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const suppliers = await prisma.supplierProfile.findMany({
      where: {
        OR: [
          { tenantId }, // Tenant-specific suppliers
          { tenantId: null }, // Global suppliers
        ],
      },
      orderBy: { name: "asc" },
    });

    res.json({ data: suppliers });
  } catch (error) {
    next(error);
  }
});

/**
 * Auto-route supplier selection logic
 */
export async function autoRouteSupplier(
  prisma: any,
  tenantId: string,
  technique: string,
  region?: string,
  quantity?: number
): Promise<any | null> {
  // Find matching routing rules
  const rules = await prisma.supplierRoutingRule.findMany({
    where: {
      tenantId,
      technique,
      region: region ?? undefined,
    },
    include: {
      supplier: true,
    },
    orderBy: [
      { region: "asc" }, // Prefer region-specific rules
      { minQty: "asc" }, // Then by quantity range
    ],
  });

  if (!rules.length) {
    // Try without region filter
    const fallbackRules = await prisma.supplierRoutingRule.findMany({
      where: {
        tenantId,
        technique,
        region: null,
      },
      include: {
        supplier: true,
      },
    });

    if (!fallbackRules.length) {
      return null;
    }

    return fallbackRules[0].supplier;
  }

  // Filter by quantity if provided
  if (quantity !== undefined) {
    const qtyMatches = rules.filter(rule => {
      if (rule.minQty !== null && quantity < rule.minQty) return false;
      if (rule.maxQty !== null && quantity > rule.maxQty) return false;
      return true;
    });

    if (qtyMatches.length > 0) {
      return qtyMatches[0].supplier;
    }
  }

  // Return first matching rule
  return rules[0].supplier;
}
