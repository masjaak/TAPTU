import { beforeAll, beforeEach, describe, expect, it } from "vitest";

type FindUser = (email: string, password: string) => {
  id: string;
  role: string;
  departmentId?: string | null;
  managerId?: string | null;
} | null;

let findLocalDemoUserByCredentials: FindUser;
let resetLocalAttendanceStoreForTests: () => void;

describe("demo auth mapping", () => {
  beforeAll(async () => {
    process.env.TAPTU_STORAGE_MODE = "local-demo";
    ({ findLocalDemoUserByCredentials, resetLocalAttendanceStoreForTests } = await import("./index"));
  });

  beforeEach(() => resetLocalAttendanceStoreForTests());

  it("maps every advertised demo credential to the connected seed profile", () => {
    expect(findLocalDemoUserByCredentials("superadmin@taptu.app", "Taptu123!")).toMatchObject({ id: "usr-superadmin-01", role: "superadmin" });
    expect(findLocalDemoUserByCredentials("admin@taptu.app", "Taptu123!")).toMatchObject({ id: "usr-admin-01", role: "admin" });
    expect(findLocalDemoUserByCredentials("manager@taptu.app", "Taptu123!")).toMatchObject({ id: "usr-manager-01", role: "manager" });
    expect(findLocalDemoUserByCredentials("employee@taptu.app", "Taptu123!")).toMatchObject({ id: "usr-employee-01", role: "employee", departmentId: "dep-ops", managerId: "usr-manager-01" });
    expect(findLocalDemoUserByCredentials("scanner@taptu.app", "Taptu123!")).toMatchObject({ id: "usr-scanner-01", role: "scanner" });
  });

  it("rejects invalid demo credentials", () => {
    expect(findLocalDemoUserByCredentials("employee@taptu.app", "wrong")).toBeNull();
  });

  it("PHASE 11.2 — Anisa Rahma is not a demo account (RED until users array cleaned)", () => {
    expect(findLocalDemoUserByCredentials("anisa@taptu.app", "Taptu123!")).toBeNull();
  });

  it("PHASE 11.2 — Leo Pratama is not a demo account (RED until users array cleaned)", () => {
    expect(findLocalDemoUserByCredentials("leo@taptu.app", "Taptu123!")).toBeNull();
  });
});
