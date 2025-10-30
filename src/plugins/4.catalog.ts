import type { App } from "vue";
import { store } from "./2.pinia";
import { useCatalogStore } from "@/modules/catalog/store/catalogStore";

export default function (_app: App) {
  const catalog = useCatalogStore(store);
  if (!catalog.loaded) {
    catalog.ensureLoaded().catch(() => undefined);
  }
}
