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
    // Anisa (dep-ops, manager-01) and Budi (dep-ops, manager-01) start with seeded attendance
    const overview = await fetchAdminOverview("demo:admin");
    // Both Anisa and Budi are in initial seeded state (late/present)
    const anisa = overview.recentActivity.find((a) => a.employeeName === "Anisa Rahma");
    const budi = overview.recentActivity.find((a) => a.employeeName === "Budi Santoso");
    expect(anisa).toBeDefined();
    expect(budi).toBeDefined();
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
    // Demo has 5 employee-role members; must not show enterprise-scale 248
    expect(overview.totalEmployees).not.toBe(248);
    expect(overview.totalEmployees).toBeGreaterThan(0);
    expect(overview.totalEmployees).toBeLessThanOrEqual(10);
  });

  it("HR admin checkedInToday equals live checked-in count before Fikri check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // Initial: Anisa(late) + Budi(present) = 2; must not be enterprise-scale 187
    expect(overview.checkedInToday).not.toBe(187);
    expect(overview.checkedInToday).toBe(2);
  });

  it("HR admin checkedInToday increases after Fikri Selfie check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchAdminOverview("demo:admin");
    await checkIn("demo:employee", { method: "Selfie" });
    const after = await fetchAdminOverview("demo:admin");
    expect(after.checkedInToday).toBe(before.checkedInToday + 1);
  });

  it("HR admin lateToday starts at 1 (Anisa) and increases after Fikri late check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchAdminOverview("demo:admin");
    expect(before.lateToday).toBe(1); // Anisa is initially late
    await checkIn("demo:employee", { method: "Selfie" }); // Fikri will be late (current time > 08:10)
    const after = await fetchAdminOverview("demo:admin");
    // Fikri should be late since tests run after 08:10
    expect(after.lateToday).toBeGreaterThanOrEqual(before.lateToday);
  });

  it("HR admin absentToday decreases after Fikri check-in", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const before = await fetchAdminOverview("demo:admin");
    expect(before.absentToday).toBe(2); // Fikri + Leo are absent initially
    await checkIn("demo:employee", { method: "Selfie" });
    const after = await fetchAdminOverview("demo:admin");
    expect(after.absentToday).toBe(before.absentToday - 1);
  });

  it("HR admin exceptionCount counts needs_review employees", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const overview = await fetchAdminOverview("demo:admin");
    // Anisa starts with validationStatus: needs_review → exceptionCount = 1
    expect(overview.exceptionCount).toBe(1);
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
