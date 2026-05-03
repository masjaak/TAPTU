import type {
  ApprovalRequestType,
  AttendanceActivityItem,
  AttendanceExceptionItem,
  AttendanceExceptionStatus,
  AttendanceExceptionType,
  AttendanceRecord as SharedAttendanceRecord,
  AttendanceReportFilters,
  AttendanceReportRow,
  AttendanceState,
  AttendanceTimelineItem,
  AttendanceValidationStatus,
  AuditLogItem,
  EmployeeListItem,
  ShiftInfo,
  ShiftRecord,
  UserRole,
  WorkLocation,
  WorkLocationItem
} from "@taptu/shared";

export type AttendanceMode = "QR" | "GPS" | "Selfie" | "Manual";
export type AttendanceFlowState = AttendanceState;
export type RequestFlowStatus = "Menunggu" | "Disetujui" | "Ditolak";

export interface AttendanceRecord {
  id?: string;
  userId: string;
  shiftId: string;
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  locationId: string;
  locationName: string;
  state: AttendanceFlowState;
  status: "Belum check-in" | "Tepat waktu" | "Terlambat" | "Selesai";
  checkInAt?: string;
  checkInMethod?: AttendanceMode;
  checkOutAt?: string;
  checkOutMethod?: AttendanceMode;
  locationLat?: number;
  locationLng?: number;
  validationStatus: AttendanceValidationStatus;
  validationReasons: string[];
  selfieUrl?: string;
  deviceId?: string;
  scannerTokenId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestRecord {
  id: string;
  userId: string;
  category: ApprovalRequestType;
  startDate: string;
  endDate: string;
  title: string;
  detail: string;
  status: RequestFlowStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ScannerScanRecord {
  id: string;
  employeeId?: string;
  employeeName?: string;
  status: "success" | "invalid" | "expired";
  detail: string;
  createdAt: string;
}

export interface ScannerRecord {
  id: string;
  token: string;
  locationId: string;
  locationName: string;
  expiresAt: string;
  status: "active" | "expired" | "invalidated";
  scansToday: number;
  recentScans: ScannerScanRecord[];
}

export interface ExceptionRecord {
  id: string;
  attendanceRecordId: string;
  employeeId: string;
  exceptionType: AttendanceExceptionType;
  reason: string;
  status: AttendanceExceptionStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  action: AuditLogItem["action"];
  actorName: string;
  actorRole: UserRole;
  targetId: string;
  detail: string;
  createdAt: string;
}

export interface DemoStore {
  attendance: Record<string, AttendanceRecord>;
  attendanceHistory: AttendanceTimelineItem[];
  requests: RequestRecord[];
  scanner: ScannerRecord;
  exceptions: ExceptionRecord[];
  auditLogs: AuditLogRecord[];
  workLocations: WorkLocation[];
  workLocationItems: WorkLocationItem[];
  shifts: ShiftRecord[];
}

export interface ValidationContext {
  locationLat?: number;
  locationLng?: number;
  selfieUrl?: string;
  deviceId?: string;
  scannerToken?: string;
  requiredSelfie?: boolean;
  previousDeviceId?: string;
  location: WorkLocation;
  now: string;
}

export interface ValidationResult {
  status: AttendanceValidationStatus;
  reasons: string[];
  exceptionType?: AttendanceExceptionType;
  distanceMeters?: number;
}

export type AttendanceEvent =
  | {
      type: "CHECK_IN";
      method: AttendanceMode;
      at: string;
      locationLat?: number;
      locationLng?: number;
      validationStatus?: AttendanceValidationStatus;
      validationReasons?: string[];
      selfieUrl?: string;
      deviceId?: string;
      scannerTokenId?: string;
    }
  | {
      type: "CHECK_OUT";
      method: AttendanceMode;
      at: string;
      locationLat?: number;
      locationLng?: number;
      validationStatus?: AttendanceValidationStatus;
      validationReasons?: string[];
      selfieUrl?: string;
      deviceId?: string;
      scannerTokenId?: string;
    };

export type RequestEvent =
  | { type: "CREATE"; request: RequestRecord }
  | { type: "APPROVE"; id: string; actorRole: UserRole; adminNote?: string; reviewedBy?: string; reviewedAt?: string }
  | { type: "REJECT"; id: string; actorRole: UserRole; adminNote?: string; reviewedBy?: string; reviewedAt?: string }
  | { type: "CANCEL"; id: string; actorRole: UserRole };

export type ExceptionDecisionEvent = {
  id: string;
  status: AttendanceExceptionStatus;
  actorName: string;
  actorRole: UserRole;
  adminNote: string;
  reviewedAt: string;
};

export const DEFAULT_LOCATION: WorkLocation = {
  id: "loc-hq",
  name: "Kantor Pusat",
  latitude: -6.2088,
  longitude: 106.8456,
  radiusMeters: 150
};

const DEFAULT_SHIFT: ShiftInfo = {
  id: "shift-pagi",
  name: "Shift Pagi",
  startTime: "08:00",
  endTime: "17:00",
  locationName: DEFAULT_LOCATION.name
};

const MANAGER_APPROVAL_TYPES: ApprovalRequestType[] = ["Izin", "Permission", "Attendance Correction", "Forgot Check-in/out"];

function createTokenSegment() {
  return Math.random().toString(36).slice(2, 5).toUpperCase();
}

export function generateScannerToken(now = new Date()) {
  return `HDR-${createTokenSegment()}-${createTokenSegment()}`;
}

function toMinutes(value: string) {
  return Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
}

function shiftMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isLateCheckIn(at: string, shiftStartTime: string) {
  return toMinutes(at) > shiftMinutes(shiftStartTime) + 10;
}

function buildRecordStatus(state: AttendanceFlowState, at: string | undefined, shiftStartTime: string) {
  if (state === "idle") {
    return "Belum check-in" as const;
  }

  if (state === "checked_out") {
    return "Selesai" as const;
  }

  return at && isLateCheckIn(at, shiftStartTime) ? ("Terlambat" as const) : ("Tepat waktu" as const);
}

export function calculateDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6371000;
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}

export function validateScannerToken(scanner: ScannerRecord, submittedToken?: string) {
  const now = new Date().toISOString();

  if (!submittedToken) {
    return {
      valid: false,
      reason: "Token scanner tidak dikirim.",
      exceptionType: "Invalid QR" as const
    };
  }

  if (scanner.status !== "active") {
    return {
      valid: false,
      reason: "Token scanner tidak aktif.",
      exceptionType: "Invalid QR" as const
    };
  }

  if (scanner.expiresAt <= now) {
    return {
      valid: false,
      reason: "Token scanner sudah kedaluwarsa.",
      exceptionType: "Expired QR" as const
    };
  }

  if (scanner.token !== submittedToken) {
    return {
      valid: false,
      reason: "Token scanner tidak cocok.",
      exceptionType: "Invalid QR" as const
    };
  }

  return { valid: true };
}

export function validateAttendanceSubmission(context: ValidationContext): ValidationResult {
  const reasons: string[] = [];
  let exceptionType: AttendanceExceptionType | undefined;
  let status: AttendanceValidationStatus = "verified";
  let distanceMeters: number | undefined;

  if (context.locationLat === undefined || context.locationLng === undefined) {
    reasons.push("Lokasi belum terekam.");
    status = "needs_review";
    exceptionType = "Outside radius";
  } else {
    distanceMeters = calculateDistanceMeters(
      { latitude: context.locationLat, longitude: context.locationLng },
      { latitude: context.location.latitude, longitude: context.location.longitude }
    );

    if (distanceMeters > context.location.radiusMeters) {
      reasons.push(`Di luar radius lokasi kerja (${distanceMeters} m).`);
      status = "needs_review";
      exceptionType = "Outside radius";
    }
  }

  if (context.requiredSelfie && !context.selfieUrl) {
    reasons.push("Selfie wajib belum dilampirkan.");
    status = "needs_review";
    exceptionType = exceptionType ?? "Missing selfie";
  }

  if (context.previousDeviceId && context.deviceId && context.previousDeviceId !== context.deviceId) {
    reasons.push("Perangkat berbeda dari riwayat sebelumnya.");
    status = "needs_review";
    exceptionType = exceptionType ?? "Different device";
  }

  return {
    status,
    reasons,
    exceptionType,
    distanceMeters
  };
}

function createBaseRecord(userId: string): AttendanceRecord {
  const now = new Date().toISOString();

  return {
    id: `att-${userId}-${now.slice(0, 10)}`,
    userId,
    shiftId: DEFAULT_SHIFT.id,
    shiftName: DEFAULT_SHIFT.name,
    shiftStartTime: DEFAULT_SHIFT.startTime,
    shiftEndTime: DEFAULT_SHIFT.endTime,
    locationId: DEFAULT_LOCATION.id,
    locationName: DEFAULT_LOCATION.name,
    state: "idle",
    status: "Belum check-in",
    validationStatus: "verified",
    validationReasons: [],
    createdAt: now,
    updatedAt: now
  };
}

export function createCheckInRecord(current: AttendanceRecord | undefined, event: Extract<AttendanceEvent, { type: "CHECK_IN" }>): AttendanceRecord {
  const record = current ?? createBaseRecord("unknown");

  if (record.state !== "idle") {
    return record;
  }

  return {
    ...record,
    state: "checked_in",
    status: buildRecordStatus("checked_in", event.at, record.shiftStartTime),
    checkInAt: event.at,
    checkInMethod: event.method,
    locationLat: event.locationLat,
    locationLng: event.locationLng,
    validationStatus: event.validationStatus ?? "verified",
    validationReasons: event.validationReasons ?? [],
    selfieUrl: event.selfieUrl ?? record.selfieUrl,
    deviceId: event.deviceId ?? record.deviceId,
    scannerTokenId: event.scannerTokenId ?? record.scannerTokenId,
    createdAt: record.createdAt ?? event.at,
    updatedAt: event.at
  };
}

export function updateCheckOutRecord(current: AttendanceRecord, event: Extract<AttendanceEvent, { type: "CHECK_OUT" }>): AttendanceRecord {
  if (current.state !== "checked_in") {
    return current;
  }

  return {
    ...current,
    state: "checked_out",
    status: "Selesai",
    checkOutAt: event.at,
    checkOutMethod: event.method,
    locationLat: event.locationLat ?? current.locationLat,
    locationLng: event.locationLng ?? current.locationLng,
    validationStatus: event.validationStatus ?? current.validationStatus,
    validationReasons: event.validationReasons ?? current.validationReasons,
    selfieUrl: event.selfieUrl ?? current.selfieUrl,
    deviceId: event.deviceId ?? current.deviceId,
    scannerTokenId: event.scannerTokenId ?? current.scannerTokenId,
    updatedAt: event.at
  };
}

export function reduceAttendance(record: AttendanceRecord, event: AttendanceEvent): AttendanceRecord {
  if (event.type === "CHECK_IN") {
    return createCheckInRecord(record, event);
  }

  return updateCheckOutRecord(record, event);
}

function canApproveRequest(role: UserRole, category: ApprovalRequestType) {
  if (role === "admin" || role === "superadmin") {
    return true;
  }

  if (role === "manager") {
    return MANAGER_APPROVAL_TYPES.includes(category);
  }

  return false;
}

export function reduceRequests(requests: RequestRecord[], event: RequestEvent): RequestRecord[] {
  if (event.type === "CREATE") {
    return [event.request, ...requests];
  }

  if (event.type === "CANCEL") {
    if (event.actorRole !== "employee" && event.actorRole !== "admin" && event.actorRole !== "superadmin" && event.actorRole !== "manager") {
      return requests;
    }

    return requests.filter((request) => !(request.id === event.id && request.status === "Menunggu"));
  }

  return requests.map((request) => {
    if (request.id !== event.id || request.status !== "Menunggu" || !canApproveRequest(event.actorRole, request.category)) {
      return request;
    }

    return {
      ...request,
      status: event.type === "APPROVE" ? "Disetujui" : "Ditolak",
      adminNote: event.adminNote,
      reviewedBy: event.reviewedBy,
      reviewedAt: event.reviewedAt
    };
  });
}

export function reduceExceptionReview(exceptions: ExceptionRecord[], event: ExceptionDecisionEvent): ExceptionRecord[] {
  return exceptions.map((item) =>
    item.id === event.id
      ? {
          ...item,
          status: event.status,
          adminNote: event.adminNote,
          reviewedBy: event.actorName,
          reviewedAt: event.reviewedAt
        }
      : item
  );
}

export function createAttendanceException(record: AttendanceRecord, employeeId: string, exceptionType: AttendanceExceptionType, reason: string): ExceptionRecord {
  return {
    id: `exc-${record.id ?? employeeId}-${Date.now()}`,
    attendanceRecordId: record.id ?? `att-${employeeId}`,
    employeeId,
    exceptionType,
    reason,
    status: "Need Review",
    createdAt: new Date().toISOString()
  };
}

export function createAuditLog(action: AuditLogRecord["action"], actorName: string, actorRole: UserRole, targetId: string, detail: string): AuditLogRecord {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    actorName,
    actorRole,
    targetId,
    detail,
    createdAt: new Date().toISOString()
  };
}

export function refreshScannerToken(previous: ScannerRecord): ScannerRecord {
  const nextToken = generateScannerToken();
  const nextExpiry = new Date(Date.now() + 30_000).toISOString();

  return {
    ...previous,
    token: nextToken,
    expiresAt: nextExpiry,
    status: "active"
  };
}

export function appendScannerAttempt(scanner: ScannerRecord, attempt: ScannerScanRecord): ScannerRecord {
  return {
    ...scanner,
    scansToday: scanner.scansToday + (attempt.status === "success" ? 1 : 0),
    recentScans: [attempt, ...scanner.recentScans].slice(0, 8)
  };
}

export function filterAttendanceHistory(items: AttendanceTimelineItem[], filter: "all" | "present" | "issue") {
  if (filter === "all") {
    return items;
  }

  if (filter === "present") {
    return items.filter((item) => item.status === "Tepat waktu" || item.status === "Terlambat");
  }

  return items.filter((item) => item.status === "Izin" || item.status === "Belum check-in");
}

export function getTodayAttendanceRecord(store: DemoStore, userId: string): AttendanceRecord {
  return store.attendance[userId] ?? {
    ...createBaseRecord(userId),
    id: `att-${userId}-today`
  };
}

export function toSharedAttendanceRecord(record: AttendanceRecord): SharedAttendanceRecord {
  return {
    id: record.id ?? `att-${record.userId}`,
    employeeId: record.userId,
    shiftId: record.shiftId,
    checkInTime: record.checkInAt,
    checkOutTime: record.checkOutAt,
    status: record.status,
    locationLat: record.locationLat,
    locationLng: record.locationLng,
    validationStatus: record.validationStatus,
    validationReasons: record.validationReasons,
    selfieUrl: record.selfieUrl,
    deviceId: record.deviceId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function toExceptionItem(record: ExceptionRecord, userDirectory: Record<string, string>): AttendanceExceptionItem {
  return {
    id: record.id,
    attendanceRecordId: record.attendanceRecordId,
    employeeId: record.employeeId,
    employeeName: userDirectory[record.employeeId] ?? "Employee",
    exceptionType: record.exceptionType,
    reason: record.reason,
    status: record.status,
    adminNote: record.adminNote,
    reviewedBy: record.reviewedBy,
    reviewedAt: record.reviewedAt,
    createdAt: record.createdAt
  };
}

export function listRecentAttendanceActivity(
  store: DemoStore,
  userDirectory: Record<string, string>
): AttendanceActivityItem[] {
  return Object.values(store.attendance)
    .filter((record) => record.state !== "idle")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 5)
    .map((record) => ({
      id: record.id ?? `activity-${record.userId}`,
      employeeName: userDirectory[record.userId] ?? "Employee",
      event: record.validationStatus === "verified" ? (record.state === "checked_out" ? "Check-out" : "Check-in") : "Butuh review",
      time: (record.state === "checked_out" ? record.checkOutAt : record.checkInAt)?.slice(11, 16) ?? "--.--",
      status: record.status,
      detail:
        record.validationStatus === "verified"
          ? `${record.shiftName} · ${record.locationName}`
          : record.validationReasons.join(", ")
    }));
}

export function computeAdminOverview(
  store: DemoStore,
  totalEmployees: number,
  userDirectory: Record<string, string> = {}
) {
  const todayRecords = Object.values(store.attendance);
  const checkedInToday = todayRecords.filter((record) => record.state === "checked_in" || record.state === "checked_out").length;
  const onTimeToday = todayRecords.filter((record) => record.status === "Tepat waktu" || record.status === "Selesai").length;
  const lateToday = todayRecords.filter((record) => record.status === "Terlambat").length;
  const pendingRequests = store.requests.filter((request) => request.status === "Menunggu").length;
  const absentToday = Math.max(0, totalEmployees - checkedInToday);
  const exceptionCount = store.exceptions.filter((item) => item.status === "Need Review" || item.status === "Request Correction").length;

  return {
    totalEmployees,
    checkedInToday,
    onTimeToday,
    lateToday,
    pendingRequests,
    absentToday,
    exceptionCount,
    recentActivity: listRecentAttendanceActivity(store, userDirectory)
  };
}

export function computeEmployeeSummary(store: DemoStore, userId: string) {
  const onTimeDays = store.attendanceHistory.filter((item) => item.status === "Tepat waktu").length;
  const lateDays = store.attendanceHistory.filter((item) => item.status === "Terlambat").length;
  const totalDays = onTimeDays + lateDays;
  const pendingRequests = store.requests.filter((request) => request.userId === userId && request.status === "Menunggu").length;
  const currentAttendance = getTodayAttendanceRecord(store, userId);

  return {
    totalDays,
    onTimeDays,
    lateDays,
    pendingRequests,
    currentAttendanceState: currentAttendance.state,
    assignedShift: DEFAULT_SHIFT,
    todayRecord: toSharedAttendanceRecord(currentAttendance)
  };
}

export function createInitialStore(): DemoStore {
  const now = new Date();
  const scanner = {
    id: "scanner-default",
    token: "HDR-31A-7XZ",
    locationId: DEFAULT_LOCATION.id,
    locationName: DEFAULT_LOCATION.name,
    expiresAt: new Date(now.getTime() + 30_000).toISOString(),
    status: "active" as const,
    scansToday: 124,
    recentScans: [
      {
        id: "scan-01",
        employeeId: "usr-employee-01",
        employeeName: "Fikri Maulana",
        status: "success" as const,
        detail: "QR valid di Gerbang Utama",
        createdAt: "2026-05-02T08:03:00.000Z"
      },
      {
        id: "scan-02",
        employeeId: "usr-employee-03",
        employeeName: "Leo Pratama",
        status: "expired" as const,
        detail: "Token sudah lewat masa aktif.",
        createdAt: "2026-05-02T08:09:00.000Z"
      }
    ]
  };

  return {
    attendance: {
      "usr-employee-01": {
        id: "att-usr-employee-01-2026-05-02",
        userId: "usr-employee-01",
        shiftId: DEFAULT_SHIFT.id,
        shiftName: DEFAULT_SHIFT.name,
        shiftStartTime: DEFAULT_SHIFT.startTime,
        shiftEndTime: DEFAULT_SHIFT.endTime,
        locationId: DEFAULT_LOCATION.id,
        locationName: DEFAULT_LOCATION.name,
        state: "checked_in",
        status: "Tepat waktu",
        checkInAt: "2026-05-02T08:03:00.000Z",
        checkInMethod: "QR",
        locationLat: -6.2087,
        locationLng: 106.8457,
        validationStatus: "verified",
        validationReasons: [],
        selfieUrl: "placeholder://selfie-fikri",
        deviceId: "ios-15pm-demo",
        scannerTokenId: scanner.id,
        createdAt: "2026-05-02T08:03:00.000Z",
        updatedAt: "2026-05-02T08:03:00.000Z"
      },
      "usr-employee-02": {
        id: "att-usr-employee-02-2026-05-02",
        userId: "usr-employee-02",
        shiftId: DEFAULT_SHIFT.id,
        shiftName: DEFAULT_SHIFT.name,
        shiftStartTime: DEFAULT_SHIFT.startTime,
        shiftEndTime: DEFAULT_SHIFT.endTime,
        locationId: DEFAULT_LOCATION.id,
        locationName: DEFAULT_LOCATION.name,
        state: "checked_in",
        status: "Terlambat",
        checkInAt: "2026-05-02T08:24:00.000Z",
        checkInMethod: "GPS",
        locationLat: -6.206,
        locationLng: 106.851,
        validationStatus: "needs_review",
        validationReasons: ["Di luar radius lokasi kerja (603 m).", "Perangkat berbeda dari riwayat sebelumnya."],
        selfieUrl: "",
        deviceId: "android-hr-02-new",
        createdAt: "2026-05-02T08:24:00.000Z",
        updatedAt: "2026-05-02T08:24:00.000Z"
      },
      "usr-employee-03": {
        id: "att-usr-employee-03-2026-05-02",
        userId: "usr-employee-03",
        shiftId: DEFAULT_SHIFT.id,
        shiftName: DEFAULT_SHIFT.name,
        shiftStartTime: DEFAULT_SHIFT.startTime,
        shiftEndTime: DEFAULT_SHIFT.endTime,
        locationId: DEFAULT_LOCATION.id,
        locationName: DEFAULT_LOCATION.name,
        state: "idle",
        status: "Belum check-in",
        validationStatus: "blocked",
        validationReasons: ["Belum masuk geofence"],
        selfieUrl: "",
        deviceId: "android-ops-03",
        createdAt: "2026-05-02T07:30:00.000Z",
        updatedAt: "2026-05-02T07:30:00.000Z"
      }
    },
    attendanceHistory: [
      { id: "att-usr-employee-01-2026-05-02", day: "Hari ini", status: "Tepat waktu", time: "08:03", method: "QR" },
      { id: "att-002", day: "Kemarin", status: "Tepat waktu", time: "07:55", method: "Selfie" },
      { id: "att-003", day: "Senin", status: "Izin", time: "08:00", method: "Manual" }
    ],
    requests: [
      {
        id: "req-001",
        userId: "usr-employee-01",
        category: "Permission",
        startDate: "2026-05-03",
        endDate: "2026-05-03",
        title: "Izin pribadi",
        detail: "Perlu keluar kantor pukul 15.00 untuk urusan keluarga.",
        status: "Menunggu",
        createdAt: "2026-05-02T08:30:00.000Z"
      },
      {
        id: "req-002",
        userId: "usr-employee-02",
        category: "Attendance Correction",
        startDate: "2026-05-02",
        endDate: "2026-05-02",
        title: "Koreksi check-in",
        detail: "GPS valid, tetapi token QR kadaluarsa saat scan pertama.",
        status: "Menunggu",
        createdAt: "2026-05-02T07:50:00.000Z"
      }
    ],
    scanner,
    exceptions: [
      {
        id: "exc-001",
        attendanceRecordId: "att-usr-employee-02-2026-05-02",
        employeeId: "usr-employee-02",
        exceptionType: "Outside radius",
        reason: "Di luar radius lokasi kerja (603 m).",
        status: "Need Review",
        createdAt: "2026-05-02T08:24:00.000Z"
      },
      {
        id: "exc-002",
        attendanceRecordId: "att-usr-employee-02-2026-05-02",
        employeeId: "usr-employee-02",
        exceptionType: "Different device",
        reason: "Perangkat berbeda dari riwayat sebelumnya.",
        status: "Need Review",
        createdAt: "2026-05-02T08:24:00.000Z"
      }
    ],
    auditLogs: [
      {
        id: "audit-001",
        action: "scanner_token_invalid_attempt",
        actorName: "System",
        actorRole: "scanner",
        targetId: "scan-02",
        detail: "Scan gagal karena token sudah expired.",
        createdAt: "2026-05-02T08:09:00.000Z"
      }
    ],
    workLocations: [DEFAULT_LOCATION],
    workLocationItems: [
      {
        id: "loc-hq",
        name: "Kantor Pusat",
        address: "Jl. Sudirman No. 1, Jakarta Pusat",
        latitude: -6.2088,
        longitude: 106.8456,
        radiusMeters: 150,
        status: "active" as const,
        createdAt: "2026-05-01T00:00:00.000Z"
      },
      {
        id: "loc-branch",
        name: "Kantor Cabang Selatan",
        address: "Jl. TB Simatupang No. 88, Jakarta Selatan",
        latitude: -6.295,
        longitude: 106.814,
        radiusMeters: 100,
        status: "active" as const,
        createdAt: "2026-05-01T00:00:00.000Z"
      }
    ],
    shifts: [
      {
        id: "shift-pagi",
        name: "Shift Pagi",
        startTime: "08:00",
        endTime: "17:00",
        gracePeriodMinutes: 10,
        workLocationId: "loc-hq",
        workLocationName: "Kantor Pusat",
        breakStartTime: "12:00",
        breakEndTime: "13:00",
        status: "active" as const,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z"
      },
      {
        id: "shift-sore",
        name: "Shift Sore",
        startTime: "13:00",
        endTime: "22:00",
        gracePeriodMinutes: 10,
        workLocationId: "loc-hq",
        workLocationName: "Kantor Pusat",
        status: "active" as const,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z"
      }
    ]
  };
}

export function computeEmployeeList(
  store: DemoStore,
  rawUsers: Array<{ id: string; fullName: string; email: string; role: UserRole }>
): EmployeeListItem[] {
  return rawUsers
    .filter((user) => user.role === "employee" || user.role === "manager")
    .map((user) => {
      const record = store.attendance[user.id];
      let todayStatus: EmployeeListItem["todayStatus"] = "absent";
      let checkInTime: string | undefined;
      let validationStatus: AttendanceValidationStatus | undefined;

      if (record) {
        if (record.state === "checked_in" || record.state === "checked_out") {
          todayStatus = record.status === "Terlambat" ? "late" : "present";
          checkInTime = record.checkInAt?.slice(11, 16);
          validationStatus = record.validationStatus;
        }
      }

      const hasLeave = store.requests.some(
        (r) => r.userId === user.id && r.status === "Disetujui" && (r.category === "Izin" || r.category === "Cuti" || r.category === "Sakit")
      );
      if (hasLeave && todayStatus === "absent") {
        todayStatus = "leave";
      }

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        todayStatus,
        checkInTime,
        validationStatus,
        shiftName: DEFAULT_SHIFT.name,
        locationName: DEFAULT_LOCATION.name
      };
    });
}

export function createShiftRecord(data: {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes?: number;
  workLocationId?: string;
  workLocationName?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}): ShiftRecord {
  const now = new Date().toISOString();
  return {
    id: `shift-${Date.now()}`,
    name: data.name,
    startTime: data.startTime,
    endTime: data.endTime,
    gracePeriodMinutes: data.gracePeriodMinutes ?? 10,
    workLocationId: data.workLocationId,
    workLocationName: data.workLocationName,
    breakStartTime: data.breakStartTime,
    breakEndTime: data.breakEndTime,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export function updateShiftRecord(existing: ShiftRecord, patch: Partial<ShiftRecord>): ShiftRecord {
  return { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
}

export function createWorkLocationItem(data: {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}): WorkLocationItem {
  const now = new Date().toISOString();
  return {
    id: `loc-${Date.now()}`,
    name: data.name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    radiusMeters: data.radiusMeters,
    status: "active",
    createdAt: now
  };
}

export function toWorkLocationModel(item: WorkLocationItem): WorkLocation {
  return {
    id: item.id,
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    radiusMeters: item.radiusMeters
  };
}

export function buildAttendanceReportRows(
  store: DemoStore,
  userDirectory: Record<string, string>,
  filters?: AttendanceReportFilters
): AttendanceReportRow[] {
  const today = new Date().toISOString().slice(0, 10);
  const rows: AttendanceReportRow[] = [];

  for (const [userId, record] of Object.entries(store.attendance)) {
    const employeeName = userDirectory[userId] ?? "Employee";

    if (filters?.employeeId && filters.employeeId !== userId) continue;
    if (filters?.status && record.status !== filters.status) continue;

    const hasException = store.exceptions.some((e) => e.attendanceRecordId === record.id && (e.status === "Need Review" || e.status === "Request Correction"));
    const approvedLeave = store.requests.find((r) => r.userId === userId && r.status === "Disetujui" && (r.category === "Izin" || r.category === "Cuti" || r.category === "Sakit"));

    rows.push({
      id: record.id ?? `report-${userId}`,
      employeeName,
      employeeId: userId,
      date: today,
      shiftName: record.shiftName,
      workLocationName: record.locationName,
      checkInTime: record.checkInAt,
      checkOutTime: record.checkOutAt,
      status: record.status,
      validationStatus: record.validationStatus,
      validationReasons: record.validationReasons,
      locationLat: record.locationLat,
      locationLng: record.locationLng,
      isLate: record.status === "Terlambat",
      hasException,
      selfieProof: Boolean(record.selfieUrl),
      deviceValidated: Boolean(record.deviceId),
      approvalStatus: approvedLeave?.status,
      adminNote: undefined
    });
  }

  for (const histItem of store.attendanceHistory) {
    if (histItem.day === "Hari ini") continue;
    if (filters?.status && histItem.status !== filters.status) continue;

    const alreadyCovered = rows.some((r) => r.id === histItem.id);
    if (alreadyCovered) continue;

    rows.push({
      id: histItem.id ?? `hist-${histItem.day}`,
      employeeName: userDirectory[Object.keys(store.attendance)[0]] ?? "Employee",
      employeeId: Object.keys(store.attendance)[0] ?? "unknown",
      date: histItem.day,
      shiftName: DEFAULT_SHIFT.name,
      workLocationName: DEFAULT_LOCATION.name,
      checkInTime: undefined,
      checkOutTime: undefined,
      status: histItem.status === "Izin" ? "Izin" : histItem.status,
      validationStatus: "verified",
      validationReasons: [],
      isLate: histItem.status === "Terlambat",
      hasException: false,
      selfieProof: false,
      deviceValidated: false
    });
  }

  return rows;
}

export function generateCsvFromRows(rows: AttendanceReportRow[]): string {
  const headers = [
    "Employee Name", "Employee ID", "Date", "Shift", "Work Location",
    "Check-in Time", "Check-out Time", "Status", "Validation Status",
    "Validation Reasons", "Latitude", "Longitude", "Is Late", "Has Exception",
    "Selfie Proof", "Device Validated", "Approval Status", "Admin Note"
  ];

  const escape = (value: string | number | boolean | undefined) => {
    if (value === undefined || value === null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const dataRows = rows.map((row) => [
    escape(row.employeeName),
    escape(row.employeeId),
    escape(row.date),
    escape(row.shiftName),
    escape(row.workLocationName),
    escape(row.checkInTime ? row.checkInTime.slice(11, 16) : ""),
    escape(row.checkOutTime ? row.checkOutTime.slice(11, 16) : ""),
    escape(row.status),
    escape(row.validationStatus),
    escape(row.validationReasons.join(" | ")),
    escape(row.locationLat),
    escape(row.locationLng),
    escape(row.isLate),
    escape(row.hasException),
    escape(row.selfieProof),
    escape(row.deviceValidated),
    escape(row.approvalStatus ?? ""),
    escape(row.adminNote ?? "")
  ].join(","));

  return [headers.join(","), ...dataRows].join("\n");
}
