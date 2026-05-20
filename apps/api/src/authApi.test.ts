import { z } from "zod";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

type FindUser = (email: string, password: string) => {
  id: string;
  role: string;
  departmentId?: string | null;
  managerId?: string | null;
} | null;

let findLocalDemoUserByCredentials: FindUser;
let resetLocalAttendanceStoreForTests: () => void;
let registerSchema: z.ZodObject<any>;

describe("demo auth mapping", () => {
  beforeAll(async () => {
    process.env.TAPTU_STORAGE_MODE = "local-demo";
    ({ findLocalDemoUserByCredentials, resetLocalAttendanceStoreForTests, registerSchema } = await import("./index"));
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

describe("register schema — superadmin-only public registration", () => {
  beforeAll(async () => {
    process.env.TAPTU_STORAGE_MODE = "local-demo";
    ({ registerSchema } = await import("./index"));
  });

  const basePayload = {
    fullName: "Budi Santoso",
    email: "budi@perusahaan.com",
    password: "Taptu123!",
    organizationName: "PT Perusahaan",
    role: "superadmin" as const
  };

  it("accepts valid superadmin registration payload", () => {
    expect(registerSchema.safeParse(basePayload).success).toBe(true);
  });

  it("rejects admin role — admin accounts created from dashboard, not public register", () => {
    expect(registerSchema.safeParse({ ...basePayload, role: "admin" }).success).toBe(false);
  });

  it("rejects manager role — manager accounts created from dashboard", () => {
    expect(registerSchema.safeParse({ ...basePayload, role: "manager" }).success).toBe(false);
  });

  it("rejects employee role — employee accounts created from dashboard", () => {
    expect(registerSchema.safeParse({ ...basePayload, role: "employee" }).success).toBe(false);
  });

  it("rejects scanner role — scanner accounts created from dashboard", () => {
    expect(registerSchema.safeParse({ ...basePayload, role: "scanner" }).success).toBe(false);
  });

  it("defaults to superadmin when role is omitted", () => {
    const { role, ...withoutRole } = basePayload;
    const result = registerSchema.safeParse(withoutRole);
    expect(result.success).toBe(true);
    expect(result.data?.role).toBe("superadmin");
  });
});
