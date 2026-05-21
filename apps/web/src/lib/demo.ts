import type {
  AdminOverview,
  ApprovalWorkflowStatus,
  AttendanceActivityItem,
  AttendanceExceptionItem,
  AttendanceRecord,
  AttendanceReportRow,
  AttendanceTimelineItem,
  AuditLogItem,
  DashboardPayload,
  DashboardScheduleItem,
  DashboardStat,
  DepartmentItem,
  EmployeeListItem,
  EmployeeSummary,
  LeaveRequestItem,
  LoginResponse,
  NotificationItem,
  NotificationType,
  ScannerTokenPayload,
  ShiftInfo,
  ShiftRecord,
  UserRole,
  WorkLocationItem
} from "@taptu/shared";

const DEMO_PASSWORD = "Taptu123!";

const DEMO_USERS = [
  { id: "usr-superadmin-01", fullName: "Super Admin", email: "superadmin@taptu.app", password: DEMO_PASSWORD, organizationName: "Taptu Demo Company", role: "superadmin" as UserRole },
  { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", password: DEMO_PASSWORD, organizationName: "Taptu Demo Company", role: "admin" as UserRole },
  { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", password: DEMO_PASSWORD, organizationName: "Taptu Demo Company", role: "manager" as UserRole },
  { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", password: DEMO_PASSWORD, organizationName: "Taptu Demo Company", role: "employee" as UserRole, departmentId: "dep-ops", departmentName: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra" },
  { id: "usr-scanner-01", fullName: "Front Gate Scanner", email: "scanner@taptu.app", password: DEMO_PASSWORD, organizationName: "Taptu Demo Company", role: "scanner" as UserRole }
];

const SHIFT: ShiftInfo = {
  id: "shift-pagi",
  name: "Shift Pagi",
  startTime: "08:00",
  endTime: "17:00",
  locationName: "Kantor Pusat"
};

const TODAY_RECORD: AttendanceRecord = {
  id: "att-demo-01",
  employeeId: "usr-employee-01",
  shiftId: SHIFT.id,
  status: "Belum check-in",
  locationLat: -6.2,
  locationLng: 106.8166,
  validationStatus: "verified",
  validationReasons: [],
  selfieUrl: "",
  deviceId: "ios-15pm-demo",
  createdAt: "2026-05-02T08:03:00.000Z",
  updatedAt: "2026-05-02T08:03:00.000Z"
};

// No exceptions seeded — clean demo universe shows empty exception queue.
// Real exceptions are generated from live attendance events only.
const EXCEPTIONS: AttendanceExceptionItem[] = [];

const AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "audit-01",
    action: "scanner_token_invalid_attempt",
    actorName: "System",
    actorRole: "scanner",
    targetId: "scan-01",
    detail: "Scan gagal karena token sudah expired.",
    createdAt: "2026-05-02T08:09:00.000Z"
  }
];

const SCHEDULE: DashboardScheduleItem[] = [
  { time: "08.00", title: "Check-in kantor", detail: "QR utama akan refresh otomatis tiap 30 detik." },
  { time: "13.00", title: "Review izin harian", detail: "Approval supervisor dan exception queue terpusat." },
  { time: "17.00", title: "Check-out", detail: "Sinkron ke laporan harian dan payroll." }
];

const STATS: Record<UserRole, DashboardStat[]> = {
  superadmin: [
    { label: "Cabang aktif", value: "18", detail: "Semua sinkron sebelum jam 09.00" },
    { label: "Kehadiran hari ini", value: "91%", detail: "Naik 4% dibanding minggu lalu" },
    { label: "Exception queue", value: "5", detail: "Perlu review sebelum payroll cut-off" }
  ],
  admin: [
    { label: "Karyawan hadir", value: "187", detail: "Tim lapangan dan kantor pusat" },
    { label: "Approval pending", value: "6", detail: "Butuh keputusan sebelum siang" },
    { label: "Butuh review", value: "5", detail: "Validasi lokasi atau selfie belum final" }
  ],
  manager: [
    { label: "Tim hadir", value: "26", detail: "3 shift masih berjalan" },
    { label: "Late arrivals", value: "2", detail: "Butuh follow-up supervisor" },
    { label: "Open approvals", value: "3", detail: "Izin tim menunggu review" }
  ],
  employee: [
    { label: "Status hari ini", value: "Belum check-in", detail: "Mulai check-in dari tab Presensi" },
    { label: "Shift aktif", value: "08.00 - 17.00", detail: "Kantor pusat · Shift Pagi" },
    { label: "Riwayat minggu ini", value: "0 hadir", detail: "Belum ada record absensi minggu ini" }
  ],
  scanner: [
    { label: "Token aktif", value: "00:27", detail: "QR akan refresh otomatis" },
    { label: "Scan hari ini", value: "124", detail: "14 scan dalam 10 menit terakhir" },
    { label: "Lokasi", value: "Gerbang Utama", detail: "Radius valid 150 meter" }
  ]
};

const ATTENDANCE: Record<UserRole, AttendanceTimelineItem[]> = {
  superadmin: [],
  admin: [],
  manager: [],
  employee: [],
  scanner: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "Fikri Maulana", method: "QR" }
  ]
};

// Fikri-scoped requests: starts empty; populated by employee leave request actions.
// Mutable so that demo approval actions persist within the session.
const INITIAL_FIKRI_REQUESTS: LeaveRequestItem[] = [];

let demoFikriRequests: LeaveRequestItem[] = INITIAL_FIKRI_REQUESTS.map((r) => ({ ...r }));

// Mutable event-based notifications — populated by check-in, check-out, and approval actions.
let demoNotifications: NotificationItem[] = [];

function pushNotification(
  recipientId: string,
  recipientRole: UserRole,
  type: NotificationType,
  title: string,
  message: string
): void {
  demoNotifications.push({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    organizationId: "org-demo",
    recipientId,
    recipientRole,
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    readAt: null
  });
}

export function getDemoNotifications(token: string): NotificationItem[] {
  const role = getDemoRoleFromToken(token);
  if (!role) return [];
  if (role === "employee") return demoNotifications.filter((n) => n.recipientRole === "employee");
  if (role === "manager") return demoNotifications.filter((n) => n.recipientRole === "manager");
  if (role === "admin" || role === "superadmin") return demoNotifications.filter((n) => n.recipientRole === "admin");
  return [];
}

const REQUESTS: Record<UserRole, LeaveRequestItem[]> = {
  // admin/superadmin use getDemoFikriRequests() so requests reflect live mutable state
  superadmin: [],
  admin: [],
  // Manager requests are derived from demoFikriRequests via getDemoManagerRequests()
  manager: [],
  employee: [],
  scanner: [
    { id: "req-01", title: "Token gate timur", status: "Disetujui", detail: "QR aktif dan sinkron sampai 30 detik ke depan." }
  ]
};

const DEMO_ROLES = new Set<UserRole>(["superadmin", "admin", "manager", "employee", "scanner"]);

export function getDemoRoleFromToken(token: string): UserRole | null {
  if (!token.startsWith("demo:")) {
    return null;
  }

  const role = token.slice("demo:".length);
  return DEMO_ROLES.has(role as UserRole) ? role as UserRole : null;
}

function demoUserByToken(token: string) {
  const role = getDemoRoleFromToken(token);
  return role ? DEMO_USERS.find((user) => user.role === role) ?? null : null;
}

export function isDemoToken(token: string): boolean {
  return getDemoRoleFromToken(token) !== null;
}

export function tryDemoLogin(email: string, password: string): LoginResponse | null {
  const found = DEMO_USERS.find((user) => user.email === email && user.password === password);
  if (!found) {
    return null;
  }

  const { password: _password, ...user } = found;
  return { token: `demo:${user.role}`, user };
}

export function getDemoDashboard(token: string): DashboardPayload {
  const user = demoUserByToken(token) ?? DEMO_USERS.find((candidate) => candidate.role === "employee")!;

  // Derive live stats for manager/admin so KPI cards always reflect real demo state.
  // Employee and scanner stats are role-appropriate static content and not linked to
  // check-in events, so they keep their descriptive fallback values from STATS.
  let liveStats: DashboardStat[] | undefined;

  if (user.role === "manager") {
    const managerId = "usr-manager-01";
    const team = demoEmployees.filter((e) => e.managerId === managerId);
    const teamCheckedIn = team.filter((e) => e.todayStatus === "present" || e.todayStatus === "late").length;
    const teamLate = team.filter((e) => e.todayStatus === "late").length;
    const openApprovals = demoFikriRequests.filter((r) => r.workflowStatus === "pending_manager").length;
    liveStats = [
      { label: "Tim hadir", value: String(teamCheckedIn), detail: `dari ${team.length} anggota tim` },
      { label: "Terlambat", value: String(teamLate), detail: teamLate > 0 ? "Butuh follow-up supervisor" : "Semua tepat waktu" },
      { label: "Open approvals", value: String(openApprovals), detail: openApprovals > 0 ? "Izin tim menunggu review" : "Tidak ada pengajuan pending" }
    ];
  } else if (user.role === "admin" || user.role === "superadmin") {
    const employees = demoEmployees.filter((e) => e.role === "employee");
    const checkedIn = employees.filter((e) => e.todayStatus === "present" || e.todayStatus === "late").length;
    const pendingApprovals = demoFikriRequests.filter(
      (r) => r.workflowStatus === "pending_manager" || r.workflowStatus === "pending_hr"
    ).length;
    const needsReview = employees.filter((e) => e.validationStatus === "needs_review").length;
    liveStats = [
      { label: "Karyawan hadir", value: String(checkedIn), detail: `dari ${employees.length} karyawan aktif` },
      { label: "Approval pending", value: String(pendingApprovals), detail: pendingApprovals > 0 ? "Butuh keputusan sebelum siang" : "Tidak ada pengajuan pending" },
      { label: "Butuh review", value: String(needsReview), detail: needsReview > 0 ? "Validasi lokasi atau selfie belum final" : "Semua validasi selesai" }
    ];
  }

  return {
    greeting: `Halo, ${user.fullName}`,
    stats: liveStats ?? STATS[user.role] ?? STATS.employee,
    schedule: SCHEDULE,
    attendance: ATTENDANCE[user.role] ?? ATTENDANCE.employee,
    attendanceState: "idle",
    requests: user.role === "manager" ? getDemoManagerRequests() : (REQUESTS[user.role] ?? REQUESTS.employee),
    scannerToken: user.role === "scanner" ? "HDR-31A-7XZ" : undefined
  };
}

export function getDemoAttendanceHistory(token: string): AttendanceTimelineItem[] {
  const role = getDemoRoleFromToken(token);
  if (!role) return [];
  if (role === "employee") return [...demoEmployeeAttendanceHistory];
  return ATTENDANCE[role] ?? [];
}

export function getDemoRequests(token: string): LeaveRequestItem[] {
  const role = getDemoRoleFromToken(token);
  if (!role) return [];
  // admin and superadmin see all Fikri requests (the clean demo org has only Fikri as employee)
  if (role === "admin" || role === "superadmin") return [...demoFikriRequests];
  return REQUESTS[role] ?? [];
}

/** Manager Pengajuan: returns only Fikri's requests (Raka's team = Fikri only). */
export function getDemoManagerRequests(): LeaveRequestItem[] {
  return [...demoFikriRequests];
}

/**
 * Mutates a Fikri request in response to a demo approval action.
 * Returns the updated item, or null if id is not found in demoFikriRequests.
 */
export function approveDemoRequest(
  id: string,
  role: UserRole,
  status: "Disetujui" | "Ditolak",
  adminNote?: string
): LeaveRequestItem | null {
  const found = demoFikriRequests.find((r) => r.id === id);
  if (!found) return null;

  const isRejection = status === "Ditolak";
  const isManagerRole = role === "manager";

  const workflowStatus: ApprovalWorkflowStatus = isRejection ? "rejected"
    : isManagerRole ? "pending_hr"
    : "approved";

  const resolvedStatus: LeaveRequestItem["status"] = isRejection ? "Ditolak"
    : isManagerRole ? "Menunggu"
    : "Disetujui";

  const statusLabel = isRejection ? "Ditolak"
    : isManagerRole ? "Menunggu HR"
    : "Disetujui";

  const updated: LeaveRequestItem = { ...found, status: resolvedStatus, workflowStatus, statusLabel, adminNote };
  demoFikriRequests = demoFikriRequests.map((r) => (r.id === id ? updated : r));
  saveDemoLiveState();

  // Notify employee on final decision (approved or rejected)
  if (workflowStatus === "approved") {
    pushNotification("usr-employee-01", "employee", "request_approved", "Pengajuan disetujui", `${found.title} telah disetujui oleh HR.`);
  } else if (workflowStatus === "rejected") {
    pushNotification("usr-employee-01", "employee", "request_rejected", "Pengajuan ditolak", `${found.title} ditolak.`);
  }

  return updated;
}

/**
 * Creates a new leave request for Fikri and adds it to the mutable demo request list.
 * Called by api.ts createRequest() for demo employee tokens so that approval tests
 * can work action-driven without relying on seeded data.
 */
export function submitDemoLeaveRequest(payload: {
  title: string;
  detail: string;
  category: string;
  startDate?: string;
  endDate?: string;
}): LeaveRequestItem {
  const item: LeaveRequestItem = {
    id: `req-demo-${Date.now()}`,
    employeeId: "usr-employee-01",
    requester: "Fikri Maulana",
    category: payload.category as "Cuti" | "Izin",
    title: payload.title,
    status: "Menunggu",
    detail: payload.detail,
    workflowStatus: "pending_manager",
    statusLabel: "Menunggu Manager",
    createdAt: new Date().toISOString()
  };
  demoFikriRequests = [...demoFikriRequests, item];
  saveDemoLiveState();
  return item;
}

function buildRecentActivity(members: EmployeeListItem[], idPrefix: string): AttendanceActivityItem[] {
  return members
    .filter((e) => e.todayStatus === "present" || e.todayStatus === "late")
    .map((e) => {
      const hasCheckedOut = Boolean(e.checkOutTime);
      return {
        id: `${idPrefix}-${e.id}`,
        employeeName: e.fullName,
        event: hasCheckedOut ? "Check-out" : "Check-in",
        time: hasCheckedOut ? (e.checkOutTime ?? "--:--") : (e.checkInTime ?? "--:--"),
        status: hasCheckedOut ? "Selesai" : (e.todayStatus === "late" ? "Terlambat" : "Tepat waktu"),
        detail: `${e.checkInMethod ?? "Manual"} · ${e.locationName ?? "Kantor"}`
      };
    });
}

// All KPI numbers derived from live demoEmployees (employee-role only) so
// check-ins and check-outs are reflected immediately — no hardcoded enterprise values.
export function getDemoAdminOverview(): AdminOverview {
  const employees = demoEmployees.filter((e) => e.role === "employee");
  const checkedIn = employees.filter((e) => e.todayStatus === "present" || e.todayStatus === "late");
  const onTime = employees.filter((e) => e.todayStatus === "present");
  const late = employees.filter((e) => e.todayStatus === "late");
  const absent = employees.filter((e) => e.todayStatus === "absent");
  const exceptions = employees.filter((e) => e.validationStatus === "needs_review");

  const pendingRequests = demoFikriRequests.filter(
    (r) => r.workflowStatus === "pending_manager" || r.workflowStatus === "pending_hr"
  ).length;

  const hasActivity = checkedIn.length > 0 || late.length > 0;
  return {
    totalEmployees: employees.length,
    checkedInToday: checkedIn.length,
    onTimeToday: onTime.length,
    lateToday: late.length,
    pendingRequests,
    absentToday: hasActivity ? absent.length : 0,
    exceptionCount: exceptions.length,
    recentActivity: buildRecentActivity(employees, "act-admin")
  };
}

// Manager overview is team-scoped (managerId = usr-manager-01) so that mutations
// via the employee account are reflected without extra data-layer work.
export function getDemoManagerOverview(): AdminOverview {
  const managerId = "usr-manager-01";
  const team = demoEmployees.filter((e) => e.managerId === managerId);
  const checkedIn = team.filter((e) => e.todayStatus === "present" || e.todayStatus === "late");
  const onTime = team.filter((e) => e.todayStatus === "present");
  const late = team.filter((e) => e.todayStatus === "late");
  const absent = team.filter((e) => e.todayStatus === "absent");

  const hasActivity = checkedIn.length > 0 || late.length > 0;
  return {
    totalEmployees: team.length,
    checkedInToday: checkedIn.length,
    onTimeToday: onTime.length,
    lateToday: late.length,
    pendingRequests: demoFikriRequests.filter((r) => r.workflowStatus === "pending_manager").length,
    absentToday: hasActivity ? absent.length : 0,
    exceptionCount: 0,
    recentActivity: buildRecentActivity(team, "act-mgr")
  };
}

export function getDemoEmployeeSummary(): EmployeeSummary {
  const fikri = demoEmployees.find((e) => e.id === "usr-employee-01");
  const today = new Date().toISOString().slice(0, 10);

  let currentAttendanceState: "idle" | "checked_in" | "checked_out" = "idle";
  let checkInTime: string | undefined;
  let checkOutTime: string | undefined;
  let status: AttendanceRecord["status"] = "Belum check-in";

  if (fikri?.checkOutTime) {
    currentAttendanceState = "checked_out";
    checkInTime = fikri.checkInTime ? `${today}T${fikri.checkInTime}:00` : undefined;
    checkOutTime = `${today}T${fikri.checkOutTime}:00`;
    status = "Selesai";
  } else if (fikri?.checkInTime) {
    currentAttendanceState = "checked_in";
    checkInTime = `${today}T${fikri.checkInTime}:00`;
    status = fikri.todayStatus === "late" ? "Terlambat" : "Tepat waktu";
  }

  return {
    totalDays: 0,
    onTimeDays: 0,
    lateDays: 0,
    pendingRequests: 0,
    currentAttendanceState,
    assignedShift: SHIFT,
    todayRecord: { ...TODAY_RECORD, checkInTime, checkOutTime, status }
  };
}

export function getDemoScannerToken(): ScannerTokenPayload {
  return { id: "scanner-default", token: "HDR-31A-7XZ", expiresInSeconds: 30, scansToday: 124, locationName: "Gerbang Utama", expiresAt: "2026-05-02T08:30:30.000Z", status: "active" };
}

export function getDemoScannerState() {
  return {
    id: "scanner-default",
    token: "HDR-31A-7XZ",
    expiresInSeconds: 30,
    scansToday: 124,
    locationName: "Gerbang Utama",
    expiresAt: "2026-05-02T08:30:30.000Z",
    status: "active" as const,
    recentScans: [
      { id: "scan-01", employeeName: "Fikri Maulana", status: "success" as const, time: "08:03", detail: "QR valid di Gerbang Utama" }
    ]
  };
}

export function getDemoExceptionQueue() {
  return EXCEPTIONS;
}

export function getDemoAuditLogs() {
  return AUDIT_LOGS;
}

// Clean demo universe: only the connected demo actors appear in the roster.
// Anisa, Leo, Dina, Budi removed — they were confusing dummy data never tied to real demo accounts.
const INITIAL_DEMO_DEPARTMENTS: DepartmentItem[] = [
  { id: "dep-ops", name: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra", isActive: true, memberCount: 1 }
];

const INITIAL_DEMO_EMPLOYEES: EmployeeListItem[] = [
  { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra", todayStatus: "absent", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
  { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", departmentId: "dep-ops", departmentName: "Operasional", todayStatus: "absent", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
];

let demoDepartments: DepartmentItem[] = INITIAL_DEMO_DEPARTMENTS.map((department) => ({ ...department }));
let demoEmployees: EmployeeListItem[] = INITIAL_DEMO_EMPLOYEES.map((employee) => ({ ...employee }));

// Mutable history for the demo employee account — starts empty, populated by recordDemoCheckIn/Out.
let demoEmployeeAttendanceHistory: AttendanceTimelineItem[] = [];

const INITIAL_DEMO_WORK_LOCATIONS: WorkLocationItem[] = [
  { id: "loc-hq", name: "Kantor Pusat", address: "Jl. Sudirman No. 1, Jakarta Pusat", latitude: -6.2088, longitude: 106.8456, radiusMeters: 150, status: "active", createdAt: "2026-05-01T00:00:00.000Z" },
  { id: "loc-branch", name: "Kantor Cabang Selatan", address: "Jl. TB Simatupang No. 88, Jakarta Selatan", latitude: -6.295, longitude: 106.814, radiusMeters: 100, status: "active", createdAt: "2026-05-01T00:00:00.000Z" }
];

const INITIAL_DEMO_SHIFTS: ShiftRecord[] = [
  { id: "shift-pagi", name: "Shift Pagi", startTime: "08:00", endTime: "17:00", gracePeriodMinutes: 10, workLocationId: "loc-hq", workLocationName: "Kantor Pusat", breakStartTime: "12:00", breakEndTime: "13:00", status: "active", createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" },
  { id: "shift-sore", name: "Shift Sore", startTime: "13:00", endTime: "22:00", gracePeriodMinutes: 10, workLocationId: "loc-hq", workLocationName: "Kantor Pusat", status: "active", createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" }
];

let demoWorkLocations: WorkLocationItem[] = INITIAL_DEMO_WORK_LOCATIONS.map((location) => ({ ...location }));
let demoShifts: ShiftRecord[] = INITIAL_DEMO_SHIFTS.map((shift) => ({ ...shift }));

// ─── localStorage sync ───────────────────────────────────────────────────────
// Shares demo attendance state across browser tabs without a backend.
// In Node.js (test environment), localStorage is undefined → all calls are no-ops
// and the module-level variables behave exactly as before.
//
// Browser cross-tab flow:
//   Employee Tab: recordDemoCheckIn → saveDemoLiveState → localStorage updated
//   Manager Tab:  storage event fires → loadDemoLiveState → module vars updated
//   Manager Tab:  next getDemoManagerOverview call reads updated module vars → check-in visible
//
// Cross-device sync requires TAPTU_STORAGE_MODE=supabase on the API server — see Deployment.

const DEMO_LS_KEY = "taptu:demo_live_state";

interface DemoLiveState {
  employees: EmployeeListItem[];
  attendanceHistory: AttendanceTimelineItem[];
  notifications: NotificationItem[];
  fikriRequests: LeaveRequestItem[];
}

function loadDemoLiveState(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(DEMO_LS_KEY);
    if (!raw) return;
    const state = JSON.parse(raw) as DemoLiveState;
    if (Array.isArray(state.employees)) demoEmployees = state.employees;
    if (Array.isArray(state.attendanceHistory)) demoEmployeeAttendanceHistory = state.attendanceHistory;
    if (Array.isArray(state.notifications)) demoNotifications = state.notifications;
    if (Array.isArray(state.fikriRequests)) demoFikriRequests = state.fikriRequests;
  } catch {
    // corrupted data — keep module-level defaults
  }
}

function saveDemoLiveState(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const state: DemoLiveState = {
      employees: demoEmployees,
      attendanceHistory: demoEmployeeAttendanceHistory,
      notifications: demoNotifications,
      fikriRequests: demoFikriRequests
    };
    localStorage.setItem(DEMO_LS_KEY, JSON.stringify(state));
  } catch {
    // storage quota exceeded or private mode — ignore
  }
}

// Hydrate on module init so a fresh tab picks up state written by another tab
loadDemoLiveState();

// Keep module vars in sync when another browser tab writes to localStorage
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === DEMO_LS_KEY) loadDemoLiveState();
  });
}

// Derive live report rows from demoEmployees so that check-ins are reflected immediately.
function employeeToReportRow(e: EmployeeListItem, today: string): AttendanceReportRow {
  let status: AttendanceReportRow["status"];
  let checkInTime: string | undefined;

  if (e.todayStatus === "leave") {
    status = "Izin";
  } else if (e.todayStatus === "absent") {
    status = "Belum check-in";
  } else if (e.todayStatus === "late") {
    status = "Terlambat";
    checkInTime = e.checkInTime ? `${today}T${e.checkInTime}:00` : undefined;
  } else if (e.todayStatus === "present") {
    status = "Tepat waktu";
    checkInTime = e.checkInTime ? `${today}T${e.checkInTime}:00` : undefined;
  } else {
    status = "Belum check-in";
  }

  const isLate = e.todayStatus === "late";
  const hasException = e.validationStatus === "needs_review";

  return {
    id: `att-live-${e.id}`,
    employeeName: e.fullName,
    employeeId: e.id,
    departmentId: e.departmentId ?? null,
    departmentName: e.departmentName ?? null,
    date: today,
    shiftName: e.shiftName ?? "—",
    workLocationName: e.locationName ?? "—",
    checkInTime,
    checkOutTime: e.checkOutTime ? `${today}T${e.checkOutTime}:00` : undefined,
    status,
    validationStatus: (e.validationStatus ?? "verified") as AttendanceReportRow["validationStatus"],
    validationReasons: [],
    isLate,
    hasException,
    selfieProof: false,
    deviceValidated: false,
    approvalStatus: e.todayStatus === "leave" ? "Disetujui" : undefined,
    checkInMethod: e.checkInMethod
  };
}

export function getDemoEmployeeList(): EmployeeListItem[] {
  return demoEmployees.map((employee) => ({ ...employee }));
}

export function getDemoDepartments(): DepartmentItem[] {
  return demoDepartments.map((department) => ({
    ...department,
    managerName: department.managerId ? demoEmployees.find((employee) => employee.id === department.managerId)?.fullName ?? null : null,
    memberCount: demoEmployees.filter((employee) => employee.departmentId === department.id && employee.role === "employee").length
  }));
}

export function createDemoDepartment(payload: { name: string; managerId?: string | null; description?: string | null; isActive?: boolean }): DepartmentItem {
  const manager = payload.managerId ? demoEmployees.find((employee) => employee.id === payload.managerId && employee.role === "manager") : null;
  const department: DepartmentItem = {
    id: `dep-${Date.now()}`,
    name: payload.name,
    managerId: manager?.id ?? null,
    managerName: manager?.fullName ?? null,
    description: payload.description ?? null,
    isActive: payload.isActive ?? true,
    memberCount: 0
  };
  demoDepartments = [...demoDepartments, department];
  return { ...department };
}

export function updateDemoDepartment(id: string, patch: { name?: string; managerId?: string | null; description?: string | null; isActive?: boolean }): DepartmentItem {
  const current = demoDepartments.find((department) => department.id === id);
  if (!current) throw new Error("Divisi demo tidak ditemukan.");

  const manager = patch.managerId ? demoEmployees.find((employee) => employee.id === patch.managerId && employee.role === "manager") : null;
  const updated: DepartmentItem = {
    ...current,
    name: patch.name ?? current.name,
    managerId: patch.managerId !== undefined ? manager?.id ?? null : current.managerId ?? null,
    managerName: patch.managerId !== undefined ? manager?.fullName ?? null : current.managerName ?? null,
    description: patch.description !== undefined ? patch.description : current.description,
    isActive: patch.isActive ?? current.isActive
  };
  demoDepartments = demoDepartments.map((department) => department.id === id ? updated : department);
  demoEmployees = demoEmployees.map((employee) => employee.departmentId === id ? { ...employee, departmentName: updated.name } : employee);
  return { ...updated, memberCount: demoEmployees.filter((employee) => employee.departmentId === id).length };
}

export function reassignDemoEmployeeDepartment(id: string, patch: { departmentId?: string | null; managerId?: string | null }): EmployeeListItem {
  const current = demoEmployees.find((employee) => employee.id === id);
  if (!current) throw new Error("Karyawan demo tidak ditemukan.");

  const department = patch.departmentId ? demoDepartments.find((entry) => entry.id === patch.departmentId) : null;
  const manager = patch.managerId ? demoEmployees.find((entry) => entry.id === patch.managerId && entry.role === "manager") : null;
  const updated: EmployeeListItem = {
    ...current,
    departmentId: patch.departmentId !== undefined ? department?.id ?? null : current.departmentId ?? null,
    departmentName: patch.departmentId !== undefined ? department?.name ?? null : current.departmentName ?? null,
    managerId: patch.managerId !== undefined ? manager?.id ?? null : current.managerId ?? null,
    managerName: patch.managerId !== undefined ? manager?.fullName ?? null : current.managerName ?? null
  };
  demoEmployees = demoEmployees.map((employee) => employee.id === id ? updated : employee);
  return { ...updated };
}

export function getDemoWorkLocations(): WorkLocationItem[] {
  return demoWorkLocations.map((location) => ({ ...location }));
}

export function createDemoWorkLocation(payload: Omit<WorkLocationItem, "id" | "status" | "createdAt">): WorkLocationItem {
  const location: WorkLocationItem = {
    ...payload,
    id: `loc-${Date.now()}`,
    status: "active",
    createdAt: new Date().toISOString()
  };
  demoWorkLocations = [...demoWorkLocations, location];
  return { ...location };
}

export function updateDemoWorkLocation(id: string, patch: Partial<WorkLocationItem>): WorkLocationItem {
  const current = demoWorkLocations.find((location) => location.id === id);
  if (!current) throw new Error("Lokasi demo tidak ditemukan.");
  const updated = { ...current, ...patch };
  demoWorkLocations = demoWorkLocations.map((location) => location.id === id ? updated : location);
  demoShifts = demoShifts.map((shift) => shift.workLocationId === id ? { ...shift, workLocationName: updated.name } : shift);
  return { ...updated };
}

export function getDemoShifts(): ShiftRecord[] {
  return demoShifts.map((shift) => ({ ...shift }));
}

export function createDemoShift(payload: Omit<ShiftRecord, "id" | "status" | "createdAt" | "updatedAt">): ShiftRecord {
  const now = new Date().toISOString();
  const shift: ShiftRecord = {
    ...payload,
    id: `shift-${Date.now()}`,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
  demoShifts = [...demoShifts, shift];
  return { ...shift };
}

export function updateDemoShift(id: string, patch: Partial<ShiftRecord>): ShiftRecord {
  const current = demoShifts.find((shift) => shift.id === id);
  if (!current) throw new Error("Shift demo tidak ditemukan.");
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  demoShifts = demoShifts.map((shift) => shift.id === id ? updated : shift);
  return { ...updated };
}

export function getDemoReportRows(): AttendanceReportRow[] {
  const today = new Date().toISOString().slice(0, 10);
  // Exclude manager/admin roles — only employee-role members appear in attendance reports
  return demoEmployees
    .filter((e) => e.role === "employee")
    .map((e) => employeeToReportRow(e, today));
}

/**
 * Records an employee check-in in the demo in-memory store so that
 * getDemoManagerOverview(), HR report rows, and employee Riwayat all reflect
 * the live check-in without requiring a real backend.
 */
export function recordDemoCheckIn(employeeId: string, method: string): void {
  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  const today = now.toISOString().slice(0, 10);
  const localISO = `${today}T${time}:00`;
  const [h, m] = time.split(":").map(Number);
  const isLate = h * 60 + m > 8 * 60 + 10;
  const status: "Tepat waktu" | "Terlambat" = isLate ? "Terlambat" : "Tepat waktu";
  const safeMethod = (["QR", "GPS", "Selfie", "Manual"].includes(method) ? method : "Manual") as AttendanceTimelineItem["method"];

  demoEmployees = demoEmployees.map((e) => {
    if (e.id !== employeeId) return e;
    return {
      ...e,
      todayStatus: isLate ? "late" : "present",
      checkInTime: time,
      checkInMethod: method,
      checkOutTime: undefined,
      validationStatus: "verified"
    } as typeof e;
  });

  // Push event-based notifications
  pushNotification("usr-employee-01", "employee", "attendance_checked_in", "Check-in berhasil", `Fikri Maulana check-in pukul ${time} via ${safeMethod}`);
  pushNotification("usr-manager-01", "manager", "attendance_checked_in", "Anggota tim check-in", `Fikri Maulana check-in pukul ${time}`);
  pushNotification("usr-admin-01", "admin", "attendance_checked_in", "Presensi baru", `Fikri Maulana check-in pukul ${time}`);

  // Replace any existing "Hari ini" record so history stays a single entry per day
  const newRecord: AttendanceTimelineItem = {
    id: `att-live-${employeeId}`,
    day: "Hari ini",
    status,
    time,
    method: safeMethod,
    checkInTime: localISO,
    locationName: "Kantor Pusat"
  };
  demoEmployeeAttendanceHistory = [
    newRecord,
    ...demoEmployeeAttendanceHistory.filter((r) => r.day !== "Hari ini")
  ];
  saveDemoLiveState();
}

/**
 * Records a check-out in the demo store — updates the existing "Hari ini" record.
 * Never creates a duplicate entry.
 */
export function recordDemoCheckOut(employeeId: string): void {
  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  const today = now.toISOString().slice(0, 10);
  const localISO = `${today}T${time}:00`;

  demoEmployees = demoEmployees.map((e) => {
    if (e.id !== employeeId) return e;
    return { ...e, checkOutTime: time } as typeof e;
  });

  // Push event-based notifications
  pushNotification("usr-employee-01", "employee", "attendance_checked_out", "Check-out berhasil", `Fikri Maulana check-out pukul ${time}`);
  pushNotification("usr-manager-01", "manager", "attendance_checked_out", "Anggota tim check-out", `Fikri Maulana check-out pukul ${time}`);
  pushNotification("usr-admin-01", "admin", "attendance_checked_out", "Presensi selesai", `Fikri Maulana check-out pukul ${time}`);

  demoEmployeeAttendanceHistory = demoEmployeeAttendanceHistory.map((r) => {
    if (r.day !== "Hari ini") return r;
    return { ...r, checkOutTime: localISO };
  });
  saveDemoLiveState();
}

/**
 * Resets employee attendance state to initial values — used in tests to guarantee
 * a clean starting state before each test case that depends on Fikri being absent.
 */
export function resetDemoAttendanceState(): void {
  demoEmployees = INITIAL_DEMO_EMPLOYEES.map((e) => ({ ...e }));
  demoEmployeeAttendanceHistory = [];
  demoFikriRequests = INITIAL_FIKRI_REQUESTS.map((r) => ({ ...r }));
  demoNotifications = [];
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(DEMO_LS_KEY); } catch { /* ignore */ }
  }
}
