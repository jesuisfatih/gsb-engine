<template>
  <div class="tg-wrap">
    <div class="tg-header">
      <h2>{{ title }}</h2>
      <div class="tg-actions">
        <button class="tg-btn" @click="refresh">Yenile</button>
        <slot name="extra"></slot>
      </div>
    </div>

    <div v-if="templates.length === 0" class="tg-empty">
      Bu kategori için şablon yok.
    </div>

    <div class="tg-grid">
      <div v-for="t in templates" :key="t.id" class="tg-card">
        <div class="tg-thumb" :title="t.title">
          <img v-if="t.thumbDataUrl" :src="t.thumbDataUrl" alt="" />
          <div v-else class="tg-thumb-empty">No Preview</div>
        </div>
        <div class="tg-meta">
          <div class="tg-title">{{ t.title }}</div>
          <div class="tg-tags">
            <span v-for="tag in t.tags || []" :key="tag" class="tg-tag">{{ tag }}</span>
          </div>
        </div>
        <div class="tg-buttons">
          <button class="tg-btn" @click="apply(t.id)">Kullan</button>
          <button class="tg-btn tg-secondary" @click="exportJson(t)">Dışa Aktar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useTemplatesStore } from "@/modules/templates/store/templatesStore";
import type { ProductSlug, TemplateDefinition } from "@/modules/templates/types";

const props = defineProps<{
  productSlug: ProductSlug;
  title?: string;
}>();

const title = computed(()=> props.title ?? "Şablonlar");
const store = useTemplatesStore();
const router = useRouter();

const templates = computed(()=> store.allForProduct(props.productSlug));

function apply(id: string) {
  // Editörde otomatik uygulama için localStorage’a işaret bırak
  localStorage.setItem("gsb:pendingTemplateId", id);
  router.push("/editor");
}

function exportJson(t: TemplateDefinition) {
  const blob = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${t.title.replace(/\s+/g,"_")}.template.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function refresh() {
  // LocalStorage tabanlı olduğumuz için görsel yenileme amaçlı
}
</script>

<style scoped>
.tg-wrap { display:flex; flex-direction:column; gap:16px; }
.tg-header { display:flex; align-items:center; justify-content:space-between; }
.tg-actions { display:flex; gap:8px; }
.tg-btn { padding:8px 12px; border:1px solid #ccc; background:#fff; cursor:pointer; border-radius:6px; }
.tg-secondary { background:#f6f6f6; }
.tg-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:16px; }
.tg-card { border:1px solid #e5e5e5; border-radius:8px; overflow:hidden; background:#fff; display:flex; flex-direction:column; }
.tg-thumb { height:150px; background:#fafafa; display:flex; align-items:center; justify-content:center; }
.tg-thumb img { max-width:100%; max-height:100%; display:block; }
.tg-thumb-empty { color:#888; font-size:12px; }
.tg-meta { padding:10px 12px; }
.tg-title { font-weight:600; margin-bottom:6px; }
.tg-tag { background:#f1f1f1; border-radius:999px; padding:2px 8px; font-size:11px; margin-right:4px; }
.tg-buttons { padding:10px 12px; display:flex; gap:8px; }
</style>
