import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type DesignSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  orderNumber: string | null;
  customer: string | null;
  surface: string | null;
  previewUrl: string | null;
};

type DesignListResponse = {
  data: {
    items: DesignSummary[];
    total: number;
  };
};

export const useMerchantDesignsStore = defineStore("merchant-designs", {
  state: () => ({
    items: [] as DesignSummary[],
    total: 0,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchDesigns(options: { status?: string; limit?: number } = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $api<DesignListResponse>("/designs", {
          query: {
            status: options.status ?? undefined,
            limit: options.limit ? String(options.limit) : undefined,
          },
        });

        const payload = response.data ?? { items: [], total: 0 };
        this.items = payload.items ?? [];
        this.total = payload.total ?? this.items.length;
        return this.items;
      } catch (error: any) {
        console.warn("[merchant-designs] fetchDesigns failed", error);
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to load designs";
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
