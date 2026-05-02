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
    expect(transitionTab("employee", "home", { type: "OPEN_ATTENDANCE" })).toBe("attendance");
    expect(transitionTab("employee", "attendance", { type: "OPEN_PROFILE" })).toBe("profile");
  });

  it("rejects invalid scanner transition for admin role", () => {
    expect(transitionTab("admin", "home", { type: "OPEN_SCANNER" })).toBe("home");
  });

  it("defines a focused HR navigation model for admin users", () => {
    expect(getNavigationForRole("admin").map((item) => item.key)).toEqual([
      "home",
      "team",
      "attendance",
      "requests",
      "locations",
      "reports",
      "profile"
    ]);
  });

  it("defines manager navigation without scanner or system settings", () => {
    expect(getNavigationForRole("manager").map((item) => item.key)).toEqual([
      "home",
      "team",
      "attendance",
      "requests",
      "reports",
      "profile"
    ]);
  });

  it("keeps scanner users in kiosk-first navigation", () => {
    expect(getDefaultAppSection("scanner")).toBe("scanner");
    expect(getNavigationForRole("scanner").map((item) => item.key)).toEqual(["scanner", "attendance", "profile"]);
  });

  it("falls back to the default section for unknown route segments", () => {
    expect(toAppSection("not-a-section", "employee")).toBe("home");
    expect(toAppSection(undefined, "scanner")).toBe("scanner");
  });
});
