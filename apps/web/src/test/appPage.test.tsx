import { cleanup, render, screen } from "@testing-library/react";
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
      record: { day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" }
    });
    apiMocks.checkOut.mockResolvedValue({
      attendanceState: "checked_out",
      record: { day: "Hari ini", status: "Tepat waktu", time: "17:05", method: "QR" }
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

  it("routes employee users into the attendance-first workspace", async () => {
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

    expect(await screen.findByText(/clock-in cepat, guard tetap ketat/i)).toBeTruthy();
    expect(screen.getByText(/location validation status/i)).toBeTruthy();
    expect(screen.getByText(/recent history/i)).toBeTruthy();
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
