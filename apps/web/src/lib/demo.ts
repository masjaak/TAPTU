import type {
  AdminOverview,
  AttendanceActivityItem,
  AttendanceExceptionItem,
  AttendanceRecord,
  AttendanceTimelineItem,
  AuditLogItem,
  DashboardPayload,
  DashboardScheduleItem,
  DashboardStat,
  EmployeeSummary,
  LeaveRequestItem,
  LoginResponse,
  ScannerTokenPayload,
  ShiftInfo,
  UserRole
} from "@taptu/shared";

const DEMO_PASSWORD = "Taptu123!";

const DEMO_USERS = [
  { id: "usr-superadmin-01", fullName: "Super Admin", email: "superadmin@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "superadmin" as UserRole },
  { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "admin" as UserRole },
  { id: "usr-manager-01", fullName: "Raka Saputra", email: "manager@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "manager" as UserRole },
  { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "employee" as UserRole },
  { id: "usr-scanner-01", fullName: "Front Gate Scanner", email: "scanner@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "scanner" as UserRole }
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
  checkInTime: "2026-05-02T08:03:00.000Z",
  status: "Tepat waktu",
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
    { label: "Status hari ini", value: "Sudah check-in", detail: "Masuk 08.03 WIB dari lokasi utama" },
    { label: "Shift aktif", value: "08.00 - 17.00", detail: "Kantor pusat · Shift Pagi" },
    { label: "Riwayat minggu ini", value: "4 hadir", detail: "1 pengajuan izin masih diproses" }
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
  employee: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" },
    { id: "a-02", day: "Kemarin", status: "Tepat waktu", time: "07:55", method: "Selfie" },
    { id: "a-03", day: "Senin", status: "Izin", time: "08:00", method: "Manual" }
  ],
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
  employee: [
    { id: "req-01", title: "Izin pribadi", status: "Menunggu", detail: "Dokumen pendukung sedang direview admin." },
    { id: "req-02", title: "Cuti tahunan", status: "Disetujui", detail: "2 hari kerja disetujui untuk minggu depan." }
  ],
  scanner: [
    { id: "req-01", title: "Token gate timur", status: "Disetujui", detail: "QR aktif dan sinkron sampai 30 detik ke depan." }
  ]
};

const ADMIN_ACTIVITY: AttendanceActivityItem[] = [
  { id: "act-01", employeeName: "Anisa Rahma", event: "Butuh review", time: "08:24", status: "Terlambat", detail: "Akurasi GPS rendah · butuh verifikasi HR" },
  { id: "act-02", employeeName: "Fikri Maulana", event: "Check-in", time: "08:03", status: "Tepat waktu", detail: "QR utama · Kantor Pusat" },
  { id: "act-03", employeeName: "Leo Pratama", event: "Check-out", time: "17:09", status: "Selesai", detail: "Shift sore ditutup dari perangkat iPhone" }
];

function demoUserByToken(token: string) {
  const role = token.slice(5) as UserRole;
  return DEMO_USERS.find((user) => user.role === role) ?? DEMO_USERS[0];
}

export function isDemoToken(token: string): boolean {
  return token.startsWith("demo:");
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
  const user = demoUserByToken(token);

  return {
    greeting: `Halo, ${user.fullName}`,
    stats: STATS[user.role] ?? STATS.employee,
    schedule: SCHEDULE,
    attendance: ATTENDANCE[user.role] ?? ATTENDANCE.employee,
    attendanceState: user.role === "employee" ? "checked_in" : "idle",
    requests: REQUESTS[user.role] ?? REQUESTS.employee,
    scannerToken: user.role === "scanner" ? "HDR-31A-7XZ" : undefined
  };
}

export function getDemoAttendanceHistory(token: string): AttendanceTimelineItem[] {
  const role = token.slice(5) as UserRole;
  return ATTENDANCE[role] ?? [];
}

export function getDemoRequests(token: string): LeaveRequestItem[] {
  const role = token.slice(5) as UserRole;
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
    totalDays: 22,
    onTimeDays: 20,
    lateDays: 2,
    pendingRequests: 1,
    currentAttendanceState: "checked_in",
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
