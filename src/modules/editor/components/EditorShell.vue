<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useTheme } from "vuetify";
import { useRoute } from "vue-router";
import "../styles/fonts.css";
import EditorToolbar from "./EditorToolbar.vue";
import EditorTopbar from "./EditorTopbar.vue";
import LayersPanel from "./LayersPanel.vue";
import ProductPanel from "./ProductPanel.vue";
import PropertiesPanel from "./PropertiesPanel.vue";
import StageCanvas from "./StageCanvas.vue";
import AssetPanel from "./AssetPanel.vue";
import GangSheetSidebar from "./GangSheetSidebar.vue";
import AutoBuildPanel from "./AutoBuildPanel.vue";
import { useEditorModeStore } from "../store/editorModeStore";
import { useEditorStore } from "../store/editorStore";
import { useGangSheetStore } from "../store/gangSheetStore";
import { useConfigStore } from "@core/stores/config";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import { useAutosaveManager } from "../composables/useAutosaveManager";
import { useCollaboration } from "../composables/useCollaboration";
import { getAIOptimizer } from "../services/aiPacking";
import { getQualityAnalyzer } from "../services/qualityAnalysis";
import { getSuggestionsEngine } from "../services/smartSuggestions";
import CollaborationCursors from "./CollaborationCursors.vue";
import CollaborationChat from "./CollaborationChat.vue";
import AIDesignAssistant from "./AIDesignAssistant.vue";
import BatchOperationsPanel from "./BatchOperationsPanel.vue";
import KeyboardShortcuts from "./KeyboardShortcuts.vue";
import AdvancedCostCalculator from "./AdvancedCostCalculator.vue";
import MockupPreview3D from "./MockupPreview3D.vue";
import { Star, Lightbulb, ChevronDown, AlertCircle, Check, DollarSign } from "lucide-vue-next";

const route = useRoute();
const modeStore = useEditorModeStore();
const editorStore = useEditorStore();
const gangStore = useGangSheetStore();
const catalogStore = useCatalogStore();
const sessionStore = useSessionStore();
useAutosaveManager();

// Option C: Real-time Collaboration
const designId = computed(() => editorStore.designId || `temp-${Date.now()}`);
const collaboration = useCollaboration(designId.value, true);

// Option C: AI Services
const aiOptimizer = getAIOptimizer();
const qualityAnalyzer = getQualityAnalyzer();
const suggestionsEngine = getSuggestionsEngine();

// AI State
const aiOptimizing = ref(false);
const qualityAnalysis = ref<any>(null);
const suggestions = ref<any[]>([]);

// AI Auto-Pack Function
async function handleAIAutoPack() {
  if (aiOptimizing.value) return;
  
  aiOptimizing.value = true;
  try {
    const result = await aiOptimizer.optimize(
      editorStore.items,
      { w: editorStore.sheetWpx, h: editorStore.sheetHpx },
      { margin: 8, allowRotation: true }
    );
    
    editorStore.items = result.items;
    editorStore.snapshot();
    
    console.log('[AI] Optimized! Utilization:', result.utilization.toFixed(1) + '%');
    alert(`AI Optimization Complete!\nUtilization: ${result.utilization.toFixed(1)}%\nPacking time: ${result.packingTime.toFixed(0)}ms`);
  } catch (error) {
    console.error('[AI] Optimization failed:', error);
  } finally {
    aiOptimizing.value = false;
  }
}

// Load quality analysis
async function analyzeQuality() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  
  try {
    const analysis = await qualityAnalyzer.analyzeDesign(
      canvas,
      editorStore.items,
      { w: editorStore.sheetWpx, h: editorStore.sheetHpx }
    );
    qualityAnalysis.value = analysis;
  } catch (error) {
    console.error('[AI] Quality analysis failed:', error);
  }
}

// Load suggestions
async function loadSuggestions() {
  try {
    const sug = await suggestionsEngine.generateSuggestions(
      editorStore.items,
      { w: editorStore.sheetWpx, h: editorStore.sheetHpx },
      {
        printTech: editorStore.printTech,
        colorCount: editorStore.analysis.stats.colorCount,
        areaUsage: (editorStore.analysis.stats.areaIn2 / (editorStore.sheetWpx * editorStore.sheetHpx / 10000)) * 100,
        safeMargin: editorStore.safeMarginPx,
      }
    );
    suggestions.value = sug;
  } catch (error) {
    console.error('[AI] Suggestions failed:', error);
  }
}

// Auto-analyze on changes
watch(() => editorStore.items.length, () => {
  analyzeQuality();
  loadSuggestions();
}, { flush: 'post' });

// Apply suggestion function
async function applySuggestion(suggestion: any) {
  try {
    console.log('[Suggestions] Applying:', suggestion.title);
    
    // Handle different suggestion types
    switch (suggestion.type) {
      case 'optimize-spacing':
        await handleAIAutoPack();
        break;
      
      case 'reduce-sheet-size':
        // Find optimal sheet size
        const optimalSize = suggestion.data?.optimalSize;
        if (optimalSize) {
          editorStore.sheetWin = optimalSize.width;
          editorStore.sheetHin = optimalSize.height;
          editorStore.snapshot();
        }
        break;
      
      case 'group-similar':
        // Group similar items together
        const groups = suggestion.data?.groups || [];
        groups.forEach((group: any) => {
          // Apply grouping logic
          console.log('[Suggestions] Grouping items:', group);
        });
        break;
      
      case 'rotate-items':
        // Rotate specific items for better fit
        const itemsToRotate = suggestion.data?.items || [];
        itemsToRotate.forEach((itemId: string) => {
          const item = editorStore.items.find(i => i.id === itemId);
          if (item) {
            item.rotation = (item.rotation || 0) + 90;
          }
        });
        editorStore.snapshot();
        break;
      
      default:
        console.log('[Suggestions] Unknown suggestion type:', suggestion.type);
    }
    
    // Refresh analysis after applying
    setTimeout(() => {
      analyzeQuality();
      loadSuggestions();
    }, 500);
    
  } catch (error) {
    console.error('[Suggestions] Apply failed:', error);
    alert('Failed to apply suggestion: ' + error);
  }
}

const { activeMode } = storeToRefs(modeStore);
const configStore = useConfigStore();
const { theme } = storeToRefs(configStore);
const { global } = useTheme();
const isDarkTheme = computed(() => Boolean(global.current.value.dark));

onMounted(async () => {
  // Load catalog with tenantId from URL if public customer
  const tenantId = route.query.t as string | undefined;
  const hasAuth = sessionStore?.isAuthenticated;
  
  console.log("[editor] Initializing - Auth:", hasAuth, "Tenant ID:", tenantId);
  
  if (hasAuth) {
    await catalogStore.ensureLoaded().catch(err => console.warn("[catalog] load failed", err));
    gangStore.ensureLoaded().catch(err => console.warn("[gang-sheet] load failed", err));
  } else if (tenantId) {
    console.log("[editor] Public customer - loading catalog with tenant ID");
    // Manually fetch catalog with tenant header
    try {
      const response = await fetch('https://app.gsb-engine.dev/api/catalog', {
        headers: { 'X-Tenant-Id': tenantId }
      });
      const data = await response.json();
      console.log("[editor] Catalog API response:", data);
      
      if (data.data && Array.isArray(data.data)) {
        // Directly set products to catalogStore
        catalogStore.$patch({ products: data.data, loaded: true, loading: false });
        console.log("[editor] ✅ Loaded", data.data.length, "products:", data.data.map((p: any) => p.slug).join(', '));
      } else {
        console.error("[editor] Invalid catalog response:", data);
        catalogStore.$patch({ loaded: true, loading: false });
      }
    } catch (err) {
      console.error("[editor] Failed to load catalog for customer", err);
      catalogStore.$patch({ loaded: true, loading: false });
    }
  } else {
    console.log("[editor] Public access - no tenant ID, using hardcoded products");
    catalogStore.$patch({ loaded: true, loading: false });
  }

  // Check for URL params to auto-load product/surface
  const productSlug = route.query.product as string | undefined;
  const surfaceId = route.query.surface as string | undefined;
  const color = route.query.color as string | undefined;
  const material = route.query.material as string | undefined;
  const technique = route.query.technique as string | undefined;
  const shopifyProduct = route.query.shopifyProduct as string | undefined;
  const shopifyVariant = route.query.shopifyVariant as string | undefined;

  console.log("[editor] URL params:", { productSlug, surfaceId, color, material, technique, shopifyProduct, shopifyVariant });

  if (productSlug) {
    // Try to find product in catalog
    const product = catalogStore.sortedProducts.find(p => p.slug === productSlug);
    
    if (product) {
      console.log("[editor] Auto-loading product from catalog:", product.title);
      
      // Set active product
      editorStore.setProduct(productSlug);

      // Find and set surface
      let targetSurface = product.surfaces?.[0]; // Default to first surface
      
      if (surfaceId) {
        const foundSurface = product.surfaces?.find(s => s.id === surfaceId);
        if (foundSurface) {
          targetSurface = foundSurface;
        }
      }

      if (targetSurface) {
        console.log("[editor] Auto-loading surface:", targetSurface.name);
        editorStore.setSurface(targetSurface.id);
      }

      // Apply additional filters if provided
      if (color) {
        editorStore.color = color;
      }
      if (technique) {
        editorStore.setPrintTech(technique as any);
      }
    } else {
      // Product not in catalog - public customer access
      console.log("[editor] Product not in catalog, using URL params directly");
      console.log("[editor] Setting product:", productSlug);
      console.log("[editor] Setting surface:", surfaceId);
      
      // Try to set product anyway - it might be in fallback/hardcoded products
      if (productSlug) {
        editorStore.setProduct(productSlug);
      }
      
      if (surfaceId) {
        editorStore.setSurface(surfaceId);
      }
      
      if (technique) {
        editorStore.setPrintTech(technique as any);
      }
    }
    
    // Store Shopify context for checkout (save to localStorage for now)
    if (shopifyProduct || shopifyVariant) {
      const shopifyContext = {
        productGid: shopifyProduct,
        variantId: shopifyVariant,
        returnUrl: route.query.returnTo as string | undefined,
      };
      console.log("[editor] Storing Shopify context:", shopifyContext);
      // Store in localStorage for checkout
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('gsb-shopify-context', JSON.stringify(shopifyContext));
      }
    }
  }
});

const isGangMode = computed(() => activeMode.value === "gang");
const isDtfMode = computed(() => activeMode.value === "dtf");
const modeIndicatorIndex = computed(() => (isGangMode.value ? 0 : 1));
const modeTitle = computed(() => (isGangMode.value ? "Gang Sheet Builder" : "DTF Transfer Studio"));

const preflight = computed(() => editorStore.analysis);
const blockerCount = computed(() => preflight.value.validations.filter(v => v.level === "blocker").length);
const warningCount = computed(() => preflight.value.validations.filter(v => v.level === "warning").length);
const lowestImageDpi = computed(() => preflight.value.stats.lowestImageDpi);
const primaryBlocker = computed(() => preflight.value.validations.find(v => v.level === "blocker"));
const primaryWarning = computed(() => preflight.value.validations.find(v => v.level === "warning"));
const actionableValidation = computed(() => {
  if (primaryBlocker.value?.autoFix) return primaryBlocker.value;
  if (primaryWarning.value?.autoFix) return primaryWarning.value;
  return null;
});
const preflightDetailMessage = computed(() => primaryBlocker.value?.message ?? primaryWarning.value?.message ?? null);
const hasAutoFix = computed(() => Boolean(actionableValidation.value?.autoFix));
const preflightState = computed(() => {
  if (blockerCount.value > 0) return "blocker";
  if (warningCount.value > 0) return "warning";
  return "clear";
});

const activeTemplate = computed(() => editorStore.activeTemplate);
const hasTemplate = computed(() => Boolean(activeTemplate.value));
const templateChecklist = computed(() => editorStore.templateChecklist);
const templateSummary = computed(() => editorStore.templateChecklistSummary);
const templateStatus = computed(() => {
  if (!hasTemplate.value) return "none";
  if (templateSummary.value.missing > 0) return "missing";
  if (templateSummary.value.warnings > 0) return "warning";
  return "ready";
});
const templateStatusLabel = computed(() => {
  switch (templateStatus.value) {
    case "missing":
      return `${templateSummary.value.missing} required`;
    case "warning":
      return templateSummary.value.warnings === 1 ? "1 warning" : `${templateSummary.value.warnings} warnings`;
    case "ready":
      return "Ready";
    default:
      return "No template";
  }
});

function formatTimeAgo(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso ?? "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 45_000) return "just now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 90) return `${minutes}m ago`;
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 48) return `${hours}h ago`;
  return date.toLocaleDateString();
}

const lastSavedLabel = computed(() => {
  if (!editorStore.lastSavedAt) return null;
  const lastAutosave = editorStore.lastAutosaveAt;
  const wasAutosave = lastAutosave && editorStore.lastSavedAt === lastAutosave;
  const prefix = wasAutosave ? "Autosaved" : "Saved";
  return `${prefix} ${formatTimeAgo(editorStore.lastSavedAt)}`;
});

const autosaveError = computed(() => editorStore.autosaveError);

const submitting = ref(false);
const submitError = ref<string | null>(null);

const designStatusLabel = computed(() => {
  switch (editorStore.designStatus) {
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "ARCHIVED":
      return "Archived";
    default:
      return "Draft";
  }
});

const showLeftPane = ref(true);
const showToolbarStrip = ref(true);
const showRightPane = ref(true);

const leftWidth = ref(440);
const rightWidth = ref(360);
const minPaneWidth = 320;
const maxPaneWidth = 640;
const dtfPreferredWidth = 440;
const gangPreferredWidth = 360;
const resizing = ref<null | { side: "left" | "right"; startX: number; startWidth: number }>(null);

const layoutClasses = computed(() => ({
  "is-left-collapsed": !showLeftPane.value,
  "is-right-collapsed": !showRightPane.value,
  "is-toolstrip-collapsed": !showToolbarStrip.value,
}));

const paneStyle = computed(() => ({
  "--left-width": showLeftPane.value ? `${leftWidth.value}px` : "0px",
  "--right-width": showRightPane.value ? `${rightWidth.value}px` : "0px",
  "--left-handle-width": showLeftPane.value ? "12px" : "0px",
  "--right-handle-width": showRightPane.value ? "12px" : "0px",
}));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function togglePane(which: "left" | "tool" | "right") {
  if (resizing.value) {
    resizing.value = null;
    window.removeEventListener("pointermove", handleResize);
    window.removeEventListener("pointerup", stopResize);
  }
  if (which === "left") showLeftPane.value = !showLeftPane.value;
  if (which === "tool") showToolbarStrip.value = !showToolbarStrip.value;
  if (which === "right") showRightPane.value = !showRightPane.value;
}

function toggleDarkMode() {
  theme.value = isDarkTheme.value ? "light" : "dark";
}

function autoFixPreflight() {
  const validation = actionableValidation.value;
  const fix = validation?.autoFix;
  if (!fix) return;
  const normalize = (editorStore as Record<string, unknown>).normalizeToStage;
  switch (fix.action) {
    case "nudge":
      if (typeof normalize === "function") {
        (normalize as (options?: { constrainSafeArea?: boolean }) => void)({
          constrainSafeArea: Boolean(fix.constrainSafeArea),
        });
      } else {
        editorStore.nudgeSelectionIntoBounds?.();
      }
      break;
    case "grow-text":
      if (typeof (editorStore as any).ensureMinimumTextSize === "function" && fix.minimum) {
        (editorStore as any).ensureMinimumTextSize(fix.minimum, validation?.affected);
      }
      break;
    case "thicken-stroke":
      if (typeof (editorStore as any).ensureMinimumStrokeWidth === "function" && fix.minimum) {
        (editorStore as any).ensureMinimumStrokeWidth(fix.minimum, validation?.affected);
      }
      break;
    case "shrink-image":
      if (typeof (editorStore as any).shrinkImagesToMeetDpi === "function" && fix.minimum) {
        (editorStore as any).shrinkImagesToMeetDpi(fix.minimum, validation?.affected);
      }
      break;
    case "auto-pack":
      if (typeof (editorStore as any).autoArrange === "function") {
        (editorStore as any).autoArrange(fix.value ?? 8);
      }
      break;
    default:
      break;
  }
}

function handleSubmitCheckout() {
  if (submitting.value) return;
  if (blockerCount.value > 0) {
    submitError.value = "Please resolve blocking preflight issues before submitting.";
    return;
  }
  submitting.value = true;
  submitError.value = null;
  editorStore
    .checkoutWithDesign()
    .catch(error => {
      console.warn("[editor] checkout failed", error);
      submitError.value = error?.message ?? "Unable to submit design.";
    })
    .finally(() => {
      submitting.value = false;
    });
}

const commitActiveGangSheet = (id?: string) => {
  const sheetId = id ?? gangStore.activeSheetId;
  if (!sheetId || modeStore.activeMode !== "gang") return;
  gangStore.storeSnapshot(sheetId, editorStore.serializeSnapshot());
};

const loadGangSheet = (id?: string) => {
  const sheetId = id ?? gangStore.activeSheetId;
  if (!sheetId) return;
  const sheet = gangStore.sheets.find(s => s.id === sheetId);
  if (!sheet) return;
  const snapshot = gangStore.snapshotFor(sheetId);
  if (snapshot) {
    editorStore.applySnapshot(snapshot);
  } else {
    editorStore.setProduct("gangsheet");
    editorStore.clearDesign();
    editorStore.setSheetSizeInches(sheet.widthIn, sheet.heightIn);
  }
};

watch(isGangMode, gang => {
  if (gang) {
    if (leftWidth.value < gangPreferredWidth) leftWidth.value = gangPreferredWidth;
  } else if (leftWidth.value < dtfPreferredWidth) {
    leftWidth.value = dtfPreferredWidth;
  }
});

watch(isGangMode, async (active, wasActive) => {
  if (active) {
    if (!gangStore.loaded) {
      try {
        await gangStore.ensureLoaded();
      } catch (err) {
        console.warn("[gang-sheet] load failed", err);
      }
    }
    if (!gangStore.activeSheetId && gangStore.sheets.length) {
      gangStore.setActiveSheet(gangStore.sheets[0].id);
    }
    loadGangSheet(gangStore.activeSheetId);
  } else if (wasActive) {
    commitActiveGangSheet();
  }
});

watch(
  () => gangStore.activeSheetId,
  (next, prev) => {
    if (modeStore.activeMode !== "gang") return;
    if (prev) commitActiveGangSheet(prev);
    if (next) loadGangSheet(next);
  },
);

function resetTemplateDefaults() {
  editorStore.resetToTemplateDefaults();
}

function detachTemplate() {
  editorStore.clearActiveTemplate();
}

function startResize(side: "left" | "right", event: PointerEvent) {
  if ((side === "left" && !showLeftPane.value) || (side === "right" && !showRightPane.value)) return;
  event.preventDefault();
  resizing.value = {
    side,
    startX: event.clientX,
    startWidth: side === "left" ? leftWidth.value : rightWidth.value,
  };
  window.addEventListener("pointermove", handleResize);
  window.addEventListener("pointerup", stopResize);
}

function handleResize(event: PointerEvent) {
  if (!resizing.value) return;
  const delta = event.clientX - resizing.value.startX;
  if (resizing.value.side === "left") {
    leftWidth.value = clamp(resizing.value.startWidth + delta, minPaneWidth, maxPaneWidth);
  } else {
    rightWidth.value = clamp(resizing.value.startWidth - delta, minPaneWidth, maxPaneWidth);
  }
}

function stopResize() {
  if (!resizing.value) return;
  resizing.value = null;
  window.removeEventListener("pointermove", handleResize);
  window.removeEventListener("pointerup", stopResize);
}

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", handleResize);
  window.removeEventListener("pointerup", stopResize);
});

function changeMode(mode: "dtf" | "gang") {
  modeStore.switchTo(mode);
}
</script>

<template>
  <div class="editor-root" :class="layoutClasses" :style="paneStyle">
    <!-- Modern Topbar -->
    <EditorTopbar />
    
    <header class="area-toolbar">
      <div class="mode-switch" :style="{ '--active-index': modeIndicatorIndex }">
        <span class="mode-switch__indicator" />
        <button type="button" :class="{ active: isGangMode }" @click="changeMode('gang')">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Gang Sheet</span>
        </button>
        <button type="button" :class="{ active: isDtfMode }" @click="changeMode('dtf')">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>DTF Transfer</span>
        </button>
      </div>

      <div class="mode-title">
        {{ modeTitle }}
      </div>

      <div class="preflight-pill" :class="`state-${preflightState}`">
        <span class="pill-indicator" />
        <div class="pill-text">
          <strong v-if="preflightState === 'clear'">Ready for production</strong>
          <strong v-else>
            {{ blockerCount }} blocker<span v-if="blockerCount !== 1">s</span>
            � {{ warningCount }} warning<span v-if="warningCount !== 1">s</span>
          </strong>
          <span class="pill-detail">
            {{ preflightDetailMessage ?? "All layout constraints satisfied." }}
          </span>
        </div>
        <button
          v-if="hasAutoFix"
          type="button"
          class="pill-action"
          @click="autoFixPreflight"
        >
          Auto fix
        </button>
      </div>

      <div class="mode-actions">
        <div class="layout-toggles">
          <button
            type="button"
            class="ghost icon"
            :aria-pressed="showLeftPane"
            @click="togglePane('left')"
            title="Toggle left panel"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4v16M10 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Left</span>
          </button>
          <button
            type="button"
            class="ghost icon"
            :aria-pressed="showToolbarStrip"
            @click="togglePane('tool')"
            title="Toggle toolbar"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Toolbar</span>
          </button>
          <button
            type="button"
            class="ghost icon"
            :aria-pressed="showRightPane"
            @click="togglePane('right')"
            title="Toggle right panel"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 4v16M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Right</span>
          </button>
          <button
            type="button"
            class="ghost icon"
            @click="toggleDarkMode"
            title="Toggle theme"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{{ isDarkTheme ? "Light" : "Dark" }}</span>
          </button>
        </div>
        <span v-if="lastSavedLabel" class="save-indicator">{{ lastSavedLabel }}</span>
        <span v-else class="save-indicator">Status � {{ designStatusLabel }}</span>
      </div>
    </header>

    <aside class="left-pane">
      <details class="accordion" open>
        <summary>
          <span class="accordion-title">
            <svg class="accordion-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h10M4 17h16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Product & Surfaces</span>
          </span>
          <span class="accordion-toggle">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </summary>
        <div class="section-body">
          <ProductPanel />
        </div>
      </details>

      <details class="accordion" open>
        <summary>
          <span class="accordion-title">
            <svg class="accordion-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16v14H4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M4 11h16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
            <span>Asset Library</span>
          </span>
          <span class="accordion-toggle">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </summary>
        <div class="section-body">
          <AssetPanel />
        </div>
      </details>

      <details class="accordion" open>
        <summary>
          <span class="accordion-title">
            <svg class="accordion-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 7h12M6 12h12M6 17h12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M6 7v10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Layers</span>
          </span>
          <span class="accordion-toggle">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </summary>
        <div class="section-body">
          <LayersPanel />
        </div>
      </details>

      <details v-if="isGangMode" class="accordion" open>
        <summary>
          <span class="accordion-title">
            <svg class="accordion-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9h16M4 15h16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M9 4v16M15 4v16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Gang Sheet Queue</span>
          </span>
          <span class="accordion-toggle">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </summary>
        <div class="section-body">
          <GangSheetSidebar />
        </div>
      </details>
    </aside>

    <div
      class="resize-handle left"
      role="separator"
      aria-orientation="vertical"
      @pointerdown="startResize('left', $event)"
    >
      <div class="grip" />
    </div>

    <section class="center-pane" :class="{ 'tool-hidden': !showToolbarStrip }">
      <div class="tool-strip">
        <EditorToolbar />
      </div>
      <div class="stage-region" :class="{ 'gang-scene': isGangMode }">
        <div class="stage-headline">
          <span class="status-chip">{{ designStatusLabel }}</span>
          <span v-if="lowestImageDpi" class="dpi-indicator">Min DPI {{ Math.round(lowestImageDpi) }}</span>
          <span v-if="blockerCount > 0" class="warning-pill">Blocking issues detected</span>
          <span v-else-if="warningCount > 0" class="warning-pill mild">Warnings present</span>
        </div>
        <div class="stage-stack">
          <StageCanvas />
        </div>
        <div class="stage-footer">
          <div class="footer-info">
            <span v-if="submitError" class="error-label">{{ submitError }}</span>
            <span v-else-if="primaryWarning?.message" class="hint-label">{{ primaryWarning?.message }}</span>
          </div>
          <div class="footer-actions">
            <button type="button" class="ghost" @click="changeMode(isGangMode ? 'dtf' : 'gang')">
              Switch to {{ isGangMode ? "DTF Transfer" : "Gang Sheet" }}
            </button>
            <button
              type="button"
              class="primary"
              :disabled="submitting || blockerCount > 0"
              @click="handleSubmitCheckout"
            >
              {{ submitting ? "Submitting�" : "Send to Checkout" }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <div
      class="resize-handle right"
      role="separator"
      aria-orientation="vertical"
      @pointerdown="startResize('right', $event)"
    >
      <div class="grip" />
    </div>

    <aside class="right-pane">
      <details class="accordion" :open="hasTemplate">
        <summary>
          <span class="accordion-title">
            <svg class="accordion-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 3h14l-1.2 14.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M9 7h6M9 11h6M9 15h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Template Checklist</span>
          </span>
          <span class="template-status-chip" :data-status="templateStatus">
            {{ templateStatusLabel }}
          </span>
        </summary>
        <div class="section-body template-section">
          <div v-if="!hasTemplate" class="template-empty">
            <p>No template applied. Load a preset from the library to unlock guided placeholders.</p>
          </div>
          <div v-else>
            <header class="template-meta-head">
              <div>
                <div class="template-name">{{ activeTemplate?.title }}</div>
                <div class="template-sub text-caption">
                  {{ activeTemplate?.target.productSlug }} / {{ activeTemplate?.target.surfaceId }}
                  <span v-if="activeTemplate?.defaultPrintTech">
                    / {{ activeTemplate?.defaultPrintTech.toUpperCase() }}
                  </span>
                </div>
              </div>
              <div class="template-actions">
                <button type="button" class="link-button" @click="resetTemplateDefaults">
                  Reset
                </button>
                <button type="button" class="link-button danger" @click="detachTemplate">
                  Detach
                </button>
              </div>
            </header>
            <div class="template-entries">
              <div
                v-for="entry in templateChecklist"
                :key="entry.key"
                class="template-entry"
                :data-status="entry.status"
              >
                <div class="entry-main">
                  <span class="entry-title">{{ entry.label }}</span>
                  <span class="entry-meta text-caption">
                    {{ entry.type === 'text' ? 'Text field' : 'Image slot' }}
                    <span v-if="entry.layers.length"> / {{ entry.layers.join(', ') }}</span>
                  </span>
                </div>
                <div class="entry-state">
                  <span class="entry-pill" :data-status="entry.status">
                    <template v-if="entry.status === 'missing'">Missing</template>
                    <template v-else-if="entry.status === 'warning'">Review</template>
                    <template v-else>Ready</template>
                  </span>
                  <span v-if="entry.message" class="entry-message text-caption">
                    {{ entry.message }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>

      <details class="accordion" open>
        <summary>
          <span class="accordion-title">
            <svg class="accordion-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4h12l-1 16H7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
            <span>Properties</span>
          </span>
          <span class="accordion-toggle">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </summary>
        <div class="section-body">
          <PropertiesPanel />
        </div>
      </details>

      <!-- 3D Mockup Preview (replaces old MockupPreview) -->
      <MockupPreview3D />

      <!-- OPTION C: Quality Analysis Panel -->
      <details v-if="qualityAnalysis && qualityAnalysis.score" class="accordion" open>
        <summary>
          <span class="accordion-title">
            <Star :size="18" :stroke-width="2" style="color: #f59e0b;" />
            <span>Quality Analysis</span>
          </span>
          <span class="accordion-toggle">
            <ChevronDown :size="16" />
          </span>
        </summary>
        <div class="section-body">
          <div class="quality-content">
            <div v-if="qualityAnalysis.score" class="quality-score">
              <div class="score-header">
                <span>Overall Quality</span>
                <span class="score-value">{{ qualityAnalysis.score.toFixed(0) }}%</span>
              </div>
              <div class="score-bar">
                <div 
                  class="score-progress"
                  :style="{
                    width: qualityAnalysis.score + '%',
                    background: qualityAnalysis.score >= 80 ? '#10b981' : qualityAnalysis.score >= 60 ? '#f59e0b' : '#ef4444'
                  }"
                ></div>
              </div>
            </div>
            <div v-for="issue in qualityAnalysis.issues" :key="issue.type" class="quality-issue">
              <AlertCircle :size="16" :stroke-width="2" style="color: #f59e0b; flex-shrink: 0;" />
              <div>
                <strong>{{ issue.type }}:</strong> {{ issue.message }}
              </div>
            </div>
          </div>
        </div>
      </details>

      <!-- OPTION C: Smart Suggestions Panel -->
      <details v-if="suggestions && suggestions.length > 0" class="accordion" open>
        <summary>
          <span class="accordion-title">
            <Lightbulb :size="18" :stroke-width="2" style="color: #10b981;" />
            <span>Smart Suggestions</span>
          </span>
          <span class="accordion-toggle">
            <ChevronDown :size="16" />
          </span>
        </summary>
        <div class="section-body">
          <div class="suggestions-content">
            <div v-for="(sug, idx) in suggestions" :key="idx" class="suggestion-item">
              <div class="suggestion-header">
                <div class="suggestion-title">{{ sug.title }}</div>
                <button class="apply-btn" @click="applySuggestion(sug)">
                  <Check :size="14" :stroke-width="2.5" />
                  Apply
                </button>
              </div>
              <div class="suggestion-desc">{{ sug.description }}</div>
              <div class="suggestion-meta">
                <span v-if="sug.savings" class="savings">
                  <DollarSign :size="12" :stroke-width="2.5" />
                  Save {{ sug.savings.toFixed(2) }}%
                </span>
                <span v-if="sug.impact" class="impact">
                  Impact: {{ sug.impact }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </details>

      <!-- Advanced Cost Calculator (replaces old CostPanel) -->
      <AdvancedCostCalculator />

      <details v-if="isGangMode" class="accordion" open>
        <summary>
          <span class="accordion-title">
            <svg class="accordion-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 18h16M4 6h16M8 6v12M16 6v12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>Auto Build</span>
          </span>
          <span class="accordion-toggle">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </summary>
        <div class="section-body">
          <AutoBuildPanel />
        </div>
      </details>
    </aside>

    <div v-if="autosaveError" class="autosave-error">
      Autosave failed: {{ autosaveError }}
    </div>
  </div>
  
  <!-- Option C: Collaboration Chat (floating) -->
  <CollaborationChat
    v-if="collaboration.isEnabled.value"
    :user-count="collaboration.userCount.value"
    :has-collaborators="collaboration.hasCollaborators.value"
  />
  
  <!-- AI Design Assistant (floating) -->
  <AIDesignAssistant />
  
  <!-- Batch Operations Panel (floating) -->
  <BatchOperationsPanel />
  
  <!-- Keyboard Shortcuts Overlay -->
  <KeyboardShortcuts />
</template>

<style scoped>
.editor-root {
  --panel-bg: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
  --divider: rgba(209, 213, 219, 0.6);
  --surface-card: rgba(255, 255, 255, 1);
  --surface-solid: rgba(255, 255, 255, 0.95);
  --surface-soft: rgba(99, 102, 241, 0.08);
  --text-primary: #111827;
  --text-muted: #6b7280;
  --editor-accent: #6366f1;
  --panel-glow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  display: grid;
  grid-template-columns: var(--left-width, 360px) var(--left-handle-width, 12px) minmax(0, 1fr) var(--right-handle-width, 12px) var(--right-width, 360px);
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 0;
  min-height: 100vh;
  background: var(--panel-bg);
  color: var(--text-primary);
  padding: 0;
  box-sizing: border-box;
  border-radius: 0;
}

/* EditorTopbar takes full width */
.editor-root > :first-child {
  grid-column: 1 / -1;
}

.v-theme--dark .editor-root {
  --panel-bg: linear-gradient(180deg, #1f2937 0%, #111827 100%);
  --divider: rgba(55, 65, 81, 0.8);
  --surface-card: rgba(31, 41, 55, 1);
  --surface-solid: rgba(31, 41, 55, 0.95);
  --surface-soft: rgba(139, 92, 246, 0.15);
  --text-primary: #f9fafb;
  --text-muted: #9ca3af;
  --editor-accent: #8b5cf6;
  --panel-glow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
}

.editor-root.is-left-collapsed {
  --left-width: 0px;
  --left-handle-width: 0px;
}

.editor-root.is-right-collapsed {
  --right-width: 0px;
  --right-handle-width: 0px;
}

.editor-root.is-left-collapsed .left-pane,
.editor-root.is-right-collapsed .right-pane,
.editor-root.is-left-collapsed .resize-handle.left,
.editor-root.is-right-collapsed .resize-handle.right {
  display: none;
}

.area-toolbar {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: auto 1fr minmax(0, 320px) auto;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
  padding: 18px 20px;
  border-radius: 20px;
  background: var(--surface-card);
  border: 1px solid var(--divider);
  box-shadow: var(--panel-glow);
}

.mode-switch {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(140px, 1fr));
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 999px;
  padding: 4px;
  gap: 0;
  isolation: isolate;
  overflow: hidden;
}

.v-theme--dark .mode-switch {
  background: rgba(30, 41, 59, 0.72);
  border-color: rgba(148, 163, 184, 0.4);
}

.mode-switch__indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: calc(4px + var(--active-index, 0) * ((100% - 8px) * 0.5));
  width: calc((100% - 8px) * 0.5);
  border-radius: 999px;
  background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%);
  box-shadow: 0 14px 28px rgba(76, 29, 149, 0.24);
  transition: left 0.28s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.28s ease, box-shadow 0.28s ease;
}

.v-theme--dark .mode-switch__indicator {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  box-shadow: 0 16px 32px rgba(124, 58, 237, 0.28);
}

.mode-switch button {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--editor-font, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s ease;
}

.mode-switch button .icon {
  width: 16px;
  height: 16px;
  stroke: currentColor;
}

.mode-switch button.active {
  color: #fff;
}

.mode-switch button:focus-visible {
  outline: 2px solid rgba(76, 29, 149, 0.4);
  outline-offset: 2px;
}

.mode-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.preflight-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(15, 118, 110, 0.28);
  background: rgba(15, 118, 110, 0.12);
  color: #0f172a;
  font-size: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.preflight-pill .pill-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.18);
}

.preflight-pill .pill-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 260px;
}

.preflight-pill .pill-text strong {
  font-size: 12px;
  letter-spacing: 0.02em;
}

.preflight-pill .pill-detail {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.72);
}

.preflight-pill .pill-action {
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.preflight-pill .pill-action:hover {
  background: currentColor;
  color: #fff;
}

.preflight-pill.state-warning {
  background: rgba(217, 119, 6, 0.16);
  border-color: rgba(217, 119, 6, 0.4);
  color: #7c2d12;
}

.preflight-pill.state-warning .pill-indicator {
  background: #b45309;
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.16);
}

.preflight-pill.state-blocker {
  background: rgba(220, 38, 38, 0.18);
  border-color: rgba(220, 38, 38, 0.42);
  color: #7f1d1d;
}

.preflight-pill.state-blocker .pill-indicator {
  background: #dc2626;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.18);
}

.mode-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.layout-toggles {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

button.ghost {
  border: 1px solid var(--divider);
  background: var(--surface-solid);
  color: var(--text-muted);
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

button.ghost:hover {
  background: var(--surface-card);
  color: var(--text-primary);
  transform: translateY(-1px);
}

button.ghost.icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

button.ghost.icon svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
}

button.primary {
  border: 1px solid var(--editor-accent);
  background: var(--editor-accent);
  color: #fff;
  padding: 8px 18px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 0.2s ease;
}

button.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

button.primary:not(:disabled):hover {
  filter: brightness(1.05);
}

.save-indicator {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.save-indicator::before {
  content: "? ";
}

.left-pane,
.right-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 22px;
  box-shadow: var(--panel-glow);
  min-height: 0;
  overflow: hidden;
}

.left-pane {
  grid-column: 1;
  grid-row: 2;
  overflow: auto;
}

.right-pane {
  grid-column: 5;
  grid-row: 2;
  overflow: auto;
}

.resize-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  grid-row: 2;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.resize-handle.left {
  grid-column: 2;
}

.resize-handle.right {
  grid-column: 4;
}

.resize-handle .grip {
  width: 4px;
  height: 54px;
  border-radius: 999px;
  background: var(--divider);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.resize-handle:hover .grip {
  background: var(--editor-accent);
  box-shadow: 0 0 12px rgba(76, 29, 149, 0.35);
}

.center-pane {
  grid-column: 3;
  grid-row: 2;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.center-pane.tool-hidden {
  grid-template-columns: minmax(0, 1fr);
}

.center-pane.tool-hidden .tool-strip {
  display: none;
}

.tool-strip {
  background: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 18px;
  display: flex;
  justify-content: center;
  padding: 10px 6px;
  box-shadow: var(--panel-glow);
}

.tool-strip :deep(.v-toolbar) {
  flex-direction: column;
  gap: 10px;
}

.stage-region {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.92) 100%);
  border-radius: 24px;
  border: 1px solid var(--divider);
  box-shadow: var(--panel-glow);
  min-height: 0;
}

.stage-region.gang-scene {
  background: linear-gradient(180deg, rgba(129, 140, 248, 0.22) 0%, rgba(255, 255, 255, 0.94) 100%);
}

.stage-headline {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.16);
  color: #1e3a8a;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.v-theme--dark .status-chip {
  background: rgba(59, 130, 246, 0.24);
  color: #bfdbfe;
}

.dpi-indicator {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
}

.warning-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 12px;
  background: rgba(220, 38, 38, 0.14);
  color: #7f1d1d;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.warning-pill.mild {
  background: rgba(234, 179, 8, 0.18);
  color: #854d0e;
}

.stage-stack {
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
}

.stage-stack :deep(.editor-stage-wrap) {
  flex: 1;
  min-height: 0;
}

.stage-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-info {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 24px;
}

.hint-label {
  font-size: 12px;
  color: var(--text-muted);
}

.error-label {
  font-size: 12px;
  color: #dc2626;
  font-weight: 600;
}

.footer-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.accordion {
  border: 1px solid var(--divider);
  border-radius: 16px;
  background: var(--surface-solid);
  overflow: hidden;
  box-shadow: var(--panel-glow);
}

.accordion + .accordion {
  margin-top: 4px;
}

.accordion summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  list-style: none;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-primary);
}

.v-theme--dark .accordion summary {
  background: rgba(30, 41, 59, 0.8);
}

.accordion summary::-webkit-details-marker {
  display: none;
}

.accordion-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.accordion-icon {
  width: 18px;
  height: 18px;
  color: var(--editor-accent);
}

.accordion-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(76, 29, 149, 0.12);
  color: var(--editor-accent);
}

.accordion-toggle svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

details[open] .accordion-toggle svg {
  transform: rotate(180deg);
}

.section-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow: auto;
}

.section-body::-webkit-scrollbar {
  width: 6px;
}

.section-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.32);
  border-radius: 999px;
}

.section-body::-webkit-scrollbar-track {
  background: transparent;
}

.autosave-error {
  grid-column: 1 / -1;
  margin-top: 16px;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(220, 38, 38, 0.12);
  color: #7f1d1d;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 1280px) {
  .editor-root {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto auto;
    padding: 16px;
    border-radius: 0;
  }

  .area-toolbar {
    grid-column: 1;
    grid-row: 1;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .left-pane,
  .center-pane,
  .right-pane {
    grid-column: 1;
    grid-row: auto;
  }

  .resize-handle {
    display: none;
  }

  .center-pane {
    grid-template-columns: minmax(0, 1fr);
  }
}
.template-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-status-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
}

.template-status-chip[data-status="warning"] {
  background: rgba(234, 179, 8, 0.18);
  color: #92400e;
}

.template-status-chip[data-status="missing"] {
  background: rgba(220, 38, 38, 0.15);
  color: #991b1b;
}

.template-status-chip[data-status="none"] {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.template-empty {
  padding: 14px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.14);
  color: #475569;
  font-size: 0.85rem;
}

.template-meta-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.template-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
}

.template-sub {
  color: rgba(71, 85, 105, 0.8);
}

.template-actions {
  display: flex;
  gap: 8px;
}

.link-button {
  border: none;
  background: none;
  color: #4c1d95;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.link-button:hover {
  text-decoration: none;
}

.link-button.danger {
  color: #b91c1c;
}

.template-entries {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.template-entry {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: rgba(248, 250, 252, 0.6);
}

.template-entry[data-status="warning"] {
  border-color: rgba(234, 179, 8, 0.4);
  background: rgba(254, 243, 199, 0.28);
}

.template-entry[data-status="missing"] {
  border-color: rgba(220, 38, 38, 0.4);
  background: rgba(254, 226, 226, 0.28);
}

.entry-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.entry-meta {
  color: rgba(71, 85, 105, 0.82);
}

.entry-state {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 120px;
}

.entry-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(15, 118, 110, 0.15);
  color: #0f766e;
}

.entry-pill[data-status="warning"] {
  background: rgba(234, 179, 8, 0.2);
  color: #b45309;
}

.entry-pill[data-status="missing"] {
  background: rgba(220, 38, 38, 0.18);
  color: #b91c1c;
}

.entry-message {
  color: rgba(71, 85, 105, 0.82);
  font-size: 0.75rem;
  text-align: right;
  max-width: 220px;
}
</style>



