<script setup lang="ts">
import { saveAs } from 'file-saver'
import { ref } from 'vue'
import { useEditorStore } from '../store/editorStore'
import { useProductStore } from '../store/productStore'

const store = useEditorStore()
const product = useProductStore()

const fileRef = ref<HTMLInputElement | null>(null)
function openFile() { fileRef.value?.click() }
function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length) store.addImageFiles(input.files)
  input.value = ''
}

async function exportProduction() {
  const payload = await product.buildProductionPayload()
  const blob = await (await fetch(payload.designPNG)).blob()
  saveAs(blob, `${product.productId}-${Date.now()}.png`)
}

async function pushShopify() {
  // Basit payload
  const payload = await product.buildProductionPayload()
  const mock = await product.exportMockup2D()
  const req = {
    title: product.product.name,
    description: `${product.technique} â€¢ ${product.color ?? 'Default'} â€¢ ${product.material ?? 'Default'}`,
    price:  product.quantity >= 10 ? 69.90 : 79.90, // Ã¶rnek
    imageDataUrl: mock || payload.designPNG
  }
  try {
    // Frontend proxy Ã¼zerinden istek atÄ±lÄ±r (server-js Ã¶rneÄŸine uygun)
    const r = await fetch('/api/shopify/create-product', {
      method: 'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(req)
    })
    if (!r.ok) throw new Error('Shopify error')
    console.log('Shopify OK', await r.json())
    alert('Shopify product created (logâ€™a bak).')
  } catch (e:any) {
    console.error(e); alert('Shopify hatasÄ±: ' + e.message)
  }
}
</script>

<template>
  <div class="tb">
    <button class="btn" @click="openFile">Upload</button>
    <input ref="fileRef" type="file" multiple accept="image/*" style="display: none;" @change="onFiles" />

    <button class="btn" @click="store.addText()">Text</button>
    <button class="btn" @click="store.addRect()">Rect</button>
    <button class="btn" @click="store.addCircle()">Circle</button>
    <button class="btn" @click="store.addLine()">Line</button>

    <label class="grid">
      <input type="checkbox" v-model="store.gridEnabled"> Grid
      <span>Grid(px)</span>
      <input class="grid-input" type="number" v-model.number="store.gridPx" min="4" max="200">
    </label>

    <button class="btn" @click="store.undo()">Undo</button>
    <button class="btn" @click="store.redo()">Redo</button>

    <span class="spacer"></span>

    <button class="btn" @click="exportProduction">Export Production</button>
    <button class="btn primary" @click="pushShopify">Push Shopify</button>
  </div>
</template>

<style scoped>
/* stylelint-disable declaration-block-single-line-max-declarations */
.tb { display: flex; align-items: center; padding: 8px; background: #fff; border-block-end: 1px solid #eee; gap: 8px; }
.btn { border: 1px solid #ddd; border-radius: 6px; background: #f6f6ff; cursor: pointer; padding-block: 6px; padding-inline: 10px; }
.btn.primary { background: #e9e9ff; }
.grid { display: inline-flex; align-items: center; gap: 8px; margin-inline-start: 16px; }
.grid-input { inline-size: 64px; }
.spacer { flex: 1; }
</style>
