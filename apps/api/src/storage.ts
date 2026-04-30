import type { DemoStore } from "./domain";
import type { StorageMode } from "./config";
import { ensureStoreFile, loadStore, saveStore } from "./store";

export interface StorageAdapter {
  load(): Promise<DemoStore>;
  save(store: DemoStore): Promise<void>;
}

export function createStorageAdapter(mode: StorageMode, filePath: string): StorageAdapter {
  if (mode === "production-adapter") {
    return {
      async load() {
        return ensureStoreFile(filePath);
      },
      async save(store) {
        await saveStore(filePath, store);
      }
    };
  }

  return {
    async load() {
      try {
        return await loadStore(filePath);
      } catch {
        return ensureStoreFile(filePath);
      }
    },
    async save(store) {
      await saveStore(filePath, store);
    }
  };
}
