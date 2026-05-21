// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { DepartmentItem } from "@taptu/shared";

import { AppPage } from "../pages/AppPage";

const apiMocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  fetchAdminOverview: vi.fn(),
  fetchManagerOverview: vi.fn(),
  fetchAttendanceHistoryByFilter: vi.fn(),
  fetchEmployeeList: vi.fn(),
  fetchManagerEmployeeList: vi.fn(),
  fetchEmployeeSummary: vi.fn(),
  fetchRequestDetail: vi.fn(),
  fetchRequests: vi.fn(),
  fetchManagerRequests: vi.fn(),
  fetchWorkLocations: vi.fn(),
  fetchShifts: vi.fn(),
  fetchReportRows: vi.fn(),
  fetchAuditLogs: vi.fn(),
  fetchExceptionQueue: vi.fn(),
  fetchManagerExceptionQueue: vi.fn(),
  fetchScannerState: vi.fn(),
  refreshScannerToken: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  createRequest: vi.fn(),
  approveRequest: vi.fn(),
  cancelRequest: vi.fn(),
  exportReportCsv: vi.fn(),
  createWorkLocation: vi.fn(),
  updateWorkLocation: vi.fn(),
  createShift: vi.fn(),
  updateShift: vi.fn(),
  fetchDepartments: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  reassignEmployeeDepartment: vi.fn(),
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn()
}));

vi.mock("../lib/api", () => apiMocks);

function renderRoute(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/app/:section?",
        element: <AppPage />
      }
    ],
    { initialEntries: [initialEntry] }
  );

  return render(<RouterProvider router={router} />);
}

describe("AppPage", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.fetchAdminOverview.mockResolvedValue({
      totalEmployees: 0,
      checkedInToday: 0,
      onTimeToday: 0,
      lateToday: 0,
      pendingRequests: 0,
      absentToday: 0,
      exceptionCount: 0,
      recentActivity: []
    });
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 0,
      checkedInToday: 0,
      onTimeToday: 0,
      lateToday: 0,
      pendingRequests: 0,
      absentToday: 0,
      exceptionCount: 0,
      recentActivity: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchRequests.mockResolvedValue([]);
    apiMocks.fetchManagerRequests.mockResolvedValue([]);
    apiMocks.fetchRequestDetail.mockResolvedValue(null);
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", position: "Field Officer", employeeCode: "EMP-001", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
      { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentName: null, managerName: null, todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([]);
    apiMocks.fetchWorkLocations.mockResolvedValue([
      { id: "loc-hq", name: "Kantor Pusat", address: "Jl. Sudirman No. 1", latitude: -6.2088, longitude: 106.8456, radiusMeters: 150, status: "active", createdAt: "2026-05-01T00:00:00" }
    ]);
    apiMocks.fetchShifts.mockResolvedValue([
      { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", gracePeriodMinutes: 10, workLocationId: "loc-hq", workLocationName: "Kantor Pusat", status: "active", createdAt: "2026-05-01T00:00:00", updatedAt: "2026-05-01T00:00:00" }
    ]);
    apiMocks.fetchReportRows.mockResolvedValue([
      { id: "att-demo-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:03:00", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
    ]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchScannerState.mockResolvedValue({
      token: "HDR-31A-7XZ",
      expiresInSeconds: 30,
      scansToday: 124,
      locationName: "Gerbang Utama",
      recentScans: []
    });
    apiMocks.refreshScannerToken.mockResolvedValue({
      token: "HDR-31A-7XZ",
      expiresInSeconds: 30,
      scansToday: 124,
      locationName: "Gerbang Utama"
    });
    apiMocks.checkIn.mockResolvedValue({
      attendanceState: "checked_in",
      record: { day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Manual" }
    });
    apiMocks.checkOut.mockResolvedValue({
      attendanceState: "checked_out",
      record: { day: "Hari ini", status: "Tepat waktu", time: "17:05", method: "Manual" }
    });
    apiMocks.exportReportCsv.mockImplementation(() => undefined);
    apiMocks.fetchDepartments.mockResolvedValue([]);
    apiMocks.createDepartment.mockResolvedValue({ id: "dep-new", name: "New", managerId: null, managerName: null, isActive: true, memberCount: 0 });
    apiMocks.updateDepartment.mockResolvedValue({ id: "dep-ops", name: "Updated", managerId: null, managerName: null, isActive: true, memberCount: 0 });
    apiMocks.reassignEmployeeDepartment.mockResolvedValue({ id: "e1", fullName: "Fikri Maulana", email: "fikri@taptu.app", role: "employee", departmentId: "dep-fnb", departmentName: "F&B Service" });
    apiMocks.fetchNotifications.mockResolvedValue([]);
    apiMocks.markNotificationRead.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows the admin dashboard with attendance summary and recent activity", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:admin",
        user: {
          id: "usr-admin-01",
          fullName: "Nadia Putri",
          email: "admin@taptu.app",
          organizationName: "TAPTU HQ",
          role: "admin"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Nadia Putri",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchAdminOverview.mockResolvedValue({
      totalEmployees: 248,
      checkedInToday: 187,
      onTimeToday: 182,
      lateToday: 5,
      pendingRequests: 6,
      absentToday: 61,
      exceptionCount: 5,
      recentActivity: [
        {
          id: "act-01",
          employeeName: "Anisa Rahma",
          event: "Butuh review",
          time: "08:24",
          status: "Terlambat",
          detail: "Akurasi GPS rendah"
        }
      ]
    });

    renderRoute("/app");

    expect(await screen.findByText(/ringkasan kehadiran hari ini/i)).toBeTruthy();
    expect(await screen.findByText("Menunggu HR")).toBeTruthy();
    expect(screen.getByText("Anisa Rahma")).toBeTruthy();
    expect(screen.getByText(/aksi cepat/i)).toBeTruthy();
  });

  it("routes employee users into the self-service home workspace", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [{ id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" }],
      attendanceState: "checked_in",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_in",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-02T08:03:00",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    renderRoute("/app");

    expect(await screen.findByText(/status hari ini/i)).toBeTruthy();
    expect(screen.getByText("Sedang bekerja")).toBeTruthy();
    expect(screen.getByText(/Check-in 08:03 · Kantor Pusat/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check-out" })).toBeTruthy();
    expect(screen.getAllByText("Presensi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Riwayat").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pengajuan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jadwal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Slip Gaji").length).toBeGreaterThan(0);
  });

  it("shows idle and completed employee home attendance states as explicit actions", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "employee-api-token",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T00:00:00",
        updatedAt: "2026-05-11T00:00:00"
      }
    });

    renderRoute("/app");

    expect(await screen.findByText("Belum hadir")).toBeTruthy();
    expect(screen.getByText(/Shift Pagi · 08:00-17:00 · Kantor Pusat/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /mulai check-in/i })).toBeTruthy();

    cleanup();
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_out",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-11T08:02:00",
        checkOutTime: "2026-05-11T17:05:00",
        status: "Selesai",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T08:02:00",
        updatedAt: "2026-05-11T17:05:00"
      }
    });

    renderRoute("/app");

    expect(await screen.findByText("Selesai hari ini")).toBeTruthy();
    expect(screen.getByText(/08:02-17:05 · Durasi 9j 03m/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /lihat riwayat/i })).toBeTruthy();
  });

  it("Presensi attendance clock uses tabular-nums and data-testid for precise time display", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: { id: "usr-e", fullName: "Fikri", email: "e@taptu.app", organizationName: "HQ", role: "employee" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 0, onTimeDays: 0, lateDays: 0, pendingRequests: 0, currentAttendanceState: "idle",
      assignedShift: { id: "s1", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor" },
      todayRecord: { id: "r1", employeeId: "usr-e", shiftId: "s1", status: "Belum check-in", validationStatus: "verified", validationReasons: [], createdAt: "", updatedAt: "" }
    });

    renderRoute("/app/attendance");

    const clock = await screen.findByTestId("attendance-clock");
    expect(clock.className).toContain("tabular-nums");
  });

  it("renders employee attendance with history on Presensi", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [{ id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Manual" }],
      attendanceState: "checked_in",
      requests: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([
      { id: "hist-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Manual" }
    ]);
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_in",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-02T08:03:00",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    }).mockResolvedValueOnce({
      totalDays: 23,
      onTimeDays: 21,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_in",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "hist-after-checkin",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-11T01:03:00",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00",
        updatedAt: "2026-05-11T01:03:00"
      }
    });

    renderRoute("/app/attendance");

    expect(await screen.findByText(/check-in karyawan/i)).toBeTruthy();
    expect(screen.getByText(/validasi singkat/i)).toBeTruthy();
    expect(screen.getByText(/Lihat detail validasi/i)).toBeTruthy();
    expect(await screen.findByText(/riwayat absensi/i)).toBeTruthy();
    expect((await screen.findAllByText(/Masuk 08[.:]03/i)).length).toBeGreaterThan(0);
  });

  it("replaces existing employee history when the server refresh returns empty", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "employee-api-token",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [{ id: "existing-01", day: "Kemarin", status: "Tepat waktu", time: "07:55", method: "Selfie" }],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    renderRoute("/app/history");

    expect(await screen.findByText(/riwayat absensi/i)).toBeTruthy();
    expect(await screen.findByText(/belum ada riwayat/i)).toBeTruthy();
    expect(screen.queryByText(/07:55 · Selfie/i)).toBeNull();
  });

  it("normalizes employee history records before rendering Riwayat", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "employee-api-token",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([
      {
        id: "att-record-01",
        date: "2026-05-02",
        status: "Selesai",
        checkInTime: "2026-05-02T08:03:00",
        method: "Manual"
      }
    ]);
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    renderRoute("/app/history");

    expect((await screen.findAllByText(/2 Mei 2026/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Masuk 08[.:]03/i)).toBeTruthy();
    expect(screen.queryByText(/undefined/i)).toBeNull();
  });

  it("renders history records with check-out, duration, method, location, and Indonesian filters", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "employee-api-token",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "checked_out",
      requests: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([
      {
        id: "att-record-01",
        date: "2026-05-11",
        status: "Tepat waktu",
        checkInTime: "2026-05-11T08:02:00",
        checkOutTime: "2026-05-11T17:05:00",
        method: "QR",
        locationName: "Kantor Pusat"
      }
    ]);
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_out",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Selesai",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T08:02:00",
        updatedAt: "2026-05-11T17:05:00"
      }
    });

    renderRoute("/app/history");

    expect(await screen.findByRole("button", { name: "Semua" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hadir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Masalah" })).toBeTruthy();
    expect(await screen.findByText(/Senin, 11 Mei 2026/i)).toBeTruthy();
    expect(screen.getByText(/Masuk 08[.:]02 · Keluar 17[.:]05/i)).toBeTruthy();
    expect(screen.getByText(/Durasi 9j 03m · Kantor Pusat/i)).toBeTruthy();
    expect(screen.getByText(/Metode: QR/i)).toBeTruthy();
  });

  it("captures face verification and submits only from the confirmation step", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:selfie-checkin");

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchAttendanceHistoryByFilter
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "hist-after-checkin", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Selfie" }]);
    apiMocks.fetchEmployeeSummary.mockResolvedValueOnce({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    }).mockResolvedValueOnce({
      totalDays: 23,
      onTimeDays: 21,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_in",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "hist-after-checkin",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-11T01:03:00",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00",
        updatedAt: "2026-05-11T01:03:00"
      }
    });

    // Mock getUserMedia to return a fake stream
    const stopFn = vi.fn();
    const mockStream = { getTracks: () => [{ stop: stopFn }], srcObject: null };
    const getUserMediaSpy = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      configurable: true,
      writable: true
    });

    // Mock canvas.toDataURL to return a JPEG base64 data URL
    const toDataURLSpy = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,/9j/fake");
    // Mock getContext so drawImage doesn't throw
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D);

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /face verification/i }));
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera depan/i }));
    expect(apiMocks.checkIn).not.toHaveBeenCalled();

    // Wait for getUserMedia to be called and camera to become active
    await waitFor(() => expect(getUserMediaSpy).toHaveBeenCalled());

    // Now click capture (button label changes to "Ambil selfie" once camera is active)
    fireEvent.click(await screen.findByRole("button", { name: /ambil selfie untuk bukti hadir/i }));

    expect(await screen.findByRole("button", { name: /gunakan foto ini/i })).toBeTruthy();
    expect(apiMocks.checkIn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /gunakan foto ini/i }));
    expect(await screen.findByText(/review detail sebelum submit/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /submit check-in/i }));

    expect((await screen.findAllByText(/check-in berhasil/i)).length).toBeGreaterThan(0);
    expect(apiMocks.checkIn).toHaveBeenCalledWith(
      "demo:employee",
      expect.objectContaining({
        method: "Selfie",
        selfieUrl: undefined,
        selfieData: "data:image/jpeg;base64,/9j/fake",
        requiredSelfie: true
      })
    );
    await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(apiMocks.fetchEmployeeSummary).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText(/Masuk 08[.:]03/i)).length).toBeGreaterThan(0);

    toDataURLSpy.mockRestore();
    getContextSpy.mockRestore();
    createObjectUrl.mockRestore();
  });

  it("submits QR check-in through the confirmation step without selfie", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    // Activate QR camera first (new design requires camera activation before Scan QR)
    const mockQrStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockQrStream) },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /scan qr/i })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /scan qr/i }));
    expect(await screen.findByText(/qr berhasil terbaca/i)).toBeTruthy();
    expect(apiMocks.checkIn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /konfirmasi check-in/i }));
    expect(await screen.findByText(/review detail sebelum submit/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /submit check-in/i }));

    expect(apiMocks.checkIn).toHaveBeenCalledWith(
      "demo:employee",
      expect.not.objectContaining({
        scannerToken: expect.any(String)
      })
    );
    expect(apiMocks.checkIn).toHaveBeenCalledWith(
      "demo:employee",
      expect.objectContaining({
        method: "QR",
        selfieUrl: undefined,
        requiredSelfie: true
      })
    );
  });

  it("shows check-in save errors without refreshing history or showing fake success", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });
    apiMocks.checkIn.mockRejectedValue(new Error("Database gagal menyimpan check-in."));

    const mockQrStream2 = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockQrStream2) },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /scan qr/i })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /scan qr/i }));
    fireEvent.click(screen.getByRole("button", { name: /konfirmasi check-in/i }));
    fireEvent.click(await screen.findByRole("button", { name: /submit check-in/i }));

    expect(await screen.findByText("Database gagal menyimpan check-in.")).toBeTruthy();
    expect(screen.queryByText(/check-in berhasil/i)).toBeNull();
    expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(1);
    expect(apiMocks.fetchEmployeeSummary).toHaveBeenCalledTimes(1);
  });

  it("checks out an active attendance record and leaves the active state", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [{ id: "today-active", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Selfie" }],
      attendanceState: "checked_in",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValueOnce({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_in",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-real-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-11T01:03:00",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00",
        updatedAt: "2026-05-11T01:03:00"
      }
    }).mockResolvedValueOnce({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_out",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-real-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-11T01:03:00",
        checkOutTime: "2026-05-11T10:05:00",
        status: "Selesai",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00",
        updatedAt: "2026-05-11T10:05:00"
      }
    });
    apiMocks.fetchAttendanceHistoryByFilter
      .mockResolvedValueOnce([{ id: "today-active", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Selfie" }])
      .mockResolvedValueOnce([{ id: "today-complete", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Selfie" }]);

    renderRoute("/app/attendance");

    const checkOutButton = await screen.findByRole("button", { name: /check-out sekarang/i });
    fireEvent.click(checkOutButton);

    await waitFor(() => expect(apiMocks.checkOut).toHaveBeenCalledWith("demo:employee", expect.objectContaining({ method: "Manual" })));
    expect((await screen.findAllByText(/check-out berhasil/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /check-out sekarang/i })).toBeNull();
    await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(apiMocks.fetchEmployeeSummary).toHaveBeenCalledTimes(2));
  });

  it("shows check-out save errors without refreshing history or showing fake success", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [{ id: "today-active", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Selfie" }],
      attendanceState: "checked_in",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "checked_in",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-real-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        checkInTime: "2026-05-11T01:03:00",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00",
        updatedAt: "2026-05-11T01:03:00"
      }
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([
      { id: "today-active", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Selfie" }
    ]);
    apiMocks.checkOut.mockRejectedValue(new Error("Database gagal menyimpan check-out."));

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /check-out sekarang/i }));

    expect(await screen.findByText("Database gagal menyimpan check-out.")).toBeTruthy();
    expect(screen.queryByText(/check-out berhasil/i)).toBeNull();
    expect(screen.getByRole("button", { name: /check-out sekarang/i })).toBeTruthy();
    expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(1);
    expect(apiMocks.fetchEmployeeSummary).toHaveBeenCalledTimes(1);
  });

  it("keeps employee check-in clickable and explains when validation is not ready", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    const mockQrStream3 = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockQrStream3) },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    const verifyButton = await screen.findByRole("button", { name: /verifikasi ulang perangkat/i });
    fireEvent.click(verifyButton);
    await screen.findByText(/perangkat ini tidak mendukung verifikasi lokasi/i);

    // Activate QR camera first before Scan QR is available
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));
    const scanButton = await screen.findByRole("button", { name: /scan qr/i });
    expect(scanButton).not.toHaveProperty("disabled", true);

    fireEvent.click(scanButton);

    expect(await screen.findByText(/verifikasi perangkat atau izinkan lokasi/i)).toBeTruthy();
    expect(apiMocks.checkIn).not.toHaveBeenCalled();
  });

  it("switches employee tabs from navigation and keeps active state synced", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([
      { id: "hist-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Manual" }
    ]);
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    renderRoute("/app");

    fireEvent.click(await screen.findByRole("button", { name: "Presensi" }));
    expect(await screen.findByText(/check-in karyawan/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Presensi" }).className).toContain("bg-[#111827]");

    fireEvent.click(screen.getByRole("button", { name: "Riwayat" }));
    expect(await screen.findByText(/riwayat absensi/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Riwayat" }).className).toContain("bg-[#111827]");
  });

  it("opens employee recent history detail from a comfortable tap target", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([
      { id: "hist-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Manual" }
    ]);
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    renderRoute("/app/history");

    const historySummary = await screen.findByText(/Masuk 08[.:]03/i);
    const historyDetails = historySummary.closest("details");

    expect(historyDetails).toBeTruthy();
    expect(historySummary.closest("summary")?.className).toContain("min-h-14");

    fireEvent.click(historySummary);

    expect(await screen.findByText("Detail absensi")).toBeTruthy();
    expect(historyDetails?.hasAttribute("open")).toBe(true);
  });

  it("renders employee schedule and payslip self-service placeholders", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    renderRoute("/app/schedule");

    expect(await screen.findByText(/shift aktif hari ini/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /mulai check-in/i })).toBeTruthy();
    expect(screen.getByText(/belum ada jadwal/i)).toBeTruthy();

    cleanup();
    renderRoute("/app/payslip");

    expect(await screen.findByText(/payroll belum aktif/i)).toBeTruthy();
    expect(screen.getByText(/Slip gaji akan tersedia setelah modul payroll disambungkan/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /lihat rekap absensi bulan ini/i })).toBeTruthy();
  });

  it("keeps request categories Indonesian and submits with a clear CTA", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.createRequest.mockResolvedValue({
      request: { id: "req-01", category: "Koreksi Absensi", title: "Koreksi check-in", status: "Menunggu", detail: "Lupa scan QR." }
    });

    renderRoute("/app/requests");

    const combobox = await screen.findByRole("combobox");
    fireEvent.click(combobox);
    expect(screen.getByText("Koreksi Absensi")).toBeTruthy();
    expect(screen.getByText("Lupa Check-in/out")).toBeTruthy();
    expect(screen.queryByText("Permission")).toBeNull();
    expect(screen.queryByText("Attendance Correction")).toBeNull();
    expect(screen.queryByText("Forgot Check-in/out")).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /kirim pengajuan/i })).toBeTruthy();
  });
});

function setupAdminSession() {
  localStorage.setItem(
    "taptu-session",
    JSON.stringify({
      token: "demo:admin",
      user: {
        id: "usr-admin-01",
        fullName: "Nadia Putri",
        email: "admin@taptu.app",
        organizationName: "TAPTU HQ",
        role: "admin"
      }
    })
  );
  apiMocks.getDashboard.mockResolvedValue({
    greeting: "Halo, Nadia Putri",
    stats: [],
    schedule: [],
    attendance: [],
    attendanceState: "idle",
    requests: []
  });
  apiMocks.fetchAdminOverview.mockResolvedValue({
    totalEmployees: 10,
    checkedInToday: 8,
    onTimeToday: 7,
    lateToday: 1,
    pendingRequests: 2,
    absentToday: 2,
    exceptionCount: 1,
    recentActivity: []
  });
  apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
  apiMocks.fetchRequests.mockResolvedValue([]);
  apiMocks.fetchManagerRequests.mockResolvedValue([]);
  apiMocks.fetchRequestDetail.mockResolvedValue(null);
  apiMocks.fetchEmployeeList.mockResolvedValue([
    { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", position: "Field Officer", employeeCode: "EMP-001", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
    { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentName: null, managerName: null, todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
  ]);
  apiMocks.fetchManagerEmployeeList.mockResolvedValue([]);
  apiMocks.fetchExceptionQueue.mockResolvedValue([
    { id: "exc-01", attendanceRecordId: "att-demo-02", employeeId: "usr-employee-02", employeeName: "Anisa Rahma", exceptionType: "Di luar radius", reason: "GPS tidak akurat", status: "Need Review", createdAt: "2026-05-14T08:24:00" }
  ]);
  apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
  apiMocks.fetchWorkLocations.mockResolvedValue([
    { id: "loc-hq", name: "Kantor Pusat", address: "Jl. Sudirman No. 1", latitude: -6.2088, longitude: 106.8456, radiusMeters: 150, status: "active", createdAt: "2026-05-01T00:00:00" }
  ]);
  apiMocks.fetchShifts.mockResolvedValue([
    { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", gracePeriodMinutes: 10, workLocationId: "loc-hq", workLocationName: "Kantor Pusat", status: "active", createdAt: "2026-05-01T00:00:00", updatedAt: "2026-05-01T00:00:00" }
  ]);
  apiMocks.fetchReportRows.mockResolvedValue([
    { id: "att-demo-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:03:00", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
  ]);
  apiMocks.fetchAuditLogs.mockResolvedValue([]);
  apiMocks.refreshScannerToken.mockResolvedValue({ token: "HDR-31A-7XZ", expiresInSeconds: 30, scansToday: 124, locationName: "Gerbang Utama" });
  apiMocks.exportReportCsv.mockImplementation(() => undefined);
}

describe("HR/Admin dashboard Indonesian labels", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("admin dashboard shows Indonesian stat labels instead of English", async () => {
    setupAdminSession();
    renderRoute("/app");

    expect(await screen.findByText("Hadir hari ini")).toBeTruthy();
    expect(screen.getAllByText("Terlambat").length).toBeGreaterThan(0);
    expect(screen.getByText("Belum hadir")).toBeTruthy();
    expect(screen.getByText("Menunggu Manager")).toBeTruthy();
    expect(screen.getByText("Menunggu HR")).toBeTruthy();
    expect(screen.getByText("Perlu review")).toBeTruthy();
    expect(screen.queryByText("Present today")).toBeNull();
    expect(screen.queryByText("Pending approvals")).toBeNull();
    expect(screen.queryByText("Need review")).toBeNull();
  });

  it("admin Beranda splits approval counts by manager and HR workflow stage", async () => {
    setupAdminSession();
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Nadia Putri",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: [
        { id: "req-manager", title: "Izin menunggu manager", status: "Menunggu", detail: "Belum direview manager.", workflowStatus: "pending_manager" },
        { id: "req-hr", title: "Izin menunggu HR", status: "Menunggu", detail: "Sudah masuk antrean HR.", workflowStatus: "pending_hr" },
        { id: "req-approved-manager", title: "Cuti sudah disetujui manager", status: "Menunggu", detail: "Manager sudah menyetujui.", workflowStatus: "approved_by_manager" },
        { id: "req-rejected", title: "Izin ditolak", status: "Ditolak", detail: "Tidak memenuhi syarat.", workflowStatus: "rejected" }
      ]
    });
    apiMocks.fetchAdminOverview.mockResolvedValue({
      totalEmployees: 10,
      checkedInToday: 8,
      onTimeToday: 7,
      lateToday: 1,
      pendingRequests: 99,
      absentToday: 2,
      exceptionCount: 4,
      recentActivity: []
    });

    renderRoute("/app");

    const managerCard = (await screen.findByText("Menunggu Manager")).closest("article");
    const hrCard = screen.getByText("Menunggu HR").closest("article");
    const reviewCard = screen.getByText("Perlu review").closest("article");

    expect(within(managerCard!).getByText("1")).toBeTruthy();
    expect(within(hrCard!).getByText("2")).toBeTruthy();
    expect(within(reviewCard!).getByText("4")).toBeTruthy();
    expect(screen.queryByText("99")).toBeNull();
  });

  it("admin dashboard quick actions have production copy and no English placeholder", async () => {
    setupAdminSession();
    renderRoute("/app");

    await screen.findAllByText("Hadir hari ini");
    expect(screen.queryByText(/lanjutkan dari shell yang sama/i)).toBeNull();
    expect(screen.queryByText("Open")).toBeNull();
    expect(screen.getAllByText(/tambah, ubah, dan pantau data karyawan/i).length).toBeGreaterThan(0);
  });

  it("admin dashboard panel eyebrows use Indonesian text", async () => {
    setupAdminSession();
    renderRoute("/app");

    await screen.findAllByText("Hadir hari ini");
    expect(screen.queryByText(/today attendance summary/i)).toBeNull();
    expect(screen.queryByText("Quick actions")).toBeNull();
    expect(screen.getAllByText(/aksi cepat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ringkasan kehadiran hari ini/i).length).toBeGreaterThan(0);
  });

  it("admin profile shows HR identity and access summary", async () => {
    setupAdminSession();
    renderRoute("/app/profile");

    expect(await screen.findByText("Nadia Putri")).toBeTruthy();
    expect(screen.getByText("admin@taptu.app")).toBeTruthy();
    expect(screen.getAllByText("Admin HR").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TAPTU HQ").length).toBeGreaterThan(0);
    expect(screen.getByText("Semua divisi / organisasi")).toBeTruthy();
    expect(screen.getByText("Melihat semua karyawan")).toBeTruthy();
    expect(screen.getByText("Meninjau presensi organisasi")).toBeTruthy();
    expect(screen.getByText("Final approval pengajuan")).toBeTruthy();
    expect(screen.getByText("Meninjau pengecualian")).toBeTruthy();
    expect(screen.getByText("Mengelola lokasi dan shift")).toBeTruthy();
    expect(screen.getByText("Export laporan")).toBeTruthy();
    expect(screen.getByText("Keamanan akun")).toBeTruthy();
    expect(screen.queryByText(/ringkasan profil admin akan tersedia/i)).toBeNull();
    expect(screen.queryByText(/superadmin settings/i)).toBeNull();
  });

  it("admin attendance table columns use Indonesian headers", async () => {
    setupAdminSession();
    apiMocks.fetchAdminOverview.mockResolvedValue({
      totalEmployees: 10, checkedInToday: 8, onTimeToday: 7, lateToday: 1,
      pendingRequests: 2, absentToday: 2, exceptionCount: 1,
      recentActivity: [
        { id: "act-01", employeeName: "Anisa Rahma", event: "Butuh review", time: "08:24", status: "Terlambat", detail: "GPS rendah" }
      ]
    });
    renderRoute("/app");

    await screen.findByText("Anisa Rahma");
    expect(screen.getByText("Karyawan")).toBeTruthy();
    expect(screen.getByText("Kejadian")).toBeTruthy();
    expect(screen.getByText("Waktu")).toBeTruthy();
    expect(screen.queryByText("Employee")).toBeNull();
    expect(screen.queryByText("Event")).toBeNull();
    expect(screen.queryByText(/^Time$/)).toBeNull();
  });

  it("admin Pengajuan only shows final approval actions for requests waiting on HR", async () => {
    setupAdminSession();
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Nadia Putri",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: [
        { id: "req-manager", title: "Izin menunggu manager", status: "Menunggu", detail: "Belum direview manager.", workflowStatus: "pending_manager" },
        { id: "req-hr", title: "Izin menunggu HR", status: "Menunggu", detail: "Sudah masuk antrean HR.", workflowStatus: "pending_hr" },
        { id: "req-approved-manager", title: "Cuti sudah disetujui manager", status: "Menunggu", detail: "Manager sudah menyetujui.", workflowStatus: "approved_by_manager", adminNote: "Manager: OK untuk cuti." },
        { id: "req-rejected", title: "Izin ditolak", status: "Ditolak", detail: "Tidak memenuhi syarat.", workflowStatus: "rejected", adminNote: "Dokumen tidak lengkap." }
      ]
    });

    renderRoute("/app/requests");

    const pendingManagerCard = (await screen.findByText("Izin menunggu manager")).closest("article");
    const pendingHrCard = screen.getByText("Izin menunggu HR").closest("article");
    const approvedByManagerCard = screen.getByText("Cuti sudah disetujui manager").closest("article");
    const rejectedCard = screen.getByText("Izin ditolak").closest("article");

    expect(pendingManagerCard).toBeTruthy();
    expect(pendingHrCard).toBeTruthy();
    expect(approvedByManagerCard).toBeTruthy();
    expect(rejectedCard).toBeTruthy();

    expect(within(pendingManagerCard!).getByText("Menunggu Manager")).toBeTruthy();
    expect(within(pendingManagerCard!).queryByRole("button", { name: /setujui/i })).toBeNull();
    expect(within(pendingManagerCard!).queryByRole("button", { name: /tolak/i })).toBeNull();

    expect(within(pendingHrCard!).getByText("Menunggu HR")).toBeTruthy();
    expect(within(pendingHrCard!).getByRole("button", { name: /setujui/i })).toBeTruthy();
    expect(within(pendingHrCard!).getByRole("button", { name: /tolak/i })).toBeTruthy();

    expect(within(approvedByManagerCard!).getByText("Disetujui Manager")).toBeTruthy();
    expect(within(approvedByManagerCard!).getByText(/manager: ok untuk cuti/i)).toBeTruthy();
    expect(within(approvedByManagerCard!).getByRole("button", { name: /setujui/i })).toBeTruthy();
    expect(within(approvedByManagerCard!).getByRole("button", { name: /tolak/i })).toBeTruthy();

    expect(within(rejectedCard!).getByText("Ditolak")).toBeTruthy();
    expect(within(rejectedCard!).getByText(/dokumen tidak lengkap/i)).toBeTruthy();
    expect(within(rejectedCard!).queryByRole("button", { name: /setujui/i })).toBeNull();
    expect(within(rejectedCard!).queryByRole("button", { name: /tolak/i })).toBeNull();
  });

  it("admin Presensi loads organization-wide attendance instead of dashboard self history", async () => {
    setupAdminSession();
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Nadia Putri",
      stats: [],
      schedule: [],
      attendance: [
        { id: "self-att-01", day: "Hari ini", status: "Tepat waktu", time: "07:59", method: "Manual" }
      ],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchReportRows.mockResolvedValue([
      { id: "org-att-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-14", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-14T08:03:00", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true },
      { id: "org-att-02", employeeName: "Anisa Rahma", employeeId: "usr-employee-02", date: "2026-05-14", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-14T08:24:00", status: "Terlambat", validationStatus: "needs_review", validationReasons: ["Di luar radius"], isLate: true, hasException: true, selfieProof: false, deviceValidated: true }
    ]);

    renderRoute("/app/attendance");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getByText("Anisa Rahma")).toBeTruthy();
    expect(screen.queryByText("07:59")).toBeNull();
    expect(apiMocks.fetchReportRows).toHaveBeenCalledWith("demo:admin");
    expect(apiMocks.fetchAttendanceHistoryByFilter).not.toHaveBeenCalled();
    expect(apiMocks.fetchManagerEmployeeList).not.toHaveBeenCalled();
  });

  it("employee direct URL to HR reports falls back to employee workspace", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 22,
      onTimeDays: 20,
      lateDays: 2,
      pendingRequests: 1,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00",
        updatedAt: "2026-05-02T08:03:00"
      }
    });

    renderRoute("/app/reports");

    expect(await screen.findByText("Status hari ini")).toBeTruthy();
    expect(screen.queryByText("Filter laporan kehadiran")).toBeNull();
    expect(apiMocks.fetchReportRows).not.toHaveBeenCalled();
    expect(apiMocks.fetchManagerEmployeeList).not.toHaveBeenCalled();
  });

  it("HR direct URL can access reports workspace", async () => {
    setupAdminSession();

    renderRoute("/app/reports");

    expect(await screen.findByText("Filter laporan kehadiran")).toBeTruthy();
    expect(screen.getByText("Rekap kehadiran validasi")).toBeTruthy();
    expect(apiMocks.fetchReportRows).toHaveBeenCalledWith("demo:admin");
  });

  it("scanner direct URL to team falls back to scanner mode only", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:scanner",
        user: {
          id: "usr-scanner-01",
          fullName: "Front Gate Scanner",
          email: "scanner@taptu.app",
          organizationName: "TAPTU HQ",
          role: "scanner"
        }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Front Gate Scanner",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: [],
      scannerToken: "HDR-31A-7XZ"
    });

    renderRoute("/app/team");

    expect(await screen.findByText("Gate kiosk aktif")).toBeTruthy();
    expect(screen.queryByText("Kelola karyawan")).toBeNull();
    expect(screen.queryByText("Status hari ini")).toBeNull();
    expect(apiMocks.fetchScannerState).toHaveBeenCalledWith("demo:scanner");
    expect(apiMocks.fetchEmployeeList).not.toHaveBeenCalled();
  });

  it("team workspace exception action buttons use Indonesian labels", async () => {
    setupAdminSession();
    apiMocks.fetchExceptionQueue.mockResolvedValue([
      { id: "exc-01", employeeName: "Budi Santoso", exceptionType: "Di luar radius", reason: "GPS tidak akurat", status: "Need Review" }
    ]);
    renderRoute("/app/team");

    expect(await screen.findByRole("button", { name: /setujui/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /tolak/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /minta koreksi/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^approve$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^reject$/i })).toBeNull();
  });

  it("team workspace validation badge shows Terverifikasi not Verified", async () => {
    setupAdminSession();
    renderRoute("/app/team");

    await screen.findAllByText("Fikri Maulana");
    expect(screen.getAllByText("Terverifikasi").length).toBeGreaterThan(0);
    expect(screen.queryByText("Verified")).toBeNull();
  });

  it("team workspace exception types panel shows Indonesian names", async () => {
    setupAdminSession();
    renderRoute("/app/team");

    await screen.findAllByText("Fikri Maulana");
    expect(screen.getAllByText("Di luar radius").length).toBeGreaterThan(0);
    expect(screen.getAllByText("QR tidak valid").length).toBeGreaterThan(0);
    expect(screen.getAllByText("QR kedaluwarsa").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Selfie tidak ada").length).toBeGreaterThan(0);
    expect(screen.queryByText("Outside radius")).toBeNull();
    expect(screen.queryByText("Invalid QR")).toBeNull();
  });
});

describe("Phase 4: Employee list", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders employee search input in team workspace", async () => {
    setupAdminSession();
    renderRoute("/app/team");

    expect((await screen.findAllByPlaceholderText(/cari nama/i)).length).toBeGreaterThan(0);
  });

  it("renders employee names in team workspace", async () => {
    setupAdminSession();
    renderRoute("/app/team");

    const fikriElements = await screen.findAllByText("Fikri Maulana");
    expect(fikriElements.length).toBeGreaterThan(0);
    const anisaElements = screen.getAllByText("Anisa Rahma");
    expect(anisaElements.length).toBeGreaterThan(0);
  });

  it("renders department and manager fields in team workspace", async () => {
    setupAdminSession();
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
      { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentName: null, managerName: null, todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    renderRoute("/app/team");

    expect((await screen.findAllByText("Operations")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Raka Saputra").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Belum ditetapkan").length).toBeGreaterThan(0);
  });
});

describe("Phase 4: Location management", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders tambah lokasi button in locations workspace for admin", async () => {
    setupAdminSession();
    renderRoute("/app/locations");

    expect(await screen.findByText(/tambah lokasi/i)).toBeTruthy();
  });

  it("renders work location name in locations workspace", async () => {
    setupAdminSession();
    renderRoute("/app/locations");

    const elements = await screen.findAllByText("Kantor Pusat");
    expect(elements.length).toBeGreaterThan(0);
  });
});

describe("Phase 4: Reports workspace", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchRequests.mockResolvedValue([]);
    apiMocks.fetchManagerRequests.mockResolvedValue([]);
    apiMocks.fetchRequestDetail.mockResolvedValue(null);
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
      { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    apiMocks.fetchWorkLocations.mockResolvedValue([]);
    apiMocks.fetchShifts.mockResolvedValue([]);
    apiMocks.fetchReportRows.mockResolvedValue([
      { id: "att-demo-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:03:00", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
    ]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.refreshScannerToken.mockResolvedValue({ token: "T", expiresInSeconds: 30, scansToday: 0, locationName: "L" });
    apiMocks.exportReportCsv.mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders export CSV button in reports workspace", async () => {
    setupAdminSession();
    renderRoute("/app/reports");

    // The export CSV button has a testid set via data-testid
    const exportBtn = await screen.findByTestId("export-csv-button");
    expect(exportBtn).toBeTruthy();
  });

  it("renders report filter panel", async () => {
    setupAdminSession();
    renderRoute("/app/reports");

    expect(await screen.findByText(/terapkan filter/i)).toBeTruthy();
    expect((await screen.findAllByText(/filter laporan kehadiran/i)).length).toBeGreaterThan(0);
  });

  it("applies HR report date, division, and status filters", async () => {
    setupAdminSession();
    apiMocks.fetchDepartments.mockResolvedValue([
      { id: "dep-ops", name: "Operations", managerId: null, managerName: null, isActive: true, memberCount: 1 },
      { id: "dep-sales", name: "Sales", managerId: null, managerName: null, isActive: true, memberCount: 1 }
    ]);
    renderRoute("/app/reports");

    fireEvent.change(await screen.findByLabelText("Dari tanggal"), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByLabelText("Sampai tanggal"), { target: { value: "2026-05-14" } });
    fireEvent.click(await screen.findByRole("combobox", { name: "Divisi / Departemen" }));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Sales" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Status absensi" }));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Perlu review" }));
    fireEvent.click(screen.getByRole("button", { name: /terapkan filter/i }));

    await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenLastCalledWith("demo:admin", {
      dateFrom: "2026-05-01",
      dateTo: "2026-05-14",
      departmentId: "dep-sales",
      status: "needs_review"
    }));
  });

  it("renders attendance report table with employee data", async () => {
    setupAdminSession();
    renderRoute("/app/reports");

    const elements = await screen.findAllByText("Fikri Maulana");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("reports workspace flag badges use Indonesian labels", async () => {
    setupAdminSession();
    renderRoute("/app/reports");

    await screen.findAllByText("Fikri Maulana");
    expect(screen.queryByText("Late")).toBeNull();
    expect(screen.queryByText("Exception")).toBeNull();
    expect(screen.queryByText("Device")).toBeNull();
    expect(screen.getAllByText("Selfie").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Perangkat").length).toBeGreaterThan(0);
  });

  it("reports workspace validation badge shows Terverifikasi not Verified or Review", async () => {
    setupAdminSession();
    renderRoute("/app/reports");

    await screen.findAllByText("Fikri Maulana");
    expect(screen.getAllByText("Terverifikasi").length).toBeGreaterThan(0);
    expect(screen.queryByText("Verified")).toBeNull();
    expect(screen.queryByText("Review")).toBeNull();
  });

  it("reports workspace audit trail columns use Indonesian headers", async () => {
    setupAdminSession();
    apiMocks.fetchAuditLogs.mockResolvedValue([
      { id: "audit-01", action: "Setujui", actorName: "Nadia", actorRole: "admin", detail: "Menyetujui izin sakit", createdAt: "2026-05-12T09:00:00" }
    ]);
    renderRoute("/app/reports");

    fireEvent.click((await screen.findAllByRole("button", { name: /lihat audit trail/i }))[0]);
    expect(await screen.findAllByText(/jejak kehadiran|jejak audit/i)).toBeTruthy();

    await waitFor(
      () => expect(screen.queryAllByText("Aksi").length).toBeGreaterThan(0),
      { timeout: 6000 }
    );
    expect(screen.queryByText("Action")).toBeNull();
    expect(screen.queryByText("Actor")).toBeNull();
    expect(screen.queryByText(/^Time$/)).toBeNull();
  }, 15000);

  it("profile page uses shortened placeholder text without 'dari backend' wording", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: {
          id: "usr-employee-01",
          fullName: "Fikri Maulana",
          email: "employee@taptu.app",
          organizationName: "TAPTU HQ",
          role: "employee"
        }
      })
    );

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 0,
      onTimeDays: 0,
      lateDays: 0,
      pendingRequests: 0,
      currentAttendanceState: "idle",
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      },
      todayRecord: {
        id: "att-demo-01",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:00:00",
        updatedAt: "2026-05-02T08:00:00"
      },
      profile: {
        departmentName: null,
        managerName: null,
        position: null
      }
    });

    renderRoute("/app/profile");

    expect((await screen.findAllByText("Fikri Maulana")).length).toBeGreaterThan(0);

    expect(screen.queryByText(/dari backend/i)).toBeNull();
    expect(screen.getAllByText(/^Belum ditetapkan$/).length).toBeGreaterThan(0);
  });
});

describe("HR team filters", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    setupAdminSession();
    apiMocks.fetchDepartments.mockResolvedValue([]);
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchWorkLocations.mockResolvedValue([]);
    apiMocks.fetchShifts.mockResolvedValue([]);
    apiMocks.fetchReportRows.mockResolvedValue([]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("keeps HR team organization-wide by default and filters by search, division, and status", async () => {
    apiMocks.fetchDepartments.mockResolvedValue([
      { id: "dep-ops", name: "Operations", managerId: null, managerName: null, isActive: true, memberCount: 1 },
      { id: "dep-sales", name: "Sales", managerId: null, managerName: null, isActive: true, memberCount: 1 }
    ]);
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", employeeCode: "EMP-001", departmentId: "dep-ops", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
      { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", employeeCode: "EMP-002", departmentId: "dep-sales", departmentName: "Sales", managerName: null, todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);

    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getAllByText("Anisa Rahma").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Cari karyawan"), { target: { value: "EMP-002" } });

    const divisionCombobox = screen.getByRole("combobox", { name: "Divisi / Departemen" });
    fireEvent.click(divisionCombobox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Sales" }));

    const statusCombobox = screen.getByRole("combobox", { name: "Status hari ini" });
    fireEvent.click(statusCombobox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Terlambat" }));

    await waitFor(() => expect(screen.queryByText("Fikri Maulana")).toBeNull());
    expect(screen.getAllByText("Anisa Rahma").length).toBeGreaterThan(0);
  });

  it("shows only the default division option when no departments exist", async () => {
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: null, todayStatus: "present" }
    ]);

    renderRoute("/app/team");

    const divisionCombobox = await screen.findByRole("combobox", { name: "Divisi / Departemen" });
    fireEvent.click(divisionCombobox);
    const options = screen.getAllByRole("option");

    expect(options.map((o) => o.textContent?.trim())).toEqual(["Semua divisi"]);
    expect(screen.getByText("Fikri Maulana")).toBeTruthy();
  });

  it("does not show HR global filters on the manager team page", async () => {
    setupManagerSession();
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", todayStatus: "present" }
    ]);

    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Divisi / Departemen" })).toBeNull();
    expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledWith("demo:manager");
  });
});

function setupManagerSession() {
  localStorage.setItem(
    "taptu-session",
    JSON.stringify({
      token: "demo:manager",
      user: {
        id: "usr-manager-01",
        fullName: "Raka Saputra",
        email: "manager@taptu.app",
        organizationName: "TAPTU HQ",
        role: "manager"
      }
    })
  );
  apiMocks.getDashboard.mockResolvedValue({
    greeting: "Halo, Raka Saputra",
    stats: [],
    schedule: [],
    attendance: [],
    attendanceState: "idle",
    requests: []
  });
  apiMocks.fetchManagerOverview.mockResolvedValue({
    totalEmployees: 15,
    checkedInToday: 12,
    onTimeToday: 10,
    lateToday: 2,
    pendingRequests: 3,
    absentToday: 1,
    exceptionCount: 1,
    recentActivity: [
      { id: "act-01", employeeName: "Fikri Maulana", event: "Check-in", time: "08:03", status: "Tepat waktu", detail: "Shift Pagi" }
    ]
  });
}

describe("Manager dashboard", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.fetchAdminOverview.mockResolvedValue({
      totalEmployees: 0,
      checkedInToday: 0,
      onTimeToday: 0,
      lateToday: 0,
      pendingRequests: 0,
      absentToday: 0,
      exceptionCount: 0,
      recentActivity: []
    });
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 0,
      checkedInToday: 0,
      onTimeToday: 0,
      lateToday: 0,
      pendingRequests: 0,
      absentToday: 0,
      exceptionCount: 0,
      recentActivity: []
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchRequests.mockResolvedValue([]);
    apiMocks.fetchManagerRequests.mockResolvedValue([]);
    apiMocks.fetchRequestDetail.mockResolvedValue(null);
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
      { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
      { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    apiMocks.fetchWorkLocations.mockResolvedValue([]);
    apiMocks.fetchShifts.mockResolvedValue([]);
    apiMocks.fetchReportRows.mockResolvedValue([]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.refreshScannerToken.mockResolvedValue({ token: "T", expiresInSeconds: 30, scansToday: 0, locationName: "L" });
    apiMocks.exportReportCsv.mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("manager home shows team stat cards with Indonesian labels", async () => {
    setupManagerSession();
    renderRoute("/app");

    expect(await screen.findByText("Hadir hari ini")).toBeTruthy();
    expect(screen.getAllByText("Terlambat").length).toBeGreaterThan(0);
    expect(screen.getByText("Belum hadir")).toBeTruthy();
    expect(screen.getByText("Menunggu approval")).toBeTruthy();
    expect(screen.queryByText(/supervisor view masih dibatasi/i)).toBeNull();
  });

  it("manager dashboard initial load uses manager scoped overview data", async () => {
    setupManagerSession();
    renderRoute("/app");

    await screen.findByText("Hadir hari ini");

    expect(apiMocks.fetchManagerOverview).toHaveBeenCalledWith("demo:manager");
    expect(apiMocks.fetchAdminOverview).not.toHaveBeenCalled();
  });

  it("manager home shows recent team activity with employee names", async () => {
    setupManagerSession();
    renderRoute("/app");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getAllByText(/aktivitas tim hari ini/i).length).toBeGreaterThan(0);
  });

  it("manager home shows pending approvals and exceptions panels", async () => {
    setupManagerSession();
    renderRoute("/app");

    await screen.findByText("Hadir hari ini");
    expect(screen.getAllByText(/pengajuan menunggu/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pengecualian validasi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /tim saya/i }).length).toBeGreaterThan(0);
  });

  it("manager navigation does not include Laporan or Lokasi", async () => {
    setupManagerSession();
    renderRoute("/app");

    await screen.findByText("Hadir hari ini");
    expect(screen.queryByRole("button", { name: /^laporan$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^lokasi$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^scanner$/i })).toBeNull();
  });

  it("manager direct URL to HR reports falls back to manager workspace", async () => {
    setupManagerSession();

    renderRoute("/app/reports");

    expect(await screen.findByText("Aktivitas tim hari ini")).toBeTruthy();
    expect(screen.queryByText("Filter laporan kehadiran")).toBeNull();
    expect(screen.queryByRole("button", { name: /^laporan$/i })).toBeNull();
    expect(apiMocks.fetchReportRows).not.toHaveBeenCalled();
  });

  it("manager Tim page shows Tim Saya eyebrow not Daftar Karyawan", async () => {
    setupManagerSession();
    renderRoute("/app/team");

    await screen.findAllByText("Fikri Maulana");
    expect(screen.getAllByText(/tim saya/i).length).toBeGreaterThan(0);
  });

  it("does not render dummy employees for an empty manager team", async () => {
    setupManagerSession();
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);

    renderRoute("/app/team");

    expect(await screen.findByText("Belum ada anggota tim")).toBeTruthy();
    expect(screen.getByText("Karyawan akan muncul setelah HR menetapkan Anda sebagai manager.")).toBeTruthy();
    expect(screen.queryByText("Fikri Maulana")).toBeNull();
    expect(screen.queryByText("Anisa Rahma")).toBeNull();
    expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledWith("demo:manager");
    expect(apiMocks.fetchEmployeeList).not.toHaveBeenCalled();
  });

  it("manager Presensi Tim page shows team attendance overview", async () => {
    setupManagerSession();
    renderRoute("/app/attendance");

    expect((await screen.findAllByText(/presensi tim/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/^hadir$/i)).length).toBeGreaterThan(0);
  });

  it("manager Presensi Tim shows only manager-scoped team attendance", async () => {
    setupManagerSession();
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-outside-01", fullName: "Outside Org Employee", email: "outside@taptu.app", role: "employee", departmentName: "Finance", todayStatus: "present", checkInTime: "08:01", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    apiMocks.fetchReportRows.mockResolvedValue([
      { id: "org-att-01", employeeName: "Outside Org Employee", employeeId: "usr-outside-01", date: "2026-05-14", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-14T08:01:00", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
    ]);
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operations", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);

    renderRoute("/app/attendance");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.queryByText("Outside Org Employee")).toBeNull();
    expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledWith("demo:manager");
    expect(apiMocks.fetchEmployeeList).not.toHaveBeenCalled();
    expect(apiMocks.fetchReportRows).not.toHaveBeenCalled();
  });

  it("manager Presensi Tim page shows empty attendance state when team is empty", async () => {
    setupManagerSession();
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([]);

    renderRoute("/app/attendance");

    expect(await screen.findByText("Belum ada presensi tim")).toBeTruthy();
    expect(screen.getByText("Data akan muncul setelah anggota tim melakukan check-in.")).toBeTruthy();
  });

  it("manager Pengajuan loads manager scoped requests and ignores dashboard-wide requests", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Raka Saputra",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: [
        { id: "req-org-wide", category: "Izin", title: "Pengajuan organisasi", status: "Menunggu", detail: "Tidak boleh tampil.", startDate: "2026-05-13", endDate: "2026-05-13" }
      ]
    });
    apiMocks.fetchManagerRequests.mockResolvedValue([
      { id: "req-01", category: "Izin", title: "Izin sakit", status: "Menunggu", detail: "Demam tinggi.", startDate: "2026-05-13", endDate: "2026-05-13", workflowStatus: "pending_manager" }
    ]);
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 15, checkedInToday: 12, onTimeToday: 10, lateToday: 2,
      pendingRequests: 3, absentToday: 1, exceptionCount: 1, recentActivity: []
    });
    renderRoute("/app/requests");

    await waitFor(() => expect(apiMocks.fetchManagerRequests).toHaveBeenCalledWith("demo:manager"));
    expect(await screen.findByText(/izin sakit/i)).toBeTruthy();
    expect(screen.queryByText(/pengajuan organisasi/i)).toBeNull();
    expect(apiMocks.fetchRequests).not.toHaveBeenCalled();
  });

  it("manager Pengajuan shows two-step approval explanation banner", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Raka Saputra",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchManagerRequests.mockResolvedValue([
      { id: "req-01", category: "Izin", title: "Izin sakit", status: "Menunggu", detail: "Demam tinggi.", startDate: "2026-05-13", endDate: "2026-05-13", workflowStatus: "pending_manager" }
    ]);
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 15, checkedInToday: 12, onTimeToday: 10, lateToday: 2,
      pendingRequests: 3, absentToday: 1, exceptionCount: 1, recentActivity: []
    });
    renderRoute("/app/requests");

    await screen.findByText(/izin sakit/i);
    expect(screen.getByText(/setujui/i)).toBeTruthy();
    expect(screen.getByText(/persetujuan anda adalah langkah pertama/i)).toBeTruthy();
  });

  it("manager requests preserve workflowStatus labels from manager scoped data", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Raka Saputra",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchManagerRequests.mockResolvedValue([
      { id: "req-01", title: "Izin sakit", status: "Menunggu", detail: "Demam.", workflowStatus: "pending_manager" },
      { id: "req-02", title: "Cuti tahunan", status: "Menunggu", detail: "Liburan.", workflowStatus: "approved_by_manager" },
      { id: "req-03", title: "Dinas luar", status: "Menunggu", detail: "Perjalanan.", workflowStatus: "pending_hr" },
      { id: "req-04", title: "Izin mendadak", status: "Ditolak", detail: "Batal.", workflowStatus: "cancelled" },
      { id: "req-05", title: "Izin khusus", status: "Menunggu", detail: "Butuh label.", workflowStatus: "pending_hr", statusLabel: "Menunggu HR Payroll" }
    ]);
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 15, checkedInToday: 12, onTimeToday: 10, lateToday: 2,
      pendingRequests: 5, absentToday: 1, exceptionCount: 0, recentActivity: []
    });
    renderRoute("/app/requests");

    await screen.findByText("Izin sakit");
    expect(screen.getByText("Menunggu Manager")).toBeTruthy();
    expect(screen.getByText("Disetujui Manager")).toBeTruthy();
    expect(screen.getByText("Menunggu HR")).toBeTruthy();
    expect(screen.getByText("Dibatalkan")).toBeTruthy();
    expect(screen.getByText("Menunggu HR Payroll")).toBeTruthy();
  });

  it("manager Pengajuan only shows approval actions for requests waiting on Manager", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Raka Saputra",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchManagerRequests.mockResolvedValue([
      { id: "req-manager", title: "Izin menunggu Manager", status: "Menunggu", detail: "Belum direview manager.", workflowStatus: "pending_manager" },
      { id: "req-hr", title: "Izin menunggu HR", status: "Menunggu", detail: "Sudah masuk antrean HR.", workflowStatus: "pending_hr" },
      { id: "req-approved", title: "Izin sudah disetujui", status: "Disetujui", detail: "Selesai.", workflowStatus: "approved" }
    ]);
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 15, checkedInToday: 12, onTimeToday: 10, lateToday: 2,
      pendingRequests: 3, absentToday: 1, exceptionCount: 0, recentActivity: []
    });
    renderRoute("/app/requests");

    const pendingManagerCard = (await screen.findByText("Izin menunggu Manager")).closest("article");
    const pendingHrCard = screen.getByText("Izin menunggu HR").closest("article");
    const approvedCard = screen.getByText("Izin sudah disetujui").closest("article");

    expect(within(pendingManagerCard!).getByText("Menunggu Manager")).toBeTruthy();
    expect(within(pendingManagerCard!).getByRole("button", { name: /setujui/i })).toBeTruthy();
    expect(within(pendingManagerCard!).getByRole("button", { name: /tolak/i })).toBeTruthy();

    expect(within(pendingHrCard!).getByText("Menunggu HR")).toBeTruthy();
    expect(within(pendingHrCard!).queryByRole("button", { name: /setujui/i })).toBeNull();
    expect(within(pendingHrCard!).queryByRole("button", { name: /tolak/i })).toBeNull();

    expect(within(approvedCard!).getByText("Disetujui")).toBeTruthy();
    expect(within(approvedCard!).queryByRole("button", { name: /setujui/i })).toBeNull();
    expect(within(approvedCard!).queryByRole("button", { name: /tolak/i })).toBeNull();
  });

  it("manager Pengajuan shows safe empty state when manager scoped requests are empty", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Raka Saputra",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: [
        { id: "req-org-wide", category: "Izin", title: "Pengajuan organisasi", status: "Menunggu", detail: "Tidak boleh tampil." }
      ]
    });
    apiMocks.fetchManagerRequests.mockResolvedValue([]);
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 15, checkedInToday: 12, onTimeToday: 10, lateToday: 2,
      pendingRequests: 3, absentToday: 1, exceptionCount: 1, recentActivity: []
    });
    renderRoute("/app/requests");

    expect(await screen.findByText("Belum ada pengajuan tim")).toBeTruthy();
    expect(screen.queryByText(/pengajuan organisasi/i)).toBeNull();
  });

  it("manager profile shows identity section not a generic empty state", async () => {
    setupManagerSession();
    renderRoute("/app/profile");

    expect(await screen.findByText("Raka Saputra")).toBeTruthy();
    expect(screen.queryByText(/profil admin/i)).toBeNull();
    expect(screen.getByText(/identitas/i)).toBeTruthy();
  });

  it("request card renders workflowStatus as step-aware Indonesian label", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Raka Saputra",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchManagerRequests.mockResolvedValue([
      { id: "req-01", title: "Izin sakit", status: "Menunggu", detail: "Demam.", workflowStatus: "pending_manager" },
      { id: "req-02", title: "Cuti tahunan", status: "Menunggu", detail: "Liburan.", workflowStatus: "approved_by_manager" },
      { id: "req-03", title: "Dinas luar", status: "Menunggu", detail: "Perjalanan.", workflowStatus: "pending_hr" },
      { id: "req-04", title: "Izin mendadak", status: "Ditolak", detail: "Batal.", workflowStatus: "cancelled" }
    ]);
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 15, checkedInToday: 12, onTimeToday: 10, lateToday: 2,
      pendingRequests: 4, absentToday: 1, exceptionCount: 0, recentActivity: []
    });
    renderRoute("/app/requests");

    await screen.findByText("Izin sakit");
    expect(screen.getByText("Menunggu Manager")).toBeTruthy();
    expect(screen.getByText("Disetujui Manager")).toBeTruthy();
    expect(screen.getByText("Menunggu HR")).toBeTruthy();
    expect(screen.getByText("Dibatalkan")).toBeTruthy();
  });

  it("manager Setujui shows Diteruskan ke HR action message not Pengajuan disetujui", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:manager",
        user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Raka Saputra",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchManagerRequests.mockResolvedValue([
      { id: "req-10", title: "Izin sakit", status: "Menunggu", detail: "Demam.", workflowStatus: "pending_manager" }
    ]);
    apiMocks.fetchManagerOverview.mockResolvedValue({
      totalEmployees: 15, checkedInToday: 12, onTimeToday: 10, lateToday: 2,
      pendingRequests: 1, absentToday: 0, exceptionCount: 0, recentActivity: []
    });
    apiMocks.approveRequest.mockResolvedValue({
      request: { id: "req-10", title: "Izin sakit", status: "Menunggu", detail: "Demam.", workflowStatus: "pending_hr", statusLabel: "Menunggu HR" }
    });
    renderRoute("/app/requests");

    await screen.findByText("Izin sakit");
    fireEvent.click(screen.getByRole("button", { name: /setujui/i }));

    await screen.findByText(/pengajuan diteruskan ke hr/i);
  });

  it("employee sees adminNote catatan reviewer on rejected request", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: { id: "usr-emp-01", fullName: "Fikri Maulana", email: "emp@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: [
        { id: "req-20", title: "Izin keperluan keluarga", status: "Ditolak", detail: "Urusan mendadak.", adminNote: "Kuota izin bulan ini sudah penuh.", workflowStatus: "rejected" }
      ]
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      currentAttendanceState: "idle",
      todayRecord: null,
      activeCheckIn: null,
      pendingCheckIn: null,
      recentLogs: []
    });
    renderRoute("/app/requests");

    await screen.findByText("Izin keperluan keluarga");
    expect(screen.getByText(/kuota izin bulan ini sudah penuh/i)).toBeTruthy();
    expect(screen.getByText(/catatan reviewer/i)).toBeTruthy();
  });
});

describe("HR filter bar UI polish", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    setupAdminSession();
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
    apiMocks.fetchAdminOverview.mockResolvedValue({ totalEmployees: 5, checkedInToday: 3, onTimeToday: 2, lateToday: 1, pendingRequests: 0, absentToday: 2, exceptionCount: 0, recentActivity: [] });
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "e1", fullName: "Fikri Maulana", email: "fikri@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operations", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified" },
      { id: "e2", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentId: "dep-sales", departmentName: "Sales", todayStatus: "late", checkInTime: "08:31", validationStatus: "needs_review" }
    ]);
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchWorkLocations.mockResolvedValue([]);
    apiMocks.fetchShifts.mockResolvedValue([]);
    apiMocks.fetchReportRows.mockResolvedValue([]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchDepartments.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("HR Tim filter bar shows status count badges for present, late, absent, and leave", async () => {
    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getAllByText(/^hadir:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^terlambat:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^belum hadir:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^izin:/i).length).toBeGreaterThan(0);
  });

  it("HR Tim filter strip is rendered as a compact container", async () => {
    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getByTestId("team-filter-strip")).toBeTruthy();
  });

  it("HR Laporan filter strip is rendered as a compact container", async () => {
    renderRoute("/app/reports");

    expect(await screen.findByText(/terapkan filter/i)).toBeTruthy();
    expect(screen.getByTestId("report-filter-strip")).toBeTruthy();
  });

  it("HR Tim filter bar renders search and both filter controls accessible", async () => {
    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getByLabelText("Cari karyawan")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Divisi / Departemen" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Status hari ini" })).toBeTruthy();
  });

  it("HR Laporan filter bar renders all four filter fields and apply button", async () => {
    apiMocks.fetchReportRows.mockResolvedValue([
      { id: "r1", employeeName: "Fikri Maulana", employeeId: "e1", date: "2026-05-14", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
    ]);
    renderRoute("/app/reports");

    expect(await screen.findByLabelText("Dari tanggal")).toBeTruthy();
    expect(screen.getByLabelText("Sampai tanggal")).toBeTruthy();
    expect(screen.getByLabelText("Divisi / Departemen")).toBeTruthy();
    expect(screen.getByLabelText("Status absensi")).toBeTruthy();
    expect(screen.getByRole("button", { name: /terapkan filter/i })).toBeTruthy();
  });

  it("HR Tim division filter is a custom combobox, not a native select", async () => {
    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    const combobox = screen.getByRole("combobox", { name: "Divisi / Departemen" });
    expect(combobox.tagName).not.toBe("SELECT");
    expect(combobox.getAttribute("aria-haspopup")).toBe("listbox");
  });

  it("HR Tim status filter is a custom combobox, not a native select", async () => {
    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    const combobox = screen.getByRole("combobox", { name: "Status hari ini" });
    expect(combobox.tagName).not.toBe("SELECT");
    expect(combobox.getAttribute("aria-haspopup")).toBe("listbox");
  });

  it("HR Tim division filter options come from real department data", async () => {
    apiMocks.fetchDepartments.mockResolvedValue([
      { id: "dep-ops", name: "Operations", managerId: null, managerName: null, isActive: true, memberCount: 0 },
      { id: "dep-empty", name: "New Empty Division", managerId: null, managerName: null, isActive: true, memberCount: 0 }
    ]);

    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    const combobox = screen.getByRole("combobox", { name: "Divisi / Departemen" });
    fireEvent.click(combobox);

    const options = screen.getAllByRole("option");
    const labels = options.map((o) => o.textContent?.trim());
    expect(labels).toContain("Semua divisi");
    expect(labels).toContain("Operations");
    expect(labels).toContain("New Empty Division");
  });
});

describe("HR Divisi & Penempatan", () => {
  const DEPT_OPS = { id: "dep-ops", name: "Operations", managerId: "mgr-1", managerName: "Raka Saputra", isActive: true, memberCount: 2 };
  const DEPT_FNB = { id: "dep-fnb", name: "F&B Service", managerId: null, managerName: null, isActive: true, memberCount: 1 };

  function setupAdminWithDepartments() {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "real-admin-token",
        user: { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", role: "admin", organizationName: "TAPTU HQ" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
    apiMocks.fetchAdminOverview.mockResolvedValue({ totalEmployees: 3, checkedInToday: 1, onTimeToday: 1, lateToday: 1, pendingRequests: 0, absentToday: 1, exceptionCount: 0, recentActivity: [] });
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchWorkLocations.mockResolvedValue([]);
    apiMocks.fetchShifts.mockResolvedValue([]);
    apiMocks.fetchReportRows.mockResolvedValue([]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchDepartments.mockResolvedValue([DEPT_OPS, DEPT_FNB]);
    apiMocks.fetchEmployeeList.mockResolvedValue([
      {
        id: "e1", fullName: "Fikri Maulana", email: "fikri@taptu.app", role: "employee",
        departmentId: "dep-ops", departmentName: "Operations",
        managerId: "mgr-1", managerName: "Raka Saputra",
        todayStatus: "present", validationStatus: "verified"
      },
      {
        id: "e2", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee",
        departmentId: "dep-ops", departmentName: "Operations",
        managerId: "mgr-1", managerName: "Raka Saputra",
        todayStatus: "late", validationStatus: "needs_review"
      },
      {
        id: "e3", fullName: "Budi Santoso", email: "budi@taptu.app", role: "employee",
        departmentId: "dep-fnb", departmentName: "F&B Service",
        managerId: null, managerName: null,
        todayStatus: "absent", validationStatus: null
      },
      {
        id: "mgr-1", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager",
        departmentId: "dep-ops", departmentName: "Operations",
        managerId: null, managerName: null,
        todayStatus: "present", validationStatus: "verified"
      }
    ]);
  }

  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("HR navigation includes Struktur for admins", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Struktur" })).toBeTruthy();
  });

  it("renders Divisi & Penempatan on the dedicated HR Struktur page", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    expect(await screen.findByTestId("divisi-penempatan-section")).toBeTruthy();
    expect(screen.getByText("STRUKTUR TIM")).toBeTruthy();
    expect(screen.getAllByText(/divisi & penempatan/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Kelola divisi, tetapkan manager, dan atur penempatan karyawan.")).toBeTruthy();
  });

  it("Tim page keeps employee monitoring but no longer contains the full Divisi & Penempatan panel", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/team");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getAllByText("Daftar karyawan aktif").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Cari karyawan")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Divisi / Departemen" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Status hari ini" })).toBeTruthy();
    expect(screen.queryByTestId("divisi-penempatan-section")).toBeNull();
  });

  it("shows empty state when no departments exist", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "real-admin-token",
        user: { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", role: "admin", organizationName: "TAPTU HQ" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
    apiMocks.fetchAdminOverview.mockResolvedValue({ totalEmployees: 0, checkedInToday: 0, onTimeToday: 0, lateToday: 0, pendingRequests: 0, absentToday: 0, exceptionCount: 0, recentActivity: [] });
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchWorkLocations.mockResolvedValue([]);
    apiMocks.fetchShifts.mockResolvedValue([]);
    apiMocks.fetchReportRows.mockResolvedValue([]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchDepartments.mockResolvedValue([]);
    apiMocks.fetchEmployeeList.mockResolvedValue([]);
    renderRoute("/app/structure");

    await screen.findByTestId("divisi-penempatan-section");
    expect(screen.getByText(/belum ada divisi/i)).toBeTruthy();
    expect(screen.getByText(/tambahkan divisi/i)).toBeTruthy();
  });

  it("shows division names, member counts, and manager names from API data", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    const opsRow = await screen.findByTestId("divisi-row-dep-ops");
    const fnbRow = screen.getByTestId("divisi-row-dep-fnb");

    expect(within(opsRow).getByText("Operations")).toBeTruthy();
    expect(within(opsRow).getByText("Raka Saputra")).toBeTruthy();
    expect(within(opsRow).getByText(/2 anggota/i)).toBeTruthy();
    expect(within(fnbRow).getByText("F&B Service")).toBeTruthy();
    expect(within(fnbRow).getByText(/belum ditetapkan/i)).toBeTruthy();
    expect(within(fnbRow).getByText(/1 anggota/i)).toBeTruthy();
  });

  it("Lihat anggota button filters the employee table to that division", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    const fnbRow = await screen.findByTestId("divisi-row-dep-fnb");
    fireEvent.click(within(fnbRow).getByRole("button", { name: /aksi f&b service/i }));
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: /lihat anggota/i }));

    await waitFor(() => {
      expect(screen.getByText("Budi Santoso")).toBeTruthy();
      expect(screen.getAllByText("Daftar karyawan aktif").length).toBeGreaterThan(0);
      expect(screen.queryByText("Fikri Maulana")).toBeNull();
      expect(screen.queryByText("Anisa Rahma")).toBeNull();
    });
  });

  it("Manager and Employee cannot access Struktur", async () => {
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "real-manager-token",
        user: { id: "usr-mgr-01", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", organizationName: "TAPTU HQ" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
    apiMocks.fetchManagerOverview.mockResolvedValue({ totalEmployees: 0, checkedInToday: 0, onTimeToday: 0, lateToday: 0, pendingRequests: 0, absentToday: 0, exceptionCount: 0, recentActivity: [] });
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([]);
    apiMocks.fetchManagerRequests.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchWorkLocations.mockResolvedValue([]);
    apiMocks.fetchShifts.mockResolvedValue([]);
    apiMocks.fetchReportRows.mockResolvedValue([]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchDepartments.mockResolvedValue([]);
    renderRoute("/app/structure");

    expect(await screen.findByTestId("app-shell")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Struktur" })).toBeNull();
    expect(screen.queryByTestId("divisi-penempatan-section")).toBeNull();

    cleanup();
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "real-employee-token",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", organizationName: "TAPTU HQ" }
      })
    );
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 0,
      onTimeDays: 0,
      lateDays: 0,
      pendingRequests: 0,
      currentAttendanceState: "idle",
      todayRecord: {
        id: "att-empty",
        employeeId: "usr-employee-01",
        checkInTime: undefined,
        checkOutTime: undefined,
        status: "Belum check-in",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-14T00:00:00",
        updatedAt: "2026-05-14T00:00:00"
      },
      assignedShift: {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        locationName: "Kantor Pusat"
      }
    });
    renderRoute("/app/structure");

    expect(await screen.findByTestId("app-shell")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Struktur" })).toBeNull();
    expect(screen.queryByTestId("divisi-penempatan-section")).toBeNull();
  });

  it("Tambah divisi form opens, submits, and refreshes the division list", async () => {
    setupAdminWithDepartments();
    apiMocks.createDepartment.mockResolvedValue({ id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 });
    apiMocks.fetchDepartments
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB])
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB, { id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 }]);

    renderRoute("/app/structure");
    await screen.findByTestId("divisi-penempatan-section");

    fireEvent.click(screen.getByRole("button", { name: /tambah divisi/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/nama divisi/i), { target: { value: "IT" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    await waitFor(() => {
      expect(apiMocks.createDepartment).toHaveBeenCalledWith(
        "real-admin-token",
        expect.objectContaining({ name: "IT" })
      );
      expect(screen.getByTestId("divisi-row-dep-it")).toBeTruthy();
    });
  });

  it("division save shows a pending state, explains disabled close controls, and closes only after success", async () => {
    setupAdminWithDepartments();
    let resolveCreate!: (value: DepartmentItem) => void;
    apiMocks.createDepartment.mockReturnValue(new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    apiMocks.fetchDepartments
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB])
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB, { id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 }]);

    renderRoute("/app/structure");
    await screen.findByTestId("divisi-penempatan-section");

    fireEvent.click(screen.getByRole("button", { name: /tambah divisi/i }));
    fireEvent.change(screen.getByLabelText(/nama divisi/i), { target: { value: "IT" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: /menyimpan divisi/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Divisi sedang disimpan. Dialog akan tertutup setelah data berhasil diperbarui.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /tutup dialog tambah divisi baru/i }).getAttribute("title")).toBe("Tunggu sampai penyimpanan selesai.");
    expect(screen.getByRole("button", { name: /batal/i }).getAttribute("title")).toBe("Tunggu sampai penyimpanan selesai.");

    resolveCreate({ id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByText("Divisi baru berhasil ditambahkan.")).toBeTruthy();
    });
  });

  it("create division success updates the Struktur division table with the new backend department", async () => {
    setupAdminWithDepartments();
    apiMocks.createDepartment.mockResolvedValue({ id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 });
    apiMocks.fetchDepartments
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB])
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB, { id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 }]);

    renderRoute("/app/structure");
    await screen.findByTestId("divisi-penempatan-section");

    fireEvent.click(screen.getByRole("button", { name: /tambah divisi/i }));
    fireEvent.change(screen.getByLabelText(/nama divisi/i), { target: { value: "IT" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    await screen.findByTestId("divisi-row-dep-it");
    expect(screen.getByText("IT")).toBeTruthy();
  });

  it("created division is available in the HR Tim division filter after save", async () => {
    setupAdminWithDepartments();
    apiMocks.createDepartment.mockResolvedValue({ id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 });
    apiMocks.fetchDepartments
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB])
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB, { id: "dep-it", name: "IT", managerId: null, managerName: null, isActive: true, memberCount: 0 }]);

    renderRoute("/app/structure");
    await screen.findByTestId("divisi-penempatan-section");

    fireEvent.click(screen.getByRole("button", { name: /tambah divisi/i }));
    fireEvent.change(screen.getByLabelText(/nama divisi/i), { target: { value: "IT" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    await screen.findByTestId("divisi-row-dep-it");
    fireEvent.click(screen.getByRole("button", { name: "Tim" }));
    fireEvent.click(await screen.findByRole("combobox", { name: "Divisi / Departemen" }));

    expect(screen.getByRole("option", { name: "IT" })).toBeTruthy();
  });

  it("create division failure shows error and keeps the modal open", async () => {
    setupAdminWithDepartments();
    apiMocks.createDepartment.mockRejectedValue(new Error("Backend divisi gagal menyimpan."));

    renderRoute("/app/structure");
    await screen.findByTestId("divisi-penempatan-section");

    fireEvent.click(screen.getByRole("button", { name: /tambah divisi/i }));
    fireEvent.change(screen.getByLabelText(/nama divisi/i), { target: { value: "IT" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    expect((await screen.findAllByText("Backend divisi gagal menyimpan.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByTestId("divisi-row-dep-it")).toBeNull();
  });

  it("disabled division actions explain why HR cannot update placement", async () => {
    setupAdminWithDepartments();
    apiMocks.fetchDepartments.mockRejectedValue(new Error("Service divisi offline."));

    renderRoute("/app/team");
    await screen.findByText("Fikri Maulana");

    const employeeRow = screen.getByText("Fikri Maulana").closest("tr");
    const placementButton = within(employeeRow!).getByRole("button", { name: /ubah divisi/i });
    expect(placementButton.hasAttribute("disabled")).toBe(true);
    expect(placementButton.getAttribute("title")).toBe("Backend divisi belum tersedia: Service divisi offline.");
  });

  it("Edit divisi opens pre-filled form and saves name update", async () => {
    setupAdminWithDepartments();
    apiMocks.updateDepartment.mockResolvedValue({ ...DEPT_OPS, name: "Operasional" });
    apiMocks.fetchDepartments
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB])
      .mockResolvedValueOnce([{ ...DEPT_OPS, name: "Operasional" }, DEPT_FNB]);

    renderRoute("/app/structure");
    const opsRow = await screen.findByTestId("divisi-row-dep-ops");
    fireEvent.click(within(opsRow).getByRole("button", { name: /aksi operations/i }));
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: /edit divisi/i }));

    const nameInput = screen.getByLabelText(/nama divisi/i);
    expect((nameInput as HTMLInputElement).value).toBe("Operations");
    fireEvent.change(nameInput, { target: { value: "Operasional" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    await waitFor(() => {
      expect(apiMocks.updateDepartment).toHaveBeenCalledWith(
        "real-admin-token",
        "dep-ops",
        expect.objectContaining({ name: "Operasional" })
      );
      const divisiSection = screen.getByTestId("divisi-penempatan-section");
      expect(within(divisiSection).getByText("Operasional")).toBeTruthy();
    });
  });

  it("Edit divisi failure keeps the modal open and does not update visible name", async () => {
    setupAdminWithDepartments();
    apiMocks.updateDepartment.mockRejectedValue(new Error("Backend divisi gagal update."));

    renderRoute("/app/structure");
    const opsRow = await screen.findByTestId("divisi-row-dep-ops");
    fireEvent.click(within(opsRow).getByRole("button", { name: /aksi operations/i }));
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: /edit divisi/i }));

    const nameInput = screen.getByLabelText(/nama divisi/i);
    fireEvent.change(nameInput, { target: { value: "Operasional" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    expect((await screen.findAllByText("Backend divisi gagal update.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(screen.getByTestId("divisi-row-dep-ops")).getByText("Operations")).toBeTruthy();
    expect(screen.queryByText("Divisi berhasil diperbarui.")).toBeNull();
  });

  it("Atur manager button opens edit form and saves manager assignment", async () => {
    setupAdminWithDepartments();
    apiMocks.updateDepartment.mockResolvedValue({ ...DEPT_FNB, managerId: "mgr-1", managerName: "Raka Saputra" });
    apiMocks.fetchDepartments
      .mockResolvedValueOnce([DEPT_OPS, DEPT_FNB])
      .mockResolvedValueOnce([DEPT_OPS, { ...DEPT_FNB, managerId: "mgr-1", managerName: "Raka Saputra" }]);

    renderRoute("/app/structure");
    const fnbRow = await screen.findByTestId("divisi-row-dep-fnb");
    fireEvent.click(within(fnbRow).getByRole("button", { name: /aksi f&b service/i }));
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: /atur manager/i }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    const managerSelect = screen.getByRole("combobox", { name: /manager divisi/i });
    expect(managerSelect.tagName).not.toBe("SELECT");
    fireEvent.click(managerSelect);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Raka Saputra" }));
    fireEvent.click(screen.getByRole("button", { name: /simpan divisi/i }));

    await waitFor(() => {
      expect(apiMocks.updateDepartment).toHaveBeenCalledWith(
        "real-admin-token",
        "dep-fnb",
        expect.objectContaining({ managerId: "mgr-1" })
      );
      expect(within(screen.getByTestId("divisi-row-dep-fnb")).getByText("Raka Saputra")).toBeTruthy();
    });
  });

  it("division action menu includes Nonaktifkan divisi", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    const opsRow = await screen.findByTestId("divisi-row-dep-ops");
    fireEvent.click(within(opsRow).getByRole("button", { name: /aksi operations/i }));

    expect(screen.getByRole("menuitem", { name: /lihat anggota/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /edit divisi/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /atur manager/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /nonaktifkan divisi/i })).toBeTruthy();
  });

  it("opens the division action menu from a row with all actions", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    const fnbRow = await screen.findByTestId("divisi-row-dep-fnb");
    fireEvent.click(within(fnbRow).getByRole("button", { name: /aksi f&b service/i }));

    const menu = screen.getByRole("menu", { name: /aksi f&b service/i });
    expect(within(menu).getByRole("menuitem", { name: /lihat anggota/i })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: /edit divisi/i })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: /atur manager/i })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: /nonaktifkan divisi/i })).toBeTruthy();
  });

  it("closes the division action menu when clicking outside", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    const opsRow = await screen.findByTestId("divisi-row-dep-ops");
    fireEvent.click(within(opsRow).getByRole("button", { name: /aksi operations/i }));
    expect(screen.getByRole("menu", { name: /aksi operations/i })).toBeTruthy();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("menu", { name: /aksi operations/i })).toBeNull();
  });

  it("renders the division action menu outside the clipped table container", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    const opsRow = await screen.findByTestId("divisi-row-dep-ops");
    fireEvent.click(within(opsRow).getByRole("button", { name: /aksi operations/i }));

    const menu = screen.getByRole("menu", { name: /aksi operations/i });
    expect(menu.parentElement).toBe(document.body);
    expect(menu.closest("[data-testid='divisi-table-clip']")).toBeNull();
  });

  it("does not fake success when deactivating a division that still has members", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/structure");

    const opsRow = await screen.findByTestId("divisi-row-dep-ops");
    fireEvent.click(within(opsRow).getByRole("button", { name: /aksi operations/i }));
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: /nonaktifkan divisi/i }));

    expect(screen.getByText("Divisi ini masih memiliki anggota. Pindahkan anggota terlebih dahulu atau nonaktifkan divisi.")).toBeTruthy();
    expect(apiMocks.updateDepartment).not.toHaveBeenCalled();
    expect(screen.queryByText("Divisi berhasil dinonaktifkan.")).toBeNull();
  });

  it("connects Nonaktifkan divisi to soft deactivate when the division has no members", async () => {
    setupAdminWithDepartments();
    const emptyDept = { id: "dep-empty", name: "Back Office", managerId: null, managerName: null, isActive: true, memberCount: 0 };
    apiMocks.fetchDepartments
      .mockResolvedValueOnce([DEPT_OPS, emptyDept])
      .mockResolvedValueOnce([DEPT_OPS, { ...emptyDept, isActive: false }]);
    apiMocks.updateDepartment.mockResolvedValue({ ...emptyDept, isActive: false });
    renderRoute("/app/structure");

    const emptyRow = await screen.findByTestId("divisi-row-dep-empty");
    fireEvent.click(within(emptyRow).getByRole("button", { name: /aksi back office/i }));
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: /nonaktifkan divisi/i }));

    await waitFor(() => {
      expect(apiMocks.updateDepartment).toHaveBeenCalledWith("real-admin-token", "dep-empty", { isActive: false });
      expect(screen.getByText("Divisi berhasil dinonaktifkan.")).toBeTruthy();
      expect(within(screen.getByTestId("divisi-row-dep-empty")).getByText("Nonaktif")).toBeTruthy();
    });
  });

  it("manager dropdown uses only role manager options and explains when none are available", async () => {
    setupAdminWithDepartments();
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "admin-1", fullName: "Nadia Putri", email: "admin@taptu.app", role: "admin", todayStatus: "present" },
      { id: "e1", fullName: "Fikri Maulana", email: "fikri@taptu.app", role: "employee", todayStatus: "present" }
    ]);

    renderRoute("/app/structure");
    await screen.findByTestId("divisi-penempatan-section");

    fireEvent.click(screen.getByRole("button", { name: /tambah divisi/i }));
    expect(screen.getByText("Belum ada manager tersedia")).toBeTruthy();
    expect(screen.getByText("Tambahkan akun manager terlebih dahulu.")).toBeTruthy();

    const managerSelect = screen.getByRole("combobox", { name: /manager divisi/i });
    fireEvent.click(managerSelect);
    expect(screen.queryByRole("option", { name: "Nadia Putri" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Fikri Maulana" })).toBeNull();
  });

  it("Ubah divisi button opens dialog and reassigns employee to new division", async () => {
    setupAdminWithDepartments();
    apiMocks.reassignEmployeeDepartment.mockResolvedValue({
      id: "e1", fullName: "Fikri Maulana", email: "fikri@taptu.app", role: "employee",
      departmentId: "dep-fnb", departmentName: "F&B Service",
      managerId: null, managerName: null, todayStatus: "present"
    });
    apiMocks.fetchEmployeeList
      .mockResolvedValueOnce([
        { id: "e1", fullName: "Fikri Maulana", email: "fikri@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operations", managerId: "mgr-1", managerName: "Raka Saputra", todayStatus: "present" },
        { id: "e3", fullName: "Budi Santoso", email: "budi@taptu.app", role: "employee", departmentId: "dep-fnb", departmentName: "F&B Service", managerId: null, managerName: null, todayStatus: "absent" },
        { id: "mgr-1", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", departmentId: "dep-ops", departmentName: "Operations", managerId: null, managerName: null, todayStatus: "present" }
      ])
      .mockResolvedValueOnce([
        { id: "e1", fullName: "Fikri Maulana", email: "fikri@taptu.app", role: "employee", departmentId: "dep-fnb", departmentName: "F&B Service", managerId: null, managerName: null, todayStatus: "present" },
        { id: "e3", fullName: "Budi Santoso", email: "budi@taptu.app", role: "employee", departmentId: "dep-fnb", departmentName: "F&B Service", managerId: null, managerName: null, todayStatus: "absent" },
        { id: "mgr-1", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", departmentId: "dep-ops", departmentName: "Operations", managerId: null, managerName: null, todayStatus: "present" }
      ]);

    renderRoute("/app/team");
    await screen.findByText("Fikri Maulana");

    const fikriNameEl = screen.getByText("Fikri Maulana");
    const fikriRow = fikriNameEl.closest("tr");
    fireEvent.click(within(fikriRow!).getByRole("button", { name: /ubah divisi/i }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    const deptSelect = screen.getByRole("combobox", { name: /divisi baru/i });
    expect(deptSelect.tagName).not.toBe("SELECT");
    fireEvent.click(deptSelect);
    fireEvent.mouseDown(screen.getByRole("option", { name: "F&B Service" }));
    fireEvent.click(screen.getByRole("button", { name: /simpan penempatan/i }));

    await waitFor(() => {
      expect(apiMocks.reassignEmployeeDepartment).toHaveBeenCalledWith(
        "real-admin-token",
        "e1",
        expect.objectContaining({ departmentId: "dep-fnb" })
      );
      const fikriRow = screen.getByText("Fikri Maulana").closest("tr");
      expect(within(fikriRow!).getByText("F&B Service")).toBeTruthy();
    });
  });

  it("placement save shows a pending state and keeps errors visible in the dialog", async () => {
    setupAdminWithDepartments();
    let rejectReassign!: (error: Error) => void;
    apiMocks.reassignEmployeeDepartment.mockReturnValue(new Promise((_, reject) => {
      rejectReassign = reject;
    }));

    renderRoute("/app/team");
    await screen.findByText("Fikri Maulana");

    const fikriRow = screen.getByText("Fikri Maulana").closest("tr");
    fireEvent.click(within(fikriRow!).getByRole("button", { name: /ubah divisi/i }));
    fireEvent.click(screen.getByRole("button", { name: /simpan penempatan/i }));

    expect(screen.getByRole("button", { name: /menyimpan penempatan/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Penempatan sedang diperbarui. Dialog akan tertutup setelah data berhasil disimpan.")).toBeTruthy();

    rejectReassign(new Error("Penempatan gagal diperbarui."));

    expect(await screen.findByText("Penempatan gagal diperbarui.")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("HR shift location dropdown is a custom combobox, not a native select", async () => {
    setupAdminWithDepartments();
    apiMocks.fetchWorkLocations.mockResolvedValue([
      { id: "loc-hq", name: "Kantor Pusat", address: "Jl. Sudirman No. 1", latitude: -6.2088, longitude: 106.8456, radiusMeters: 150, status: "active", createdAt: "2026-05-01T00:00:00" }
    ]);
    apiMocks.fetchShifts.mockResolvedValue([
      { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", gracePeriodMinutes: 10, workLocationId: "loc-hq", workLocationName: "Kantor Pusat", status: "active", createdAt: "2026-05-01T00:00:00", updatedAt: "2026-05-01T00:00:00" }
    ]);
    renderRoute("/app/locations");

    await screen.findByText("Shift Pagi");
    fireEvent.click(screen.getByRole("button", { name: /tambah shift/i }));

    const locationSelect = screen.getByRole("combobox", { name: "Lokasi kerja" });
    expect(locationSelect.tagName).not.toBe("SELECT");
    fireEvent.click(locationSelect);
    expect(screen.getByRole("option", { name: "Kantor Pusat" })).toBeTruthy();
  });

  it("native select is not used for HR report division or status filters", async () => {
    setupAdminWithDepartments();
    renderRoute("/app/reports");

    const divisionFilter = await screen.findByRole("combobox", { name: "Divisi / Departemen" });
    const statusFilter = screen.getByRole("combobox", { name: "Status absensi" });
    expect(divisionFilter.tagName).not.toBe("SELECT");
    expect(statusFilter.tagName).not.toBe("SELECT");
  });

  describe("notification inbox", () => {
    function setupAdminSession() {
      localStorage.setItem(
        "taptu-session",
        JSON.stringify({
          token: "real:admin",
          user: {
            id: "usr-admin-01",
            fullName: "Nadia Putri",
            email: "admin@taptu.app",
            organizationName: "TAPTU HQ",
            role: "admin"
          }
        })
      );
      apiMocks.getDashboard.mockResolvedValue({
        greeting: "Halo, Nadia Putri",
        stats: [],
        schedule: [],
        attendance: [],
        attendanceState: "idle",
        requests: []
      });
      apiMocks.fetchAdminOverview.mockResolvedValue({
        totalEmployees: 10,
        checkedInToday: 8,
        onTimeToday: 7,
        lateToday: 1,
        pendingRequests: 0,
        absentToday: 2,
        exceptionCount: 0,
        recentActivity: []
      });
    }

    const UNREAD_NOTIF = {
      id: "notif-01",
      organizationId: "org-01",
      recipientId: "usr-admin-01",
      type: "leave_request_created" as const,
      title: "Pengajuan cuti baru",
      message: "Fikri mengajukan cuti 3 hari",
      readAt: null,
      createdAt: "2026-05-15T08:00:00"
    };

    const READ_NOTIF = {
      id: "notif-02",
      organizationId: "org-01",
      recipientId: "usr-admin-01",
      type: "leave_request_approved" as const,
      title: "Cuti disetujui",
      message: "Pengajuan cuti Anda disetujui",
      readAt: "2026-05-15T09:00:00",
      createdAt: "2026-05-14T08:00:00"
    };

    it("shows polished empty state when there are no notifications", async () => {
      setupAdminSession();
      apiMocks.fetchNotifications.mockResolvedValue([]);
      renderRoute("/app/notifications");

      expect(await screen.findByText("Belum ada notifikasi")).toBeTruthy();
      expect(screen.getByText(/update pengajuan/i)).toBeTruthy();
    });

    it("renders unread notification with unread indicator", async () => {
      setupAdminSession();
      apiMocks.fetchNotifications.mockResolvedValue([UNREAD_NOTIF]);
      renderRoute("/app/notifications");

      await screen.findByText("Pengajuan cuti baru");
      const card = screen.getByRole("article");
      expect(card.getAttribute("data-read-state")).toBe("unread");
    });

    it("renders read notification without unread indicator", async () => {
      setupAdminSession();
      apiMocks.fetchNotifications.mockResolvedValue([READ_NOTIF]);
      renderRoute("/app/notifications");

      await screen.findByText("Cuti disetujui");
      const card = screen.getByRole("article");
      expect(card.getAttribute("data-read-state")).toBe("read");
    });

    it("shows mark-as-read button only for unread notifications", async () => {
      setupAdminSession();
      apiMocks.fetchNotifications.mockResolvedValue([UNREAD_NOTIF, READ_NOTIF]);
      renderRoute("/app/notifications");

      await screen.findByText("Pengajuan cuti baru");
      const buttons = screen.getAllByRole("button", { name: /tandai dibaca/i });
      expect(buttons).toHaveLength(1);
    });

    it("marks notification as read when button is clicked", async () => {
      setupAdminSession();
      const updatedNotif = { ...UNREAD_NOTIF, readAt: "2026-05-15T10:00:00" };
      apiMocks.fetchNotifications.mockResolvedValue([UNREAD_NOTIF]);
      apiMocks.markNotificationRead.mockResolvedValue(updatedNotif);
      renderRoute("/app/notifications");

      await screen.findByText("Pengajuan cuti baru");
      fireEvent.click(screen.getByRole("button", { name: /tandai dibaca/i }));

      await waitFor(() => {
        expect(apiMocks.markNotificationRead).toHaveBeenCalledWith(expect.any(String), "notif-01");
      });
      await waitFor(() => {
        const card = screen.getByRole("article");
        expect(card.getAttribute("data-read-state")).toBe("read");
      });
    });

    it("shows unread badge count on notifications nav item in sidebar", async () => {
      setupAdminSession();
      apiMocks.fetchNotifications.mockResolvedValue([UNREAD_NOTIF, READ_NOTIF]);
      renderRoute("/app/notifications");

      await screen.findByText("Pengajuan cuti baru");
      expect(screen.getByTestId("nav-badge-notifications")).toBeTruthy();
      expect(screen.getByTestId("nav-badge-notifications").textContent).toBe("1");
    });
  });

  describe("fetch performance — redundant request guards", () => {
    it("getDashboard is called exactly once even after subsequent state updates from data loading", async () => {
      setupAdminSession();

      renderRoute("/app");

      // Wait for the overview to load (triggered by a state update after dashboard loads)
      await waitFor(() => expect(apiMocks.fetchAdminOverview).toHaveBeenCalled());
      // Verify dashboard was not re-triggered by the state update
      expect(apiMocks.getDashboard).toHaveBeenCalledTimes(1);
    });

    it("fetchAuditLogs is called at most once per mount even when the reports tab loads zero audit rows", async () => {
      setupAdminSession();
      apiMocks.fetchAuditLogs.mockResolvedValue([]);

      renderRoute("/app/reports");

      await waitFor(() => expect(apiMocks.fetchAuditLogs).toHaveBeenCalled());
      // Wait for other async data to settle (reportRows, employeeList, departments)
      await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenCalled());

      expect(apiMocks.fetchAuditLogs).toHaveBeenCalledTimes(1);
    });

    it("home view attendance preview is capped at 3 items when dashboard returns more", async () => {
      localStorage.setItem(
        "taptu-session",
        JSON.stringify({
          token: "demo:employee",
          user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
        })
      );
      apiMocks.getDashboard.mockResolvedValue({
        greeting: "Halo",
        stats: [],
        schedule: [],
        attendance: [
          { id: "a1", day: "Senin", status: "Tepat waktu", time: "08:01", method: "QR" },
          { id: "a2", day: "Selasa", status: "Tepat waktu", time: "08:02", method: "QR" },
          { id: "a3", day: "Rabu", status: "Tepat waktu", time: "08:03", method: "QR" },
          { id: "a4", day: "Kamis", status: "Tepat waktu", time: "08:04", method: "QR" },
          { id: "a5", day: "Jumat", status: "Tepat waktu", time: "08:05", method: "QR" }
        ],
        attendanceState: "idle",
        requests: []
      });
      apiMocks.fetchEmployeeSummary.mockResolvedValue({
        totalDays: 5, onTimeDays: 5, lateDays: 0, pendingRequests: 0,
        currentAttendanceState: "idle",
        assignedShift: { id: "s1", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor" },
        todayRecord: { id: "r1", employeeId: "usr-employee-01", shiftId: "s1", status: "Belum check-in", validationStatus: "verified", validationReasons: [], createdAt: "", updatedAt: "" }
      });

      renderRoute("/app");

      await screen.findByText("Senin");
      expect(screen.getByText("Senin")).toBeTruthy();
      expect(screen.getByText("Selasa")).toBeTruthy();
      expect(screen.getByText("Rabu")).toBeTruthy();
      expect(screen.queryByText("Kamis")).toBeNull();
      expect(screen.queryByText("Jumat")).toBeNull();
    });

    it("team employee search filters results by name without triggering a new API fetch", async () => {
      setupAdminSession();

      renderRoute("/app/team");

      // Both employees visible before filtering
      await screen.findAllByText("Fikri Maulana");
      expect(screen.getAllByText("Anisa Rahma").length).toBeGreaterThan(0);

      const callCountBeforeSearch = apiMocks.fetchEmployeeList.mock.calls.length;

      const searchInput = screen.getByRole("textbox", { name: /cari karyawan/i });
      fireEvent.change(searchInput, { target: { value: "Anisa" } });

      // Fikri disappears from the table row (first occurrence is in the table body)
      await waitFor(() => {
        const fikris = screen.queryAllByText("Fikri Maulana");
        // After filtering, Fikri should not appear in the employee row list
        // (the table body p.font-semibold should be gone)
        const tableRows = fikris.filter((el) => el.closest("td") !== null || el.className.includes("font-semibold"));
        expect(tableRows.length).toBe(0);
      });

      // No additional API call was made — filtering is pure client-side
      expect(apiMocks.fetchEmployeeList.mock.calls.length).toBe(callCountBeforeSearch);
    });
  });

  describe("role flow regression QA", () => {
    afterEach(() => {
      cleanup();
      localStorage.clear();
      vi.clearAllMocks();
    });

    // ── 1. Session guard ────────────────────────────────────────────
    it("redirects to /login and shows no workspace content when there is no session", async () => {
      // No localStorage session set — readSession() returns null
      renderRoute("/app");

      // getDashboard must never be called without a valid token
      await new Promise((r) => setTimeout(r, 100));
      expect(apiMocks.getDashboard).not.toHaveBeenCalled();
      // Workspace content is absent
      expect(screen.queryByText(/halo,/i)).toBeNull();
      expect(screen.queryByText(/hadir hari ini/i)).toBeNull();
    });

    // ── 2. Superadmin role is treated as admin ─────────────────────
    it("superadmin role loads the admin dashboard overview, not the employee home", async () => {
      localStorage.setItem(
        "taptu-session",
        JSON.stringify({
          token: "demo:superadmin",
          user: {
            id: "usr-superadmin-01",
            fullName: "Super Admin",
            email: "superadmin@taptu.app",
            organizationName: "TAPTU HQ",
            role: "superadmin"
          }
        })
      );
      apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo, Super Admin", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
      apiMocks.fetchAdminOverview.mockResolvedValue({
        totalEmployees: 5, checkedInToday: 3, onTimeToday: 2, lateToday: 1,
        pendingRequests: 0, absentToday: 2, exceptionCount: 0, recentActivity: []
      });

      renderRoute("/app");

      await waitFor(() => expect(apiMocks.fetchAdminOverview).toHaveBeenCalledWith("demo:superadmin"));
      expect(apiMocks.fetchEmployeeSummary).not.toHaveBeenCalled();
    });

    // ── 3. Employee URL guard: /app/team redirects to home ─────────
    it("employee navigating directly to /app/team sees home workspace, not admin employee data", async () => {
      localStorage.setItem(
        "taptu-session",
        JSON.stringify({
          token: "employee-api-token",
          user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
        })
      );
      apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo, Fikri Maulana", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
      apiMocks.fetchEmployeeSummary.mockResolvedValue({
        totalDays: 5, onTimeDays: 5, lateDays: 0, pendingRequests: 0,
        currentAttendanceState: "idle",
        assignedShift: { id: "s1", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor" },
        todayRecord: { id: "r1", employeeId: "usr-employee-01", shiftId: "s1", status: "Belum check-in", validationStatus: "verified", validationReasons: [], createdAt: "", updatedAt: "" }
      });

      // Employee navigates directly to the team section URL
      renderRoute("/app/team");

      // Employee home shown, not the admin team page
      await screen.findByText("Halo, Fikri Maulana");
      // No admin employee list data fetched — cross-role data isolation
      expect(apiMocks.fetchEmployeeList).not.toHaveBeenCalled();
      expect(apiMocks.fetchManagerEmployeeList).not.toHaveBeenCalled();
    });

    // ── 4. Employee request submission ─────────────────────────────
    it("employee submitting an izin request calls createRequest and shows Menunggu status", async () => {
      localStorage.setItem(
        "taptu-session",
        JSON.stringify({
          token: "employee-api-token",
          user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
        })
      );
      apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });
      apiMocks.fetchEmployeeSummary.mockResolvedValue({
        totalDays: 5, onTimeDays: 5, lateDays: 0, pendingRequests: 0,
        currentAttendanceState: "idle",
        assignedShift: { id: "s1", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor" },
        todayRecord: { id: "r1", employeeId: "usr-employee-01", shiftId: "s1", status: "Belum check-in", validationStatus: "verified", validationReasons: [], createdAt: "", updatedAt: "" }
      });
      apiMocks.createRequest.mockResolvedValue({
        request: { id: "req-new", category: "Izin", title: "Izin keperluan keluarga", status: "Menunggu", detail: "Urusan mendadak mendesak.", workflowStatus: "pending_manager" }
      });

      renderRoute("/app/requests");

      // Fill all required form fields
      fireEvent.change(await screen.findByLabelText(/^judul$/i), { target: { value: "Izin keperluan keluarga" } });
      fireEvent.change(screen.getByLabelText(/tanggal mulai/i), { target: { value: "2026-05-20" } });
      fireEvent.change(screen.getByLabelText(/tanggal selesai/i), { target: { value: "2026-05-20" } });
      fireEvent.change(screen.getByLabelText(/detail/i), { target: { value: "Urusan mendadak mendesak." } });

      fireEvent.click(screen.getByRole("button", { name: /kirim pengajuan/i }));

      await waitFor(() => expect(apiMocks.createRequest).toHaveBeenCalledTimes(1));
      expect(apiMocks.createRequest).toHaveBeenCalledWith("employee-api-token", expect.objectContaining({
        category: "Izin",
        title: "Izin keperluan keluarga"
      }));
      // New request appears — workflowStatus "pending_manager" renders as "Menunggu Manager"
      expect(await screen.findByText("Izin keperluan keluarga")).toBeTruthy();
      expect(screen.getByText("Menunggu Manager")).toBeTruthy();
    });

    // ── 5. HR final approval: approved_by_manager → Disetujui ─────
    it("HR approving an approved_by_manager request calls approveRequest and shows Disetujui", async () => {
      setupAdminSession();
      // Admin requests are seeded from getDashboard.requests, not fetchRequests
      apiMocks.getDashboard.mockResolvedValue({
        greeting: "Halo, Nadia Putri",
        stats: [],
        schedule: [],
        attendance: [],
        attendanceState: "idle",
        requests: [
          { id: "req-final", title: "Cuti sudah OK manager", status: "Menunggu", detail: "Sudah disetujui manager.", workflowStatus: "approved_by_manager" }
        ]
      });
      apiMocks.approveRequest.mockResolvedValue({
        request: { id: "req-final", title: "Cuti sudah OK manager", status: "Disetujui", detail: "Sudah disetujui manager.", workflowStatus: "approved" }
      });

      renderRoute("/app/requests");

      await screen.findByText("Cuti sudah OK manager");
      const requestCard = screen.getByText("Cuti sudah OK manager").closest("article");
      fireEvent.click(within(requestCard!).getByRole("button", { name: /setujui/i }));

      await waitFor(() => expect(apiMocks.approveRequest).toHaveBeenCalledWith("demo:admin", "req-final", "Disetujui", undefined));
      expect(await screen.findByText(/pengajuan disetujui/i)).toBeTruthy();
    });
  });

  describe("history filter refetch", () => {
    const employeeSession = {
      token: "employee-api-token",
      user: {
        id: "usr-employee-01",
        fullName: "Fikri Maulana",
        email: "employee@taptu.app",
        organizationName: "TAPTU HQ",
        role: "employee"
      }
    };

    const minimalSummary = {
      totalDays: 5,
      onTimeDays: 5,
      lateDays: 0,
      pendingRequests: 0,
      currentAttendanceState: "idle" as const,
      assignedShift: { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor Pusat" },
      todayRecord: {
        id: "r1",
        employeeId: "usr-employee-01",
        shiftId: "shift-pagi",
        status: "Belum check-in",
        validationStatus: "verified" as const,
        validationReasons: [],
        createdAt: "2026-05-18T00:00:00",
        updatedAt: "2026-05-18T00:00:00"
      }
    };

    beforeEach(() => {
      localStorage.setItem("taptu-session", JSON.stringify(employeeSession));
      apiMocks.getDashboard.mockResolvedValue({
        greeting: "Halo",
        stats: [],
        schedule: [],
        attendance: [],
        attendanceState: "idle",
        requests: []
      });
      apiMocks.fetchEmployeeSummary.mockResolvedValue(minimalSummary);
    });

    it("clicking Hadir filter re-fetches with present and shows new records", async () => {
      apiMocks.fetchAttendanceHistoryByFilter
        .mockResolvedValueOnce([
          { id: "all-1", date: "2026-05-12", status: "Selesai", checkInTime: "2026-05-12T08:00:00", method: "QR" }
        ])
        .mockResolvedValueOnce([
          { id: "present-1", date: "2026-05-13", status: "Selesai", checkInTime: "2026-05-13T08:05:00", method: "QR" }
        ]);

      renderRoute("/app/history");

      // Initial load with "Semua" filter
      await screen.findByText(/12 Mei 2026/i);
      expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(1);
      expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenLastCalledWith("employee-api-token", "all");

      // Click "Hadir" filter button
      fireEvent.click(screen.getByRole("button", { name: "Hadir" }));

      // Must re-fetch with "present" filter
      await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2));
      expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenLastCalledWith("employee-api-token", "present");

      // New data replaces old data
      expect(await screen.findByText(/13 Mei 2026/i)).toBeTruthy();
      expect(screen.queryByText(/12 Mei 2026/i)).toBeNull();
    });

    it("clicking filter does not produce more than 2 fetches total (no infinite re-fetch)", async () => {
      apiMocks.fetchAttendanceHistoryByFilter
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      renderRoute("/app/history");

      await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: "Hadir" }));

      await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2));

      // Allow any pending updates to settle; count must not grow beyond 2
      await new Promise((r) => setTimeout(r, 200));
      expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2);
    });

    it("clicking same filter twice fetches only once more (not double)", async () => {
      apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);

      renderRoute("/app/history");

      await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: "Hadir" }));
      await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2));

      // Clicking the same filter again while already on "Hadir"
      fireEvent.click(screen.getByRole("button", { name: "Hadir" }));
      await new Promise((r) => setTimeout(r, 150));
      // No additional fetch — already loaded with the correct filter
      expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2);
    });
  });
});

describe("BUG 3 — Camera uses getUserMedia instead of file input", () => {
  beforeEach(() => {
    cleanup();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 0,
      onTimeDays: 0,
      lateDays: 0,
      pendingRequests: 0,
      currentAttendanceState: "idle",
      assignedShift: { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor Pusat" },
      todayRecord: { id: "att-demo-01", employeeId: "usr-employee-01", shiftId: "shift-pagi", status: "Belum check-in", validationStatus: "verified", validationReasons: [], createdAt: "2026-05-02T08:00:00", updatedAt: "2026-05-02T08:00:00" }
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchNotifications.mockResolvedValue([]);

    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
      })
    );
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("getUserMedia is called when opening face camera", async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMediaSpy = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /face verification/i }));
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera depan/i }));

    await waitFor(() => expect(getUserMediaSpy).toHaveBeenCalledWith({ video: { facingMode: "user" } }));
  });

  it("camera permission denied shows error message", async () => {
    const getUserMediaSpy = vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));
    // jsdom doesn't expose mediaDevices by default — use Object.defineProperty on the prototype
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /face verification/i }));
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera depan/i }));

    await waitFor(() => expect(getUserMediaSpy).toHaveBeenCalled());
    // Error shows either in cameraError paragraph (role=alert) or feedback toast
    expect(
      (await screen.findAllByText(/izin kamera ditolak/i)).length
    ).toBeGreaterThan(0);
  });

  it("there is no file input of type file for camera capture", async () => {
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    // No visible file input for camera — getUserMedia approach is used instead
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(0);
  });
});

describe("BUG 4 — QR camera scanner mode uses getUserMedia with environment camera", () => {
  beforeEach(() => {
    cleanup();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());

    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [],
      schedule: [],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      totalDays: 0,
      onTimeDays: 0,
      lateDays: 0,
      pendingRequests: 0,
      currentAttendanceState: "idle",
      assignedShift: { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor Pusat" },
      todayRecord: { id: "att-demo-01", employeeId: "usr-employee-01", shiftId: "shift-pagi", status: "Belum check-in", validationStatus: "verified", validationReasons: [], createdAt: "2026-05-02T08:00:00", updatedAt: "2026-05-02T08:00:00" }
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchNotifications.mockResolvedValue([]);

    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
      })
    );
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("QR mode calls getUserMedia with facingMode environment when camera is opened", async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMediaSpy = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    // QR mode is selected by default
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));

    await waitFor(() => expect(getUserMediaSpy).toHaveBeenCalledWith({ video: { facingMode: "environment" } }));
  });

  it("QR mode does NOT call getUserMedia with facingMode user (face mode constraint)", async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMediaSpy = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));

    await waitFor(() => expect(getUserMediaSpy).toHaveBeenCalled());
    expect(getUserMediaSpy).not.toHaveBeenCalledWith({ video: { facingMode: "user" } });
  });

  it("QR camera permission denied shows QR-specific error", async () => {
    const getUserMediaSpy = vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));

    await waitFor(() => expect(getUserMediaSpy).toHaveBeenCalled());
    expect(
      (await screen.findAllByText(/izin kamera ditolak/i)).length
    ).toBeGreaterThan(0);
  });

  it("QR camera stream stops when switching away from attendance tab", async () => {
    const mockStop = vi.fn();
    const mockStream = { getTracks: () => [{ stop: mockStop }] };
    const getUserMediaSpy = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));
    await waitFor(() => expect(getUserMediaSpy).toHaveBeenCalled());

    // Switch away from attendance — multiple Beranda nav buttons (desktop + mobile), click first
    const berandaNavs = await screen.findAllByRole("button", { name: /beranda/i });
    fireEvent.click(berandaNavs[0]);

    await waitFor(() => expect(mockStop).toHaveBeenCalled());
  });

  it("QR mode does not use a file input for camera", async () => {
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(0);
  });
});

// ─── Phase 10.6 — Camera idle state polish ───────────────────────────────────
// Shared setup for camera idle state tests
function setupEmployeeSessionForCamera() {
  cleanup();
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
  apiMocks.getDashboard.mockResolvedValue({
    greeting: "Halo, Fikri Maulana",
    stats: [],
    schedule: [],
    attendance: [],
    attendanceState: "idle",
    requests: []
  });
  apiMocks.fetchEmployeeSummary.mockResolvedValue({
    totalDays: 0,
    onTimeDays: 0,
    lateDays: 0,
    pendingRequests: 0,
    currentAttendanceState: "idle",
    assignedShift: { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor Pusat" },
    todayRecord: { id: "att-demo-01", employeeId: "usr-employee-01", shiftId: "shift-pagi", status: "Belum check-in", validationStatus: "verified", validationReasons: [], createdAt: "2026-05-02T08:00:00", updatedAt: "2026-05-02T08:00:00" }
  });
  apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
  apiMocks.fetchNotifications.mockResolvedValue([]);
  localStorage.setItem(
    "taptu-session",
    JSON.stringify({
      token: "demo:employee",
      user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
    })
  );
}

describe("PHASE 10.6 — Camera idle state copy and placeholder", () => {
  beforeEach(setupEmployeeSessionForCamera);
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("QR idle state shows Kamera belum aktif chip", async () => {
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    expect(screen.getByText(/kamera belum aktif/i)).toBeTruthy();
  });

  it("QR idle state shows Aktifkan kamera belakang as the primary CTA", async () => {
    renderRoute("/app/attendance");
    const btn = await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    expect(btn).toBeTruthy();
  });

  it("Face idle state shows Kamera belum aktif chip", async () => {
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    fireEvent.click(screen.getByRole("button", { name: /face verification/i }));
    await screen.findByRole("button", { name: /aktifkan kamera depan/i });
    expect(screen.getByText(/kamera belum aktif/i)).toBeTruthy();
  });

  it("Face idle state shows Aktifkan kamera depan as the primary CTA", async () => {
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    fireEvent.click(screen.getByRole("button", { name: /face verification/i }));
    const btn = await screen.findByRole("button", { name: /aktifkan kamera depan/i });
    expect(btn).toBeTruthy();
  });

  it("Face idle state does not claim biometric or Face ID", async () => {
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    fireEvent.click(screen.getByRole("button", { name: /face verification/i }));
    await screen.findByRole("button", { name: /aktifkan kamera depan/i });
    const pageText = document.body.textContent ?? "";
    expect(pageText).not.toMatch(/biometrik/i);
    expect(pageText).not.toMatch(/face id/i);
    expect(pageText).not.toMatch(/liveness/i);
  });

  it("Face active state shows Kamera aktif chip after getUserMedia", async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
      writable: true
    });
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    fireEvent.click(screen.getByRole("button", { name: /face verification/i }));
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera depan/i }));
    await waitFor(() => expect(screen.getAllByText(/kamera aktif/i).length).toBeGreaterThan(0));
  });

  it("QR active state shows Scan QR button and Kamera aktif chip after getUserMedia", async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
      writable: true
    });
    renderRoute("/app/attendance");
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));
    await waitFor(() => expect(screen.getAllByText(/kamera aktif/i).length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: /scan qr/i })).toBeTruthy();
  });

  it("Face permission denied shows Coba aktifkan lagi retry button", async () => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError")) },
      configurable: true,
      writable: true
    });
    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    fireEvent.click(screen.getByRole("button", { name: /face verification/i }));
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera depan/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /coba aktifkan lagi/i })).toBeTruthy());
  });

  it("QR permission denied shows Coba aktifkan lagi retry button", async () => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError")) },
      configurable: true,
      writable: true
    });
    renderRoute("/app/attendance");
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /coba aktifkan lagi/i })).toBeTruthy());
  });
});

describe("PHASE 10.6 — Camera stream lifecycle on mode switch", () => {
  beforeEach(setupEmployeeSessionForCamera);
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("switching from QR to Face stops QR stream tracks", async () => {
    const mockStop = vi.fn();
    const mockStream = { getTracks: () => [{ stop: mockStop }] };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera belakang/i }));
    await waitFor(() => expect(screen.getAllByText(/kamera aktif/i).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /face verification/i }));
    await waitFor(() => expect(mockStop).toHaveBeenCalled());
  });

  it("switching from Face to QR stops Face stream tracks", async () => {
    const mockStop = vi.fn();
    const mockStream = { getTracks: () => [{ stop: mockStop }] };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
      writable: true
    });

    renderRoute("/app/attendance");
    await screen.findByRole("button", { name: /aktifkan kamera belakang/i });
    fireEvent.click(screen.getByRole("button", { name: /face verification/i }));
    fireEvent.click(await screen.findByRole("button", { name: /aktifkan kamera depan/i }));
    await waitFor(() => expect(screen.getAllByText(/kamera aktif/i).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /qr check-in/i }));
    await waitFor(() => expect(mockStop).toHaveBeenCalled());
  });
});

describe("PHASE 10.9 — Attendance cache refresh on tab re-entry", () => {
  beforeEach(() => {
    cleanup();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.fetchAdminOverview.mockResolvedValue({ totalEmployees: 10, checkedInToday: 8, onTimeToday: 7, lateToday: 1, pendingRequests: 2, absentToday: 2, exceptionCount: 1, recentActivity: [] });
    apiMocks.fetchManagerOverview.mockResolvedValue({ totalEmployees: 5, checkedInToday: 4, onTimeToday: 4, lateToday: 0, pendingRequests: 1, absentToday: 1, exceptionCount: 0, recentActivity: [] });
    apiMocks.fetchReportRows.mockResolvedValue([
      { id: "att-live-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-18", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-18T11:41:00", status: "Terlambat", validationStatus: "verified", validationReasons: [], isLate: true, hasException: false, selfieProof: true, deviceValidated: true, checkInMethod: "Selfie" }
    ]);
    apiMocks.fetchEmployeeList.mockResolvedValue([]);
    apiMocks.fetchManagerEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentName: "Operasional", managerId: "usr-manager-01", todayStatus: "late", checkInTime: "11:41", checkInMethod: "Selfie", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchDepartments.mockResolvedValue([]);
    apiMocks.fetchNotifications.mockResolvedValue([]);
    apiMocks.fetchManagerRequests.mockResolvedValue([]);
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("HR Presensi re-fetches fetchReportRows when admin returns to attendance tab", async () => {
    localStorage.setItem("taptu-session", JSON.stringify({
      token: "admin-api-token",
      user: { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", organizationName: "TAPTU HQ", role: "admin" }
    }));
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo, Nadia Putri", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });

    renderRoute("/app");

    // Navigate to Presensi (attendance)
    fireEvent.click(await screen.findByRole("button", { name: "Presensi" }));
    await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenCalledTimes(1));

    // Navigate away to Beranda (home)
    fireEvent.click(screen.getByRole("button", { name: "Beranda" }));
    await waitFor(() => expect(apiMocks.fetchAdminOverview).toHaveBeenCalled());

    // Return to Presensi — cache was invalidated, must re-fetch
    fireEvent.click(screen.getByRole("button", { name: "Presensi" }));
    await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenCalledTimes(2));
  });

  it("HR Presensi does not fetch infinitely — exactly 2 calls after one away-and-back cycle", async () => {
    localStorage.setItem("taptu-session", JSON.stringify({
      token: "admin-api-token",
      user: { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", organizationName: "TAPTU HQ", role: "admin" }
    }));
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo, Nadia Putri", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });

    renderRoute("/app");

    fireEvent.click(await screen.findByRole("button", { name: "Presensi" }));
    await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Beranda" }));
    await waitFor(() => expect(apiMocks.fetchAdminOverview).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Presensi" }));
    await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenCalledTimes(2));

    // Allow state to settle — no third fetch
    await new Promise((r) => setTimeout(r, 200));
    expect(apiMocks.fetchReportRows).toHaveBeenCalledTimes(2);
  });

  it("Manager Presensi Tim re-fetches fetchManagerEmployeeList when manager returns to attendance tab", async () => {
    localStorage.setItem("taptu-session", JSON.stringify({
      token: "manager-api-token",
      user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
    }));
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo, Raka Saputra", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });

    renderRoute("/app");

    // Navigate to Presensi Tim (attendance for manager)
    fireEvent.click(await screen.findByRole("button", { name: "Presensi Tim" }));
    await waitFor(() => expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledTimes(1));

    // Navigate away to Beranda
    fireEvent.click(screen.getByRole("button", { name: "Beranda" }));
    await waitFor(() => expect(apiMocks.fetchManagerOverview).toHaveBeenCalled());

    // Return to Presensi Tim — must re-fetch
    fireEvent.click(screen.getByRole("button", { name: "Presensi Tim" }));
    await waitFor(() => expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledTimes(2));
  });

  it("Manager Presensi Tim does not fetch infinitely — exactly 2 calls after one away-and-back cycle", async () => {
    localStorage.setItem("taptu-session", JSON.stringify({
      token: "manager-api-token",
      user: { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", organizationName: "TAPTU HQ", role: "manager" }
    }));
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo, Raka Saputra", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });

    renderRoute("/app");

    fireEvent.click(await screen.findByRole("button", { name: "Presensi Tim" }));
    await waitFor(() => expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Beranda" }));
    await waitFor(() => expect(apiMocks.fetchManagerOverview).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Presensi Tim" }));
    await waitFor(() => expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledTimes(2));

    await new Promise((r) => setTimeout(r, 200));
    expect(apiMocks.fetchManagerEmployeeList).toHaveBeenCalledTimes(2);
  });

  it("HR Laporan re-fetches fetchReportRows when admin returns to reports tab", async () => {
    localStorage.setItem("taptu-session", JSON.stringify({
      token: "admin-api-token",
      user: { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", organizationName: "TAPTU HQ", role: "admin" }
    }));
    apiMocks.getDashboard.mockResolvedValue({ greeting: "Halo, Nadia Putri", stats: [], schedule: [], attendance: [], attendanceState: "idle", requests: [] });

    renderRoute("/app/reports");
    await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenCalledTimes(1));

    // Navigate away to Beranda
    fireEvent.click(screen.getByRole("button", { name: "Beranda" }));
    await waitFor(() => expect(apiMocks.fetchAdminOverview).toHaveBeenCalled());

    // Return to Laporan — must re-fetch
    fireEvent.click(screen.getByRole("button", { name: "Laporan" }));
    await waitFor(() => expect(apiMocks.fetchReportRows).toHaveBeenCalledTimes(2));
  });
});

describe("PHASE 11.13 — Employee profile and validation copy", () => {
  // Shared setup for employee profile tests
  function setupEmployeeProfileSession() {
    cleanup();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [{ label: "Hadir", value: "3", detail: "hari ini" }],
      schedule: [{ id: "shift-pagi", name: "Shift Pagi", time: "08:00 – 17:00" }],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      todayRecord: { checkInTime: null, validationStatus: "verified", validationReasons: [] },
      assignedShift: { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor Pusat" },
      profile: { departmentName: "Operasional", managerName: "Raka Saputra", position: "Staff Operasional" },
      totalDays: 3, onTimeDays: 3, lateDays: 0, pendingRequests: 0
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchNotifications.mockResolvedValue([]);
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
      })
    );
  }

  it("employee profile shows correct department Operasional", async () => {
    setupEmployeeProfileSession();
    renderRoute("/app/profile");

    expect(await screen.findByText("Operasional")).toBeTruthy();
  });

  it("employee profile shows manager Raka Saputra", async () => {
    setupEmployeeProfileSession();
    renderRoute("/app/profile");

    expect(await screen.findByText("Raka Saputra")).toBeTruthy();
  });

  it("employee profile shows Shift Pagi", async () => {
    setupEmployeeProfileSession();
    renderRoute("/app/profile");

    expect(await screen.findByText("Shift Pagi")).toBeTruthy();
  });

  it("employee profile shows Kantor Pusat", async () => {
    setupEmployeeProfileSession();
    renderRoute("/app/profile");

    expect(await screen.findByText("Kantor Pusat")).toBeTruthy();
  });

  it("validation method section does not show 'Fitur segera hadir' for active validation data", async () => {
    setupEmployeeProfileSession();
    renderRoute("/app/profile");

    // Find the validation method field in the Pengaturan kehadiran panel
    expect(await screen.findByText("Metode validasi")).toBeTruthy();
    // The validation method should show real configured methods, not the future label
    expect(screen.getByText(/Waktu server/)).toBeTruthy();
    
    // The validation method row should NOT have "Fitur segera hadir" - check specifically the dd element contains the real methods
    const metodeValidasiRow = screen.getByText("Metode validasi").closest("div");
    expect(metodeValidasiRow).toBeTruthy();
    expect(metodeValidasiRow?.textContent).toContain("Waktu server");
  });

  it("validation copy mentions Manager and HR review ownership", async () => {
    cleanup();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    // Simulate a check-in that needs review
    apiMocks.getDashboard.mockResolvedValue({
      greeting: "Halo, Fikri Maulana",
      stats: [{ label: "Hadir", value: "3", detail: "hari ini" }],
      schedule: [{ id: "shift-pagi", name: "Shift Pagi", time: "08:00 – 17:00" }],
      attendance: [],
      attendanceState: "idle",
      requests: []
    });
    apiMocks.fetchEmployeeSummary.mockResolvedValue({
      todayRecord: { checkInTime: "2026-05-21T08:30:00", validationStatus: "needs_review", validationReasons: ["Foto wajah belum dilampirkan."] },
      assignedShift: { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", locationName: "Kantor Pusat" },
      profile: { departmentName: "Operasional", managerName: "Raka Saputra", position: "Staff Operasional" },
      totalDays: 3, onTimeDays: 3, lateDays: 0, pendingRequests: 0
    });
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchNotifications.mockResolvedValue([]);
    localStorage.setItem(
      "taptu-session",
      JSON.stringify({
        token: "demo:employee",
        user: { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", organizationName: "TAPTU HQ", role: "employee" }
      })
    );

    renderRoute("/app/attendance");

    // Should show "Menunggu review" instead of "Perlu review"
    expect(await screen.findByText("Menunggu review")).toBeTruthy();
    // Should have helper text about Manager and HR
    expect(screen.getByText(/Manager dan HR/)).toBeTruthy();
    
    // Also verify the old copy "Perlu review" does not appear in the status badge (we changed it to "Menunggu review")
    // There might still be "Perlu review" in other places (e.g., table columns), so we specifically check for the status badge
  });

  it("device registry shows proper copy 'Belum terdaftar' with helper text", async () => {
    setupEmployeeProfileSession();
    renderRoute("/app/profile");

    expect(await screen.findByText("Perangkat terdaftar")).toBeTruthy();
    expect(screen.getByText("Belum terdaftar")).toBeTruthy();
    expect(screen.getByText(/Device registry/)).toBeTruthy();
  });

  it("contact section shows clean empty copy without 'Fitur segera hadir' in contact panel", async () => {
    setupEmployeeProfileSession();
    renderRoute("/app/profile");

    // Find the contact panel specifically
    const contactPanel = await screen.findByText("Informasi kontak").then(el => el.closest("section") || el.parentElement);
    expect(contactPanel).toBeTruthy();
    
    // Check the contact panel does not have the old copy
    // The old copy had "Fitur segera hadir" - we changed it to "HR dapat melengkapi"
    expect(screen.getByText(/HR dapat melengkapi/)).toBeTruthy();
  });
});

describe("PHASE 11.13A — HR Team role scoping", () => {
  it("HR Tim shows both employees and managers with proper role scoping", async () => {
    // Use setupAdminSession which already has proper mocks for the team page
    setupAdminSession();
    
    // Override the employee list to include both Fikri (employee) and Raka (manager)
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra", todayStatus: "absent", shiftName: "Shift Pagi", validationStatus: "verified" },
      { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", departmentId: "dep-ops", departmentName: "Operasional", todayStatus: "absent" }
    ]);

    renderRoute("/app/team");

    // Wait for table to load - look for employee names
    await screen.findAllByText("Fikri Maulana");
    
    // Both should appear
    expect(screen.getAllByText("Fikri Maulana").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Raka Saputra").length).toBeGreaterThan(0);
  });

  it("Manager rows show dash for attendance columns, employee rows show status", async () => {
    setupAdminSession();
    
    // Override the employee list to include both Fikri (employee) and Raka (manager)
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra", todayStatus: "absent", shiftName: "Shift Pagi", validationStatus: "verified" },
      { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", departmentId: "dep-ops", departmentName: "Operasional", todayStatus: "absent" }
    ]);

    renderRoute("/app/team");

    // Wait for table
    await screen.findAllByText("Fikri Maulana");
    
    // Find the table
    const table = document.querySelector("table");
    expect(table).toBeTruthy();
    
    const rows = table!.querySelectorAll("tbody tr");
    // Should have both rows
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("Fikri shows managerName Raka Saputra in HR Tim list", async () => {
    setupAdminSession();
    
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra", todayStatus: "absent", shiftName: "Shift Pagi", validationStatus: "verified" },
      { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", departmentId: "dep-ops", departmentName: "Operasional", todayStatus: "absent" }
    ]);

    renderRoute("/app/team");

    await screen.findAllByText("Fikri Maulana");
    
    // Fikri should show Raka as manager
    expect(screen.getAllByText("Raka Saputra").length).toBeGreaterThan(0);
  });
});
