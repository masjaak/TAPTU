import { describe, expect, it, vi } from "vitest";

describe("api config", () => {
  it("defaults to local-demo mode", async () => {
    vi.stubEnv("HADIRI_STORAGE_MODE", "");
    const { getApiConfig } = await import("./config");
    expect(getApiConfig().storageMode).toBe("local-demo");
  });

  it("accepts production-adapter mode", async () => {
    vi.stubEnv("HADIRI_STORAGE_MODE", "production-adapter");
    const { getApiConfig } = await import("./config");
    expect(getApiConfig().storageMode).toBe("production-adapter");
  });
});
