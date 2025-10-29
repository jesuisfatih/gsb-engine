import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type DesignSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderNumber: string | null;
  customer: string | null;
  surface: string | null;
  product: string | null;
  previewUrl: string | null;
  dimensions: {
    widthMm: number;
    heightMm: number;
  } | null;
};

type Pagination = {
  limit: number;
  offset: number;
  hasMore: boolean;
};

type DesignListResponse = {
  data: {
    items: DesignSummary[];
    total: number;
    pagination: Pagination;
  };
};

export interface DesignFilters {
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
  productId?: string;
  surfaceId?: string;
  orderId?: string;
  fromDate?: string; // ISO date string
  toDate?: string;   // ISO date string
  sortBy?: "createdAt" | "updatedAt" | "name";
  sortOrder?: "asc" | "desc";
}

export const useMerchantDesignsStore = defineStore("merchant-designs", {
  state: () => ({
    items: [] as DesignSummary[],
    total: 0,
    pagination: null as Pagination | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchDesigns(filters: DesignFilters = {}) {
      this.loading = true;
      this.error = null;
      try {
        // Build query params
        const query: Record<string, string> = {};
        if (filters.status) query.status = filters.status;
        if (filters.limit !== undefined) query.limit = String(filters.limit);
        if (filters.offset !== undefined) query.offset = String(filters.offset);
        if (filters.search) query.search = filters.search;
        if (filters.productId) query.productId = filters.productId;
        if (filters.surfaceId) query.surfaceId = filters.surfaceId;
        if (filters.orderId) query.orderId = filters.orderId;
        if (filters.fromDate) query.fromDate = filters.fromDate;
        if (filters.toDate) query.toDate = filters.toDate;
        if (filters.sortBy) query.sortBy = filters.sortBy;
        if (filters.sortOrder) query.sortOrder = filters.sortOrder;

        const response = await $api<DesignListResponse>("/designs", {
          query,
        });

        const payload = response.data ?? { items: [], total: 0, pagination: { limit: 50, offset: 0, hasMore: false } };
        this.items = payload.items ?? [];
        this.total = payload.total ?? this.items.length;
        this.pagination = payload.pagination ?? null;
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
