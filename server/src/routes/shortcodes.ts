import type { PrismaClient } from "../../src/generated/prisma/client";
import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";

const createSchema = z.object({
  handle: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/i, "Handle may only contain letters, numbers, and hyphen"),
  productId: z.string().uuid().optional(),
  productGid: z.string().min(3),
  productTitle: z.string().optional(),
  productHandle: z.string().optional(),
  surfaceId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  technique: z.string().optional(),
  locale: z.string().min(2).max(10).optional(),
});

const updateSchema = createSchema.partial();

export const shortcodesRouter = Router();

async function ensureUniqueHandle(prisma: PrismaClient, tenantId: string, handle: string) {
  const normalized = handle.toLowerCase();
  const existing = await prisma.shortcode.findFirst({
    where: { handle: normalized, tenantId },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Handle "${normalized}" is already in use.`);
  }
}

function buildEmbedSnippet(req: Request, handle: string) {
  const protocol = req.protocol;
  const host = req.get("host");
  const scriptUrl = `${protocol}://${host}/gsb-shortcode.js`;
  const apiUrl = `${protocol}://${host}/api/embed/shortcodes`;

  return {
    div: `<div data-gsb-shortcode="${handle}"></div>`,
    script: `<script src="${scriptUrl}" data-api-url="${apiUrl}" data-editor-url="/editor" defer></script>`,
  };
}

shortcodesRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const list = await prisma.shortcode.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { usages: true } },
      },
      take: 200,
    });

    const ids = list.map(item => item.id);
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    const usageLast7 = ids.length
      ? await prisma.shortcodeUsage.groupBy({
          by: ["shortcodeId"],
          where: {
            shortcodeId: { in: ids },
            createdAt: { gte: sevenDaysAgo },
          },
          _count: { id: true },
        })
      : [];

    const usageLast24 = ids.length
      ? await prisma.shortcodeUsage.groupBy({
          by: ["shortcodeId"],
          where: {
            shortcodeId: { in: ids },
            createdAt: { gte: last24h },
          },
          _count: { id: true },
        })
      : [];

    const map7 = new Map<string, number>(usageLast7.map(entry => [entry.shortcodeId, entry._count.id]));
    const map24 = new Map<string, number>(usageLast24.map(entry => [entry.shortcodeId, entry._count.id]));

    const data = list.map(item => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        usageTotal: _count?.usages ?? 0,
        usageLast7: map7.get(item.id) ?? 0,
        usageLast24: map24.get(item.id) ?? 0,
        embed: buildEmbedSnippet(req, item.handle),
      };
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

shortcodesRouter.post("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }
    const payload = createSchema.parse(req.body);

    await ensureUniqueHandle(prisma, tenantId, payload.handle);

    const shortcode = await prisma.shortcode.create({
      data: {
        tenantId,
        handle: payload.handle.toLowerCase(),
        productId: payload.productId,
        productGid: payload.productGid,
        productTitle: payload.productTitle,
        productHandle: payload.productHandle,
        surfaceId: payload.surfaceId,
        templateId: payload.templateId,
        technique: payload.technique,
        locale: payload.locale ?? "en",
      },
    });

    res.status(201).json({
      data: {
        ...shortcode,
        usageTotal: 0,
        usageLast7: 0,
        usageLast24: 0,
        embed: buildEmbedSnippet(req, shortcode.handle),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ error: error.flatten() });
    }
    if (error instanceof Error && /already in use/i.test(error.message)) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

shortcodesRouter.patch("/:handle", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }
    const { handle } = req.params;
    const payload = updateSchema.parse(req.body);

    const existing = await prisma.shortcode.findUnique({ where: { handle } });
    if (!existing) return res.status(404).json({ error: "Shortcode not found" });
    if (existing.tenantId !== tenantId) return res.status(403).json({ error: "Forbidden" });

    if (payload.handle && payload.handle !== handle) {
      await ensureUniqueHandle(prisma, tenantId, payload.handle);
    }

    const shortcode = await prisma.shortcode.update({
      where: { id: existing.id },
      data: {
        handle: payload.handle ? payload.handle.toLowerCase() : existing.handle,
        productId: payload.productId ?? existing.productId,
        productGid: payload.productGid ?? existing.productGid,
        productTitle: payload.productTitle ?? existing.productTitle,
        productHandle: payload.productHandle ?? existing.productHandle,
        surfaceId: payload.surfaceId ?? existing.surfaceId,
        templateId: payload.templateId ?? existing.templateId,
        technique: payload.technique ?? existing.technique,
        locale: payload.locale ?? existing.locale,
      },
    });

    const usageTotal = await prisma.shortcodeUsage.count({ where: { shortcodeId: shortcode.id } });
    const usageLast7 = await prisma.shortcodeUsage.count({
      where: {
        shortcodeId: shortcode.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const usageLast24 = await prisma.shortcodeUsage.count({
      where: {
        shortcodeId: shortcode.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    res.json({
      data: {
        ...shortcode,
        usageTotal,
        usageLast7,
        usageLast24,
        embed: buildEmbedSnippet(req, shortcode.handle),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ error: error.flatten() });
    }
    next(error);
  }
});

shortcodesRouter.delete("/:handle", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const existing = await prisma.shortcode.findUnique({ where: { handle: req.params.handle } });
    if (!existing) return res.status(404).json({ error: "Shortcode not found" });
    if (existing.tenantId !== tenantId) return res.status(403).json({ error: "Forbidden" });

    await prisma.shortcode.delete({
      where: { id: existing.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

shortcodesRouter.get("/:handle", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    const shortcode = await prisma.shortcode.findUnique({
      where: { handle: req.params.handle },
    });
    if (!shortcode) return res.status(404).json({ error: "Shortcode not found" });
    res.json({ data: shortcode });
  } catch (error) {
    next(error);
  }
});

shortcodesRouter.get("/:handle/embed", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const normalized = req.params.handle.toLowerCase();

    const record = await prisma.shortcode.findUnique({
      where: { handle: normalized },
    });
    if (!record) return res.status(404).json({ error: "Shortcode not found" });
    if (tenantId && record.tenantId !== tenantId) return res.status(403).json({ error: "Forbidden" });

    const total = await prisma.shortcodeUsage.count({
      where: { shortcodeId: record.id },
    });

    const recent = await prisma.shortcodeUsage.count({
      where: {
        shortcodeId: record.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    res.json({
      data: {
        record,
        usageTotal: total,
        usageLast7: recent,
        embed: buildEmbedSnippet(req, normalized),
      },
    });
  } catch (error) {
    next(error);
  }
});

