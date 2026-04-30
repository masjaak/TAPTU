import { describe, expect, it } from "vitest";

import { computeAdminOverview, computeEmployeeSummary, createInitialStore, filterAttendanceHistory, reduceAttendance, reduceRequests, refreshScannerToken } from "./domain";

describe("attendance state machine", () => {
  it("moves from idle to checked_in", () => {
    const next = reduceAttendance(
      { userId: "usr-employee-01", state: "idle" },
      { type: "CHECK_IN", method: "QR", at: "2026-04-30T08:03:00.000Z" }
    );

    expect(next.state).toBe("checked_in");
    expect(next.checkInMethod).toBe("QR");
  });

  it("rejects checkout before checkin", () => {
    const next = reduceAttendance(
      { userId: "usr-employee-01", state: "idle" },
      { type: "CHECK_OUT", method: "QR", at: "2026-04-30T17:01:00.000Z" }
    );

    expect(next.state).toBe("idle");
    expect(next.checkOutAt).toBeUndefined();
  });
});

describe("request state machine", () => {
  it("creates new pending request", () => {
    const next = reduceRequests([], {
      type: "CREATE",
      request: {
        id: "req-777",
        userId: "usr-employee-01",
        category: "Cuti",
        startDate: "2026-05-05",
        endDate: "2026-05-06",
        title: "Cuti tahunan",
        detail: "Butuh cuti 2 hari.",
        status: "Menunggu",
        createdAt: "2026-04-30T10:00:00.000Z"
      }
    });

    expect(next).toHaveLength(1);
    expect(next[0].status).toBe("Menunggu");
  });

  it("allows admin to approve pending request only", () => {
    const initial = createInitialStore().requests;
    const next = reduceRequests(initial, {
      type: "APPROVE",
      id: "req-001",
      actorRole: "admin"
    });

    expect(next[0].status).toBe("Disetujui");
  });

  it("rejects approval from employee role", () => {
    const initial = createInitialStore().requests;
    const next = reduceRequests(initial, {
      type: "APPROVE",
      id: "req-001",
      actorRole: "employee"
    });

    expect(next[0].status).toBe("Menunggu");
  });

  it("allows pending request cancellation", () => {
    const initial = createInitialStore().requests;
    const next = reduceRequests(initial, {
      type: "CANCEL",
      id: "req-001",
      actorRole: "employee"
    });

    expect(next).toHaveLength(0);
  });
});

describe("scanner token", () => {
  it("refreshes token and resets ttl", () => {
    const next = refreshScannerToken(createInitialStore().scanner);

    expect(next.token).not.toBe("HDR-31A-7XZ");
    expect(next.expiresInSeconds).toBe(30);
  });
});

describe("attendance history filter", () => {
  it("returns issue items only", () => {
    const filtered = filterAttendanceHistory(createInitialStore().attendanceHistory, "issue");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe("Izin");
  });
});

describe("admin overview", () => {
  it("returns zero counts for an empty store", () => {
    const store = createInitialStore();
    store.attendance = {};
    store.attendanceHistory = [];
    store.requests = [];

    const overview = computeAdminOverview(store, 10);

    expect(overview.checkedInToday).toBe(0);
    expect(overview.onTimeToday).toBe(0);
    expect(overview.lateToday).toBe(0);
    expect(overview.pendingRequests).toBe(0);
    expect(overview.totalEmployees).toBe(10);
  });

  it("counts employees who have checked in today", () => {
    const store = createInitialStore();
    store.attendance["usr-employee-01"] = {
      userId: "usr-employee-01",
      state: "checked_in",
      checkInAt: "2026-04-30T08:03:00.000Z",
      checkInMethod: "QR"
    };

    const overview = computeAdminOverview(store, 5);

    expect(overview.checkedInToday).toBe(1);
  });

  it("counts pending requests correctly", () => {
    const store = createInitialStore();
    const overview = computeAdminOverview(store, 5);

    expect(overview.pendingRequests).toBe(1);
  });

  it("counts on-time and late entries for today", () => {
    const store = createInitialStore();
    store.attendanceHistory = [
      { id: "a1", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" },
      { id: "a2", day: "Hari ini", status: "Terlambat", time: "09:15", method: "GPS" },
      { id: "a3", day: "Kemarin", status: "Tepat waktu", time: "07:58", method: "QR" }
    ];

    const overview = computeAdminOverview(store, 5);

    expect(overview.onTimeToday).toBe(1);
    expect(overview.lateToday).toBe(1);
  });
});

describe("employee summary", () => {
  it("returns correct on-time and late counts from history", () => {
    const store = createInitialStore();
    store.attendanceHistory = [
      { id: "a1", day: "Kemarin", status: "Tepat waktu", time: "08:03", method: "QR" },
      { id: "a2", day: "Senin", status: "Terlambat", time: "09:15", method: "GPS" },
      { id: "a3", day: "Minggu lalu", status: "Tepat waktu", time: "07:58", method: "QR" }
    ];

    const summary = computeEmployeeSummary(store, "usr-employee-01");

    expect(summary.onTimeDays).toBe(2);
    expect(summary.lateDays).toBe(1);
    expect(summary.totalDays).toBe(3);
  });

  it("returns correct attendance state for the user", () => {
    const store = createInitialStore();
    store.attendance["usr-employee-01"] = {
      userId: "usr-employee-01",
      state: "checked_in",
      checkInAt: "2026-04-30T08:03:00.000Z",
      checkInMethod: "QR"
    };

    const summary = computeEmployeeSummary(store, "usr-employee-01");

    expect(summary.currentAttendanceState).toBe("checked_in");
  });

  it("counts only pending requests belonging to the user", () => {
    const store = createInitialStore();
    const summary = computeEmployeeSummary(store, "usr-employee-01");

    expect(summary.pendingRequests).toBe(1);
  });

  it("returns idle state for unknown user", () => {
    const store = createInitialStore();
    const summary = computeEmployeeSummary(store, "usr-unknown-99");

    expect(summary.currentAttendanceState).toBe("idle");
    expect(summary.pendingRequests).toBe(0);
  });
});
