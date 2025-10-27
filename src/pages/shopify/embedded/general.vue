<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import {
  useMerchantSettingsStore,
  type GeneralSettings,
} from "@/modules/merchant/store/settingsStore";

definePage({
  meta: {
    layout: "shopify-embedded",
    public: true,
    embeddedTitle: "General settings",
    embeddedSubtitle: "Storewide preferences for order naming, language, and notifications.",
  },
});

const languageOptions = ["English", "Spanish", "French", "German", "Turkish"];

const notification = useNotificationStore();
const settingsStore = useMerchantSettingsStore();

const generalForm = reactive({
  merchantName: "",
  supportEmail: "",
  replyToEmail: "",
  defaultLanguage: languageOptions[0],
  timeZone: "America/New_York",
  orderPrefix: "",
  notifications: {
    newSubmission: true,
    approvalReminder: true,
    weeklySummary: false,
  },
});

const isLoading = computed(() => settingsStore.loading.general);
const isSaving = computed(() => settingsStore.saving.general);
const isBusy = computed(() => isLoading.value || isSaving.value);
const storefrontUrl = computed(() => settingsStore.general?.storefrontUrl ?? null);

function applyGeneral(data: GeneralSettings) {
  generalForm.merchantName = data.merchantName ?? "";
  generalForm.supportEmail = data.supportEmail ?? "";
  generalForm.replyToEmail = data.replyToEmail ?? "";
  generalForm.defaultLanguage = data.defaultLanguage ?? generalForm.defaultLanguage;
  generalForm.timeZone = data.timeZone ?? generalForm.timeZone;
  generalForm.orderPrefix = data.orderPrefix ?? "";
  generalForm.notifications.newSubmission = data.notifications?.newSubmission ?? true;
  generalForm.notifications.approvalReminder = data.notifications?.approvalReminder ?? true;
  generalForm.notifications.weeklySummary = data.notifications?.weeklySummary ?? false;
}

async function loadGeneral() {
  try {
    const loaded = await settingsStore.fetchGeneral();
    if (loaded)
      applyGeneral(loaded);
  } catch (error) {
    console.error(error);
    notification.error("Genel ayarlar yüklenemedi.");
  }
}

async function handleSave() {
  try {
    const payload: GeneralSettings = {
      merchantName: generalForm.merchantName.trim(),
      supportEmail: generalForm.supportEmail.trim() ? generalForm.supportEmail.trim() : null,
      replyToEmail: generalForm.replyToEmail.trim() ? generalForm.replyToEmail.trim() : null,
      defaultLanguage: generalForm.defaultLanguage,
      timeZone: generalForm.timeZone.trim() || "America/New_York",
      orderPrefix: generalForm.orderPrefix ?? "",
      notifications: { ...generalForm.notifications },
      storefrontUrl: storefrontUrl.value ?? null,
    };
    const saved = await settingsStore.saveGeneral(payload);
    if (saved)
      applyGeneral(saved);
    notification.success("Genel ayarlar kaydedildi.");
  } catch (error) {
    console.error(error);
    notification.error("Genel ayarlar kaydedilemedi.");
  }
}

onMounted(() => {
  void loadGeneral();
});
</script>

<template>
  <form class="page-section" @submit.prevent="handleSave">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Store profile</h2>
          <p class="card-subtitle">
            Shopify mağaza bilgilerinle eşleşecek temel iletişim alanları.
          </p>
        </div>
        <div class="card-actions">
          <VBtn
            variant="outlined"
            :href="storefrontUrl ?? undefined"
            target="_blank"
            :disabled="!storefrontUrl"
          >
            View store
          </VBtn>
          <VBtn color="primary" type="submit" :loading="isSaving" :disabled="isSaving">
            Kaydet
          </VBtn>
        </div>
      </header>

      <VSkeletonLoader
        v-if="isLoading && !storefrontUrl"
        type="list-item-two-line"
        class="skeleton"
      />
      <div v-else class="form-grid">
        <VTextField
          v-model="generalForm.merchantName"
          label="Merchant name"
          placeholder="Acme Transfers"
          :disabled="isBusy"
          required
        />
        <VTextField
          v-model="generalForm.supportEmail"
          label="Support email"
          placeholder="support@example.com"
          type="email"
          :disabled="isBusy"
        />
        <VTextField
          v-model="generalForm.replyToEmail"
          label="Default reply-to"
          placeholder="hello@example.com"
          type="email"
          :disabled="isBusy"
        />
        <VSelect
          v-model="generalForm.defaultLanguage"
          :items="languageOptions"
          label="Default language"
          placeholder="Choose language"
          :disabled="isBusy"
        />
        <VTextField
          v-model="generalForm.timeZone"
          label="Default time zone"
          placeholder="America/New_York"
          :disabled="isBusy"
        />
        <VTextField
          v-model="generalForm.orderPrefix"
          label="Order prefix"
          placeholder="GSB-"
          :disabled="isBusy"
        />
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2>Notifications</h2>
      </header>

      <div class="toggle-list">
        <label class="toggle-item">
          <div>
            <p>Notify merchant when a new order is submitted</p>
            <span>Email ve panel bildirimi.</span>
          </div>
          <VSwitch
            v-model="generalForm.notifications.newSubmission"
            hide-details
            inset
            color="primary"
            :disabled="isBusy"
          />
        </label>
        <label class="toggle-item">
          <div>
            <p>Send reminder to customers for pending approvals</p>
            <span>24 saat sonra otomatik hatırlatma e-postası.</span>
          </div>
          <VSwitch
            v-model="generalForm.notifications.approvalReminder"
            hide-details
            inset
            :disabled="isBusy"
          />
        </label>
        <label class="toggle-item">
          <div>
            <p>Enable weekly performance summary</p>
            <span>Toplam sipariş, üretim durumu ve iptaller.</span>
          </div>
          <VSwitch
            v-model="generalForm.notifications.weeklySummary"
            hide-details
            inset
            :disabled="isBusy"
          />
        </label>
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

.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(17, 18, 23, 0.08);
  border-radius: 12px;
  background: rgba(17, 18, 23, 0.02);
}

.toggle-item p {
  margin: 0;
  font-weight: 600;
  color: #111217;
}

.toggle-item span {
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  color: rgba(17, 18, 23, 0.6);
}

.skeleton {
  max-width: 480px;
}
</style>
