import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Simulates Vercel static deployment: no Supabase client configured.
vi.mock("../lib/supabase", () => ({
  supabase: null,
  isSupabaseEnabled: () => false
}));

import { login } from "../lib/api";

function htmlResponse(status: number): Response {
  return new Response("<!DOCTYPE html><html><body>Not Found</body></html>", {
    status,
    headers: { "Content-Type": "text/html" }
  });
}

describe("no-supabase login — Vercel static deployment fallback", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns demo:superadmin when API returns 404 HTML (no backend deployed)", async () => {
    vi.mocked(fetch).mockResolvedValue(htmlResponse(404));
    const result = await login({ email: "superadmin@taptu.app", password: "Taptu123!" });
    expect(result.token).toBe("demo:superadmin");
    expect(result.user.id).toBe("usr-superadmin-01");
    expect(result.user.role).toBe("superadmin");
  });

  it("returns demo:role for all five advertised accounts when API is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const cases = [
      { email: "superadmin@taptu.app", token: "demo:superadmin", id: "usr-superadmin-01" },
      { email: "admin@taptu.app",      token: "demo:admin",      id: "usr-admin-01"      },
      { email: "manager@taptu.app",    token: "demo:manager",    id: "usr-manager-01"    },
      { email: "employee@taptu.app",   token: "demo:employee",   id: "usr-employee-01"   },
      { email: "scanner@taptu.app",    token: "demo:scanner",    id: "usr-scanner-01"    }
    ] as const;

    for (const { email, token, id } of cases) {
      const result = await login({ email, password: "Taptu123!" });
      expect(result.token).toBe(token);
      expect(result.user.id).toBe(id);
    }
  });

  it("returns demo:employee when Vercel rewrites /api/auth/login to index.html (200 HTML)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<!DOCTYPE html><html>Taptu SPA</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" }
      })
    );
    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });
    expect(result.token).toBe("demo:employee");
    expect(result.user.role).toBe("employee");
  });

  it("throws when API is unreachable and password is wrong — never silently swallows errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      login({ email: "employee@taptu.app", password: "WrongPassword!" })
    ).rejects.toThrow();
  });

  it("throws for non-demo accounts when API is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      login({ email: "real@company.com", password: "Password123!" })
    ).rejects.toThrow();
  });
});
