import { defineStore } from "pinia";
import type { TemplateDefinition, ProductSlug } from "../types";
import { sampleTemplates } from "../utils/ensureSamples";
import {
  listTemplates,
  createTemplate as apiCreateTemplate,
  updateTemplate as apiUpdateTemplate,
  deleteTemplate as apiDeleteTemplate,
  type TemplateInput,
} from "../services/templatesService";

const SUPER_KEY = "gsb:superTemplates";
const MERCH_KEY = "gsb:merchantTemplates";
const MERCH_ID_KEY = "gsb:merchantId";

const sortByCreatedAt = (a: TemplateDefinition, b: TemplateDefinition) => b.createdAt - a.createdAt;

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeById(list: TemplateDefinition[], id: string) {
  return list.filter(template => template.id !== id);
}

function upsert(list: TemplateDefinition[], template: TemplateDefinition) {
  const next = list.filter(item => item.id !== template.id);
  next.push(template);
  next.sort(sortByCreatedAt);
  return next;
}

export const useTemplatesStore = defineStore("templates", {
  state: () => ({
    superTemplates: load<TemplateDefinition[]>(SUPER_KEY, []),
    merchantTemplates: load<Record<string, TemplateDefinition[]>>(MERCH_KEY, {}),
    merchantId: localStorage.getItem(MERCH_ID_KEY) || "demo-merchant",
    loading: false,
    loaded: false,
    error: null as string | null,
    lastSyncedAt: 0,
  }),
  getters: {
    myTemplates(state): TemplateDefinition[] {
      const list = state.merchantTemplates[state.merchantId] ?? [];
      return [...list].sort(sortByCreatedAt);
    },
    allForProduct: state => (slug: ProductSlug): TemplateDefinition[] => {
      const superMatches = state.superTemplates.filter(t => t.target.productSlug === slug);
      const merchantMatches = (state.merchantTemplates[state.merchantId] ?? []).filter(
        t => t.target.productSlug === slug,
      );
      return [...superMatches, ...merchantMatches].sort(sortByCreatedAt);
    },
    byId: state => (id: string): TemplateDefinition | undefined => {
      const merchantTemplate = (state.merchantTemplates[state.merchantId] ?? []).find(t => t.id === id);
      if (merchantTemplate) return merchantTemplate;
      return state.superTemplates.find(t => t.id === id);
    },
  },
  actions: {
    persistCaches() {
      save(SUPER_KEY, this.superTemplates);
      save(MERCH_KEY, this.merchantTemplates);
    },
    setMerchant(id: string) {
      this.merchantId = id || "demo-merchant";
      localStorage.setItem(MERCH_ID_KEY, this.merchantId);
    },
    seedIfEmpty(samples: TemplateDefinition[] = sampleTemplates()) {
      if (this.superTemplates.length === 0) {
        this.superTemplates = samples.filter(sample => sample.createdBy === "super");
      }
      if (!this.merchantTemplates[this.merchantId] || this.merchantTemplates[this.merchantId]!.length === 0) {
        this.merchantTemplates[this.merchantId] = samples.filter(sample => sample.createdBy === "merchant");
      }
      this.persistCaches();
    },
    applyRemoteCollection(templates: TemplateDefinition[]) {
      const superAccumulator: TemplateDefinition[] = [];
      const merchantAccumulator: Record<string, TemplateDefinition[]> = {};

      for (const template of templates) {
        if (template.createdBy === "super") {
          superAccumulator.push(template);
          continue;
        }
        const key = template.merchantId ?? this.merchantId;
        if (!merchantAccumulator[key]) merchantAccumulator[key] = [];
        merchantAccumulator[key]!.push(template);
      }

      superAccumulator.sort(sortByCreatedAt);
      for (const key of Object.keys(merchantAccumulator)) {
        merchantAccumulator[key]!.sort(sortByCreatedAt);
      }

      this.superTemplates = superAccumulator;
      this.merchantTemplates = merchantAccumulator;
      this.persistCaches();
    },
    async ensureLoaded(force = false) {
      if (this.loaded && !force) return;
      await this.fetchRemoteTemplates(force);
    },
    async fetchRemoteTemplates(force = false) {
      if (this.loading && !force) return;
      this.loading = true;
      this.error = null;
      try {
        const templates = await listTemplates();
        this.applyRemoteCollection(templates);
        this.loaded = true;
        this.lastSyncedAt = Date.now();
      } catch (error) {
        console.warn("[templates] remote fetch failed", error);
        this.error = error instanceof Error ? error.message : "Failed to load templates";
      } finally {
        this.loading = false;
      }
    },
    upsertLocal(template: TemplateDefinition) {
      if (template.createdBy === "super") {
        this.superTemplates = upsert(this.superTemplates, template);
      } else {
        const key = template.merchantId ?? this.merchantId;
        const current = this.merchantTemplates[key] ?? [];
        this.merchantTemplates = {
          ...this.merchantTemplates,
          [key]: upsert(current, template),
        };
      }
      this.persistCaches();
    },
    removeLocal(id: string) {
      const merchantKey = this.merchantId;
      const merchantList = this.merchantTemplates[merchantKey] ?? [];
      const merchantHas = merchantList.some(template => template.id === id);
      if (merchantHas) {
        this.merchantTemplates = {
          ...this.merchantTemplates,
          [merchantKey]: removeById(merchantList, id),
        };
        this.persistCaches();
        return;
      }
      const superHas = this.superTemplates.some(template => template.id === id);
      if (superHas) {
        this.superTemplates = removeById(this.superTemplates, id);
        this.persistCaches();
      }
    },
    async addSuperTemplate(draft: Omit<TemplateDefinition, "id" | "createdAt" | "createdBy">) {
      const now = Date.now();
      const local: TemplateDefinition = {
        ...draft,
        id: `tmp-${uid()}`,
        createdAt: now,
        createdBy: "super",
      };
      this.upsertLocal(local);
      try {
        const created = await apiCreateTemplate({ ...draft, createdAt: now, createdBy: "super" } as TemplateInput);
        if (created.id !== local.id) this.removeLocal(local.id);
        this.upsertLocal(created);
        return created;
      } catch (error) {
        console.warn("[templates] failed to persist super template", error);
        this.error = error instanceof Error ? error.message : "Template save failed";
        return local;
      }
    },
    async addMerchantTemplate(draft: Omit<TemplateDefinition, "id" | "createdAt" | "createdBy" | "merchantId">) {
      const now = Date.now();
      const local: TemplateDefinition = {
        ...draft,
        id: `tmp-${uid()}`,
        createdAt: now,
        createdBy: "merchant",
        merchantId: this.merchantId,
      };
      this.upsertLocal(local);
      try {
        const created = await apiCreateTemplate({
          ...draft,
          merchantId: this.merchantId,
          createdAt: now,
          createdBy: "merchant",
        } as TemplateInput);
        if (created.id !== local.id) this.removeLocal(local.id);
        this.upsertLocal(created);
        return created;
      } catch (error) {
        console.warn("[templates] failed to persist merchant template", error);
        this.error = error instanceof Error ? error.message : "Template save failed";
        return local;
      }
    },
    async updateTemplate(template: TemplateDefinition) {
      this.upsertLocal(template);
      try {
        const updated = await apiUpdateTemplate(template);
        this.upsertLocal(updated);
        return updated;
      } catch (error) {
        console.warn("[templates] update failed", error);
        this.error = error instanceof Error ? error.message : "Template update failed";
        return template;
      }
    },
    async removeTemplate(id: string) {
      this.removeLocal(id);
      try {
        await apiDeleteTemplate(id);
      } catch (error) {
        console.warn("[templates] delete failed", error);
        this.error = error instanceof Error ? error.message : "Template delete failed";
      }
    },
  },
});
