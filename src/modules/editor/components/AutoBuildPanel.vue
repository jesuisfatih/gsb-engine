<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useEditorStore } from "../store/editorStore";
import { useGangSheetStore } from "../store/gangSheetStore";

const editor = useEditorStore();
const gang = useGangSheetStore();
const { autoSettings } = storeToRefs(gang);

const marginLabel = computed(() => `${autoSettings.value.marginIn.toFixed(3)} in`);
const spacingLabel = computed(() => `${autoSettings.value.spacingIn.toFixed(3)} in`);

function updateMargin(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  gang.updateAutoSetting("marginIn", Math.max(0, value));
}

function updateSpacing(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  gang.updateAutoSetting("spacingIn", Math.max(0, value));
}

function toggle(key: "rotateAlternating" | "allowFlip" | "breakByColor") {
  gang.updateAutoSetting(key, !autoSettings.value[key]);
}

function runAutoArrange() {
  const spacingPx = Math.max(0, autoSettings.value.spacingIn * editor.ppi);
  const marginPx = Math.max(0, Math.round(autoSettings.value.marginIn * editor.ppi));
  editor.marginPx = marginPx;
  editor.autoArrange(Math.round(spacingPx));
}
</script>

<template>
  <div class="auto-panel">
    <div class="panel-head">
      <h3>Auto Build</h3>
      <button @click="runAutoArrange">Apply</button>
    </div>

    <details class="auto-section" open>
      <summary>Layout Bounds</summary>
      <div class="section-body">
        <div class="field">
          <label>Sheet Margin (in)</label>
          <div class="field-row">
            <input type="number" min="0" step="0.01" :value="autoSettings.marginIn" @input="updateMargin" />
            <span>{{ marginLabel }}</span>
          </div>
        </div>
        <div class="field">
          <label>Spacing Between Copies (in)</label>
          <div class="field-row">
            <input type="number" min="0" step="0.01" :value="autoSettings.spacingIn" @input="updateSpacing" />
            <span>{{ spacingLabel }}</span>
          </div>
        </div>
      </div>
    </details>

    <details class="auto-section" open>
      <summary>Packing Rules</summary>
      <div class="section-body toggles">
        <label>
          <input type="checkbox" :checked="autoSettings.rotateAlternating" @change="toggle('rotateAlternating')" />
          Alternate rotation for every other copy
        </label>
        <label>
          <input type="checkbox" :checked="autoSettings.allowFlip" @change="toggle('allowFlip')" />
          Allow horizontal flips to pack tighter
        </label>
        <label>
          <input type="checkbox" :checked="autoSettings.breakByColor" @change="toggle('breakByColor')" />
          Separate gang sheet by spot color
        </label>
      </div>
    </details>
  </div>
</template>

<style scoped>
.auto-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 14px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(248, 250, 255, 0.96);
  padding-bottom: 6px;
}
.panel-head h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
.panel-head button {
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}
.auto-section {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  background: rgba(248, 250, 255, 0.9);
  overflow: hidden;
}
.auto-section summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
  list-style: none;
  background: rgba(226, 232, 240, 0.45);
}
.auto-section summary::-webkit-details-marker {
  display: none;
}
.auto-section summary::after {
  content: "▾";
  font-size: 10px;
  color: #475569;
  transition: transform 0.2s ease;
}
.auto-section[open] summary::after {
  transform: rotate(180deg);
}
.section-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 16px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 12px;
}

.section-body::-webkit-scrollbar {
  width: 6px;
}

.section-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.section-body::-webkit-scrollbar-track {
  background: transparent;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 11px;
  color: #6b7280;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-row input {
  width: 90px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}
.field-row span {
  font-size: 11px;
  color: #4b5563;
}
.toggles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #374151;
}
.toggles label {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.3;
}
.toggles input[type="checkbox"] {
  accent-color: #111827;
}
.panel-head button:hover {
  background: #0f172a;
}
.v-theme--dark .auto-panel {
  padding: 16px;
  background: rgba(26, 30, 49, 0.9);
  border-radius: 14px;
}
.v-theme--dark .auto-section {
  border-color: rgba(96, 112, 168, 0.35);
  background: rgba(34, 39, 62, 0.65);
}
.v-theme--dark .auto-section summary {
  background: rgba(63, 71, 114, 0.55);
  color: rgba(226, 232, 240, 0.94);
}
.v-theme--dark .panel-head {
  background: rgba(34, 39, 62, 0.9);
}
.v-theme--dark .auto-section summary::after {
  color: rgba(203, 213, 225, 0.7);
}
.v-theme--dark .section-body {
  color: rgba(226, 232, 240, 0.86);
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}
.v-theme--dark .field-row input {
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(24, 29, 49, 0.8);
  color: rgba(226, 232, 240, 0.92);
}
.v-theme--dark .field label,
.v-theme--dark .field-row span,
.v-theme--dark .toggles {
  color: rgba(203, 213, 225, 0.78);
}
</style>


