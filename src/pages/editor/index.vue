<template>
  <div class="editor-page">
    <EditorShell />
  </div>
</template>

<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import EditorShell from "@/modules/editor/components/EditorShell.vue";
import { useEditorStore } from "@/modules/editor/store/editorStore";
import { useTemplatesStore } from "@/modules/templates/store/templatesStore";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";
import { $api } from "@/utils/api";
import type { ShortcodeRecord } from "@/modules/merchant/store/shortcodeStore";

interface ShortcodeResponse { data?: ShortcodeRecord }

definePage({ meta: { layout: "blank", public: true } });

const route = useRoute();
const editorStore = useEditorStore();
const templatesStore = useTemplatesStore();
const catalogStore = useCatalogStore();

onMounted(async () => {
  tryApplyPendingTemplate();
  await ensureCatalog();
  const shortcodeHandle = typeof route.query.shortcode === "string" ? route.query.shortcode.trim() : null;
  if (shortcodeHandle) {
    await applyShortcode(shortcodeHandle);
  }
});

async function ensureCatalog() {
  if (!catalogStore.loaded && !catalogStore.loading)
    await catalogStore.ensureLoaded().catch(err => console.warn("[catalog] load failed", err));
}

async function applyTemplateById(templateId: string) {
  const template = templatesStore.byId(templateId);
  if (!template) return;
  editorStore.applyTemplateDefinition(template);
}

async function applyShortcode(handle: string) {
  try {
    const response = await $api<ShortcodeResponse>(`/embed/shortcodes/${encodeURIComponent(handle)}`);
    const record = response.data;
    if (!record) return;

    const product = catalogStore.products.find(p => {
      if (!p) return false;
      return p.id === record.productId || p.slug === record.productHandle || p.shopifyProductId === record.productGid;
    });

    if (product)
      editorStore.setProduct(product.slug as any);

    if (record.surfaceId)
      editorStore.setSurface(record.surfaceId);

    if (record.technique)
      editorStore.setPrintTech(record.technique as any);

    if (record.templateId)
      await applyTemplateById(record.templateId);
  } catch (error) {
    console.warn("[shortcode] apply failed", error);
  }
}

function tryApplyPendingTemplate() {
  const id = localStorage.getItem("gsb:pendingTemplateId");
  if (!id) return;

  localStorage.removeItem("gsb:pendingTemplateId");
  void applyTemplateById(id);
}
</script>

<style scoped>
/* stylelint-disable declaration-block-single-line-max-declarations */
.editor-page { display: flex; flex-direction: column; block-size: 100%; }
</style>


