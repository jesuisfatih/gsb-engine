import { Prisma } from "../../../src/generated/prisma/client";
import { Router } from "express";
import { z } from "zod";

const JOB_STATUS_VALUES = ["QUEUED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "FAILED", "CANCELLED"] as const;

const listQuerySchema = z.object({
  status: z.enum(JOB_STATUS_VALUES).optional(),
  technique: z.string().min(1).optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

const jobUpdateSchema = z.object({
  status: z.enum(JOB_STATUS_VALUES).optional(),
  priority: z.number().int().optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: z.object({}).catchall(z.any()).nullable().optional(),
});

export const jobsRouter = Router();

jobsRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const query = listQuerySchema.parse(req.query);

    const where: Prisma.JobWhereInput = {
      tenantId,
      deletedAt: query.includeDeleted ? undefined : null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.technique) {
      where.printTechnique = { slug: query.technique };
    }

    const jobs = await prisma.job.findMany({
      where,
      take: query.limit,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        design: {
          include: {
            outputs: true,
          },
        },
        printTechnique: true,
        supplier: true,
        assignedUser: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    res.json({ data: jobs });
  } catch (error) {
    next(error);
  }
});

jobsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const payload = jobUpdateSchema.parse(req.body);
    const { id } = req.params;

    const baseJob = await prisma.job.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!baseJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    const data: Prisma.JobUpdateInput = {};

    if (payload.status && payload.status !== baseJob.status) {
      data.status = payload.status;
      if (payload.status === "IN_PROGRESS") {
        if (!baseJob.startedAt) {
          data.startedAt = new Date();
        }
        data.completedAt = null;
      } else if (payload.status === "COMPLETED") {
        data.completedAt = new Date();
        if (!baseJob.startedAt) {
          data.startedAt = new Date();
        }
      } else if (payload.status === "QUEUED") {
        data.startedAt = null;
        data.completedAt = null;
      } else if (payload.status === "ON_HOLD") {
        data.completedAt = null;
      } else if (payload.status === "FAILED" || payload.status === "CANCELLED") {
        data.completedAt = null;
      }
    }

    if (payload.priority !== undefined) {
      data.priority = payload.priority;
    }

    if (payload.assignedUserId !== undefined) {
      data.assignedUserId = payload.assignedUserId ?? null;
    }

    if (payload.supplierId !== undefined) {
      data.supplierId = payload.supplierId ?? null;
    }

    if (payload.notes !== undefined) {
      data.notes = payload.notes ?? null;
    }

    if (payload.metadata !== undefined) {
      data.metadata = payload.metadata ?? Prisma.JsonNull;
    }

    const job = await prisma.$transaction(async tx => {
      const updated = await tx.job.update({
        where: { id },
        data,
        include: {
          design: {
            include: { outputs: true },
          },
          printTechnique: true,
          supplier: true,
          assignedUser: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};

      if (payload.status && payload.status !== baseJob.status) {
        before.status = baseJob.status;
        after.status = updated.status;
      }
      if (payload.assignedUserId !== undefined && payload.assignedUserId !== baseJob.assignedUserId) {
        before.assignedUserId = baseJob.assignedUserId;
        after.assignedUserId = updated.assignedUserId;
      }
      if (payload.supplierId !== undefined && payload.supplierId !== baseJob.supplierId) {
        before.supplierId = baseJob.supplierId;
        after.supplierId = updated.supplierId;
      }
      if (payload.priority !== undefined && payload.priority !== baseJob.priority) {
        before.priority = baseJob.priority;
        after.priority = updated.priority;
      }

      if (Object.keys(before).length > 0) {
        await tx.auditLog.create({
          data: {
            tenantId,
            actorUserId: user?.id ?? null,
            event: "job.update",
            entity: "Job",
            entityId: updated.id,
            diff: {
              before,
              after,
            },
          },
        });
      }

      if (payload.status && payload.status !== baseJob.status) {
        await tx.notification.create({
          data: {
            tenantId,
            kind: "job.status_change",
            payload: {
              jobId: updated.id,
              previousStatus: baseJob.status,
              status: updated.status,
            },
          },
        });
      }

      return updated;
    });

    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

jobsRouter.post("/:id/labels", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const { id } = req.params;
    const job = await prisma.job.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // TODO: integrate real label generation pipeline.
    const mockUrl = `https://cdn.gsb.dev/labels/${job.id}.pdf`;
    res.json({ data: { url: mockUrl } });
  } catch (error) {
    next(error);
  }
});

jobsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const { id } = req.params;
    const job = await prisma.job.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const deletionTime = new Date();
    await prisma.$transaction(async tx => {
      await tx.job.update({
        where: { id },
        data: {
          status: "CANCELLED",
          deletedAt: deletionTime,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user?.id ?? null,
          event: "job.delete",
          entity: "Job",
          entityId: id,
          diff: {
            before: { deletedAt: null },
            after: { deletedAt: deletionTime },
          },
        },
      });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
