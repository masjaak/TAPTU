import { beforeEach, describe, expect, it } from "vitest";

import { readSession, saveSession } from "../lib/session";

describe("session auth migration", () => {
  beforeEach(() => localStorage.clear());

  it("clears legacy demo tokens whose role no longer matches the stored profile", () => {
    localStorage.setItem("taptu-session", JSON.stringify({
      token: "demo:employee",
      user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "Taptu Demo Company", role: "manager" }
    }));

    expect(readSession()).toBeNull();
    expect(localStorage.getItem("taptu-session")).toBeNull();
  });

  it("keeps a connected shared-api session even when the token is not demo-formatted", () => {
    saveSession({
      token: "jwt-token",
      user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "Taptu Demo Company", role: "employee" }
    });

    expect(readSession()?.user.id).toBe("usr-employee-01");
  });
});
