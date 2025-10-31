<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../store/editorStore';
import { useEditorModeStore } from '../store/editorModeStore';
import { useSessionStore } from '@/modules/auth/stores/sessionStore';
import { 
  Undo2, 
  Redo2, 
  Save, 
  Image, 
  Type,
  Square,
  Circle,
  Minus,
  Grid3x3,
  Download,
  ShoppingCart,
  Loader2,
  Layers,
  Sparkles,
  Zap,
  Brain,
  Users,
  Settings
} from 'lucide-vue-next';
import AIPackingDialog from './AIPackingDialog.vue';

const editorStore = useEditorStore();
const modeStore = useEditorModeStore();
const sessionStore = useSessionStore();

const isGangMode = computed(() => modeStore.activeMode === 'gang');
const isDtfMode = computed(() => modeStore.activeMode === 'dtf');

function changeMode(mode: 'gang' | 'dtf') {
  modeStore.switchTo(mode);
}

const canUndo = computed(() => {
  return editorStore.historyIdx !== undefined && editorStore.historyIdx > 0;
});
const canRedo = computed(() => {
  const history = editorStore.history || [];
  const idx = editorStore.historyIdx ?? 0;
  return idx < history.length - 1;
});
const isSaving = computed(() => editorStore.designSaving);

const lastSavedLabel = computed(() => {
  const { lastSavedAt, lastAutosaveAt } = editorStore;
  const timestamp = lastSavedAt ?? lastAutosaveAt;
  if (!timestamp) return null;
  
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();
  
  if (diff < 5000) return 'Saved just now';
  if (diff < 60000) return `Saved ${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
  
  return `Saved at ${date.toLocaleTimeString()}`;
});

const isAnonymous = computed(() => !sessionStore.isAuthenticated);

// File upload
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.multiple = true;
fileInput.style.display = 'none';

function handleUpload() {
  fileInput.click();
}

fileInput.addEventListener('change', (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (files) editorStore.addImageFiles(files);
  fileInput.value = '';
});

async function handleCheckout() {
  try {
    await editorStore.checkoutWithDesign();
  } catch (error) {
    console.error('[topbar] Checkout failed', error);
    alert('Failed to proceed to checkout. Please try again.');
  }
}

// Option C: AI Auto-Pack
const aiOptimizing = ref(false);
const showAIDialog = ref(false);

async function handleAIAutoPack() {
  if (aiOptimizing.value) return;
  
  aiOptimizing.value = true;
  try {
    const { getAIOptimizer } = await import('../services/aiPacking');
    const optimizer = getAIOptimizer();
    
    const result = await optimizer.optimize(
      editorStore.items,
      { w: editorStore.sheetWpx, h: editorStore.sheetHpx },
      { margin: 8, allowRotation: true }
    );
    
    editorStore.items = result.items;
    editorStore.snapshot();
    
    console.log('[AI] Optimized! Utilization:', result.utilization.toFixed(1) + '%');
  } catch (error) {
    console.error('[AI] Auto-pack failed:', error);
  } finally {
    aiOptimizing.value = false;
  }
}

async function handleAIPackWithSettings(settings: any) {
  if (aiOptimizing.value) return;
  
  aiOptimizing.value = true;
  try {
    const { getAIOptimizer } = await import('../services/aiPacking');
    const optimizer = getAIOptimizer();
    
    const result = await optimizer.optimize(
      editorStore.items,
      { w: editorStore.sheetWpx, h: editorStore.sheetHpx },
      settings
    );
    
    editorStore.items = result.items;
    editorStore.snapshot();
    
    console.log('[AI] Optimized with settings! Utilization:', result.utilization.toFixed(1) + '%');
  } catch (error) {
    console.error('[AI] Auto-pack failed:', error);
  } finally {
    aiOptimizing.value = false;
  }
}
</script>

<template>
  <div class="editor-topbar">
    <div class="topbar-section left">
      <div class="brand-section">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.6"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="brand-text">
          <div class="brand-title">Gang Sheet Builder</div>
          <div v-if="isAnonymous" class="brand-subtitle">Anonymous Session</div>
          <div v-else class="brand-subtitle">Design Studio</div>
        </div>
      </div>
    </div>

    <div class="topbar-section center">
      <!-- Mode Switch -->
      <div class="mode-switch-group">
        <button 
          class="mode-btn" 
          :class="{ active: isGangMode }"
          @click="changeMode('gang')"
          title="Gang Sheet Mode"
        >
          <Layers :size="18" :stroke-width="2" />
          <span>Gang Sheet</span>
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: isDtfMode }"
          @click="changeMode('dtf')"
          title="DTF Transfer Mode"
        >
          <Sparkles :size="18" :stroke-width="2" />
          <span>DTF Transfer</span>
        </button>
      </div>

      <div class="divider" />

      <!-- History Controls -->
      <div class="tool-group history">
        <button 
          class="tool-btn icon-only" 
          :disabled="!canUndo" 
          title="Undo (Ctrl+Z)"
          @click="editorStore.undo()"
        >
          <Undo2 :size="18" :stroke-width="2" />
        </button>
        <button 
          class="tool-btn icon-only" 
          :disabled="!canRedo" 
          title="Redo (Ctrl+Y)"
          @click="editorStore.redo()"
        >
          <Redo2 :size="18" :stroke-width="2" />
        </button>
      </div>

      <div class="divider" />

      <!-- Add Tools -->
      <div class="tool-group add-tools">
        <button class="tool-btn" title="Upload Image" @click="handleUpload">
          <Image :size="18" :stroke-width="2" />
          <span class="label">Image</span>
        </button>
        <button class="tool-btn" title="Add Text" @click="editorStore.addText()">
          <Type :size="18" :stroke-width="2" />
          <span class="label">Text</span>
        </button>
        <button class="tool-btn icon-only" title="Rectangle" @click="editorStore.addRect()">
          <Square :size="18" :stroke-width="2" />
        </button>
        <button class="tool-btn icon-only" title="Circle" @click="editorStore.addCircle()">
          <Circle :size="18" :stroke-width="2" />
        </button>
        <button class="tool-btn icon-only" title="Line" @click="editorStore.addLine()">
          <Minus :size="18" :stroke-width="2" />
        </button>
      </div>

      <div class="divider" />

      <!-- Option C: AI Tools -->
      <div class="tool-group ai-tools">
        <button 
          class="tool-btn ai-btn" 
          :disabled="aiOptimizing || editorStore.items.length === 0"
          title="AI Auto-Pack (Quick)"
          @click="handleAIAutoPack"
        >
          <Zap v-if="!aiOptimizing" :size="18" :stroke-width="2" />
          <Loader2 v-else :size="18" class="spinner" />
          <span class="label">AI Pack</span>
        </button>
        <button 
          class="tool-btn icon-only" 
          :disabled="editorStore.items.length === 0"
          title="AI Pack Settings"
          @click="showAIDialog = true"
        >
          <Settings :size="18" :stroke-width="2" />
        </button>
      </div>
      
      <!-- AI Packing Dialog -->
      <AIPackingDialog v-model="showAIDialog" @optimize="handleAIPackWithSettings" />

      <div class="divider" />

      <!-- Grid Controls -->
      <div class="tool-group">
        <label class="tool-toggle">
          <input type="checkbox" v-model="editorStore.gridEnabled" />
          <Grid3x3 :size="18" :stroke-width="2" />
          <span class="label">Grid</span>
        </label>
      </div>
    </div>

    <div class="topbar-section right">
      <!-- Save Status -->
      <div v-if="lastSavedLabel" class="save-status">
        <Loader2 v-if="isSaving" :size="14" class="spinner" />
        <div v-else class="save-indicator success" />
        <span class="save-text">{{ lastSavedLabel }}</span>
      </div>
      <div v-else-if="isAnonymous" class="save-status">
        <div class="save-indicator" />
        <span class="save-text">Auto-saving locally</span>
      </div>

      <!-- Export -->
      <button class="tool-btn secondary" title="Export PNG" @click="editorStore.exportAs('image/png')">
        <Download :size="18" :stroke-width="2" />
        <span class="label">Export</span>
      </button>

      <!-- Checkout -->
      <button 
        class="tool-btn primary" 
        title="Proceed to Checkout"
        :disabled="isSaving"
        @click="handleCheckout"
      >
        <ShoppingCart :size="18" :stroke-width="2" />
        <span class="label">Checkout</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  gap: 24px;
  min-height: 64px;
}

.topbar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar-section.left {
  flex-shrink: 0;
}

.topbar-section.center {
  flex: 1;
  justify-content: center;
  max-width: 800px;
}

.topbar-section.right {
  flex-shrink: 0;
}

/* Brand */
.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 10px;
  color: white;
  flex-shrink: 0;
}

.brand-logo svg {
  width: 22px;
  height: 22px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 11px;
  color: #6b7280;
  line-height: 1;
}

/* Tool Groups */
.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.tool-group.history,
.tool-group.add-tools {
  gap: 2px;
}

/* Tool Buttons */
.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tool-btn.icon-only {
  padding: 8px;
  min-width: 36px;
  justify-content: center;
}

.tool-btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #111827;
}

.tool-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.primary {
  background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
}

.tool-btn.primary:hover:not(:disabled) {
  background: linear-gradient(180deg, #4f46e5 0%, #4338ca 100%);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.4);
}

.tool-btn.secondary {
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.tool-btn.secondary:hover:not(:disabled) {
  border-color: #d1d5db;
  background: #f9fafb;
}

.tool-btn .label {
  font-size: 13px;
}

/* Toggle */
.tool-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s ease;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
}

.tool-toggle:hover {
  background: #f3f4f6;
}

.tool-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid #d1d5db;
  appearance: none;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  flex-shrink: 0;
}

.tool-toggle input[type="checkbox"]:checked {
  background: #6366f1;
  border-color: #6366f1;
}

.tool-toggle input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 7px;
  border: solid white;
  border-width: 0 2px 2px 0;
  rotate: 45deg;
  margin-top: -1px;
}

/* Mode Switch */
.mode-switch-group {
  display: flex;
  gap: 2px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 4px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.mode-btn:hover:not(.active) {
  background: #f3f4f6;
  color: #374151;
}

.mode-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

/* Divider */
.divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  flex-shrink: 0;
}

/* Save Status */
.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  color: #6b7280;
}

.save-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  flex-shrink: 0;
}

.save-indicator.success {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.save-text {
  white-space: nowrap;
}

.spinner {
  animation: spin 1s linear infinite;
  color: #6366f1;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* AI Tools */
.ai-tools .ai-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  position: relative;
  overflow: hidden;
}

.ai-tools .ai-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2s infinite;
}

.ai-tools .ai-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.ai-tools .ai-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* Responsive */
@media (max-width: 1200px) {
  .topbar-section.center {
    flex: 0 1 auto;
  }
  
  .tool-btn .label {
    display: none;
  }
  
  .tool-btn:not(.icon-only) {
    padding: 8px;
  }
  
  .brand-text {
    display: none;
  }
}

@media (max-width: 768px) {
  .editor-topbar {
    padding: 8px 12px;
    gap: 12px;
  }
  
  .save-status {
    display: none;
  }
  
  .tool-group:not(.history) {
    display: none;
  }
}
</style>

