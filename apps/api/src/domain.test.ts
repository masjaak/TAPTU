import { describe, expect, it } from "vitest";

import {
  appendScannerAttempt,
  calculateDistanceMeters,
  computeAdminOverview,
  computeEmployeeSummary,
  createAttendanceException,
  createAuditLog,
  createCheckInRecord,
  createInitialStore,
  filterAttendanceHistory,
  generateScannerToken,
  reduceAttendance,
  reduceExceptionReview,
  reduceRequests,
  refreshScannerToken,
  updateCheckOutRecord,
  validateAttendanceSubmission,
  validateScannerToken
} from "./domain";

function createIdleRecord() {
  return {
    id: "att-1",
    userId: "usr-employee-01",
    shiftId: "shift-pagi",
    shiftName: "Shift Pagi",
    shiftStartTime: "08:00",
    shiftEndTime: "17:00",
    locationId: "loc-hq",
    locationName: "Kantor Pusat",
    state: "idle" as const,
    status: "Belum check-in" as const,
    validationStatus: "verified" as const,
    validationReasons: [],
    createdAt: "2026-04-30T07:00:00.000Z",
    updatedAt: "2026-04-30T07:00:00.000Z"
  };
}

describe("attendance state machine", () => {
  it("moves from idle to checked_in", () => {
    const next = reduceAttendance(createIdleRecord(), {
      type: "CHECK_IN",
      method: "QR",
      at: "2026-04-30T08:03:00.000Z",
      deviceId: "ios-1",
      scannerTokenId: "scanner-default"
    });

    expect(next.state).toBe("checked_in");
    expect(next.checkInMethod).toBe("QR");
    expect(next.status).toBe("Tepat waktu");
    expect(next.deviceId).toBe("ios-1");
    expect(next.scannerTokenId).toBe("scanner-default");
  });

  it("rejects checkout before checkin", () => {
    const next = reduceAttendance(createIdleRecord(), {
      type: "CHECK_OUT",
      method: "QR",
      at: "2026-04-30T17:01:00.000Z"
    });

    expect(next.state).toBe("idle");
    expect(next.checkOutAt).toBeUndefined();
  });

  it("creates late check-in records with validation metadata", () => {
    const current = createInitialStore().attendance["usr-employee-03"];
    const next = createCheckInRecord(current, {
      type: "CHECK_IN",
      method: "GPS",
      at: "2026-05-02T08:24:00.000Z",
      locationLat: -6.2004,
      locationLng: 106.8169,
      validationStatus: "needs_review",
      validationReasons: ["Di luar radius lokasi kerja."],
      selfieUrl: "placeholder://selfie",
      deviceId: "android-ops-03"
    });

    expect(next.state).toBe("checked_in");
    expect(next.status).toBe("Terlambat");
    expect(next.validationStatus).toBe("needs_review");
    expect(next.validationReasons).toContain("Di luar radius lokasi kerja.");
    expect(next.selfieUrl).toBe("placeholder://selfie");
  });

  it("updates check-out while preserving validation context", () => {
    const current = createInitialStore().attendance["usr-employee-01"];
    const next = updateCheckOutRecord(current, {
      type: "CHECK_OUT",
      method: "Selfie",
      at: "2026-05-02T17:06:00.000Z"
    });

    expect(next.state).toBe("checked_out");
    expect(next.status).toBe("Selesai");
    expect(next.checkOutMethod).toBe("Selfie");
    expect(next.validationStatus).toBe("verified");
  });
});

describe("validation logic", () => {
  it("returns verified when inside geofence and selfie is present", () => {
    const result = validateAttendanceSubmission({
      locationLat: -6.2088,
      locationLng: 106.8456,
      selfieUrl: "placeholder://selfie",
      deviceId: "ios-15pm-demo",
      previousDeviceId: "ios-15pm-demo",
      requiredSelfie: true,
      location: createInitialStore().workLocations[0],
      now: "2026-05-02T08:03:00.000Z"
    });

    expect(result.status).toBe("verified");
    expect(result.reasons).toHaveLength(0);
  });

  it("creates a needs_review result when outside radius", () => {
    const result = validateAttendanceSubmission({
      locationLat: -6.206,
      locationLng: 106.851,
      location: createInitialStore().workLocations[0],
      now: "2026-05-02T08:24:00.000Z"
    });

    expect(result.status).toBe("needs_review");
    expect(result.exceptionType).toBe("Outside radius");
    expect(result.reasons[0]).toContain("Di luar radius lokasi kerja");
  });

  it("flags missing selfie and device mismatch", () => {
    const result = validateAttendanceSubmission({
      locationLat: -6.2088,
      locationLng: 106.8456,
      requiredSelfie: true,
      deviceId: "device-new",
      previousDeviceId: "device-old",
      location: createInitialStore().workLocations[0],
      now: "2026-05-02T08:24:00.000Z"
    });

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("Selfie wajib belum dilampirkan.");
    expect(result.reasons).toContain("Perangkat berbeda dari riwayat sebelumnya.");
  });
});

describe("scanner token", () => {
  it("generates a token in HDR format", () => {
    expect(generateScannerToken()).toMatch(/^HDR-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
  });

  it("validates active matching tokens", () => {
    const scanner = createInitialStore().scanner;
    expect(validateScannerToken(scanner, scanner.token).valid).toBe(true);
  });

  it("rejects expired tokens", () => {
    const scanner = { ...createInitialStore().scanner, expiresAt: "2020-01-01T00:00:00.000Z" };
    const result = validateScannerToken(scanner, scanner.token);

    expect(result.valid).toBe(false);
    expect(result.exceptionType).toBe("Expired QR");
  });

  it("refreshes token and resets expiry", () => {
    const next = refreshScannerToken(createInitialStore().scanner);

    expect(next.token).not.toBe("HDR-31A-7XZ");
    expect(next.status).toBe("active");
  });

  it("records scanner attempts", () => {
    const scanner = appendScannerAttempt(createInitialStore().scanner, {
      id: "scan-x",
      employeeName: "Fikri Maulana",
      status: "success",
      detail: "QR valid",
      createdAt: "2026-05-02T08:33:00.000Z"
    });

    expect(scanner.scansToday).toBeGreaterThan(124);
    expect(scanner.recentScans[0]?.id).toBe("scan-x");
  });
});

describe("request state machine", () => {
  it("creates new pending request", () => {
    const next = reduceRequests([], {
      type: "CREATE",
      request: {
        id: "req-777",
        userId: "usr-employee-01",
        category: "Attendance Correction",
        startDate: "2026-05-05",
        endDate: "2026-05-06",
        title: "Koreksi absensi",
        detail: "Butuh koreksi 2 hari.",
        status: "Menunggu",
        createdAt: "2026-04-30T10:00:00.000Z"
      }
    });

    expect(next).toHaveLength(1);
    expect(next[0].status).toBe("Menunggu");
  });

  it("allows manager to approve operational request types only", () => {
    const next = reduceRequests(createInitialStore().requests, {
      type: "APPROVE",
      id: "req-001",
      actorRole: "manager",
      adminNote: "Valid untuk operasional tim.",
      reviewedBy: "Raka Saputra",
      reviewedAt: "2026-05-02T10:00:00.000Z"
    });

    expect(next[0].status).toBe("Disetujui");
    expect(next[0].adminNote).toContain("operasional");
  });

  it("keeps non-operational requests pending for manager", () => {
    const requests = [
      {
        id: "req-cuti",
        userId: "usr-employee-01",
        category: "Cuti" as const,
        startDate: "2026-05-05",
        endDate: "2026-05-06",
        title: "Cuti tahunan",
        detail: "Cuti 2 hari.",
        status: "Menunggu" as const,
        createdAt: "2026-05-02T10:00:00.000Z"
      }
    ];

    const next = reduceRequests(requests, {
      type: "APPROVE",
      id: "req-cuti",
      actorRole: "manager"
    });

    expect(next[0].status).toBe("Menunggu");
  });
});

describe("exceptions and audit", () => {
  it("creates attendance exceptions", () => {
    const record = createInitialStore().attendance["usr-employee-02"];
    const exception = createAttendanceException(record, "usr-employee-02", "Outside radius", "Di luar radius lokasi kerja.");

    expect(exception.status).toBe("Need Review");
    expect(exception.exceptionType).toBe("Outside radius");
  });

  it("updates exception review state", () => {
    const next = reduceExceptionReview(createInitialStore().exceptions, {
      id: "exc-001",
      status: "Approved",
      actorName: "Nadia Putri",
      actorRole: "admin",
      adminNote: "Lokasi masih bisa diterima untuk hari ini.",
      reviewedAt: "2026-05-02T10:00:00.000Z"
    });

    expect(next[0].status).toBe("Approved");
    expect(next[0].reviewedBy).toBe("Nadia Putri");
  });

  it("creates audit log records", () => {
    const log = createAuditLog("exception_approved", "Nadia Putri", "admin", "exc-001", "Approved after supervisor confirmation.");

    expect(log.action).toBe("exception_approved");
    expect(log.targetId).toBe("exc-001");
  });
});

describe("overview and summary", () => {
  it("returns dashboard counts including exceptions", () => {
    const overview = computeAdminOverview(createInitialStore(), 4, {
      "usr-employee-01": "Fikri Maulana",
      "usr-employee-02": "Anisa Rahma"
    });

    expect(overview.checkedInToday).toBe(2);
    expect(overview.exceptionCount).toBe(2);
    expect(overview.recentActivity[0]?.employeeName).toBe("Anisa Rahma");
  });

  it("returns employee summary with today validation fields", () => {
    const summary = computeEmployeeSummary(createInitialStore(), "usr-employee-01");

    expect(summary.currentAttendanceState).toBe("checked_in");
    expect(summary.assignedShift.name).toBe("Shift Pagi");
    expect(summary.todayRecord.validationStatus).toBe("verified");
  });
});

describe("helpers", () => {
  it("filters issue attendance rows", () => {
    const filtered = filterAttendanceHistory(createInitialStore().attendanceHistory, "issue");
    expect(filtered).toHaveLength(1);
  });

  it("calculates location distance in meters", () => {
    expect(calculateDistanceMeters({ latitude: -6.2088, longitude: 106.8456 }, { latitude: -6.2088, longitude: 106.8456 })).toBe(0);
  });
});
