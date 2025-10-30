import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../../src/generated/prisma/client";

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export const analyticsRouter = Router();

function requireTenant(res: Parameters<typeof analyticsRouter.get>[1]["res"], tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

/**
 * GET /api/analytics/revenue - Revenue trend over time
 */
analyticsRouter.get("/revenue", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const query = analyticsQuerySchema.parse(req.query);
    const days = query.days;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get orders with totals within date range
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        subtotal: true,
        taxTotal: true,
        shippingTotal: true,
        discountsTotal: true,
      },
    });

    // Group by day
    const dailyRevenue: Record<string, number> = {};
    
    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      dailyRevenue[dateKey] = 0;
    }

    // Calculate revenue per order
    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      const revenue = (order.subtotal?.toNumber() || 0) + 
                     (order.taxTotal?.toNumber() || 0) + 
                     (order.shippingTotal?.toNumber() || 0) - 
                     (order.discountsTotal?.toNumber() || 0);
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + revenue;
    });

    // Convert to array format for chart
    const labels = Object.keys(dailyRevenue).sort();
    const data = labels.map(key => dailyRevenue[key]);

    res.json({
      data: {
        labels,
        series: data,
        totalRevenue: data.reduce((sum, val) => sum + val, 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/orders - Order count trend over time
 */
analyticsRouter.get("/orders", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const query = analyticsQuerySchema.parse(req.query);
    const days = query.days;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get orders grouped by day
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by day
    const dailyOrders: Record<string, number> = {};
    
    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      dailyOrders[dateKey] = 0;
    }

    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      dailyOrders[dateKey] = (dailyOrders[dateKey] || 0) + 1;
    });

    // Convert to array format
    const labels = Object.keys(dailyOrders).sort();
    const data = labels.map(key => dailyOrders[key]);

    res.json({
      data: {
        labels,
        series: data,
        totalOrders: orders.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/utilization - Average gang sheet utilization
 */
analyticsRouter.get("/utilization", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const gangSheets = await prisma.gangSheet.findMany({
      where: {
        tenantId,
        status: { not: "archived" },
      },
      select: {
        utilization: true,
      },
    });

    if (gangSheets.length === 0) {
      return res.json({
        data: {
          average: 0,
          total: 0,
          byStatus: {},
        },
      });
    }

    const totalUtilization = gangSheets.reduce((sum, sheet) => {
      return sum + (sheet.utilization || 0);
    }, 0);

    const average = (totalUtilization / gangSheets.length) * 100; // Convert to percentage

    res.json({
      data: {
        average: Math.round(average * 10) / 10, // Round to 1 decimal
        total: gangSheets.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

