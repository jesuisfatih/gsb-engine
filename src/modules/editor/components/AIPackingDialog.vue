<template>
  <v-dialog v-model="show" max-width="600px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="margin-right: 12px;">
          <path d="M12 2l3.5 7 7.5 1-5.5 5.5 1.5 7.5-7-4-7 4 1.5-7.5L1 10l7.5-1L12 2z" fill="#8b5cf6" stroke="#8b5cf6" stroke-width="1.5" />
        </svg>
        <span style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700;">
          AI Auto-Pack Settings
        </span>
        <v-spacer />
        <v-btn icon size="small" @click="show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <div class="mb-6">
          <label class="label">Packing Algorithm</label>
          <v-select
            v-model="settings.algorithm"
            :items="algorithmOptions"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <p class="hint">{{ getAlgorithmDescription(settings.algorithm) }}</p>
        </div>

        <div class="mb-6">
          <label class="label">Margin Between Items</label>
          <v-slider
            v-model="settings.margin"
            :min="0"
            :max="50"
            :step="1"
            thumb-label
            hide-details
            color="purple"
          >
            <template #append>
              <span class="value-label">{{ settings.margin }}px</span>
            </template>
          </v-slider>
        </div>

        <div class="mb-6">
          <label class="label">Target Utilization</label>
          <v-slider
            v-model="settings.targetUtilization"
            :min="70"
            :max="100"
            :step="1"
            thumb-label
            hide-details
            color="purple"
          >
            <template #append>
              <span class="value-label">{{ settings.targetUtilization }}%</span>
            </template>
          </v-slider>
        </div>

        <div class="mb-6">
          <v-switch
            v-model="settings.allowRotation"
            label="Allow Item Rotation"
            color="purple"
            hide-details
          />
          <p class="hint">Items can be rotated 90° for better packing</p>
        </div>

        <div class="mb-6">
          <v-switch
            v-model="settings.respectGroups"
            label="Respect Item Groups"
            color="purple"
            hide-details
          />
          <p class="hint">Keep grouped items together</p>
        </div>

        <v-divider class="my-4" />

        <div class="stats-preview">
          <h3 class="stats-title">Current Stats</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Items</div>
              <div class="stat-value">{{ itemCount }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Utilization</div>
              <div class="stat-value">{{ currentUtilization.toFixed(1) }}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Sheet Size</div>
              <div class="stat-value">{{ sheetSize }}</div>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="show = false">Cancel</v-btn>
        <v-spacer />
        <v-btn
          color="purple"
          variant="elevated"
          :loading="optimizing"
          @click="handleOptimize"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
            <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="currentColor" />
          </svg>
          Optimize Now
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from '../store/editorStore';

const show = defineModel<boolean>({ default: false });
const emit = defineEmits<{
  optimize: [settings: PackingSettings];
}>();

interface PackingSettings {
  algorithm: 'shelf' | 'maxrects' | 'genetic';
  margin: number;
  targetUtilization: number;
  allowRotation: boolean;
  respectGroups: boolean;
}

const editorStore = useEditorStore();
const optimizing = ref(false);

const settings = ref<PackingSettings>({
  algorithm: 'maxrects',
  margin: 8,
  targetUtilization: 95,
  allowRotation: true,
  respectGroups: false,
});

const algorithmOptions = [
  { title: 'Shelf (Fast)', value: 'shelf' },
  { title: 'MaxRects (Balanced)', value: 'maxrects' },
  { title: 'Genetic (Best)', value: 'genetic' },
];

function getAlgorithmDescription(algo: string): string {
  const descriptions = {
    shelf: 'Fast packing using shelf algorithm. Good for similar-sized items.',
    maxrects: 'Balanced approach with good utilization. Recommended for most cases.',
    genetic: 'AI-powered evolutionary algorithm. Best utilization but slower.',
  };
  return descriptions[algo as keyof typeof descriptions] || '';
}

const itemCount = computed(() => editorStore.items.length);
const currentUtilization = computed(() => {
  const totalArea = editorStore.items.reduce((sum, item: any) => {
    return sum + (item.width || 100) * (item.height || 100);
  }, 0);
  const sheetArea = editorStore.sheetWpx * editorStore.sheetHpx;
  return (totalArea / sheetArea) * 100;
});
const sheetSize = computed(() => `${editorStore.sheetWin}"×${editorStore.sheetHin}"`);

async function handleOptimize() {
  optimizing.value = true;
  try {
    emit('optimize', { ...settings.value });
    setTimeout(() => {
      optimizing.value = false;
      show.value = false;
    }, 1500);
  } catch (error) {
    console.error('[AI Pack] Optimization failed:', error);
    optimizing.value = false;
  }
}
</script>

<style scoped>
.label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  margin-bottom: 0;
}

.value-label {
  font-size: 14px;
  font-weight: 600;
  color: #8b5cf6;
  min-width: 50px;
  text-align: right;
}

.stats-preview {
  background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
  border-radius: 8px;
  padding: 16px;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b21a8;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 11px;
  color: #7c3aed;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #6b21a8;
}
</style>

