import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type GangSheetSettings = {
  filenameTokens: string[];
  preferredFileType: string;
  downloadBehavior: string;
  autoTrim: boolean;
  includeFileName: boolean;
  includeBranding: boolean;
  allowedUploadTypes: string[];
  connectors: {
    dropbox: boolean;
    googleDrive: boolean;
  };
};

type GangSheetResponse = {
  data: {
    settings: GangSheetSettings;
    tokens: string[];
    fileTypes: string[];
    downloadBehaviours: string[];
    uploadTypes: string[];
  };
};

const defaultSettings: GangSheetSettings = {
  filenameTokens: ["Order Name", "Customer Name", "Order Id", "Variant Title", "Quantity"],
  preferredFileType: "PNG",
  downloadBehavior: "download",
  autoTrim: true,
  includeFileName: true,
  includeBranding: false,
  allowedUploadTypes: ["PNG", "SVG", "PDF"],
  connectors: {
    dropbox: false,
    googleDrive: false,
  },
};

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export const useMerchantGangSheetStore = defineStore("merchant-gang-sheet", {
  state: () => ({
    settings: null as GangSheetSettings | null,
    tokens: [] as string[],
    fileTypes: [] as string[],
    downloadBehaviours: [] as string[],
    uploadTypes: [] as string[],
    loading: false,
    saving: false,
    error: null as string | null,
  }),

  actions: {
    reset() {
      this.settings = { ...defaultSettings };
    },

    async fetchSettings() {
      this.loading = true;
      this.error = null;
      try {
        const response = await $api<GangSheetResponse>("/merchant/config/gang-sheet");
        const payload = response.data;
        const settings = payload?.settings ?? defaultSettings;
        this.settings = {
          ...defaultSettings,
          ...settings,
          filenameTokens: dedupe(settings.filenameTokens ?? defaultSettings.filenameTokens),
          allowedUploadTypes: dedupe(settings.allowedUploadTypes ?? defaultSettings.allowedUploadTypes),
        };
        this.tokens = payload?.tokens ?? [];
        this.fileTypes = payload?.fileTypes ?? [];
        this.downloadBehaviours = payload?.downloadBehaviours ?? ["browser", "download"];
        this.uploadTypes = payload?.uploadTypes ?? [];
        return this.settings;
      } catch (error: any) {
        console.warn("[merchant-gang-sheet] fetchSettings failed", error);
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to load gang sheet settings";
        this.reset();
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async saveSettings(input: GangSheetSettings) {
      this.saving = true;
      this.error = null;
      try {
        const payload: GangSheetSettings = {
          ...input,
          filenameTokens: dedupe(input.filenameTokens),
          allowedUploadTypes: dedupe(input.allowedUploadTypes),
        };
        const response = await $api<GangSheetResponse>("/merchant/config/gang-sheet", {
          method: "PUT",
          body: payload,
        });
        const data = response.data;
        const settings = data?.settings ?? payload;
        this.settings = {
          ...defaultSettings,
          ...settings,
          filenameTokens: dedupe(settings.filenameTokens),
          allowedUploadTypes: dedupe(settings.allowedUploadTypes),
        };
        this.tokens = data?.tokens ?? this.tokens;
        this.fileTypes = data?.fileTypes ?? this.fileTypes;
        this.downloadBehaviours = data?.downloadBehaviours ?? this.downloadBehaviours;
        this.uploadTypes = data?.uploadTypes ?? this.uploadTypes;
        return this.settings;
      } catch (error: any) {
        console.warn("[merchant-gang-sheet] saveSettings failed", error);
        this.error = error?.response?._data?.error ?? error?.message ?? "Unable to save gang sheet settings";
        throw error;
      } finally {
        this.saving = false;
      }
    },
  },
});
