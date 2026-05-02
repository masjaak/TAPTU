import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { AppPage } from "../pages/AppPage";

const apiMocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  fetchAdminOverview: vi.fn(),
  fetchAttendanceHistoryByFilter: vi.fn(),
  fetchEmployeeSummary: vi.fn(),
  fetchRequestDetail: vi.fn(),
  fetchRequests: vi.fn(),
  refreshScannerToken: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  createRequest: vi.fn(),
  approveRequest: vi.fn(),
  cancelRequest: vi.fn()
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
