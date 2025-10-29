import type { Prisma, $Enums } from "../../../src/generated/prisma/client";
import { Router } from "express";
import { z } from "zod";
import { deliverNotification } from "../services/notificationDelivery";
import { generateMockups } from "../services/mockupGenerator";
import { env } from "../env";

const DESIGN_STATUS_VALUES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "ARCHIVED"] as const;
type DesignStatus = $Enums.DesignStatus;
const DEFAULT_DESIGN_STATUS: DesignStatus = "DRAFT";
const SUBMITTED_STATUS: DesignStatus = "SUBMITTED";

const baseDesignPayload = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  surfaceId: z.string().uuid().nullable().optional(),
  printTechniqueId: z.string().uuid().nullable().optional(),
  snapshot: z.object({}).catchall(z.any()),
  previewUrl: z.string().url().nullable().optional(),
  sheetWidthMm: z.number().nullable().optional(),
  sheetHeightMm: z.number().nullable().optional(),
  metrics: z.object({}).catchall(z.any()).optional(),
});

const createDesignSchema = baseDesignPayload.extend({
  autosave: z.boolean().optional(),
  status: z.enum(DESIGN_STATUS_VALUES).optional(),
});

const updateDesignSchema = baseDesignPayload.partial().extend({
  autosave: z.boolean().optional(),
  discardAutosave: z.boolean().optional(),
  status: z.enum(DESIGN_STATUS_VALUES).optional(),
});

const listDesignsQuery = z.object({
  status: z.enum(DESIGN_STATUS_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
  productId: z.string().uuid().optional(),
  surfaceId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const designsRouter = Router();

function requireTenant(res: any, tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

// GET /api/designs/stats - Dashboard statistics
designsRouter.get("/stats", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const [total, last7Days, byStatus] = await Promise.all([
      // Total designs
      prisma.designDocument.count({ where: { tenantId } }),
      
      // Designs in last 7 days
      prisma.designDocument.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      
      // Group by status
      prisma.designDocument.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      data: {
        total,
        last7Days,
        byStatus: statusCounts,
        pending: (statusCounts["DRAFT"] || 0) + (statusCounts["SUBMITTED"] || 0),
        approved: statusCounts["APPROVED"] || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

function mapDesignCreate(tenantId: string, userId: string | undefined, payload: z.infer<typeof createDesignSchema>): Prisma.DesignDocumentCreateInput {
  const now = new Date();
  const snapshot = payload.snapshot ?? {};
  const autosaveEnabled = payload.autosave === true;

  return {
    tenantId,
    userId,
    status: payload.status ?? DEFAULT_DESIGN_STATUS,
    name: payload.name ?? undefined,
    description: payload.description ?? undefined,
    productId: payload.productId ?? undefined,
    surfaceId: payload.surfaceId ?? undefined,
    printTechniqueId: payload.printTechniqueId ?? undefined,
    snapshot,
    previewUrl: payload.previewUrl ?? undefined,
    sheetWidthMm: payload.sheetWidthMm ?? undefined,
    sheetHeightMm: payload.sheetHeightMm ?? undefined,
    metrics: payload.metrics ?? undefined,
    autosaveSnapshot: autosaveEnabled ? snapshot : undefined,
    autosaveAt: autosaveEnabled ? now : undefined,
  };
}

function mapDesignUpdate(payload: z.infer<typeof updateDesignSchema>): Prisma.DesignDocumentUpdateInput {
  const data: Prisma.DesignDocumentUpdateInput = {};
  const autosave = payload.autosave === true;
  const discardAutosave = payload.discardAutosave === true;

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.productId !== undefined) data.productId = payload.productId;
  if (payload.surfaceId !== undefined) data.surfaceId = payload.surfaceId;
  if (payload.printTechniqueId !== undefined) data.printTechniqueId = payload.printTechniqueId;
  if (payload.previewUrl !== undefined) data.previewUrl = payload.previewUrl ?? null;
  if (payload.sheetWidthMm !== undefined) data.sheetWidthMm = payload.sheetWidthMm ?? undefined;
  if (payload.sheetHeightMm !== undefined) data.sheetHeightMm = payload.sheetHeightMm ?? undefined;
  if (payload.metrics !== undefined) data.metrics = payload.metrics ?? undefined;
  if (payload.status !== undefined) data.status = payload.status;

  if (autosave) {
    if (payload.snapshot !== undefined) data.autosaveSnapshot = payload.snapshot ?? {};
    data.autosaveAt = new Date();
  } else if (payload.snapshot !== undefined) {
    data.snapshot = payload.snapshot ?? {};
  }

  if (discardAutosave) {
    data.autosaveSnapshot = null;
    data.autosaveAt = null;
  }

  return data;
}

designsRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId)
      return res.status(400).json({ error: "Missing tenant context" });

    const query = listDesignsQuery.parse(req.query);

    const where: Prisma.DesignDocumentWhereInput = {
      tenantId,
      status: query.status ?? undefined,
      productId: query.productId ?? undefined,
      surfaceId: query.surfaceId ?? undefined,
    };

    // Search by name or description
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Date range filter
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = query.fromDate;
      if (query.toDate) where.createdAt.lte = query.toDate;
    }

    // Order filter
    if (query.orderId) {
      where.orders = {
        some: { id: query.orderId },
      };
    }

    const [designs, total] = await Promise.all([
      prisma.designDocument.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.offset,
        take: query.limit,
        include: {
          orders: {
            select: {
              id: true,
              shopifyOrderId: true,
              customerName: true,
              customerEmail: true,
            },
            take: 1,
          },
          surface: {
            select: { name: true },
          },
          product: {
            select: { title: true },
          },
        },
      }),
      prisma.designDocument.count({ where }),
    ]);

    const items = designs.map(design => {
      const order = design.orders?.[0];
      return {
        id: design.id,
        title: design.name ?? "Untitled design",
        status: design.status,
        createdAt: design.createdAt.toISOString(),
        updatedAt: design.updatedAt.toISOString(),
        orderNumber: order?.shopifyOrderId ?? order?.id ?? null,
        customer: order?.customerName ?? order?.customerEmail ?? null,
        surface: design.surface?.name ?? null,
        product: design.product?.title ?? null,
        previewUrl: design.previewUrl ?? null,
        dimensions: design.sheetWidthMm && design.sheetHeightMm
          ? { widthMm: design.sheetWidthMm, heightMm: design.sheetHeightMm }
          : null,
      };
    });

    res.json({ 
      data: { 
        items, 
        total,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total,
        },
      } 
    });
  } catch (error) {
    next(error);
  }
});

designsRouter.post("/", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const payload = createDesignSchema.parse(req.body);
    const design = await prisma.designDocument.create({
      data: mapDesignCreate(tenantId, user?.id, payload),
    });

    res.status(201).json({ data: design });
  } catch (error) {
    next(error);
  }
});

designsRouter.get("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const design = await prisma.designDocument.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }

    res.json({ data: design });
  } catch (error) {
    next(error);
  }
});

designsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const { id } = req.params;
    const payload = updateDesignSchema.parse(req.body);

    const design = await prisma.designDocument.update({
      where: {
        id,
        tenantId,
      },
      data: mapDesignUpdate(payload),
    });

    res.json({ data: design });
  } catch (error) {
    next(error);
  }
});

designsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const { id } = req.params;
    const existing = await prisma.designDocument.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Design not found" });
    }

    const now = new Date();
    const data: Prisma.DesignDocumentUpdateInput = {
      status: SUBMITTED_STATUS,
      submittedAt: now,
    };

    if (existing.autosaveSnapshot) {
      data.snapshot = existing.autosaveSnapshot as Prisma.DesignDocumentUpdateInput["snapshot"];
      data.autosaveSnapshot = null;
      data.autosaveAt = null;
    }

    const result = await prisma.$transaction(async tx => {
      const updated = await tx.designDocument.update({
        where: { id, tenantId },
        data,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user?.id ?? null,
          event: "design.submit",
          entity: "DesignDocument",
          entityId: updated.id,
          diff: {
            before: { status: existing.status },
            after: { status: updated.status },
          },
        },
      });

      const submissionNotification = await tx.notification.create({
        data: {
          tenantId,
          kind: "design.submitted",
          payload: {
            designId: updated.id,
            productId: updated.productId,
            surfaceId: updated.surfaceId,
            submittedAt: updated.submittedAt,
          },
        },
      });

      const designRecord = await tx.designDocument.findUnique({
        where: { id: updated.id },
        include: { outputs: true },
      });

      return {
        design: designRecord,
        notification: submissionNotification,
      };
    });

    let design = result.design;
    const notification = result.notification;

    if (!design) {
      return res.status(500).json({ error: "Design submission failed" });
    }

    if (design) {
      const mockups = await generateMockups({
        tenantId,
        design,
      });

      const generatedAt = new Date().toISOString();

      await prisma.$transaction(async tx => {
        await tx.designOutput.deleteMany({
          where: {
            designId: design!.id,
            kind: { in: ["MOCKUP_2D", "MOCKUP_3D"] },
          },
        });

        const createPayload: Prisma.DesignOutputCreateManyInput[] = [];
        if (mockups.preview2d) {
          createPayload.push({
            designId: design!.id,
            tenantId,
            kind: "MOCKUP_2D",
            url: mockups.preview2d,
            metadata: {
              mode: "2d",
              source: mockups.metadata?.source ?? env.MOCKUP_SERVICE_URL ? "render-service" : "placeholder",
              generatedAt,
            },
          });
        }
        if (mockups.preview3d) {
          createPayload.push({
            designId: design!.id,
            tenantId,
            kind: "MOCKUP_3D",
            url: mockups.preview3d,
            metadata: {
              mode: "3d",
              source: mockups.metadata?.source ?? env.MOCKUP_SERVICE_URL ? "render-service" : "placeholder",
              generatedAt,
            },
          });
        }

        if (createPayload.length) {
          await tx.designOutput.createMany({ data: createPayload });
        }

        if (mockups.preview2d && mockups.preview2d !== design!.previewUrl) {
          await tx.designDocument.update({
            where: { id: design!.id },
            data: { previewUrl: mockups.preview2d },
          });
        }
      });

      design = await prisma.designDocument.findUnique({
        where: { id: design.id },
        include: { outputs: true },
      });
    }

    if (notification) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          displayName: true,
          settings: true,
        },
      });

      if (tenant) {
        void deliverNotification({
          notification,
          tenant: {
            id: tenant.id,
            displayName: tenant.displayName,
            settings: (tenant.settings as Record<string, unknown> | null) ?? null,
          },
          userEmail: user?.email ?? null,
        }).then(delivery => {
          if (!delivery.delivered) {
            console.warn("[notifications] delivery skipped", {
              notificationId: notification.id,
              reason: delivery.message,
            });
          }
        }).catch(error => {
          console.error("[notifications] delivery failed", {
            notificationId: notification.id,
            error,
          });
        });
      }
    }

    res.json({ data: design });
  } catch (error) {
    next(error);
  }
});

// POST /api/designs/:id/approve - Approve design
designsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const designId = req.params.id;

    const design = await prisma.designDocument.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }

    await prisma.designDocument.update({
      where: { id: designId },
      data: {
        status: "APPROVED",
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/designs/:id/reject - Reject design
designsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { reason } = z.object({
      reason: z.string().min(1).max(500),
    }).parse(req.body);

    const designId = req.params.id;

    const design = await prisma.designDocument.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }

    const metadata = (design.metrics as Record<string, unknown>) || {};
    metadata.rejectionReason = reason;
    metadata.rejectedAt = new Date().toISOString();

    await prisma.designDocument.update({
      where: { id: designId },
      data: {
        status: "REJECTED",
        metrics: metadata,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/designs/:id/export/png - Export design as PNG
designsRouter.post("/:id/export/png", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const designId = req.params.id;

    const design = await prisma.designDocument.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }

    // Return preview URL if available, otherwise TODO: generate PNG
    const url = design.previewUrl || `/api/designs/${designId}/preview.png`;

    res.json({ data: { url } });
  } catch (error) {
    next(error);
  }
});

// POST /api/designs/:id/export/pdf - Export design as PDF
designsRouter.post("/:id/export/pdf", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const designId = req.params.id;

    const design = await prisma.designDocument.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }

    // TODO: Generate print-ready PDF
    // For now, return a placeholder URL
    const url = `/api/designs/${designId}/print.pdf`;

    res.json({ data: { url } });
  } catch (error) {
    next(error);
  }
});

// POST /api/designs/:id/duplicate - Duplicate design
designsRouter.post("/:id/duplicate", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const designId = req.params.id;

    const existing = await prisma.designDocument.findFirst({
      where: { id: designId, tenantId },
      include: { outputs: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Design not found" });
    }

    // Create duplicate
    const duplicate = await prisma.designDocument.create({
      data: {
        tenantId: existing.tenantId,
        orderId: existing.orderId,
        productId: existing.productId,
        surfaceId: existing.surfaceId,
        name: `${existing.name || "Untitled"} (Copy)`,
        description: existing.description,
        snapshot: existing.snapshot,
        previewUrl: existing.previewUrl,
        sheetWidthMm: existing.sheetWidthMm,
        sheetHeightMm: existing.sheetHeightMm,
        metrics: existing.metrics,
        status: "DRAFT",
      },
    });

    res.status(201).json({
      data: {
        id: duplicate.id,
        title: duplicate.name ?? "Untitled",
        status: duplicate.status,
        createdAt: duplicate.createdAt.toISOString(),
        updatedAt: duplicate.updatedAt.toISOString(),
        orderNumber: null,
        customer: null,
        surface: null,
        product: null,
        previewUrl: duplicate.previewUrl,
        dimensions: duplicate.sheetWidthMm && duplicate.sheetHeightMm
          ? {
              widthMm: duplicate.sheetWidthMm,
              heightMm: duplicate.sheetHeightMm,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/designs/:id/convert-to-template - Convert design to template
designsRouter.post("/:id/convert-to-template", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, tags } = z.object({
      title: z.string().min(1).max(255),
      tags: z.array(z.string()).optional().default([]),
    }).parse(req.body);

    const designId = req.params.id;

    const design = await prisma.designDocument.findFirst({
      where: { id: designId, tenantId },
    });

    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }

    // Create template from design
    const template = await prisma.template.create({
      data: {
        tenantId,
        name: title,
        description: design.description || `Template created from design ${design.name}`,
        isPublic: false,
        payload: {
          items: (design.snapshot as any)?.items || [],
          target: {
            productSlug: "custom",
            surfaceId: design.surfaceId || "custom",
          },
          thumbDataUrl: design.previewUrl,
        },
      },
    });

    // Add tags
    if (tags.length > 0) {
      await prisma.templateTag.createMany({
        data: tags.map(tag => ({ templateId: template.id, tag })),
        skipDuplicates: true,
      });
    }

    res.json({ data: { id: template.id } });
  } catch (error) {
    next(error);
  }
});
