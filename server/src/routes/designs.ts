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

export const designsRouter = Router();

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
