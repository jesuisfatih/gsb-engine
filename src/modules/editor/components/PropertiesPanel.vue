<script setup lang="ts">
import { computed, ref } from "vue";
import { pxToMm } from "../utils/units";
import { FONT_LIBRARY } from "../constants/fonts";
import { useEditorStore } from "../store/editorStore";

const store = useEditorStore();
const selected = computed(() => store.selected);
const fonts = FONT_LIBRARY;
const removingBg = ref(false);

const currentFont = computed(() => {
  if (!selected.value || selected.value.kind !== "text") return fonts[0]?.value ?? "";
  return ((selected.value as any).fontFamily as string) || fonts[0]?.value || "";
});

const customFontOption = computed(() => {
  const value = currentFont.value;
  if (!value) return null;
  return fonts.some(font => font.value === value) ? null : value;
});

const sizeMetrics = computed(() => {
  if (!selected.value) return null;
  const item = selected.value as any;
  const width = item.width ?? (item.radius ? item.radius * 2 : undefined);
  const height = item.height ?? (item.radius ? item.radius * 2 : undefined);
  if (width === undefined || height === undefined) return null;
  const widthMm = Math.round(pxToMm(width, store.ppi) * 10) / 10;
  const heightMm = Math.round(pxToMm(height, store.ppi) * 10) / 10;
  return {
    widthPx: Math.round(width),
    heightPx: Math.round(height),
    widthMm,
    heightMm,
  };
});

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function removeBackground() {
  if (!selected.value || selected.value.kind !== "image") return;
  if (removingBg.value) return;
  removingBg.value = true;
  const ok = await store.removeImageBackground(selected.value.id);
  removingBg.value = false;
  if (!ok) alert("Could not remove background for this image.");
}
</script>

<template>
  <div class="section-body properties">
    <template v-if="selected">
      <details class="group" open>
        <summary>Placement</summary>
        <div class="group-body">
          <div class="row">
            <label>Name</label>
            <input v-model="(selected as any).name" />
          </div>
          <div class="row">
            <label>X</label>
            <input
              type="number"
              :value="(selected as any).x"
              @input="store.updateItemPartial(selected!.id, { x: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="row">
            <label>Y</label>
            <input
              type="number"
              :value="(selected as any).y"
              @input="store.updateItemPartial(selected!.id, { y: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="row" v-if="(selected as any).width !== undefined">
            <label>Width</label>
            <input
              type="number"
              :value="(selected as any).width"
              @input="store.updateItemPartial(selected!.id, { width: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="row" v-if="(selected as any).height !== undefined">
            <label>Height</label>
            <input
              type="number"
              :value="(selected as any).height"
              @input="store.updateItemPartial(selected!.id, { height: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="row" v-if="(selected as any).radius !== undefined">
            <label>Radius</label>
            <input
              type="number"
              :value="(selected as any).radius"
              @input="store.updateItemPartial(selected!.id, { radius: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="row">
            <label>Rotation</label>
            <input
              type="number"
              :value="(selected as any).rotation"
              @input="store.updateItemPartial(selected!.id, { rotation: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="row" v-if="sizeMetrics">
            <label>Size</label>
            <div class="metric-stack">
              <span>{{ sizeMetrics.widthPx }}px x {{ sizeMetrics.heightPx }}px</span>
              <span>{{ sizeMetrics.widthMm }}mm x {{ sizeMetrics.heightMm }}mm</span>
            </div>
          </div>
          <div class="row">
          <label>Quick Align</label>
          <div class="row-actions">
            <button class="inline-btn" @click="store.alignSelectedToChest()">Align To Chest</button>
            <button class="inline-btn ghost" @click="store.snapSelectionToSafeArea()">Snap Inside Safe Area</button>
          </div>
        </div>
        </div>
      </details>

      <details class="group" open v-if="selected!.kind === 'text'">
        <summary>Typography</summary>
        <div class="group-body">
          <div class="row">
            <label>Text</label>
            <input
              :value="(selected as any).text"
              @input="store.updateItemPartial(selected!.id, { text: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="row">
            <label>Font Size</label>
            <input
              type="number"
              :value="(selected as any).fontSize"
              @input="store.updateItemPartial(selected!.id, { fontSize: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="row">
            <label>Font Family</label>
            <select
              :value="currentFont"
              @change="store.updateItemPartial(selected!.id, { fontFamily: ($event.target as HTMLSelectElement).value })"
            >
              <option v-if="customFontOption" :value="customFontOption">
                {{ customFontOption }}
              </option>
              <option v-for="font in fonts" :key="font.value" :value="font.value">
                {{ font.label }}
              </option>
            </select>
          </div>
          <div class="row">
            <label>Alignment</label>
            <select
              :value="(selected as any).align || 'left'"
              @change="store.updateItemPartial(selected!.id, { align: ($event.target as HTMLSelectElement).value })"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </div>
        </div>
      </details>

      <details class="group" open v-if="selected!.kind !== 'image'">
        <summary>Appearance</summary>
        <div class="group-body">
          <div class="row" v-if="(selected as any).fill !== undefined">
            <label>Fill</label>
            <input
              type="color"
              :value="(selected as any).fill"
              @input="store.updateItemPartial(selected!.id, { fill: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="row" v-if="(selected as any).stroke !== undefined">
            <label>Stroke</label>
            <input
              type="color"
              :value="(selected as any).stroke"
              @input="store.updateItemPartial(selected!.id, { stroke: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="row" v-if="(selected as any).strokeWidth !== undefined">
            <label>Stroke W</label>
            <input
              type="number"
              :value="(selected as any).strokeWidth"
              @input="store.updateItemPartial(selected!.id, { strokeWidth: num(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
      </details>

      <details class="group" open v-if="selected!.kind === 'image'">
        <summary>Image Tools</summary>
        <div class="group-body">
          <div class="row">
            <label>Remove BG</label>
            <button class="inline-btn" :disabled="removingBg" @click="removeBackground">
              {{ removingBg ? "Removing..." : "Clean background" }}
            </button>
          </div>
        </div>
      </details>
    </template>
    <div v-else class="muted">No selection</div>
  </div>
</template>

<style scoped>
.section-body.properties {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9ff 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
  font-family: "Public Sans", "Inter", system-ui, sans-serif;
}

.group {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
}

.group summary {
  padding: 10px 14px;
  font: 600 13px/1.3 var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  list-style: none;
  cursor: pointer;
  background: linear-gradient(90deg, rgba(14, 116, 144, 0.16), rgba(255, 255, 255, 0));
  color: #102a43;
}

.group summary::-webkit-details-marker {
  display: none;
}

.group summary::after {
  content: "\25BC";
  float: right;
  transition: transform 0.2s ease;
  font-size: 12px;
  color: rgba(16, 42, 67, 0.7);
}

.group[open] summary::after {
  transform: rotate(180deg);
}

.group-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 16px;
}

.row {
  display: grid;
  align-items: center;
  gap: 10px;
  grid-template-columns: 120px 1fr;
}

.row label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #475569;
}

input[type="number"],
input[type="text"],
input,
select {
  appearance: none;
  border: 1px solid rgba(14, 116, 144, 0.25);
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f1fbff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 12px 20px rgba(14, 116, 144, 0.08);
  padding-block: 9px;
  padding-inline: 14px;
  padding-right: 42px;
  color: #0f172a;
  font: 600 13px/1.25 var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%234c1d95' d='M6.293 9.293a1 1 0 0 1 1.414 0L12 13.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 14px;
}

input[type="number"]:focus,
input[type="text"]:focus,
input:focus,
select:focus {
  border-color: rgba(14, 116, 144, 0.7);
  box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.18);
  outline: none;
}

.inline-btn {
  border: 1px solid rgba(14, 116, 144, 0.8);
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  color: #fff;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  font-weight: 600;
  font-family: var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
}

.inline-btn.ghost {
  background: rgba(14, 116, 144, 0.06);
  color: #0f172a;
  border-color: rgba(14, 116, 144, 0.35);
  box-shadow: none;
}

.inline-btn.ghost:not(:disabled):hover {
  background: rgba(14, 116, 144, 0.12);
  box-shadow: none;
}

.inline-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

.inline-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(14, 116, 144, 0.25);
}

.metric-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-weight: 600;
  font-size: 12px;
  color: #0f172a;
  font-family: var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.muted {
  padding: 6px;
  color: #9ca3af;
  font-size: 12px;
  font-family: var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
}
</style>
