export type UserRole = "superadmin" | "admin" | "manager" | "employee" | "scanner";

export type AttendanceState = "idle" | "checked_in" | "checked_out";
export type AttendanceValidationStatus = "verified" | "needs_review" | "blocked" | "rejected" | "corrected";
export type AttendanceExceptionStatus = "Need Review" | "Approved" | "Rejected" | "Request Correction";
export type AttendanceExceptionType =
  | "Outside radius"
  | "Late check-in"
  | "Missing checkout"
  | "Invalid QR"
  | "Expired QR"
  | "Different device"
  | "Missing selfie"
  | "Selfie issue";
export type ApprovalRequestType =
  | "Izin"
  | "Cuti"
  | "Sakit"
  | "Permission"
  | "Attendance Correction"
  | "Forgot Check-in/out";

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
  category?: ApprovalRequestType;
  startDate?: string;
  endDate?: string;
  title: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  detail: string;
  adminNote?: string;
  createdAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ShiftInfo {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  locationName: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  shiftId: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "Belum check-in" | "Tepat waktu" | "Terlambat" | "Selesai";
  locationLat?: number;
  locationLng?: number;
  validationStatus: AttendanceValidationStatus;
  validationReasons: string[];
  selfieUrl?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceActivityItem {
  id: string;
  employeeName: string;
  event: "Check-in" | "Check-out" | "Butuh review";
  time: string;
  status: string;
  detail: string;
}

export interface AttendanceExceptionItem {
  id: string;
  attendanceRecordId: string;
  employeeId: string;
  employeeName: string;
  exceptionType: AttendanceExceptionType;
  reason: string;
  status: AttendanceExceptionStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ScannerTokenState {
  id: string;
  token: string;
  locationId?: string;
  locationName: string;
  expiresAt: string;
  status: "active" | "expired" | "invalidated";
  scansToday: number;
  recentScans: Array<{
    id: string;
    employeeName: string;
    status: "success" | "invalid" | "expired";
    time: string;
    detail: string;
  }>;
}

export interface WorkLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface AuditLogItem {
  id: string;
  action:
    | "exception_approved"
    | "exception_rejected"
    | "correction_requested"
    | "approval_request_approved"
    | "approval_request_rejected"
    | "attendance_record_updated"
    | "scanner_token_invalid_attempt"
    | "device_mismatch_exception";
  actorName: string;
  actorRole: UserRole;
  targetId: string;
  detail: string;
  createdAt: string;
}

export interface AttendanceActionResponse {
  record: AttendanceTimelineItem;
  attendanceState: AttendanceState;
  validationStatus?: AttendanceValidationStatus;
  validationReasons?: string[];
}

export interface RequestActionResponse {
  request: LeaveRequestItem;
}

export interface ScannerTokenPayload {
  id?: string;
  token: string;
  expiresInSeconds: number;
  scansToday: number;
  locationName: string;
  expiresAt?: string;
  status?: "active" | "expired" | "invalidated";
}

export interface DashboardPayload {
  greeting: string;
  stats: DashboardStat[];
  schedule: DashboardScheduleItem[];
  attendance: AttendanceTimelineItem[];
  attendanceState?: AttendanceState;
  requests: LeaveRequestItem[];
  scannerToken?: string;
}

export interface AdminOverview {
  totalEmployees: number;
  checkedInToday: number;
  onTimeToday: number;
  lateToday: number;
  pendingRequests: number;
  absentToday: number;
  exceptionCount: number;
  recentActivity: AttendanceActivityItem[];
}

export interface EmployeeSummary {
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  pendingRequests: number;
  currentAttendanceState: AttendanceState;
  assignedShift: ShiftInfo;
  todayRecord: AttendanceRecord;
}

export interface ValidationDecisionPayload {
  status: AttendanceExceptionStatus;
  adminNote: string;
}
