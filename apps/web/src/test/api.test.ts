import { afterEach, describe, expect, it, vi } from "vitest";

import {
  approveRequest,
  createDepartment,
  fetchEmployeeSummary,
  fetchDepartments,
  fetchEmployeeList,
  fetchReportRows,
  fetchManagerEmployeeList,
  fetchManagerExceptionQueue,
  fetchManagerOverview,
  fetchManagerRequests,
  fetchNotifications,
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
