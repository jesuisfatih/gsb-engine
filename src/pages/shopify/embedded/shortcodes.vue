<script setup lang="ts">
import { ref, onMounted } from "vue";
import { $api } from "@/utils/api";
import { useNotificationStore } from "@/modules/core/stores/notificationStore";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";

const notification = useNotificationStore();
const catalogStore = useCatalogStore();

interface Shortcode {
  id: string;
  handle: string;
  productGid: string;
  productTitle?: string;
  productHandle?: string;
  surfaceId?: string;
  technique?: string;
  usageTotal: number;
  usageLast7: number;
  usageLast24: number;
  embed: {
    div: string;
    script: string;
  };
  createdAt: string;
  updatedAt: string;
}

const shortcodes = ref<Shortcode[]>([]);
const loading = ref(false);
const createDialog = ref(false);
const selectedShortcode = ref<Shortcode | null>(null);

const form = ref({
  handle: "",
  productId: "",
  surfaceId: "",
  technique: "dtf",
});

const products = computed(() => catalogStore.sortedProducts);
const selectedProduct = computed(() => 
  products.value.find(p => p.slug === form.value.productId)
);
const surfaces = computed(() => selectedProduct.value?.surfaces ?? []);

async function loadShortcodes() {
  loading.value = true;
  try {
    const response = await $api<{ data: Shortcode[] }>("/shortcodes");
    shortcodes.value = response.data ?? [];
  } catch (error) {
    console.error("[shortcodes] Failed to load:", error);
    notification.error("Failed to load shortcodes");
  } finally {
    loading.value = false;
  }
}

async function createShortcode() {
  if (!form.value.handle || !form.value.productId) {
    notification.error("Please fill in all required fields");
    return;
  }

  try {
    await $api("/shortcodes", {
      method: "POST",
      body: {
        handle: form.value.handle,
        productGid: form.value.productId,
        productTitle: selectedProduct.value?.title,
        productHandle: selectedProduct.value?.slug,
        surfaceId: form.value.surfaceId || undefined,
        technique: form.value.technique || undefined,
      },
    });

    notification.success("Shortcode created successfully!");
    createDialog.value = false;
    resetForm();
    await loadShortcodes();
  } catch (error: any) {
    console.error("[shortcodes] Failed to create:", error);
    notification.error(error?.message || "Failed to create shortcode");
  }
}

async function deleteShortcode(id: string) {
  if (!confirm("Are you sure you want to delete this shortcode?")) {
    return;
  }

  try {
    await $api(`/shortcodes/${id}`, { method: "DELETE" });
    notification.success("Shortcode deleted");
    await loadShortcodes();
  } catch (error) {
    console.error("[shortcodes] Failed to delete:", error);
    notification.error("Failed to delete shortcode");
  }
}

function openCreateDialog() {
  resetForm();
  createDialog.value = true;
}

function resetForm() {
  form.value = {
    handle: "",
    productId: "",
    surfaceId: "",
    technique: "dtf",
  };
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  notification.success(`${label} copied to clipboard!`);
}

function viewShortcode(shortcode: Shortcode) {
  selectedShortcode.value = shortcode;
}

onMounted(async () => {
  await catalogStore.ensureLoaded();
  await loadShortcodes();
});
</script>

<template>
  <div class="shortcodes-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Shortcodes</h1>
        <p class="page-subtitle">
          Generate embed codes for your Shopify theme to display customize buttons
        </p>
      </div>
      <VBtn color="primary" @click="openCreateDialog">
        <VIcon icon="mdi-plus" start />
        Create Shortcode
      </VBtn>
    </div>

    <VCard v-if="loading" class="loading-card">
      <VCardText class="text-center">
        <VProgressCircular indeterminate color="primary" />
        <p class="mt-4">Loading shortcodes...</p>
      </VCardText>
    </VCard>

    <VCard v-else-if="shortcodes.length === 0" class="empty-state">
      <VCardText class="text-center pa-8">
        <VIcon icon="mdi-code-tags" size="64" color="grey-lighten-1" class="mb-4" />
        <h3 class="text-h5 mb-2">No shortcodes yet</h3>
        <p class="text-body-1 mb-4">
          Create a shortcode to generate embed codes for your products
        </p>
        <VBtn color="primary" @click="openCreateDialog">
          Create Your First Shortcode
        </VBtn>
      </VCardText>
    </VCard>

    <div v-else class="shortcodes-list">
      <VCard v-for="shortcode in shortcodes" :key="shortcode.id" class="shortcode-card">
        <VCardTitle class="d-flex align-center justify-space-between">
          <div>
            <code class="shortcode-handle">{{ shortcode.handle }}</code>
            <VChip
              v-if="shortcode.technique"
              size="small"
              class="ml-2"
              color="primary"
              variant="tonal"
            >
              {{ shortcode.technique.toUpperCase() }}
            </VChip>
          </div>
          <VBtn
            icon="mdi-delete"
            variant="text"
            color="error"
            @click="deleteShortcode(shortcode.id)"
          />
        </VCardTitle>

        <VCardText>
          <div class="shortcode-info mb-4">
            <div>
              <strong>Product:</strong> {{ shortcode.productTitle || shortcode.productGid }}
            </div>
            <div v-if="shortcode.surfaceId">
              <strong>Surface:</strong> {{ shortcode.surfaceId }}
            </div>
          </div>

          <div class="usage-stats mb-4">
            <VChip size="small" variant="tonal">
              Total: {{ shortcode.usageTotal }}
            </VChip>
            <VChip size="small" variant="tonal" class="ml-2">
              Last 7d: {{ shortcode.usageLast7 }}
            </VChip>
            <VChip size="small" variant="tonal" class="ml-2">
              Last 24h: {{ shortcode.usageLast24 }}
            </VChip>
          </div>

          <div class="embed-code">
            <div class="mb-2">
              <strong>Embed Code (Liquid):</strong>
              <VBtn
                size="small"
                variant="text"
                @click="copyToClipboard(shortcode.embed.div, 'Div snippet')"
              >
                <VIcon icon="mdi-content-copy" start />
                Copy Div
              </VBtn>
            </div>
            <pre class="code-block">{{ shortcode.embed.div }}</pre>

            <div class="mb-2 mt-4">
              <strong>Script Tag:</strong>
              <VBtn
                size="small"
                variant="text"
                @click="copyToClipboard(shortcode.embed.script, 'Script tag')"
              >
                <VIcon icon="mdi-content-copy" start />
                Copy Script
              </VBtn>
            </div>
            <pre class="code-block">{{ shortcode.embed.script }}</pre>
          </div>

          <VAlert type="info" variant="tonal" density="compact" class="mt-4">
            <small>
              Add the script tag to your theme.liquid once, then use the div snippet wherever you want the customize button to appear.
            </small>
          </VAlert>
        </VCardText>
      </VCard>
    </div>

    <!-- Create Dialog -->
    <VDialog v-model="createDialog" max-width="600">
      <VCard>
        <VCardTitle>Create Shortcode</VCardTitle>
        <VCardText class="d-flex flex-column gap-4">
          <VTextField
            v-model="form.handle"
            label="Handle"
            hint="Unique identifier (lowercase, numbers, hyphens only)"
            persistent-hint
            required
            :rules="[
              v => !!v || 'Handle is required',
              v => /^[a-z0-9-]+$/i.test(v) || 'Only letters, numbers, and hyphens allowed',
            ]"
          />

          <VSelect
            v-model="form.productId"
            :items="products"
            item-title="title"
            item-value="slug"
            label="Product"
            required
            hint="GSB product that this shortcode will open in the editor"
            persistent-hint
          />

          <VSelect
            v-model="form.surfaceId"
            :items="surfaces"
            item-title="name"
            item-value="id"
            label="Surface (optional)"
            hint="Specific surface to load"
            persistent-hint
            clearable
            :disabled="!form.productId || surfaces.length === 0"
          />

          <VSelect
            v-model="form.technique"
            :items="['dtf', 'sublimation', 'screen', 'embroidery']"
            label="Print Technique"
            hint="Default print technique"
            persistent-hint
          />
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="createDialog = false">Cancel</VBtn>
          <VBtn color="primary" @click="createShortcode">Create</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.shortcodes-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
}

.page-subtitle {
  color: var(--v-medium-emphasis-opacity);
  margin: 4px 0 0;
}

.shortcodes-list {
  display: grid;
  gap: 16px;
}

.shortcode-card {
  border: 1px solid var(--v-border-color);
}

.shortcode-handle {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--v-primary-base);
  background: var(--v-primary-lighten5);
  padding: 4px 12px;
  border-radius: 4px;
}

.shortcode-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.usage-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.embed-code {
  background: var(--v-grey-lighten5);
  padding: 16px;
  border-radius: 8px;
}

.code-block {
  background: var(--v-grey-lighten4);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
  margin: 0;
}

.empty-state,
.loading-card {
  margin-top: 24px;
}
</style>

