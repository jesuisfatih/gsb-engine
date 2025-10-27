<template>
  <div class="page">
    <h1>Super Admin • Şablon Yönetimi</h1>

    <form class="form" @submit.prevent="createSuper">
      <h3>Yeni Super Template</h3>
      <label>Başlık <input v-model="form.title" required /></label>
      <label>Ürün
        <select v-model="form.productSlug">
          <option v-for="p in products" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
      <label>Yüzey ID <input v-model="form.surfaceId" placeholder="tshirt-front" required /></label>
      <label>Etiketler (virgülle) <input v-model="form.tags" placeholder="logo, minimal" /></label>
      <div class="row">
        <button type="submit">Oluştur</button>
        <button type="button" @click="importJson">JSON İçe Aktar</button>
      </div>
    </form>

    <hr />

    <h3>Mevcut Super Şablonlar</h3>
    <ul class="list">
      <li v-for="t in superList" :key="t.id">
        <b>{{ t.title }}</b> — {{ t.target.productSlug }} / {{ t.target.surfaceId }}
        <button @click="remove(t.id)">Sil</button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { ref, computed } from "vue";
import { useTemplatesStore } from "@/modules/templates/store/templatesStore";
import type { ProductSlug, TemplateDefinition } from "@/modules/templates/types";
import { sampleTemplates } from "@/modules/templates/utils/ensureSamples";

definePage({ meta: { layout: "default", action: "manage", subject: "TemplateLibrary" }});

const store = useTemplatesStore();
store.seedIfEmpty(sampleTemplates());

const products: ProductSlug[] = ["tshirt","hoodie","cap","mug","bag","pillow","poster","mousepad","magnet"];

const form = ref({ title:"Yeni Template", productSlug: "tshirt" as ProductSlug, surfaceId: "tshirt-front", tags: "" });

const superList = computed(()=> store.superTemplates);

function createSuper() {
  const t = store.addSuperTemplate({
    title: form.value.title,
    description: undefined,
    tags: form.value.tags.split(",").map(s=>s.trim()).filter(Boolean),
    thumbDataUrl: undefined,
    target: { productSlug: form.value.productSlug, surfaceId: form.value.surfaceId },
    defaultPrintTech: "dtf",
    items: [] // boş şablon; editörde doldurulabilir
  });
  alert("Oluşturuldu: " + t.title);
}

function importJson() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json";
  inp.onchange = async () => {
    const f = inp.files?.[0]; if(!f) return;
    const txt = await f.text();
    const parsed = JSON.parse(txt) as TemplateDefinition;
    // super template olarak içe al
    store.addSuperTemplate({
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags,
      thumbDataUrl: parsed.thumbDataUrl,
      target: parsed.target,
      defaultPrintTech: parsed.defaultPrintTech,
      items: parsed.items
    });
    alert("İçe aktarıldı.");
  };
  inp.click();
}

function remove(id: string) {
  store.removeTemplate(id);
}
</script>

<style scoped>
.page { display:flex; flex-direction:column; gap:12px; }
.form { display:grid; gap:8px; max-width:520px; }
.form .row { display:flex; gap:8px; }
.list { display:grid; gap:6px; }
button { padding:8px 12px; border:1px solid #ccc; background:#fff; border-radius:6px; cursor:pointer; }
input, select { padding:6px 8px; border:1px solid #ddd; border-radius:6px; }
</style>
