<template>
  <details class="accordion" open>
    <summary>
      <span class="accordion-title">
        <Box :size="18" :stroke-width="2" style="color: #8b5cf6;" />
        <span>3D Mockup Preview</span>
      </span>
      <span class="accordion-toggle">
        <ChevronDown :size="16" />
      </span>
    </summary>

    <div class="section-body">
      <!-- Product Selector - SIMPLIFIED -->
      <div class="product-selector-simple">
        <select v-model="selectedProduct" class="product-dropdown">
          <option v-for="product in products" :key="product.id" :value="product.id">
            {{ product.icon }} {{ product.name }}
          </option>
        </select>
      </div>

      <!-- 3D Preview Container - SIMPLIFIED -->
      <div class="mockup-container-simple">
        <!-- SIMPLE Mockup Preview -->
        <div class="mockup-preview-simple">
          <div class="product-icon-large">
            {{ products.find(p => p.id === selectedProduct)?.icon || '👕' }}
          </div>
          <div class="preview-label">Design will appear on {{ products.find(p => p.id === selectedProduct)?.name }}</div>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Box, ChevronDown, RotateCcw, RotateCw, Maximize2, Camera } from 'lucide-vue-next';

const selectedProduct = ref('tshirt');
const currentRotation = ref(0);
const backgroundColor = ref('#ffffff');
const shadowEnabled = ref(true);
const reflectionEnabled = ref(false);
const mockupCanvas = ref<HTMLElement | null>(null);

const products = [
  { id: 'tshirt', name: 'T-Shirt', icon: '👕' },
  { id: 'mug', name: 'Mug', icon: '☕' },
  { id: 'cap', name: 'Cap', icon: '🧢' },
  { id: 'bag', name: 'Bag', icon: '👜' }
];

function rotate(degrees: number) {
  currentRotation.value = (currentRotation.value + degrees) % 360;
  console.log('[3D Mockup] Rotation:', currentRotation.value);
}

function resetView() {
  currentRotation.value = 0;
  console.log('[3D Mockup] View reset');
}

function exportMockup() {
  console.log('[3D Mockup] Exporting mockup image...');
  alert('Mockup image exported!\n\nProduct: ' + selectedProduct.value + '\nRotation: ' + currentRotation.value + '°');
}
</script>

<style scoped>
/* Shopify Polaris-inspired styling */
.accordion {
  border: 1px solid #e1e3e5;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.accordion summary {
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  background: #fafbfb;
  border-bottom: 1px solid #e1e3e5;
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #202223;
}

.accordion-icon {
  width: 18px;
  height: 18px;
  color: #5c5f62;
}

.accordion-toggle {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-body {
  background: white;
  padding: 16px;
}

.product-selector-simple {
  margin-bottom: 12px;
}

.product-dropdown {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #c9cccf;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #202223;
  background: white;
  cursor: pointer;
  transition: all 0.15s ease;
}

.product-dropdown:hover {
  border-color: #006fbb;
}

.product-dropdown:focus {
  outline: none;
  border-color: #006fbb;
  box-shadow: 0 0 0 1px #006fbb;
}

.mockup-container-simple {
  background: #f6f6f7;
  border: 1px solid #e1e3e5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 0;
}

.mockup-preview-simple {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 16px;
  background: white;
  border: 1px solid #e1e3e5;
  border-radius: 6px;
  text-align: center;
}

.product-icon-large {
  font-size: 64px;
  margin-bottom: 12px;
  opacity: 0.9;
}

.preview-label {
  font-size: 13px;
  color: #6d7175;
  font-weight: 500;
}

.mockup-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.mockup-controls button {
  width: 38px;
  height: 38px;
  border: 1.5px solid #c9cccf;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.mockup-controls button:hover {
  border-color: #006fbb;
  background: #f1f2f3;
}

.mockup-controls button:active {
  background: #e3f1fb;
  border-color: #006fbb;
}

.rotation-display {
  font-size: 14px;
  font-weight: 600;
  color: #202223;
  min-width: 60px;
  text-align: center;
}

.export-mockup-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  background: #006fbb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 0 0 rgba(0,0,0,0.05);
}

.export-mockup-btn:hover {
  background: #005fa3;
  box-shadow: 0 1px 0 0 rgba(0,0,0,0.1);
}

.export-mockup-btn:active {
  background: #00578f;
  box-shadow: inset 0 1px 0 0 rgba(0,0,0,0.1);
}

.mockup-settings {
  background: #f6f6f7;
  border: 1px solid #e1e3e5;
  border-radius: 6px;
  padding: 14px;
  margin-top: 12px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  font-size: 13px;
}

.setting-row label {
  font-weight: 500;
  color: #202223;
}

.setting-row input[type="color"] {
  width: 44px;
  height: 32px;
  border: 1.5px solid #c9cccf;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.setting-row input[type="color"]:hover {
  border-color: #006fbb;
}

.setting-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #006fbb;
}
</style>

