import { describe, expect, it } from "vitest";

import { getTabsForRole, transitionTab } from "../lib/appShellState";

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
});
