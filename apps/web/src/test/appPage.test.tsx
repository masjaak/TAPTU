import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { AppPage } from "../pages/AppPage";

const apiMocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  fetchAdminOverview: vi.fn(),
  fetchAttendanceHistoryByFilter: vi.fn(),
  fetchEmployeeList: vi.fn(),
  fetchEmployeeSummary: vi.fn(),
  fetchRequestDetail: vi.fn(),
  fetchRequests: vi.fn(),
  fetchWorkLocations: vi.fn(),
  fetchShifts: vi.fn(),
  fetchReportRows: vi.fn(),
  fetchAuditLogs: vi.fn(),
  fetchExceptionQueue: vi.fn(),
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
    apiMocks.fetchAttendanceHistoryByFilter.mockResolvedValue([]);
    apiMocks.fetchRequests.mockResolvedValue([]);
    apiMocks.fetchRequestDetail.mockResolvedValue(null);
    apiMocks.fetchEmployeeList.mockResolvedValue([
      { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
      { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
    ]);
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

    expect(await screen.findByText(/today attendance summary/i)).toBeTruthy();
    expect(screen.getByText("Pending approvals")).toBeTruthy();
    expect(screen.getByText("Anisa Rahma")).toBeTruthy();
    expect(screen.getByText("Quick actions")).toBeTruthy();
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
    expect(await screen.findByText(/Masuk 08[.:]03/i)).toBeTruthy();
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
    expect(await screen.findByText(/belum ada histori absensi/i)).toBeTruthy();
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
    expect(await screen.findByText(/Masuk 08[.:]03/i)).toBeTruthy();

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
    expect(screen.getByText(/belum ada jadwal mendatang/i)).toBeTruthy();

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
}

describe("Phase 4: Employee list", () => {
  it("renders employee search input in team workspace", async () => {
    setupAdminSession();
    renderRoute("/app/team");

    expect(await screen.findByPlaceholderText(/cari nama atau email/i)).toBeTruthy();
  });

  it("renders employee names in team workspace", async () => {
    setupAdminSession();
    renderRoute("/app/team");

    const fikriElements = await screen.findAllByText("Fikri Maulana");
    expect(fikriElements.length).toBeGreaterThan(0);
    const anisaElements = screen.getAllByText("Anisa Rahma");
    expect(anisaElements.length).toBeGreaterThan(0);
  });
});

describe("Phase 4: Location management", () => {
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
      }
    });

    renderRoute("/app/profile");

    expect((await screen.findAllByText("Fikri Maulana")).length).toBeGreaterThan(0);

    expect(screen.queryByText(/dari backend/i)).toBeNull();
    expect(screen.getAllByText(/^Belum tersedia$/).length).toBeGreaterThan(0);
  });
});
