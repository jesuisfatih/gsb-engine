<template>
  <v-dialog v-model="show" max-width="700px">
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="margin-right: 12px;">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span style="font-weight: 700;">Export Presets Manager</span>
        <v-spacer />
        <v-btn icon size="small" @click="show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Quick Export Buttons -->
        <div class="quick-exports">
          <button 
            v-for="preset in quickPresets" 
            :key="preset.id"
            class="preset-btn"
            @click="exportWithPreset(preset)"
          >
            <span class="preset-icon">{{ preset.icon }}</span>
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-desc">{{ preset.description }}</span>
          </button>
        </div>

        <v-divider class="my-4" />

        <!-- Custom Presets -->
        <div class="custom-presets">
          <h3>Custom Presets</h3>
          <div 
            v-for="preset in customPresets" 
            :key="preset.id"
            class="custom-preset-item"
          >
            <div class="preset-info">
              <div class="preset-title">{{ preset.name }}</div>
              <div class="preset-settings">
                {{ preset.format.toUpperCase() }} • {{ preset.dpi }} DPI • 
                Q{{ preset.quality }}
              </div>
            </div>
            <div class="preset-actions">
              <button @click="exportWithPreset(preset)">Export</button>
              <button @click="editPreset(preset)">Edit</button>
              <button @click="deletePreset(preset.id)" class="danger">Delete</button>
            </div>
          </div>

          <button class="add-preset-btn" @click="showCreateDialog = true">
            + Create New Preset
          </button>
        </div>

        <v-divider class="my-4" />

        <!-- Batch Export -->
        <div class="batch-export">
          <h3>🚀 Batch Export</h3>
          <p>Export with multiple presets at once</p>
          
          <div class="batch-options">
            <label class="batch-checkbox">
              <input type="checkbox" v-model="batchOptions.print" />
              <span>Print Quality (PNG, 300 DPI)</span>
            </label>
            <label class="batch-checkbox">
              <input type="checkbox" v-model="batchOptions.web" />
              <span>Web Quality (JPG, 72 DPI)</span>
            </label>
            <label class="batch-checkbox">
              <input type="checkbox" v-model="batchOptions.preview" />
              <span>Preview (PNG, 150 DPI)</span>
            </label>
            <label class="batch-checkbox">
              <input type="checkbox" v-model="batchOptions.pdf" />
              <span>PDF Document</span>
            </label>
          </div>

          <button class="batch-export-btn" @click="batchExport">
            📦 Export All Selected
          </button>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Create Preset Dialog -->
  <v-dialog v-model="showCreateDialog" max-width="500px">
    <v-card>
      <v-card-title>Create Export Preset</v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <div class="form-field">
          <label>Preset Name</label>
          <input v-model="newPreset.name" type="text" placeholder="e.g., High Quality Print" />
        </div>
        <div class="form-field">
          <label>Format</label>
          <select v-model="newPreset.format">
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="pdf">PDF</option>
            <option value="svg">SVG</option>
          </select>
        </div>
        <div class="form-field">
          <label>DPI</label>
          <input v-model.number="newPreset.dpi" type="number" step="1" />
        </div>
        <div class="form-field">
          <label>Quality (1-100)</label>
          <input v-model.number="newPreset.quality" type="range" min="1" max="100" />
          <span>{{ newPreset.quality }}</span>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn @click="showCreateDialog = false">Cancel</v-btn>
        <v-spacer />
        <v-btn color="primary" @click="createPreset">Create Preset</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const show = defineModel<boolean>({ default: false });
const showCreateDialog = ref(false);

interface ExportPreset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  format: 'png' | 'jpg' | 'pdf' | 'svg';
  dpi: number;
  quality: number;
  options?: any;
}

const quickPresets: ExportPreset[] = [
  {
    id: 'print-quality',
    name: 'Print Quality',
    description: 'PNG, 300 DPI, Lossless',
    icon: '🖨️',
    format: 'png',
    dpi: 300,
    quality: 100
  },
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    description: 'JPG, 72 DPI, Optimized',
    icon: '🌐',
    format: 'jpg',
    dpi: 72,
    quality: 85
  },
  {
    id: 'preview',
    name: 'Preview',
    description: 'PNG, 150 DPI, Fast',
    icon: '👁️',
    format: 'png',
    dpi: 150,
    quality: 90
  },
  {
    id: 'pdf-document',
    name: 'PDF Document',
    description: 'PDF, Vector, Archive',
    icon: '📄',
    format: 'pdf',
    dpi: 300,
    quality: 100
  }
];

const customPresets = ref<ExportPreset[]>([]);

const batchOptions = ref({
  print: false,
  web: false,
  preview: false,
  pdf: false
});

const newPreset = ref<ExportPreset>({
  id: '',
  name: '',
  format: 'png',
  dpi: 300,
  quality: 100
});

function exportWithPreset(preset: ExportPreset) {
  console.log('[Export] Exporting with preset:', preset.name);
  // TODO: Implement actual export
  alert(`Exporting as ${preset.format.toUpperCase()} at ${preset.dpi} DPI...`);
}

function createPreset() {
  const preset: ExportPreset = {
    ...newPreset.value,
    id: Date.now().toString()
  };
  customPresets.value.push(preset);
  showCreateDialog.value = false;
  
  // Reset form
  newPreset.value = {
    id: '',
    name: '',
    format: 'png',
    dpi: 300,
    quality: 100
  };
}

function editPreset(preset: ExportPreset) {
  newPreset.value = { ...preset };
  showCreateDialog.value = true;
}

function deletePreset(id: string) {
  if (!confirm('Delete this preset?')) return;
  customPresets.value = customPresets.value.filter(p => p.id !== id);
}

function batchExport() {
  const selected = [];
  if (batchOptions.value.print) selected.push(quickPresets[0]);
  if (batchOptions.value.web) selected.push(quickPresets[1]);
  if (batchOptions.value.preview) selected.push(quickPresets[2]);
  if (batchOptions.value.pdf) selected.push(quickPresets[3]);
  
  if (selected.length === 0) {
    alert('Please select at least one format');
    return;
  }
  
  console.log('[Export] Batch exporting:', selected.length, 'formats');
  alert(`Batch exporting ${selected.length} formats...\n\n${selected.map(p => `✓ ${p.name}`).join('\n')}`);
}
</script>

<style scoped>
.quick-exports {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: start;
  padding: 16px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-2px);
}

.preset-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.preset-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.preset-desc {
  font-size: 11px;
  color: #6b7280;
}

.custom-presets h3,
.batch-export h3 {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
}

.custom-preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 8px;
}

.preset-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.preset-settings {
  font-size: 11px;
  color: #6b7280;
}

.preset-actions {
  display: flex;
  gap: 6px;
}

.preset-actions button {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-actions button:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.preset-actions button.danger {
  border-color: #fecaca;
  color: #dc2626;
}

.preset-actions button.danger:hover {
  border-color: #dc2626;
  background: #fef2f2;
}

.add-preset-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.add-preset-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.batch-export p {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 12px;
}

.batch-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.batch-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.batch-checkbox:hover {
  background: #f3f4f6;
}

.batch-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.batch-checkbox span {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.batch-export-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.form-field input,
.form-field select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}

.form-field input[type="range"] {
  padding: 0;
}
</style>

