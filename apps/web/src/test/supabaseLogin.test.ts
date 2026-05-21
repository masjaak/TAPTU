import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabaseClient = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn()
  }
}));

vi.mock("../lib/supabase", () => ({
  supabase: mockSupabaseClient,
  isSupabaseEnabled: () => true
}));

import { login } from "../lib/api";

// With Supabase configured, the login flow is:
//  1. Try Express API backend first (/api/auth/login)
//  2. If API succeeds → use API response (demo accounts get server JWT, not demo: prefix token)
//  3. If API fails → try Supabase direct auth as fallback (for static deployments)
//  4. If Supabase also fails → use demo token as last resort (for demo accounts offline)

describe("supabase-enabled login — API-first flow", () => {
  beforeEach(() => {
    mockSupabaseClient.auth.signInWithPassword.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("when API is reachable, uses API response for demo account (server JWT, not demo: token)", async () => {
    // The API backend issues a signed server JWT for demo accounts.
    // This allows isDemoToken() to return false so all subsequent calls go through the backend.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: "server-jwt-employee",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee" }
      })
    }));

    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });

    expect(result.token).toBe("server-jwt-employee");
    expect(result.token.startsWith("demo:")).toBe(false);
    expect(result.user.id).toBe("usr-employee-01");
    expect(result.user.role).toBe("employee");
    // Supabase auth must not be called when the API is reachable
    expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("when API is reachable, uses API response for manager demo account", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: "server-jwt-manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager" }
      })
    }));

    const result = await login({ email: "manager@taptu.app", password: "Taptu123!" });
    expect(result.token).toBe("server-jwt-manager");
    expect(result.token.startsWith("demo:")).toBe(false);
  });

  it("when API is reachable, uses API response for real Supabase user (Supabase access token)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: "supa-access-token-real-user",
        user: { id: "uuid-real-user", fullName: "Budi Nyata", email: "budi@company.com", role: "employee" }
      })
    }));

    const result = await login({ email: "budi@company.com", password: "Password123!" });
    expect(result.token).toBe("supa-access-token-real-user");
  });

  it("when API is unreachable and Supabase succeeds for a real user, uses Supabase token via /auth/me", async () => {
    // First fetch (API login) unreachable → "Tidak dapat terhubung...", second fetch (/auth/me) succeeds
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: { id: "uuid-real-user", fullName: "Budi Nyata", email: "budi@company.com", role: "employee" }
        })
      })
    );
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "uuid-real-user" }, session: { access_token: "supa-token-real" } },
      error: null
    });

    const result = await login({ email: "budi@company.com", password: "Password123!" });
    expect(result.token).toBe("supa-token-real");
    expect(result.user.fullName).toBe("Budi Nyata");
  });

  it("when API is unreachable and Supabase fails for demo account, returns demo: token fallback", async () => {
    // API unreachable, Supabase configured but fails (demo user not in Supabase auth)
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" }
    });

    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });
    expect(result.token).toBe("demo:employee");
    expect(result.user.role).toBe("employee");
  });

  it("when API is unreachable and Supabase fails for all demo roles, returns demo: token for each", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" }
    });

    const cases = [
      { email: "superadmin@taptu.app", token: "demo:superadmin" },
      { email: "admin@taptu.app", token: "demo:admin" },
      { email: "manager@taptu.app", token: "demo:manager" },
      { email: "scanner@taptu.app", token: "demo:scanner" }
    ];

    for (const { email, token } of cases) {
      const result = await login({ email, password: "Taptu123!" });
      expect(result.token).toBe(token);
    }
  });

  it("when API is unreachable and Supabase fails for non-demo account, throws original network error", async () => {
    // API unreachable → "Tidak dapat terhubung...", Supabase also fails, no demo fallback
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" }
    });

    await expect(
      login({ email: "real-user@company.com", password: "Password123!" })
    ).rejects.toThrow("Tidak dapat terhubung ke server");
  });

  it("when API returns a 401 for wrong credentials, throws the API error without trying Supabase", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Akun tidak ditemukan atau password salah." })
    }));

    await expect(
      login({ email: "employee@taptu.app", password: "WrongPassword1" })
    ).rejects.toThrow("Akun tidak ditemukan atau password salah.");
    // Supabase must NOT be called when the API is reachable and returns an auth error
    expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
