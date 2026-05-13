import { describe, expect, it } from "vitest";

import type { AttendanceRecord } from "./domain";
import type { SupabaseAdmin } from "./supabase";
import {
  approveRequestStep,
  createEmployeeRequest,
  rejectRequestStep,
  supabaseBuildAttendanceReportRows,
  supabaseCreateCheckInRecord,
  supabaseCreateRequest,
  supabaseGetAttendanceHistory,
  supabaseGetEmployeeList,
  supabaseGetManagerEmployeeList,
  supabaseGetManagerExceptions,
  supabaseGetManagerOverview,
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

describe("Supabase manager-scoped data access", () => {
  it("manager employee list returns only employees assigned to the manager", async () => {
    const filters: Array<[string, unknown]> = [];
    const inFilters: Array<[string, unknown[]]> = [];
    const sb = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select() {
              return this;
            },
            eq(column: string, value: unknown) {
              filters.push([column, value]);
              return this;
            },
            in(column: string, values: unknown[]) {
              inFilters.push([column, values]);
              return Promise.resolve({
                data: [
                  {
                    id: "usr-employee-01",
                    full_name: "Fikri Maulana",
                    email: "fikri@taptu.app",
                    role: "employee",
                    department_id: null,
                    manager_id: "usr-manager-01",
                    position: null,
                    employee_code: null,
                    departments: null,
                    manager: { full_name: "Raka Saputra" }
                  }
                ],
                error: null
              });
            }
          };
        }

        expect(table).toBe("attendance_records");
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in(column: string, values: unknown[]) {
            expect(column).toBe("employee_id");
            expect(values).toEqual(["usr-employee-01"]);
            return Promise.resolve({
              data: [
                {
                  employee_id: "usr-employee-01",
                  state: "checked_in",
                  status: "Tepat waktu",
                  check_in_time: "2026-05-12T01:03:00.000Z",
                  validation_status: "verified",
                  shift_id: "shift-pagi",
                  work_locations: { name: "Kantor Pusat" }
                }
              ],
              error: null
            });
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const result = await supabaseGetManagerEmployeeList(sb, "org-01", "usr-manager-01");

    expect(filters).toContainEqual(["organization_id", "org-01"]);
    expect(filters).toContainEqual(["manager_id", "usr-manager-01"]);
    expect(inFilters).toContainEqual(["role", ["employee"]]);
    expect(result.map((employee) => employee.id)).toEqual(["usr-employee-01"]);
  });

  it("admin employee list remains organization-wide", async () => {
    const filters: Array<[string, unknown]> = [];
    const sb = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select() {
              return this;
            },
            eq(column: string, value: unknown) {
              filters.push([column, value]);
              return this;
            },
            in() {
              return Promise.resolve({
                data: [
                  {
                    id: "usr-employee-01",
                    full_name: "Fikri Maulana",
                    email: "fikri@taptu.app",
                    role: "employee",
                    manager_id: "usr-manager-01"
                  },
                  {
                    id: "usr-manager-01",
                    full_name: "Raka Saputra",
                    email: "manager@taptu.app",
                    role: "manager",
                    manager_id: null
                  }
                ],
                error: null
              });
            }
          };
        }

        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in() {
            return Promise.resolve({ data: [], error: null });
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const result = await supabaseGetEmployeeList(sb, "org-01");

    expect(filters).toContainEqual(["organization_id", "org-01"]);
    expect(filters).not.toContainEqual(["manager_id", "usr-manager-01"]);
    expect(result.map((employee) => employee.id)).toEqual(["usr-employee-01", "usr-manager-01"]);
  });

  it("manager exceptions are scoped to employees assigned to the manager", async () => {
    const sb = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select() {
              return this;
            },
            eq(column: string, value: unknown) {
              expect([["organization_id", "org-01"], ["manager_id", "usr-manager-01"]]).toContainEqual([column, value]);
              return this;
            },
            in(column: string, values: unknown[]) {
              expect(column).toBe("role");
              expect(values).toEqual(["employee"]);
              return Promise.resolve({
                data: [{ id: "usr-employee-01", full_name: "Fikri Maulana" }],
                error: null
              });
            }
          };
        }

        expect(table).toBe("attendance_exceptions");
        return {
          select() {
            return this;
          },
          in(column: string, values: unknown[]) {
            expect(column).toBe("employee_id");
            expect(values).toEqual(["usr-employee-01"]);
            return this;
          },
          order() {
            return Promise.resolve({
              data: [
                {
                  id: "exc-01",
                  attendance_record_id: "att-01",
                  employee_id: "usr-employee-01",
                  exception_type: "Outside radius",
                  reason: "Outside office radius.",
                  status: "Need Review",
                  created_at: "2026-05-12T08:00:00.000Z"
                }
              ],
              error: null
            });
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const result = await supabaseGetManagerExceptions(sb, "org-01", "usr-manager-01");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ employeeId: "usr-employee-01", employeeName: "Fikri Maulana" });
  });

  it("manager overview uses manager-scoped employee ids instead of org-wide admin data", async () => {
    const tables: string[] = [];
    const sb = {
      from(table: string) {
        tables.push(table);
        if (table === "profiles") {
          return {
            select() {
              return this;
            },
            eq(column: string, value: unknown) {
              expect([["organization_id", "org-01"], ["manager_id", "usr-manager-01"]]).toContainEqual([column, value]);
              return this;
            },
            in(column: string, values: unknown[]) {
              expect(column).toBe("role");
              expect(values).toEqual(["employee"]);
              return Promise.resolve({
                data: [
                  { id: "usr-employee-01", full_name: "Fikri Maulana" },
                  { id: "usr-employee-02", full_name: "Anisa Rahma" }
                ],
                error: null
              });
            }
          };
        }

        if (table === "attendance_records") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            in(column: string, values: unknown[]) {
              expect(column).toBe("employee_id");
              expect(values).toEqual(["usr-employee-01", "usr-employee-02"]);
              return Promise.resolve({
                data: [
                  {
                    employee_id: "usr-employee-01",
                    state: "checked_in",
                    status: "Tepat waktu",
                    check_in_time: "2026-05-12T01:03:00.000Z",
                    validation_status: "verified",
                    validation_reasons: []
                  }
                ],
                error: null
              });
            }
          };
        }

        if (table === "approval_requests") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            in(column: string, values: unknown[]) {
              expect(column).toBe("employee_id");
              expect(values).toEqual(["usr-employee-01", "usr-employee-02"]);
              return Promise.resolve({ count: 1, error: null });
            }
          };
        }

        expect(table).toBe("attendance_exceptions");
        return {
          select() {
            return this;
          },
          in(column: string, values: unknown[]) {
            if (column === "employee_id") {
              expect(values).toEqual(["usr-employee-01", "usr-employee-02"]);
            }
            if (column === "status") {
              expect(values).toEqual(["Need Review", "Request Correction"]);
              return Promise.resolve({ count: 1, error: null });
            }
            return this;
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const overview = await supabaseGetManagerOverview(sb, "org-01", "usr-manager-01");

    expect(tables).not.toEqual(["profiles"]);
    expect(overview).toMatchObject({
      totalEmployees: 2,
      checkedInToday: 1,
      pendingRequests: 1,
      exceptionCount: 1
    });
  });
});

describe("Supabase request approvals", () => {
  it("creates assigned manager and HR approval_steps for new approval_requests", async () => {
    const insertedSteps: Array<Record<string, unknown>> = [];
    const sb = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return { data: { manager_id: "usr-manager-01" }, error: null };
                    }
                  };
                }
              };
            }
          };
        }

        if (table === "approval_requests") {
          return {
            insert(payload: Record<string, unknown>) {
              expect(payload).toMatchObject({
                employee_id: "usr-employee-01",
                request_type: "Cuti",
                status: "Menunggu",
                current_step: 1
              });
              return {
                select() {
                  return {
                    async single() {
                      return {
                        data: {
                          id: "req-777",
                          ...payload,
                          created_at: "2026-05-12T08:00:00.000Z"
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

        expect(table).toBe("approval_steps");
        return {
          insert(payload: Array<Record<string, unknown>>) {
            insertedSteps.push(...payload);
            return Promise.resolve({ error: null });
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const created = await createEmployeeRequest(sb, "usr-employee-01", {
      category: "Cuti",
      startDate: "2026-05-14",
      endDate: "2026-05-15",
      title: "Cuti tahunan",
      detail: "Cuti dua hari."
    });

    expect(created.id).toBe("req-777");
    expect(insertedSteps).toEqual([
      {
        request_id: "req-777",
        step_order: 1,
        approver_role: "manager",
        approver_id: "usr-manager-01",
        status: "pending"
      },
      {
        request_id: "req-777",
        step_order: 2,
        approver_role: "hr",
        approver_id: null,
        status: "pending"
      }
    ]);
  });

  it("manager approval advances request to HR without finalizing", async () => {
    const updatedSteps: Array<Record<string, unknown>> = [];
    const updatedRequests: Array<Record<string, unknown>> = [];
    const sb = {
      from(table: string) {
        if (table === "approval_requests") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async single() {
                      return {
                        data: {
                          id: "req-777",
                          employee_id: "usr-employee-01",
                          request_type: "Cuti",
                          start_date: "2026-05-14",
                          end_date: "2026-05-15",
                          title: "Cuti tahunan",
                          reason: "Cuti dua hari.",
                          status: "Menunggu",
                          current_step: 1,
                          final_status: "pending",
                          created_at: "2026-05-12T08:00:00.000Z",
                          profiles: { full_name: "Fikri Maulana" }
                        },
                        error: null
                      };
                    }
                  };
                }
              };
            },
            update(payload: Record<string, unknown>) {
              updatedRequests.push(payload);
              return {
                eq() {
                  return {
                    select() {
                      return {
                        async single() {
                          return {
                            data: {
                              id: "req-777",
                              employee_id: "usr-employee-01",
                              request_type: "Cuti",
                              start_date: "2026-05-14",
                              end_date: "2026-05-15",
                              title: "Cuti tahunan",
                              reason: "Cuti dua hari.",
                              status: "Menunggu",
                              current_step: 2,
                              final_status: "pending",
                              created_at: "2026-05-12T08:00:00.000Z",
                              profiles: { full_name: "Fikri Maulana" }
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

        expect(table).toBe("approval_steps");
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return Promise.resolve({
                      data: [
                        { id: "step-manager", request_id: "req-777", step_order: 1, approver_role: "manager", approver_id: "usr-manager-01", status: "pending", note: null, reviewed_at: null },
                        { id: "step-hr", request_id: "req-777", step_order: 2, approver_role: "hr", approver_id: null, status: "pending", note: null, reviewed_at: null }
                      ],
                      error: null
                    });
                  }
                };
              }
            };
          },
          update(payload: Record<string, unknown>) {
            updatedSteps.push(payload);
            return {
              eq() {
                return {
                  async select() {
                    return { data: [], error: null };
                  }
                };
              }
            };
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const result = await approveRequestStep(sb, "req-777", {
      id: "usr-manager-01",
      role: "manager",
      note: "Approved by manager",
      reviewedAt: "2026-05-12T09:00:00.000Z"
    });

    expect(result?.status).toBe("Menunggu");
    expect(result?.workflowStatus).toBe("pending_hr");
    expect(updatedSteps[0]).toMatchObject({ status: "approved", note: "Approved by manager" });
    expect(updatedRequests[0]).toMatchObject({ status: "Menunggu", current_step: 2, final_status: "pending" });
  });

  it("HR approval finalizes a request after manager approval", async () => {
    const updatedRequests: Array<Record<string, unknown>> = [];
    const sb = {
      from(table: string) {
        if (table === "approval_requests") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async single() {
                      return {
                        data: {
                          id: "req-777",
                          employee_id: "usr-employee-01",
                          request_type: "Cuti",
                          start_date: "2026-05-14",
                          end_date: "2026-05-15",
                          title: "Cuti tahunan",
                          reason: "Cuti dua hari.",
                          status: "Menunggu",
                          current_step: 2,
                          final_status: "pending",
                          created_at: "2026-05-12T08:00:00.000Z",
                          profiles: { full_name: "Fikri Maulana" }
                        },
                        error: null
                      };
                    }
                  };
                }
              };
            },
            update(payload: Record<string, unknown>) {
              updatedRequests.push(payload);
              return {
                eq() {
                  return {
                    select() {
                      return {
                        async single() {
                          return {
                            data: {
                              id: "req-777",
                              employee_id: "usr-employee-01",
                              request_type: "Cuti",
                              start_date: "2026-05-14",
                              end_date: "2026-05-15",
                              title: "Cuti tahunan",
                              reason: "Cuti dua hari.",
                              status: "Disetujui",
                              current_step: 2,
                              final_status: "approved",
                              completed_at: "2026-05-12T10:00:00.000Z",
                              created_at: "2026-05-12T08:00:00.000Z",
                              profiles: { full_name: "Fikri Maulana" }
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

        expect(table).toBe("approval_steps");
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return Promise.resolve({
                      data: [
                        { id: "step-manager", request_id: "req-777", step_order: 1, approver_role: "manager", approver_id: "usr-manager-01", status: "approved", note: "OK", reviewed_at: "2026-05-12T09:00:00.000Z" },
                        { id: "step-hr", request_id: "req-777", step_order: 2, approver_role: "hr", approver_id: null, status: "pending", note: null, reviewed_at: null }
                      ],
                      error: null
                    });
                  }
                };
              }
            };
          },
          update() {
            return {
              eq() {
                return {
                  async select() {
                    return { data: [], error: null };
                  }
                };
              }
            };
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const result = await approveRequestStep(sb, "req-777", {
      id: "usr-admin-01",
      role: "admin",
      note: "Final approval",
      reviewedAt: "2026-05-12T10:00:00.000Z"
    });

    expect(result?.status).toBe("Disetujui");
    expect(result?.workflowStatus).toBe("approved");
    expect(updatedRequests[0]).toMatchObject({ status: "Disetujui", final_status: "approved" });
  });

  it("manager rejection finalizes request as rejected", async () => {
    const updatedRequests: Array<Record<string, unknown>> = [];
    const sb = {
      from(table: string) {
        if (table === "approval_requests") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async single() {
                      return {
                        data: {
                          id: "req-777",
                          employee_id: "usr-employee-01",
                          request_type: "Cuti",
                          start_date: "2026-05-14",
                          end_date: "2026-05-15",
                          title: "Cuti tahunan",
                          reason: "Cuti dua hari.",
                          status: "Menunggu",
                          current_step: 1,
                          final_status: "pending",
                          created_at: "2026-05-12T08:00:00.000Z",
                          profiles: { full_name: "Fikri Maulana" }
                        },
                        error: null
                      };
                    }
                  };
                }
              };
            },
            update(payload: Record<string, unknown>) {
              updatedRequests.push(payload);
              return {
                eq() {
                  return {
                    select() {
                      return {
                        async single() {
                          return {
                            data: {
                              id: "req-777",
                              employee_id: "usr-employee-01",
                              request_type: "Cuti",
                              start_date: "2026-05-14",
                              end_date: "2026-05-15",
                              title: "Cuti tahunan",
                              reason: "Cuti dua hari.",
                              status: "Ditolak",
                              current_step: 1,
                              final_status: "rejected",
                              completed_at: "2026-05-12T09:00:00.000Z",
                              created_at: "2026-05-12T08:00:00.000Z",
                              profiles: { full_name: "Fikri Maulana" }
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

        expect(table).toBe("approval_steps");
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return Promise.resolve({
                      data: [
                        { id: "step-manager", request_id: "req-777", step_order: 1, approver_role: "manager", approver_id: "usr-manager-01", status: "pending", note: null, reviewed_at: null },
                        { id: "step-hr", request_id: "req-777", step_order: 2, approver_role: "hr", approver_id: null, status: "pending", note: null, reviewed_at: null }
                      ],
                      error: null
                    });
                  }
                };
              }
            };
          },
          update() {
            return {
              eq() {
                return {
                  async select() {
                    return { data: [], error: null };
                  }
                };
              }
            };
          }
        };
      }
    } as unknown as SupabaseAdmin;

    const result = await rejectRequestStep(sb, "req-777", {
      id: "usr-manager-01",
      role: "manager",
      note: "Rejected by manager",
      reviewedAt: "2026-05-12T09:00:00.000Z"
    });

    expect(result?.status).toBe("Ditolak");
    expect(result?.workflowStatus).toBe("rejected");
    expect(updatedRequests[0]).toMatchObject({ status: "Ditolak", final_status: "rejected" });
  });
});
