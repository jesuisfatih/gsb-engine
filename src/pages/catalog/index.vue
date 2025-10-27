<template>
  <div class="catalog-wrap">
    <h1>Ürün Kategorileri</h1>
    <div class="grid">
      <button v-for="c in cats" :key="c.slug" class="card" @click="go(c.slug)">
        <div class="title">{{ c.title }}</div>
        <div class="desc">{{ c.desc }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { useRouter } from "vue-router";
definePage({ meta: { layout: "default", action: "read", subject: "ProductCatalog" }});

const router = useRouter();

const cats = [
  { slug: "tshirt", title: "T-Shirt", desc: "Ön / Arka yüzey" },
  { slug: "hoodie", title: "Hoodie", desc: "Ön / Arka / Kol" },
  { slug: "cap", title: "Şapka", desc: "Ön panel" },
  { slug: "mug", title: "Kupa", desc: "Wrap / Sol / Sağ" },
  { slug: "bag", title: "Çanta", desc: "Ön yüzey" },
  { slug: "pillow", title: "Yastık", desc: "Ön / Arka" },
  { slug: "poster", title: "Poster", desc: "Dikey / Yatay" },
  { slug: "mousepad", title: "Mouse Pad", desc: "Tam yüzey" },
  { slug: "magnet", title: "Magnet", desc: "Tam yüzey" },
];

function go(slug: string) {
  router.push(`/catalog/${slug}`);
}
</script>

<style scoped>
.catalog-wrap { display:flex; flex-direction:column; gap:16px; }
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px; }
.card { text-align:left; border:1px solid #e5e5e5; border-radius:10px; padding:14px; background:#fff; cursor:pointer; }
.title { font-weight:700; margin-bottom:6px; }
.desc { color:#777; font-size:12px; }
</style>
