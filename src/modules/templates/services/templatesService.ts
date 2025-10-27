import { $api } from "@/utils/api";
import type { TemplateDefinition } from "../types";
import { sampleTemplates } from "../utils/ensureSamples";

export type TemplateInput = Omit<TemplateDefinition, "id" | "createdAt" | "createdBy"> & {
  id?: string;
  createdBy?: TemplateDefinition["createdBy"];
  createdAt?: number;
};

interface TemplateListResponse { data: TemplateDefinition[] }
interface TemplateResponse { data: TemplateDefinition }

export async function listTemplates(): Promise<TemplateDefinition[]> {
  try {
    const response = await $api<TemplateListResponse>("/templates");
    return response.data;
  } catch (error) {
    console.warn("[templates] list fallback", error);
    return sampleTemplates();
  }
}

export async function createTemplate(payload: TemplateInput): Promise<TemplateDefinition> {
  try {
    const response = await $api<TemplateResponse>("/templates", { method: "POST", body: payload });
    return response.data;
  } catch (error) {
    console.warn("[templates] create fallback", error);
    const now = Date.now();
    return {
      ...payload,
      id: payload.id ?? `tmp-${Math.random().toString(36).slice(2)}`,
      createdAt: payload.createdAt ?? now,
      createdBy: payload.createdBy ?? "merchant",
    } as TemplateDefinition;
  }
}

export async function updateTemplate(payload: TemplateDefinition): Promise<TemplateDefinition> {
  try {
    const response = await $api<TemplateResponse>(`/templates/${payload.id}`, {
      method: "PUT",
      body: payload,
    });
    return response.data;
  } catch (error) {
    console.warn("[templates] update fallback", error);
    return payload;
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    await $api(`/templates/${id}`, { method: "DELETE" });
  } catch (error) {
    console.warn("[templates] delete fallback", error);
  }
}
