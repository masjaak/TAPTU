import { describe, expect, it } from "vitest";

import type { AttendanceRecord } from "./domain";
import type { SupabaseAdmin } from "./supabase";
import { supabaseBuildAttendanceReportRows, supabaseUpsertAttendance } from "./supabaseQueries";

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
          upsert(payload: Record<string, unknown>) {
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

    const persisted = await supabaseUpsertAttendance(sb, "usr-employee-01", createCheckedInRecord());

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
