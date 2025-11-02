import { computed, onBeforeUnmount, watch } from "vue";
import { useEditorStore } from "../store/editorStore";
import { useEditorModeStore } from "../store/editorModeStore";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import { useAnonymousDesignStorage } from "./useAnonymousDesignStorage";
import { useParentStorage } from "@/composables/useParentStorage";

function isAutosaveMode(mode?: string | null) {
  return mode === "dtf" || mode === "gang";
}

export function useAutosaveManager() {
  const sessionStore = useSessionStore();
  const editorStore = useEditorStore();
  const modeStore = useEditorModeStore();

  // For anonymous users, ALWAYS use hybrid localStorage (even in iframe)
  // Parent storage disabled - not reliable without parent listener
  if (!sessionStore?.isAuthenticated) {
    // Skip parent storage check - use hybrid storage instead
    console.log('[autosave] Anonymous user - using hybrid localStorage (iframe or not)');
    
    // Fallback: localStorage (non-iframe) - HYBRID STORAGE MODE
    console.log('[autosave] Using hybrid storage mode (multi-design + Safari fallback)');
    
    // Import hybrid storage
    let hybridStorage: ReturnType<typeof import('@/composables/useHybridStorage').useHybridStorage> | null = null;
    
    (async () => {
      const { useHybridStorage } = await import('@/composables/useHybridStorage');
      hybridStorage = useHybridStorage();
      await hybridStorage.init();
      console.log('[autosave] ✅ Hybrid storage initialized');
    })();
    
    const { scheduleSave } = useAnonymousDesignStorage({
      getSnapshot: () => editorStore.serializeSnapshot(),
      enabled: () => isAutosaveMode(modeStore.activeMode),
      debounceMs: 2000,
      onSave: (timestamp: string) => {
        // HYBRID STORAGE: Save to multi-design storage
        if (hybridStorage && editorStore.productSlug && editorStore.surfaceId) {
          const designKey = hybridStorage.getDesignKey(
            editorStore.productSlug,
            editorStore.surfaceId,
            editorStore.color
          );
          
          hybridStorage.saveDesign(designKey, {
            designId: editorStore.designId || `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            snapshot: editorStore.serializeSnapshot(),
            previewUrl: undefined, // Will be captured on checkout
            inCart: false,
            createdAt: new Date().toISOString(),
          });
        }
        
        // Update editorStore timestamps and history for UI display
        editorStore.lastAutosaveAt = timestamp;
        editorStore.lastSavedAt = timestamp;
        editorStore.recordAutosaveHistory({
          kind: 'autosave',
          message: 'Autosaved to browser (hybrid storage)',
          timestamp,
          status: editorStore.designStatus,
        });
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Autosave failed';
        editorStore.autosaveError = message;
        editorStore.recordAutosaveHistory({
          kind: 'error',
          message: `Autosave error: ${message}`,
          timestamp: new Date().toISOString(),
          status: editorStore.designStatus,
        });
      },
    });

    const snapshotSignature = computed(() => {
      try {
        return JSON.stringify(editorStore.serializeSnapshot());
      } catch (error) {
        return Math.random().toString(36);
      }
    });

    const stopWatch = watch(
      snapshotSignature,
      (next, prev) => {
        if (next === prev) return;
        scheduleSave();
      },
      { flush: "post" },
    );

    const stopModeWatch = watch(
      () => modeStore.activeMode,
      mode => {
        if (isAutosaveMode(mode)) {
          scheduleSave();
        }
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      stopWatch();
      stopModeWatch();
    });

    return;
  }

  // For authenticated users, use backend autosave

  let timer: number | null = null;
  let saving = false;
  let queued = false;

  const snapshotSignature = computed(() => {
    try {
      return JSON.stringify(editorStore.serializeSnapshot());
    } catch (error) {
      console.warn("[autosave] failed to compute snapshot signature", error);
      return Math.random().toString(36);
    }
  });

  const clearTimer = () => {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (delay = 1500) => {
    if (!isAutosaveMode(modeStore.activeMode)) return;
    clearTimer();
    timer = window.setTimeout(() => {
      timer = null;
      void runAutosave();
    }, delay);
  };

  const runAutosave = async () => {
    if (saving) {
      queued = true;
      return;
    }
    saving = true;
    try {
      await editorStore.persistDesign({ autosave: true });
    } catch (error) {
      console.warn("[autosave] design autosave failed", error);
    } finally {
      saving = false;
      if (queued) {
        queued = false;
        schedule(400);
      }
    }
  };

  const stopWatch = watch(
    snapshotSignature,
    (next, prev) => {
      if (next === prev) return;
      schedule();
    },
    { flush: "post" },
  );

  const stopModeWatch = watch(
    () => modeStore.activeMode,
    mode => {
      if (!isAutosaveMode(mode)) {
        clearTimer();
      } else {
        schedule(300);
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    clearTimer();
    stopWatch();
    stopModeWatch();
  });
}
