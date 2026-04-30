export type StorageMode = "local-demo" | "production-adapter";

export interface ApiConfig {
  storageMode: StorageMode;
}

export function getApiConfig(): ApiConfig {
  const storageMode = process.env.HADIRI_STORAGE_MODE === "production-adapter" ? "production-adapter" : "local-demo";

  return {
    storageMode
  };
}
