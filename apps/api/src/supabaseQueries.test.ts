import { describe, expect, it } from "vitest";

import type { AttendanceRecord } from "./domain";
import type { SupabaseAdmin } from "./supabase";
import {
  supabaseBuildAttendanceReportRows,
  supabaseCreateCheckInRecord,
  supabaseGetAttendanceHistory,
  supabaseUpdateCheckOutRecord
} from "./supabaseQueries";

function createCheckedInRecord(): AttendanceRecord {
  return {
    id: "att-real-01",
    userId: "usr-employee-01",
    shiftId: "shift-pagi",
    shiftName: "Shift Pagi",
    shiftStartTime: "08:00",
    shiftEndTime: "17:00",
    locationId: "loc-hq",
    locationName: "Kantor Pusat",
    state: "checked_in",
    status: "Tepat waktu",
    checkInAt: "2026-05-11T01:03:00.000Z",
    checkInMethod: "Selfie",
    locationLat: -6.2088,
    locationLng: 106.8456,
    validationStatus: "needs_review",
    validationReasons: ["Penyimpanan selfie belum tersedia."],
    deviceId: "device-01",
    createdAt: "2026-05-11T01:03:00.000Z",
    updatedAt: "2026-05-11T01:03:00.000Z"
  };
}

describe("Supabase attendance queries", () => {
  it("persists check-in method and nullable selfie fields in attendance_records", async () => {
    let upsertPayload: Record<string, unknown> | null = null;
    const sb = {
      from(table: string) {
        expect(table).toBe("attendance_records");
        return {
          insert(payload: Record<string, unknown>) {
            upsertPayload = payload;
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: "att-real-01",
                        ...payload,
                        shift_id: "shift-pagi",
                        created_at: "2026-05-11T01:03:00.000Z",
                        updated_at: "2026-05-11T01:03:00.000Z"
                      },
                      error: null
                    };
                  }
                };
              }
            };
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const persisted = await supabaseCreateCheckInRecord(sb, "usr-employee-01", createCheckedInRecord());

    expect(upsertPayload).toMatchObject({
      employee_id: "usr-employee-01",
      state: "checked_in",
      check_in_method: "Selfie",
      check_out_method: null,
      selfie_url: null,
      validation_reasons: ["Penyimpanan selfie belum tersedia."]
    });
    expect(persisted.state).toBe("checked_in");
    expect(persisted.checkInMethod).toBe("Selfie");
  });

  it("updates check-out on the active attendance_records row instead of creating another row", async () => {
    let updatePayload: Record<string, unknown> | null = null;
    let updatedId: string | null = null;
    const checkedOutRecord: AttendanceRecord = {
      ...createCheckedInRecord(),
      id: "att-real-01",
      state: "checked_out",
      status: "Selesai",
      checkOutAt: "2026-05-11T10:05:00.000Z",
      checkOutMethod: "Manual",
      updatedAt: "2026-05-11T10:05:00.000Z"
    };
    const sb = {
      from(table: string) {
        expect(table).toBe("attendance_records");
        return {
          update(payload: Record<string, unknown>) {
            updatePayload = payload;
            return {
              eq(column: string, value: string) {
                expect(column).toBe("id");
                updatedId = value;
                return {
                  select() {
                    return {
                      async single() {
                        return {
                          data: {
                            id: "att-real-01",
                            employee_id: "usr-employee-01",
                            attendance_date: "2026-05-11",
                            shift_id: "shift-pagi",
                            state: "checked_out",
                            status: "Selesai",
                            check_in_time: "2026-05-11T01:03:00.000Z",
                            check_in_method: "Selfie",
                            check_out_time: "2026-05-11T10:05:00.000Z",
                            check_out_method: "Manual",
                            location_id: null,
                            location_lat: -6.2088,
                            location_lng: 106.8456,
                            validation_status: "verified",
                            validation_reasons: [],
                            selfie_url: null,
                            device_id: "device-01",
                            scanner_token_id: null,
                            created_at: "2026-05-11T01:03:00.000Z",
                            updated_at: "2026-05-11T10:05:00.000Z"
                          },
                          error: null
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const persisted = await supabaseUpdateCheckOutRecord(sb, "att-real-01", checkedOutRecord);

    expect(updatedId).toBe("att-real-01");
    expect(updatePayload).toMatchObject({
      state: "checked_out",
      status: "Selesai",
      check_in_time: "2026-05-11T01:03:00.000Z",
      check_out_time: "2026-05-11T10:05:00.000Z",
      check_out_method: "Manual"
    });
    expect(persisted.id).toBe("att-real-01");
    expect(persisted.state).toBe("checked_out");
    expect(persisted.checkOutAt).toBe("2026-05-11T10:05:00.000Z");
  });

  it("returns employee history with check-out, duration, location, and issue filtering from attendance_records", async () => {
    const sb = {
      from(table: string) {
        expect(table).toBe("attendance_records");
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return Promise.resolve({
              data: [
                {
                  id: "att-ok",
                  attendance_date: "2026-05-11",
                  state: "checked_out",
                  status: "Selesai",
                  check_in_time: "2026-05-11T01:03:00.000Z",
                  check_out_time: "2026-05-11T10:05:00.000Z",
                  check_in_method: "Selfie",
                  validation_status: "verified",
                  work_locations: { name: "Kantor Pusat" }
                },
                {
                  id: "att-review",
                  attendance_date: "2026-05-10",
                  state: "checked_in",
                  status: "Terlambat",
                  check_in_time: "2026-05-10T01:35:00.000Z",
                  check_out_time: null,
                  check_in_method: "GPS",
                  validation_status: "needs_review",
                  work_locations: { name: "Gudang Timur" }
                }
              ],
              error: null
            });
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const all = await supabaseGetAttendanceHistory(sb, "usr-employee-01", "all");
    const issue = await supabaseGetAttendanceHistory(sb, "usr-employee-01", "issue");

    expect(all[0]).toMatchObject({
      id: "att-ok",
      checkInTime: "2026-05-11T01:03:00.000Z",
      checkOutTime: "2026-05-11T10:05:00.000Z",
      duration: "9j 02m",
      locationName: "Kantor Pusat"
    });
    expect(issue).toHaveLength(1);
    expect(issue[0]).toMatchObject({ id: "att-review", locationName: "Gudang Timur" });
  });

  it("builds HR report rows from Supabase attendance_records", () => {
    const rows = supabaseBuildAttendanceReportRows([
      {
        id: "att-real-01",
        employee_id: "usr-employee-01",
        attendance_date: "2026-05-11",
        shift_id: "shift-pagi",
        status: "Selesai",
        state: "checked_out",
        check_in_time: "2026-05-11T01:03:00.000Z",
        check_out_time: "2026-05-11T10:05:00.000Z",
        validation_status: "verified",
        validation_reasons: [],
        location_lat: -6.2088,
        location_lng: 106.8456,
        selfie_url: null,
        device_id: "device-01",
        profiles: { full_name: "Fikri Maulana" },
        work_locations: { name: "Kantor Pusat" }
      }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "att-real-01",
      employeeName: "Fikri Maulana",
      employeeId: "usr-employee-01",
      date: "2026-05-11",
      shiftName: "shift-pagi",
      workLocationName: "Kantor Pusat",
      status: "Selesai",
      checkInTime: "2026-05-11T01:03:00.000Z",
      checkOutTime: "2026-05-11T10:05:00.000Z",
      selfieProof: false,
      deviceValidated: true
    });
  });
});
