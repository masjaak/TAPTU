import { afterEach, describe, expect, it, vi } from "vitest";

import { getDashboard, login } from "../lib/api";

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws a descriptive error when the server is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(login({ email: "nonexistent@example.com", password: "Password123!" })).rejects.toThrow(
      "Tidak dapat terhubung ke server"
    );
  });

  it("throws the API error message when the server responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Akun tidak ditemukan atau password salah." })
      })
    );

    await expect(login({ email: "wrong@taptu.app", password: "WrongPass1" })).rejects.toThrow(
      "Akun tidak ditemukan atau password salah."
    );
  });
});

describe("demo mode login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns session for superadmin demo credentials without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await login({ email: "superadmin@taptu.app", password: "Taptu123!" });
    expect(result.user.role).toBe("superadmin");
    expect(result.token).toMatch(/^demo:/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns session for admin demo credentials without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await login({ email: "admin@taptu.app", password: "Taptu123!" });
    expect(result.user.role).toBe("admin");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns session for employee demo credentials without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });
    expect(result.user.role).toBe("employee");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls through to API when demo email is used with wrong password", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(login({ email: "admin@taptu.app", password: "WrongPassword1" })).rejects.toThrow(
      "Tidak dapat terhubung ke server"
    );
  });
});

describe("demo mode dashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns mock dashboard for admin demo token without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getDashboard("demo:admin");
    expect(result.greeting).toContain("Nadia");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns mock dashboard for employee demo token without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getDashboard("demo:employee");
    expect(result.greeting).toContain("Fikri");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
