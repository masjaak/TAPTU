import { describe, expect, it } from "vitest";

import {
  getDefaultAppSection,
  getNavigationForRole,
  getTabsForRole,
  toAppSection,
  transitionTab
} from "../lib/appShellState";

describe("app shell state", () => {
  it("shows scanner tab only for scanner role", () => {
    expect(getTabsForRole("scanner").map((item) => item.key)).toContain("scanner");
    expect(getTabsForRole("employee").map((item) => item.key)).not.toContain("scanner");
  });

  it("moves to allowed tabs for employee role", () => {
    expect(getDefaultAppSection("employee")).toBe("home");
    expect(getNavigationForRole("employee").map((item) => item.key)).toEqual([
      "home",
      "attendance",
      "history",
      "requests",
      "schedule",
      "payslip",
      "profile"
    ]);
    expect(transitionTab("employee", "attendance", { type: "OPEN_PROFILE" })).toBe("profile");
  });

  it("rejects invalid scanner transition for admin role", () => {
    expect(transitionTab("admin", "home", { type: "OPEN_SCANNER" })).toBe("home");
  });

  it("defines a focused HR navigation model for admin users", () => {
    expect(getNavigationForRole("admin").map((item) => item.key)).toEqual([
      "home",
      "team",
      "structure",
      "attendance",
      "requests",
      "locations",
      "reports",
      "profile"
    ]);
    expect(getNavigationForRole("admin").map((item) => item.label)).toContain("Struktur");
  });

  it("defines manager navigation without scanner or system settings", () => {
    expect(getNavigationForRole("manager").map((item) => item.key)).toEqual([
      "home",
      "team",
      "attendance",
      "requests",
      "exceptions",
      "profile"
    ]);
    expect(getNavigationForRole("manager").map((item) => item.key)).not.toContain("structure");
    expect(getNavigationForRole("employee").map((item) => item.key)).not.toContain("structure");
    expect(toAppSection("structure", "manager")).toBe("home");
    expect(toAppSection("structure", "employee")).toBe("home");
  });

  it("applies manager-specific labels for team and attendance sections", () => {
    const nav = getNavigationForRole("manager");
    expect(nav.find((item) => item.key === "team")?.label).toBe("Tim Saya");
    expect(nav.find((item) => item.key === "attendance")?.label).toBe("Presensi Tim");
    expect(nav.find((item) => item.key === "exceptions")?.label).toBe("Pengecualian");
  });

  it("does not apply manager label overrides for admin role", () => {
    const nav = getNavigationForRole("admin");
    expect(nav.find((item) => item.key === "team")?.label).toBe("Tim");
    expect(nav.find((item) => item.key === "attendance")?.label).toBe("Presensi");
  });

  it("keeps scanner users in kiosk-first navigation", () => {
    expect(getDefaultAppSection("scanner")).toBe("scanner");
    expect(getNavigationForRole("scanner").map((item) => item.key)).toEqual(["scanner", "profile"]);
  });

  it("falls back to the default section for unknown route segments", () => {
    expect(toAppSection("not-a-section", "employee")).toBe("home");
    expect(toAppSection(undefined, "scanner")).toBe("scanner");
  });
});
