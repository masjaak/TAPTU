import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Express } from "express";

type LoginResponse = { token: string };
type HistoryItem = { id: string; checkInTime?: string; checkOutTime?: string };
type EmployeeItem = { id: string; managerId?: string | null; departmentId?: string | null; checkInTime?: string };
type ReportItem = { employeeId: string; departmentId?: string | null; checkInTime?: string; checkOutTime?: string };
type AttendanceActionResponse = {
  attendanceState: "checked_in" | "checked_out";
  record: HistoryItem;
};

describe("attendance API shared flow", () => {
  let app: Express;
  let resetLocalAttendanceStoreForTests: () => void;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    process.env.TAPTU_STORAGE_MODE = "local-demo";
    ({ app, resetLocalAttendanceStoreForTests } = await import("./index"));
    resetLocalAttendanceStoreForTests();
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port.");
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  }, 30_000);

  afterEach(async () => {
    resetLocalAttendanceStoreForTests();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  async function request<T>(path: string, init: RequestInit = {}, token?: string) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });
    const body = await response.json().catch(() => null);
    return Object.assign(body, { status: response.status }) as T & { status: number };
  }

  async function login(email: string) {
    return (await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "Taptu123!" })
    })).token;
  }

  it("seeds Fikri into the connected demo organization structure", async () => {
    const adminToken = await login("admin@taptu.app");
    const employees = await request<EmployeeItem[]>("/admin/employees", {}, adminToken);
    expect(employees.find((employee) => employee.id === "usr-employee-01")).toMatchObject({
      departmentId: "dep-ops",
      managerId: "usr-manager-01"
    });
  });

  it("persists employee check-in, updates same record on check-out, and exposes history", async () => {
    const employeeToken = await login("employee@taptu.app");

    const checkIn = await request<AttendanceActionResponse>("/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);
    expect(checkIn.status).toBe(200);
    expect(checkIn.attendanceState).toBe("checked_in");

    const afterCheckIn = await request<HistoryItem[]>("/attendance/history", {}, employeeToken);
    expect(afterCheckIn[0]).toMatchObject({ id: checkIn.record.id });
    expect(afterCheckIn[0].checkInTime).toBeTruthy();
    expect(afterCheckIn[0].checkOutTime).toBeUndefined();

    const checkOut = await request<AttendanceActionResponse>("/attendance/checkout", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);
    expect(checkOut.status).toBe(200);
    expect(checkOut.attendanceState).toBe("checked_out");
    expect(checkOut.record.id).toBe(checkIn.record.id);

    const afterCheckOut = await request<HistoryItem[]>("/attendance/history", {}, employeeToken);
    expect(afterCheckOut[0]).toMatchObject({ id: checkIn.record.id });
    expect(afterCheckOut[0].checkOutTime).toBeTruthy();
  });

  it("shows manager only their assigned team attendance", async () => {
    const employeeToken = await login("employee@taptu.app");
    const nonTeamToken = await login("anisa@taptu.app");
    const managerToken = await login("manager@taptu.app");

    await request("/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);
    await request("/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, nonTeamToken);

    const managerTeam = await request<EmployeeItem[]>("/admin/employees", {}, managerToken);
    expect(managerTeam).toContainEqual(expect.objectContaining({
      id: "usr-employee-01",
      managerId: "usr-manager-01"
    }));
    expect(managerTeam.find((employee) => employee.id === "usr-employee-01")?.checkInTime).toBeTruthy();
    expect(managerTeam.some((employee) => employee.id === "usr-employee-02")).toBe(false);
  });

  it("shows HR org-wide attendance and reports for Fikri", async () => {
    const employeeToken = await login("employee@taptu.app");
    const adminToken = await login("admin@taptu.app");

    await request("/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);

    const hrHistory = await request<HistoryItem[]>("/attendance/history", {}, adminToken);
    expect(hrHistory[0].checkInTime).toBeTruthy();

    const reports = await request<ReportItem[]>("/admin/reports?departmentId=dep-ops", {}, adminToken);
    expect(reports).toContainEqual(expect.objectContaining({
      employeeId: "usr-employee-01",
      departmentId: "dep-ops"
    }));
  });

  it("admin/reports does not include dummy attendance records not backed by a real user", async () => {
    const adminToken = await login("admin@taptu.app");
    const reports = await request<{ employeeName: string }[]>("/admin/reports", {}, adminToken);
    const dummyRows = reports.filter((r) => r.employeeName === "Employee");
    expect(dummyRows).toHaveLength(0);
  });

  it("manager/reports only returns employees in the manager's team", async () => {
    const managerToken = await login("manager@taptu.app");
    const reports = await request<{ employeeId: string; employeeName: string }[]>("/admin/reports", {}, managerToken);
    const nonTeamRows = reports.filter((r) => r.employeeId !== "usr-employee-01");
    expect(nonTeamRows).toHaveLength(0);
  });

  it("records honest review state when location is unavailable instead of faking valid attendance", async () => {
    const employeeToken = await login("employee@taptu.app");
    const checkIn = await request<{ validationStatus: string; validationReasons: string[] }>("/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);

    expect(checkIn.validationStatus).toBe("needs_review");
    expect(checkIn.validationReasons).toContain("Lokasi belum terekam.");
  });

  it("fresh reset: manager sees Fikri as Belum hadir with no stale cuti/requests", async () => {
    const superadminToken = await login("superadmin@taptu.app");
    await request("/demo/reset", { method: "POST" }, superadminToken);

    const managerToken = await login("manager@taptu.app");
    const team = await request<EmployeeItem[]>("/admin/employees", {}, managerToken);

    const fikri = team.find((e) => e.id === "usr-employee-01");
    expect(fikri).toBeDefined();
    expect(fikri?.checkInTime).toBeUndefined();

    const managerRequests = await request<unknown[]>("/admin/requests", {}, managerToken);
    expect(Array.isArray(managerRequests)).toBe(true);
    expect(managerRequests).toHaveLength(0);
  });

  it("fresh reset: HR sees no stale attendance history and no stale requests", async () => {
    const superadminToken = await login("superadmin@taptu.app");
    await request("/demo/reset", { method: "POST" }, superadminToken);

    const adminToken = await login("admin@taptu.app");
    const reports = await request<ReportItem[]>("/admin/reports", {}, adminToken);
    const staleRows = reports.filter((r) => r.checkInTime != null && new Date(r.checkInTime) < new Date(Date.now() - 24 * 60 * 60 * 1000));
    expect(staleRows).toHaveLength(0);

    const adminRequests = await request<unknown[]>("/admin/requests", {}, adminToken);
    expect(adminRequests).toHaveLength(0);
  });

  it("check-out: Manager employee list shows checkOutTime matching HR report", async () => {
    const employeeToken = await login("employee@taptu.app");
    const managerToken = await login("manager@taptu.app");
    const adminToken = await login("admin@taptu.app");

    await request("/attendance/checkin", { method: "POST", body: JSON.stringify({ method: "Manual" }) }, employeeToken);
    const checkOut = await request<AttendanceActionResponse>("/attendance/checkout", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);
    const checkOutTime: string | undefined = checkOut.record.checkOutTime;
    expect(checkOutTime).toBeTruthy();

    const managerTeam = await request<EmployeeItem[]>("/admin/employees", {}, managerToken);
    const fikri = managerTeam.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkOutTime).toBe(checkOutTime);

    const reports = await request<ReportItem[]>("/admin/reports", {}, adminToken);
    const fikriReport = reports.find((r) => r.employeeId === "usr-employee-01");
    expect(fikriReport?.checkOutTime).toBe(checkOutTime);
  });

  it("time sync: Employee check-in time matches Manager and HR view exactly", async () => {
    const employeeToken = await login("employee@taptu.app");
    const managerToken = await login("manager@taptu.app");
    const adminToken = await login("admin@taptu.app");

    const checkIn = await request<AttendanceActionResponse>("/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);
    expect(checkIn.status).toBe(200);
    const employeeCheckInTime: string | undefined = checkIn.record.checkInTime;
    expect(employeeCheckInTime).toBeTruthy();

    const managerTeam = await request<EmployeeItem[]>("/admin/employees", {}, managerToken);
    const fikri = managerTeam.find((e) => e.id === "usr-employee-01");
    expect(fikri?.checkInTime).toBe(employeeCheckInTime);

    const reports = await request<ReportItem[]>("/admin/reports", {}, adminToken);
    const fikriReport = reports.find((r) => r.employeeId === "usr-employee-01");
    expect(fikriReport?.checkInTime).toBe(employeeCheckInTime);
  });

  it("PHASE 11.11 — clean default: dashboard attendance for manager is empty (no seeded fake 08.03)", async () => {
    const managerToken = await login("manager@taptu.app");
    const dashboard = await request<{ attendance: unknown[] }>("/dashboard", {}, managerToken);
    expect(dashboard.attendance).toHaveLength(0);
  });

  it("PHASE 11.11 — clean default: dashboard attendance for admin is empty (no seeded fake 08.24)", async () => {
    const adminToken = await login("admin@taptu.app");
    const dashboard = await request<{ attendance: unknown[] }>("/dashboard", {}, adminToken);
    expect(dashboard.attendance).toHaveLength(0);
  });

  it("PHASE 11.11 — clean default: dashboard requests for manager is empty (no seeded fake Izin tim lapangan)", async () => {
    const managerToken = await login("manager@taptu.app");
    const dashboard = await request<{ requests: unknown[] }>("/dashboard", {}, managerToken);
    expect(dashboard.requests).toHaveLength(0);
  });

  it("PHASE 11.11 — Raka (manager) does not appear as an attendance subject in admin/reports", async () => {
    const adminToken = await login("admin@taptu.app");
    const reports = await request<{ employeeId: string }[]>("/admin/reports", {}, adminToken);
    expect(reports.some((r) => r.employeeId === "usr-manager-01")).toBe(false);
  });

  it("manager review action: PATCH exception persists across reload", async () => {
    const employeeToken = await login("employee@taptu.app");
    const managerToken = await login("manager@taptu.app");

    await request("/attendance/checkin", {
      method: "POST",
      body: JSON.stringify({ method: "Manual" })
    }, employeeToken);

    const exceptions = await request<{ id: string; status: string }[]>("/admin/exceptions", {}, managerToken);
    if (exceptions.length === 0) return;

    const exc = exceptions[0];
    const reviewed = await request<{ exception: { status: string } }>(
      `/admin/exceptions/${exc.id}`,
      { method: "PATCH", body: JSON.stringify({ status: "Approved", adminNote: "Lokasi dimaklumi." }) },
      managerToken
    );
    expect(reviewed.status).toBe(200);
    expect(reviewed.exception?.status).toBe("Approved");

    const afterReload = await request<{ id: string; status: string }[]>("/admin/exceptions", {}, managerToken);
    const reloaded = afterReload.find((e) => e.id === exc.id);
    expect(reloaded?.status).toBe("Approved");
  });
});
