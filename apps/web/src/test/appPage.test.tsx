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

    expect(await screen.findByText(/aktivitas kerja hari ini/i)).toBeTruthy();
    expect(screen.getAllByText("Presensi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Riwayat").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pengajuan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jadwal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Slip Gaji").length).toBeGreaterThan(0);
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
    });

    renderRoute("/app/attendance");

    expect(await screen.findByText(/check-in sederhana, validasi tetap berjalan/i)).toBeTruthy();
    expect(screen.getByText(/validasi lokasi dan perangkat/i)).toBeTruthy();
    expect(await screen.findByText(/riwayat absensi terbaru/i)).toBeTruthy();
    expect(await screen.findByText(/08:03 · Manual/i)).toBeTruthy();
  });

  it("keeps existing employee history when an all-history refresh returns empty", async () => {
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

    expect(await screen.findByText(/riwayat absensi terbaru/i)).toBeTruthy();
    expect(await screen.findByText(/07:55 · Selfie/i)).toBeTruthy();
    expect(screen.queryByText(/belum ada histori absensi/i)).toBeNull();
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
    expect(await screen.findByText(/08[.:]03 · Manual/i)).toBeTruthy();
    expect(screen.queryByText(/undefined/i)).toBeNull();
  });

  it("starts selfie capture from the primary employee check-in button and submits after capture", async () => {
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
      .mockResolvedValueOnce([{ id: "hist-after-checkin", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "Manual" }]);
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

    const checkInButton = await screen.findByRole("button", { name: /check-in sekarang/i });
    fireEvent.click(checkInButton);
    expect(apiMocks.checkIn).not.toHaveBeenCalled();

    const selfieInput = screen.getByLabelText(/ambil selfie check-in/i);
    fireEvent.change(selfieInput, {
      target: {
        files: [new File(["selfie"], "selfie.jpg", { type: "image/jpeg" })]
      }
    });

    expect(await screen.findByText(/selfie proof captured/i)).toBeTruthy();
    expect(apiMocks.checkIn).toHaveBeenCalledWith(
      "demo:employee",
      expect.objectContaining({
        method: "Manual",
        selfieUrl: "blob:selfie-checkin",
        requiredSelfie: true
      })
    );
    await waitFor(() => expect(apiMocks.fetchAttendanceHistoryByFilter).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/08:03 · Manual/i)).toBeTruthy();

    createObjectUrl.mockRestore();
  });

  it("lets employee submit check-in without selfie when camera is unavailable", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: /check-in sekarang/i }));
    fireEvent.click(await screen.findByRole("button", { name: /simpan tanpa selfie/i }));

    expect(apiMocks.checkIn).toHaveBeenCalledWith(
      "demo:employee",
      expect.not.objectContaining({
        scannerToken: expect.any(String)
      })
    );
    expect(apiMocks.checkIn).toHaveBeenCalledWith(
      "demo:employee",
      expect.objectContaining({
        method: "Manual",
        selfieUrl: undefined,
        requiredSelfie: true
      })
    );
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

    const checkInButton = await screen.findByRole("button", { name: /check-in sekarang/i });
    expect(checkInButton).not.toHaveProperty("disabled", true);

    fireEvent.click(checkInButton);

    expect(await screen.findByText(/izinkan lokasi atau verifikasi ulang perangkat/i)).toBeTruthy();
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
    expect(await screen.findByText(/check-in sederhana/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Presensi" }).className).toContain("bg-[#111827]");

    fireEvent.click(screen.getByRole("button", { name: "Riwayat" }));
    expect(await screen.findByText(/riwayat absensi terbaru/i)).toBeTruthy();
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

    const historySummary = await screen.findByText(/08:03 · Manual/i);
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

    expect(await screen.findByText(/shift yang sedang ditugaskan/i)).toBeTruthy();
    expect(screen.getByText(/belum ada jadwal mendatang/i)).toBeTruthy();

    cleanup();
    renderRoute("/app/payslip");

    expect(await screen.findByText(/slip gaji pribadi/i)).toBeTruthy();
    expect(screen.getByText(/slip gaji belum tersedia/i)).toBeTruthy();
    expect(screen.getByText(/payroll-ready/i)).toBeTruthy();
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
});
