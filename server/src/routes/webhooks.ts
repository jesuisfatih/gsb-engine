import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { env } from "../env";


export const webhooksRouter = Router();

// Webhook event types
const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "products/create",
  "products/update",
  "products/delete",
  "app/uninstalled",
] as const;

type WebhookTopic = typeof WEBHOOK_TOPICS[number];

// Webhook log schema
const webhookLogSchema = z.object({
  topic: z.string(),
  shopDomain: z.string().optional(),
  payload: z.any(),
  headers: z.record(z.string()).optional(),
});

function requireTenant(res: any, tenantId?: string): tenantId is string {
  if (!tenantId) {
    res.status(400).json({ error: "Missing tenant context" });
    return false;
  }
  return true;
}

/**
 * Verify Shopify webhook HMAC signature
 */
function verifyShopifyWebhook(body: string, hmacHeader: string): boolean {
  if (!env.SHOPIFY_API_SECRET) {
    console.warn("[webhooks] SHOPIFY_API_SECRET not set, skipping verification");
    return true; // Allow in development
  }

  const hash = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(body, "utf8")
    .digest("base64");

  return hash === hmacHeader;
}

/**
 * GET /api/webhooks
 * List configured webhook endpoints with health status
 */
webhooksRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get recent logs grouped by topic
    const recentLogs = await prisma.webhookLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: last24Hours },
      },
      select: {
        topic: true,
        status: true,
        createdAt: true,
        errorMessage: true,
        retryCount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by topic and get latest status
    const topicStatus: Record<string, {
      topic: string;
      status: "connected" | "retrying" | "failed";
      retries: number;
      lastDeliveryAt?: string;
      lastError?: string;
      successCount: number;
      failureCount: number;
    }> = {};

    WEBHOOK_TOPICS.forEach(topic => {
      const topicLogs = recentLogs.filter(log => log.topic === topic);
      const latestLog = topicLogs[0];
      const successCount = topicLogs.filter(log => log.status === "success").length;
      const failureCount = topicLogs.filter(log => log.status === "failed").length;
      
      let status: "connected" | "retrying" | "failed" = "connected";
      if (failureCount > 0 && latestLog?.status === "failed") {
        status = latestLog.retryCount && latestLog.retryCount > 0 ? "retrying" : "failed";
      } else if (latestLog?.retryCount && latestLog.retryCount > 0) {
        status = "retrying";
      }

      topicStatus[topic] = {
        topic,
        status,
        retries: latestLog?.retryCount || 0,
        lastDeliveryAt: latestLog?.createdAt.toISOString(),
        lastError: latestLog?.errorMessage || undefined,
        successCount,
        failureCount,
      };
    });

    const webhooks = Object.values(topicStatus).map(item => ({
      id: item.topic,
      topic: item.topic,
      url: `${env.APP_BASE_URL || "https://app.gsb-engine.dev"}/api/webhooks/${item.topic}`,
      enabled: true, // All are enabled by default
      status: item.status,
      retries: item.retries,
      lastDeliveryAt: item.lastDeliveryAt,
      lastError: item.lastError,
      deliveryHistory: [], // Would be populated from detailed logs if needed
    }));

    res.json({ data: webhooks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks/logs
 * Get webhook delivery logs for monitoring
 */
webhooksRouter.get("/logs", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const topic = req.query.topic as string | undefined;
    const status = req.query.status as "success" | "failed" | undefined;

    const where: any = { tenantId };
    if (topic) where.topic = topic;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          topic: true,
          status: true,
          shopDomain: true,
          createdAt: true,
          responseStatus: true,
          errorMessage: true,
          retryCount: true,
        },
      }),
      prisma.webhookLog.count({ where }),
    ]);

    res.json({
      data: {
        logs,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks/stats
 * Webhook health statistics
 */
webhooksRouter.get("/stats", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, last24h, byStatus, byTopic] = await Promise.all([
      prisma.webhookLog.count({ where: { tenantId } }),
      
      prisma.webhookLog.count({
        where: {
          tenantId,
          createdAt: { gte: last24Hours },
        },
      }),
      
      prisma.webhookLog.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
      
      prisma.webhookLog.groupBy({
        by: ["topic"],
        where: { tenantId },
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const topicCounts = byTopic.reduce((acc, item) => {
      acc[item.topic] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const successRate = total > 0
      ? ((statusCounts.success || 0) / total * 100).toFixed(2)
      : "0.00";

    res.json({
      data: {
        total,
        last24Hours: last24h,
        successRate: parseFloat(successRate),
        byStatus: statusCounts,
        byTopic: topicCounts,
        failed: statusCounts.failed || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks/shopify
 * Shopify webhook receiver
 */
webhooksRouter.post("/shopify", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    const rawBody = JSON.stringify(req.body);
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256") || "";
    const topic = req.get("X-Shopify-Topic") || "unknown";
    const shopDomain = req.get("X-Shopify-Shop-Domain") || "";

    console.log("[webhooks] Received Shopify webhook:", topic, "from", shopDomain);

    // Verify webhook signature
    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      console.error("[webhooks] Invalid HMAC signature");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    // Find tenant by shop domain
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { shopifyDomain: shopDomain },
          { settings: { path: ["shopify", "domain"], equals: shopDomain } },
        ],
      },
    });

    if (!tenant) {
      console.warn("[webhooks] Tenant not found for shop:", shopDomain);
      
      // Log webhook even if tenant not found
      await prisma.webhookLog.create({
        data: {
          topic,
          shopDomain,
          payload: req.body,
          status: "failed",
          errorMessage: "Tenant not found",
          responseStatus: 404,
        },
      });
      
      return res.status(404).json({ error: "Merchant not found" });
    }

    // Log webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        tenantId: tenant.id,
        topic,
        shopDomain,
        payload: req.body,
        status: "processing",
      },
    });

    // Process webhook based on topic
    try {
      await processWebhook(topic, req.body, tenant.id, prisma);
      
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: "success",
          responseStatus: 200,
          processedAt: new Date(),
        },
      });
      
      console.log("[webhooks] Successfully processed:", topic);
    } catch (processingError: any) {
      console.error("[webhooks] Processing error:", processingError);
      
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: "failed",
          errorMessage: processingError.message,
          responseStatus: 500,
        },
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[webhooks] Error:", error);
    next(error);
  }
});

/**
 * POST /api/webhooks/:id/retry
 * Retry a failed webhook
 */
webhooksRouter.post("/:id/retry", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!requireTenant(res, tenantId)) return;

    const log = await prisma.webhookLog.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!log) {
      return res.status(404).json({ error: "Webhook log not found" });
    }

    if (log.status === "success") {
      return res.status(400).json({ error: "Webhook already succeeded" });
    }

    // Update retry count
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        status: "processing",
        retryCount: (log.retryCount || 0) + 1,
      },
    });

    // Reprocess webhook
    try {
      await processWebhook(log.topic, log.payload, tenantId, prisma);
      
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          responseStatus: 200,
          processedAt: new Date(),
          errorMessage: null,
        },
      });
      
      res.json({ success: true, message: "Webhook retried successfully" });
    } catch (error: any) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          status: "failed",
          errorMessage: error.message,
        },
      });
      
      res.status(500).json({ error: "Retry failed", message: error.message });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Process webhook based on topic
 */
async function processWebhook(topic: string, payload: any, tenantId: string, prisma: any) {
  console.log("[webhooks] Processing:", topic);

  switch (topic) {
    case "orders/create":
    case "orders/updated":
      // Handle order events
      await handleOrderWebhook(payload, tenantId, prisma);
      break;

    case "products/create":
    case "products/update":
      // Handle product events
      await handleProductWebhook(payload, tenantId, prisma);
      break;

    case "products/delete":
      // Handle product deletion
      await handleProductDeletion(payload, tenantId, prisma);
      break;

    case "app/uninstalled":
      // Handle app uninstall
      await handleAppUninstall(payload, tenantId, prisma);
      break;

    default:
      console.log("[webhooks] Unhandled topic:", topic);
  }
}

async function handleOrderWebhook(payload: any, tenantId: string, prisma: any) {
  // Implementation placeholder
  console.log("[webhooks] Order webhook:", payload.id);
  // TODO: Sync order data, update status, etc.
}

async function handleProductWebhook(payload: any, tenantId: string, prisma: any) {
  // Implementation placeholder
  console.log("[webhooks] Product webhook:", payload.id);
  // TODO: Sync product catalog
}

async function handleProductDeletion(payload: any, tenantId: string, prisma: any) {
  // Implementation placeholder
  console.log("[webhooks] Product deleted:", payload.id);
  // TODO: Archive or delete mappings
}

async function handleAppUninstall(payload: any, tenantId: string, prisma: any) {
  console.log("[webhooks] App uninstalled for tenant:", tenantId);
  
  // Mark tenant as inactive or remove Shopify credentials
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      shopifyAccessToken: null,
      settings: {
        ...((await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } }))?.settings as any || {}),
        shopify: {
          uninstalledAt: new Date().toISOString(),
        },
      },
    },
  });
}

