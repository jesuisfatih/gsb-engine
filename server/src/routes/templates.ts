import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../../src/generated/prisma/client";

const placeholderSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "image"]),
  description: z.string().max(512).optional().nullable(),
  required: z.boolean().optional(),
  lockFont: z.boolean().optional(),
  lockColor: z.boolean().optional(),
  maxLength: z.number().int().positive().optional(),
  minLength: z.number().int().nonnegative().optional(),
  initialValue: z.string().optional().nullable(),
  defaultImageUrl: z.string().optional().nullable(),
  allowedFonts: z.array(z.string().min(1)).optional(),
  allowedColors: z.array(z.string().min(1)).optional(),
  notes: z.string().max(512).optional().nullable(),
});

const templateInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().max(1024).optional().nullable(),
  tags: z.array(z.string().min(1).max(48)).optional().default([]),
  thumbDataUrl: z.string().optional().nullable(),
  target: z.object({
    productSlug: z.string().min(1),
    surfaceId: z.string().min(1),
  }),
  defaultPrintTech: z.string().optional().nullable(),
  items: z.array(z.any()),
  placeholders: z.array(placeholderSchema).optional().default([]),
});

const listTemplatesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(), // Search by title or description
  tag: z.string().optional(), // Filter by tag
  productSlug: z.string().optional(), // Filter by target product
  sortBy: z.enum(["createdAt", "name"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

interface TemplateProjection {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  thumbDataUrl?: string;
  createdBy: "super" | "merchant";
  merchantId?: string;
  target: {
    productSlug: string;
    surfaceId: string;
  };
  defaultPrintTech?: string | null;
  items: unknown[];
  placeholders?: unknown[];
  createdAt: number;
}

type TemplatePayload = {
  target?: TemplateProjection["target"];
  items?: unknown[];
  placeholders?: unknown[];
  defaultPrintTech?: string | null;
  thumbDataUrl?: string | null;
};

export const templatesRouter = Router();

function mapTemplate(record: any): TemplateProjection {
  const payload: TemplatePayload = (record.payload ?? {}) as TemplatePayload;
  const tags = Array.isArray(record.tags) ? record.tags.map((tag: any) => tag.tag) : [];
  return {
    id: record.id,
    title: record.name,
    description: record.description ?? undefined,
    tags,
    thumbDataUrl: payload.thumbDataUrl ?? undefined,
    createdBy: record.tenantId ? "merchant" : "super",
    merchantId: record.tenantId ?? undefined,
    target: payload.target ?? { productSlug: "tshirt", surfaceId: "tshirt-front" },
    defaultPrintTech: payload.defaultPrintTech ?? null,
    items: Array.isArray(payload.items) ? payload.items : [],
    placeholders: Array.isArray(payload.placeholders) ? payload.placeholders : [],
    createdAt: record.createdAt instanceof Date ? record.createdAt.getTime() : Date.now(),
  };
}

function buildPayload(input: z.infer<typeof templateInputSchema>): TemplatePayload {
  return {
    target: input.target,
    items: input.items,
    placeholders: input.placeholders,
    defaultPrintTech: input.defaultPrintTech ?? null,
    thumbDataUrl: input.thumbDataUrl ?? null,
  };
}

function ensureTemplateAccess(record: any, tenantId: string | null) {
  if (!record) return "not_found";
  if (record.tenantId && record.tenantId !== tenantId) return "forbidden";
  if (!record.tenantId && tenantId) return "forbidden";
  return "ok";
}

templatesRouter.get("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const query = listTemplatesQuerySchema.parse(req.query);

    // Base where clause for tenant access
    const baseWhere = tenantId
      ? { OR: [{ tenantId }, { tenantId: null, isPublic: true }] }
      : { tenantId: null, isPublic: true };

    const where: Prisma.TemplateWhereInput = { ...baseWhere };

    // Search by title or description
    if (query.search) {
      where.AND = [
        baseWhere,
        {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Filter by tag
    if (query.tag) {
      where.tags = {
        some: {
          tag: query.tag,
        },
      };
    }

    // Filter by product slug (stored in payload.target.productSlug)
    if (query.productSlug) {
      where.payload = {
        path: ["target", "productSlug"],
        equals: query.productSlug,
      };
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.offset,
        take: query.limit,
        include: { tags: true },
      }),
      prisma.template.count({ where }),
    ]);

    res.json({ 
      data: {
        items: templates.map(mapTemplate),
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

templatesRouter.get("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const templateId = req.params.id;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { tags: true },
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const access = ensureTemplateAccess(template, tenantId ?? null);
    if (access === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ data: mapTemplate(template) });
  } catch (error) {
    next(error);
  }
});

templatesRouter.post("/", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const input = templateInputSchema.parse(req.body);
    const payload = buildPayload(input);
    const uniqueTags = Array.from(new Set(input.tags ?? []));

    const created = await prisma.template.create({
      data: {
        tenantId: tenantId ?? null,
        isPublic: tenantId ? false : true,
        name: input.title,
        description: input.description ?? null,
        payload,
      },
    });

    if (uniqueTags.length) {
      await prisma.templateTag.createMany({
        data: uniqueTags.map(tag => ({ templateId: created.id, tag })),
        skipDuplicates: true,
      });
    }

    const record = await prisma.template.findUnique({
      where: { id: created.id },
      include: { tags: true },
    });

    res.status(201).json({ data: mapTemplate(record) });
  } catch (error) {
    next(error);
  }
});

// POST /:id/duplicate - Duplicate a template
templatesRouter.post("/:id/duplicate", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const templateId = req.params.id;

    const existing = await prisma.template.findUnique({
      where: { id: templateId },
      include: { tags: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Template not found" });
    }

    const access = ensureTemplateAccess(existing, tenantId ?? null);
    if (access === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Create duplicate with " (Copy)" suffix
    const duplicateName = `${existing.name} (Copy)`;
    const created = await prisma.template.create({
      data: {
        tenantId: tenantId ?? null,
        isPublic: false,
        name: duplicateName,
        description: existing.description,
        payload: existing.payload,
      },
    });

    // Copy tags
    if (existing.tags.length) {
      await prisma.templateTag.createMany({
        data: existing.tags.map(tag => ({ templateId: created.id, tag: tag.tag })),
        skipDuplicates: true,
      });
    }

    const record = await prisma.template.findUnique({
      where: { id: created.id },
      include: { tags: true },
    });

    res.status(201).json({ data: mapTemplate(record) });
  } catch (error) {
    next(error);
  }
});

templatesRouter.put("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const templateId = req.params.id;
    const existing = await prisma.template.findUnique({ where: { id: templateId } });
    const access = ensureTemplateAccess(existing, tenantId ?? null);
    if (access === "not_found") return res.status(404).json({ error: "Template not found" });
    if (access === "forbidden") return res.status(403).json({ error: "Forbidden" });

    const input = templateInputSchema.parse(req.body);
    const payload = buildPayload(input);
    const uniqueTags = Array.from(new Set(input.tags ?? []));

    await prisma.template.update({
      where: { id: templateId },
      data: {
        name: input.title,
        description: input.description ?? null,
        payload,
      },
    });

    await prisma.templateTag.deleteMany({ where: { templateId } });
    if (uniqueTags.length) {
      await prisma.templateTag.createMany({
        data: uniqueTags.map(tag => ({ templateId, tag })),
        skipDuplicates: true,
      });
    }

    const record = await prisma.template.findUnique({
      where: { id: templateId },
      include: { tags: true },
    });

    res.json({ data: mapTemplate(record) });
  } catch (error) {
    next(error);
  }
});

templatesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const templateId = req.params.id;
    const existing = await prisma.template.findUnique({ where: { id: templateId } });
    const access = ensureTemplateAccess(existing, tenantId ?? null);
    if (access === "not_found") return res.status(404).json({ error: "Template not found" });
    if (access === "forbidden") return res.status(403).json({ error: "Forbidden" });

    await prisma.templateTag.deleteMany({ where: { templateId } });
    await prisma.template.delete({ where: { id: templateId } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
