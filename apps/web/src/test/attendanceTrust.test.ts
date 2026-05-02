import { describe, expect, it } from "vitest";

import { evaluateAttendanceTrust, secureAttendancePolicy } from "../lib/attendanceTrust";

describe("attendance trust state machine", () => {
  it("allows clock action when time, location, and device integrity are valid", () => {
    const state = evaluateAttendanceTrust(
      {
        serverTimeSkewMinutes: 1,
        distanceFromOfficeMeters: 96,
        locationAccuracyMeters: 24,
        mockLocationDetected: false
      },
      secureAttendancePolicy
    );

    expect(state.status).toBe("ready");
    expect(state.canClock).toBe(true);
  });

  it("blocks clock action when device time is edited too far from server time", () => {
    const state = evaluateAttendanceTrust(
      {
        serverTimeSkewMinutes: 9,
        distanceFromOfficeMeters: 40,
        locationAccuracyMeters: 16,
        mockLocationDetected: false
      },
      secureAttendancePolicy
    );

    expect(state.status).toBe("blocked_clock");
    expect(state.canClock).toBe(false);
  });

  it("blocks clock action outside the allowed office radius", () => {
    const state = evaluateAttendanceTrust(
      {
        serverTimeSkewMinutes: 0,
        distanceFromOfficeMeters: 220,
        locationAccuracyMeters: 20,
        mockLocationDetected: false
      },
      secureAttendancePolicy
    );

    expect(state.status).toBe("blocked_location");
    expect(state.canClock).toBe(false);
  });

  it("blocks clock action when mock-location risk is detected", () => {
    const state = evaluateAttendanceTrust(
      {
        serverTimeSkewMinutes: 0,
        distanceFromOfficeMeters: 48,
        locationAccuracyMeters: 12,
        mockLocationDetected: true
      },
      secureAttendancePolicy
    );

    expect(state.status).toBe("blocked_integrity");
    expect(state.canClock).toBe(false);
  });
});
