import { afterEach, describe, expect, it, vi } from "vitest";

import { approveRequest, fetchEmployeeSummary, getDashboard, login } from "../lib/api";

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

  it("returns session for manager demo credentials without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await login({ email: "manager@taptu.app", password: "Taptu123!" });
    expect(result.user.role).toBe("manager");
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
    expect(result.attendanceState).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns employee demo summary as ready for first check-in", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchEmployeeSummary("demo:employee");
    expect(result.currentAttendanceState).toBe("idle");
    expect(result.todayRecord.checkInTime).toBeUndefined();
    expect(result.todayRecord.status).toBe("Belum check-in");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns mock dashboard for manager demo token without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getDashboard("demo:manager");
    expect(result.greeting).toContain("Raka");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("demo mode approveRequest — step-aware transitions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manager approve returns pending_hr workflow status — not final approved", async () => {
    const result = await approveRequest("demo:manager", "req-01", "Disetujui");
    expect(result.request.workflowStatus).toBe("pending_hr");
    expect(result.request.statusLabel).toBe("Menunggu HR");
    expect(result.request.status).toBe("Menunggu");
  });

  it("admin approve returns approved workflow status", async () => {
    const result = await approveRequest("demo:admin", "req-02", "Disetujui");
    expect(result.request.workflowStatus).toBe("approved");
    expect(result.request.statusLabel).toBe("Disetujui");
    expect(result.request.status).toBe("Disetujui");
  });

  it("manager reject returns rejected workflow status with adminNote preserved", async () => {
    const result = await approveRequest("demo:manager", "req-03", "Ditolak", "Kuota bulan ini penuh.");
    expect(result.request.workflowStatus).toBe("rejected");
    expect(result.request.statusLabel).toBe("Ditolak");
    expect(result.request.status).toBe("Ditolak");
    expect(result.request.adminNote).toBe("Kuota bulan ini penuh.");
  });

  it("admin reject returns rejected workflow status", async () => {
    const result = await approveRequest("demo:admin", "req-04", "Ditolak", "Tidak sesuai prosedur.");
    expect(result.request.workflowStatus).toBe("rejected");
    expect(result.request.status).toBe("Ditolak");
    expect(result.request.adminNote).toBe("Tidak sesuai prosedur.");
  });
});
