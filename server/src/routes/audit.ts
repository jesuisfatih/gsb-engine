import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../../src/generated/prisma/client";

const querySchema = z.object({
  entity: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  event: z.string().min(1).optional(),
  actorUserId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const auditRouter = Router();

function requireTenant(res: any, tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

/**
 * GET /api/audit - List audit logs with filters
 */
auditRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const query = querySchema.parse(req.query);
    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.event) where.event = query.event;
    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.offset,
        take: query.limit,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: {
        items: logs,
        total,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/stats - Audit statistics
 */
auditRouter.get("/stats", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, last24h, last7d, byEntity, byEvent] = await Promise.all([
      prisma.auditLog.count({ where: { tenantId } }),
      
      prisma.auditLog.count({
        where: { tenantId, createdAt: { gte: last24Hours } },
      }),
      
      prisma.auditLog.count({
        where: { tenantId, createdAt: { gte: last7Days } },
      }),
      
      prisma.auditLog.groupBy({
        by: ["entity"],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { entity: "desc" } },
        take: 10,
      }),
      
      prisma.auditLog.groupBy({
        by: ["event"],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { event: "desc" } },
        take: 10,
      }),
    ]);

    const entityCounts = byEntity.reduce((acc, item) => {
      acc[item.entity] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const eventCounts = byEvent.reduce((acc, item) => {
      acc[item.event] = item._count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      data: {
        total,
        last24Hours: last24h,
        last7Days: last7d,
        byEntity: entityCounts,
        byEvent: eventCounts,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/entities - List unique entity types
 */
auditRouter.get("/entities", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const entities = await prisma.auditLog.findMany({
      where: { tenantId },
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" },
    });

    res.json({ data: entities.map(e => e.entity) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audit/events - List unique event types
 */
auditRouter.get("/events", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const events = await prisma.auditLog.findMany({
      where: { tenantId },
      distinct: ["event"],
      select: { event: true },
      orderBy: { event: "asc" },
    });

    res.json({ data: events.map(e => e.event) });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to log audit events (export for use in other routes)
 */
export async function logAuditEvent(
  prisma: any,
  data: {
    tenantId: string;
    entity: string;
    entityId: string;
    event: string;
    actorUserId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }
) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        entity: data.entity,
        entityId: data.entityId,
        event: data.event,
        actorUserId: data.actorUserId,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
      },
    });
  } catch (error) {
    console.error("[audit] Failed to log event:", error);
    // Don't throw - audit logging should not break the main flow
  }
}
