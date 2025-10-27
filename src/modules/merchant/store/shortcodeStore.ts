import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export interface ShortcodeRecord {
  id: string;
  handle: string;
  productId?: string | null;
  productGid: string;
  productTitle?: string | null;
  productHandle?: string | null;
  surfaceId?: string | null;
  templateId?: string | null;
  technique?: string | null;
  locale?: string | null;
  createdAt: string;
  updatedAt: string;
  usageTotal?: number;
  usageLast7?: number;
  usageLast24?: number;
  embed?: {
    div: string;
    script: string;
  };
}

interface CreatePayload {
  handle: string;
  productId?: string | null;
  productGid: string;
  productTitle?: string;
  productHandle?: string;
  surfaceId?: string | null;
  templateId?: string | null;
  technique?: string | null;
  locale?: string;
}

export const useShortcodeStore = defineStore("merchant-shortcodes", {
  state: () => ({
    items: [] as ShortcodeRecord[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchAll() {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        const response = await $api<{ data: ShortcodeRecord[] }>("/shortcodes");
        this.items = response.data ?? [];
      } catch (error: any) {
        this.error = error?.message ?? "Failed to load shortcodes";
        console.warn("[shortcodes] fetch failed", error);
      } finally {
        this.loading = false;
      }
    },
    async create(payload: CreatePayload) {
      const body: CreatePayload = {
        ...payload,
        handle: payload.handle.toLowerCase(),
      };
      const response = await $api<{ data: ShortcodeRecord }>("/shortcodes", {
        method: "POST",
        body,
      });
      const record = response.data;
      if (record) {
        this.items.unshift(record);
      }
      return record;
    },
    async remove(handle: string) {
      await $api(`/shortcodes/${handle}`, { method: "DELETE" });
      this.items = this.items.filter(item => item.handle !== handle);
    },
  },
});


