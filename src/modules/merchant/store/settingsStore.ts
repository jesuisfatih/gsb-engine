import { defineStore } from "pinia";
import { $api } from "@/utils/api";

export type GeneralNotificationToggles = {
  newSubmission: boolean;
  approvalReminder: boolean;
  weeklySummary: boolean;
};

export type GeneralSettings = {
  merchantName: string;
  supportEmail: string | null;
  replyToEmail: string | null;
  defaultLanguage: string;
  timeZone: string;
  orderPrefix: string;
  notifications: GeneralNotificationToggles;
  storefrontUrl?: string | null;
};

export type AppearanceQuickActions = {
  startNew: boolean;
  reopenPrevious: boolean;
  autoBuild: boolean;
  resumeDraft: boolean;
  nameAndNumber: boolean;
};

export type AppearanceSettings = {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundStyle: {
    gradient: string[];
    textureUrl: string | null;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    buttonFont: string;
  };
  layout: {
    mainBackground: string;
    sidebarBackground: string;
    topbarBackground: string;
    textColor: string;
  };
  welcomePopup: {
    enabled: boolean;
    message: string | null;
    defaultView: "list" | "gallery";
    quickActions: AppearanceQuickActions;
  };
};

type GeneralResponse = { data: GeneralSettings };
type AppearanceResponse = { data: AppearanceSettings };

const defaultGeneral: GeneralSettings = {
  merchantName: "",
  supportEmail: null,
  replyToEmail: null,
  defaultLanguage: "English",
  timeZone: "America/New_York",
  orderPrefix: "",
  notifications: {
    newSubmission: true,
    approvalReminder: true,
    weeklySummary: false,
  },
  storefrontUrl: null,
};

const defaultAppearance: AppearanceSettings = {
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#5d5af1",
  secondaryColor: "#7c4dff",
  accentColor: "#407afc",
  backgroundStyle: {
    gradient: ["#f7f9ff", "#fbf4ff"],
    textureUrl: null,
  },
  typography: {
    headingFont: "Poppins",
    bodyFont: "Inter",
    buttonFont: "DM Sans",
  },
  layout: {
    mainBackground: "#ffffff",
    sidebarBackground: "#ffffff",
    topbarBackground: "#f8fafc",
    textColor: "#0f172a",
  },
  welcomePopup: {
    enabled: true,
    message: "Welcome to our custom printing studio!",
    defaultView: "list",
    quickActions: {
      startNew: true,
      reopenPrevious: true,
      autoBuild: true,
      resumeDraft: true,
      nameAndNumber: false,
    },
  },
};

export const useMerchantSettingsStore = defineStore("merchant-settings", {
  state: () => ({
    general: null as GeneralSettings | null,
    appearance: null as AppearanceSettings | null,
    loading: {
      general: false,
      appearance: false,
    },
    saving: {
      general: false,
      appearance: false,
    },
  }),

  actions: {
    resetGeneral() {
      this.general = { ...defaultGeneral };
    },

    resetAppearance() {
      this.appearance = { ...defaultAppearance };
    },

    async fetchGeneral() {
      this.loading.general = true;
      try {
        const response = await $api<GeneralResponse>("/merchant/config/general");
        const payload = response.data ?? defaultGeneral;
        this.general = {
          ...defaultGeneral,
          ...payload,
          notifications: {
            ...defaultGeneral.notifications,
            ...(payload.notifications ?? defaultGeneral.notifications),
          },
          storefrontUrl: payload.storefrontUrl ?? defaultGeneral.storefrontUrl,
        };
        return this.general;
      }
      finally {
        this.loading.general = false;
      }
    },

    async saveGeneral(input: GeneralSettings) {
      this.saving.general = true;
      try {
        const payload = {
          ...input,
          supportEmail: input.supportEmail ?? null,
          replyToEmail: input.replyToEmail ?? null,
        };
        const response = await $api<GeneralResponse>("/merchant/config/general", {
          method: "PUT",
          body: payload,
        });
        const saved = response.data ?? payload;
        this.general = {
          ...defaultGeneral,
          ...saved,
          notifications: {
            ...defaultGeneral.notifications,
            ...(saved.notifications ?? payload.notifications),
          },
          storefrontUrl: saved.storefrontUrl ?? payload.storefrontUrl ?? defaultGeneral.storefrontUrl,
        };
        return this.general;
      }
      finally {
        this.saving.general = false;
      }
    },

    async fetchAppearance() {
      this.loading.appearance = true;
      try {
        const response = await $api<AppearanceResponse>("/merchant/config/appearance");
        const payload = response.data ?? defaultAppearance;
        this.appearance = {
          ...defaultAppearance,
          ...payload,
          backgroundStyle: {
            ...defaultAppearance.backgroundStyle,
            ...(payload.backgroundStyle ?? defaultAppearance.backgroundStyle),
            gradient: payload.backgroundStyle?.gradient?.length
              ? [...payload.backgroundStyle.gradient]
              : [...defaultAppearance.backgroundStyle.gradient],
          },
          typography: {
            ...defaultAppearance.typography,
            ...(payload.typography ?? defaultAppearance.typography),
          },
          layout: {
            ...defaultAppearance.layout,
            ...(payload.layout ?? defaultAppearance.layout),
          },
          welcomePopup: {
            ...defaultAppearance.welcomePopup,
            ...(payload.welcomePopup ?? defaultAppearance.welcomePopup),
            quickActions: {
              ...defaultAppearance.welcomePopup.quickActions,
              ...(payload.welcomePopup?.quickActions ?? defaultAppearance.welcomePopup.quickActions),
            },
          },
        };
        return this.appearance;
      }
      finally {
        this.loading.appearance = false;
      }
    },

    async saveAppearance(input: AppearanceSettings) {
      this.saving.appearance = true;
      try {
        const payload = {
          ...input,
          backgroundStyle: {
            ...input.backgroundStyle,
            gradient: [...input.backgroundStyle.gradient],
          },
        };
        const response = await $api<AppearanceResponse>("/merchant/config/appearance", {
          method: "PUT",
          body: payload,
        });
        const saved = response.data ?? payload;
        this.appearance = {
          ...defaultAppearance,
          ...saved,
          backgroundStyle: {
            ...defaultAppearance.backgroundStyle,
            ...(saved.backgroundStyle ?? payload.backgroundStyle),
            gradient: saved.backgroundStyle?.gradient?.length
              ? [...saved.backgroundStyle.gradient]
              : [...payload.backgroundStyle.gradient],
          },
          typography: {
            ...defaultAppearance.typography,
            ...(saved.typography ?? payload.typography),
          },
          layout: {
            ...defaultAppearance.layout,
            ...(saved.layout ?? payload.layout),
          },
          welcomePopup: {
            ...defaultAppearance.welcomePopup,
            ...(saved.welcomePopup ?? payload.welcomePopup),
            quickActions: {
              ...defaultAppearance.welcomePopup.quickActions,
              ...(saved.welcomePopup?.quickActions ?? payload.welcomePopup.quickActions),
            },
          },
        };
        return this.appearance;
      }
      finally {
        this.saving.appearance = false;
      }
    },
  },
});
