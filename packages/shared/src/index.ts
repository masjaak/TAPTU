export type UserRole = "superadmin" | "admin" | "employee" | "scanner";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  organizationName: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  role?: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
}

export interface DashboardScheduleItem {
  time: string;
  title: string;
  detail: string;
}

export interface AttendanceTimelineItem {
  id?: string;
  day: string;
  status: "Tepat waktu" | "Terlambat" | "Izin" | "Belum check-in";
  time: string;
  method: "QR" | "GPS" | "Selfie" | "Manual";
}

export interface LeaveRequestItem {
  id?: string;
  requester?: string;
  category?: "Izin" | "Cuti" | "Sakit";
  startDate?: string;
  endDate?: string;
  title: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  detail: string;
}

export interface AttendanceActionResponse {
  record: AttendanceTimelineItem;
  attendanceState: "idle" | "checked_in" | "checked_out";
}

export interface RequestActionResponse {
  request: LeaveRequestItem;
}

export interface ScannerTokenPayload {
  token: string;
  expiresInSeconds: number;
  scansToday: number;
  locationName: string;
}

export interface DashboardPayload {
  greeting: string;
  stats: DashboardStat[];
  schedule: DashboardScheduleItem[];
  attendance: AttendanceTimelineItem[];
  attendanceState?: "idle" | "checked_in" | "checked_out";
  requests: LeaveRequestItem[];
  scannerToken?: string;
}

export interface AdminOverview {
  totalEmployees: number;
  checkedInToday: number;
  onTimeToday: number;
  lateToday: number;
  pendingRequests: number;
}

export interface EmployeeSummary {
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  pendingRequests: number;
  currentAttendanceState: "idle" | "checked_in" | "checked_out";
}
