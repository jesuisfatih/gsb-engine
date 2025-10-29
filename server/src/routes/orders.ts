import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../../src/generated/prisma/client";

const listOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["Created", "Queued", "In production", "On hold", "Completed", "Failed", "Cancelled"]).optional(),
  search: z.string().optional(), // Search by order number, customer name, or email
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "shopifyOrderId"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const orderIdParams = z.object({
  orderId: z.string().uuid("Invalid order id"),
});

export const ordersRouter = Router();

function requireTenant(res: Parameters<typeof ordersRouter.get>[1]["res"], tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

// GET /api/orders/stats - Dashboard statistics
ordersRouter.get("/stats", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const [total, last7Days, last30Days, statuses] = await Promise.all([
      // Total orders
      prisma.order.count({ where: { tenantId } }),
      
      // Orders in last 7 days
      prisma.order.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      
      // Orders in last 30 days
      prisma.order.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      
      // Status breakdown
      prisma.order.findMany({
        where: { tenantId },
        include: {
          jobs: { select: { status: true } },
        },
      }),
    ]);

    const statusCounts = statuses.reduce((acc, order) => {
      const status = deriveStatus(order.jobs);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      data: {
        total,
        last7Days,
        last30Days,
        byStatus: statusCounts,
        pendingFulfillment: (statusCounts["Created"] || 0) + (statusCounts["Queued"] || 0) + (statusCounts["In production"] || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

function deriveStatus(jobs: { status: string }[]) {
  if (!jobs.length) return "Created";
  const priority = ["IN_PROGRESS", "ON_HOLD", "QUEUED", "COMPLETED", "FAILED", "CANCELLED"];
  const found = priority.find(status => jobs.some(job => job.status === status));
  if (found === "COMPLETED") return "Completed";
  if (found === "IN_PROGRESS") return "In production";
  if (found === "ON_HOLD") return "On hold";
  if (found === "QUEUED") return "Queued";
  if (found === "FAILED") return "Failed";
  if (found === "CANCELLED") return "Cancelled";
  return "Created";
}

ordersRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const query = listOrdersQuerySchema.parse(req.query);

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      tenantId,
    };

    // Search by order number, customer name, or email
    if (query.search) {
      where.OR = [
        { shopifyOrderId: { contains: query.search, mode: "insensitive" } },
        { customerName: { contains: query.search, mode: "insensitive" } },
        { customerEmail: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Date range filter
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = query.fromDate;
      if (query.toDate) where.createdAt.lte = query.toDate;
    }

    // Fetch orders with includes
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.offset,
        take: query.limit,
        include: {
          designs: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true,
              name: true,
              status: true,
              previewUrl: true,
              sheetWidthMm: true,
              sheetHeightMm: true,
              createdAt: true,
              outputs: {
                select: { id: true },
              },
            },
          },
          jobs: {
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Filter by derived status if requested
    let filteredOrders = orders;
    if (query.status) {
      filteredOrders = orders.filter(order => deriveStatus(order.jobs) === query.status);
    }

    const payload = filteredOrders.map(order => {
      const primaryDesign = order.designs[0];
      const downloadCount = order.designs.reduce((sum, d) => sum + d.outputs.length, 0);

      return {
        id: order.id,
        orderNumber: order.shopifyOrderId ?? order.id,
        status: deriveStatus(order.jobs),
        createdAt: order.createdAt,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
        },
        downloadsCompleted: downloadCount,
        primaryDesign: primaryDesign
          ? {
              id: primaryDesign.id,
              name: primaryDesign.name ?? "Untitled design",
              status: primaryDesign.status,
              previewUrl: primaryDesign.previewUrl,
              dimensions: primaryDesign.sheetWidthMm && primaryDesign.sheetHeightMm
                ? {
                    widthMm: primaryDesign.sheetWidthMm,
                    heightMm: primaryDesign.sheetHeightMm,
                  }
                : null,
            }
          : null,
      };
    });

    res.json({ 
      data: {
        items: payload,
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

ordersRouter.get("/:orderId", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const { orderId } = orderIdParams.parse(req.params);

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        designs: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            status: true,
            description: true,
            previewUrl: true,
            sheetWidthMm: true,
            sheetHeightMm: true,
            metrics: true,
            createdAt: true,
            outputs: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                kind: true,
                url: true,
                createdAt: true,
              },
            },
          },
        },
        jobs: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            supplierId: true,
            createdAt: true,
            updatedAt: true,
            supplier: {
              select: {
                name: true,
                regions: true,
                leadTimeDays: true,
              },
            },
          },
        },
        billingCharges: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const designs = order.designs.map(design => ({
      id: design.id,
      name: design.name ?? "Untitled design",
      status: design.status,
      previewUrl: design.previewUrl,
      description: design.description,
      dimensions: design.sheetWidthMm && design.sheetHeightMm
        ? {
            widthMm: design.sheetWidthMm,
            heightMm: design.sheetHeightMm,
          }
        : null,
      outputs: design.outputs.map(output => ({
        id: output.id,
        kind: output.kind,
        url: output.url,
        createdAt: output.createdAt,
      })),
    }));

    const jobs = order.jobs.map(job => ({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      supplier: job.supplier
        ? {
            name: job.supplier.name,
            regions: job.supplier.regions,
            leadTimeDays: job.supplier.leadTimeDays,
          }
        : null,
    }));

    const timeline = [
      {
        id: `${order.id}-created`,
        type: "order_created",
        message: "Order created",
        occurredAt: order.createdAt,
        meta: {
          customer: order.customerName ?? order.customerEmail,
        },
      },
      ...designs.map(design => ({
        id: `${design.id}-uploaded`,
        type: "design_uploaded",
        message: `Design "${design.name}" uploaded`,
        occurredAt: order.createdAt,
        meta: { status: design.status },
      })),
      ...jobs.map(job => ({
        id: `${job.id}-status`,
        type: "job_status",
        message: `Job ${job.status.toLowerCase().replace(/_/g, " ")}`,
        occurredAt: job.updatedAt ?? job.createdAt,
        meta: { supplier: job.supplier?.name ?? null },
      })),
      ...order.billingCharges.map(charge => ({
        id: charge.id,
        type: "billing_charge",
        message: `Billing charge (${charge.type.toLowerCase()})`,
        occurredAt: charge.occurredAt,
        meta: { status: charge.status },
      })),
    ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    res.json({
      data: {
        id: order.id,
        orderNumber: order.shopifyOrderId ?? order.id,
        createdAt: order.createdAt,
        status: deriveStatus(order.jobs),
        customer: {
          name: order.customerName,
          email: order.customerEmail,
        },
        totals: {
          subtotal: order.subtotal?.toNumber() ?? null,
          taxTotal: order.taxTotal?.toNumber() ?? null,
          shippingTotal: order.shippingTotal?.toNumber() ?? null,
          discountsTotal: order.discountsTotal?.toNumber() ?? null,
        },
        designs,
        jobs,
        activity: timeline,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders/bulk-download - Bulk download designs as ZIP
ordersRouter.post("/bulk-download", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const { orderIds } = z.object({
      orderIds: z.array(z.string().uuid()).min(1),
    }).parse(req.body);

    // Fetch all designs for selected orders
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        tenantId,
      },
      include: {
        designs: {
          include: {
            outputs: {
              where: {
                kind: { in: ["PDF", "PNG", "SVG"] },
              },
            },
          },
        },
      },
    });

    // Collect all output URLs
    const files: Array<{ url: string; filename: string }> = [];
    orders.forEach(order => {
      order.designs.forEach((design, dIdx) => {
        design.outputs.forEach((output, oIdx) => {
          const ext = output.kind.toLowerCase();
          const filename = `${order.shopifyOrderId || order.id}_design${dIdx + 1}_${oIdx + 1}.${ext}`;
          files.push({ url: output.url, filename });
        });
      });
    });

    if (files.length === 0) {
      return res.status(404).json({ error: "No downloadable files found for selected orders" });
    }

    // TODO: Create ZIP file and return download URL
    // For now, return the list of files
    // In production, use archiver or jszip to create a zip
    res.json({
      data: {
        url: `/api/orders/download-zip?files=${encodeURIComponent(JSON.stringify(files))}`,
        fileCount: files.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders/bulk-ship - Mark multiple orders as shipped
ordersRouter.post("/bulk-ship", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const { orderIds } = z.object({
      orderIds: z.array(z.string().uuid()).min(1),
    }).parse(req.body);

    // Update all jobs for these orders to COMPLETED status
    await prisma.job.updateMany({
      where: {
        order: {
          id: { in: orderIds },
          tenantId,
        },
      },
      data: {
        status: "COMPLETED",
        updatedAt: new Date(),
      },
    });

    res.json({ success: true, count: orderIds.length });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/orders/:orderId/priority - Toggle priority flag
ordersRouter.patch("/:orderId/priority", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const { orderId } = orderIdParams.parse(req.params);
    const { priority } = z.object({
      priority: z.boolean(),
    }).parse(req.body);

    // Update order metadata to store priority flag
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const metadata = (order.metadata as Record<string, unknown>) || {};
    metadata.priority = priority;

    await prisma.order.update({
      where: { id: orderId },
      data: { metadata },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders/:orderId/refund - Request refund
ordersRouter.post("/:orderId/refund", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const { orderId } = orderIdParams.parse(req.params);
    const { reason } = z.object({
      reason: z.string().min(1).max(500),
    }).parse(req.body);

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // TODO: Integrate with Shopify Refund API
    // For now, just log the refund request
    console.log(`[orders] Refund request for order ${orderId}: ${reason}`);

    // Update order metadata
    const metadata = (order.metadata as Record<string, unknown>) || {};
    metadata.refundRequested = true;
    metadata.refundReason = reason;
    metadata.refundRequestedAt = new Date().toISOString();

    await prisma.order.update({
      where: { id: orderId },
      data: { metadata },
    });

    res.json({ success: true, message: "Refund request submitted" });
  } catch (error) {
    next(error);
  }
});
