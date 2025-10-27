import { Router } from "express";
import { z } from "zod";
import {
  calculatePricingQuote,
  pricingRuleFormulaSchema,
  techniqueConfigSchema,
} from "../services/pricingEngine";

const pricingInputSchema = z.object({
  productId: z.string().uuid(),
  surfaceId: z.string().uuid(),
  printTechniqueId: z.string().uuid(),
  areaSquareCm: z.number().positive(),
  quantity: z.number().int().positive(),
  colors: z.number().int().min(1).max(12).optional(),
  coverageRatio: z.number().min(0).max(1).optional(),
  sheetCoverageRatio: z.number().min(0).max(1).optional(),
  whiteUnderbase: z.boolean().optional(),
  rush: z.boolean().optional(),
});

const techniqueUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(480).optional().nullable(),
  config: techniqueConfigSchema,
});

const pricingRuleInputSchema = z.object({
  name: z.string().min(1),
  scope: z.string().min(1),
  criteria: z.record(z.any()).optional().nullable(),
  formula: pricingRuleFormulaSchema,
  active: z.boolean().optional(),
  startsAt: z.string().datetime({ offset: true }).optional().nullable(),
  endsAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const pricingRouter = Router();

pricingRouter.post("/quote", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const input = pricingInputSchema.parse(req.body);

    const quote = await calculatePricingQuote(prisma, tenantId ?? null, input);

    res.json({ data: quote });
  } catch (error) {
    next(error);
  }
});

pricingRouter.get("/configs", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const where = tenantId
      ? { OR: [{ tenantId }, { tenantId: null }] }
      : { tenantId: null };

    const techniques = await prisma.printTechnique.findMany({
      where,
      orderBy: { name: "asc" },
    });

    const data = techniques.map((tech) => {
      const parsed = techniqueConfigSchema.safeParse(tech.rules ?? {});
      return {
        id: tech.id,
        name: tech.name,
        slug: tech.slug,
        tenantId: tech.tenantId,
        isDefault: tech.isDefault,
        description: tech.description,
        config: parsed.success ? parsed.data : null,
        rawRules: tech.rules ?? null,
      };
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

pricingRouter.put("/configs/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    const techniqueId = req.params.id;
    const { name, description, config } = techniqueUpdateSchema.parse(req.body);

    const technique = await prisma.printTechnique.findUnique({ where: { id: techniqueId } });
    if (!technique) return res.status(404).json({ error: "Technique not found" });
    if (technique.tenantId && tenantId !== technique.tenantId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!technique.tenantId && tenantId) {
      return res.status(403).json({ error: "Only platform admins can edit global techniques" });
    }

    const updated = await prisma.printTechnique.update({
      where: { id: techniqueId },
      data: {
        name: name ?? technique.name,
        description: description ?? technique.description,
        rules: config,
      },
    });

    res.json({
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        tenantId: updated.tenantId,
        description: updated.description,
        config,
      },
    });
  } catch (error) {
    next(error);
  }
});

pricingRouter.get("/rules", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.json({ data: [] });

    const rules = await prisma.pricingRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ data: rules });
  } catch (error) {
    next(error);
  }
});

pricingRouter.post("/rules", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const payload = pricingRuleInputSchema.parse(req.body);
    const created = await prisma.pricingRule.create({
      data: {
        tenantId,
        name: payload.name,
        scope: payload.scope,
        criteria: payload.criteria ?? null,
        formula: payload.formula,
        active: payload.active ?? true,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      },
    });

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
});

pricingRouter.put("/rules/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const ruleId = req.params.id;
    const existing = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
    if (!existing || existing.tenantId !== tenantId) return res.status(404).json({ error: "Rule not found" });

    const payload = pricingRuleInputSchema.parse(req.body);
    const updated = await prisma.pricingRule.update({
      where: { id: ruleId },
      data: {
        name: payload.name,
        scope: payload.scope,
        criteria: payload.criteria ?? null,
        formula: payload.formula,
        active: payload.active ?? existing.active,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

pricingRouter.delete("/rules/:id", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const ruleId = req.params.id;
    const existing = await prisma.pricingRule.findUnique({ where: { id: ruleId } });
    if (!existing || existing.tenantId !== tenantId) return res.status(404).json({ error: "Rule not found" });

    await prisma.pricingRule.delete({ where: { id: ruleId } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
