import { $api } from "@/utils/api";

export type PricingComponentType = "base" | "area" | "sheet" | "surcharge" | "discount" | "rule";

export interface PricingComponent {
  label: string;
  amount: number;
  type: PricingComponentType;
}

export interface AppliedPricingRule {
  ruleId: string;
  name: string;
  amount: number;
  description: string;
}

export interface PricingQuote {
  currency: string;
  total: number;
  unitPrice: number;
  components: PricingComponent[];
  metrics: Record<string, number>;
  appliedRules: AppliedPricingRule[];
}

export interface TechniqueConfigResponse<TConfig = unknown> {
  id: string;
  name: string;
  slug: string;
  tenantId: string | null;
  isDefault: boolean;
  description?: string | null;
  config: TConfig | null;
}

export interface PricingRuleRecord {
  id: string;
  tenantId: string;
  name: string;
  scope: string;
  criteria: Record<string, unknown> | null;
  formula: Record<string, unknown>;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PricingQuoteRequest {
  productId: string;
  surfaceId: string;
  printTechniqueId: string;
  areaSquareCm: number;
  quantity: number;
  colors?: number;
  coverageRatio?: number;
  sheetCoverageRatio?: number;
  whiteUnderbase?: boolean;
  rush?: boolean;
}

export async function fetchPricingConfigs() {
  const response = await $api<{ data: TechniqueConfigResponse[] }>("/pricing/configs");
  return response.data;
}

export interface UpdateTechniquePayload {
  name?: string;
  description?: string | null;
  config: Record<string, unknown>;
}

export async function updatePricingConfig(id: string, payload: UpdateTechniquePayload) {
  const response = await $api<{ data: TechniqueConfigResponse }>(`/pricing/configs/${id}`, {
    method: "PUT",
    body: payload,
  });
  return response.data;
}

export async function fetchPricingRules() {
  const response = await $api<{ data: PricingRuleRecord[] }>("/pricing/rules");
  return response.data;
}

export interface PricingRulePayload {
  name: string;
  scope: string;
  criteria?: Record<string, unknown> | null;
  formula: Record<string, unknown>;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export async function createPricingRule(payload: PricingRulePayload) {
  const response = await $api<{ data: PricingRuleRecord }>("/pricing/rules", {
    method: "POST",
    body: payload,
  });
  return response.data;
}

export async function updatePricingRule(id: string, payload: PricingRulePayload) {
  const response = await $api<{ data: PricingRuleRecord }>(`/pricing/rules/${id}`, {
    method: "PUT",
    body: payload,
  });
  return response.data;
}

export async function deletePricingRule(id: string) {
  await $api(`/pricing/rules/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPricingQuote(payload: PricingQuoteRequest) {
  const response = await $api<{ data: PricingQuote }>("/pricing/quote", {
    method: "POST",
    body: payload,
  });
  return response.data;
}
