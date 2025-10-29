import type { Prisma, PrismaClient } from "../../../src/generated/prisma/client";
import { Router, type Response } from "express";
import { z } from "zod";

const jsonSchema = z.any();

const gangSheetItemSchema = z.object({
  id: z.string().min(1).optional(),
  designId: z.string().uuid().optional(),
  quantity: z.number().int().positive().default(1),
  position: jsonSchema.default({}),
  metadata: jsonSchema.optional(),
});

const baseGangSheetSchema = z.object({
  name: z.string().min(1),
  sheetWidthMm: z.number().positive(),
  sheetHeightMm: z.number().positive(),
  snapshot: jsonSchema.optional(),
  previewUrl: z.string().min(1).optional(),
  utilization: z.number().min(0).max(1).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const createGangSheetSchema = baseGangSheetSchema.extend({
  autosave: z.boolean().optional(),
  items: z.array(gangSheetItemSchema).optional(),
});

const updateGangSheetSchema = baseGangSheetSchema.partial().extend({
  items: z.array(gangSheetItemSchema).optional(),
  autosaveSnapshot: jsonSchema.optional(),
  autosave: z.boolean().optional(),
  discardAutosave: z.boolean().optional(),
});

const listQuerySchema = z.object({
  includeItems: z.coerce.boolean().optional().default(false),
});

const GANG_SHEET_STATUSES = ["draft", "ready", "queued", "in_production", "shipped", "archived"] as const;

const statusUpdateSchema = z.object({
  status: z.enum(GANG_SHEET_STATUSES),
  supplierId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const gangSheetRouter = Router();

function requireTenant(res: Response, tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

// GET /api/gang-sheets/stats - Dashboard statistics
gangSheetRouter.get("/stats", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const [total, last7Days, byStatus] = await Promise.all([
      // Total gang sheets
      prisma.gangSheet.count({ where: { tenantId } }),
      
      // Gang sheets in last 7 days
      prisma.gangSheet.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      
      // Group by status
      prisma.gangSheet.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status || "draft"] = item._count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      data: {
        total,
        last7Days,
        byStatus: statusCounts,
        inProduction: (statusCounts["queued"] || 0) + (statusCounts["in_production"] || 0),
        ready: statusCounts["ready"] || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

function ensureTenant(res: Response, tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

async function requireSheet(prisma: PrismaClient, tenantId: string, id: string) {
  const sheet = await prisma.gangSheet.findFirst({
    where: { id, tenantId },
    include: { items: true },
  });
  if (!sheet) {
    return { status: 404, message: "Gang sheet not found" } as const;
  }
  return { sheet } as const;
}

function mapGangSheetData(payload: z.infer<typeof createGangSheetSchema>) {
  const autosave = payload.autosave === true;
  const snapshot = payload.snapshot ?? {};
  const autosaveAt = autosave ? new Date() : undefined;
  return {
    name: payload.name,
    sheetWidthMm: payload.sheetWidthMm,
    sheetHeightMm: payload.sheetHeightMm,
    snapshot,
    autosaveSnapshot: autosave ? snapshot : undefined,
    autosaveAt,
    previewUrl: payload.previewUrl ?? null,
    utilization: payload.utilization ?? 0,
    status: payload.status ?? "draft",
    notes: payload.notes ?? null,
  };
}

function mapUpdateData(payload: z.infer<typeof updateGangSheetSchema>, { autosave }: { autosave: boolean }): Prisma.GangSheetUpdateInput {
  const data: Prisma.GangSheetUpdateInput = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.sheetWidthMm !== undefined) data.sheetWidthMm = payload.sheetWidthMm;
  if (payload.sheetHeightMm !== undefined) data.sheetHeightMm = payload.sheetHeightMm;
  if (payload.snapshot !== undefined) {
    if (autosave) data.autosaveSnapshot = payload.snapshot ?? {};
    else data.snapshot = payload.snapshot ?? {};
  }
  if (payload.previewUrl !== undefined) data.previewUrl = payload.previewUrl ?? null;
  if (payload.utilization !== undefined) data.utilization = payload.utilization;
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.notes !== undefined) data.notes = payload.notes;
  if (payload.autosaveSnapshot !== undefined) {
    data.autosaveSnapshot = payload.autosaveSnapshot ?? null;
    data.autosaveAt = payload.autosaveSnapshot ? new Date() : null;
  }
  if (autosave) {
    data.autosaveAt = new Date();
  }
  if (payload.discardAutosave) {
    data.autosaveSnapshot = null;
    data.autosaveAt = null;
  }
  return data;
}

function toItemData(sheetId: string, item: z.infer<typeof gangSheetItemSchema>): Prisma.GangSheetItemCreateInput {
  return {
    id: item.id,
    gangSheetId: sheetId,
    designId: item.designId,
    quantity: item.quantity ?? 1,
    position: item.position ?? {},
    metadata: item.metadata ?? undefined,
  };
}

function mapItemUpdate(item: z.infer<typeof gangSheetItemSchema>): Prisma.GangSheetItemUpdateInput {
  const data: Prisma.GangSheetItemUpdateInput = {};
  if (item.designId !== undefined) data.designId = item.designId;
  if (item.quantity !== undefined) data.quantity = item.quantity;
  if (item.position !== undefined) data.position = item.position ?? {};
  if (item.metadata !== undefined) data.metadata = item.metadata ?? undefined;
  return data;
}

gangSheetRouter.post("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const payload = createGangSheetSchema.parse(req.body);
    const created = await prisma.$transaction(async tx => {
      const base = await tx.gangSheet.create({
        data: {
          tenantId,
          ...mapGangSheetData(payload),
        },
      });

      if (payload.items?.length) {
        for (const item of payload.items) {
          await tx.gangSheetItem.create({
            data: toItemData(base.id, item),
          });
        }
      }

      return tx.gangSheet.findUnique({
        where: { id: base.id },
        include: { items: true },
      });
    });

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
});

gangSheetRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.json({ data: [] });
    }

    const query = listQuerySchema.parse(req.query);
    const sheets = await prisma.gangSheet.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      include: { items: query.includeItems },
    });

    res.json({ data: sheets });
  } catch (error) {
    next(error);
  }
});

gangSheetRouter.get("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const result = await requireSheet(prisma, tenantId, req.params.id);
    if ("status" in result) {
      return res.status(result.status).json({ error: result.message });
    }

    res.json({ data: result.sheet });
  } catch (error) {
    next(error);
  }
});

gangSheetRouter.patch("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const { id } = req.params;
    const payload = updateGangSheetSchema.parse(req.body);
    const existing = await requireSheet(prisma, tenantId, id);
    if ("status" in existing) {
      return res.status(existing.status).json({ error: existing.message });
    }

    const autosave = payload.autosave === true;
    const updateData = mapUpdateData(payload, { autosave });
    const updated = await prisma.$transaction(async tx => {
      if (Object.keys(updateData).length) {
        await tx.gangSheet.update({
          where: { id },
          data: updateData,
        });
      }

      if (payload.items) {
        await tx.gangSheetItem.deleteMany({ where: { gangSheetId: id } });
        for (const item of payload.items) {
          await tx.gangSheetItem.create({
            data: toItemData(id, item),
          });
        }
      }

      return tx.gangSheet.findUnique({
        where: { id },
        include: { items: true },
      });
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

gangSheetRouter.delete("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const { id } = req.params;
    const existing = await requireSheet(prisma, tenantId, id);
    if ("status" in existing) {
      return res.status(existing.status).json({ error: existing.message });
    }

    await prisma.$transaction([
      prisma.gangSheetItem.deleteMany({ where: { gangSheetId: id } }),
      prisma.gangSheet.delete({ where: { id } }),
    ]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

gangSheetRouter.post("/:id/items", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const sheetResult = await requireSheet(prisma, tenantId, req.params.id);
    if ("status" in sheetResult) {
      return res.status(sheetResult.status).json({ error: sheetResult.message });
    }

    const payload = gangSheetItemSchema.parse(req.body);
    const item = await prisma.gangSheetItem.create({
      data: toItemData(sheetResult.sheet.id, payload),
    });

    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
});

const updateItemSchema = gangSheetItemSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: "Payload cannot be empty" },
);

gangSheetRouter.patch("/:id/items/:itemId", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const { id, itemId } = req.params;
    const sheetResult = await requireSheet(prisma, tenantId, id);
    if ("status" in sheetResult) {
      return res.status(sheetResult.status).json({ error: sheetResult.message });
    }

    const existingItem = await prisma.gangSheetItem.findFirst({
      where: { id: itemId, gangSheetId: sheetResult.sheet.id },
    });
    if (!existingItem) {
      return res.status(404).json({ error: "Gang sheet item not found" });
    }

    const payload = updateItemSchema.parse(req.body);
    const updated = await prisma.gangSheetItem.update({
      where: { id: existingItem.id },
      data: mapItemUpdate(payload),
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

gangSheetRouter.delete("/:id/items/:itemId", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const { id, itemId } = req.params;
    const sheetResult = await requireSheet(prisma, tenantId, id);
    if ("status" in sheetResult) {
      return res.status(sheetResult.status).json({ error: sheetResult.message });
    }

    const existingItem = await prisma.gangSheetItem.findFirst({
      where: { id: itemId, gangSheetId: sheetResult.sheet.id },
    });
    if (!existingItem) {
      return res.status(404).json({ error: "Gang sheet item not found" });
    }

    await prisma.gangSheetItem.delete({ where: { id: existingItem.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

gangSheetRouter.post("/:id/status", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!ensureTenant(res, tenantId)) return;

    const payload = statusUpdateSchema.parse(req.body);
    const { id } = req.params;

    const current = await prisma.gangSheet.findFirst({
      where: { id, tenantId },
    });

    if (!current) {
      return res.status(404).json({ error: "Gang sheet not found" });
    }

    if (payload.supplierId) {
      const supplier = await prisma.supplierProfile.findFirst({
        where: { id: payload.supplierId, OR: [{ tenantId }, { tenantId: null }] },
        select: { id: true },
      });
      if (!supplier) {
        return res.status(400).json({ error: "Invalid supplier reference" });
      }
    }

    const now = new Date();
    const data: Prisma.GangSheetUpdateInput = {
      status: payload.status,
    };

    if (payload.supplierId !== undefined) {
      data.supplierId = payload.supplierId ?? null;
    }

    if (payload.notes !== undefined) {
      data.notes = payload.notes ?? null;
    }

    switch (payload.status) {
      case "queued":
        data.queuedAt = now;
        data.inProductionAt = null;
        data.shippedAt = null;
        break;
      case "in_production":
        data.queuedAt = current.queuedAt ?? now;
        data.inProductionAt = now;
        data.shippedAt = null;
        break;
      case "shipped":
        data.queuedAt = current.queuedAt ?? now;
        data.inProductionAt = current.inProductionAt ?? now;
        data.shippedAt = now;
        break;
      case "ready":
        data.queuedAt = null;
        data.inProductionAt = null;
        data.shippedAt = null;
        break;
      case "draft":
        data.queuedAt = null;
        data.inProductionAt = null;
        data.shippedAt = null;
        break;
      case "archived":
        // Keep timeline fields for audit purposes.
        break;
      default:
        break;
    }

    const updated = await prisma.$transaction(async tx => {
      const sheet = await tx.gangSheet.update({
        where: { id },
        data,
        include: {
          items: true,
          supplier: {
            select: {
              id: true,
              name: true,
              slug: true,
              leadTimeDays: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user?.id ?? null,
          event: "gangsheet.status_change",
          entity: "GangSheet",
          entityId: sheet.id,
          diff: {
            before: {
              status: current.status,
              supplierId: current.supplierId,
              notes: current.notes,
            },
            after: {
              status: sheet.status,
              supplierId: sheet.supplierId,
              notes: sheet.notes,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          tenantId,
          kind: "gangsheet.status_change",
          payload: {
            gangSheetId: sheet.id,
            status: sheet.status,
            supplierId: sheet.supplierId,
          },
        },
      });

      return sheet;
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});
