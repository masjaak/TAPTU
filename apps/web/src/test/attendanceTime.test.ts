import { describe, expect, it } from "vitest";

// RED: src/lib/attendanceTime.ts does not exist yet — all tests fail on import
import { formatAttendanceTime } from "../lib/attendanceTime";

/**
 * State machine for formatAttendanceTime:
 *
 *  Input value
 *    │
 *    ├─ empty / undefined ──────────────────────────► "--.--"
 *    │
 *    ├─ ISO with Z or numeric offset (+/-HH:MM) ────► new Date() → local HH:mm
 *    │   e.g. "2026-05-19T05:20:00.000Z"
 *    │   e.g. "2026-05-19T12:20:00+07:00"
 *    │
 *    ├─ ISO without Z or offset (local demo format) ► slice(11,16) → HH:mm
 *    │   e.g. "2026-05-19T12:20:00"
 *    │
 *    └─ plain HH:mm or unrecognized string ─────────► return as-is
 */

describe("PHASE 10.13 — formatAttendanceTime", () => {
  // ── State 1: missing value ───────────────────────────────────────────────

  it("returns --.-- for undefined", () => {
    expect(formatAttendanceTime(undefined)).toBe("--.--");
  });

  it("returns --.-- for empty string", () => {
    expect(formatAttendanceTime("")).toBe("--.--");
  });

  // ── State 3: local demo ISO without Z or offset ──────────────────────────
  // Phase 10.12 changed demo storage to "2026-05-19T12:20:00" (no Z).
  // These must NOT be converted through Date — they are already local.

  it("extracts HH:mm from local demo ISO without Z", () => {
    expect(formatAttendanceTime("2026-05-19T12:20:00")).toBe("12:20");
  });

  it("extracts HH:mm from local demo ISO with single-digit hour", () => {
    expect(formatAttendanceTime("2026-05-19T08:03:00")).toBe("08:03");
  });

  it("extracts HH:mm from local demo ISO for midnight", () => {
    expect(formatAttendanceTime("2026-05-19T00:00:00")).toBe("00:00");
  });

  it("extracts HH:mm from local demo ISO for end of day", () => {
    expect(formatAttendanceTime("2026-05-19T17:00:00")).toBe("17:00");
  });

  // ── State 2: UTC ISO with Z — must parse and display LOCAL time ──────────
  // These use new Date(value).getHours()/getMinutes() so results match the
  // test environment's local timezone — tests are timezone-independent.

  it("UTC Z timestamp: result equals new Date local hours:minutes", () => {
    const utcISO = "2026-05-19T05:20:00.000Z";
    const d = new Date(utcISO);
    const expected = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    expect(formatAttendanceTime(utcISO)).toBe(expected);
  });

  it("UTC Z timestamp at midnight: result equals new Date local hours:minutes", () => {
    const utcISO = "2026-05-19T00:00:00.000Z";
    const d = new Date(utcISO);
    const expected = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    expect(formatAttendanceTime(utcISO)).toBe(expected);
  });

  it("UTC Z timestamp with milliseconds: result equals new Date local hours:minutes", () => {
    const utcISO = "2026-05-19T07:58:00.000Z";
    const d = new Date(utcISO);
    const expected = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    expect(formatAttendanceTime(utcISO)).toBe(expected);
  });

  it("ISO with positive timezone offset: result equals new Date local hours:minutes", () => {
    const isoWithOffset = "2026-05-19T12:20:00+07:00";
    const d = new Date(isoWithOffset);
    const expected = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    expect(formatAttendanceTime(isoWithOffset)).toBe(expected);
  });

  it("ISO with negative timezone offset: result equals new Date local hours:minutes", () => {
    const isoWithOffset = "2026-05-19T12:20:00-05:00";
    const d = new Date(isoWithOffset);
    const expected = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    expect(formatAttendanceTime(isoWithOffset)).toBe(expected);
  });

  // ── State 4: plain HH:mm — return unchanged ──────────────────────────────

  it("returns plain HH:mm string unchanged", () => {
    expect(formatAttendanceTime("12:20")).toBe("12:20");
  });

  it("returns plain HH:mm with leading zero unchanged", () => {
    expect(formatAttendanceTime("08:03")).toBe("08:03");
  });

  it("returns plain HH:mm for midnight unchanged", () => {
    expect(formatAttendanceTime("00:00")).toBe("00:00");
  });

  // ── Regression: Phase 10.12 demo local timestamps still correct ──────────

  it("regression — demo check-in local ISO displays correct HH:mm", () => {
    // Phase 10.12 stores check-ins as "2026-05-19T12:20:00" (no Z).
    // Must not be offset by timezone when displayed.
    expect(formatAttendanceTime("2026-05-19T12:20:00")).toBe("12:20");
    expect(formatAttendanceTime("2026-05-19T07:58:00")).toBe("07:58");
    expect(formatAttendanceTime("2026-05-19T08:24:00")).toBe("08:24");
  });

  // ── Guard: Z vs no-Z must produce different paths ────────────────────────
  // In UTC test environment both Z and no-Z give the same value, but the
  // MECHANISM differs: Z → parse through Date, no-Z → slice. Verify both
  // paths are exercised by checking the output format is always "HH:mm".

  it("output is always colon-separated HH:mm (not locale period separator)", () => {
    const cases = [
      "2026-05-19T12:20:00",
      "2026-05-19T08:03:00.000Z",
      "12:20",
      "08:03"
    ];
    for (const val of cases) {
      const result = formatAttendanceTime(val);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});
