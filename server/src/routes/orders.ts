import { Router } from "express";
import { z } from "zod";

const listOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.string().optional(),
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

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
      },
      orderBy: { createdAt: "desc" },
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
    });

    const payload = orders.map(order => {
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

    res.json({ data: payload });
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
