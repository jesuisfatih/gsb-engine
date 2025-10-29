import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type TemplateSummary = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  createdBy: "super" | "merchant";
  merchantId?: string;
  createdAt: number;
  previewUrl?: string;
  target?: {
    productSlug: string;
    surfaceId: string;
  };
};

type TemplateListResponse = {
  data: {
    items: TemplateSummary[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

export const useMerchantTemplatesStore = defineStore("merchant-templates", {
  state: () => ({
    items: [] as TemplateSummary[],
    loading: false,
    error: null as string | null,
    total: 0,
  }),

  getters: {
    tagCounts(state) {
      const counts = new Map<string, number>();
      state.items.forEach(template => {
        template.tags?.forEach(tag => {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        });
      });
      return counts;
    },
  },

  actions: {
    async fetchTemplates() {
      this.loading = true;
      this.error = null;
      try {
        const response = await $api<TemplateListResponse>("/templates");
        this.items = response.data?.items ?? [];
        this.total = response.data?.total ?? 0;
        return this.items;
      } catch (error: any) {
        console.warn("[merchant-templates] fetchTemplates failed", error);
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to load templates";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createTemplate(payload: {
      title: string;
      description?: string;
      tags?: string[];
      items: any[];
      target: { productSlug: string; surfaceId: string };
      defaultPrintTech?: string;
      thumbDataUrl?: string;
    }) {
      const response = await $api<{ data: TemplateSummary }>("/templates", {
        method: "POST",
        body: payload,
      });
      
      if (response.data) {
        this.items.unshift(response.data);
      }
      
      return response.data;
    },

    async duplicateTemplate(templateId: string) {
      const response = await $api<{ data: TemplateSummary }>(`/templates/${templateId}/duplicate`, {
        method: "POST",
      });
      
      if (response.data) {
        this.items.unshift(response.data);
      }
      
      return response.data;
    },

    async deleteTemplate(templateId: string) {
      await $api(`/templates/${templateId}`, {
        method: "DELETE",
      });
      
      // Remove from local state
      const index = this.items.findIndex(t => t.id === templateId);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    },

    async exportToJSON(templateId: string) {
      // Fetch full template details
      const response = await $api<{ data: any }>(`/templates/${templateId}`);
      
      // Create JSON blob and download
      const json = JSON.stringify(response.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `template-${templateId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    async importFromJSON(jsonData: any) {
      // Extract template data
      const payload = {
        title: jsonData.title || "Imported Template",
        description: jsonData.description,
        tags: jsonData.tags || [],
        items: jsonData.items || [],
        target: jsonData.target || { productSlug: "tshirt", surfaceId: "tshirt-front" },
        defaultPrintTech: jsonData.defaultPrintTech,
        thumbDataUrl: jsonData.thumbDataUrl,
      };

      return await this.createTemplate(payload);
    },
  },
});
