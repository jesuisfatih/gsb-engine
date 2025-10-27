<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useEditorStore } from "../store/editorStore";
import { resolveMockup } from "../constants/mockups";

const store = useEditorStore();

const rotation = ref(0);
const scale = ref(1);
const offset = reactive({ x: 0, y: 0 });
const previewUrl = ref<string | null>(null);
let updateTimer: ReturnType<typeof setTimeout> | null = null;

const fabricColor = computed(() => store.color || "#f3f4f6");
const productSlug = computed(() => store.activeProduct?.slug);
const mockup = computed(() => resolveMockup(productSlug.value));
const surfaces = computed(() => store.activeProduct?.surfaces ?? []);

const clipId = computed(() => `mockup-clip-${store.surfaceId}`);
const gradientId = computed(() => `mockup-shade-${store.surfaceId}`);

const designFrame = computed(() => mockup.value.designFrame);

const clampedOffset = computed(() => {
  const frame = designFrame.value;
  const maxX = frame.width * 0.4;
  const maxY = frame.height * 0.4;
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
});

const designPosition = computed(() => {
  const frame = designFrame.value;
  const off = clampedOffset.value;
  const factor = scale.value;
  const scaledWidth = frame.width * factor;
  const scaledHeight = frame.height * factor;
  const adjustX = off.x - (scaledWidth - frame.width) / 2;
  const adjustY = off.y - (scaledHeight - frame.height) / 2;
  return {
    x: frame.x + adjustX,
    y: frame.y + adjustY,
    width: scaledWidth,
    height: scaledHeight,
    radius: frame.radius ?? 0,
  };
});

function capturePreview() {
  if (typeof store.capturePreview !== "function") return;
  const runner = () => {
    const data = store.capturePreview({ pixelRatio: 0.85 });
    previewUrl.value = data;
  };
  if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
    window.requestAnimationFrame(runner);
  } else {
    runner();
  }
}

function scheduleUpdate(immediate = false) {
  if (updateTimer) window.clearTimeout(updateTimer);
  const delay = immediate ? 80 : 260;
  updateTimer = window.setTimeout(() => {
    updateTimer = null;
    capturePreview();
  }, delay);
}

function selectSurface(surfaceId: string) {
  if (surfaceId === store.surfaceId) return;
  store.setSurface(surfaceId);
  scheduleUpdate(true);
}

onMounted(() => {
  scheduleUpdate(true);
});

onBeforeUnmount(() => {
  if (updateTimer) window.clearTimeout(updateTimer);
});

watch(
  () => store.items,
  () => scheduleUpdate(),
  { deep: true }
);

watch(
  () => [store.surfaceId, store.color, store.printTech],
  () => scheduleUpdate(true)
);

watch(() => store.scale, () => scheduleUpdate());

watch(designFrame, () => {
  offset.x = 0;
  offset.y = 0;
});

watch(
  () => [offset.x, offset.y],
  () => scheduleUpdate()
);

const rotationLabel = computed(() => `${Math.round(rotation.value)} deg`);
const scaleLabel = computed(() => `${Math.round(scale.value * 100)}%`);
const offsetLabelX = computed(() => `${Math.round(clampedOffset.value.x)} px`);
const offsetLabelY = computed(() => `${Math.round(clampedOffset.value.y)} px`);

</script>

<template>
  <div class="mockup-card">
    <div class="card-head">
      <span>Mockup Preview</span>
      <button class="refresh" @click="scheduleUpdate(true)">Refresh</button>
    </div>

    <div class="viewer">
      <div class="mockup-stage">
        <div
          class="mockup-figure"
          :style="{
            transform: `rotateY(${rotation}deg)`,
            '--fabric-color': fabricColor,
          }"
        >
          <svg :viewBox="mockup.viewBox" class="mockup-svg">
            <defs>
              <clipPath :id="clipId">
                <rect
                  :x="designPosition.x"
                  :y="designPosition.y"
                  :width="designPosition.width"
                  :height="designPosition.height"
                  :rx="designPosition.radius"
                  :ry="designPosition.radius"
                />
              </clipPath>
              <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#000" stop-opacity="0.08" />
                <stop offset="0.4" stop-color="#000" stop-opacity="0" />
                <stop offset="1" stop-color="#000" stop-opacity="0.12" />
              </linearGradient>
            </defs>

            <template v-for="(path, idx) in mockup.basePaths" :key="`base-${idx}`">
              <path :d="path.d" :fill="path.fill === 'var(--fabric-color)' ? fabricColor : path.fill" />
            </template>

            <template v-if="mockup.accentPaths">
              <path
                v-for="(path, idx) in mockup.accentPaths"
                :key="`shade-${idx}`"
                :d="path.d"
                :fill="path.fill === 'url(#shade)' ? `url(#${gradientId})` : path.fill"
                :opacity="path.opacity ?? 1"
              />
            </template>

            <template v-if="mockup.highlight">
              <path
                :d="mockup.highlight.d"
                :fill="mockup.highlight.fill"
                :opacity="mockup.highlight.opacity ?? 1"
              />
            </template>

            <template v-if="previewUrl">
              <image
                :href="previewUrl"
                :x="designPosition.x"
                :y="designPosition.y"
                :width="designPosition.width"
                :height="designPosition.height"
                preserveAspectRatio="xMidYMid meet"
                :clip-path="`url(#${clipId})`"
              />
            </template>
            <rect
              v-else
              :x="designPosition.x"
              :y="designPosition.y"
              :width="designPosition.width"
              :height="designPosition.height"
              :rx="designPosition.radius"
              :ry="designPosition.radius"
              fill="#eef1ff"
              stroke="#d4d8ff"
              stroke-dasharray="6 6"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
    </div>

    <div class="control">
      <label>Rotate</label>
      <input type="range" min="-45" max="45" v-model.number="rotation" />
      <span class="value">{{ rotationLabel }}</span>
    </div>

    <div class="control">
      <label>Scale</label>
      <input type="range" min="0.5" max="1.5" step="0.05" v-model.number="scale" />
      <span class="value">{{ scaleLabel }}</span>
    </div>

    <div class="control">
      <label>Offset X</label>
      <input type="range" min="-40" max="40" v-model.number="offset.x" />
      <span class="value">{{ offsetLabelX }}</span>
    </div>

    <div class="control">
      <label>Offset Y</label>
      <input type="range" min="-40" max="40" v-model.number="offset.y" />
      <span class="value">{{ offsetLabelY }}</span>
    </div>

    <div class="control" v-if="surfaces.length > 1">
      <label>Surface</label>
      <div class="surface-buttons">
        <button
          v-for="surface in surfaces"
          :key="surface.id"
          :class="{ active: surface.id === store.surfaceId }"
          @click="selectSurface(surface.id)"
        >
          {{ surface.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mockup-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #ececec;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font: 600 13px/1 system-ui;
}

.refresh {
  border: 1px solid #d0d0d0;
  background: #fff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  color: #444;
}

.refresh:hover {
  background: #f3f3f3;
}

.viewer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
}

.mockup-stage {
  width: 240px;
  height: 260px;
  perspective: 1200px;
}

.mockup-figure {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
  position: relative;
}

.mockup-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 12px 32px rgba(15, 23, 42, 0.16));
  border-radius: 12px;
  background: transparent;
}

.control {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 500 12px/1 system-ui;
}

.control input[type="range"] {
  flex: 1;
}

.value {
  min-width: 48px;
  text-align: right;
  color: #6b7280;
}

.surface-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.surface-buttons button {
  border: 1px solid #d0d0d0;
  background: #f9f9f9;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 18px;
  cursor: pointer;
}

.surface-buttons button.active {
  background: #6750a4;
  border-color: #6750a4;
  color: #fff;
}

.surface-buttons button:hover {
  background: #ece9ff;
}
</style>


