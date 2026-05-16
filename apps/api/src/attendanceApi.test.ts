import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Express } from "express";

type LoginResponse = { token: string };
type HistoryItem = { id: string; checkInTime?: string; checkOutTime?: string };
type EmployeeItem = { id: string; managerId?: string | null; checkInTime?: string };
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
  });

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

  it("persists employee check-in, updates same record on check-out, and exposes history", async () => {
    const employeeToken = await login("leo@taptu.app");

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
});
