import type { DemoStore } from "./domain";
import type { ApiConfig, SupabaseConfig } from "./config";
import { createInitialStore } from "./domain";
import { ensureStoreFile, loadStore, saveStore } from "./store";

export interface StorageAdapter {
  load(): Promise<DemoStore>;
  save(store: DemoStore): Promise<void>;
}

type Fetcher = typeof fetch;

interface SupabaseStoreRow {
  id: string;
  payload: DemoStore;
}

function requireSupabaseValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required when TAPTU_STORAGE_MODE=supabase`);
  }

  return value;
}

function normalizeSupabaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function createSupabaseStorageAdapter(config: SupabaseConfig, fetcher: Fetcher = fetch): StorageAdapter {
  const url = normalizeSupabaseUrl(requireSupabaseValue(config.url, "SUPABASE_URL"));
  const serviceRoleKey = requireSupabaseValue(config.serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY");
  const rowId = encodeURIComponent(config.storeKey);
  const tableName = encodeURIComponent(config.tableName);
  const tableUrl = `${url}/rest/v1/${tableName}`;
  const rowUrl = `${tableUrl}?id=eq.${rowId}`;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };

  async function save(store: DemoStore): Promise<void> {
    const response = await fetcher(tableUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: config.storeKey,
        payload: store,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save Supabase store: ${response.status} ${await response.text()}`);
    }
  }

  return {
    async load() {
      const response = await fetcher(`${rowUrl}&select=id,payload`, {
        headers: {
          ...headers,
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load Supabase store: ${response.status} ${await response.text()}`);
      }

      const rows = (await response.json()) as SupabaseStoreRow[];

      if (rows[0]?.payload) {
        return rows[0].payload;
      }

      const initialStore = createInitialStore();
      await save(initialStore);
      return initialStore;
    },
    save
  };
}

export function createStorageAdapter(config: ApiConfig, filePath: string): StorageAdapter {
  if (config.storageMode === "supabase") {
    return createSupabaseStorageAdapter(config.supabase);
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

export const __test = {
  createSupabaseStorageAdapter
};
