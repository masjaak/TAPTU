import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type StorageMode = "local-demo" | "supabase";

export interface SupabaseConfig {
  url?: string;
  serviceRoleKey?: string;
  tableName: string;
  storeKey: string;
}

export interface ApiConfig {
  storageMode: StorageMode;
  supabase: SupabaseConfig;
}

function resolveEnvFilePath(): string | null {
  const candidates = [join(process.cwd(), ".env"), join(process.cwd(), "apps", "api", ".env")];
  return candidates.find((path) => existsSync(path)) ?? null;
}

function loadEnvFile(): void {
  const envFilePath = resolveEnvFilePath();

  if (!envFilePath) {
    return;
  }

  const lines = readFileSync(envFilePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getApiConfig(): ApiConfig {
  loadEnvFile();

  const storageMode = process.env.TAPTU_STORAGE_MODE === "supabase" ? "supabase" : "local-demo";

  return {
    storageMode,
    supabase: {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      tableName: process.env.SUPABASE_STORE_TABLE ?? "taptu_app_store",
      storeKey: process.env.SUPABASE_STORE_KEY ?? "demo"
    }
  };
}
