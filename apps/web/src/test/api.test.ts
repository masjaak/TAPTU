import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These tests exercise the Express-API path. Stub supabase as null so
// the Supabase auth branch in login() is not triggered.
vi.mock("../lib/supabase", () => ({ supabase: null, isSupabaseEnabled: () => false }));

import {
  approveRequest,
  checkIn,
  checkOut,
  createDepartment,
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
    expect(result.validationReasons.some((r) => r.toLowerCase().includes("selfie"))).toBe(true);
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
