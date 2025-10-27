import { defineStore } from "pinia";
import { createPricingRule, fetchPricingRules, type PricingRuleRecord, updatePricingRule } from "@/modules/editor/services/pricingService";

type TechniqueMarkup = {
  slug: string;
  ruleId: string | null;
  multiplier: number;
  label: string;
};

type State = {
  markups: Record<string, TechniqueMarkup>;
  loading: boolean;
  error: string | null;
  saving: boolean;
};

const DEFAULT_TECHNIQUES: TechniqueMarkup[] = [
  { slug: "dtf", ruleId: null, multiplier: 1, label: "DTF Transfer Markup" },
  { slug: "gangsheet", ruleId: null, multiplier: 1, label: "Gang Sheet Markup" },
];

const isTechniqueRule = (rule: PricingRuleRecord): rule is PricingRuleRecord & { formula: { type: string; techniqueSlug?: string; multiplier?: number } } =>
  typeof rule.formula === "object" &&
  rule.formula !== null &&
  (rule.formula as any).type === "TECHNIQUE_MULTIPLIER" &&
  typeof (rule.formula as any).techniqueSlug === "string";

const toPercentage = (multiplier: number) => Math.round((multiplier - 1) * 100 * 10) / 10;
const fromPercentage = (percent: number) => Math.max(0, 1 + percent / 100);

export const useMerchantPricingStore = defineStore("merchant-pricing", {
  state: (): State => ({
    markups: Object.fromEntries(DEFAULT_TECHNIQUES.map((item) => [item.slug, item])),
    loading: false,
    error: null,
    saving: false,
  }),

  getters: {
    markupList(state): TechniqueMarkup[] {
      return Object.values(state.markups);
    },
    getPercentage: (state) => (slug: string) => {
      const item = state.markups[slug];
      if (!item) return 0;
      return toPercentage(item.multiplier);
    },
  },

  actions: {
    async loadMarkups() {
      try {
        this.loading = true;
        this.error = null;
        const rules = await fetchPricingRules();
        const markups = { ...this.markups };

        for (const rule of rules) {
          if (!isTechniqueRule(rule)) continue;
          const slug = rule.formula.techniqueSlug!;
          const multiplier = typeof rule.formula.multiplier === "number" ? rule.formula.multiplier : 1;

          markups[slug] = {
            slug,
            ruleId: rule.id,
            multiplier,
            label: markups[slug]?.label ?? `${slug.toUpperCase()} Markup`,
          };
        }

        this.markups = markups;
      } catch (error: any) {
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to load pricing rules";
        console.warn("[merchant-pricing] loadMarkups error", error);
      } finally {
        this.loading = false;
      }
    },

    async saveMarkup(slug: string, percent: number) {
      const existing = this.markups[slug] ?? { slug, ruleId: null, multiplier: 1, label: `${slug.toUpperCase()} Markup` };
      const multiplier = fromPercentage(percent);
      try {
        this.saving = true;
        this.error = null;

        if (existing.ruleId) {
          await updatePricingRule(existing.ruleId, {
            name: existing.label,
            scope: "technique",
            criteria: null,
            formula: {
              type: "TECHNIQUE_MULTIPLIER",
              techniqueSlug: slug,
              multiplier,
            },
          });
        } else {
          const created = await createPricingRule({
            name: existing.label,
            scope: "technique",
            criteria: null,
            formula: {
              type: "TECHNIQUE_MULTIPLIER",
              techniqueSlug: slug,
              multiplier,
            },
          });
          existing.ruleId = created.id;
        }

        existing.multiplier = multiplier;
        this.markups = {
          ...this.markups,
          [slug]: existing,
        };
      } catch (error: any) {
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to save pricing markup";
        console.warn("[merchant-pricing] saveMarkup error", error);
        throw error;
      } finally {
        this.saving = false;
      }
    },
  },
});
