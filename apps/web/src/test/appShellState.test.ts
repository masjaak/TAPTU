import { describe, expect, it } from "vitest";

import {
  getDefaultAppSection,
  getNavigationForRole,
  getTabsForRole,
  toAppSection,
  transitionAppSection,
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
      "notifications",
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
      "notifications",
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
      "notifications",
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

  it("defines exact role navigation access for every role", () => {
    expect(getNavigationForRole("employee").map((item) => item.key)).toEqual([
      "home",
      "attendance",
      "history",
      "requests",
      "notifications",
      "schedule",
      "payslip",
      "profile"
    ]);
    expect(getNavigationForRole("manager").map((item) => item.key)).toEqual([
      "home",
      "team",
      "attendance",
      "requests",
      "notifications",
      "exceptions",
      "profile"
    ]);
    expect(getNavigationForRole("admin").map((item) => item.key)).toEqual([
      "home",
      "team",
      "structure",
      "attendance",
      "requests",
      "notifications",
      "locations",
      "reports",
      "profile"
    ]);
    expect(getNavigationForRole("superadmin").map((item) => item.key)).toEqual([
      "home",
      "team",
      "structure",
      "attendance",
      "requests",
      "notifications",
      "locations",
      "reports",
      "settings",
      "profile"
    ]);
    expect(getNavigationForRole("scanner").map((item) => item.key)).toEqual(["scanner", "profile"]);
  });

  it("blocks direct route sections outside the active role allow-list", () => {
    expect(toAppSection("team", "employee")).toBe("home");
    expect(toAppSection("structure", "employee")).toBe("home");
    expect(toAppSection("reports", "employee")).toBe("home");
    expect(toAppSection("settings", "employee")).toBe("home");

    expect(toAppSection("reports", "manager")).toBe("home");
    expect(toAppSection("locations", "manager")).toBe("home");
    expect(toAppSection("scanner", "manager")).toBe("home");
    expect(toAppSection("structure", "manager")).toBe("home");
    expect(toAppSection("settings", "manager")).toBe("home");

    expect(toAppSection("scanner", "admin")).toBe("home");
    expect(toAppSection("settings", "admin")).toBe("home");
    expect(toAppSection("scanner", "superadmin")).toBe("home");
    expect(toAppSection("home", "scanner")).toBe("scanner");
    expect(toAppSection("attendance", "scanner")).toBe("scanner");
  });

  it("rejects unauthorized section transition events without changing section", () => {
    expect(transitionAppSection("employee", "home", { type: "OPEN_REPORTS" })).toBe("home");
    expect(transitionAppSection("manager", "attendance", { type: "OPEN_LOCATIONS" })).toBe("attendance");
    expect(transitionAppSection("admin", "reports", { type: "OPEN_SCANNER" })).toBe("reports");
    expect(transitionAppSection("scanner", "scanner", { type: "OPEN_HOME" })).toBe("scanner");
  });
});
