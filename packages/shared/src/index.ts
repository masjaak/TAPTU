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
  day: string;
  status: "Tepat waktu" | "Terlambat" | "Izin" | "Belum check-in";
  time: string;
  method: "QR" | "GPS" | "Selfie" | "Manual";
}

export interface LeaveRequestItem {
  title: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  detail: string;
}

export interface DashboardPayload {
  greeting: string;
  stats: DashboardStat[];
  schedule: DashboardScheduleItem[];
  attendance: AttendanceTimelineItem[];
  requests: LeaveRequestItem[];
  scannerToken?: string;
}
