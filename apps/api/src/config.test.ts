import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("api config", () => {
  it("defaults to local-demo mode", async () => {
    vi.stubEnv("TAPTU_STORAGE_MODE", "");
    const { getApiConfig } = await import("./config");
    expect(getApiConfig().storageMode).toBe("local-demo");
  });

  it("accepts Supabase mode", async () => {
    vi.stubEnv("TAPTU_STORAGE_MODE", "supabase");
    const { getApiConfig } = await import("./config");
    expect(getApiConfig().storageMode).toBe("supabase");
  });

  it("reads Supabase connection settings", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("SUPABASE_STORE_TABLE", "custom_store");
    vi.stubEnv("SUPABASE_STORE_KEY", "prod");
    const { getApiConfig } = await import("./config");

    expect(getApiConfig().supabase).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-key",
      tableName: "custom_store",
      storeKey: "prod"
    });
  });
});
