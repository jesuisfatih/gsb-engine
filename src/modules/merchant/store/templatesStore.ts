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
  data: TemplateSummary[];
};

export const useMerchantTemplatesStore = defineStore("merchant-templates", {
  state: () => ({
    items: [] as TemplateSummary[],
    loading: false,
    error: null as string | null,
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
        this.items = response.data ?? [];
        return this.items;
      } catch (error: any) {
        console.warn("[merchant-templates] fetchTemplates failed", error);
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to load templates";
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
