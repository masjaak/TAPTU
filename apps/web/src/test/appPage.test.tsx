import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

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
  updateShift: vi.fn()
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
      { id: "loc-hq", name: "Kantor Pusat", address: "Jl. Sudirman No. 1", latitude: -6.2088, longitude: 106.8456, radiusMeters: 150, status: "active", createdAt: "2026-05-01T00:00:00.000Z" }
    ]);
    apiMocks.fetchShifts.mockResolvedValue([
      { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", gracePeriodMinutes: 10, workLocationId: "loc-hq", workLocationName: "Kantor Pusat", status: "active", createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" }
    ]);
    apiMocks.fetchReportRows.mockResolvedValue([
      { id: "att-demo-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:03:00.000Z", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
    ]);
    apiMocks.fetchAuditLogs.mockResolvedValue([]);
    apiMocks.fetchExceptionQueue.mockResolvedValue([]);
    apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
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
    expect(screen.getByText("Menunggu approval")).toBeTruthy();
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
        checkInTime: "2026-05-02T08:03:00.000Z",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
        createdAt: "2026-05-11T00:00:00.000Z",
        updatedAt: "2026-05-11T00:00:00.000Z"
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
        checkInTime: "2026-05-11T08:02:00.000Z",
        checkOutTime: "2026-05-11T17:05:00.000Z",
        status: "Selesai",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T08:02:00.000Z",
        updatedAt: "2026-05-11T17:05:00.000Z"
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
        checkInTime: "2026-05-02T08:03:00.000Z",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
        checkInTime: "2026-05-11T01:03:00.000Z",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00.000Z",
        updatedAt: "2026-05-11T01:03:00.000Z"
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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
        checkInTime: "2026-05-02T08:03:00.000Z",
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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
        checkInTime: "2026-05-11T08:02:00.000Z",
        checkOutTime: "2026-05-11T17:05:00.000Z",
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
        createdAt: "2026-05-11T08:02:00.000Z",
        updatedAt: "2026-05-11T17:05:00.000Z"
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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
        checkInTime: "2026-05-11T01:03:00.000Z",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00.000Z",
        updatedAt: "2026-05-11T01:03:00.000Z"
      }
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /face verification/i }));
    fireEvent.click(await screen.findByRole("button", { name: /ambil foto wajah/i }));
    expect(apiMocks.checkIn).not.toHaveBeenCalled();

    const selfieInput = screen.getByLabelText(/ambil selfie check-in/i);
    fireEvent.change(selfieInput, {
      target: {
        files: [new File(["selfie"], "selfie.jpg", { type: "image/jpeg" })]
      }
    });

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
        selfieData: expect.stringMatching(/^data:image\/jpeg;base64,/),
        selfieFileName: "selfie.jpg",
        selfieContentType: "image/jpeg",
        requiredSelfie: true
      })
    );
    await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(apiMocks.fetchEmployeeSummary).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText(/Masuk 08[.:]03/i)).length).toBeGreaterThan(0);

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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
      }
    });

    renderRoute("/app/attendance");

    fireEvent.click(await screen.findByRole("button", { name: /scan qr/i }));
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
        checkInTime: "2026-05-11T01:03:00.000Z",
        status: "Tepat waktu",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00.000Z",
        updatedAt: "2026-05-11T01:03:00.000Z"
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
        checkInTime: "2026-05-11T01:03:00.000Z",
        checkOutTime: "2026-05-11T10:05:00.000Z",
        status: "Selesai",
        validationStatus: "verified",
        validationReasons: [],
        createdAt: "2026-05-11T01:03:00.000Z",
        updatedAt: "2026-05-11T10:05:00.000Z"
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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
      }
    });

    renderRoute("/app/attendance");

    const verifyButton = await screen.findByRole("button", { name: /verifikasi ulang perangkat/i });
    fireEvent.click(verifyButton);
    await screen.findByText(/perangkat ini tidak mendukung verifikasi lokasi/i);

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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
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
    { id: "exc-01", attendanceRecordId: "att-demo-02", employeeId: "usr-employee-02", employeeName: "Anisa Rahma", exceptionType: "Di luar radius", reason: "GPS tidak akurat", status: "Need Review", createdAt: "2026-05-14T08:24:00.000Z" }
  ]);
  apiMocks.fetchManagerExceptionQueue.mockResolvedValue([]);
  apiMocks.fetchWorkLocations.mockResolvedValue([
    { id: "loc-hq", name: "Kantor Pusat", address: "Jl. Sudirman No. 1", latitude: -6.2088, longitude: 106.8456, radiusMeters: 150, status: "active", createdAt: "2026-05-01T00:00:00.000Z" }
  ]);
  apiMocks.fetchShifts.mockResolvedValue([
    { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", gracePeriodMinutes: 10, workLocationId: "loc-hq", workLocationName: "Kantor Pusat", status: "active", createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" }
  ]);
  apiMocks.fetchReportRows.mockResolvedValue([
    { id: "att-demo-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:03:00.000Z", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
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
      { id: "org-att-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-14", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-14T08:03:00.000Z", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true },
      { id: "org-att-02", employeeName: "Anisa Rahma", employeeId: "usr-employee-02", date: "2026-05-14", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-14T08:24:00.000Z", status: "Terlambat", validationStatus: "needs_review", validationReasons: ["Di luar radius"], isLate: true, hasException: true, selfieProof: false, deviceValidated: true }
    ]);

    renderRoute("/app/attendance");

    expect(await screen.findByText("Fikri Maulana")).toBeTruthy();
    expect(screen.getByText("Anisa Rahma")).toBeTruthy();
    expect(screen.queryByText("07:59")).toBeNull();
    expect(apiMocks.fetchReportRows).toHaveBeenCalledWith("demo:admin");
    expect(apiMocks.fetchAttendanceHistoryByFilter).not.toHaveBeenCalled();
    expect(apiMocks.fetchManagerEmployeeList).not.toHaveBeenCalled();
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

    expect((await screen.findAllByPlaceholderText(/cari nama atau email/i)).length).toBeGreaterThan(0);
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
      { id: "att-demo-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:03:00.000Z", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true }
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
      { id: "audit-01", action: "Setujui", actorName: "Nadia", actorRole: "admin", detail: "Menyetujui izin sakit", createdAt: "2026-05-12T09:00:00.000Z" }
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
        createdAt: "2026-05-02T08:00:00.000Z",
        updatedAt: "2026-05-02T08:00:00.000Z"
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
