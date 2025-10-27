import { defineStore } from "pinia";
import { $api } from "@/utils/api";
import { useSessionStore } from "@/modules/auth/stores/sessionStore";
import type { LayerItem } from "../types";

type AutoSettings = {
  marginIn: number;
  spacingIn: number;
  rotateAlternating: boolean;
  allowFlip: boolean;
  breakByColor: boolean;
};

export interface GangSheetItem {
  id: string;
  designId?: string | null;
  quantity: number;
  position: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  layer?: LayerItem;
}

export interface GangSheet {
  id: string;
  name: string;
  widthIn: number;
  heightIn: number;
  supplier: string;
  technique: string;
  quantity: number;
  utilization: number;
  status: string;
  notes?: string | null;
  snapshot?: Record<string, unknown> | null;
  previewUrl?: string | null;
  items: GangSheetItem[];
  autosaveSnapshot?: Record<string, unknown> | null;
  autosaveAt?: string | null;
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

const MM_PER_INCH = 25.4;

function inchesToMm(value: number) {
  return value * MM_PER_INCH;
}

function mmToInches(value: number) {
  return value / MM_PER_INCH;
}

function deepClone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

const DEFAULT_SHEET_TEMPLATE: GangSheet = {
  id: "sheet-local",
  name: 'Sheet 1 - 22" x 24"',
  widthIn: 22,
  heightIn: 24,
  supplier: "Default vendor",
  technique: "DTF",
  quantity: 1,
  utilization: 0,
  status: "Draft",
  snapshot: null,
  previewUrl: null,
  items: [],
  notes: null,
  autosaveSnapshot: null,
  autosaveAt: null,
};

function mapApiSheetItem(entry: any): GangSheetItem {
  const metadata = entry?.metadata ? deepClone(entry.metadata) : undefined;
  const layer = metadata?.layer ? deepClone(metadata.layer) as LayerItem : undefined;
  return {
    id: entry?.id ?? `item-${uid()}`,
    designId: entry?.designId ?? undefined,
    quantity: entry?.quantity ?? 1,
    position: entry?.position ? deepClone(entry.position) : {},
    metadata,
    layer,
  };
}

function mapApiSheet(entry: any): GangSheet {
  const widthIn = entry?.sheetWidthMm ? mmToInches(entry.sheetWidthMm) : entry?.widthIn ?? DEFAULT_SHEET_TEMPLATE.widthIn;
  const heightIn = entry?.sheetHeightMm ? mmToInches(entry.sheetHeightMm) : entry?.heightIn ?? DEFAULT_SHEET_TEMPLATE.heightIn;
  const items = Array.isArray(entry?.items) ? entry.items.map(mapApiSheetItem) : [];
  return {
    id: entry?.id ?? `sheet-${uid()}`,
    name: entry?.name ?? `Sheet ${widthIn.toFixed(2)}" x ${heightIn.toFixed(2)}"`,
    widthIn,
    heightIn,
    supplier: entry?.supplier ?? DEFAULT_SHEET_TEMPLATE.supplier,
    technique: entry?.technique ?? DEFAULT_SHEET_TEMPLATE.technique,
    quantity: entry?.quantity ?? DEFAULT_SHEET_TEMPLATE.quantity,
    utilization: entry?.utilization ?? DEFAULT_SHEET_TEMPLATE.utilization,
    status: entry?.status ?? DEFAULT_SHEET_TEMPLATE.status,
    notes: entry?.notes ?? null,
    snapshot: entry?.snapshot ?? null,
    previewUrl: entry?.previewUrl ?? null,
    items,
    autosaveSnapshot: entry?.autosaveSnapshot ?? null,
    autosaveAt: entry?.autosaveAt ?? null,
  };
}

function buildGangSheetPayload(sheet: GangSheet) {
  return {
    name: sheet.name,
    sheetWidthMm: inchesToMm(sheet.widthIn),
    sheetHeightMm: inchesToMm(sheet.heightIn),
    snapshot: sheet.snapshot ?? {},
    previewUrl: sheet.previewUrl ?? null,
    utilization: sheet.utilization ?? 0,
    status: sheet.status,
    notes: sheet.notes ?? null,
  };
}

function buildItemPayload(item: GangSheetItem) {
  const metadata = item.metadata ?? (item.layer ? { layer: item.layer } : undefined);
  return {
    id: item.id,
    designId: item.designId ?? undefined,
    quantity: item.quantity ?? 1,
    position: item.position ?? {},
    metadata,
  };
}

function cloneGangSheetItem(item: GangSheetItem): GangSheetItem {
  return {
    id: item.id,
    designId: item.designId,
    quantity: item.quantity,
    position: deepClone(item.position),
    metadata: item.metadata ? deepClone(item.metadata) : undefined,
    layer: item.layer ? deepClone(item.layer) : item.metadata?.layer ? deepClone(item.metadata.layer as LayerItem) : undefined,
  };
}

function normalizeSnapshotItem(item: LayerItem): GangSheetItem {
  const id = item.id ?? `layer-${uid()}`;
  const metadata: Record<string, unknown> = {
    kind: item.kind,
    layer: deepClone(item),
  };
  return {
    id,
    designId: (item as any).designId ?? undefined,
    quantity: (item as any).quantity ?? 1,
    position: {
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      width: "width" in item ? (item as any).width : undefined,
      height: "height" in item ? (item as any).height : undefined,
      scaleX: (item as any).scaleX ?? 1,
      scaleY: (item as any).scaleY ?? 1,
      normalized: (item as any).normalized ?? undefined,
    },
    metadata,
    layer: deepClone(item),
  };
}

function itemsEqual(a: GangSheetItem, b: GangSheetItem) {
  return (
    a.id === b.id &&
    a.designId === b.designId &&
    a.quantity === b.quantity &&
    JSON.stringify(a.position) === JSON.stringify(b.position) &&
    JSON.stringify(a.metadata ?? null) === JSON.stringify(b.metadata ?? null)
  );
}

function diffGangSheetItems(previous: GangSheetItem[], next: GangSheetItem[]) {
  const prevMap = new Map(previous.map(item => [item.id, item]));
  const nextMap = new Map(next.map(item => [item.id, item]));

  const toCreate: GangSheetItem[] = [];
  const toUpdate: GangSheetItem[] = [];
  const toDelete: GangSheetItem[] = [];

  for (const item of next) {
    const prev = prevMap.get(item.id);
    if (!prev) {
      toCreate.push(item);
    } else if (!itemsEqual(prev, item)) {
      toUpdate.push(item);
    }
  }

  for (const prev of previous) {
    if (!nextMap.has(prev.id)) {
      toDelete.push(prev);
    }
  }

  return { toCreate, toUpdate, toDelete };
}

export const useGangSheetStore = defineStore("gangSheet", {
  state: () => ({
    sheets: [] as GangSheet[],
    activeSheetId: null as string | null,
    loading: false,
    loaded: false,
    error: null as string | null,
    autoSettings: {
      marginIn: 0.125,
      spacingIn: 0.25,
      rotateAlternating: true,
      allowFlip: false,
      breakByColor: false,
    } as AutoSettings,
  }),
  getters: {
    activeSheet(state): GangSheet | null {
      return state.sheets.find(s => s.id === state.activeSheetId) ?? state.sheets[0] ?? null;
    },
    totalUtilization(state) {
      if (!state.sheets.length) return 0;
      const sum = state.sheets.reduce((acc, sheet) => acc + sheet.utilization, 0);
      return sum / state.sheets.length;
    },
  },
  actions: {
    seedDefaults() {
      if (this.sheets.length) return;
      const seed = { ...deepClone(DEFAULT_SHEET_TEMPLATE), id: `local-${uid()}` };
      this.sheets = [seed];
      this.activeSheetId = seed.id;
    },
    async ensureLoaded(force = false) {
      if (this.loaded && !force) return;
      this.loading = true;
      this.error = null;
      try {
        const session = useSessionStore();
        if (session.accessToken && !session.activeTenantId)
          await session.fetchServerSession({ silent: true }).catch(() => {});

        const response = await $api<{ data: any[] }>("/gang-sheets?includeItems=true");
        const data = Array.isArray(response.data) ? response.data.map(mapApiSheet) : [];
        this.sheets = data.length ? data : [];
        if (!this.sheets.length) this.seedDefaults();
        this.activeSheetId = this.sheets[0]?.id ?? this.activeSheetId ?? null;
        this.loaded = true;
      } catch (error: any) {
        console.warn("[gang-sheet] Failed to load from API, falling back to seed data.", error);
        this.error = error?.message ?? String(error);
        this.seedDefaults();
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
    async createSheet(template?: Partial<GangSheet>) {
      const index = this.sheets.length + 1;
      const widthIn = template?.widthIn ?? 22;
      const heightIn = template?.heightIn ?? 24;
      const name = template?.name ?? `Sheet ${index} - ${widthIn.toFixed(2)}" x ${heightIn.toFixed(2)}"`;
      try {
        const response = await $api<{ data: any }>("/gang-sheets", {
          method: "POST",
          body: {
            name,
            sheetWidthMm: inchesToMm(widthIn),
            sheetHeightMm: inchesToMm(heightIn),
            snapshot: template?.snapshot ?? {},
            previewUrl: template?.previewUrl ?? null,
            utilization: template?.utilization ?? 0,
            status: template?.status ?? "Draft",
            notes: template?.notes ?? null,
            items: template?.items?.map(buildItemPayload),
          },
        });
        const sheet = mapApiSheet(response.data);
        sheet.supplier = template?.supplier ?? sheet.supplier;
        sheet.technique = template?.technique ?? sheet.technique;
        sheet.quantity = template?.quantity ?? sheet.quantity;
        sheet.status = template?.status ?? sheet.status;
        sheet.notes = template?.notes ?? sheet.notes;
        if (template?.items?.length) {
          sheet.items = template.items.map(cloneGangSheetItem);
        }
        this.sheets.push(sheet);
        this.activeSheetId = sheet.id;
      } catch (error) {
        console.warn("[gang-sheet] createSheet fallback to local", error);
        const sheet: GangSheet = {
          id: `local-${uid()}`,
          name,
          widthIn,
          heightIn,
          supplier: template?.supplier ?? "Default vendor",
          technique: template?.technique ?? "DTF",
          quantity: template?.quantity ?? 1,
          utilization: template?.utilization ?? 0,
          status: template?.status ?? "Draft",
          notes: template?.notes ?? null,
          snapshot: template?.snapshot ? deepClone(template.snapshot) : null,
          previewUrl: template?.previewUrl ?? null,
          items: template?.items ? template.items.map(cloneGangSheetItem) : [],
          autosaveSnapshot: null,
          autosaveAt: null,
        };
        this.sheets.push(sheet);
        this.activeSheetId = sheet.id;
      }
    },
    setActiveSheet(id: string) {
      if (!this.sheets.some(s => s.id === id)) return;
      this.activeSheetId = id;
    },
    storeSnapshot(id: string, snapshot: any) {
      const sheet = this.sheets.find(s => s.id === id);
      if (!sheet) return;
      if (!snapshot) {
        sheet.snapshot = null;
        sheet.previewUrl = null;
        sheet.items = [];
        void this.syncSheet(id);
        return;
      }
      const { items, previewUrl, ...rest } = snapshot;
      sheet.snapshot = deepClone(rest);
      sheet.autosaveSnapshot = deepClone(rest);
      if (previewUrl !== undefined)
        sheet.previewUrl = previewUrl ?? null;
      sheet.autosaveAt = new Date().toISOString();
      const previousItems = sheet.items.map(cloneGangSheetItem);
      const normalizedItems = Array.isArray(items) ? items.map(normalizeSnapshotItem) : [];
      sheet.items = normalizedItems.map(cloneGangSheetItem);
      void this.syncSheet(id);
      void this.syncSheetItems(sheet, previousItems, normalizedItems);
    },
    snapshotFor(id: string) {
      const sheet = this.sheets.find(s => s.id === id);
      if (!sheet?.snapshot) return null;
      const snapshot = deepClone(sheet.snapshot) ?? {};
      const items = sheet.items.map(item => {
        if (item.layer) return deepClone(item.layer);
        if (item.metadata?.layer) return deepClone(item.metadata.layer as LayerItem);
        return {
          id: item.id,
          ...deepClone(item.position),
        } as LayerItem;
      });
      return {
        ...snapshot,
        items,
        previewUrl: sheet.previewUrl ?? null,
      };
    },
    async duplicateSheet(id: string) {
      const ref = this.sheets.find(s => s.id === id);
      if (!ref) return;
      const baseName = ref.name.split(" - ")[0];
      await this.createSheet({
        name: `${baseName} - Copy`,
        widthIn: ref.widthIn,
        heightIn: ref.heightIn,
        supplier: ref.supplier,
        technique: ref.technique,
        quantity: ref.quantity,
        utilization: ref.utilization,
        status: "Draft",
        notes: ref.notes ?? null,
        snapshot: ref.snapshot ? deepClone(ref.snapshot) : null,
        previewUrl: ref.previewUrl ?? null,
        items: ref.items.map(cloneGangSheetItem),
      });
    },
    async removeSheet(id: string) {
      if (this.sheets.length <= 1) return;
      const idx = this.sheets.findIndex(s => s.id === id);
      if (idx === -1) return;
      const sheet = this.sheets[idx];
      const nextActiveIdx = this.activeSheetId === id ? Math.max(0, idx - 1) : null;

      this.sheets.splice(idx, 1);
      if (nextActiveIdx !== null) {
        this.activeSheetId = this.sheets[nextActiveIdx]?.id ?? this.sheets[0]?.id ?? null;
      }

      if (!sheet.id.startsWith("local-")) {
        try {
          await $api(`/gang-sheets/${sheet.id}`, { method: "DELETE" });
        } catch (error) {
          console.warn("[gang-sheet] delete failed", error);
          this.sheets.splice(idx, 0, sheet);
          if (nextActiveIdx !== null) this.activeSheetId = id;
          throw error;
        }
      }
    },
    setQuantity(id: string, qty: number) {
      const sheet = this.sheets.find(s => s.id === id);
      if (!sheet) return;
      sheet.quantity = Math.max(1, Math.round(qty));
      void this.syncSheet(sheet.id);
    },
    setUtilization(util: number) {
      const clamped = Math.max(0, Math.min(1, util));
      for (const sheet of this.sheets) {
        sheet.utilization = clamped;
        void this.syncSheet(sheet.id);
      }
    },
    updateSheetSize(id: string, widthIn: number, heightIn: number) {
      const sheet = this.sheets.find(s => s.id === id);
      if (!sheet) return;
      sheet.widthIn = Math.max(1, Number(widthIn));
      sheet.heightIn = Math.max(1, Number(heightIn));
      const base = sheet.name.split(" - ")[0];
      sheet.name = `${base} - ${sheet.widthIn.toFixed(2)}" x ${sheet.heightIn.toFixed(2)}"`;
      void this.syncSheet(sheet.id);
    },
    cycleSheet(direction: 1 | -1) {
      if (!this.sheets.length) return;
      const currentIdx = this.sheets.findIndex(s => s.id === this.activeSheetId);
      const nextIdx = (currentIdx + direction + this.sheets.length) % this.sheets.length;
      this.activeSheetId = this.sheets[nextIdx].id;
    },
    updateAutoSetting<K extends keyof AutoSettings>(key: K, value: AutoSettings[K]) {
      this.autoSettings[key] = value;
    },
    async submitGangSheetPlan() {
      await new Promise(resolve => setTimeout(resolve, 250));
      return {
        sheets: this.sheets.map(s => ({
          id: s.id,
          supplier: s.supplier,
          quantity: s.quantity,
        })),
      };
    },
    async syncSheet(id: string) {
      if (!id || id.startsWith("local-")) return;
      const sheet = this.sheets.find(s => s.id === id);
      if (!sheet) return;
      try {
        const response = await $api<{ data: any }>(`/gang-sheets/${id}`, {
          method: "PATCH",
          body: { ...buildGangSheetPayload(sheet), autosave: true },
        });
        const updated = mapApiSheet(response.data);
        sheet.previewUrl = updated.previewUrl ?? sheet.previewUrl ?? null;
        sheet.status = updated.status;
        sheet.notes = updated.notes;
        sheet.utilization = updated.utilization;
        sheet.autosaveSnapshot = updated.autosaveSnapshot ?? sheet.autosaveSnapshot ?? null;
        sheet.autosaveAt = updated.autosaveAt ?? sheet.autosaveAt ?? null;
      } catch (error) {
        console.warn("[gang-sheet] sync error", error);
      }
    },
    async syncSheetItems(sheet: GangSheet, previous: GangSheetItem[], next: GangSheetItem[]) {
      if (!sheet.id || sheet.id.startsWith("local-")) return;
      const { toCreate, toUpdate, toDelete } = diffGangSheetItems(previous, next);
      if (!toCreate.length && !toUpdate.length && !toDelete.length) return;
      try {
        const createdResults = await Promise.all(
          toCreate.map(async item => {
            const response = await $api<{ data: any }>(`/gang-sheets/${sheet.id}/items`, {
              method: "POST",
              body: buildItemPayload(item),
            });
            return mapApiSheetItem(response.data);
          }),
        );

        await Promise.all(
          toUpdate.map(item =>
            $api<{ data: any }>(`/gang-sheets/${sheet.id}/items/${encodeURIComponent(item.id)}`, {
              method: "PATCH",
              body: buildItemPayload(item),
            }),
          ),
        );

        await Promise.all(
          toDelete.map(item =>
            $api(`/gang-sheets/${sheet.id}/items/${encodeURIComponent(item.id)}`, {
              method: "DELETE",
            }),
          ),
        );

        if (createdResults.length) {
          const createdMap = new Map(createdResults.map(result => [result.id, result]));
          sheet.items = next.map(item => {
            const created = createdMap.get(item.id);
            return created ? created : cloneGangSheetItem(item);
          });
        } else {
          sheet.items = next.map(cloneGangSheetItem);
        }
      } catch (error) {
        console.warn("[gang-sheet] item sync failed", error);
        sheet.items = previous.map(cloneGangSheetItem);
      }
    },
    reset() {
      this.sheets = [];
      this.activeSheetId = null;
      this.loaded = false;
      this.error = null;
      this.seedDefaults();
    },
  },
});
