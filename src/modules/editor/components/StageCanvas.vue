<script setup lang="ts">
// @ts-nocheck - Konva typing noise, runtime tested in dev
import type Konva from "konva";
import type { LayerItem, TextItem } from "../types";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { snapPoint, snapToObjects } from "../engine/snapping";
import { useEditorStore, approximateBounds } from "../store/editorStore";
import { loadHTMLImageFromURL } from "../utils/imageLoader";
import { useEditorModeStore } from "../store/editorModeStore";
import { useGangSheetStore } from "../store/gangSheetStore";
import { pxToIn } from "../utils/units";

const store = useEditorStore();
const modeStore = useEditorModeStore();
const gangStore = useGangSheetStore();

const wrap = ref<HTMLDivElement | null>(null);
const stageRef = ref<any>(null);
const layerRef = ref<any>(null);
const trRef = ref<any>(null);
const gangTopbarRef = ref<HTMLDivElement | null>(null);

const isPanning = ref(false);
const draggingOver = ref(false);
const imageMap = ref<Record<string, HTMLImageElement | null>>({});
const productBackgroundImage = ref<HTMLImageElement | null>(null);

const viewport = reactive({ w: 0, h: 0 });
const zoom = ref(1);
const pan = reactive({ x: 0, y: 0 });
const allSelected = ref(false);
const showGangOverview = ref(false);
const gangTopbarPos = reactive({ x: 28, y: 28 });
const gangTopbarDrag = reactive({ active: false, pointerId: -1, offsetX: 0, offsetY: 0 });
const textEdit = reactive({
  active: false,
  id: "",
  value: "",
  style: {
    left: "0px",
    top: "0px",
    width: "0px",
    height: "0px",
  } as Record<string, string>,
});
const textEditRef = ref<HTMLTextAreaElement | null>(null);
const multiSelectedIds = ref<string[]>([]);
const marquee = reactive({
  active: false,
  visible: false,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  pointerId: -1,
});

const showAutosaveRail = ref(true);
const AUTOSAVE_DISPLAY_LIMIT = 12;
const autosaveHistory = computed(() => store.autosaveHistory);
const autosaveHistoryDisplay = computed(() => autosaveHistory.value.slice(0, AUTOSAVE_DISPLAY_LIMIT));
const hasAutosaveHistory = computed(() => autosaveHistory.value.length > 0);

const rotateCursorStyle = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%231a1f2c' stroke-width='2' d='M12 5a7 7 0 1 1-7 7'/%3E%3Cpath fill='%231a1f2c' d='M12 2l-3 3h6z'/%3E%3C/svg%3E\") 12 12, pointer";
const CLIPBOARD_OFFSET = 28;

const gangPattern = typeof document !== "undefined"
  ? (() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillRect(16, 16, 16, 16);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.04)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 31, 31);
    }
    return canvas;
  })()
  : null;

const isGangMode = computed(() => modeStore.activeMode === "gang");
const activeGangSheet = computed(() => gangStore.activeSheet);

const sheetResize = reactive({ active: false, handle: "", startX: 0, startY: 0, startW: 0, startH: 0 });
const gangSheets = computed(() => gangStore.sheets);
const activeSheetId = computed(() => gangStore.activeSheetId);
const gangTopbarStyle = computed(() => ({
  transform: `translate(${gangTopbarPos.x}px, ${gangTopbarPos.y}px)`,
}));
const activeSheetDropdownValue = computed(() => activeSheetId.value ?? "");



const stage = computed<Konva.Stage | undefined>(() => stageRef.value?.getNode?.());
watch(stage, (st) => { if (st) store.setStage(st); }, { immediate: true });

const stageWidth = computed(() => Math.max(1, viewport.w));
const stageHeight = computed(() => Math.max(1, viewport.h));

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const baseScale = computed(() => {
  const w = Math.max(1, viewport.w);
  const h = Math.max(1, viewport.h);
  const sheetW = Math.max(1, store.sheetWpx);
  const sheetH = Math.max(1, store.sheetHpx);
  const padding = Math.min(Math.max(Math.min(w, h) * 0.06, 32), 96);
  const availW = Math.max(1, w - padding * 2);
  const availH = Math.max(1, h - padding * 2);
  const scale = Math.min(availW / sheetW, availH / sheetH);
  return clampValue(scale, 0.08, 1);
});

const sheetScale = computed(() => baseScale.value * zoom.value);
watch(sheetScale, (val) => { store.scale = val; });

const transformerConfig = computed(() => ({
  rotateEnabled: true,
  borderStroke: "#2563eb",
  borderStrokeWidth: 1.2,
  anchorSize: Math.min(12, Math.max(6, 8 * sheetScale.value)),
  anchorStroke: "#1d4ed8",
  anchorStrokeWidth: 1,
  anchorFill: "#ffffff",
  anchorCornerRadius: 4,
  anchorHitStrokeWidth: 16,
  rotateAnchorOffset: 28,
  rotateAnchorCornerRadius: 12,
  rotateAnchorFill: "#1d4ed8",
  rotateAnchorStroke: "#ffffff",
  rotateAnchorStrokeWidth: 1.5,
  rotateAnchorCursor: rotateCursorStyle,
}));

const scaledSheetSize = computed(() => ({
  w: store.sheetWpx * sheetScale.value,
  h: store.sheetHpx * sheetScale.value,
}));

const activeProduct = computed(() => store.activeProduct);
const activeSurface = computed(() => store.activeSurface);

const sheetOffset = computed(() => ({
  x: (stageWidth.value - scaledSheetSize.value.w) / 2 + pan.x,
  y: (stageHeight.value - scaledSheetSize.value.h) / 2 + pan.y,
}));

const sheetGuideStyle = computed(() => ({
  transform: `translate(${sheetOffset.value.x}px, ${sheetOffset.value.y}px)`,
  width: `${scaledSheetSize.value.w}px`,
  height: `${scaledSheetSize.value.h}px`,
}));

const marqueeBox = computed(() => {
  const minX = Math.min(marquee.startX, marquee.x);
  const minY = Math.min(marquee.startY, marquee.y);
  const maxX = Math.max(marquee.startX, marquee.x);
  const maxY = Math.max(marquee.startY, marquee.y);
  return {
    minX,
    minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
});

const primarySelection = computed<LayerItem | null>(() => {
  if (store.selected) return store.selected;
  if (multiSelectedIds.value.length === 1) {
    return store.items.find((item: LayerItem) => item.id === multiSelectedIds.value[0]) ?? null;
  }
  return null;
});

const marqueeStyle = computed(() => {
  const box = marqueeBox.value;
  const scale = sheetScale.value || 1;
  return {
    left: `${sheetOffset.value.x + box.minX * scale}px`,
    top: `${sheetOffset.value.y + box.minY * scale}px`,
    width: `${box.width * scale}px`,
    height: `${box.height * scale}px`,
  };
});

const showProductBadge = computed(() => !isGangMode.value && store.productSlug !== "gangsheet" && Boolean(activeProduct.value));

const productInfo = computed(() => {
  const product = activeProduct.value;
  const surface = activeSurface.value;
  const widthIn = pxToIn(store.sheetWpx, store.ppi).toFixed(2);
  const heightIn = pxToIn(store.sheetHpx, store.ppi).toFixed(2);
  return {
    title: product?.title ?? "",
    surface: surface?.name ?? "",
    materials: product?.materials?.length ? product.materials.join(", ") : "",
    note: surface?.note ?? "",
    dimensions: `${widthIn}" x ${heightIn}"`,
  };
});

const productInfoStyle = computed(() => ({
  left: `${sheetOffset.value.x + scaledSheetSize.value.w - 18}px`,
  top: `${sheetOffset.value.y + 18}px`,
  transform: "translate(-100%, 0)",
}));

let snapshotTimer: number | null = null;

function scheduleGangSnapshot() {
  if (!isGangMode.value || !gangStore.activeSheetId) return;
  if (snapshotTimer) window.clearTimeout(snapshotTimer);
  snapshotTimer = window.setTimeout(commitGangSnapshot, 300);
}

async function commitGangSnapshot() {
  if (snapshotTimer) {
    window.clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
  if (!isGangMode.value || !gangStore.activeSheetId) return;
  const snapshot = store.serializeSnapshot();
  let preview: string | null = null;
  const stageNode = stage.value;
  if (stageNode) {
    try {
      preview = stageNode.toDataURL({
        pixelRatio: Math.min(1.2, Math.max(0.5, 480 / Math.max(store.sheetWpx, 1))),
        mimeType: "image/png",
      });
    } catch (err) {
      preview = null;
    }
  }
  gangStore.storeSnapshot(gangStore.activeSheetId, { ...snapshot, previewUrl: preview });
}

function selectGangSheet(id: string) {
  if (id === gangStore.activeSheetId) return;
  gangStore.setActiveSheet(id);
}

function createGangSheet() {
  gangStore.createSheet();
}

function activeSelectionIds(): string[] {
  if (multiSelectedIds.value.length) return [...multiSelectedIds.value];
  if (allSelected.value) return store.items.map((item: LayerItem) => item.id);
  return store.selectedId ? [store.selectedId] : [];
}

function focusOnNew(ids: string[]) {
  if (!ids.length) return;
  const lastId = ids[ids.length - 1];
  allSelected.value = false;
  store.select(lastId);
  nextTick(syncTransformer);
}

function clampPan() {
  const sheet = scaledSheetSize.value;
  const maxX = Math.max(0, (sheet.w - stageWidth.value) / 2);
  const maxY = Math.max(0, (sheet.h - stageHeight.value) / 2);
  pan.x = clampValue(pan.x, -maxX, maxX);
  pan.y = clampValue(pan.y, -maxY, maxY);
}

function applyZoom(nextZoom: number, anchor?: { x: number; y: number }) {
  const st = stage.value;
  const clamped = Math.min(Math.max(nextZoom, 0.2), 6);
  const previous = zoom.value;
  if (clamped === previous) return;
  if (!st) {
    zoom.value = clamped;
    return;
  }
  const pointer = anchor ?? { x: stageWidth.value / 2, y: stageHeight.value / 2 };
  const currentScale = sheetScale.value;
  const currentOffset = sheetOffset.value;
  const sheetPoint = {
    x: (pointer.x - currentOffset.x) / currentScale,
    y: (pointer.y - currentOffset.y) / currentScale,
  };
  zoom.value = clamped;
  const newScale = sheetScale.value;
  const baseOffsetX = (stageWidth.value - store.sheetWpx * newScale) / 2;
  const baseOffsetY = (stageHeight.value - store.sheetHpx * newScale) / 2;
  pan.x = pointer.x - (baseOffsetX + sheetPoint.x * newScale);
  pan.y = pointer.y - (baseOffsetY + sheetPoint.y * newScale);
  clampPan();
  st.batchDraw();
}

const zoomModel = computed({
  get: () => zoom.value,
  set: (value: number) => {
    applyZoom(value);
  },
});

function stagePointToSheetCoords(stagePoint: { x: number; y: number }) {
  const scale = sheetScale.value || 1;
  const x = (stagePoint.x - sheetOffset.value.x) / scale;
  const y = (stagePoint.y - sheetOffset.value.y) / scale;
  return {
    x: clampValue(x, 0, store.sheetWpx),
    y: clampValue(y, 0, store.sheetHpx),
  };
}

function pointerEventToSheet(event: PointerEvent) {
  const stage = stageRef.value?.getNode?.();
  const container = stage?.container?.();
  if (!stage || !container) return null;
  const rect = container.getBoundingClientRect();
  const stagePoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  return stagePointToSheetCoords(stagePoint);
}

watch(
  () => [store.sheetWpx, store.sheetHpx],
  () => {
    applyZoom(1);
    pan.x = 0;
    pan.y = 0;
    nextTick(() => stage.value?.batchDraw());
  }
);

const showGrid = computed(() => store.gridEnabled);

function ensureImagesLoaded() {
  const images = store.items.filter(i => i.kind === "image") as any[];
  for (const it of images) {
    if (imageMap.value[it.id]) continue;
    loadHTMLImageFromURL(it.src)
      .then(img => {
        imageMap.value = { ...imageMap.value, [it.id]: img };
        nextTick(() => stage.value?.batchDraw?.());
      })
      .catch(() => {
        imageMap.value = { ...imageMap.value, [it.id]: null };
      });
  }
  for (const key of Object.keys(imageMap.value)) {
    if (!store.items.find(i => i.id === key)) {
      const clone = { ...imageMap.value };
      delete clone[key];
      imageMap.value = clone;
    }
  }
}

watch(
  () => store.items,
  () => {
    ensureImagesLoaded();
    scheduleGangSnapshot();
    nextTick(() => {
      stage.value?.batchDraw?.();
      syncTransformer();
    });
  },
  { deep: true }
);
// Load product background image when surface changes
watch(
  () => store.activeSurface?.previewImage,
  (previewImageUrl) => {
    if (!previewImageUrl) {
      productBackgroundImage.value = null;
      nextTick(() => stage.value?.batchDraw?.());
      return;
    }

    loadHTMLImageFromURL(previewImageUrl)
      .then(img => {
        productBackgroundImage.value = img;
        nextTick(() => stage.value?.batchDraw?.());
      })
      .catch(() => {
        productBackgroundImage.value = null;
      });
  },
  { immediate: true }
);

onMounted(() => ensureImagesLoaded());

watch(
  () => [store.sheetWpx, store.sheetHpx, store.printTech, store.color],
  () => {
    if (isGangMode.value && gangStore.activeSheetId) {
      gangStore.updateSheetSize(gangStore.activeSheetId, pxToIn(store.sheetWpx, store.ppi), pxToIn(store.sheetHpx, store.ppi));
    }
    scheduleGangSnapshot();
    nextTick(() => stage.value?.batchDraw?.());
  }
);

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem("gsb:autosaveRail");
  if (stored === "closed") showAutosaveRail.value = false;
  watch(showAutosaveRail, value => {
    window.localStorage.setItem("gsb:autosaveRail", value ? "open" : "closed");
  }, { flush: "sync" });
}

watch(
  () => autosaveHistory.value.length,
  (next, prev) => {
    if (next > prev) showAutosaveRail.value = true;
  },
);

watch(isGangMode, active => {
  if (!active) {
    stopSheetResizeHandle();
    commitGangSnapshot();
  } else {
    scheduleGangSnapshot();
  }
});

watch(
  () => gangStore.activeSheetId,
  () => {
    stopSheetResizeHandle();
    if (isGangMode.value) scheduleGangSnapshot();
  }
);

function toggleAutosaveRail() {
  showAutosaveRail.value = !showAutosaveRail.value;
}

function formatHistoryTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function updateViewport(width: number, height: number) {
  viewport.w = width;
  viewport.h = height;
  store.setViewportSize(width, height);
  clampPan();
}

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (!wrap.value) return;
  resizeObserver = new ResizeObserver(entries => {
    const rect = entries[0].contentRect;
    updateViewport(rect.width, rect.height);
  });
  resizeObserver.observe(wrap.value);
  nextTick(() => {
    if (wrap.value) updateViewport(wrap.value.clientWidth, wrap.value.clientHeight);
    clampGangTopbarPosition();
  });
});

onBeforeUnmount(() => resizeObserver?.disconnect());

function startMarqueeSelection(point: { x: number; y: number }, pointerId: number) {
  marquee.active = true;
  marquee.visible = false;
  marquee.startX = point.x;
  marquee.startY = point.y;
  marquee.x = point.x;
  marquee.y = point.y;
  marquee.pointerId = pointerId;
  window.addEventListener("pointermove", handleMarqueePointer);
  window.addEventListener("pointerup", stopMarquee);
  window.addEventListener("pointercancel", stopMarquee);
}

function updateMarquee(point: { x: number; y: number }) {
  marquee.x = clampValue(point.x, 0, store.sheetWpx);
  marquee.y = clampValue(point.y, 0, store.sheetHpx);
  if (!marquee.visible) {
    const dx = Math.abs(marquee.x - marquee.startX);
    const dy = Math.abs(marquee.y - marquee.startY);
    marquee.visible = dx > 1 || dy > 1;
  }
}

function resetMarquee() {
  marquee.active = false;
  marquee.visible = false;
  marquee.pointerId = -1;
}

function applyMarqueeSelection() {
  const box = marqueeBox.value;
  const minSize = 2;
  if (box.width < minSize && box.height < minSize) {
    multiSelectedIds.value = [];
    allSelected.value = false;
    store.select(null);
    return;
  }
  const selectedIds: string[] = [];
  for (const item of store.items) {
    if (!item.visible) continue;
    const bounds = approximateBounds(item);
    const x = item.x - (bounds.offsetX ?? 0);
    const y = item.y - (bounds.offsetY ?? 0);
    const w = bounds.width ?? 0;
    const h = bounds.height ?? 0;
    const intersects = !(x > box.minX + box.width || x + w < box.minX || y > box.minY + box.height || y + h < box.minY);
    if (intersects) selectedIds.push(item.id);
  }
  if (!selectedIds.length) {
    multiSelectedIds.value = [];
    store.select(null);
    return;
  }
  if (selectedIds.length === 1) {
    multiSelectedIds.value = [];
    store.select(selectedIds[0]);
    return;
  }
  multiSelectedIds.value = selectedIds;
  store.select(null);
}

function handleMarqueePointer(event: PointerEvent) {
  if (!marquee.active) return;
  if (marquee.pointerId !== -1 && event.pointerId !== marquee.pointerId) return;
  const point = pointerEventToSheet(event);
  if (!point) return;
  updateMarquee(point);
}

function stopMarquee(event?: PointerEvent) {
  if (!marquee.active) return;
  if (event && marquee.pointerId !== -1 && event.pointerId !== marquee.pointerId) return;
  if (event) {
    const point = pointerEventToSheet(event);
    if (point) updateMarquee(point);
  }
  window.removeEventListener("pointermove", handleMarqueePointer);
  window.removeEventListener("pointerup", stopMarquee);
  window.removeEventListener("pointercancel", stopMarquee);
  applyMarqueeSelection();
  resetMarquee();
  nextTick(syncTransformer);
}

function onStageMouseDown(evt: any) {
  if (textEdit.active) commitTextEdit();
  const pointerEvent = evt?.evt as PointerEvent | undefined;
  if (pointerEvent && pointerEvent.button !== 0) return;
  const stage = evt.target?.getStage?.();
  if (!stage) return;
  const clickedOnEmpty = evt.target === stage;
  if (!clickedOnEmpty || isPanning.value) return;
  const sheetPoint = pointerEvent ? pointerEventToSheet(pointerEvent) : null;
  if (!sheetPoint) return;
  multiSelectedIds.value = [];
  allSelected.value = false;
  store.select(null);
  startMarqueeSelection(sheetPoint, pointerEvent?.pointerId ?? -1);
}

function onStageMouseUp(evt: any) {
  if (!marquee.active) return;
  const pointerEvent = evt?.evt as PointerEvent | undefined;
  stopMarquee(pointerEvent);
}

function syncTransformer() {
  const transformer = trRef.value?.getNode?.();
  const layer = layerRef.value?.getNode?.();
  if (!transformer || !layer) return;
  if (multiSelectedIds.value.length) {
    const nodes = multiSelectedIds.value
      .map(id => layer.findOne(`#${id}`))
      .filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(nodes);
    layer.draw();
    return;
  }
  if (allSelected.value) {
    const nodes = store.items
      .map(it => layer.findOne(`#${it.id}`))
      .filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(nodes);
    layer.draw();
    return;
  }
  const selection = store.selected;
  if (!selection) {
    transformer.nodes([]);
    layer.draw();
    return;
  }
  const node = layer.findOne(`#${selection.id}`);
  transformer.nodes(node ? [node] : []);
  layer.draw();
}

function onNodeClick(item: LayerItem, evt?: Konva.KonvaEventObject<MouseEvent>) {
  if (textEdit.active) cancelTextEdit();
  if (evt) evt.cancelBubble = true;
  const shift = evt?.evt?.shiftKey;
  if (shift) {
    const ids = multiSelectedIds.value.slice();
    const idx = ids.indexOf(item.id);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(item.id);
    multiSelectedIds.value = ids;
    allSelected.value = false;
    if (ids.length === 1) {
      store.select(ids[0]);
    } else if (!ids.length) {
      store.select(item.id);
    } else {
      store.select(null);
    }
  } else {
    multiSelectedIds.value = [];
    allSelected.value = false;
    store.select(item.id);
  }
  nextTick(syncTransformer);
}

watch(() => store.selectedId, () => {
  allSelected.value = false;
  multiSelectedIds.value = [];
  nextTick(syncTransformer);
});

watch(allSelected, value => {
  if (value) {
    multiSelectedIds.value = [];
    store.select(null);
  }
  nextTick(syncTransformer);
});

watch(multiSelectedIds, () => nextTick(syncTransformer), { deep: true });

function onDragMove(item: any, e: any) {
  const node: Konva.Node = e.target;
  const pos = node.position();
  let { x, y } = snapPoint(pos.x, pos.y, store.gridPx, store.gridEnabled);
  const others = store.items.filter(i => i.id !== item.id);
  let w = 0;
  let h = 0;
  if (typeof item.width === "number") w = item.width;
  else if (typeof item.radius === "number") w = item.radius * 2;
  if (typeof item.height === "number") h = item.height;
  else if (typeof item.radius === "number") h = item.radius * 2;
  const snapped = snapToObjects(x, y, w, h, others as any, 6);
  node.position({ x: snapped.x, y: snapped.y });
}

function applyNodeTransform(target: LayerItem, node: any) {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  const patch: any = { rotation: node.rotation(), x: node.x(), y: node.y() };
  if (target.kind === "text") {
    const baseWidth = (target as any).width ?? node.width();
    const baseHeight = (target as any).height ?? node.height();
    const baseFont = (target as any).fontSize ?? 36;
    const uniformScale = (scaleX + scaleY) / 2;
    patch.fontSize = Math.max(6, Math.round(baseFont * uniformScale));
    patch.width = Math.max(20, Math.round(baseWidth * scaleX));
    patch.height = Math.max(20, Math.round(baseHeight * scaleY));
  } else if (target.kind === "rect" || target.kind === "image") {
    patch.width = Math.max(1, Math.round(((target as any).width ?? 1) * scaleX));
    patch.height = Math.max(1, Math.round(((target as any).height ?? 1) * scaleY));
  } else if (target.kind === "circle") {
    patch.radius = Math.max(1, Math.round((target as any).radius * (scaleX + scaleY) / 2));
  } else if (target.kind === "path") {
    const currentScaleX = (target as any).scaleX ?? 1;
    const currentScaleY = (target as any).scaleY ?? 1;
    const deltaX = currentScaleX === 0 ? 1 : scaleX / currentScaleX;
    const deltaY = currentScaleY === 0 ? 1 : scaleY / currentScaleY;
    const nextScaleX = scaleX;
    const nextScaleY = scaleY;
    patch.scaleX = nextScaleX;
    patch.scaleY = nextScaleY;
    if (typeof (target as any).width === "number") patch.width = Math.max(1, Math.round((target as any).width * deltaX));
    if (typeof (target as any).height === "number") patch.height = Math.max(1, Math.round((target as any).height * deltaY));
    node.scaleX(nextScaleX);
    node.scaleY(nextScaleY);
  }
  if (target.kind !== "path") {
    node.scaleX(1);
    node.scaleY(1);
  }
  store.updateItemPartial(target.id, patch);
}

function onTransformEnd(item: LayerItem | null, e: any) {
  const transformer = trRef.value?.getNode?.();
  if (multiSelectedIds.value.length > 1 && transformer) {
    const nodes = transformer.nodes() ?? [];
    nodes.forEach((node: any) => {
      const target = store.items.find((layer: LayerItem) => layer.id === node.id());
      if (target) applyNodeTransform(target, node);
    });
    store.snapshot();
    return;
  }
  const target = item ?? (multiSelectedIds.value.length === 1
    ? store.items.find((layer: LayerItem) => layer.id === multiSelectedIds.value[0]) ?? null
    : store.selected ?? null);
  if (!target) return;
  const node: any = e.target;
  applyNodeTransform(target, node);
  store.snapshot();
}

function onWheel(e: any) {
  const st = stage.value;
  if (!st) return;
  const domEvent = e.evt || e;
  domEvent?.preventDefault?.();
  const pointer = st.getPointerPosition();
  if (!pointer) return;
  const oldZoom = zoom.value;
  const delta = domEvent?.deltaY ?? e.deltaY ?? 0;
  if (delta === 0) return;
  const scaleBy = 1.05;
  const direction = delta > 0 ? -1 : 1;
  const nextZoom = direction > 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
  applyZoom(nextZoom, pointer);
}

function onStageDragMove(e: any) {
  const st: Konva.Stage | undefined = e.target?.getStage?.() ?? stage.value;
  if (!st) return;
  const pos = st.position();
  pan.x += pos.x;
  pan.y += pos.y;
  clampPan();
  st.position({ x: 0, y: 0 });
  st.batchDraw();
}
const onStageDragEnd = onStageDragMove;

function onKeyDown(e: KeyboardEvent) {
  if (e.code === "Space") {
    isPanning.value = true;
    return;
  }
  const meta = e.metaKey || e.ctrlKey;
  if (meta) {
    const key = e.key.toLowerCase();
    if (isGangMode.value) {
      if (key === "arrowright") {
        e.preventDefault();
        gangStore.cycleSheet(1);
        return;
      }
      if (key === "arrowleft") {
        e.preventDefault();
        gangStore.cycleSheet(-1);
        return;
      }
    }
    if (key === "a") {
      e.preventDefault();
      if (store.items.length) {
        allSelected.value = true;
        store.select(null);
        nextTick(syncTransformer);
      }
      return;
    }
    if (key === "c") {
      e.preventDefault();
      const ids = activeSelectionIds();
      if (ids.length) store.copySelection(ids);
      return;
    }
    if (key === "x") {
      e.preventDefault();
      const ids = activeSelectionIds();
      if (ids.length) {
        store.cutSelection(ids);
        allSelected.value = false;
        nextTick(syncTransformer);
      }
      return;
    }
    if (key === "v") {
      e.preventDefault();
      const ids = store.pasteClipboard(CLIPBOARD_OFFSET);
      focusOnNew(ids);
      return;
    }
    if (key === "d") {
      e.preventDefault();
      const ids = activeSelectionIds();
      if (ids.length) {
        const duplicates = store.duplicateSelection(ids, CLIPBOARD_OFFSET);
        focusOnNew(duplicates);
      }
      return;
    }
    if (key === "z") {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
      allSelected.value = false;
      nextTick(syncTransformer);
      return;
    }
    if (key === "y") {
      e.preventDefault();
      store.redo();
      allSelected.value = false;
      nextTick(syncTransformer);
      return;
    }
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    const ids = activeSelectionIds();
    if (ids.length) {
      store.removeItems(ids);
      allSelected.value = false;
      nextTick(syncTransformer);
    }
    return;
  }

  if (e.key === "Escape") {
    if (allSelected.value || store.selectedId) {
      allSelected.value = false;
      store.select(null);
      nextTick(syncTransformer);
    }
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === "Space") isPanning.value = false;
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("pointermove", handleResize);
  window.removeEventListener("pointerup", stopResize);
  window.removeEventListener("pointermove", onSheetResizeMove);
  window.removeEventListener("pointerup", stopSheetResizeHandle);
  window.removeEventListener("pointermove", handleTopbarDrag);
  window.removeEventListener("pointerup", stopTopbarDrag);
  window.removeEventListener("pointercancel", stopTopbarDrag);
  window.removeEventListener("pointermove", handleMarqueePointer);
  window.removeEventListener("pointerup", stopMarquee);
  window.removeEventListener("pointercancel", stopMarquee);
  stopMarquee();
  commitGangSnapshot();
});

function onDrop(e: DragEvent) {
  e.preventDefault();
  draggingOver.value = false;
  cancelTextEdit();
  const files = e.dataTransfer?.files;
  if (files?.length) store.addImageFiles(files);
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  if (textEdit.active) cancelTextEdit();
  draggingOver.value = true;
}

function onDragLeave() {
  draggingOver.value = false;
}

function bumpZoom(direction: "in" | "out") {
  const factor = direction === "in" ? 1.2 : 1 / 1.2;
  applyZoom(zoom.value * factor);
}

type SheetHandle = "e" | "s" | "se";

function startSheetResize(handle: SheetHandle, event: PointerEvent) {
  if (!isGangMode.value) return;
  sheetResize.active = true;
  sheetResize.handle = handle;
  sheetResize.startX = event.clientX;
  sheetResize.startY = event.clientY;
  sheetResize.startW = store.sheetWpx;
  sheetResize.startH = store.sheetHpx;
  window.addEventListener("pointermove", onSheetResizeMove);
  window.addEventListener("pointerup", stopSheetResizeHandle);
}

function onSheetResizeMove(event: PointerEvent) {
  if (!sheetResize.active) return;
  const scale = sheetScale.value || 1;
  let nextWidth = sheetResize.startW;
  let nextHeight = sheetResize.startH;
  if (sheetResize.handle.includes("e")) {
    nextWidth = sheetResize.startW + (event.clientX - sheetResize.startX) / scale;
  }
  if (sheetResize.handle.includes("s")) {
    nextHeight = sheetResize.startH + (event.clientY - sheetResize.startY) / scale;
  }
  store.setSheetSizePx(nextWidth, nextHeight);
}

function stopSheetResizeHandle() {
  if (!sheetResize.active) return;
  sheetResize.active = false;
  window.removeEventListener("pointermove", onSheetResizeMove);
  window.removeEventListener("pointerup", stopSheetResizeHandle);
}

watch([stageWidth, stageHeight, () => scaledSheetSize.value.w, () => scaledSheetSize.value.h], () => {
  clampPan();
  nextTick(() => stage.value?.batchDraw?.());
});

const safe = computed(() => {
  const margin = store.safeMarginPx;
  const width = Math.max(0, store.sheetWpx - margin * 2);
  const height = Math.max(0, store.sheetHpx - margin * 2);
  return { x: margin, y: margin, width, height };
});

const gridLinesX = computed(() => {
  if (!store.gridEnabled || !store.gridPx) return [] as number[];
  const step = store.gridPx;
  const count = Math.floor(store.sheetWpx / step);
  return Array.from({ length: count + 1 }, (_, idx) => idx * step);
});

const gridLinesY = computed(() => {
  if (!store.gridEnabled || !store.gridPx) return [] as number[];
  const step = store.gridPx;
  const count = Math.floor(store.sheetHpx / step);
  return Array.from({ length: count + 1 }, (_, idx) => idx * step);
});

function clampGangTopbarPosition() {
  if (!wrap.value || !gangTopbarRef.value) return;
  const rect = wrap.value.getBoundingClientRect();
  const bar = gangTopbarRef.value;
  const margin = 12;
  const maxX = Math.max(margin, rect.width - bar.offsetWidth - margin);
  const maxY = Math.max(margin, rect.height - bar.offsetHeight - margin);
  gangTopbarPos.x = clampValue(gangTopbarPos.x, margin, maxX);
  gangTopbarPos.y = clampValue(gangTopbarPos.y, margin, maxY);
}

function startTopbarDrag(event: PointerEvent) {
  if (!isGangMode.value) return;
  gangTopbarDrag.active = true;
  gangTopbarDrag.pointerId = event.pointerId;
  const barRect = gangTopbarRef.value?.getBoundingClientRect();
  gangTopbarDrag.offsetX = barRect ? event.clientX - barRect.left : 0;
  gangTopbarDrag.offsetY = barRect ? event.clientY - barRect.top : 0;
  event.preventDefault();
  window.addEventListener("pointermove", handleTopbarDrag);
  window.addEventListener("pointerup", stopTopbarDrag);
  window.addEventListener("pointercancel", stopTopbarDrag);
}

function handleTopbarDrag(event: PointerEvent) {
  if (!gangTopbarDrag.active || event.pointerId !== gangTopbarDrag.pointerId) return;
  if (!wrap.value || !gangTopbarRef.value) return;
  const rect = wrap.value.getBoundingClientRect();
  const bar = gangTopbarRef.value;
  const margin = 12;
  const maxX = Math.max(margin, rect.width - bar.offsetWidth - margin);
  const maxY = Math.max(margin, rect.height - bar.offsetHeight - margin);
  const rawX = event.clientX - rect.left - gangTopbarDrag.offsetX;
  const rawY = event.clientY - rect.top - gangTopbarDrag.offsetY;
  gangTopbarPos.x = clampValue(rawX, margin, maxX);
  gangTopbarPos.y = clampValue(rawY, margin, maxY);
}

function stopTopbarDrag() {
  if (!gangTopbarDrag.active) return;
  gangTopbarDrag.active = false;
  gangTopbarDrag.pointerId = -1;
  window.removeEventListener("pointermove", handleTopbarDrag);
  window.removeEventListener("pointerup", stopTopbarDrag);
  window.removeEventListener("pointercancel", stopTopbarDrag);
  window.removeEventListener("pointermove", handleMarqueePointer);
  window.removeEventListener("pointerup", stopMarquee);
  window.removeEventListener("pointercancel", stopMarquee);
  stopMarquee();
}

function toggleGangOverview() {
  showGangOverview.value = !showGangOverview.value;
}

function selectFromDropdown(event: Event) {
  const target = event.target as HTMLSelectElement;
  if (!target.value) return;
  selectGangSheet(target.value);
}

function selectSheetAndClose(id: string) {
  selectGangSheet(id);
  showGangOverview.value = false;
}

function applyTextEditStyle(item: TextItem) {
  const scale = sheetScale.value || 1;
  const widthPx = (item.width ?? 0) * scale;
  const heightPx = (item.height ?? item.fontSize ?? 36) * scale;
  const left = sheetOffset.value.x + item.x * scale;
  const top = sheetOffset.value.y + item.y * scale;
  const fontSize = Math.max(10, (item.fontSize ?? 36) * scale);
  const align = (item as any).align ?? "left";
  const fontFamily = item.fontFamily ?? "Inter, Arial, sans-serif";
  const fill = item.fill ?? "#111827";
  const lineHeight = (item as any).lineHeight ?? 1.3;
  const fontStyle = ((item as any).fontStyle ?? "normal") as string;
  const fontWeight = fontStyle.includes("bold") ? "700" : "600";
  const fontStyleCss = fontStyle.includes("italic") ? "italic" : "normal";
  textEdit.style = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${Math.max(120, widthPx)}px`,
    height: `${Math.max(40, heightPx)}px`,
    fontSize: `${fontSize}px`,
    fontFamily,
    color: fill,
    textAlign: align,
    lineHeight: typeof lineHeight === "number" ? lineHeight.toString() : lineHeight,
    fontWeight,
    fontStyle: fontStyleCss,
  };
}

function beginTextEdit(item: LayerItem, evt: any) {
  if (item.kind !== "text") return;
  if (evt) evt.cancelBubble = true;
  const textItem = item as TextItem;
  if (textItem.rotation && Math.abs(textItem.rotation) > 0.01) {
    store.select(textItem.id);
    return;
  }
  store.select(textItem.id);
  textEdit.active = true;
  textEdit.id = textItem.id;
  textEdit.value = textItem.text ?? "";
  applyTextEditStyle(textItem);
  nextTick(() => {
    if (textEditRef.value) {
      textEditRef.value.focus();
      textEditRef.value.select();
    }
  });
}

function commitTextEdit() {
  if (!textEdit.active) return;
  const item = store.items.find((i: LayerItem) => i.id === textEdit.id);
  if (item && item.kind === "text") {
    const current = (item as TextItem).text ?? "";
    if (current !== textEdit.value) {
      store.updateItemPartial(item.id, { text: textEdit.value } as any);
      store.snapshot();
    }
  }
  textEdit.active = false;
  nextTick(syncTransformer);
}

function cancelTextEdit() {
  if (!textEdit.active) return;
  textEdit.active = false;
  nextTick(syncTransformer);
}

function onTextEditKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    commitTextEdit();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelTextEdit();
  }
}

watch(isGangMode, gang => {
  if (!gang) {
    showGangOverview.value = false;
    stopTopbarDrag();
    cancelTextEdit();
  } else {
    nextTick(() => clampGangTopbarPosition());
  }
});

watch([() => viewport.w, () => viewport.h, sheetScale], () => {
  nextTick(() => clampGangTopbarPosition());
});

watch([sheetScale, () => sheetOffset.value.x, () => sheetOffset.value.y], () => {
  if (!textEdit.active) return;
  const item = store.items.find((i: LayerItem) => i.id === textEdit.id);
  if (item && item.kind === "text") applyTextEditStyle(item as TextItem);
});

watch(() => store.selectedId, id => {
  if (textEdit.active && id !== textEdit.id) cancelTextEdit();
});
</script>

<template>
  <div
    ref="wrap"
    :class="['editor-stage-wrap', { 'is-gang-mode': isGangMode, 'is-editing-text': textEdit.active }]"

    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <div
      v-if="isGangMode"
      ref="gangTopbarRef"
      class="gang-topbar"
      :style="gangTopbarStyle"
    >
      <button
        type="button"
        class="topbar-handle"
        title="Drag panel"
        @pointerdown="startTopbarDrag"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="topbar-select">
        <label for="gang-sheet-select">Sheet</label>
        <select id="gang-sheet-select" :value="activeSheetDropdownValue" @change="selectFromDropdown">
          <option v-for="sheet in gangSheets" :key="sheet.id" :value="sheet.id">
            {{ sheet.name }}
          </option>
        </select>
      </div>
      <button type="button" class="topbar-btn" @click="toggleGangOverview">
        {{ showGangOverview ? "Close Overview" : "All Gang Sheets" }}
      </button>
      <button type="button" class="topbar-btn ghost" @click.stop="createGangSheet">New Sheet</button>
    </div>

    <v-stage
      ref="stageRef"
      :config="{ width: stageWidth, height: stageHeight, draggable: isPanning }"
      @mousedown="onStageMouseDown"
      @mouseup="onStageMouseUp"
      @dragmove="onStageDragMove"
      @dragend="onStageDragEnd"
      @wheel="onWheel"
    >
      <v-layer v-if="showGrid">
        <v-group :config="{ x: sheetOffset.x, y: sheetOffset.y, scaleX: sheetScale, scaleY: sheetScale, listening: false }">
          <v-line
            v-for="x in gridLinesX"
            :key="'grid-x-' + x"
            :config="{ points: [x, 0, x, store.sheetHpx], stroke: '#ececec', strokeWidth: 1 / sheetScale }"
          />
          <v-line
            v-for="y in gridLinesY"
            :key="'grid-y-' + y"
            :config="{ points: [0, y, store.sheetWpx, y], stroke: '#ececec', strokeWidth: 1 / sheetScale }"
          />
        </v-group>
      </v-layer>

      <v-layer>
        <v-group :config="{ x: sheetOffset.x, y: sheetOffset.y, scaleX: sheetScale, scaleY: sheetScale, listening: false }">
          <!-- Background product image -->
          <v-image
            v-if="productBackgroundImage"
            :config="{
              id: 'product-background',
              x: 0,
              y: 0,
              width: store.sheetWpx,
              height: store.sheetHpx,
              image: productBackgroundImage,
              opacity: 0.8,
              listening: false,
            }"
          />
          
          <!-- Base rectangle (white background or gang pattern) -->
          <v-rect
            :config="{
              id: 'sheet-base',
              x: 0,
              y: 0,
              width: store.sheetWpx,
              height: store.sheetHpx,
              stroke: '#d0d0d0',
              strokeWidth: 1 / sheetScale,
              fill: productBackgroundImage ? 'rgba(255,255,255,0.3)' : (isGangMode && gangPattern ? undefined : '#fff'),
              fillPatternImage: isGangMode && gangPattern ? gangPattern : undefined,
              fillPatternRepeat: isGangMode && gangPattern ? 'repeat' : undefined,
            }"
          />
          
          <!-- Safe area guide -->
          <v-rect
            v-if="safe.width > 0 && safe.height > 0"
            :config="{
              x: safe.x,
              y: safe.y,
              width: safe.width,
              height: safe.height,
              stroke: '#9aa0ff',
              dash: [6, 6],
              strokeWidth: 1 / sheetScale,
              listening: false,
            }"
          />
        </v-group>
      </v-layer>

      <v-layer ref="layerRef">
        <v-group :config="{ x: sheetOffset.x, y: sheetOffset.y, scaleX: sheetScale, scaleY: sheetScale }">
          <template v-for="it in store.items" :key="it.id">
            <v-image
              v-if="it.kind === 'image' && it.visible"
              :id="it.id"
              :config="{
                x: it.x,
                y: it.y,
                width: (it as any).width,
                height: (it as any).height,
                rotation: it.rotation,
                image: imageMap[it.id] || null,
                draggable: !it.locked,
              }"
              @dragmove="onDragMove(it, $event)"
              @dragend="store.updateItemPartial(it.id, { x: $event.target.x(), y: $event.target.y() }); store.snapshot()"
              @click="onNodeClick(it, $event)"
            />
            <v-text
              v-else-if="it.kind === 'text' && it.visible"
              :id="it.id"
              :config="{
                x: it.x,
                y: it.y,
                width: (it as any).width,
                height: (it as any).height,
                rotation: it.rotation,
                text: (it as any).text,
                fontSize: (it as any).fontSize,
                fontFamily: (it as any).fontFamily,
                fill: (it as any).fill,
                align: (it as any).align,
                draggable: !it.locked && !textEdit.active,
                opacity: (it as any).opacity ?? 1,
                shadowColor: (it as any).shadowColor ?? 'rgba(0,0,0,0)',
                shadowBlur: (it as any).shadowBlur ?? 0,
                stroke: (it as any).stroke ?? undefined,
                strokeWidth: (it as any).strokeWidth ?? 0,
              }"
              @dragmove="onDragMove(it, $event)"
              @dragend="store.updateItemPartial(it.id, { x: $event.target.x(), y: $event.target.y() }); store.snapshot()"
              @click="onNodeClick(it, $event)"
              @dblclick.stop.prevent="beginTextEdit(it, $event)"
            />
            <v-rect
              v-else-if="it.kind === 'rect' && it.visible"
              :id="it.id"
              :config="{
                x: it.x,
                y: it.y,
                width: (it as any).width,
                height: (it as any).height,
                rotation: it.rotation,
                fill: (it as any).fill,
                stroke: (it as any).stroke,
                strokeWidth: (it as any).strokeWidth,
                draggable: !it.locked,
                opacity: (it as any).opacity ?? 1,
                dash: (it as any).dash ?? [],
              }"
              @dragmove="onDragMove(it, $event)"
              @dragend="store.updateItemPartial(it.id, { x: $event.target.x(), y: $event.target.y() }); store.snapshot()"
              @click="onNodeClick(it, $event)"
            />
            <v-circle
              v-else-if="it.kind === 'circle' && it.visible"
              :id="it.id"
              :config="{
                x: it.x,
                y: it.y,
                radius: (it as any).radius,
                rotation: it.rotation,
                fill: (it as any).fill,
                stroke: (it as any).stroke,
                strokeWidth: (it as any).strokeWidth,
                draggable: !it.locked,
                opacity: (it as any).opacity ?? 1,
              }"
              @dragmove="onDragMove(it, $event)"
              @dragend="store.updateItemPartial(it.id, { x: $event.target.x(), y: $event.target.y() }); store.snapshot()"
              @click="onNodeClick(it, $event)"
            />
          <v-line
            v-else-if="it.kind === 'line' && it.visible"
            :id="it.id"
            :config="{
              x: it.x,
              y: it.y,
              points: (it as any).points,
              rotation: it.rotation,
              stroke: (it as any).stroke,
              strokeWidth: (it as any).strokeWidth,
              draggable: !it.locked,
              opacity: (it as any).opacity ?? 1,
              dash: (it as any).dash ?? [],
            }"
            @dragmove="onDragMove(it, $event)"
            @dragend="store.updateItemPartial(it.id, { x: $event.target.x(), y: $event.target.y() }); store.snapshot()"
            @click="onNodeClick(it, $event)"
          />
          <v-path
            v-else-if="it.kind === 'path' && it.visible"
            :id="it.id"
            :config="{
              x: it.x,
              y: it.y,
              data: (it as any).path,
              rotation: it.rotation,
              scaleX: (it as any).scaleX ?? 1,
              scaleY: (it as any).scaleY ?? 1,
              fill: (it as any).fill,
              stroke: (it as any).stroke,
              strokeWidth: (it as any).strokeWidth ?? 0,
              draggable: !it.locked,
              opacity: (it as any).opacity ?? 1,
            }"
            @dragmove="onDragMove(it, $event)"
            @dragend="store.updateItemPartial(it.id, { x: $event.target.x(), y: $event.target.y() }); store.snapshot()"
            @click="onNodeClick(it, $event)"
          />
        </template>

        <v-transformer
          ref="trRef"
          v-if="store.selected || allSelected"
          :config="transformerConfig"
          @transformend="onTransformEnd(primarySelection, $event)"
        />
        </v-group>
      </v-layer>
    </v-stage>

    <textarea
      v-if="textEdit.active"
      ref="textEditRef"
      class="text-edit-overlay"
      :style="textEdit.style"
      v-model="textEdit.value"
      @keydown="onTextEditKeydown"
      @blur="commitTextEdit"
    ></textarea>
    <div v-if="marquee.visible" class="selection-marquee" :style="marqueeStyle"></div>


    <transition name="fade">
      <div
        v-if="isGangMode && showGangOverview"
        class="gang-overview-backdrop"
        @click.self="showGangOverview = false"
      >
        <div class="gang-overview">
          <header>
            <h3>All Gang Sheets</h3>
            <span>{{ gangSheets.length }} sheet(s)</span>
            <button type="button" class="close" @click="showGangOverview = false" aria-label="Close overview">
              &times;
            </button>
          </header>
          <div class="overview-grid">
            <button
              v-for="sheet in gangSheets"
              :key="sheet.id"
              type="button"
              class="overview-card"
              @click="selectSheetAndClose(sheet.id)"
            >
              <div class="thumb">
                <img v-if="sheet.previewUrl" :src="sheet.previewUrl" :alt="`${sheet.name} preview`" />
                <span v-else>{{ sheet.name.slice(0, 2).toUpperCase() }}</span>
              </div>
              <div class="meta">
                <strong>{{ sheet.name }}</strong>
                <span>{{ sheet.widthIn.toFixed(2) }}" &times; {{ sheet.heightIn.toFixed(2) }}"</span>
                <span>{{ sheet.quantity }} pcs &middot; {{ Math.round(sheet.utilization * 100) }}%</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <div
      v-if="isGangMode"
      class="sheet-handle-container"
      :style="sheetGuideStyle"
    >
      <button class="sheet-handle handle-e" title="Resize width" @pointerdown.stop.prevent="startSheetResize('e', $event)"></button>
      <button class="sheet-handle handle-s" title="Resize height" @pointerdown.stop.prevent="startSheetResize('s', $event)"></button>
      <button class="sheet-handle handle-se" title="Resize" @pointerdown.stop.prevent="startSheetResize('se', $event)"></button>
    </div>

    <div
      v-if="showProductBadge"
      class="product-info"
      :style="productInfoStyle"
    >
      <strong>{{ productInfo.title }}</strong>
      <span class="meta">{{ productInfo.surface }} &times; {{ productInfo.dimensions }}</span>
      <span v-if="productInfo.materials" class="meta">{{ productInfo.materials }}</span>
      <span v-if="productInfo.note" class="note">{{ productInfo.note }}</span>
    </div>

    <div v-if="isGangMode && gangSheets.length" class="sheet-rail">
      <button
        class="sheet-pill overview"
        type="button"
        aria-label="Show all gang sheets"
        @click.stop="showGangOverview = true"
      >
        <span class="thumb">[]</span>
        <span class="name">All Sheets</span>
        <span class="meta">{{ gangSheets.length }} total</span>
      </button>
      <button
        class="sheet-pill add"
        type="button"
        aria-label="Add gang sheet"
        @click.stop="createGangSheet"
      >
        <span class="thumb">+</span>
        <span class="name">New Sheet</span>
      </button>
      <button
        v-for="sheet in gangSheets"
        :key="sheet.id"
        :class="['sheet-pill', { active: sheet.id === activeSheetId }]"
        type="button"
        @click.stop="selectGangSheet(sheet.id)"
        :title="sheet.name"
        :aria-current="sheet.id === activeSheetId ? 'true' : undefined"
      >
        <span class="thumb">
          <img v-if="sheet.previewUrl" :src="sheet.previewUrl" alt="Sheet preview" />
          <span v-else>{{ sheet.name.slice(0, 2).toUpperCase() }}</span>
        </span>
        <span class="name">{{ sheet.name }}</span>
        <span class="meta">{{ sheet.quantity }} pcs &middot; {{ Math.round(sheet.utilization * 100) }}%</span>
      </button>
    </div>

    <div class="autosave-rail-container">
      <button
        type="button"
        class="autosave-rail-toggle"
        @click="toggleAutosaveRail"
        :aria-expanded="showAutosaveRail"
        :title="showAutosaveRail ? 'Hide autosave history' : 'Show autosave history'"
      >
        <span v-if="showAutosaveRail">›</span>
        <span v-else>‹</span>
      </button>
      <transition name="slide-x">
        <aside v-if="showAutosaveRail" class="autosave-panel">
          <header>
            <span>Draft Activity</span>
            <span v-if="autosaveHistoryDisplay.length" class="count">{{ autosaveHistoryDisplay.length }}</span>
          </header>
          <div v-if="!hasAutosaveHistory" class="autosave-empty">
            Autosaves will appear here.
          </div>
          <ul v-else class="autosave-list">
            <li
              v-for="entry in autosaveHistoryDisplay"
              :key="entry.id"
              :class="['autosave-entry', entry.kind]"
            >
              <span class="dot" aria-hidden="true"></span>
              <div class="entry-copy">
                <span class="message">{{ entry.message }}</span>
                <div class="meta">
                  <span class="time">{{ formatHistoryTime(entry.timestamp) }}</span>
                  <span v-if="entry.status" class="status">{{ entry.status }}</span>
                </div>
              </div>
            </li>
          </ul>
        </aside>
      </transition>
    </div>

    <div v-if="draggingOver" class="drop-mask">Drop images</div>
    <div class="zoom-control">
      <button type="button" class="zoom-btn" @click="bumpZoom('out')" title="Zoom out">-</button>
      <input type="range" min="0.2" max="3" step="0.05" v-model.number="zoomModel" />
      <button type="button" class="zoom-btn" @click="bumpZoom('in')" title="Zoom in">+</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
    </div>
  </div>
</template>

<style scoped>
.editor-stage-wrap {
  position: relative;
  display: flex;
  flex: 1;
  align-items: stretch;
  padding: clamp(8px, 1.8vw, 22px);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(var(--v-theme-surface), 1) 0%, rgba(var(--v-theme-surface), 0.96) 100%);
  overflow: hidden;
  min-block-size: 0;
}

.editor-stage-wrap::after {
  content: "";
  position: absolute;
  inset: clamp(6px, 1.6vw, 16px);
  border-radius: 12px;
  background:
    radial-gradient(circle at 0 0, rgba(var(--v-theme-surface-variant), 0.18) 0, rgba(var(--v-theme-surface-variant), 0.18) 1px, transparent 1px) 0 0 / 22px 22px,
    rgba(var(--v-theme-surface), 0.94);
  pointer-events: none;
}

.editor-stage-wrap > * {
  position: relative;
  z-index: 1;
}

.editor-stage-wrap.is-gang-mode {
  padding: clamp(8px, 1.6vw, 20px);
  background:
    repeating-linear-gradient(
      45deg,
      rgba(var(--v-theme-surface-variant), 0.12) 0,
      rgba(var(--v-theme-surface-variant), 0.12) 8px,
      rgba(var(--v-theme-surface), 0.1) 8px,
      rgba(var(--v-theme-surface), 0.1) 16px
    );
}

.gang-topbar {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
  cursor: default;
  user-select: none;
  z-index: 9;
}

.topbar-handle {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  border: none;
  background: rgba(148, 163, 184, 0.35);
  border-radius: 6px;
  padding: 6px;
  cursor: grab;
}

.topbar-handle span {
  width: 16px;
  height: 2px;
  background: rgba(71, 85, 105, 0.9);
  border-radius: 999px;
}

.topbar-select {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #334155;
  font-weight: 600;
}

.topbar-select select {
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 10px;
  background: #ffffff;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.topbar-btn {
  border: 1px solid rgba(79, 70, 229, 0.35);
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.topbar-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.24);
}

.topbar-btn.ghost {
  background: rgba(99, 102, 241, 0.08);
  color: #1e1b4b;
  border-color: rgba(99, 102, 241, 0.28);
  box-shadow: none;
}

.topbar-btn.ghost:hover {
  transform: none;
  box-shadow: none;
  background: rgba(99, 102, 241, 0.14);
}

.gang-overview-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9;
}

.gang-overview {
  width: min(640px, 90%);
  max-height: min(75vh, 520px);
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(203, 213, 225, 0.6);
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gang-overview header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  font-size: 13px;
  color: #475569;
}

.gang-overview header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.gang-overview header .close {
  margin-left: auto;
  border: none;
  background: transparent;
  font-size: 26px;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
}

.overview-grid {
  padding: 20px;
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  overflow-y: auto;
}

.overview-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  background: #f8fafc;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 16px 32px rgba(99, 102, 241, 0.18);
}

.overview-card .thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.overview-card .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overview-card .meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #475569;
}

.overview-card .meta strong {
  font-size: 13px;
  color: #111827;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.editor-stage-wrap.is-editing-text canvas {
  pointer-events: none;
}
.text-edit-overlay {
  position: absolute;
  resize: none;
  border: 1px solid rgba(99, 102, 241, 0.45);
  border-radius: 8px;
  padding: 8px 10px;
  font-family: var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
  z-index: 12;
}
.text-edit-overlay:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.75);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
}
.v-theme--dark .text-edit-overlay {
  background: rgba(22, 28, 46, 0.98);
  color: rgba(236, 240, 255, 0.96);
  border-color: rgba(129, 140, 248, 0.45);
  box-shadow: 0 18px 32px rgba(7, 10, 26, 0.5);
}
.drop-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font: 600 22px / 1.2 "Inter", system-ui, sans-serif;
  pointer-events: none;
}
  
@media (min-width: 768px) {
  .editor-stage-wrap {
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-outline), 0.18), 0 18px 44px rgba(15, 23, 42, 0.08);
  }
}

.zoom-control {
  position: absolute;
  right: 12px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.86);
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  font-size: 12px;
  color: #f8fafc;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
}

.zoom-control input[type="range"] {
  width: 140px;
}

.zoom-btn {
  border: none;
  background: rgba(var(--v-theme-surface), 0.24);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  transition: background 0.2s ease, transform 0.2s ease;
}

.zoom-btn:hover {
  background: rgba(var(--v-theme-surface), 0.36);
  transform: translateY(-1px);
}
.product-info {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  font-size: 11px;
  pointer-events: none;
  max-width: 260px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.35);
  z-index: 6;
}
.product-info strong {
  font-size: 13px;
  font-weight: 600;
}
.product-info .meta {
  opacity: 0.85;
}
.product-info .note {
  font-style: italic;
  opacity: 0.75;
}

.sheet-handle-container {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 7;
}
.sheet-handle {
  position: absolute;
  pointer-events: auto;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.25);
  background: #fff;
  box-shadow: 0 6px 15px rgba(15, 23, 42, 0.18);
  cursor: nwse-resize;
}
.sheet-handle.handle-e {
  right: -9px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}
.sheet-handle.handle-s {
  bottom: -9px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}
.sheet-handle.handle-se {
  right: -9px;
  bottom: -9px;
  cursor: nwse-resize;
}

.autosave-rail-container {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: stretch;
  gap: 8px;
  z-index: 9;
  pointer-events: auto;
}

.autosave-rail-toggle {
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(241, 245, 249, 0.86);
  color: #1f2937;
  width: 34px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.18);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.autosave-rail-toggle:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.5);
}

.autosave-panel {
  width: min(280px, 26vw);
  max-height: clamp(260px, 60vh, 420px);
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(12px);
}

.autosave-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.autosave-panel header .count {
  font-size: 11px;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.6);
  background: rgba(148, 163, 184, 0.18);
  padding: 2px 8px;
  border-radius: 999px;
}

.autosave-empty {
  font-size: 12px;
  color: rgba(100, 116, 139, 0.85);
  padding: 24px 12px;
  text-align: center;
}

.autosave-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.autosave-list::-webkit-scrollbar {
  width: 4px;
}

.autosave-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
}

.autosave-entry {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 12px;
  color: #1f2937;
}

.autosave-entry .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  background: rgba(59, 130, 246, 0.95);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.autosave-entry.save .dot {
  background: rgba(34, 197, 94, 0.95);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.autosave-entry.error .dot {
  background: rgba(239, 68, 68, 0.95);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.autosave-entry .entry-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.autosave-entry .message {
  font-weight: 600;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.9);
}

.autosave-entry .meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: rgba(100, 116, 139, 0.85);
}

.autosave-entry .status {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.slide-x-enter-active,
.slide-x-leave-active {
  transition: all 0.22s ease;
}

.slide-x-enter-from,
.slide-x-leave-to {
  opacity: 0;
  transform: translateX(14px);
}

.sheet-rail {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
  z-index: 8;
  pointer-events: auto;
  max-width: min(calc(100% - 48px), 760px);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}
.sheet-rail::-webkit-scrollbar {
  height: 6px;
}
.sheet-rail::-webkit-scrollbar-thumb {
  background: rgba(226, 232, 240, 0.35);
  border-radius: 999px;
}
.sheet-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 96px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(241, 245, 249, 0.86);
  color: #1f2937;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  scroll-snap-align: center;
}
.sheet-pill .thumb {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}
.sheet-pill .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sheet-pill .name {
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.sheet-pill .meta {
  font-size: 10px;
  color: #475569;
}
.sheet-pill.active {
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(99, 102, 241, 0.15);
  transform: translateY(-4px);
  box-shadow: 0 18px 32px rgba(99, 102, 241, 0.25);
}
.sheet-pill.active .meta {
  color: #312e81;
}
.sheet-pill.add {
  min-width: 96px;
  color: #4338ca;
  border: 1px dashed rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.08);
}
.sheet-pill.add .thumb {
  border-radius: 50%;
  border: 1px dashed rgba(99, 102, 241, 0.55);
  background: rgba(255, 255, 255, 0.8);
  font-size: 24px;
  line-height: 1;
}
.sheet-pill.add .name {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.sheet-pill.add {
  background: rgba(76, 29, 149, 0.16);
  border-color: rgba(76, 29, 149, 0.4);
  color: var(--editor-accent);
  font-weight: 600;
}
.sheet-pill.add span {
  margin-left: 2px;
}

.sheet-pill.overview {
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(191, 219, 254, 0.4);
  color: #1e3a8a;
}
.sheet-pill.overview .thumb {
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.12);
  color: #1e3a8a;
  font-weight: 700;
}
.sheet-pill.overview .meta {
  color: #1d4ed8;
}

.selection-marquee {
  position: absolute;
  border: 1px dashed rgba(99, 102, 241, 0.75);
  background: rgba(99, 102, 241, 0.12);
  pointer-events: none;
  z-index: 11;
}

.v-theme--dark .selection-marquee {
  border-color: rgba(129, 140, 248, 0.8);
  background: rgba(129, 140, 248, 0.18);
}

</style>

