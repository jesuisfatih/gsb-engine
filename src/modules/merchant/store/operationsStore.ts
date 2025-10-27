import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type JobStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface JobSummary {
  id: string;
  status: JobStatus;
  priority: number | null;
  supplierId: string | null;
  assignedUserId: string | null;
  design?: {
    id: string;
    previewUrl?: string | null;
    submittedAt?: string | null;
    outputs?: Array<{
      id: string;
      kind: string;
      url: string;
      metadata?: Record<string, unknown> | null;
    }>;
  } | null;
  printTechnique?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  supplier?: {
    id: string;
    name: string;
    slug: string;
    leadTimeDays?: number | null;
  } | null;
  assignedUser?: {
    id: string;
    email: string;
    displayName?: string | null;
  } | null;
  createdAt?: string;
}

export interface NotificationEntry {
  id: string;
  kind: string;
  payload?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface SupplierRoutingRuleSummary {
  id: string;
  supplierId: string;
  technique: string;
  region?: string | null;
  minQty?: number | null;
  maxQty?: number | null;
  supplier?: {
    id: string;
    name: string;
    slug: string;
    leadTimeDays?: number | null;
    regions?: Record<string, unknown> | null;
  } | null;
}

export interface SaveRoutingRulePayload {
  id?: string;
  supplierId: string;
  technique: string;
  region?: string | null;
  minQty?: number | null;
  maxQty?: number | null;
}

export interface AuditLogEntry {
  id: string;
  event: string;
  entity: string;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    displayName?: string | null;
  } | null;
}

export const useMerchantOperationsStore = defineStore("merchant-operations", {
  state: () => ({
    jobs: [] as JobSummary[],
    notifications: [] as NotificationEntry[],
    routingRules: [] as SupplierRoutingRuleSummary[],
    auditLogs: [] as AuditLogEntry[],
    loading: {
      jobs: false,
      notifications: false,
      routing: false,
      audit: false,
    },
  }),

  actions: {
    async fetchJobs(params: { status?: JobStatus; technique?: string } = {}) {
      this.loading.jobs = true;
      try {
        const response = await $api<{ data: JobSummary[] }>("/jobs", {
          query: {
            status: params.status,
            technique: params.technique,
          },
        });
        this.jobs = response.data;
      } finally {
        this.loading.jobs = false;
      }
    },

    async updateJob(id: string, payload: Partial<Pick<JobSummary, "status" | "priority" | "assignedUserId" | "supplierId">>) {
      const response = await $api<{ data: JobSummary }>(`/jobs/${id}`, {
        method: "PATCH",
        body: {
          status: payload.status,
          priority: payload.priority ?? undefined,
          assignedUserId: payload.assignedUserId ?? undefined,
          supplierId: payload.supplierId ?? undefined,
        },
      });

      this.jobs = this.jobs.map(job => (job.id === id ? response.data : job));
      return response.data;
    },

    async requestJobLabel(id: string) {
      const response = await $api<{ data: { url: string } }>(`/jobs/${id}/labels`, {
        method: "POST",
      });
      return response.data.url;
    },

    async deleteJob(id: string) {
      await $api(`/jobs/${id}`, { method: "DELETE" });
      this.jobs = this.jobs.filter(job => job.id !== id);
    },

    async fetchNotifications(options: { unreadOnly?: boolean } = {}) {
      this.loading.notifications = true;
      try {
        const response = await $api<{ data: NotificationEntry[] }>("/notifications", {
          query: {
            unread: options.unreadOnly ?? false,
          },
        });
        this.notifications = response.data;
      } finally {
        this.loading.notifications = false;
      }
    },

    async markNotificationRead(id: string) {
      const response = await $api<{ data: NotificationEntry }>(`/notifications/${id}/read`, {
        method: "POST",
      });
      this.notifications = this.notifications.map(entry => (entry.id === id ? response.data : entry));
      return response.data;
    },

    async fetchRoutingRules(filters: { technique?: string; region?: string } = {}) {
      this.loading.routing = true;
      try {
        const response = await $api<{ data: SupplierRoutingRuleSummary[] }>("/suppliers/routing", {
          query: {
            technique: filters.technique,
            region: filters.region,
          },
        });
        this.routingRules = response.data;
      } finally {
        this.loading.routing = false;
      }
    },

    async saveRoutingRule(payload: SaveRoutingRulePayload) {
      const response = await $api<{ data: SupplierRoutingRuleSummary }>("/suppliers/routing", {
        method: "POST",
        body: payload,
      });

      const existingIndex = this.routingRules.findIndex(rule => rule.id === response.data.id);
      if (existingIndex >= 0) {
        this.routingRules.splice(existingIndex, 1, response.data);
      } else {
        this.routingRules.push(response.data);
      }
      return response.data;
    },

    async deleteRoutingRule(id: string) {
      await $api(`/suppliers/routing/${id}`, { method: "DELETE" });
      this.routingRules = this.routingRules.filter(rule => rule.id !== id);
    },

    async fetchAuditLogs(filters: { entity?: string; entityId?: string; event?: string } = {}) {
      this.loading.audit = true;
      try {
        const response = await $api<{ data: AuditLogEntry[] }>("/audit", {
          query: {
            entity: filters.entity,
            entityId: filters.entityId,
            event: filters.event,
          },
        });
        this.auditLogs = response.data;
      } finally {
        this.loading.audit = false;
      }
    },

    async updateGangSheetStatus(id: string, payload: { status: string; supplierId?: string | null; notes?: string | null }) {
      const response = await $api<{ data: unknown }>(`/gang-sheets/${id}/status`, {
        method: "POST",
        body: payload,
      });
      return response.data;
    },
  },
});
