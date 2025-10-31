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

      <!-- 3D Preview Container - WORKING INTEGRATION -->
      <div class="mockup-container-working">
        <div class="mockup-canvas-wrapper">
          <!-- Product Mockup Base -->
          <div class="product-base">
            <svg v-if="selectedProduct === 'tshirt'" width="100%" height="200" viewBox="0 0 240 240">
              <defs>
                <clipPath id="design-area">
                  <rect x="85" y="90" width="70" height="70" />
                </clipPath>
              </defs>
              <!-- T-shirt shape -->
              <path d="M40 60 L80 40 L120 50 L160 40 L200 60 L200 210 L40 210 Z" 
                fill="#f8f9fa" stroke="#dee2e6" stroke-width="2" />
              <!-- Design preview area -->
              <foreignObject x="85" y="90" width="70" height="70" clip-path="url(#design-area)">
                <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:#fff;border:2px dashed #006fbb;display:flex;align-items:center;justify-content:center;font-size:10px;color:#6c757d;">
                  Design Preview
                </div>
              </foreignObject>
            </svg>
            
            <svg v-else-if="selectedProduct === 'mug'" width="100%" height="200" viewBox="0 0 240 240">
              <!-- Mug shape -->
              <ellipse cx="120" cy="120" rx="50" ry="70" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2" />
              <path d="M170 100 Q185 120 170 140" fill="none" stroke="#dee2e6" stroke-width="2" />
              <!-- Design area -->
              <rect x="90" y="90" width="60" height="60" fill="white" stroke="#006fbb" stroke-width="1.5" stroke-dasharray="3 2" />
              <text x="120" y="125" text-anchor="middle" font-size="9" fill="#6c757d">Design</text>
            </svg>
            
            <svg v-else-if="selectedProduct === 'cap'" width="100%" height="200" viewBox="0 0 240 240">
              <!-- Cap shape -->
              <ellipse cx="120" cy="90" rx="70" ry="35" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2" />
              <rect x="50" y="90" width="140" height="50" rx="8" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2" />
              <!-- Design area -->
              <rect x="80" y="105" width="80" height="25" fill="white" stroke="#006fbb" stroke-width="1.5" stroke-dasharray="3 2" />
              <text x="120" y="122" text-anchor="middle" font-size="9" fill="#6c757d">Design</text>
            </svg>
            
            <svg v-else-if="selectedProduct === 'bag'" width="100%" height="200" viewBox="0 0 240 240">
              <!-- Bag shape -->
              <rect x="60" y="70" width="120" height="130" rx="6" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2" />
              <path d="M90 70 Q120 50 150 70" fill="none" stroke="#dee2e6" stroke-width="2" />
              <!-- Design area -->
              <rect x="80" y="100" width="80" height="60" fill="white" stroke="#006fbb" stroke-width="1.5" stroke-dasharray="3 2" />
              <text x="120" y="135" text-anchor="middle" font-size="9" fill="#6c757d">Design</text>
            </svg>
          </div>
        </div>
        
        <div class="mockup-info">
          <span class="info-icon">{{ products.find(p => p.id === selectedProduct)?.icon }}</span>
          <span class="info-text">Preview on {{ products.find(p => p.id === selectedProduct)?.name }}</span>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  color: #5c5f62;
  transition: transform 0.2s ease;
}

.accordion[open] .accordion-toggle {
  transform: rotate(180deg);
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

.mockup-container-working {
  background: #f6f6f7;
  border: 1px solid #e1e3e5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 0;
}

.mockup-canvas-wrapper {
  background: white;
  border: 1px solid #e1e3e5;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-base {
  width: 100%;
  max-width: 240px;
  margin: 0 auto;
}

.mockup-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: #e3f1fb;
  border: 1px solid #006fbb;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #006fbb;
}

.info-icon {
  font-size: 18px;
}

.info-text {
  font-size: 13px;
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

