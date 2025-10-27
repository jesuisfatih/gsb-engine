<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { definePage } from "unplugin-vue-router/runtime";
import { useTemplatesStore } from "@/modules/templates/store/templatesStore";
import type { ProductSlug, TemplateDefinition } from "@/modules/templates/types";
import type { TemplatePlaceholder } from "@/modules/editor/types";
import { sampleTemplates } from "@/modules/templates/utils/ensureSamples";

definePage({
  meta: { layout: "default", action: "manage", subject: "TemplateLibrary" },
});

const router = useRouter();
const store = useTemplatesStore();
store.seedIfEmpty(sampleTemplates());

const merchantId = ref(store.merchantId);
const createDialog = ref(false);
const importDialog = ref(false);
const savingPlaceholders = ref(false);
const syncingPlaceholders = ref(false);
const createForm = reactive({
  title: "Seasonal Campaign",
  productSlug: "tshirt" as ProductSlug,
  surfaceId: "tshirt-front",
  tags: "campaign,dtf",
});

const snackbar = reactive({
  show: false,
  color: "success" as "success" | "error",
  message: "",
});

const products: ProductSlug[] = [
  "tshirt",
  "hoodie",
  "cap",
  "mug",
  "bag",
  "pillow",
  "poster",
  "mousepad",
  "magnet",
];

const templates = computed(() => store.myTemplates);
const selectedTemplateId = ref<string | null>(null);
const placeholderDrafts = ref<PlaceholderDraft[]>([]);

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null;
  return store.byId(selectedTemplateId.value) ?? null;
});

interface PlaceholderDraft {
  key: string;
  label: string;
  type: "text" | "image";
  description?: string;
  required: boolean;
  lockFont: boolean;
  lockColor: boolean;
  maxLength: number | null;
  minLength: number | null;
  initialValue?: string;
  defaultImageUrl?: string;
  allowedFontsText: string;
  allowedColorsText: string;
  notes?: string;
  attachedItems: string[];
}

function notify(message: string, color: "success" | "error" = "success") {
  snackbar.message = message;
  snackbar.color = color;
  snackbar.show = true;
}

function humanizeKey(key: string) {
  return key
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function parseList(input: string) {
  const values = input
    .split(",")
    .map(token => token.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

function buildUsageMap(template: TemplateDefinition) {
  const usage: Record<string, string[]> = {};
  for (const item of template.items) {
    const key = item.template?.placeholder?.key;
    if (!key) continue;
    if (!usage[key]) usage[key] = [];
    usage[key]!.push(item.name || item.id);
  }
  return usage;
}

function draftFromPlaceholder(placeholder: TemplatePlaceholder, usage: string[]): PlaceholderDraft {
  return {
    key: placeholder.key,
    label: placeholder.label || humanizeKey(placeholder.key),
    type: placeholder.type,
    description: placeholder.description,
    required: Boolean(placeholder.required),
    lockFont: Boolean(placeholder.lockFont),
    lockColor: Boolean(placeholder.lockColor),
    maxLength: placeholder.maxLength ?? null,
    minLength: placeholder.minLength ?? null,
    initialValue: placeholder.initialValue,
    defaultImageUrl: placeholder.defaultImageUrl,
    allowedFontsText: (placeholder.allowedFonts ?? []).join(", "),
    allowedColorsText: (placeholder.allowedColors ?? []).join(", "),
    notes: placeholder.notes,
    attachedItems: usage,
  };
}

function hydratePlaceholderDrafts(template: TemplateDefinition) {
  const usageMap = buildUsageMap(template);
  const existing = template.placeholders ?? [];
  const drafts: PlaceholderDraft[] = [];
  const seen = new Set<string>();

  for (const placeholder of existing) {
    const usage = usageMap[placeholder.key] ?? [];
    drafts.push(draftFromPlaceholder(placeholder, usage));
    seen.add(placeholder.key);
  }

  for (const [key, usage] of Object.entries(usageMap)) {
    if (seen.has(key)) continue;
    drafts.push(
      draftFromPlaceholder(
        {
          key,
          label: humanizeKey(key),
          type: "text",
          required: false,
        },
        usage,
      ),
    );
  }

  placeholderDrafts.value = drafts.sort((a, b) => a.label.localeCompare(b.label));
}

function ensureSelection() {
  const list = templates.value;
  if (!list.length) {
    selectedTemplateId.value = null;
    return;
  }
  if (!selectedTemplateId.value || !list.some(template => template.id === selectedTemplateId.value)) {
    selectedTemplateId.value = list[0]!.id;
  }
}

function selectTemplate(id: string) {
  selectedTemplateId.value = id;
}

function addPlaceholderDraft() {
  const key = `field-${Math.random().toString(36).slice(2, 7)}`;
  placeholderDrafts.value = [
    ...placeholderDrafts.value,
    {
      key,
      label: humanizeKey(key),
      type: "text",
      required: false,
      lockFont: false,
      lockColor: false,
      maxLength: null,
      minLength: null,
      allowedFontsText: "",
      allowedColorsText: "",
      attachedItems: [],
    },
  ].sort((a, b) => a.label.localeCompare(b.label));
}

function removePlaceholderDraft(key: string) {
  placeholderDrafts.value = placeholderDrafts.value.filter(draft => draft.key !== key);
}

function cloneTemplate(template: TemplateDefinition) {
  return JSON.parse(JSON.stringify(template)) as TemplateDefinition;
}

function handleRowClick(_: unknown, context: { item?: { raw?: TemplateDefinition } }) {
  const id = context?.item?.raw?.id;
  if (id) selectTemplate(id);
}

function resolveRowClass(context: { item?: { raw?: TemplateDefinition } }) {
  return context?.item?.raw?.id === selectedTemplateId.value ? "template-row--active" : "";
}

async function commitMerchant() {
  store.setMerchant(merchantId.value);
  await store.fetchRemoteTemplates(true);
  ensureSelection();
  notify(`Active merchant set to ${merchantId.value || "default"}`);
}

function openCreateDialog() {
  createDialog.value = true;
}

async function createTemplate() {
  if (!createForm.title || !createForm.surfaceId) {
    notify("Title and surface are required", "error");
    return;
  }
  const tags = createForm.tags
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
  const created = await store.addMerchantTemplate({
    title: createForm.title,
    description: undefined,
    tags,
    thumbDataUrl: undefined,
    target: {
      productSlug: createForm.productSlug,
      surfaceId: createForm.surfaceId,
    },
    defaultPrintTech: "dtf",
    items: [],
    placeholders: [],
  });
  createDialog.value = false;
  ensureSelection();
  if (created?.id) selectTemplate(created.id);
  notify(`Template "${createForm.title}" created`);
}

async function handleImport(json: TemplateDefinition) {
  const created = await store.addMerchantTemplate({
    title: json.title,
    description: json.description,
    tags: json.tags,
    thumbDataUrl: json.thumbDataUrl,
    target: json.target,
    defaultPrintTech: json.defaultPrintTech,
    items: json.items,
    placeholders: json.placeholders ?? [],
  });
  ensureSelection();
  if (created?.id) selectTemplate(created.id);
  notify(`Imported template "${json.title}"`);
}

async function importTemplateFromFile(value: File[] | File | null) {
  const files = Array.isArray(value) ? value : value ? [value] : [];
  if (!files.length) return;
  try {
    const file = files[0];
    const content = await file.text();
    const parsed = JSON.parse(content) as TemplateDefinition;
    await handleImport(parsed);
    importDialog.value = false;
  } catch (error) {
    console.warn("[templates] import failed", error);
    notify("Unable to import template JSON", "error");
  }
}

function handoffToEditor(id: string) {
  localStorage.setItem("gsb:pendingTemplateId", id);
  router.push("/editor");
}

async function removeTemplate(id: string) {
  await store.removeTemplate(id);
  ensureSelection();
  notify("Template removed");
}

function syncPlaceholdersFromLayers() {
  const template = selectedTemplate.value;
  if (!template) return;
  syncingPlaceholders.value = true;
  try {
    hydratePlaceholderDrafts(template);
    notify("Layer placeholders synced");
  } finally {
    syncingPlaceholders.value = false;
  }
}

async function savePlaceholderConfiguration() {
  const template = selectedTemplate.value;
  if (!template) return;
  const sanitized: TemplatePlaceholder[] = [];
  const seenKeys = new Set<string>();
  for (const draft of placeholderDrafts.value) {
    const key = draft.key.trim();
    if (!key) continue;
    if (seenKeys.has(key)) {
      notify(`Duplicate placeholder key "${key}"`, "error");
      return;
    }
    seenKeys.add(key);
    sanitized.push({
      key,
      label: draft.label.trim() || humanizeKey(key),
      type: draft.type,
      description: draft.description?.trim() || undefined,
      required: draft.required,
      lockFont: draft.lockFont,
      lockColor: draft.lockColor,
      maxLength: draft.maxLength ?? undefined,
      minLength: draft.minLength ?? undefined,
      initialValue: draft.initialValue?.trim() || undefined,
      defaultImageUrl: draft.defaultImageUrl?.trim() || undefined,
      allowedFonts: parseList(draft.allowedFontsText),
      allowedColors: parseList(draft.allowedColorsText),
      notes: draft.notes?.trim() || undefined,
    });
  }

  const updated = cloneTemplate(template);
  updated.placeholders = sanitized;

  updated.items = updated.items.map(item => {
    if (!item.template?.placeholder?.key) return item;
    const key = item.template.placeholder.key;
    const match = sanitized.find(placeholder => placeholder.key === key);
    if (!match) {
      const clone = { ...item, template: { ...item.template } };
      delete clone.template!.placeholder;
      return clone;
    }
    return {
      ...item,
      template: {
        ...item.template,
        placeholder: {
          ...item.template.placeholder,
          ...match,
        },
      },
    };
  });

  savingPlaceholders.value = true;
  try {
    await store.updateTemplate(updated);
    notify("Placeholder configuration saved");
  } finally {
    savingPlaceholders.value = false;
  }
}

watch(templates, ensureSelection, { immediate: true });

watch(
  selectedTemplate,
  template => {
    if (template) {
      hydratePlaceholderDrafts(template);
    } else {
      placeholderDrafts.value = [];
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await store.ensureLoaded();
  ensureSelection();
});
</script>

<template>
  <VContainer fluid class="templates-page py-6">
    <header class="d-flex flex-column gap-3 mb-6">
      <div class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-4">
        <div>
          <h1 class="text-h4 font-weight-semibold mb-1">
            Template Library
          </h1>
          <p class="text-body-1 text-medium-emphasis mb-0">
            Curate ready-to-sell campaigns and reusable layouts for your customers. Organize by product,
            surface, or occasion.
          </p>
        </div>
        <div class="d-flex flex-column flex-sm-row gap-2">
          <VBtn variant="outlined" prepend-icon="tabler-upload" @click="importDialog = true">
            Import JSON
          </VBtn>
          <VBtn color="primary" prepend-icon="tabler-plus" @click="openCreateDialog">
            New template
          </VBtn>
        </div>
      </div>
      <VAlert type="info" variant="tonal" border="start">
        <div class="d-flex flex-column flex-sm-row gap-4 align-sm-center justify-space-between">
          <div>
            <strong>Active merchant:</strong>
            <span class="text-medium-emphasis">{{ merchantId || "default workspace" }}</span>
          </div>
          <div class="d-flex gap-3 align-center">
            <VTextField
              v-model="merchantId"
              label="Merchant ID"
              density="compact"
              hide-details
              class="max-w-220"
            />
            <VBtn variant="outlined" color="primary" @click="commitMerchant">
              Save
            </VBtn>
          </div>
        </div>
      </VAlert>
    </header>

    <VRow>
      <VCol cols="12" lg="4">
        <VCard rounded="xl" elevation="2" class="pa-5 h-100">
          <header class="mb-4">
            <h2 class="text-h6 mb-1">Library health</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Offer at least one template per product surface. Add seasonal campaigns to boost engagement.
            </p>
          </header>
          <VList density="comfortable" class="library-stats">
            <VListItem>
              <template #prepend>
                <VAvatar color="primary" variant="tonal">
                  <VIcon icon="tabler-template" />
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-semibold">{{ templates.length }} templates</VListItemTitle>
              <VListItemSubtitle>Ready for merchant {{ merchantId || "default" }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <template #prepend>
                <VAvatar color="secondary" variant="tonal">
                  <VIcon icon="tabler-layout-grid" />
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-semibold">9 product families</VListItemTitle>
              <VListItemSubtitle>Textile, drinkware, accessories &amp; more</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <template #prepend>
                <VAvatar color="success" variant="tonal">
                  <VIcon icon="tabler-sparkles" />
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-semibold">Campaign-ready</VListItemTitle>
              <VListItemSubtitle>Schedule publish dates &amp; segment tags</VListItemSubtitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>

      <VCol cols="12" lg="8">
        <VCard rounded="xl" elevation="2" class="pa-4">
          <VDataTable
            :items="templates"
            :headers="[
              { title: 'Template', key: 'title', sortable: false },
              { title: 'Product surface', key: 'surface', sortable: false },
              { title: 'Placeholders', key: 'placeholderCount', sortable: false, align: 'center' },
              { title: 'Tags', key: 'tags', sortable: false },
              { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
            ]"
            density="comfortable"
            class="template-table"
            hide-default-footer
            :loading="store.loading"
            @click:row="handleRowClick"
            :item-class="resolveRowClass"
          >
            <template #item.title="{ item }">
              <div class="d-flex flex-column">
                <span class="font-weight-medium">{{ item?.raw?.title }}</span>
                <span class="text-caption text-medium-emphasis">
                  {{ item?.raw?.description ?? 'No description provided' }}
                </span>
              </div>
            </template>
            <template #item.surface="{ item }">
              <div class="d-flex flex-column">
                <span>{{ item?.raw?.target?.productSlug }}</span>
                <span class="text-caption text-medium-emphasis">{{ item?.raw?.target?.surfaceId }}</span>
              </div>
            </template>
            <template #item.placeholderCount="{ item }">
              <div class="d-flex justify-center">
                <VChip size="small" color="primary" variant="tonal">
                  {{ item?.raw?.placeholders?.length ?? 0 }}
                </VChip>
              </div>
            </template>
            <template #item.tags="{ item }">
              <div class="d-flex flex-wrap gap-2">
                <VChip
                  v-for="tag in item?.raw?.tags ?? []"
                  :key="tag"
                  size="x-small"
                  color="primary"
                  variant="tonal"
                >
                  {{ tag }}
                </VChip>
              </div>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex justify-end gap-2">
                <VBtn variant="text" color="primary" @click.stop="handoffToEditor(item.raw.id)">
                  Open in editor
                </VBtn>
                <VBtn variant="text" color="error" @click.stop="removeTemplate(item.raw.id)">
                  Remove
                </VBtn>
              </div>
            </template>
            <template #no-data>
              <div class="text-center text-medium-emphasis py-6">
                No templates yet. Create your first template to kick off the library.
              </div>
            </template>
          </VDataTable>
        </VCard>

        <VCard v-if="selectedTemplate" rounded="xl" elevation="2" class="pa-4 mt-4">
          <header class="d-flex flex-column flex-md-row justify-space-between align-start gap-3 mb-5">
            <div>
              <h2 class="text-h6 mb-1">Placeholder designer</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Configure dynamic fields, required inputs, and locked styles for “{{ selectedTemplate?.title }}”.
              </p>
            </div>
            <div class="d-flex gap-2">
              <VBtn
                variant="tonal"
                color="secondary"
                prepend-icon="tabler-refresh"
                :loading="syncingPlaceholders"
                :disabled="syncingPlaceholders"
                @click="syncPlaceholdersFromLayers"
              >
                Sync from layers
              </VBtn>
              <VBtn
                color="primary"
                prepend-icon="tabler-device-floppy"
                :loading="savingPlaceholders"
                :disabled="savingPlaceholders"
                @click="savePlaceholderConfiguration"
              >
                Save
              </VBtn>
            </div>
          </header>

          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-caption text-medium-emphasis">
              {{ placeholderDrafts.length }} placeholder{{ placeholderDrafts.length === 1 ? '' : 's' }} configured
            </div>
            <VBtn variant="text" prepend-icon="tabler-plus" @click="addPlaceholderDraft">
              Add placeholder
            </VBtn>
          </div>

          <div v-if="placeholderDrafts.length" class="placeholder-list">
            <VExpansionPanels variant="accordion" multiple>
              <VExpansionPanel
                v-for="draft in placeholderDrafts"
                :key="draft.key"
                class="placeholder-card"
              >
                <VExpansionPanelTitle>
                  <div class="d-flex flex-column w-100">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <span class="font-weight-medium">{{ draft.label }}</span>
                      <div class="d-flex align-center gap-2">
                        <VChip size="x-small" color="primary" variant="tonal">
                          {{ draft.type.toUpperCase() }}
                        </VChip>
                        <VChip
                          v-if="draft.attachedItems.length"
                          size="x-small"
                          color="secondary"
                          variant="tonal"
                        >
                          {{ draft.attachedItems.length }} layer{{ draft.attachedItems.length === 1 ? '' : 's' }}
                        </VChip>
                        <VBtn
                          icon="tabler-trash"
                          variant="text"
                          color="error"
                          @click.stop="removePlaceholderDraft(draft.key)"
                        />
                      </div>
                    </div>
                    <span class="text-caption text-medium-emphasis">
                      Key: {{ draft.key }}
                    </span>
                  </div>
                </VExpansionPanelTitle>
                <VExpansionPanelText>
                  <VRow class="mb-2">
                    <VCol cols="12" md="6">
                      <VTextField v-model="draft.label" label="Label" density="comfortable" />
                    </VCol>

      <VCol cols="12" md="6">
                      <VTextField v-model="draft.key" label="Key" density="comfortable" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2">
                    <VCol cols="12" md="4">
                      <VSelect
                        v-model="draft.type"
                        :items="[
                          { title: 'Text', value: 'text' },
                          { title: 'Image', value: 'image' },
                        ]"
                        label="Type"
                        density="comfortable"
                      />
                    </VCol>

      <VCol cols="12" md="4">
                      <VTextField
                        v-model.number="draft.minLength"
                        type="number"
                        label="Min length"
                        density="comfortable"
                        :disabled="draft.type !== 'text'"
                      />
                    </VCol>

      <VCol cols="12" md="4">
                      <VTextField
                        v-model.number="draft.maxLength"
                        type="number"
                        label="Max length"
                        density="comfortable"
                        :disabled="draft.type !== 'text'"
                      />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2">
                    <VCol cols="12" md="6">
                      <VTextarea
                        v-model="draft.description"
                        label="Description"
                        hint="Shown to end users as guidance"
                        auto-grow
                        rows="2"
                        density="comfortable"
                      />
                    </VCol>

      <VCol cols="12" md="6">
                      <VTextarea
                        v-model="draft.notes"
                        label="Internal notes"
                        auto-grow
                        rows="2"
                        density="comfortable"
                      />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2">
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="draft.initialValue"
                        label="Default text"
                        density="comfortable"
                        :disabled="draft.type !== 'text'"
                      />
                    </VCol>

      <VCol cols="12" md="6">
                      <VTextField
                        v-model="draft.defaultImageUrl"
                        label="Default image URL"
                        density="comfortable"
                        :disabled="draft.type !== 'image'"
                      />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2">
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="draft.allowedFontsText"
                        label="Allowed fonts (comma separated)"
                        density="comfortable"
                        :disabled="draft.type !== 'text'"
                      />
                    </VCol>

      <VCol cols="12" md="6">
                      <VTextField
                        v-model="draft.allowedColorsText"
                        label="Allowed colors (comma separated hex)"
                        density="comfortable"
                      />
                    </VCol>
                  </VRow>
                  <div class="d-flex flex-wrap gap-4">
                    <VSwitch v-model="draft.required" label="Required" density="comfortable" />
                    <VSwitch
                      v-model="draft.lockFont"
                      label="Lock font"
                      density="comfortable"
                      :disabled="draft.type !== 'text'"
                    />
                    <VSwitch v-model="draft.lockColor" label="Lock color" density="comfortable" />
                  </div>
                  <div v-if="draft.attachedItems.length" class="attached-items mt-3">
                    <span class="text-caption text-medium-emphasis">Linked layers:</span>
                    <div class="d-flex flex-wrap gap-2 mt-1">
                      <VChip
                        v-for="name in draft.attachedItems"
                        :key="name"
                        size="x-small"
                        color="secondary"
                        variant="tonal"
                      >
                        {{ name }}
                      </VChip>
                    </div>
                  </div>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </div>
          <div v-else class="text-center text-medium-emphasis py-6">
            No dynamic placeholders defined yet. Sync from layers or create one manually.
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="createDialog" max-width="520">
      <VCard>
        <VCardTitle class="text-h6">
          New merchant template
        </VCardTitle>
        <VCardText>
          <VForm class="d-flex flex-column gap-4" @submit.prevent="createTemplate">
            <VTextField v-model="createForm.title" label="Title" required />
            <VSelect
              v-model="createForm.productSlug"
              :items="products"
              label="Product"
            />
            <VTextField
              v-model="createForm.surfaceId"
              label="Surface ID"
              placeholder="tshirt-front"
              required
            />
            <VTextField
              v-model="createForm.tags"
              label="Tags"
              placeholder="campaign, summer, featured"
              hint="Comma separated"
            />
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="createDialog = false">Cancel</VBtn>
          <VBtn color="primary" @click="createTemplate">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="importDialog" max-width="420">
      <VCard>
        <VCardTitle class="text-h6">
          Import template JSON
        </VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis">
            Upload a template exported from another workspace or environment. The file must include the target product and
            surface identifiers.
          </p>
          <VFileInput
            label="Template JSON"
            accept="application/json"
            prepend-icon="tabler-file-json"
            @update:model-value="importTemplateFromFile"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="importDialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="2500">
      {{ snackbar.message }}
    </VSnackbar>
  </VContainer>
</template>

<style scoped>
.templates-page {
  background: linear-gradient(180deg, rgba(41, 47, 69, 0.05) 0%, rgba(41, 47, 69, 0) 55%);
}

.max-w-220 {
  max-width: 220px;
}

.library-stats :deep(.v-list-item__content) {
  gap: 4px;
}

.template-table :deep(thead th) {
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.template-table :deep(tr.template-row--active) {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.template-table :deep(tr.template-row--active td) {
  border-color: rgba(var(--v-theme-primary), 0.25);
}

.placeholder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.placeholder-card :deep(.v-expansion-panel-title__content) {
  padding-block: 12px;
}

.placeholder-card :deep(.v-expansion-panel-text__wrapper) {
  padding-block: 12px 4px;
}

.attached-items {
  background-color: rgba(var(--v-theme-secondary), 0.08);
  border-radius: 8px;
  padding: 8px 10px;
}
</style>





