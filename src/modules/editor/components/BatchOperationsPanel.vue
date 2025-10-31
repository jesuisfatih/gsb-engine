<template>
  <div v-if="show" class="batch-panel">
    <div class="panel-header">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
        </svg>
        Batch Operations
      </h3>
      <span class="selected-count">{{ selectedItems.length }} selected</span>
      <button @click="show = false">×</button>
    </div>

    <div class="panel-body">
      <!-- Selection Mode -->
      <div class="selection-mode">
        <button 
          :class="{ active: selectionMode === 'add' }"
          @click="selectionMode = 'add'"
        >
          ➕ Add
        </button>
        <button 
          :class="{ active: selectionMode === 'remove' }"
          @click="selectionMode = 'remove'"
        >
          ➖ Remove
        </button>
        <button 
          :class="{ active: selectionMode === 'toggle' }"
          @click="selectionMode = 'toggle'"
        >
          🔄 Toggle
        </button>
      </div>

      <!-- Quick Selectors -->
      <div class="quick-selectors">
        <button @click="selectAll">Select All</button>
        <button @click="selectNone">Select None</button>
        <button @click="selectInvert">Invert</button>
        <button @click="selectByType('image')">Images</button>
        <button @click="selectByType('text')">Text</button>
      </div>

      <!-- Batch Actions -->
      <div class="batch-actions">
        <h4>Transform</h4>
        <div class="action-group">
          <div class="input-row">
            <label>Scale</label>
            <input v-model.number="scale" type="number" min="10" max="500" step="10" />
            <span>%</span>
            <button @click="applyScale">Apply</button>
          </div>
          <div class="input-row">
            <label>Rotate</label>
            <input v-model.number="rotation" type="number" step="45" />
            <span>°</span>
            <button @click="applyRotation">Apply</button>
          </div>
        </div>

        <h4>Position</h4>
        <div class="action-group">
          <button @click="alignLeft">⬅️ Align Left</button>
          <button @click="alignCenter">↔️ Center H</button>
          <button @click="alignRight">➡️ Align Right</button>
          <button @click="alignTop">⬆️ Align Top</button>
          <button @click="alignMiddle">↕️ Center V</button>
          <button @click="alignBottom">⬇️ Align Bottom</button>
        </div>

        <h4>Distribute</h4>
        <div class="action-group">
          <button @click="distributeHorizontal">↔️ Horizontal</button>
          <button @click="distributeVertical">↕️ Vertical</button>
          <button @click="matchSizes">📏 Match Sizes</button>
        </div>

        <h4>Effects</h4>
        <div class="action-group">
          <div class="input-row">
            <label>Opacity</label>
            <input v-model.number="opacity" type="range" min="0" max="100" />
            <span>{{ opacity }}%</span>
            <button @click="applyOpacity">Apply</button>
          </div>
        </div>

        <h4>Danger Zone</h4>
        <div class="action-group danger">
          <button @click="duplicateSelected">📋 Duplicate</button>
          <button @click="deleteSelected" class="danger-btn">🗑️ Delete</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Floating Toggle -->
  <button v-if="!show" class="batch-toggle" @click="show = true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from '../store/editorStore';

const show = ref(false);
const selectionMode = ref<'add' | 'remove' | 'toggle'>('add');
const scale = ref(100);
const rotation = ref(0);
const opacity = ref(100);

const editorStore = useEditorStore();
const selectedItems = computed(() => editorStore.items.filter((item: any) => item.selected));

function selectAll() {
  editorStore.items.forEach((item: any) => item.selected = true);
}

function selectNone() {
  editorStore.items.forEach((item: any) => item.selected = false);
}

function selectInvert() {
  editorStore.items.forEach((item: any) => item.selected = !item.selected);
}

function selectByType(type: string) {
  editorStore.items.forEach((item: any) => {
    item.selected = item.type === type;
  });
}

function applyScale() {
  selectedItems.value.forEach((item: any) => {
    const factor = scale.value / 100;
    if (item.width) item.width *= factor;
    if (item.height) item.height *= factor;
  });
  editorStore.snapshot();
}

function applyRotation() {
  selectedItems.value.forEach((item: any) => {
    item.rotation = (item.rotation || 0) + rotation.value;
  });
  editorStore.snapshot();
}

function alignLeft() {
  if (selectedItems.value.length === 0) return;
  const minX = Math.min(...selectedItems.value.map((i: any) => i.x));
  selectedItems.value.forEach((item: any) => item.x = minX);
  editorStore.snapshot();
}

function alignCenter() {
  if (selectedItems.value.length === 0) return;
  const minX = Math.min(...selectedItems.value.map((i: any) => i.x));
  const maxX = Math.max(...selectedItems.value.map((i: any) => i.x + (i.width || 0)));
  const centerX = (minX + maxX) / 2;
  selectedItems.value.forEach((item: any) => {
    item.x = centerX - (item.width || 0) / 2;
  });
  editorStore.snapshot();
}

function alignRight() {
  if (selectedItems.value.length === 0) return;
  const maxX = Math.max(...selectedItems.value.map((i: any) => i.x + (i.width || 0)));
  selectedItems.value.forEach((item: any) => {
    item.x = maxX - (item.width || 0);
  });
  editorStore.snapshot();
}

function alignTop() {
  if (selectedItems.value.length === 0) return;
  const minY = Math.min(...selectedItems.value.map((i: any) => i.y));
  selectedItems.value.forEach((item: any) => item.y = minY);
  editorStore.snapshot();
}

function alignMiddle() {
  if (selectedItems.value.length === 0) return;
  const minY = Math.min(...selectedItems.value.map((i: any) => i.y));
  const maxY = Math.max(...selectedItems.value.map((i: any) => i.y + (i.height || 0)));
  const centerY = (minY + maxY) / 2;
  selectedItems.value.forEach((item: any) => {
    item.y = centerY - (item.height || 0) / 2;
  });
  editorStore.snapshot();
}

function alignBottom() {
  if (selectedItems.value.length === 0) return;
  const maxY = Math.max(...selectedItems.value.map((i: any) => i.y + (i.height || 0)));
  selectedItems.value.forEach((item: any) => {
    item.y = maxY - (item.height || 0);
  });
  editorStore.snapshot();
}

function distributeHorizontal() {
  if (selectedItems.value.length < 2) return;
  const sorted = [...selectedItems.value].sort((a: any, b: any) => a.x - b.x);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpace = (last.x + (last.width || 0)) - first.x;
  const spacing = totalSpace / (sorted.length - 1);
  
  sorted.forEach((item: any, idx: number) => {
    item.x = first.x + (spacing * idx);
  });
  editorStore.snapshot();
}

function distributeVertical() {
  if (selectedItems.value.length < 2) return;
  const sorted = [...selectedItems.value].sort((a: any, b: any) => a.y - b.y);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpace = (last.y + (last.height || 0)) - first.y;
  const spacing = totalSpace / (sorted.length - 1);
  
  sorted.forEach((item: any, idx: number) => {
    item.y = first.y + (spacing * idx);
  });
  editorStore.snapshot();
}

function matchSizes() {
  if (selectedItems.value.length === 0) return;
  const firstItem = selectedItems.value[0];
  const targetWidth = firstItem.width || 100;
  const targetHeight = firstItem.height || 100;
  
  selectedItems.value.forEach((item: any) => {
    item.width = targetWidth;
    item.height = targetHeight;
  });
  editorStore.snapshot();
}

function applyOpacity() {
  selectedItems.value.forEach((item: any) => {
    item.opacity = opacity.value / 100;
  });
  editorStore.snapshot();
}

function duplicateSelected() {
  const newItems = selectedItems.value.map((item: any) => ({
    ...item,
    id: Date.now() + Math.random(),
    x: item.x + 20,
    y: item.y + 20,
    selected: false
  }));
  editorStore.items.push(...newItems);
  editorStore.snapshot();
}

function deleteSelected() {
  if (!confirm(`Delete ${selectedItems.value.length} items?`)) return;
  editorStore.items = editorStore.items.filter((item: any) => !item.selected);
  editorStore.snapshot();
}
</script>

<style scoped>
.batch-panel {
  position: fixed;
  left: 24px;
  top: 80px;
  width: 320px;
  max-height: calc(100vh - 120px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1800;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
}

.panel-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.selected-count {
  font-size: 12px;
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.panel-header button {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 20px;
  cursor: pointer;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.selection-mode {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.selection-mode button {
  padding: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.selection-mode button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.quick-selectors {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}

.quick-selectors button {
  padding: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-selectors button:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.batch-actions h4 {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  margin: 16px 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.action-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.action-group button {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-group button:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.input-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 60px 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.input-row label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.input-row input {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
}

.input-row span {
  font-size: 11px;
  color: #6b7280;
}

.input-row button {
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.action-group.danger button {
  border-color: #fecaca;
}

.danger-btn {
  background: #ef4444 !important;
  color: white !important;
  border: none !important;
}

.batch-toggle {
  position: fixed;
  left: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1700;
  transition: all 0.2s;
}

.batch-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.5);
}
</style>

