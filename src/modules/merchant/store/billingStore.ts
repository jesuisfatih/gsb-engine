import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type BillingSummary = {
  currency: string;
  perOrderFee: number | null;
  freeOrderAllowance: number;
  monthToDateOrders: number;
  monthToDateCharges: number;
  pendingCharges: number;
  invoicedCharges: number;
  paidCharges: number;
};

export type BillingConfig = {
  tenantId: string;
  currency: string;
  perOrderFee: string | null;
  freeOrderAllowance: number;
  notes: string | null;
};

export type BillingCharge = {
  id: string;
  tenantId: string;
  orderId: string | null;
  type: string;
  description: string | null;
  currency: string;
  quantity: number;
  unitAmount: string;
  totalAmount: string;
  status: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  invoicedAt: string | null;
  settledAt: string | null;
  createdAt: string;
};

type State = {
  summary: BillingSummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  config: BillingConfig | null;
  configLoading: boolean;
  charges: BillingCharge[];
  chargesLoading: boolean;
  chargesError: string | null;
};

export const useMerchantBillingStore = defineStore("merchant-billing", {
  state: (): State => ({
    summary: null,
    summaryLoading: false,
    summaryError: null,
    config: null,
    configLoading: false,
    charges: [],
    chargesLoading: false,
    chargesError: null,
  }),

  actions: {
    async fetchSummary() {
      try {
        this.summaryLoading = true;
        this.summaryError = null;
        const response = await $api<{ data: BillingSummary }>("/billing/summary");
        this.summary = response.data;
      } catch (error: any) {
        this.summaryError = error?.response?._data?.error ?? error?.message ?? "Unable to load billing summary";
        console.warn("[billing] summary error", error);
      } finally {
        this.summaryLoading = false;
      }
    },

    async fetchConfig() {
      try {
        this.configLoading = true;
        const response = await $api<{ data: BillingConfig | null }>("/billing/config");
        this.config = response.data;
      } catch (error: any) {
        console.warn("[billing] config error", error);
      } finally {
        this.configLoading = false;
      }
    },

    async fetchCharges(limit = 50) {
      try {
        this.chargesLoading = true;
        this.chargesError = null;
        const response = await $api<{ data: BillingCharge[] }>("/billing/charges", {
          query: { limit: String(limit) },
        });
        this.charges = response.data;
      } catch (error: any) {
        this.chargesError = error?.response?._data?.error ?? error?.message ?? "Unable to load billing charges";
        console.warn("[billing] charges error", error);
      } finally {
        this.chargesLoading = false;
      }
    },
  },
});
