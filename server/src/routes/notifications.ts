import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../../src/generated/prisma/client";

const listQuerySchema = z.object({
  unread: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const notificationsRouter = Router();

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const query = listQuerySchema.parse(req.query);
    const where: Prisma.NotificationWhereInput = {
      tenantId,
      OR: user ? [{ userId: user.id }, { userId: null }] : [{ userId: null }],
    };
    if (query.unread) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });

    res.json({ data: notifications });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        tenantId,
        OR: user ? [{ userId: user.id }, { userId: null }] : [{ userId: null }],
      },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});
