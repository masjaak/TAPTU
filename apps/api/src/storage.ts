import type { DemoStore } from "./domain";
import type { ApiConfig, SupabaseConfig } from "./config";
import { createInitialStore } from "./domain";
import { ensureStoreFile, loadStore, saveStore } from "./store";

export interface StorageAdapter {
  load(): Promise<DemoStore>;
  save(store: DemoStore): Promise<void>;
}

type Fetcher = typeof fetch;

export interface AttendanceSelfieUploadInput {
  dataUrl: string;
  fileName?: string;
  contentType?: string;
}

export interface AttendanceSelfieUploadResult {
  selfieUrl?: string;
  reason?: string;
}

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

function parseDataUrl(dataUrl: string): { contentType: string; bytes: ArrayBuffer } | null {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);

  if (!match) {
    return null;
  }

  const buffer = Buffer.from(match[2], "base64");

  return {
    contentType: match[1],
    bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  };
}

function buildSelfieObjectPath(userId: string, fileName?: string): string {
  const extension = fileName?.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `attendance/${userId}/${new Date().toISOString().slice(0, 10)}/${Date.now()}.${extension}`;
}

export async function uploadAttendanceSelfie(
  config: SupabaseConfig,
  userId: string,
  input: AttendanceSelfieUploadInput,
  fetcher: Fetcher = fetch
): Promise<AttendanceSelfieUploadResult> {
  if (!config.attendanceSelfieBucket) {
    return { selfieUrl: undefined, reason: "Penyimpanan selfie belum tersedia." };
  }

  if (!config.url || !config.serviceRoleKey) {
    return { selfieUrl: undefined, reason: "Penyimpanan selfie belum tersedia." };
  }

  const parsed = parseDataUrl(input.dataUrl);

  if (!parsed) {
    return { selfieUrl: undefined, reason: "Selfie belum bisa diproses." };
  }

  const url = normalizeSupabaseUrl(config.url);
  const path = buildSelfieObjectPath(userId, input.fileName);
  const uploadUrl = `${url}/storage/v1/object/${encodeURIComponent(config.attendanceSelfieBucket)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  try {
    const response = await fetcher(uploadUrl, {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": input.contentType ?? parsed.contentType,
        "x-upsert": "true"
      },
      body: parsed.bytes
    });

    if (!response.ok) {
      return { selfieUrl: undefined, reason: "Selfie tersimpan sebagai catatan review." };
    }

    return { selfieUrl: `${config.attendanceSelfieBucket}/${path}` };
  } catch {
    return { selfieUrl: undefined, reason: "Selfie tersimpan sebagai catatan review." };
  }
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
  createSupabaseStorageAdapter,
  uploadAttendanceSelfie
};
