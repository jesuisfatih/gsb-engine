<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import {
  useMerchantGangSheetStore,
  type GangSheetSettings,
} from "@/modules/merchant/store/gangSheetStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "Gang sheet settings",
    embeddedSubtitle: "Control print-ready output, allowed file types, and storage destinations.",
  },
});

const notification = useNotificationStore();
const gangSheetStore = useMerchantGangSheetStore();

const fallbackSettings: GangSheetSettings = {
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

const form = reactive({
  filenameTokens: [...fallbackSettings.filenameTokens],
  preferredFileType: fallbackSettings.preferredFileType,
  downloadBehavior: fallbackSettings.downloadBehavior,
  autoTrim: fallbackSettings.autoTrim,
  includeFileName: fallbackSettings.includeFileName,
  includeBranding: fallbackSettings.includeBranding,
  allowedUploadTypes: [...fallbackSettings.allowedUploadTypes],
  connectors: {
    dropbox: fallbackSettings.connectors.dropbox,
    googleDrive: fallbackSettings.connectors.googleDrive,
  },
});

const isLoading = computed(() => gangSheetStore.loading);
const isSaving = computed(() => gangSheetStore.saving);
const isBusy = computed(() => isLoading.value || isSaving.value);

const availableTokens = computed(() =>
  gangSheetStore.tokens.length ? gangSheetStore.tokens : fallbackSettings.filenameTokens,
);

const fileTypeOptions = computed(() =>
  gangSheetStore.fileTypes.length ? gangSheetStore.fileTypes : ["PNG", "JPG", "PDF"],
);

const downloadOptions = computed(() => {
  const behaviours = gangSheetStore.downloadBehaviours.length
    ? gangSheetStore.downloadBehaviours
    : ["browser", "download"];

  return behaviours.map(value => ({
    title: value === "browser" ? "Open in browser" : "Download file",
    value,
  }));
});

const uploadTypeOptions = computed(() =>
  gangSheetStore.uploadTypes.length ? gangSheetStore.uploadTypes : fallbackSettings.allowedUploadTypes,
);

function applySettings(settings: GangSheetSettings) {
  form.filenameTokens = [...settings.filenameTokens];
  form.preferredFileType = settings.preferredFileType;
  form.downloadBehavior = settings.downloadBehavior;
  form.autoTrim = settings.autoTrim;
  form.includeFileName = settings.includeFileName;
  form.includeBranding = settings.includeBranding;
  form.allowedUploadTypes = [...settings.allowedUploadTypes];
  form.connectors.dropbox = settings.connectors?.dropbox ?? false;
  form.connectors.googleDrive = settings.connectors?.googleDrive ?? false;
}

const MAX_TOKENS = 16;

function addFilenameToken(token: string) {
  if (!token) return;
  if (form.filenameTokens.includes(token)) return;
  if (form.filenameTokens.length >= MAX_TOKENS) {
    notification.info("En fazla 16 etiket ekleyebilirsiniz.");
    return;
  }
  form.filenameTokens.push(token);
}

function removeFilenameToken(index: number) {
  form.filenameTokens.splice(index, 1);
}

function toggleUploadType(type: string) {
  const idx = form.allowedUploadTypes.indexOf(type);
  if (idx >= 0) {
    form.allowedUploadTypes.splice(idx, 1);
  } else {
    form.allowedUploadTypes.push(type);
  }
}

function isUploadTypeActive(type: string) {
  return form.allowedUploadTypes.includes(type);
}

async function loadSettings() {
  try {
    const settings = await gangSheetStore.fetchSettings();
    applySettings(settings ?? fallbackSettings);
  } catch (error) {
    console.error(error);
    notification.info("Varsayilan gang sheet ayarlari kullaniliyor.");
    if (gangSheetStore.settings) {
      applySettings(gangSheetStore.settings);
    } else {
      applySettings(fallbackSettings);
    }
  }
}

async function handleSave() {
  try {
    const payload: GangSheetSettings = {
      filenameTokens: [...form.filenameTokens],
      preferredFileType: form.preferredFileType,
      downloadBehavior: form.downloadBehavior,
      autoTrim: form.autoTrim,
      includeFileName: form.includeFileName,
      includeBranding: form.includeBranding,
      allowedUploadTypes: [...form.allowedUploadTypes],
      connectors: {
        dropbox: form.connectors.dropbox,
        googleDrive: form.connectors.googleDrive,
      },
    };
    const saved = await gangSheetStore.saveSettings(payload);
    if (saved)
      applySettings(saved);
    notification.success("Gang sheet ayarlari kaydedildi.");
  } catch (error) {
    console.error(error);
    notification.error("Gang sheet ayarlari kaydedilemedi.");
  }
}

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <div class="page-section">
    <section class="card">
      <header class="card-header">
        <h2>File name format</h2>
      </header>
      <div class="token-input">
        <div
          v-for="(token, index) in form.filenameTokens"
          :key="`${token}-${index}`"
          class="token"
        >
          <span>{{ token }}</span>
          <button type="button" @click="removeFilenameToken(index)" :disabled="isBusy">x</button>
        </div>
        <div v-if="!form.filenameTokens.length" class="token empty">No tokens selected</div>
      </div>
      <div class="tag-bank">
        <button
          v-for="tag in availableTokens"
          :key="tag"
          type="button"
          class="tag"
          :class="{ active: form.filenameTokens.includes(tag) }"
          :disabled="isBusy || form.filenameTokens.includes(tag)"
          @click="addFilenameToken(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Print ready file</h2>
      </header>
      <div class="form-grid">
        <VSelect
          v-model="form.preferredFileType"
          :items="fileTypeOptions"
          label="File type"
          placeholder="Select file type"
          :disabled="isBusy"
          density="comfortable"
          hide-details
        />
        <VSelect
          v-model="form.downloadBehavior"
          :items="downloadOptions"
          item-title="title"
          item-value="value"
          label="Download file"
          placeholder="Choose action"
          :disabled="isBusy"
          density="comfortable"
          hide-details
        />
        <VSwitch
          v-model="form.autoTrim"
          hide-details
          inset
          label="Auto trim (default)"
          color="primary"
          :disabled="isBusy"
        />
        <VSwitch
          v-model="form.includeFileName"
          hide-details
          inset
          label="Print file name (default)"
          :disabled="isBusy"
        />
        <VSwitch
          v-model="form.includeBranding"
          hide-details
          inset
          label="Print QR / Logo"
          :disabled="isBusy"
        />
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Upload product file types</h2>
      </header>
      <div class="file-type-grid">
        <label
          v-for="type in uploadTypeOptions"
          :key="type"
          class="file-type"
        >
          <input
            type="checkbox"
            :checked="isUploadTypeActive(type)"
            :disabled="isBusy"
            @change="toggleUploadType(type)"
          />
          <span>{{ type }}</span>
        </label>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Cloud storage connectors</h2>
      </header>
      <div class="connector">
        <div class="connector-info">
          <span class="icon">DB</span>
          <div>
            <h3>Dropbox</h3>
            <p>Upload gang sheet files to Dropbox storage.</p>
          </div>
        </div>
        <VSwitch
          v-model="form.connectors.dropbox"
          hide-details
          inset
          :disabled="isBusy"
        />
      </div>
      <div class="connector">
        <div class="connector-info">
          <span class="icon">GD</span>
          <div>
            <h3>Google Drive</h3>
            <p>Upload gang sheet files to Google Drive storage.</p>
          </div>
        </div>
        <VSwitch
          v-model="form.connectors.googleDrive"
          hide-details
          inset
          :disabled="isBusy"
        />
      </div>
      <div class="actions">
        <VBtn
          color="primary"
          :loading="isSaving"
          :disabled="isBusy"
          @click="handleSave"
        >
          Save
        </VBtn>
      </div>
    </section>
  </div>
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
  gap: 18px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.token-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(17, 18, 23, 0.12);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.token {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #111217;
  color: #ffffff;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.token.empty {
  background: transparent;
  color: rgba(17, 18, 23, 0.5);
  border: 1px dashed rgba(17, 18, 23, 0.2);
}

.token button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
}

.token button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tag-bank {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  border: 1px solid rgba(17, 18, 23, 0.12);
  background: rgba(17, 18, 23, 0.02);
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 600;
  color: rgba(17, 18, 23, 0.7);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.tag.active,
.tag:disabled {
  background: #111217;
  color: #ffffff;
  border-color: #111217;
}

.tag:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.file-type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.file-type {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgba(17, 18, 23, 0.12);
  border-radius: 999px;
  background: rgba(17, 18, 23, 0.02);
  font-weight: 600;
  color: #111217;
}

.file-type input {
  width: 16px;
  height: 16px;
}

.connector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.connector + .connector {
  margin-top: 12px;
}

.connector-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connector-info .icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(64, 122, 252, 0.12);
  color: #407afc;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.connector-info h3 {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.connector-info p {
  margin: 2px 0 0;
  color: rgba(17, 18, 23, 0.6);
  font-size: 0.85rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
