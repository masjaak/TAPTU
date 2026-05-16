import type {
  AdminOverview,
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

const EXCEPTIONS: AttendanceExceptionItem[] = [
  {
    id: "exc-01",
    attendanceRecordId: "att-demo-02",
    employeeId: "usr-employee-02",
    employeeName: "Anisa Rahma",
    exceptionType: "Outside radius",
    reason: "Di luar radius lokasi kerja (603 m).",
    status: "Need Review",
    createdAt: "2026-05-02T08:24:00.000Z"
  },
  {
    id: "exc-02",
    attendanceRecordId: "att-demo-02",
    employeeId: "usr-employee-02",
    employeeName: "Anisa Rahma",
    exceptionType: "Different device",
    reason: "Perangkat berbeda dari riwayat sebelumnya.",
    status: "Need Review",
    createdAt: "2026-05-02T08:24:00.000Z"
  }
];

const AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "audit-01",
    action: "scanner_token_invalid_attempt",
    actorName: "System",
    actorRole: "scanner",
    targetId: "scan-02",
    detail: "Scan gagal karena token sudah expired.",
    createdAt: "2026-05-02T08:09:00.000Z"
  },
  {
    id: "audit-02",
    action: "device_mismatch_exception",
    actorName: "System",
    actorRole: "employee",
    targetId: "att-demo-02",
    detail: "Perangkat berbeda dari riwayat sebelumnya.",
    createdAt: "2026-05-02T08:24:00.000Z"
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
  superadmin: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08:24", method: "GPS" },
    { id: "a-03", day: "Kemarin", status: "Tepat waktu", time: "07:58", method: "Selfie" }
  ],
  admin: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08:24", method: "GPS" },
    { id: "a-03", day: "Kemarin", status: "Tepat waktu", time: "07:58", method: "Selfie" }
  ],
  manager: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08:24", method: "GPS" },
    { id: "a-03", day: "Kemarin", status: "Tepat waktu", time: "07:58", method: "Selfie" }
  ],
  employee: [],
  scanner: [
    { id: "a-01", day: "08.03", status: "Tepat waktu", time: "Nadia Putri", method: "QR" },
    { id: "a-02", day: "08.07", status: "Tepat waktu", time: "Ilham Fadli", method: "QR" },
    { id: "a-03", day: "08.09", status: "Belum check-in", time: "1 scan gagal radius", method: "Manual" }
  ]
};

const REQUESTS: Record<UserRole, LeaveRequestItem[]> = {
  superadmin: [
    { id: "req-01", title: "Izin sakit · Anisa Rahma", status: "Menunggu", detail: "Belum ada lampiran dokter final." },
    { id: "req-02", title: "Cuti tahunan · Fikri Maulana", status: "Disetujui", detail: "2 hari kerja minggu depan." }
  ],
  admin: [
    { id: "req-01", title: "Izin sakit · Anisa Rahma", status: "Menunggu", detail: "Belum ada lampiran dokter final." },
    { id: "req-02", title: "Cuti tahunan · Fikri Maulana", status: "Disetujui", detail: "2 hari kerja minggu depan." }
  ],
  manager: [
    { id: "req-01", title: "Izin tim lapangan", status: "Menunggu", detail: "Butuh keputusan supervisor sebelum jam 12.00." }
  ],
  employee: [],
  scanner: [
    { id: "req-01", title: "Token gate timur", status: "Disetujui", detail: "QR aktif dan sinkron sampai 30 detik ke depan." }
  ]
};

const ADMIN_ACTIVITY: AttendanceActivityItem[] = [
  { id: "act-01", employeeName: "Anisa Rahma", event: "Butuh review", time: "08:24", status: "Terlambat", detail: "Akurasi GPS rendah · butuh verifikasi HR" },
  { id: "act-02", employeeName: "Fikri Maulana", event: "Check-in", time: "08:03", status: "Tepat waktu", detail: "QR utama · Kantor Pusat" },
  { id: "act-03", employeeName: "Leo Pratama", event: "Check-out", time: "17:09", status: "Selesai", detail: "Shift sore ditutup dari perangkat iPhone" }
];

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

  return {
    greeting: `Halo, ${user.fullName}`,
    stats: STATS[user.role] ?? STATS.employee,
    schedule: SCHEDULE,
    attendance: ATTENDANCE[user.role] ?? ATTENDANCE.employee,
    attendanceState: "idle",
    requests: REQUESTS[user.role] ?? REQUESTS.employee,
    scannerToken: user.role === "scanner" ? "HDR-31A-7XZ" : undefined
  };
}

export function getDemoAttendanceHistory(token: string): AttendanceTimelineItem[] {
  const role = getDemoRoleFromToken(token);
  if (!role) return [];
  return ATTENDANCE[role] ?? [];
}

export function getDemoRequests(token: string): LeaveRequestItem[] {
  const role = getDemoRoleFromToken(token);
  if (!role) return [];
  return REQUESTS[role] ?? [];
}

export function getDemoAdminOverview(): AdminOverview {
  return {
    totalEmployees: 248,
    checkedInToday: 187,
    onTimeToday: 182,
    lateToday: 5,
    pendingRequests: 6,
    absentToday: 61,
    exceptionCount: 5,
    recentActivity: ADMIN_ACTIVITY
  };
}

export function getDemoEmployeeSummary(): EmployeeSummary {
  return {
    totalDays: 0,
    onTimeDays: 0,
    lateDays: 0,
    pendingRequests: 0,
    currentAttendanceState: "idle",
    assignedShift: SHIFT,
    todayRecord: TODAY_RECORD
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
      { id: "scan-01", employeeName: "Fikri Maulana", status: "success" as const, time: "08:03", detail: "QR valid di Gerbang Utama" },
      { id: "scan-02", employeeName: "Leo Pratama", status: "expired" as const, time: "08:09", detail: "Token sudah lewat masa aktif." }
    ]
  };
}

export function getDemoExceptionQueue() {
  return EXCEPTIONS;
}

export function getDemoAuditLogs() {
  return AUDIT_LOGS;
}

const INITIAL_DEMO_DEPARTMENTS: DepartmentItem[] = [
  { id: "dep-ops", name: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra", isActive: true, memberCount: 3 },
  { id: "dep-fnb", name: "F&B Service", managerId: null, managerName: null, isActive: true, memberCount: 2 }
];

const INITIAL_DEMO_EMPLOYEES: EmployeeListItem[] = [
  { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operasional", managerId: "usr-manager-01", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "08:03", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
  { id: "usr-employee-02", fullName: "Anisa Rahma", email: "anisa@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operations", managerId: "usr-manager-01", managerName: "Raka Saputra", todayStatus: "late", checkInTime: "08:24", validationStatus: "needs_review", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
  { id: "usr-employee-03", fullName: "Leo Pratama", email: "leo@taptu.app", role: "employee", departmentId: "dep-fnb", departmentName: "F&B Service", todayStatus: "absent", shiftName: "Shift Sore", locationName: "Kantor Pusat" },
  { id: "usr-employee-04", fullName: "Dina Fitriani", email: "dina@taptu.app", role: "employee", departmentId: "dep-fnb", departmentName: "F&B Service", todayStatus: "leave", shiftName: "Shift Pagi", locationName: "Kantor Cabang Selatan" },
  { id: "usr-employee-05", fullName: "Budi Santoso", email: "budi@taptu.app", role: "employee", departmentId: "dep-ops", departmentName: "Operations", managerId: "usr-manager-01", managerName: "Raka Saputra", todayStatus: "present", checkInTime: "07:58", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" },
  { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", role: "manager", departmentId: "dep-ops", departmentName: "Operations", todayStatus: "present", checkInTime: "08:00", validationStatus: "verified", shiftName: "Shift Pagi", locationName: "Kantor Pusat" }
];

let demoDepartments: DepartmentItem[] = INITIAL_DEMO_DEPARTMENTS.map((department) => ({ ...department }));
let demoEmployees: EmployeeListItem[] = INITIAL_DEMO_EMPLOYEES.map((employee) => ({ ...employee }));

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

const DEMO_REPORT_ROWS: AttendanceReportRow[] = [
  { id: "att-demo-01", employeeName: "Fikri Maulana", employeeId: "usr-employee-01", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:03:00.000Z", checkOutTime: "2026-05-02T17:05:00.000Z", status: "Selesai", validationStatus: "verified", validationReasons: [], locationLat: -6.2087, locationLng: 106.8457, isLate: false, hasException: false, selfieProof: true, deviceValidated: true },
  { id: "att-demo-02", employeeName: "Anisa Rahma", employeeId: "usr-employee-02", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T08:24:00.000Z", status: "Terlambat", validationStatus: "needs_review", validationReasons: ["Di luar radius lokasi kerja (603 m).", "Perangkat berbeda dari riwayat sebelumnya."], locationLat: -6.206, locationLng: 106.851, isLate: true, hasException: true, selfieProof: false, deviceValidated: true },
  { id: "att-demo-03", employeeName: "Leo Pratama", employeeId: "usr-employee-03", date: "2026-05-02", shiftName: "Shift Sore", workLocationName: "Kantor Pusat", status: "Belum check-in", validationStatus: "blocked", validationReasons: ["Belum masuk geofence"], isLate: false, hasException: false, selfieProof: false, deviceValidated: false },
  { id: "att-demo-04", employeeName: "Budi Santoso", employeeId: "usr-employee-05", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Pusat", checkInTime: "2026-05-02T07:58:00.000Z", checkOutTime: "2026-05-02T17:01:00.000Z", status: "Selesai", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: true, deviceValidated: true },
  { id: "att-demo-05", employeeName: "Dina Fitriani", employeeId: "usr-employee-04", date: "2026-05-02", shiftName: "Shift Pagi", workLocationName: "Kantor Cabang Selatan", status: "Izin", validationStatus: "verified", validationReasons: [], isLate: false, hasException: false, selfieProof: false, deviceValidated: false, approvalStatus: "Disetujui" }
];

export function getDemoEmployeeList(): EmployeeListItem[] {
  return demoEmployees.map((employee) => ({ ...employee }));
}

export function getDemoDepartments(): DepartmentItem[] {
  return demoDepartments.map((department) => ({
    ...department,
    managerName: department.managerId ? demoEmployees.find((employee) => employee.id === department.managerId)?.fullName ?? null : null,
    memberCount: demoEmployees.filter((employee) => employee.departmentId === department.id).length
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
  return DEMO_REPORT_ROWS;
}
