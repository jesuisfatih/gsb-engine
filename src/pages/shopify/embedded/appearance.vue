<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import {
  useMerchantSettingsStore,
  type AppearanceSettings,
} from "@/modules/merchant/store/settingsStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Appearance",
    embeddedSubtitle: "Adjust welcome popup content, layout view, and colour theme.",
  },
});

type ViewMode = "list" | "gallery";
type ThemePreset = [string, string, string, string];

const themePresets: ThemePreset[] = [
  ["#ffffff", "#ffffff", "#0f172a", "#333333"],
  ["#f8fafc", "#101828", "#3371f2", "#101828"],
  ["#ffffff", "#ffffff", "#6366f1", "#1e1e1e"],
  ["#09090b", "#111827", "#a855f7", "#e5e7eb"],
];

const notification = useNotificationStore();
const settingsStore = useMerchantSettingsStore();

const appearanceForm = reactive({
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#5d5af1",
  secondaryColor: "#7c4dff",
  accentColor: "#407afc",
  layout: {
    mainBackground: "#ffffff",
    sidebarBackground: "#ffffff",
    topbarBackground: "#f8fafc",
    textColor: "#0f172a",
  },
  backgroundGradient: ["#f7f9ff", "#fbf4ff"] as [string, string],
  textureUrl: "",
  typography: {
    headingFont: "Poppins",
    bodyFont: "Inter",
    buttonFont: "DM Sans",
  },
  welcomePopup: {
    enabled: true,
    message: "Welcome to our custom printing studio!",
    defaultView: "list" as ViewMode,
    quickActions: {
      startNew: true,
      reopenPrevious: true,
      autoBuild: true,
      resumeDraft: true,
      nameAndNumber: false,
    },
  },
});

const isLoading = computed(() => settingsStore.loading.appearance);
const isSaving = computed(() => settingsStore.saving.appearance);
const isBusy = computed(() => isLoading.value || isSaving.value);

function applyAppearance(data: AppearanceSettings) {
  appearanceForm.logoUrl = data.logoUrl ?? "";
  appearanceForm.faviconUrl = data.faviconUrl ?? "";
  appearanceForm.primaryColor = data.primaryColor ?? appearanceForm.primaryColor;
  appearanceForm.secondaryColor = data.secondaryColor ?? appearanceForm.secondaryColor;
  appearanceForm.accentColor = data.accentColor ?? appearanceForm.accentColor;
  appearanceForm.layout.mainBackground = data.layout?.mainBackground ?? appearanceForm.layout.mainBackground;
  appearanceForm.layout.sidebarBackground = data.layout?.sidebarBackground ?? appearanceForm.layout.sidebarBackground;
  appearanceForm.layout.topbarBackground = data.layout?.topbarBackground ?? appearanceForm.layout.topbarBackground;
  appearanceForm.layout.textColor = data.layout?.textColor ?? appearanceForm.layout.textColor;
  appearanceForm.backgroundGradient[0] = data.backgroundStyle?.gradient?.[0] ?? appearanceForm.backgroundGradient[0];
  appearanceForm.backgroundGradient[1] = data.backgroundStyle?.gradient?.[1] ?? appearanceForm.backgroundGradient[1];
  appearanceForm.textureUrl = data.backgroundStyle?.textureUrl ?? "";
  appearanceForm.typography.headingFont = data.typography?.headingFont ?? appearanceForm.typography.headingFont;
  appearanceForm.typography.bodyFont = data.typography?.bodyFont ?? appearanceForm.typography.bodyFont;
  appearanceForm.typography.buttonFont = data.typography?.buttonFont ?? appearanceForm.typography.buttonFont;
  appearanceForm.welcomePopup.enabled = data.welcomePopup?.enabled ?? appearanceForm.welcomePopup.enabled;
  appearanceForm.welcomePopup.message = data.welcomePopup?.message ?? "";
  appearanceForm.welcomePopup.defaultView = data.welcomePopup?.defaultView ?? appearanceForm.welcomePopup.defaultView;
  appearanceForm.welcomePopup.quickActions.startNew = data.welcomePopup?.quickActions?.startNew ?? appearanceForm.welcomePopup.quickActions.startNew;
  appearanceForm.welcomePopup.quickActions.reopenPrevious = data.welcomePopup?.quickActions?.reopenPrevious ?? appearanceForm.welcomePopup.quickActions.reopenPrevious;
  appearanceForm.welcomePopup.quickActions.autoBuild = data.welcomePopup?.quickActions?.autoBuild ?? appearanceForm.welcomePopup.quickActions.autoBuild;
  appearanceForm.welcomePopup.quickActions.resumeDraft = data.welcomePopup?.quickActions?.resumeDraft ?? appearanceForm.welcomePopup.quickActions.resumeDraft;
  appearanceForm.welcomePopup.quickActions.nameAndNumber = data.welcomePopup?.quickActions?.nameAndNumber ?? appearanceForm.welcomePopup.quickActions.nameAndNumber;
}

function applyPreset(preset: ThemePreset) {
  appearanceForm.layout.mainBackground = preset[0];
  appearanceForm.layout.sidebarBackground = preset[1];
  appearanceForm.primaryColor = preset[2];
  appearanceForm.layout.textColor = preset[3];
  appearanceForm.layout.topbarBackground = preset[2];
}

async function loadAppearance() {
  try {
    const loaded = await settingsStore.fetchAppearance();
    if (loaded)
      applyAppearance(loaded);
  } catch (error) {
    console.error(error);
    notification.error("Görünüm ayarları yüklenemedi.");
  }
}

async function handleSave() {
  try {
    const payload: AppearanceSettings = {
      logoUrl: appearanceForm.logoUrl.trim() ? appearanceForm.logoUrl.trim() : null,
      faviconUrl: appearanceForm.faviconUrl.trim() ? appearanceForm.faviconUrl.trim() : null,
      primaryColor: appearanceForm.primaryColor,
      secondaryColor: appearanceForm.secondaryColor,
      accentColor: appearanceForm.accentColor,
      backgroundStyle: {
        gradient: [...appearanceForm.backgroundGradient],
        textureUrl: appearanceForm.textureUrl.trim() ? appearanceForm.textureUrl.trim() : null,
      },
      typography: { ...appearanceForm.typography },
      layout: { ...appearanceForm.layout },
      welcomePopup: {
        enabled: appearanceForm.welcomePopup.enabled,
        message: appearanceForm.welcomePopup.message?.trim() || null,
        defaultView: appearanceForm.welcomePopup.defaultView,
        quickActions: { ...appearanceForm.welcomePopup.quickActions },
      },
    };

    const saved = await settingsStore.saveAppearance(payload);
    if (saved)
      applyAppearance(saved);
    notification.success("Görünüm ayarları kaydedildi.");
  } catch (error) {
    console.error(error);
    notification.error("Görünüm ayarları kaydedilemedi.");
  }
}

onMounted(() => {
  void loadAppearance();
});
</script>

<template>
  <form class="page-section" @submit.prevent="handleSave">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Welcome popup settings</h2>
          <p class="card-subtitle">
            Müşterinin editöre girişinde gördüğü açılış ekranı ve hızlı eylemler.
          </p>
        </div>
        <VSwitch
          v-model="appearanceForm.welcomePopup.enabled"
          hide-details
          inset
          color="primary"
          :disabled="isBusy"
        />
      </header>

      <VSkeletonLoader
        v-if="isLoading"
        type="list-item-two-line"
        class="skeleton"
      />
      <template v-else>
        <VTextarea
          v-model="appearanceForm.welcomePopup.message"
          label="Welcome message"
          rows="4"
          placeholder="Welcome to our store! We are glad to have you here..."
          :disabled="isBusy"
        />

        <div class="view-mode">
          <label>
            <input
              v-model="appearanceForm.welcomePopup.defaultView"
              type="radio"
              name="view"
              value="list"
              :disabled="isBusy"
            />
            <span>List view</span>
          </label>
          <label>
            <input
              v-model="appearanceForm.welcomePopup.defaultView"
              type="radio"
              name="view"
              value="gallery"
              :disabled="isBusy"
            />
            <span>Gallery view</span>
          </label>
        </div>

        <div class="toggle-grid">
          <label class="toggle-item">
            <span>Start a brand new gang sheet</span>
            <VSwitch
              v-model="appearanceForm.welcomePopup.quickActions.startNew"
              hide-details
              inset
              color="primary"
              :disabled="isBusy"
            />
          </label>
          <label class="toggle-item">
            <span>Open previously ordered gang sheet</span>
            <VSwitch
              v-model="appearanceForm.welcomePopup.quickActions.reopenPrevious"
              hide-details
              inset
              color="primary"
              :disabled="isBusy"
            />
          </label>
          <label class="toggle-item">
            <span>Auto build</span>
            <VSwitch
              v-model="appearanceForm.welcomePopup.quickActions.autoBuild"
              hide-details
              inset
              color="primary"
              :disabled="isBusy"
            />
          </label>
          <label class="toggle-item">
            <span>Open working gang sheet</span>
            <VSwitch
              v-model="appearanceForm.welcomePopup.quickActions.resumeDraft"
              hide-details
              inset
              :disabled="isBusy"
            />
          </label>
          <label class="toggle-item">
            <span>Name and number</span>
            <VSwitch
              v-model="appearanceForm.welcomePopup.quickActions.nameAndNumber"
              hide-details
              inset
              :disabled="isBusy"
            />
          </label>
        </div>
      </template>
    </section>

    <section class="card">
      <header class="card-header">
        <div>
          <h2>Theme colours</h2>
          <p class="card-subtitle">
            Panel ve editör görünümünü mağazanızın kimliğiyle eşleştirin.
          </p>
        </div>
        <VBtn color="primary" type="submit" :loading="isSaving" :disabled="isSaving">
          Kaydet
        </VBtn>
      </header>

      <div class="color-grid">
        <VTextField
          v-model="appearanceForm.layout.mainBackground"
          label="Main background color"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.layout.sidebarBackground"
          label="Sidebar background color"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.layout.topbarBackground"
          label="Top bar background color"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.primaryColor"
          label="Primary color"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.secondaryColor"
          label="Secondary color"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.layout.textColor"
          label="Text color"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.accentColor"
          label="Accent color"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.backgroundGradient[0]"
          label="Gradient start"
          type="color"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.backgroundGradient[1]"
          label="Gradient end"
          type="color"
          :disabled="isBusy"
        />
      </div>

      <div class="presets">
        <h3>Presets</h3>
        <div class="preset-grid">
          <button
            v-for="(preset, index) in themePresets"
            :key="index"
            class="preset"
            type="button"
            :disabled="isBusy"
            @click="applyPreset(preset)"
          >
            <span v-for="color in preset" :key="color" :style="{ background: color }" />
          </button>
        </div>
      </div>

      <div class="typography-grid">
        <VTextField
          v-model="appearanceForm.typography.headingFont"
          label="Heading font"
          placeholder="Poppins"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.typography.bodyFont"
          label="Body font"
          placeholder="Inter"
          :disabled="isBusy"
        />
        <VTextField
          v-model="appearanceForm.typography.buttonFont"
          label="Button font"
          placeholder="DM Sans"
          :disabled="isBusy"
        />
      </div>

      <div class="texture-field">
        <VTextField
          v-model="appearanceForm.textureUrl"
          label="Texture overlay URL"
          placeholder="https://cdn.example.com/textures/fabric.png"
          :disabled="isBusy"
        />
      </div>
    </section>
  </form>
</template>

<style scoped>
.page-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.card-subtitle {
  margin: 4px 0 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.9rem;
}

.view-mode {
  display: inline-flex;
  gap: 12px;
  background: rgba(17, 18, 23, 0.06);
  padding: 6px;
  border-radius: 10px;
}

.view-mode label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
}

.view-mode input[type="radio"] {
  accent-color: #111217;
}

.toggle-grid {
  display: grid;
  gap: 12px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  background: rgba(17, 18, 23, 0.02);
}

.color-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.typography-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.texture-field {
  display: grid;
}

.presets {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.presets h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.preset-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preset {
  border: 1px solid rgba(17, 18, 23, 0.12);
  background: rgba(17, 18, 23, 0.02);
  padding: 4px;
  border-radius: 999px;
  display: inline-flex;
  gap: 4px;
  cursor: pointer;
}

.preset span {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(17, 18, 23, 0.1);
  display: inline-block;
}

.skeleton {
  max-width: 540px;
}
</style>
