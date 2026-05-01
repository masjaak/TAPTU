import type {
  AdminOverview,
  AttendanceTimelineItem,
  DashboardPayload,
  DashboardStat,
  EmployeeSummary,
  LeaveRequestItem,
  LoginResponse,
  ScannerTokenPayload,
  UserRole
} from "@taptu/shared";

const DEMO_PASSWORD = "Taptu123!";

const DEMO_USERS = [
  { id: "usr-superadmin-01", fullName: "Super Admin", email: "superadmin@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "superadmin" as UserRole },
  { id: "usr-admin-01", fullName: "Nadia Putri", email: "admin@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "admin" as UserRole },
  { id: "usr-employee-01", fullName: "Fikri Maulana", email: "employee@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "employee" as UserRole },
  { id: "usr-scanner-01", fullName: "Front Gate Scanner", email: "scanner@taptu.app", password: DEMO_PASSWORD, organizationName: "TAPTU HQ", role: "scanner" as UserRole },
];

export function isDemoToken(token: string): boolean {
  return token.startsWith("demo:");
}

export function tryDemoLogin(email: string, password: string): LoginResponse | null {
  const found = DEMO_USERS.find((u) => u.email === email && u.password === password);
  if (!found) return null;
  const { password: _pw, ...user } = found;
  return { token: `demo:${user.role}`, user };
}

function demoUserByToken(token: string) {
  const role = token.slice(5) as UserRole;
  return DEMO_USERS.find((u) => u.role === role) ?? DEMO_USERS[0];
}

const SCHEDULE = [
  { time: "08.00", title: "Check-in kantor", detail: "QR utama akan refresh otomatis tiap 30 detik." },
  { time: "13.00", title: "Review izin harian", detail: "Approval manager dan rekap lokasi kerja." },
  { time: "17.00", title: "Check-out", detail: "Sinkron ke laporan harian dan payroll." }
];

const STATS: Record<UserRole, DashboardStat[]> = {
  superadmin: [],
  admin: [
    { label: "Karyawan Aktif", value: "248", detail: "18 cabang tersinkron hari ini" },
    { label: "Check-in Tepat Waktu", value: "91%", detail: "Naik 7% dibanding kemarin" },
    { label: "Permintaan Izin", value: "14", detail: "6 perlu approval segera" }
  ],
  employee: [
    { label: "Status Hari Ini", value: "Check-in", detail: "Masuk 08.03 WIB via lokasi utama" },
    { label: "Shift Aktif", value: "Pagi", detail: "08.00 - 17.00 WIB" },
    { label: "Sisa Cuti", value: "8 Hari", detail: "2 pengajuan sedang diproses" }
  ],
  scanner: [
    { label: "Token Aktif", value: "00:27", detail: "QR akan refresh otomatis" },
    { label: "Scan Hari Ini", value: "124", detail: "14 scan dalam 10 menit terakhir" },
    { label: "Lokasi", value: "Gerbang Utama", detail: "Radius valid 150 meter" }
  ]
};

const ATTENDANCE: Record<UserRole, AttendanceTimelineItem[]> = {
  superadmin: [],
  admin: [
    { day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { day: "Kemarin", status: "Terlambat", time: "08.19", method: "GPS" },
    { day: "Senin", status: "Tepat waktu", time: "07.58", method: "QR" }
  ],
  employee: [
    { day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { day: "Kemarin", status: "Tepat waktu", time: "07.55", method: "Selfie" },
    { day: "Senin", status: "Izin", time: "08.00", method: "Manual" }
  ],
  scanner: [
    { day: "08.03", status: "Tepat waktu", time: "Nadia Putri", method: "QR" },
    { day: "08.07", status: "Tepat waktu", time: "Ilham Fadli", method: "QR" },
    { day: "08.09", status: "Belum check-in", time: "1 scan gagal radius", method: "Manual" }
  ]
};

const REQUESTS: Record<UserRole, LeaveRequestItem[]> = {
  superadmin: [],
  admin: [
    { title: "Izin sakit · Anisa Rahma", status: "Menunggu", detail: "Butuh approval hari ini sebelum 12.00." },
    { title: "Cuti tahunan · Fikri Maulana", status: "Disetujui", detail: "2 hari kerja, mulai Jumat." },
    { title: "Tukar shift · Leo Pratama", status: "Menunggu", detail: "Menunggu manager operasional." }
  ],
  employee: [
    { title: "Cuti tahunan", status: "Disetujui", detail: "2 hari kerja disetujui untuk minggu depan." },
    { title: "Izin pribadi", status: "Menunggu", detail: "Dokumen pendukung sedang direview admin." }
  ],
  scanner: [
    { title: "Token gate timur", status: "Disetujui", detail: "QR aktif dan sinkron sampai 30 detik ke depan." },
    { title: "Permintaan reset scanner", status: "Menunggu", detail: "Tunggu admin memperbarui PIN perangkat." }
  ]
};

export function getDemoDashboard(token: string): DashboardPayload {
  const user = demoUserByToken(token);
  const role = user.role;
  return {
    greeting: `Halo, ${user.fullName}`,
    stats: STATS[role] ?? [],
    schedule: SCHEDULE,
    attendance: ATTENDANCE[role] ?? [],
    attendanceState: "idle",
    requests: REQUESTS[role] ?? [],
    scannerToken: role === "scanner" ? "HDR-31A-7XZ" : undefined
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
  return { totalEmployees: 1, checkedInToday: 1, onTimeToday: 1, lateToday: 0, pendingRequests: 2 };
}

export function getDemoEmployeeSummary(): EmployeeSummary {
  return { totalDays: 22, onTimeDays: 20, lateDays: 2, pendingRequests: 1, currentAttendanceState: "idle" };
}

export function getDemoScannerToken(): ScannerTokenPayload {
  return { token: "HDR-31A-7XZ", expiresInSeconds: 30, scansToday: 124, locationName: "Gerbang Utama" };
}
