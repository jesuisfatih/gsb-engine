import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type OrderStatus =
  | "Created"
  | "Queued"
  | "In production"
  | "On hold"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  customer: {
    name: string | null;
    email: string | null;
  };
  downloadsCompleted: number;
  primaryDesign: {
    id: string;
    name: string;
    status: string;
    previewUrl: string | null;
    dimensions: {
      widthMm: number;
      heightMm: number;
    } | null;
  } | null;
};

export type OrderTimelineEntry = {
  id: string;
  type: string;
  message: string;
  occurredAt: string;
  meta?: Record<string, unknown> | null;
};

export type OrderDesign = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  previewUrl: string | null;
  dimensions: {
    widthMm: number;
    heightMm: number;
  } | null;
  outputs: Array<{
    id: string;
    kind: string;
    url: string;
    createdAt: string;
  }>;
};

export type OrderJob = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  supplier: {
    name: string;
    regions: Record<string, unknown> | null;
    leadTimeDays: number | null;
  } | null;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  customer: {
    name: string | null;
    email: string | null;
  };
  totals: {
    subtotal: number | null;
    taxTotal: number | null;
    shippingTotal: number | null;
    discountsTotal: number | null;
  };
  designs: OrderDesign[];
  jobs: OrderJob[];
  activity: OrderTimelineEntry[];
};

type ListResponse = {
  data: OrderSummary[];
};

type DetailResponse = {
  data: OrderDetail;
};

type ListFilters = {
  status?: string | null;
};

export const useMerchantOrdersStore = defineStore("merchant-orders", {
  state: () => ({
    entries: [] as OrderSummary[],
    selectedId: null as string | null,
    detail: null as OrderDetail | null,
    loadingList: false,
    loadingDetail: false,
    filters: {
      status: null as ListFilters["status"],
    },
    limit: 25,
  }),

  getters: {
    selectedOrder(state) {
      if (!state.selectedId)
        return null;
      return state.entries.find(entry => entry.id === state.selectedId) ?? null;
    },
    hasOrders(state): boolean {
      return state.entries.length > 0;
    },
  },

  actions: {
    setStatusFilter(status: string | null) {
      this.filters.status = status;
    },

    async fetchOrders() {
      this.loadingList = true;
      try {
        const response = await $api<ListResponse>("/orders", {
          query: {
            limit: this.limit,
            status: this.filters.status ?? undefined,
          },
        });

        this.entries = response.data ?? [];

        if (this.entries.length > 0 && !this.selectedId) {
          this.selectedId = this.entries[0].id;
        } else if (this.selectedId && !this.entries.some(entry => entry.id === this.selectedId)) {
          this.selectedId = this.entries[0]?.id ?? null;
        }
      } finally {
        this.loadingList = false;
      }
    },

    async refreshOrders() {
      await this.fetchOrders();
      if (this.selectedId)
        await this.fetchOrderDetail(this.selectedId);
    },

    selectOrder(id: string | null) {
      this.selectedId = id;
    },

    async fetchOrderDetail(id: string) {
      this.loadingDetail = true;
      this.selectedId = id;
      try {
        const response = await $api<DetailResponse>(`/orders/${id}`);
        this.detail = response.data;
      } finally {
        this.loadingDetail = false;
      }
    },

    async bulkDownloadDesigns(orderIds: string[]) {
      // Request bulk download ZIP from backend
      const response = await $api<{ data: { url: string } }>("/orders/bulk-download", {
        method: "POST",
        body: { orderIds },
      });

      if (response.data?.url) {
        // Trigger browser download
        const link = document.createElement("a");
        link.href = response.data.url;
        link.download = `orders-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return response.data;
    },

    async markAsShipped(orderIds: string[]) {
      await $api("/orders/bulk-ship", {
        method: "POST",
        body: { orderIds },
      });

      // Refresh orders list
      await this.fetchOrders();
    },

    async togglePriority(orderId: string, priority: boolean) {
      await $api(`/orders/${orderId}/priority`, {
        method: "PATCH",
        body: { priority },
      });

      // Update local state
      const order = this.entries.find(e => e.id === orderId);
      if (order) {
        // Assuming we add a priority field to OrderSummary
        (order as any).priority = priority;
      }
    },

    async requestRefund(orderId: string, reason: string) {
      await $api(`/orders/${orderId}/refund`, {
        method: "POST",
        body: { reason },
      });

      // Refresh orders
      await this.refreshOrders();
    },
  },
});
