<script setup lang="ts">
import { useProductStore } from "../store/productStore";
import { PRODUCTS, type Category } from "../../catalog/products";
const ps = useProductStore();

const categories: {label:string; value:Category}[] = [
  { label: "Tekstil", value: "textile" },
  { label: "Bardak / Drinkware", value: "drinkware" },
  { label: "Aksesuar", value: "accessories" },
  { label: "Ev & Dekor", value: "home_decor" }
];
</script>

<template>
  <div class="wizard">
    <div class="row">
      <label>Kat.</label>
      <select v-model="ps.category" @change="ps.setCategory(ps.category)">
        <option v-for="c in categories" :key="c.value" :value="c.value">{{c.label}}</option>
      </select>

      <label>Ürün</label>
      <select v-model="ps.productId">
        <option v-for="p in ps.productsByCat" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>

      <label>Teknik</label>
      <select v-model="ps.technique">
        <option v-for="t in ps.product.techniques" :key="t" :value="t">{{ t }}</option>
      </select>

      <label>Renk</label>
      <select v-model="ps.color">
        <option v-for="c in (ps.product.colors || ['Default'])" :key="c" :value="c">{{ c }}</option>
      </select>

      <label>Mat.</label>
      <select v-model="ps.material">
        <option v-for="m in (ps.product.materials || ['Default'])" :key="m" :value="m">{{ m }}</option>
      </select>

      <label>Adet</label>
      <input type="number" min="1" v-model.number="ps.quantity" />
    </div>

    <div class="info">
      <div><b>Baskı Alanı:</b> {{ ps.product.area.widthMm }}  {{ ps.product.area.heightMm }} mm</div>
      <div v-if="ps.product.rules[ps.technique]?.notes"><b>Kural:</b> {{ ps.product.rules[ps.technique]?.notes }}</div>
    </div>
  </div>
</template>

<style scoped>
.wizard { display: flex; flex-direction: column; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #eee; background: #fff; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
label { color: #666; font-size: 12px; }
select, input { border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; }
.info { color: #666; font-size: 12px; }
</style>
