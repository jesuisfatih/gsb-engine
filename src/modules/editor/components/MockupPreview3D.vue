<template>
  <details class="accordion" open>
    <summary>
      <span class="accordion-title">
        <svg class="accordion-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
        <span>🎭 3D Mockup Preview</span>
      </span>
      <span class="accordion-toggle">
        <svg viewBox="0 0 12 12">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </summary>

    <div class="section-body">
      <!-- Product Selector -->
      <div class="product-selector">
        <button 
          v-for="product in products" 
          :key="product.id"
          :class="['product-btn', { active: selectedProduct === product.id }]"
          @click="selectedProduct = product.id"
        >
          <span class="product-icon">{{ product.icon }}</span>
          <span>{{ product.name }}</span>
        </button>
      </div>

      <!-- 3D Preview Container -->
      <div class="mockup-container">
        <div class="mockup-canvas" ref="mockupCanvas">
          <!-- Placeholder for actual 3D mockup -->
          <div class="mockup-placeholder">
            <div class="product-shape" :data-product="selectedProduct">
              <svg v-if="selectedProduct === 'tshirt'" width="200" height="200" viewBox="0 0 200 200">
                <path d="M30 50 L70 30 L100 40 L130 30 L170 50 L170 180 L30 180 Z" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" />
                <rect x="60" y="70" width="80" height="80" fill="white" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 2" />
                <text x="100" y="115" text-anchor="middle" font-size="10" fill="#6b7280">Design Here</text>
              </svg>
              
              <svg v-else-if="selectedProduct === 'mug'" width="200" height="200" viewBox="0 0 200 200">
                <ellipse cx="100" cy="100" rx="60" ry="80" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" />
                <path d="M160 80 Q180 100 160 120" fill="none" stroke="#d1d5db" stroke-width="2" />
                <rect x="70" y="70" width="60" height="60" fill="white" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 2" />
                <text x="100" y="105" text-anchor="middle" font-size="10" fill="#6b7280">Design</text>
              </svg>
              
              <svg v-else-if="selectedProduct === 'cap'" width="200" height="200" viewBox="0 0 200 200">
                <ellipse cx="100" cy="80" rx="80" ry="40" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" />
                <rect x="20" y="80" width="160" height="60" rx="10" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" />
                <rect x="60" y="95" width="80" height="30" fill="white" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 2" />
                <text x="100" y="115" text-anchor="middle" font-size="10" fill="#6b7280">Design</text>
              </svg>
              
              <svg v-else-if="selectedProduct === 'bag'" width="200" height="200" viewBox="0 0 200 200">
                <rect x="40" y="50" width="120" height="130" rx="5" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" />
                <path d="M70 50 Q100 30 130 50" fill="none" stroke="#d1d5db" stroke-width="2" />
                <rect x="60" y="80" width="80" height="60" fill="white" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4 2" />
                <text x="100" y="115" text-anchor="middle" font-size="10" fill="#6b7280">Design</text>
              </svg>
            </div>
          </div>
        </div>

        <!-- 3D Controls -->
        <div class="mockup-controls">
          <button @click="rotate(-45)" title="Rotate Left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6M3 19a9 9 0 1 0 2.5-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <span class="rotation-display">{{ currentRotation }}°</span>
          <button @click="rotate(45)" title="Rotate Right">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M23 4v6h-6M21 19a9 9 0 1 1-2.5-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <button @click="resetView" title="Reset View">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
            </svg>
          </button>
        </div>

        <!-- Export Mockup -->
        <button class="export-mockup-btn" @click="exportMockup">
          📸 Export Mockup Image
        </button>
      </div>

      <!-- Mockup Settings -->
      <div class="mockup-settings">
        <div class="setting-row">
          <label>Background</label>
          <input v-model="backgroundColor" type="color" />
        </div>
        <div class="setting-row">
          <label>Shadows</label>
          <input v-model="shadowEnabled" type="checkbox" />
        </div>
        <div class="setting-row">
          <label>Reflections</label>
          <input v-model="reflectionEnabled" type="checkbox" />
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { ref } from 'vue';

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
.product-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.product-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.product-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}

.product-btn.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.product-icon {
  font-size: 24px;
}

.mockup-container {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.mockup-canvas {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.mockup-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.product-shape {
  transform: rotateY(var(--rotation, 0deg));
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.1));
}

.mockup-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.mockup-controls button {
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.mockup-controls button:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.rotation-display {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  min-width: 50px;
  text-align: center;
}

.export-mockup-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.2s;
}

.export-mockup-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3);
}

.mockup-settings {
  background: #f9fafb;
  border-radius: 6px;
  padding: 12px;
  margin-top: 12px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 12px;
}

.setting-row label {
  font-weight: 600;
  color: #374151;
}

.setting-row input[type="color"] {
  width: 40px;
  height: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
}

.setting-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>

