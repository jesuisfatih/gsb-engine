import { Router } from "express";
import { z } from "zod";
import { getBillingSummary, getTenantBillingConfig, listTenantCharges, upsertTenantBillingConfig } from "../services/billingService";

const updateConfigSchema = z.object({
  currency: z.string().min(3).max(3),
  perOrderFee: z.number().min(0).nullable(),
  freeOrderAllowance: z.number().int().min(0).default(0),
  notes: z.string().max(512).nullable().optional(),
});

const listChargesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(250).default(50),
});

export const billingRouter = Router();

billingRouter.get("/summary", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const summary = await getBillingSummary(prisma, tenantId, monthStart);

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

billingRouter.get("/config", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const config = await getTenantBillingConfig(prisma, tenantId);
    res.json({ data: config });
  } catch (error) {
    next(error);
  }
});

billingRouter.put("/config", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const memberships = req.context.memberships ?? [];
    const isSuperAdmin = memberships.some(m => m.tenantId === tenantId && m.role === "SUPER_ADMIN");
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "Only platform administrators can update billing configuration" });
    }

    const payload = updateConfigSchema.parse(req.body);
    const updated = await upsertTenantBillingConfig(prisma, tenantId, payload);

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

billingRouter.get("/charges", async (req, res, next) => {
  try {
    const { prisma, tenantId } = req.context;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });

    const { limit } = listChargesSchema.parse(req.query);
    const charges = await listTenantCharges(prisma, tenantId, { limit });

    res.json({ data: charges });
  } catch (error) {
    next(error);
  }
});
