import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Express } from "express";

type LoginResponse = {
  token: string;
};

type DepartmentResponse = {
  id: string;
  name: string;
  managerId?: string | null;
  managerName?: string | null;
  isActive?: boolean;
  memberCount?: number;
};

type EmployeeResponse = {
  id: string;
  departmentId?: string | null;
  departmentName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
};

describe("department management API connection", () => {
  let app: Express;
  let resetLocalOrganizationStructureForTests: () => void;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    process.env.TAPTU_STORAGE_MODE = "local-demo";
    ({ app, resetLocalOrganizationStructureForTests } = await import("./index"));
    resetLocalOrganizationStructureForTests();
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port.");
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });

  afterEach(async () => {
    resetLocalOrganizationStructureForTests();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  async function login(email: string) {
    const response = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "Taptu123!" })
    });
    return response.token;
  }

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

  it("lets HR create departments and assign employees so refreshed employee lists expose usable department data", async () => {
    const adminToken = await login("admin@taptu.app");

    const initialDepartments = await request<DepartmentResponse[]>("/departments", {}, adminToken);
    expect(initialDepartments.status).toBe(200);
    expect(initialDepartments).toHaveLength(0);

    const created = await request<DepartmentResponse>("/departments", {
      method: "POST",
      body: JSON.stringify({ name: "People Operations", managerId: "usr-manager-01" })
    }, adminToken);

    expect(created).toMatchObject({
      status: 201,
      name: "People Operations",
      managerId: "usr-manager-01",
      managerName: "Raka Saputra",
      memberCount: 0
    });

    const updated = await request<DepartmentResponse>(`/departments/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "HR Operations", managerId: null, isActive: false })
    }, adminToken);

    expect(updated).toMatchObject({
      status: 200,
      name: "HR Operations",
      managerId: null,
      managerName: null,
      isActive: false
    });

    const reassigned = await request<EmployeeResponse>("/employees/usr-employee-01", {
      method: "PATCH",
      body: JSON.stringify({ departmentId: created.id, managerId: "usr-manager-01" })
    }, adminToken);

    expect(reassigned).toMatchObject({
      status: 200,
      id: "usr-employee-01",
      departmentId: created.id,
      departmentName: "HR Operations",
      managerId: "usr-manager-01",
      managerName: "Raka Saputra"
    });

    const refreshedEmployees = await request<EmployeeResponse[]>("/admin/employees", {}, adminToken);
    expect(refreshedEmployees.find((employee) => employee.id === "usr-employee-01")).toMatchObject({
      departmentId: created.id,
      departmentName: "HR Operations",
      managerName: "Raka Saputra"
    });

    const refreshedDepartments = await request<DepartmentResponse[]>("/departments", {}, adminToken);
    expect(refreshedDepartments).toContainEqual(expect.objectContaining({
      id: created.id,
      name: "HR Operations",
      memberCount: 1
    }));
  });

  it("allows superadmin and denies manager or employee department management transitions", async () => {
    const superadminToken = await login("superadmin@taptu.app");
    const managerToken = await login("manager@taptu.app");
    const employeeToken = await login("employee@taptu.app");

    expect(await request<DepartmentResponse[]>("/departments", {}, superadminToken)).toMatchObject({ status: 200 });

    for (const token of [managerToken, employeeToken]) {
      expect(await request("/departments", {}, token)).toMatchObject({ status: 403 });
      expect(await request("/departments", {
        method: "POST",
        body: JSON.stringify({ name: "Blocked" })
      }, token)).toMatchObject({ status: 403 });
      expect(await request("/departments/dep-blocked", {
        method: "PATCH",
        body: JSON.stringify({ name: "Blocked" })
      }, token)).toMatchObject({ status: 403 });
      expect(await request("/employees/usr-employee-01", {
        method: "PATCH",
        body: JSON.stringify({ departmentId: null })
      }, token)).toMatchObject({ status: 403 });
    }
  });
});
