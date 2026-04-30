import { describe, expect, it } from "vitest";

import { createInitialStore, filterAttendanceHistory, reduceAttendance, reduceRequests, refreshScannerToken } from "./domain";

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
