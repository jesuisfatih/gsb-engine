import { computed, onBeforeUnmount, watch } from "vue";
import { useEditorStore } from "../store/editorStore";
import { useEditorModeStore } from "../store/editorModeStore";

function isAutosaveMode(mode?: string | null) {
  return mode === "dtf" || mode === "gang";
}

export function useAutosaveManager() {
  const editorStore = useEditorStore();
  const modeStore = useEditorModeStore();

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
