import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const currencySchema = z.string().min(3).max(3);

export const dtfConfigSchema = z.object({
  kind: z.literal("DTF"),
  currency: currencySchema.default("USD"),
  baseSetup: z.number().min(0).default(0),
  squareCmRate: z.number().min(0.0001),
  minCharge: z.number().min(0).default(0),
  whiteUnderbaseMarkup: z.number().min(0).max(5).optional(), // percentage multiplier (e.g. 0.12)
  coverageAdjustments: z
    .array(
      z.object({
        maxCoverage: z.number().min(0).max(1),
        multiplier: z.number().min(0.1).max(5),
      }),
    )
    .optional(),
  quantityBreaks: z
    .array(
      z.object({
        minQty: z.number().int().positive(),
        multiplier: z.number().min(0.1).max(5),
      }),
    )
    .optional(),
});

export const gangSheetConfigSchema = z.object({
  kind: z.literal("GANG_SHEET"),
  currency: currencySchema.default("USD"),
  sheetWidthCm: z.number().positive(),
  sheetHeightCm: z.number().positive(),
  sheetCost: z.number().positive(),
  minCoverage: z.number().min(0).max(1).optional(),
  lowCoverageSurcharge: z.number().min(0).optional(),
  wasteMultiplier: z.number().min(0.5).max(5).optional(),
  quantityBreaks: z
    .array(
      z.object({
        minSheets: z.number().int().positive(),
        sheetCost: z.number().positive(),
      }),
    )
    .optional(),
});

type DtfConfig = z.infer<typeof dtfConfigSchema>;
type GangSheetConfig = z.infer<typeof gangSheetConfigSchema>;

export const techniqueConfigSchema = z.discriminatedUnion("kind", [dtfConfigSchema, gangSheetConfigSchema]);
export type TechniqueConfig = z.infer<typeof techniqueConfigSchema>;

export const pricingRuleFormulaSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PERCENTAGE"),
    value: z.number(), // percentage multiplier applied to subtotal
    appliesTo: z.enum(["total", "area"]).default("total"),
  }),
  z.object({
    type: z.literal("FLAT_FEE"),
    value: z.number(),
  }),
  z.object({
    type: z.literal("TECHNIQUE_MULTIPLIER"),
    techniqueSlug: z.string(),
    multiplier: z.number(),
  }),
]);
export type PricingRuleFormula = z.infer<typeof pricingRuleFormulaSchema>;

type PricingRuleWithFormula = {
  id: string;
  name: string;
  scope: string;
  criteria: Record<string, unknown> | null;
  formula: PricingRuleFormula;
};

export type PricingEngineInput = {
  productId: string;
  surfaceId: string;
  printTechniqueId: string;
  areaSquareCm: number;
  quantity: number;
  colors?: number | null;
  coverageRatio?: number | null;
  sheetCoverageRatio?: number | null;
  whiteUnderbase?: boolean | null;
  rush?: boolean | null;
};

export type PricingComponent = {
  label: string;
  amount: number;
  type: "base" | "area" | "sheet" | "surcharge" | "discount" | "rule";
};

export type PricingQuote = {
  currency: string;
  total: number;
  unitPrice: number;
  components: PricingComponent[];
  metrics: Record<string, number>;
  appliedRules: Array<{
    ruleId: string;
    name: string;
    amount: number;
    description: string;
  }>;
};

const DEFAULT_CURRENCY = "USD";

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const sortQuantityBreaks = <T extends { minQty?: number; multiplier?: number; minSheets?: number }>(
  breaks: T[] | undefined,
  key: "minQty" | "minSheets",
) => {
  if (!breaks) return [];
  return [...breaks].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
};

const applyQuantityMultiplier = (quantity: number, breaks: NonNullable<DtfConfig["quantityBreaks"]>) => {
  const sorted = sortQuantityBreaks(breaks, "minQty");
  const matched = sorted.find((entry) => quantity >= entry.minQty);
  return matched?.multiplier ?? 1;
};

const pickSheetCost = (sheets: number, breaks: NonNullable<GangSheetConfig["quantityBreaks"]>, defaultCost: number) => {
  const sorted = sortQuantityBreaks(breaks, "minSheets");
  const matched = sorted.find((entry) => sheets >= entry.minSheets);
  return matched?.sheetCost ?? defaultCost;
};

export const parseTechniqueConfig = (rules: unknown): TechniqueConfig => {
  const parsed = techniqueConfigSchema.safeParse(rules);
  if (!parsed.success) {
    throw new Error(`Invalid print technique configuration: ${parsed.error.message}`);
  }
  return parsed.data;
};

const parsePricingRules = (rules: Array<{ id: string; name: string; scope: string; criteria: unknown; formula: unknown }>) =>
  rules
    .map((rule) => {
      const formulaResult = pricingRuleFormulaSchema.safeParse(rule.formula);
      if (!formulaResult.success) return null;
      const criteria = (rule.criteria as Record<string, unknown> | null) ?? null;
      return {
        id: rule.id,
        name: rule.name,
        scope: rule.scope,
        criteria,
        formula: formulaResult.data,
      } as PricingRuleWithFormula;
    })
    .filter((entry): entry is PricingRuleWithFormula => Boolean(entry));

export async function calculatePricingQuote(
  prisma: PrismaClient,
  tenantId: string | null,
  input: PricingEngineInput,
): Promise<PricingQuote> {
  const [product, surface, technique, tenantPricingRules] = await Promise.all([
    prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, slug: true, tenantId: true, currency: true },
    }),
    prisma.surface.findUnique({ where: { id: input.surfaceId } }),
    prisma.printTechnique.findUnique({ where: { id: input.printTechniqueId } }),
    tenantId
      ? prisma.pricingRule.findMany({
          where: { tenantId, active: true },
          select: { id: true, name: true, scope: true, criteria: true, formula: true },
        })
      : [],
  ]);

  if (!product) throw new Error("Product not found");
  if (!surface) throw new Error("Surface not found");
  if (!technique) throw new Error("Print technique not found");
  const config = parseTechniqueConfig(technique.rules ?? {});
  const currency = config.currency ?? product.currency ?? DEFAULT_CURRENCY;

  const components: PricingComponent[] = [];
  const appliedRules: PricingQuote["appliedRules"] = [];

  const quantity = input.quantity;
  const colors = input.colors ?? null;

  const surfaceAreaSqCm = (surface.widthMm / 10) * (surface.heightMm / 10);
  const coverageRatio =
    input.coverageRatio ?? (surfaceAreaSqCm > 0 ? Math.min(1, input.areaSquareCm / surfaceAreaSqCm) : undefined) ?? 1;

  let subtotal = 0;
  const metrics: Record<string, number> = {
    quantity,
    areaSquareCm: input.areaSquareCm,
    coverageRatio,
  };

  if (config.kind === "DTF") {
    const totalArea = input.areaSquareCm * quantity;
    const baseSetup = config.baseSetup;
    const areaCost = config.squareCmRate * totalArea;
    subtotal = baseSetup + areaCost;
    components.push({ label: "Setup", amount: baseSetup, type: "base" });
    components.push({ label: "Area cost", amount: areaCost, type: "area" });

    if (config.coverageAdjustments && config.coverageAdjustments.length) {
      const matched = config.coverageAdjustments.find((entry) => coverageRatio <= entry.maxCoverage);
      if (matched && matched.multiplier !== 1) {
        const before = subtotal;
        subtotal *= matched.multiplier;
        components.push({
          label: `Coverage adjustment (${Math.round(matched.maxCoverage! * 100)}%)`,
          amount: subtotal - before,
          type: matched.multiplier >= 1 ? "surcharge" : "discount",
        });
      }
    }

    if (input.whiteUnderbase && config.whiteUnderbaseMarkup) {
      const addition = subtotal * config.whiteUnderbaseMarkup;
      subtotal += addition;
      components.push({
        label: "White underbase markup",
        amount: addition,
        type: "surcharge",
      });
    }

    if (config.quantityBreaks?.length) {
      const multiplier = applyQuantityMultiplier(quantity, config.quantityBreaks);
      if (multiplier !== 1) {
        const before = subtotal;
        subtotal *= multiplier;
        components.push({
          label: "Quantity break",
          amount: subtotal - before,
          type: multiplier < 1 ? "discount" : "surcharge",
        });
      }
    }

    if (config.minCharge && subtotal < config.minCharge) {
      const bump = config.minCharge - subtotal;
      subtotal = config.minCharge;
      components.push({
        label: "Minimum charge adjustment",
        amount: bump,
        type: "surcharge",
      });
    }

    metrics.totalAreaSquareCm = totalArea;
  } else if (config.kind === "GANG_SHEET") {
    const sheetArea = config.sheetWidthCm * config.sheetHeightCm;
    const totalArea = input.areaSquareCm * quantity;
    const sheetsRaw = sheetArea > 0 ? totalArea / sheetArea : 0;
    const sheetsNeeded = Math.max(1, Math.ceil(sheetsRaw));
    const coverage = input.sheetCoverageRatio ?? (sheetsNeeded > 0 ? Math.min(1, totalArea / (sheetsNeeded * sheetArea)) : 0);
    metrics.totalAreaSquareCm = totalArea;
    metrics.sheetAreaSquareCm = sheetArea;
    metrics.sheetsNeeded = sheetsNeeded;
    metrics.sheetCoverageRatio = coverage;

    let sheetCost = config.sheetCost;
    if (config.quantityBreaks?.length) {
      sheetCost = pickSheetCost(sheetsNeeded, config.quantityBreaks, config.sheetCost);
    }

    subtotal = sheetsNeeded * sheetCost;
    components.push({
      label: sheetsNeeded > 1 ? `Sheets (${sheetsNeeded} × ${sheetCost.toFixed(2)})` : "Sheet cost",
      amount: subtotal,
      type: "sheet",
    });

    if (config.minCoverage && coverage < config.minCoverage) {
      if (config.lowCoverageSurcharge) {
        subtotal += config.lowCoverageSurcharge;
        components.push({
          label: "Low coverage surcharge",
          amount: config.lowCoverageSurcharge,
          type: "surcharge",
        });
      } else if (config.wasteMultiplier && config.wasteMultiplier !== 1) {
        const before = subtotal;
        subtotal *= config.wasteMultiplier;
        components.push({
          label: "Waste multiplier",
          amount: subtotal - before,
          type: config.wasteMultiplier > 1 ? "surcharge" : "discount",
        });
      }
    }
  } else {
    throw new Error(`Unsupported technique kind: ${(config as TechniqueConfig).kind}`);
  }

  const pricingRules = parsePricingRules(tenantPricingRules);
  for (const rule of pricingRules) {
    if (rule.formula.type === "TECHNIQUE_MULTIPLIER") {
      if (technique.slug !== rule.formula.techniqueSlug) continue;
      const before = subtotal;
      subtotal *= rule.formula.multiplier;
      const delta = subtotal - before;
      appliedRules.push({
        ruleId: rule.id,
        name: rule.name,
        amount: delta,
        description: `Multiplier ${rule.formula.multiplier}`,
      });
      components.push({
        label: `Rule: ${rule.name}`,
        amount: delta,
        type: delta >= 0 ? "surcharge" : "discount",
      });
    } else if (rule.formula.type === "PERCENTAGE") {
      const base =
        rule.formula.appliesTo === "area"
          ? components
              .filter((component) => component.type === "area")
              .reduce((sum, component) => sum + component.amount, 0)
          : subtotal;
      const adjustment = base * rule.formula.value;
      subtotal += adjustment;
      appliedRules.push({
        ruleId: rule.id,
        name: rule.name,
        amount: adjustment,
        description: `${(rule.formula.value * 100).toFixed(1)}% ${rule.formula.appliesTo}`,
      });
      components.push({
        label: `Rule: ${rule.name}`,
        amount: adjustment,
        type: adjustment >= 0 ? "surcharge" : "discount",
      });
    } else if (rule.formula.type === "FLAT_FEE") {
      subtotal += rule.formula.value;
      appliedRules.push({
        ruleId: rule.id,
        name: rule.name,
        amount: rule.formula.value,
        description: "Flat fee",
      });
      components.push({
        label: `Rule: ${rule.name}`,
        amount: rule.formula.value,
        type: rule.formula.value >= 0 ? "surcharge" : "discount",
      });
    }
  }

  const total = roundCurrency(subtotal);
  const unitPrice = roundCurrency(total / quantity);

  return {
    currency,
    total,
    unitPrice,
    components: components.map((component) => ({
      ...component,
      amount: roundCurrency(component.amount),
    })),
    metrics,
    appliedRules,
  };
}
