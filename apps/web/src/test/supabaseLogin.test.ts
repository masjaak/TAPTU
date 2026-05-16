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

describe("supabase-enabled login", () => {
  beforeEach(() => {
    mockSupabaseClient.auth.signInWithPassword.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns Supabase access token with demo profile when Supabase auth succeeds for a demo account", async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "usr-employee-01" },
        session: { access_token: "sbp_supabase_jwt_xyz" }
      },
      error: null
    });

    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });

    expect(result.token).toBe("sbp_supabase_jwt_xyz");
    expect(result.user.id).toBe("usr-employee-01");
    expect(result.user.role).toBe("employee");
    expect(result.user.fullName).toBe("Fikri Maulana");
    expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "employee@taptu.app",
      password: "Taptu123!"
    });
  });

  it("returns Supabase access token with matching profile for all demo roles", async () => {
    const cases: Array<{ email: string; id: string; role: string; fullName: string }> = [
      { email: "superadmin@taptu.app", id: "usr-superadmin-01", role: "superadmin", fullName: "Super Admin" },
      { email: "admin@taptu.app", id: "usr-admin-01", role: "admin", fullName: "Nadia Putri" },
      { email: "manager@taptu.app", id: "usr-manager-01", role: "manager", fullName: "Raka Saputra" },
      { email: "scanner@taptu.app", id: "usr-scanner-01", role: "scanner", fullName: "Front Gate Scanner" }
    ];

    for (const { email, id, role, fullName } of cases) {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id }, session: { access_token: `sbp_${role}` } },
        error: null
      });

      const result = await login({ email, password: "Taptu123!" });
      expect(result.token).toBe(`sbp_${role}`);
      expect(result.user.role).toBe(role);
      expect(result.user.fullName).toBe(fullName);
    }
  });

  it("falls back to demo:role token when Supabase auth fails for a known demo account", async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" }
    });

    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });

    expect(result.token).toBe("demo:employee");
    expect(result.user.role).toBe("employee");
    expect(result.user.id).toBe("usr-employee-01");
  });

  it("falls back to demo:role for all roles when Supabase is unavailable", async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Connection error" }
    });

    const roles = [
      { email: "superadmin@taptu.app", token: "demo:superadmin" },
      { email: "admin@taptu.app", token: "demo:admin" },
      { email: "manager@taptu.app", token: "demo:manager" },
      { email: "scanner@taptu.app", token: "demo:scanner" }
    ];

    for (const { email, token } of roles) {
      const result = await login({ email, password: "Taptu123!" });
      expect(result.token).toBe(token);
    }
  });

  it("throws when Supabase auth fails for a non-demo account", async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" }
    });

    await expect(
      login({ email: "real-user@company.com", password: "Password123!" })
    ).rejects.toThrow("Invalid login credentials");
  });

  it("throws when Supabase auth fails for a demo email with wrong password", async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" }
    });

    await expect(
      login({ email: "employee@taptu.app", password: "WrongPassword!" })
    ).rejects.toThrow();
  });
});
