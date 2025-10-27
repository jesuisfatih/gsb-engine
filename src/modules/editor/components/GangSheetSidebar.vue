<script setup lang="ts">
import { computed, watch } from "vue";
import { useEditorStore } from "../store/editorStore";
import { useGangSheetStore } from "../store/gangSheetStore";
import { pxToIn } from "../utils/units";

const editor = useEditorStore();
const gang = useGangSheetStore();
const autoSettings = computed(() => gang.autoSettings);

const sheetAreaIn2 = computed(() => {
  const widthIn = pxToIn(editor.sheetWpx, editor.ppi);
  const heightIn = pxToIn(editor.sheetHpx, editor.ppi);
  return widthIn * heightIn || 1;
});

const utilization = computed(() => {
  const used = editor.usedAreaIn2;
  const base = sheetAreaIn2.value;
  return Math.max(0, Math.min(1, used / base));
});

watch(utilization, value => {
  gang.setUtilization(value);
}, { immediate: true });

const sheets = computed(() => gang.sheets);
const activeSheetId = computed(() => gang.activeSheetId);

function duplicate(id: string) {
  gang.duplicateSheet(id).catch(err => console.warn("[gang-sheet] duplicate failed", err));
}

function remove(id: string) {
  if (gang.sheets.length <= 1) return;
  if (!confirm('Remove this sheet?')) return;
  gang.removeSheet(id).catch(err => console.warn("[gang-sheet] remove failed", err));
}

function updateQuantity(id: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  gang.setQuantity(id, value);
}

function selectSheet(id: string) {
  gang.setActiveSheet(id);
}

function openAutoBuild() {
  const spacingPx = Math.round(autoSettings.value.spacingIn * editor.ppi);
  editor.autoArrange(spacingPx);
}

function resetGang() {
  if (!confirm('Reset gang sheets and clear current design?')) return;
  gang.reset();
  editor.clearDesign();
  gang.setUtilization(0);
}

function newSheet() {
  gang.createSheet().catch(err => console.warn("[gang-sheet] create failed", err));
}

const coverageLabel = computed(() => `${Math.round(utilization.value * 100)}%`);

const sheetSizeLabel = computed(() => {
  const widthIn = pxToIn(editor.sheetWpx, editor.ppi).toFixed(2);
  const heightIn = pxToIn(editor.sheetHpx, editor.ppi).toFixed(2);
  return `${widthIn}" x ${heightIn}"`;
});

function formatAutosaveAt(timestamp?: string | null) {
  if (!timestamp) return "No autosave";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "No autosave";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 45_000) return "Just now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 90) return `${minutes}m ago`;
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 48) return `${hours}h ago`;
  return date.toLocaleDateString();
}
</script>

<template>
  <div class="sheet-panel">
    <div v-if="gang.error" class="notice error">
      Gang sheet sync failed. Working offline.
    </div>
    <div v-else-if="gang.loading" class="notice">
      Loading gang sheets...
    </div>
    <div class="panel-head">
      <div class="panel-copy">
        <h3>Gang Sheets</h3>
        <p>{{ sheets.length }} sheet(s) | {{ sheetSizeLabel }}</p>
      </div>
      <div class="panel-actions">
        <div class="coverage">
          <span>Coverage</span>
          <strong>{{ coverageLabel }}</strong>
        </div>
        <button class="ghost" @click="newSheet">Add Sheet</button>
      </div>
    </div>

    <div class="sheet-list">
      <div
        v-for="sheet in sheets"
        :key="sheet.id"
        :class="['card', { active: sheet.id === activeSheetId }]"
      >
        <div class="card-top" @click="selectSheet(sheet.id)">
          <div class="thumb">
            <img v-if="sheet.previewUrl" :src="sheet.previewUrl" alt="Sheet preview" />
            <span v-else>{{ sheet.name.slice(0, 2).toUpperCase() }}</span>
          </div>
          <div class="card-meta">
            <strong>{{ sheet.name }}</strong>
            <span>{{ sheet.technique }} | {{ sheet.supplier }}</span>
          </div>
        </div>
        <div class="metrics">
          <div>
            <label>Quantity</label>
            <input type="number" min="1" :value="sheet.quantity" @input="updateQuantity(sheet.id, $event)" />
          </div>
          <div>
            <label>Utilization</label>
            <span class="chip">{{ Math.round(sheet.utilization * 100) }}%</span>
          </div>
          <div>
            <label>Status</label>
            <span class="chip muted">{{ sheet.status }}</span>
          </div>
          <div>
            <label>Autosave</label>
            <span class="chip muted">{{ formatAutosaveAt(sheet.autosaveAt) }}</span>
          </div>
        </div>
        <div class="actions">
          <button @click="selectSheet(sheet.id)">Focus</button>
          <button class="ghost" @click="duplicate(sheet.id)">Duplicate</button>
          <button class="ghost danger" :disabled="sheets.length <= 1" @click="remove(sheet.id)">Delete</button>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button class="primary" @click="openAutoBuild">Apply Auto Build</button>
      <button class="ghost" @click="resetGang">Reset & Clear</button>
    </div>
  </div>
</template>

<style scoped>
.notice {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  color: var(--text-muted);
}
.notice.error {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
  color: #b91c1c;
}
.sheet-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  background: var(--surface-card, #f8f8ff);
  border: 1px solid var(--divider, #e4e4ef);
  border-radius: 18px;
  box-shadow: var(--panel-glow, 0 12px 30px rgba(15, 23, 42, 0.08));
  height: 100%;
}
.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
}
.panel-copy h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(17, 24, 39, 0.9);
}
.panel-copy p {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(100, 116, 139, 0.82);
}
.panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.coverage {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.coverage span {
  font-size: 11px;
  color: rgba(100, 116, 139, 0.8);
}
.coverage strong {
  font-size: 18px;
  color: rgba(17, 24, 39, 0.95);
}
.sheet-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 100%;
  overflow-y: auto;
  padding-right: 6px;
  margin-right: -6px;
  scroll-behavior: smooth;
}

.sheet-list::-webkit-scrollbar {
  width: 6px;
}

.sheet-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.38);
  border-radius: 999px;
}

.sheet-list::-webkit-scrollbar-track {
  background: transparent;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.card.active {
  border-color: rgba(76, 29, 149, 0.4);
  box-shadow: 0 12px 24px rgba(76, 29, 149, 0.18);
}
.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.thumb {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.7);
  flex-shrink: 0;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-meta strong {
  font-size: 13px;
  color: #111827;
}
.card-meta span {
  font-size: 11px;
  color: #6b7280;
}
.metrics {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.metrics label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}
.metrics input {
  width: 70px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: #111827;
  color: #fff;
}
.chip.muted {
  background: #e5e7eb;
  color: #374151;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.actions button {
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}
.actions button.ghost {
  border-color: #d1d5db;
  background: #fff;
  color: #1f2937;
}
.actions button.danger {
  border-color: rgba(239, 68, 68, 0.6);
  color: rgba(185, 28, 28, 0.92);
}
.actions button.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #fff;
  color: rgba(156, 163, 175, 0.9);
}
.actions button:hover {
  background: #0f172a;
  color: #fff;
}
.actions button.ghost:hover {
  background: #f4f4f5;
  color: #1f2937;
}
.actions button.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
  color: rgba(220, 38, 38, 0.95);
}
.panel-footer {
  display: flex;
  gap: 8px;
  padding: 12px 0 0;
  border-top: 1px solid rgba(226, 232, 240, 0.7);
  position: sticky;
  bottom: 0;
  background: linear-gradient(180deg, rgba(248, 250, 255, 0.88) 0%, rgba(248, 250, 255, 1) 35%);
  padding-bottom: 12px;
}
.panel-footer .primary {
  flex: 1;
  border: 1px solid var(--editor-accent, #4c1d95);
  background: var(--editor-accent, #4c1d95);
  color: #fff;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
}
.panel-footer .ghost {
  flex-shrink: 0;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #1f2937;
  padding: 8px 12px;
  border-radius: 10px;
}
.ghost {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #1f2937;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}
.ghost:hover {
  background: #f4f4f5;
  color: #1f2937;
}
</style>

