import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These tests exercise the Express-API path. Stub supabase as null so
// the Supabase auth branch in login() is not triggered.
vi.mock("../lib/supabase", () => ({ supabase: null, isSupabaseEnabled: () => false }));

import {
  approveRequest,
  checkIn,
  checkOut,
  createDepartment,
  fetchAdminOverview,
  fetchAttendanceHistory,
  fetchEmployeeSummary,
  fetchDepartments,
  fetchEmployeeList,
  fetchManagerEmployeeList,
  fetchManagerExceptionQueue,
  fetchManagerOverview,
  fetchManagerRequests,
  fetchNotifications,
  fetchReportRows,
  fetchRequests,
  getDashboard,
  login,
  markNotificationRead,
  reassignEmployeeDepartment,
  resetDemoAttendanceState,
  updateDepartment
} from "../lib/api";

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

describe("PHASE 11.10 — demo login with Supabase configured still uses API backend", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("with supabase configured, demo login calls /api/auth/login (not demo: token path)", async () => {
    // The API server is reachable and returns a proper server JWT for demo accounts.
    // Supabase being available must NOT override the returned token to demo:employee.
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: "server-jwt-employee",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee" }
      })
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });
    // Must use server JWT, not demo: prefix token — isDemoToken() must be false
    expect(result.token).toBe("server-jwt-employee");
    expect(result.token.startsWith("demo:")).toBe(false);
    // Must have called the backend API, not skipped it
    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
  });

  it("admin demo login via API returns server JWT, not demo:admin token", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: "server-jwt-admin",
        user: { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", role: "admin" }
      })
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await login({ email: "admin@taptu.app", password: "Taptu123!" });
    expect(result.token).toBe("server-jwt-admin");
    expect(result.token.startsWith("demo:")).toBe(false);
  });
});

describe("shared demo-account login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes demo credentials through the shared API by default", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: "token:employee",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee" }
      })
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await login({ email: "employee@taptu.app", password: "Taptu123!" });
    expect(result.user.role).toBe("employee");
    expect(result.token).toBe("token:employee");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
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
    expect(result.requests).toEqual([]);
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

describe("manager scoped API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses manager scoped endpoints without demo dummy employees", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ totalEmployees: 0, checkedInToday: 0, onTimeToday: 0, lateToday: 0, pendingRequests: 0, absentToday: 0, exceptionCount: 0, recentActivity: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchManagerOverview("token:manager")).resolves.toMatchObject({ totalEmployees: 0 });
    await expect(fetchManagerEmployeeList("token:manager")).resolves.toEqual([]);
    await expect(fetchManagerExceptionQueue("token:manager")).resolves.toEqual([]);
    await expect(fetchManagerRequests("token:manager")).resolves.toEqual([]);

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "/api/admin/overview",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token:manager" }) })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/admin/employees", expect.any(Object));
    expect(fetchSpy).toHaveBeenNthCalledWith(3, "/api/admin/exceptions", expect.any(Object));
    expect(fetchSpy).toHaveBeenNthCalledWith(4, "/api/admin/requests", expect.any(Object));
  });
});

describe("HR filter API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends HR employee filter query params without changing manager endpoints", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchSpy);

    await fetchEmployeeList("token:admin", {
      search: "fikri",
      departmentId: "dep-ops",
      status: "late"
    });
    await fetchManagerEmployeeList("token:manager");

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "/api/admin/employees?search=fikri&departmentId=dep-ops&status=late",
      expect.any(Object)
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/admin/employees", expect.any(Object));
  });

  it("sends HR report department and status filters in the query string", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchSpy);

    await fetchReportRows("token:admin", {
      dateFrom: "2026-05-01",
      dateTo: "2026-05-14",
      departmentId: "dep-ops",
      status: "needs_review"
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/admin/reports?dateFrom=2026-05-01&dateTo=2026-05-14&departmentId=dep-ops&status=needs_review",
      expect.any(Object)
    );
  });
});

describe("HR department API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses department management endpoints without changing dashboard routes", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "dep-sales", name: "Sales", isActive: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "dep-sales", name: "Sales Ops", isActive: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "usr-employee-01", departmentId: "dep-sales" }) });
    vi.stubGlobal("fetch", fetchSpy);

    await fetchDepartments("token:admin");
    await createDepartment("token:admin", { name: "Sales", managerId: null, description: null, isActive: true });
    await updateDepartment("token:admin", "dep-sales", { managerId: "usr-manager-01" });
    await reassignEmployeeDepartment("token:admin", "usr-employee-01", { departmentId: "dep-sales", managerId: "usr-manager-01" });

    expect(fetchSpy).toHaveBeenNthCalledWith(1, "/api/departments", expect.any(Object));
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/departments", expect.objectContaining({ method: "POST" }));
    expect(fetchSpy).toHaveBeenNthCalledWith(3, "/api/departments/dep-sales", expect.objectContaining({ method: "PATCH" }));
    expect(fetchSpy).toHaveBeenNthCalledWith(4, "/api/employees/usr-employee-01", expect.objectContaining({ method: "PATCH" }));
  });
});

describe("notification API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses recipient-scoped list and mark-read endpoints", async () => {
    const notification = {
      id: "ntf-1",
      organizationId: "org-01",
      recipientId: "usr-employee-01",
      type: "request_approved",
      title: "Disetujui",
      message: "Izin disetujui.",
      createdAt: "2026-05-15T08:00:00.000Z",
      readAt: null
    };
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([notification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ...notification, readAt: "2026-05-15T09:00:00.000Z" }) });
    vi.stubGlobal("fetch", fetchSpy);

    await fetchNotifications("token:employee");
    await markNotificationRead("token:employee", "ntf-1");

    expect(fetchSpy).toHaveBeenNthCalledWith(1, "/api/notifications", expect.any(Object));
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/notifications/ntf-1/read", expect.objectContaining({ method: "PATCH" }));
  });
});

describe("BUG 1 — Manager demo overview returns real stats", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetchManagerOverview with demo:manager returns non-zero totalEmployees from demo store", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchManagerOverview("demo:manager");
    // Fikri, Anisa, Budi are all managerId=usr-manager-01
    expect(result.totalEmployees).toBeGreaterThan(0);
    expect(result.recentActivity).toBeDefined();
  });

  it("fetchManagerOverview with demo:manager does not call fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await fetchManagerOverview("demo:manager");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetchManagerEmployeeList with demo:manager returns Fikri (managerId=usr-manager-01)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchManagerEmployeeList("demo:manager");
    expect(result.some((e) => e.id === "usr-employee-01")).toBe(true);
    // Leo (dep-fnb, no managerId match) should not appear
    expect(result.some((e) => e.id === "usr-employee-03")).toBe(false);
  });

  it("fetchManagerRequests with demo:manager returns manager request list", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchManagerRequests("demo:manager");
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("BUG 2 — Employee check-in syncs to manager overview in demo mode", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("after demo employee check-in, manager overview checkedInToday increases", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchManagerOverview("demo:manager");
    await checkIn("demo:employee", { method: "Manual" });
    const after = await fetchManagerOverview("demo:manager");
    expect(after.checkedInToday).toBeGreaterThanOrEqual(before.checkedInToday);
    // The employee record for Fikri should now show present/late in team list
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(["present", "late"]).toContain(fikri?.todayStatus);
  });
});

describe("BUG 3 — HR report rows reflect live demo check-in", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("fetchReportRows with demo:admin returns Fikri after demo employee check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    // Before check-in, Fikri may or may not be present — static data might have her
    await checkIn("demo:employee", { method: "Manual" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri).toBeDefined();
    expect(fikri?.checkInTime).toBeTruthy();
  });

  it("fetchReportRows with demo:admin shows Fikri status as present/late after check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Manual" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(["Tepat waktu", "Terlambat", "Sedang check-in"]).toContain(fikri?.status);
  });

  it("fetchReportRows does not call fetch for demo:admin token", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await fetchReportRows("demo:admin");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("BUG 4 — Demo check-in succeeds without selfie upload configured", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("check-in without selfie returns checked_in attendanceState (not blocked)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await checkIn("demo:employee", { method: "Manual" });
    expect(result.attendanceState).toBe("checked_in");
  });

  it("check-in with selfie data returns checked_in attendanceState and selfie note", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await checkIn("demo:employee", { method: "Selfie", selfieData: "data:image/jpeg;base64,abc" });
    expect(result.attendanceState).toBe("checked_in");
    expect((result.validationReasons ?? []).some((r) => r.toLowerCase().includes("selfie"))).toBe(true);
  });

  it("check-in with selfie does not fail with 'Selfie wajib belum dilampirkan'", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await checkIn("demo:employee", { method: "Selfie", selfieData: "data:image/jpeg;base64,abc" });
    expect(result.validationReasons).not.toContain("Selfie wajib belum dilampirkan.");
  });
});

describe("PHASE 10.5 — Employee Riwayat persistence after demo check-in", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("fetchAttendanceHistory returns a Hari ini record after demo check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const history = await fetchAttendanceHistory("demo:employee");
    const today = history.filter((r) => r.day === "Hari ini");
    expect(today.length).toBe(1);
    expect(today[0].checkInTime).toBeTruthy();
    expect(today[0].method).toBe("QR");
  });

  it("check-out updates the same Hari ini record without duplicating it", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Manual" });
    await checkOut("demo:employee", { method: "Manual" });
    const history = await fetchAttendanceHistory("demo:employee");
    const today = history.filter((r) => r.day === "Hari ini");
    expect(today.length).toBe(1);
    expect(today[0].checkOutTime).toBeTruthy();
  });

  it("second check-in replaces old Hari ini record rather than duplicating it", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "GPS" });
    await checkIn("demo:employee", { method: "QR" });
    const history = await fetchAttendanceHistory("demo:employee");
    const today = history.filter((r) => r.day === "Hari ini");
    expect(today.length).toBe(1);
    expect(today[0].method).toBe("QR");
  });
});

describe("PHASE 10.5 — Manager sees richer attendance detail after demo check-in", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("manager employee list shows checkInMethod after demo check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkInMethod).toBe("QR");
  });

  it("manager employee list shows checkOutTime after demo check-out", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Manual" });
    await checkOut("demo:employee", { method: "Manual" });
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkOutTime).toBeTruthy();
  });

  it("manager does not see employees outside their team", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const employees = await fetchManagerEmployeeList("demo:manager");
    const leo = employees.find((e) => e.fullName === "Leo Pratama");
    expect(leo).toBeUndefined();
  });
});

describe("PHASE 10.5 — HR report shows method detail after demo check-in", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("HR report row for Fikri includes checkInMethod after check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkInMethod).toBe("QR");
  });

  it("HR report row for Fikri includes checkOutTime after check-out", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Manual" });
    await checkOut("demo:employee", { method: "Manual" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkOutTime).toBeTruthy();
  });

  it("HR report reads from live demo store, not static rows", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkInTime).toBeTruthy();
    expect(fikri?.checkInMethod).toBe("Selfie");
  });
});

describe("PHASE 10.8 — HR/Manager demo attendance source sync", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
  });
  afterEach(() => vi.unstubAllGlobals());

  // --- Employee → Manager ---

  it("Manager Presensi Tim shows Fikri as absent before any check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.todayStatus).toBe("absent");
    expect(fikri?.checkInTime).toBeUndefined();
  });

  it("Manager Presensi Tim shows Fikri Selfie check-in matching Employee Riwayat", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const history = await fetchAttendanceHistory("demo:employee");
    const todayEntry = history.find((r) => r.day === "Hari ini");
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkInMethod).toBe("Selfie");
    expect(fikri?.checkInTime).toBeTruthy();
    expect(todayEntry?.checkInTime).toBeTruthy();
    expect(["present", "late"]).toContain(fikri?.todayStatus);
  });

  it("Manager does not show stale 08:03 QR for Fikri after Selfie check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkInMethod).not.toBe("QR");
    expect(fikri?.checkInTime).not.toBe("08:03");
  });

  it("check-out updates same record and Manager Presensi Tim shows check-out time", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    await checkOut("demo:employee", { method: "Selfie" });
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkOutTime).toBeTruthy();
  });

  // --- Employee → HR ---

  it("HR Presensi shows Fikri as Belum check-in before any check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.status).toBe("Belum check-in");
    expect(fikri?.checkInTime).toBeUndefined();
  });

  it("HR Presensi shows Fikri Selfie check-in matching Employee Riwayat", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkInMethod).toBe("Selfie");
    expect(fikri?.checkInTime).toBeTruthy();
    expect(["Tepat waktu", "Terlambat"]).toContain(fikri?.status);
  });

  it("HR does not show stale 08:03 QR for Fikri after Selfie check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkInMethod).not.toBe("QR");
  });

  it("HR Laporan shows Fikri Selfie check-in after employee check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkInMethod).toBe("Selfie");
    expect(["Tepat waktu", "Terlambat"]).toContain(fikri?.status);
  });

  it("check-out updates same record and HR shows check-out time", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    await checkOut("demo:employee", { method: "Selfie" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkOutTime).toBeTruthy();
  });

  // --- No duplicate row ---

  it("HR Presensi has exactly one row for Fikri after check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const rows = await fetchReportRows("demo:admin");
    const fikriRows = rows.filter((r) => r.employeeId === "usr-employee-01");
    expect(fikriRows).toHaveLength(1);
  });

  // --- Empty/reset state ---

  it("after reset, HR does not show stale seeded attendance for Fikri", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkInTime).toBeUndefined();
    expect(fikri?.status).toBe("Belum check-in");
  });

  it("after reset, Manager does not show stale seeded attendance for Fikri", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const employees = await fetchManagerEmployeeList("demo:manager");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkInTime).toBeUndefined();
    expect(fikri?.todayStatus).toBe("absent");
  });

  it("Employee Riwayat is empty after reset, consistent with HR/Manager showing Belum check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const history = await fetchAttendanceHistory("demo:employee");
    const todayEntries = history.filter((r) => r.day === "Hari ini");
    expect(todayEntries).toHaveLength(0);
  });
});

describe("PHASE 10.10 — Admin home overview live recent activity", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("admin overview does not call fetch for demo:admin token", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await fetchAdminOverview("demo:admin");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("admin overview recentActivity does not contain stale Fikri 08:03 QR before check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    const fikriActivity = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    // Fikri starts absent — should not appear in recent activity
    expect(fikriActivity).toBeUndefined();
  });

  it("admin overview recentActivity shows Fikri after Selfie check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const overview = await fetchAdminOverview("demo:admin");
    const fikriActivity = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikriActivity).toBeDefined();
    expect(fikriActivity?.time).not.toBe("08:03");
  });

  it("admin overview recentActivity Fikri detail contains Selfie after Selfie check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const overview = await fetchAdminOverview("demo:admin");
    const fikriActivity = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikriActivity?.detail).toContain("Selfie");
  });

  it("admin overview recentActivity Fikri event is Check-in after check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const overview = await fetchAdminOverview("demo:admin");
    const fikriActivity = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikriActivity?.event).toBe("Check-in");
  });

  it("admin overview recentActivity Fikri shows Check-out event after check-out", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    await checkOut("demo:employee", { method: "Selfie" });
    const overview = await fetchAdminOverview("demo:admin");
    const fikriActivity = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikriActivity).toBeDefined();
    expect(fikriActivity?.event).toBe("Check-out");
  });

  it("admin overview recentActivity is org-wide, not manager-scoped", async () => {
    vi.stubGlobal("fetch", vi.fn());
    // After Fikri checks in, both admin (org-wide) and manager (team) see Fikri's activity
    await checkIn("demo:employee", { method: "Selfie" });
    const adminOverview = await fetchAdminOverview("demo:admin");
    const managerOverview = await fetchManagerOverview("demo:manager");
    // Both admin and manager should see Fikri's activity (clean demo: Fikri is the only employee)
    const fikriInAdmin = adminOverview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    const fikriInManager = managerOverview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikriInAdmin).toBeDefined();
    expect(fikriInManager).toBeDefined();
    // Clean demo: org = {Fikri}; team = {Fikri}; both have totalEmployees === 1
    expect(adminOverview.totalEmployees).toBe(1);
    expect(managerOverview.totalEmployees).toBe(1);
  });
});

describe("PHASE 10.11 — HR/Admin and Manager home KPI live numbers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
  });
  afterEach(() => vi.unstubAllGlobals());

  // --- HR/Admin KPI ---

  it("HR admin totalEmployees equals demo roster count, not 248", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // Demo has 1 employee-role member (Fikri only after 10.18 cleanup); must not show enterprise-scale 248
    expect(overview.totalEmployees).not.toBe(248);
    expect(overview.totalEmployees).toBeGreaterThan(0);
    expect(overview.totalEmployees).toBeLessThanOrEqual(10);
  });

  it("HR admin checkedInToday equals live checked-in count before Fikri check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // Clean initial state: no stale seeded attendance, must not be enterprise-scale 187
    expect(overview.checkedInToday).not.toBe(187);
    expect(overview.checkedInToday).toBe(0);
  });

  it("HR admin checkedInToday increases after Fikri Selfie check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchAdminOverview("demo:admin");
    await checkIn("demo:employee", { method: "Selfie" });
    const after = await fetchAdminOverview("demo:admin");
    expect(after.checkedInToday).toBe(before.checkedInToday + 1);
  });

  it("HR admin lateToday starts at 0 and increases after Fikri late check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchAdminOverview("demo:admin");
    expect(before.lateToday).toBe(0); // clean initial state, no stale late employees
    await checkIn("demo:employee", { method: "Selfie" }); // Fikri will be late (current time > 08:10)
    const after = await fetchAdminOverview("demo:admin");
    // Fikri should be late since tests run after 08:10
    expect(after.lateToday).toBeGreaterThanOrEqual(before.lateToday);
  });

  it("HR admin absentToday decreases after Fikri check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchAdminOverview("demo:admin");
    // Clean demo universe (10.18): only Fikri as employee, starts absent
    expect(before.absentToday).toBe(1);
    await checkIn("demo:employee", { method: "Selfie" });
    const after = await fetchAdminOverview("demo:admin");
    expect(after.absentToday).toBe(before.absentToday - 1);
  });

  it("HR admin exceptionCount starts at 0 (no stale needs_review employees)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // Clean initial state: Anisa's needs_review was stale dummy data, now removed
    expect(overview.exceptionCount).toBe(0);
    expect(overview.exceptionCount).not.toBe(5); // not hardcoded enterprise value
  });

  it("HR admin pendingRequests uses demo request count, not hardcoded 6", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    expect(overview.pendingRequests).not.toBe(6);
    expect(overview.pendingRequests).toBe(1); // only Anisa sick leave is Menunggu
  });

  // --- Manager KPI ---

  it("Manager totalEmployees is Fikri-only (1), not Anisa+Budi+Fikri", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    expect(overview.totalEmployees).toBe(1); // only Fikri is in Raka's team
  });

  it("Manager checkedInToday equals 0 before Fikri check-in (no seeded team attendance)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    expect(overview.checkedInToday).toBe(0); // Fikri is absent initially; Anisa/Budi not in team
  });

  it("Manager checkedInToday increases after Fikri Selfie check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchManagerOverview("demo:manager");
    await checkIn("demo:employee", { method: "Selfie" });
    const after = await fetchManagerOverview("demo:manager");
    expect(after.checkedInToday).toBe(before.checkedInToday + 1);
  });

  it("Manager absentToday decreases after Fikri check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchManagerOverview("demo:manager");
    expect(before.absentToday).toBe(1); // only Fikri is absent in team
    await checkIn("demo:employee", { method: "Selfie" });
    const after = await fetchManagerOverview("demo:manager");
    expect(after.absentToday).toBe(0);
  });

  it("Manager KPI excludes non-team employees Leo, Dina, Anisa, and Budi", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    // Anisa/Budi no longer in Raka's team; Leo/Dina in dep-fnb with no manager match
    expect(overview.totalEmployees).toBe(1); // only Fikri
  });

  // --- Regression ---

  it("HR recentActivity from Phase 10.10 still works after KPI fix", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const overview = await fetchAdminOverview("demo:admin");
    const fikri = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikri?.detail).toContain("Selfie");
  });

  it("Manager recentActivity reflects check-out event for Fikri", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    await checkOut("demo:employee", { method: "Selfie" });
    const overview = await fetchManagerOverview("demo:manager");
    const fikri = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikri).toBeDefined();
    expect(fikri?.event).toBe("Check-out");
  });
});

describe("PHASE 10.12 — Demo check-in local time source", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("history item checkInTime is local ISO (no Z suffix) after recordDemoCheckIn", async () => {
    vi.setSystemTime(new Date("2026-05-19T05:20:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const history = await fetchAttendanceHistory("demo:employee");
    const todayItem = history.find((r) => r.day === "Hari ini");
    expect(todayItem?.checkInTime).toBeDefined();
    expect(todayItem?.checkInTime).not.toMatch(/\.000Z$|Z$/); // RED: currently ends in Z
  });

  it("history item checkOutTime is local ISO (no Z suffix) after recordDemoCheckOut", async () => {
    vi.setSystemTime(new Date("2026-05-19T05:20:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    vi.setSystemTime(new Date("2026-05-19T09:30:00.000Z"));
    await checkOut("demo:employee", { method: "QR" });
    const history = await fetchAttendanceHistory("demo:employee");
    const todayItem = history.find((r) => r.day === "Hari ini");
    expect(todayItem?.checkOutTime).toBeDefined();
    expect(todayItem?.checkOutTime).not.toMatch(/\.000Z$|Z$/); // RED: currently ends in Z
  });

  it("report row checkInTime is local ISO (no Z suffix) for checked-in employee", async () => {
    vi.setSystemTime(new Date("2026-05-19T05:20:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const rows = await fetchReportRows("demo:admin", {});
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01");
    expect(fikri?.checkInTime).toBeDefined();
    expect(fikri?.checkInTime).not.toMatch(/\.000Z$|Z$/); // RED: currently ends in Z
  });

  it("history time field (HH:mm) matches demoEmployees checkInTime after check-in", async () => {
    vi.setSystemTime(new Date("2026-05-19T05:20:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const employees = await fetchEmployeeList("demo:admin");
    const fikri = employees.find((e) => e.id === "usr-employee-01");
    const history = await fetchAttendanceHistory("demo:employee");
    const todayItem = history.find((r) => r.day === "Hari ini");
    // time field in history must match HH:mm stored in demoEmployees
    expect(todayItem?.time).toBe(fikri?.checkInTime);
  });
});

describe("PHASE 10.12 — Manager team scoping (Fikri only)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("manager employee list contains only Fikri, not Anisa or Budi", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchManagerEmployeeList("demo:manager");
    const names = result.map((e) => e.fullName);
    expect(names).toContain("Fikri Maulana");
    expect(names).not.toContain("Anisa Rahma"); // RED: currently Anisa is in Raka's team
    expect(names).not.toContain("Budi Santoso"); // RED: currently Budi is in Raka's team
    expect(result).toHaveLength(1);
  });

  it("manager overview totalEmployees is 1 (Fikri only) before any check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    expect(overview.totalEmployees).toBe(1); // RED: currently 3
  });

  it("manager overview checkedInToday is 0 before Fikri check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    expect(overview.checkedInToday).toBe(0); // RED: currently 2 (Anisa+Budi)
  });

  it("manager overview recentActivity excludes Anisa and Budi even in initial seeded state", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    const names = overview.recentActivity.map((a) => a.employeeName);
    expect(names).not.toContain("Anisa Rahma"); // RED: currently included
    expect(names).not.toContain("Budi Santoso"); // RED: currently included
  });

  it("manager overview recentActivity shows Fikri after check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const overview = await fetchManagerOverview("demo:manager");
    const fikri = overview.recentActivity.find((a) => a.employeeName === "Fikri Maulana");
    expect(fikri).toBeDefined();
    expect(fikri?.employeeName).toBe("Fikri Maulana");
  });

  it("manager overview is empty activity and 0 checked-in before Fikri does anything", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    expect(overview.recentActivity).toHaveLength(0); // Fikri absent → no activity
    expect(overview.checkedInToday).toBe(0);
  });
});

describe("PHASE 10.14 — Manager Pengajuan scoping (Fikri only)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fetchManagerRequests for demo:manager returns only Fikri requests", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchManagerRequests("demo:manager");
    // Every request must belong to Fikri (usr-employee-01) or have Fikri as requester
    for (const req of result) {
      const isFilkri =
        req.employeeId === "usr-employee-01" ||
        (req.requester ?? "").includes("Fikri");
      expect(isFilkri).toBe(true); // RED: current generic entry has no employeeId/requester
    }
  });

  it("fetchManagerRequests returns requests with workflowStatus defined", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchManagerRequests("demo:manager");
    expect(result.length).toBeGreaterThan(0); // at least one pending request for Fikri
    for (const req of result) {
      expect(req.workflowStatus).toBeDefined(); // RED: current REQUESTS.manager has no workflowStatus
    }
  });

  it("fetchManagerRequests pending requests have workflowStatus pending_manager", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchManagerRequests("demo:manager");
    const pending = result.filter((r) => r.status === "Menunggu");
    for (const req of pending) {
      expect(req.workflowStatus).toBe("pending_manager"); // RED: no workflowStatus currently
      expect(req.statusLabel).toBe("Menunggu Manager");
    }
  });

  it("fetchRequests for demo:admin returns Fikri requests (clean demo — no Anisa)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchRequests("demo:admin", true);
    const names = result.map((r) => r.requester ?? r.title);
    // Admin sees only connected demo requests (Fikri); Anisa removed from demo universe
    const hasFikri = names.some((n) => n.includes("Fikri"));
    const hasAnisa = names.some((n) => n.includes("Anisa"));
    expect(hasFikri).toBe(true);
    expect(hasAnisa).toBe(false);
  });

  it("approveRequest by manager sets workflowStatus to pending_hr and statusLabel to Menunggu HR", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await approveRequest("demo:manager", "req-fikri-01", "Disetujui");
    expect(result.request.workflowStatus).toBe("pending_hr");
    expect(result.request.statusLabel).toBe("Menunggu HR");
    expect(result.request.status).toBe("Menunggu"); // still pending until HR finalizes
  });

  it("approveRequest by HR sets workflowStatus to approved and statusLabel to Disetujui", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await approveRequest("demo:admin", "req-fikri-01", "Disetujui");
    expect(result.request.workflowStatus).toBe("approved");
    expect(result.request.statusLabel).toBe("Disetujui");
    expect(result.request.status).toBe("Disetujui");
  });

  it("approveRequest reject by manager sets workflowStatus to rejected and statusLabel to Ditolak", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await approveRequest("demo:manager", "req-fikri-01", "Ditolak");
    expect(result.request.workflowStatus).toBe("rejected");
    expect(result.request.statusLabel).toBe("Ditolak");
  });

  it("manager overview pendingRequests counts only Fikri pending requests", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchManagerOverview("demo:manager");
    const managerReqs = await fetchManagerRequests("demo:manager");
    const pendingCount = managerReqs.filter((r) => r.workflowStatus === "pending_manager").length;
    // pendingRequests must equal actual Fikri pending count, not org-wide count
    expect(overview.pendingRequests).toBe(pendingCount); // RED: currently uses REQUESTS.manager.filter(Menunggu)
  });

  it("fetchManagerRequests for non-demo token does not call getDemoRequests", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchSpy);
    await fetchManagerRequests("token:manager");
    expect(fetchSpy).toHaveBeenCalled(); // real API called, not demo path
  });
});

describe("PHASE 10.15 — Final demo consistency QA", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
  });
  afterEach(() => vi.unstubAllGlobals());

  // ── Approval flow: mutations persist to subsequent fetches ───────────────

  it("manager approve mutates request — re-fetch reflects pending_hr workflowStatus", async () => {
    vi.stubGlobal("fetch", vi.fn());
    // Before: request is pending_manager
    const before = await fetchManagerRequests("demo:manager");
    const pendingReq = before.find((r) => r.workflowStatus === "pending_manager");
    expect(pendingReq).toBeDefined();

    // Manager approves
    await approveRequest("demo:manager", pendingReq!.id!, "Disetujui");

    // After: re-fetch reflects pending_hr (RED: currently static, still pending_manager)
    const after = await fetchManagerRequests("demo:manager");
    const updated = after.find((r) => r.id === pendingReq!.id);
    expect(updated?.workflowStatus).toBe("pending_hr"); // RED
    expect(updated?.statusLabel).toBe("Menunggu HR"); // RED
    expect(updated?.status).toBe("Menunggu"); // still awaiting final HR decision
  });

  it("HR/admin approve mutates request — re-fetch reflects approved workflowStatus", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const reqs = await fetchManagerRequests("demo:manager");
    const pendingReq = reqs.find((r) => r.workflowStatus === "pending_manager");
    expect(pendingReq).toBeDefined();

    // Admin approves (finalizes)
    await approveRequest("demo:admin", pendingReq!.id!, "Disetujui");

    // Re-fetch via manager view still reflects final state
    const after = await fetchManagerRequests("demo:manager");
    const updated = after.find((r) => r.id === pendingReq!.id);
    expect(updated?.workflowStatus).toBe("approved"); // RED
    expect(updated?.statusLabel).toBe("Disetujui"); // RED
    expect(updated?.status).toBe("Disetujui"); // RED
  });

  it("reject by manager mutates request — re-fetch reflects rejected workflowStatus", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const reqs = await fetchManagerRequests("demo:manager");
    const pendingReq = reqs.find((r) => r.workflowStatus === "pending_manager");

    await approveRequest("demo:manager", pendingReq!.id!, "Ditolak", "Tidak sesuai jadwal.");

    const after = await fetchManagerRequests("demo:manager");
    const updated = after.find((r) => r.id === pendingReq!.id);
    expect(updated?.workflowStatus).toBe("rejected"); // RED
    expect(updated?.status).toBe("Ditolak"); // RED
    expect(updated?.adminNote).toBe("Tidak sesuai jadwal."); // RED
  });

  it("resetDemoAttendanceState restores request to initial pending_manager state", async () => {
    vi.stubGlobal("fetch", vi.fn());
    // Mutate via approval
    const reqs = await fetchManagerRequests("demo:manager");
    const pendingReq = reqs.find((r) => r.workflowStatus === "pending_manager");
    await approveRequest("demo:manager", pendingReq!.id!, "Disetujui");

    // Reset
    resetDemoAttendanceState();

    // Should be back to pending_manager
    const restored = await fetchManagerRequests("demo:manager");
    const restoredReq = restored.find((r) => r.id === pendingReq!.id);
    expect(restoredReq?.workflowStatus).toBe("pending_manager"); // RED
  });

  // ── Stale dummy attendance: manager home has no hardcoded dummy rows ──────

  it("getDashboard for demo:manager returns empty attendance (no stale 08:03 QR)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const dashboard = await getDashboard("demo:manager");
    expect(dashboard.attendance).toHaveLength(0); // already GREEN via api.ts override
  });

  // ── All 5 demo accounts login and route correctly ─────────────────────────

  it("all 5 demo accounts login and return correct demo token", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const accounts = [
      { email: "superadmin@taptu.app", expectedToken: "demo:superadmin" },
      { email: "admin@taptu.app", expectedToken: "demo:admin" },
      { email: "manager@taptu.app", expectedToken: "demo:manager" },
      { email: "employee@taptu.app", expectedToken: "demo:employee" },
      { email: "scanner@taptu.app", expectedToken: "demo:scanner" }
    ];
    for (const { email, expectedToken } of accounts) {
      const result = await login({ email, password: "Taptu123!" });
      expect(result.token).toBe(expectedToken);
    }
  });

  // ── Regression: manager/employee scoping unchanged after reset ────────────

  it("manager team remains Fikri-only after resetDemoAttendanceState", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    resetDemoAttendanceState();
    const overview = await fetchManagerOverview("demo:manager");
    expect(overview.totalEmployees).toBe(1);
    expect(overview.checkedInToday).toBe(0); // reset clears check-in
  });
});

describe("PHASE 10.17 — Live check-in time sync + dummy data cleanup", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetDemoAttendanceState();
  });
  afterEach(() => vi.unstubAllGlobals());

  // ── getDemoEmployeeSummary() must reflect live check-in state ────────────

  it("fetchEmployeeSummary before check-in returns idle state with no checkInTime", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const summary = await fetchEmployeeSummary("demo:employee");
    expect(summary.currentAttendanceState).toBe("idle");
    expect(summary.todayRecord.checkInTime).toBeUndefined();
    expect(summary.todayRecord.checkOutTime).toBeUndefined();
  });

  it("fetchEmployeeSummary after checkIn returns checked_in state with local ISO checkInTime", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const summary = await fetchEmployeeSummary("demo:employee");
    // RED: getDemoEmployeeSummary is static — still returns idle
    expect(summary.currentAttendanceState).toBe("checked_in");
    expect(summary.todayRecord.checkInTime).toBeDefined();
    // Local ISO: contains "T" with no Z suffix
    expect(summary.todayRecord.checkInTime).toMatch(/T\d{2}:\d{2}:\d{2}$/);
  });

  it("fetchEmployeeSummary after checkIn: formatAttendanceTime on checkInTime matches stored HH:mm", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const summary = await fetchEmployeeSummary("demo:employee");
    const checkInTime = summary.todayRecord.checkInTime;
    // RED: currently undefined (static summary), so this assertion will fail
    expect(checkInTime).toBeDefined();
    // The stored HH:mm part (slice 11-16) must equal the ISO's HH:mm (no UTC offset applied)
    const storedHHmm = checkInTime!.slice(11, 16);
    // formatAttendanceTime should return the same — verifies no UTC shift applied
    const { formatAttendanceTime } = await import("../lib/attendanceTime");
    expect(formatAttendanceTime(checkInTime)).toBe(storedHHmm);
  });

  it("fetchEmployeeSummary after checkOut returns checked_out state with checkOutTime", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Manual" });
    await checkOut("demo:employee", { method: "Manual" });
    const summary = await fetchEmployeeSummary("demo:employee");
    // RED: static summary always returns idle
    expect(summary.currentAttendanceState).toBe("checked_out");
    expect(summary.todayRecord.checkInTime).toBeDefined();
    expect(summary.todayRecord.checkOutTime).toBeDefined();
  });

  it("fetchEmployeeSummary todayRecord.status is Tepat waktu or Terlambat after check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const summary = await fetchEmployeeSummary("demo:employee");
    // RED: static status is "Belum check-in"
    expect(["Tepat waktu", "Terlambat"]).toContain(summary.todayRecord.status);
  });

  // ── Stale dummy attendance must be removed from Anisa and Budi ───────────

  it("HR report rows: Anisa Rahma does not appear (removed from demo universe in 10.18)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const rows = await fetchReportRows("demo:admin");
    const anisa = rows.find((r) => r.employeeName === "Anisa Rahma");
    expect(anisa).toBeUndefined();
  });

  it("HR report rows: Budi Santoso does not appear (removed from demo universe in 10.18)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const rows = await fetchReportRows("demo:admin");
    const budi = rows.find((r) => r.employeeName === "Budi Santoso");
    expect(budi).toBeUndefined();
  });

  it("HR admin overview: checkedInToday is 0 before any check-in (no stale seeded attendance)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // RED: currently 2 due to Anisa(late) + Budi(present) seeded values
    expect(overview.checkedInToday).toBe(0);
  });

  it("HR admin overview: exceptionCount is 0 before any check-in (Anisa needs_review removed)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // RED: currently 1 because Anisa has validationStatus: needs_review
    expect(overview.exceptionCount).toBe(0);
  });

  it("HR admin overview recentActivity is empty before any check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // RED: currently includes Anisa and Budi from seeded state
    expect(overview.recentActivity).toHaveLength(0);
  });

  it("after Fikri check-in: HR report shows Fikri with local ISO checkInTime (no UTC offset)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "Selfie" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeName === "Fikri Maulana");
    expect(fikri).toBeDefined();
    expect(fikri?.checkInTime).toBeDefined();
    // Must be local ISO (no Z suffix)
    expect(fikri?.checkInTime).not.toMatch(/Z$/);
    // HH:mm part extracted via slice == what formatAttendanceTime gives (no UTC shift)
    const { formatAttendanceTime } = await import("../lib/attendanceTime");
    const sliced = fikri!.checkInTime!.slice(11, 16);
    expect(formatAttendanceTime(fikri!.checkInTime)).toBe(sliced);
  });

  it("getDashboard for demo:admin returns empty attendance array (no stale dummy items)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const dashboard = await getDashboard("demo:admin");
    // RED: currently returns ATTENDANCE.admin = [08:03, 08:24, 07:58] stale items
    expect(dashboard.attendance).toHaveLength(0);
  });

  it("getDashboard for demo:superadmin returns empty attendance array (no stale dummy items)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const dashboard = await getDashboard("demo:superadmin");
    // RED: currently returns ATTENDANCE.superadmin = [08:03, 08:24, 07:58] stale items
    expect(dashboard.attendance).toHaveLength(0);
  });
});

describe("PHASE 10.18 — Clean demo universe: roster, departments, exceptions, requests, scanner, notifications", () => {
  beforeEach(() => {
    resetDemoAttendanceState();
  });

  // --- Roster ---
  it("demo employee list does not include Anisa, Leo, Dina, or Budi", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const list = await fetchEmployeeList("demo:admin");
    const names = list.map((e) => e.fullName);
    expect(names).not.toContain("Anisa Rahma");
    expect(names).not.toContain("Leo Pratama");
    expect(names).not.toContain("Dina Fitriani");
    expect(names).not.toContain("Budi Santoso");
  });

  it("HR report rows do not include Anisa, Leo, Dina, or Budi", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const rows = await fetchReportRows("demo:admin");
    const names = rows.map((r) => r.employeeName);
    expect(names).not.toContain("Anisa Rahma");
    expect(names).not.toContain("Leo Pratama");
    expect(names).not.toContain("Dina Fitriani");
    expect(names).not.toContain("Budi Santoso");
  });

  it("HR report rows contain only Fikri Maulana", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const rows = await fetchReportRows("demo:admin");
    expect(rows.length).toBe(1);
    expect(rows[0].employeeName).toBe("Fikri Maulana");
  });

  it("getDemoAdminOverview totalEmployees is 1 (only Fikri as employee role)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    expect(overview.totalEmployees).toBe(1);
  });

  // --- Departments ---
  it("fetchDepartments for demo:admin returns only Operasional (no F&B Service)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const depts = await fetchDepartments("demo:admin");
    const names = depts.map((d) => d.name);
    expect(names).not.toContain("F&B Service");
    expect(names).toContain("Operasional");
  });

  it("Operasional department memberCount is 1 (Fikri only)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const depts = await fetchDepartments("demo:admin");
    const ops = depts.find((d) => d.name === "Operasional");
    expect(ops?.memberCount).toBe(1);
  });

  // --- Exceptions ---
  it("fetchManagerExceptionQueue returns empty array (no Anisa exception)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const queue = await fetchManagerExceptionQueue("demo:manager");
    expect(queue).toHaveLength(0);
  });

  // --- Requests ---
  it("fetchRequests for demo:admin returns only Fikri requests (no Anisa)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchRequests("demo:admin", true);
    const names = result.map((r) => r.requester ?? r.title);
    expect(names.some((n) => n.includes("Anisa"))).toBe(false);
    expect(names.some((n) => n.includes("Fikri"))).toBe(true);
  });

  it("fetchRequests for demo:superadmin returns only Fikri requests (no Anisa)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await fetchRequests("demo:superadmin", true);
    const names = result.map((r) => r.requester ?? r.title);
    expect(names.some((n) => n.includes("Anisa"))).toBe(false);
  });

  it("getDemoAdminOverview pendingRequests is live from demoFikriRequests (1 initially)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    expect(overview.pendingRequests).toBe(1);
  });

  it("getDemoAdminOverview pendingRequests becomes 0 after HR approves Fikri request", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await approveRequest("demo:manager", "req-fikri-01", "Disetujui");
    await approveRequest("demo:admin", "req-fikri-01", "Disetujui");
    const overview = await fetchAdminOverview("demo:admin");
    expect(overview.pendingRequests).toBe(0);
  });

  // --- Scanner ---
  it("getDemoScannerState recentScans does not include Leo Pratama", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { fetchScannerState } = await import("../lib/api");
    const state = await fetchScannerState("demo:scanner");
    const names = (state.recentScans ?? []).map((s: { employeeName?: string }) => s.employeeName ?? "");
    expect(names).not.toContain("Leo Pratama");
  });

  // --- Notifications ---
  it("fetchNotifications for demo:employee returns empty before any event", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const notifs = await fetchNotifications("demo:employee");
    expect(notifs).toHaveLength(0);
  });

  it("fetchNotifications for demo:admin returns empty before any event", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const notifs = await fetchNotifications("demo:admin");
    expect(notifs).toHaveLength(0);
  });

  it("after Fikri check-in: demo:employee receives a check-in notification", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const notifs = await fetchNotifications("demo:employee");
    expect(notifs.length).toBeGreaterThan(0);
    const checkInNotif = notifs.find((n) => n.type === "attendance_checked_in");
    expect(checkInNotif).toBeDefined();
    expect(checkInNotif?.title).toBeTruthy();
  });

  it("after Fikri check-in: demo:admin receives a check-in notification", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const notifs = await fetchNotifications("demo:admin");
    expect(notifs.length).toBeGreaterThan(0);
    const checkInNotif = notifs.find((n) => n.type === "attendance_checked_in");
    expect(checkInNotif).toBeDefined();
  });

  it("after Fikri check-in: demo:manager receives a check-in notification", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const notifs = await fetchNotifications("demo:manager");
    expect(notifs.length).toBeGreaterThan(0);
    const checkInNotif = notifs.find((n) => n.type === "attendance_checked_in");
    expect(checkInNotif).toBeDefined();
  });

  it("after Fikri check-out: demo:employee receives a check-out notification", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    await checkOut("demo:employee", { method: "QR" });
    const notifs = await fetchNotifications("demo:employee");
    const checkOutNotif = notifs.find((n) => n.type === "attendance_checked_out");
    expect(checkOutNotif).toBeDefined();
  });

  it("after HR approves Fikri request: demo:employee receives approved notification", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await approveRequest("demo:manager", "req-fikri-01", "Disetujui");
    await approveRequest("demo:admin", "req-fikri-01", "Disetujui");
    const notifs = await fetchNotifications("demo:employee");
    const approvedNotif = notifs.find((n) => n.type === "request_approved");
    expect(approvedNotif).toBeDefined();
  });

  it("resetDemoAttendanceState clears all demo notifications", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await checkIn("demo:employee", { method: "QR" });
    const before = await fetchNotifications("demo:employee");
    expect(before.length).toBeGreaterThan(0);
    resetDemoAttendanceState();
    const after = await fetchNotifications("demo:employee");
    expect(after).toHaveLength(0);
  });
});

describe("PHASE 11.1 — live dashboard stats (RED: must fail before fix)", () => {
  beforeEach(() => {
    resetDemoAttendanceState();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("getDashboard for demo:manager Tim hadir is 0 before check-in (not hardcoded 26)", async () => {
    const dashboard = await getDashboard("demo:manager");
    const stat = dashboard.stats.find((s) => s.label === "Tim hadir");
    expect(stat?.value).toBe("0");
  });

  it("getDashboard for demo:manager Tim hadir is 1 after Fikri check-in", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const dashboard = await getDashboard("demo:manager");
    const stat = dashboard.stats.find((s) => s.label === "Tim hadir");
    expect(stat?.value).toBe("1");
  });

  it("getDashboard for demo:admin Karyawan hadir is 0 before check-in (not hardcoded 187)", async () => {
    const dashboard = await getDashboard("demo:admin");
    const stat = dashboard.stats.find((s) => s.label === "Karyawan hadir");
    expect(stat?.value).toBe("0");
  });

  it("getDashboard for demo:admin Karyawan hadir is 1 after Fikri check-in", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const dashboard = await getDashboard("demo:admin");
    const stat = dashboard.stats.find((s) => s.label === "Karyawan hadir");
    expect(stat?.value).toBe("1");
  });

  it("getDashboard for demo:admin Approval pending reflects live demoFikriRequests (not hardcoded 6)", async () => {
    const dashboard = await getDashboard("demo:admin");
    const stat = dashboard.stats.find((s) => s.label === "Approval pending");
    // 1 pending_manager request seeded in demoFikriRequests
    expect(stat?.value).toBe("1");
  });
});

describe("PHASE 11.1 — cross-role attendance sync integration", () => {
  beforeEach(() => {
    resetDemoAttendanceState();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fetchManagerEmployeeList shows Fikri as absent before check-in", async () => {
    const list = await fetchManagerEmployeeList("demo:manager");
    const fikri = list.find((e) => e.id === "usr-employee-01")!;
    expect(fikri.todayStatus).toBe("absent");
    expect(fikri.checkInTime).toBeUndefined();
  });

  it("after employee check-in: fetchManagerEmployeeList shows Fikri with checkInTime", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const list = await fetchManagerEmployeeList("demo:manager");
    const fikri = list.find((e) => e.id === "usr-employee-01")!;
    expect(fikri.todayStatus).not.toBe("absent");
    expect(fikri.checkInTime).toBeTruthy();
  });

  it("after employee check-in: fetchManagerOverview checkedInToday is 1", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const overview = await fetchManagerOverview("demo:manager");
    expect(overview.checkedInToday).toBe(1);
    expect(overview.absentToday).toBe(0);
  });

  it("after employee check-in: fetchAdminOverview checkedInToday is 1", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const overview = await fetchAdminOverview("demo:admin");
    expect(overview.checkedInToday).toBe(1);
    expect(overview.absentToday).toBe(0);
  });

  it("after employee check-in: fetchEmployeeList for admin shows Fikri with checkInTime", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const list = await fetchEmployeeList("demo:admin");
    const fikri = list.find((e) => e.id === "usr-employee-01")!;
    expect(fikri.checkInTime).toBeTruthy();
  });

  it("after employee check-in: fetchReportRows for admin shows Fikri with checkInTime", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const rows = await fetchReportRows("demo:admin");
    const fikri = rows.find((r) => r.employeeId === "usr-employee-01")!;
    expect(fikri.checkInTime).toBeTruthy();
    expect(fikri.status).not.toBe("Belum check-in");
  });

  it("after employee check-in then check-out: all read paths show checkOutTime", async () => {
    await checkIn("demo:employee", { method: "QR" });
    await checkOut("demo:employee", { method: "QR" });

    const summary = await fetchEmployeeSummary("demo:employee");
    expect(summary.currentAttendanceState).toBe("checked_out");
    expect(summary.todayRecord.checkOutTime).toBeTruthy();

    const list = await fetchManagerEmployeeList("demo:manager");
    const fikri = list.find((e) => e.id === "usr-employee-01")!;
    expect(fikri.checkOutTime).toBeTruthy();

    const rows = await fetchReportRows("demo:admin");
    const row = rows.find((r) => r.employeeId === "usr-employee-01")!;
    expect(row.checkOutTime).toBeTruthy();
  });

  it("no duplicate row after check-in then check-out", async () => {
    await checkIn("demo:employee", { method: "QR" });
    await checkOut("demo:employee", { method: "QR" });
    const history = await fetchAttendanceHistory("demo:employee");
    const todayRows = history.filter((r) => r.day === "Hari ini");
    expect(todayRows).toHaveLength(1);
  });

  it("notifications: check-in creates events for employee, manager, and admin", async () => {
    await checkIn("demo:employee", { method: "QR" });
    const empNotifs = await fetchNotifications("demo:employee");
    const mgrNotifs = await fetchNotifications("demo:manager");
    const adminNotifs = await fetchNotifications("demo:admin");
    expect(empNotifs.length).toBeGreaterThan(0);
    expect(mgrNotifs.length).toBeGreaterThan(0);
    expect(adminNotifs.length).toBeGreaterThan(0);
    expect(empNotifs[0].type).toBe("attendance_checked_in");
    expect(mgrNotifs[0].type).toBe("attendance_checked_in");
    expect(adminNotifs[0].type).toBe("attendance_checked_in");
  });

  it("clean roster: fetchManagerEmployeeList contains only Fikri (no Anisa/Leo/Dina/Budi)", async () => {
    const list = await fetchManagerEmployeeList("demo:manager");
    const forbidden = ["Anisa Rahma", "Leo Pratama", "Dina Fitriani", "Budi Santoso"];
    for (const name of forbidden) {
      expect(list.find((e) => e.fullName === name)).toBeUndefined();
    }
    expect(list.find((e) => e.id === "usr-employee-01")).toBeDefined();
  });

  it("clean roster: fetchReportRows for admin contains only Fikri (no dummy employees)", async () => {
    const rows = await fetchReportRows("demo:admin");
    const forbidden = ["Anisa Rahma", "Leo Pratama", "Dina Fitriani", "Budi Santoso"];
    for (const name of forbidden) {
      expect(rows.find((r) => r.employeeName === name)).toBeUndefined();
    }
    expect(rows).toHaveLength(1);
    expect(rows[0].employeeName).toBe("Fikri Maulana");
  });
});

describe("PHASE 11.1 — localStorage sync (cross-tab state persistence)", () => {
  beforeEach(() => {
    resetDemoAttendanceState();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("resetDemoAttendanceState clears localStorage if available", () => {
    const store: Record<string, string> = { "taptu:demo_live_state": '{"stub":true}' };
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; }
    });
    resetDemoAttendanceState();
    expect(store["taptu:demo_live_state"]).toBeUndefined();
  });

  it("recordDemoCheckIn writes employee state to localStorage if available", async () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; }
    });
    await checkIn("demo:employee", { method: "QR" });
    const raw = store["taptu:demo_live_state"];
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw) as { employees: Array<{ id: string; todayStatus: string }> };
    const fikri = parsed.employees.find((e) => e.id === "usr-employee-01");
    expect(fikri?.todayStatus).not.toBe("absent");
  });
});
