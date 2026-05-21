import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import type {
  AdminOverview,
  AttendanceExceptionItem,
  AttendanceReportFilters,
  AttendanceTimelineItem,
  AttendanceActionResponse,
  AttendanceValidationStatus,
  AuditLogItem,
  AuthUser,
  DashboardPayload,
  DashboardStat,
  DepartmentItem,
  EmployeeSummary,
  LeaveRequestItem,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RequestActionResponse,
  ScannerTokenPayload,
  ValidationDecisionPayload,
  UserRole
} from "@taptu/shared";
import {
  appendScannerAttempt,
  applyEmployeeListFilters,
  buildAttendanceReportRows,
  calculateDistanceMeters,
  computeAdminOverview,
  computeManagerOverview,
  computeEmployeeList,
  computeEmployeeSummary,
  createAttendanceException,
  createAttendanceExceptionNotificationDraft,
  filterNotificationsForRecipient,
  createAuditLog,
  createInitialStore,
  createRequestNotificationDrafts,
  createShiftRecord,
  createWorkLocationItem,
  filterAttendanceHistory,
  generateCsvFromRows,
  generateScannerToken,
  canManageOrganizationStructure,
  reduceAttendance,
  reduceExceptionReview,
  reduceRequests,
  refreshScannerToken,
  markNotificationRead,
  toExceptionItem,
  toWorkLocationModel,
  updateShiftRecord,
  validateAttendanceSubmission,
  validateScannerToken,
  type AttendanceMode,
  type AttendanceRecord
} from "./domain.js";
import { getApiConfig } from "./config.js";
import { createStorageAdapter, uploadAttendanceSelfie } from "./storage.js";
import { createSupabaseAdmin, type SupabaseAdmin } from "./supabase.js";
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseGetProfile,
  supabaseGetTodayAttendance,
  supabaseUpsertAttendance,
  supabaseGetAttendanceHistory,
  supabaseGetAllAttendanceHistory,
  getAdminApprovalRequests,
  getEmployeeRequests,
  createEmployeeRequest,
  approveRequestStep,
  rejectRequestStep,
  getRequestApprovalTimeline,
  supabaseGetRequests,
  supabaseCreateRequest,
  supabaseGetRequestById,
  supabaseUpdateRequestStatus,
  supabaseDeleteRequest,
  supabaseGetAdminOverview,
  supabaseGetManagerOverview,
  supabaseGetDepartments,
  supabaseCreateDepartment,
  supabaseUpdateDepartment,
  supabaseReassignEmployeeDepartment,
  supabaseGetEmployeeList,
  supabaseGetManagerEmployeeList,
  supabaseGetEmployeeSummary,
  supabaseGetExceptions,
  supabaseGetManagerExceptions,
  supabaseGetAuditLogs,
  supabaseGetScannerState,
  supabaseGetPrimaryWorkLocation,
  supabaseGetAttendanceReportRows,
  supabaseRefreshScannerToken,
  supabaseReviewException,
  supabaseCreateAuditLog,
  supabaseCreateAttendanceException,
  supabaseGetManagerRequests,
  supabaseCreateNotifications,
  supabaseGetNotifications,
  supabaseMarkNotificationRead
} from "./supabaseQueries.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const jwtSecret = process.env.JWT_SECRET ?? "dev-secret";

app.use(cors());
app.use(express.json({ limit: "4mb" }));

const users: Array<AuthUser & { password: string }> = [
  {
    id: "usr-superadmin-01",
    fullName: "Super Admin",
    email: "superadmin@taptu.app",
    password: "Taptu123!",
    organizationName: "Taptu Demo Company",
    role: "superadmin"
  },
  {
    id: "usr-admin-01",
    fullName: "Nadia Putri",
    email: "admin@taptu.app",
    password: "Taptu123!",
    organizationName: "Taptu Demo Company",
    role: "admin"
  },
  {
    id: "usr-manager-01",
    fullName: "Raka Saputra",
    email: "manager@taptu.app",
    password: "Taptu123!",
    organizationName: "Taptu Demo Company",
    role: "manager"
  },
  {
    id: "usr-employee-01",
    fullName: "Fikri Maulana",
    email: "employee@taptu.app",
    password: "Taptu123!",
    organizationName: "Taptu Demo Company",
    role: "employee",
    departmentId: "dep-ops",
    departmentName: "Operasional",
    managerId: "usr-manager-01",
    managerName: "Raka Saputra"
  },
  {
    id: "usr-scanner-01",
    fullName: "Front Gate Scanner",
    email: "scanner@taptu.app",
    password: "Taptu123!",
    organizationName: "Taptu Demo Company",
    role: "scanner"
  }
];

function isLocalDemoUser(userId: string): boolean {
  return users.some(u => u.id === userId);
}

function isUuid(id: string | null | undefined): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? "");
}

export function findLocalDemoUserByCredentials(email: string, password: string): AuthUser | null {
  const found = users.find((user) => user.email === email && user.password === password);
  if (!found) return null;

  const { password: _password, ...user } = found;
  return user;
}

const apiDir = dirname(fileURLToPath(import.meta.url));
const storePath = join(apiDir, "..", "data", "demo-store.json");
const apiConfig = getApiConfig();
const storage = createStorageAdapter(apiConfig, storePath);
const _storeInitial = createInitialStore();
const _storeLoaded = await storage.load();
// Merge so missing array/object fields from old stored formats don't crash at runtime.
let store = {
  ..._storeInitial,
  ..._storeLoaded,
  auditLogs: _storeLoaded.auditLogs ?? _storeInitial.auditLogs,
  exceptions: _storeLoaded.exceptions ?? _storeInitial.exceptions,
  notifications: _storeLoaded.notifications ?? _storeInitial.notifications,
  workLocations: _storeLoaded.workLocations ?? _storeInitial.workLocations,
  workLocationItems: _storeLoaded.workLocationItems ?? _storeInitial.workLocationItems,
  shifts: _storeLoaded.shifts ?? _storeInitial.shifts,
};
const seededLocalDepartments: DepartmentItem[] = [
  {
    id: "dep-ops",
    name: "Operasional",
    managerId: "usr-manager-01",
    managerName: "Raka Saputra",
    isActive: true,
    memberCount: 1
  }
];
let localDepartments: DepartmentItem[] = seededLocalDepartments.map((department) => ({ ...department }));
const localOrganizationId = "org-demo";

const useSupabase = apiConfig.storageMode === "supabase";
let sb: SupabaseAdmin | null = null;
if (useSupabase) {
  sb = createSupabaseAdmin(apiConfig);
  console.log("Supabase mode enabled - using relational tables.");
} else {
  console.log("Local-demo mode - using file-backed JSON store.");
}

const roleStats: Record<UserRole, DashboardStat[]> = {
  superadmin: [
    { label: "Cabang Aktif", value: "18", detail: "Semua gate sinkron sebelum 09.00" },
    { label: "Kehadiran Hari Ini", value: "91%", detail: "Naik 4% dibanding minggu lalu" },
    { label: "Exception Queue", value: "5", detail: "Perlu review sebelum payroll cut-off" }
  ],
  admin: [
    { label: "Karyawan Hadir", value: "187", detail: "Tim lapangan dan kantor pusat" },
    { label: "Approval Pending", value: "6", detail: "Butuh keputusan sebelum siang" },
    { label: "Butuh Review", value: "5", detail: "Validasi lokasi atau selfie belum final" }
  ],
  manager: [
    { label: "Tim Hadir", value: "26", detail: "3 shift masih berjalan" },
    { label: "Late Arrivals", value: "2", detail: "Butuh follow-up supervisor" },
    { label: "Open Approvals", value: "3", detail: "Izin tim menunggu review" }
  ],
  employee: [
    { label: "Status Hari Ini", value: "Sudah check-in", detail: "Masuk 08.03 WIB via lokasi utama" },
    { label: "Shift Aktif", value: "08.00 - 17.00", detail: "Kantor pusat · Shift Pagi" },
    { label: "Riwayat Minggu Ini", value: "4 hadir", detail: "1 pengajuan izin sedang diproses" }
  ],
  scanner: [
    { label: "Token Aktif", value: "00:27", detail: "QR akan refresh otomatis" },
    { label: "Scan Hari Ini", value: "124", detail: "14 scan dalam 10 menit terakhir" },
    { label: "Lokasi", value: "Gerbang Utama", detail: "Radius valid 150 meter" }
  ]
};

const attendanceFeed: Record<UserRole, AttendanceTimelineItem[]> = {
  superadmin: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08.24", method: "GPS" }
  ],
  admin: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08.24", method: "GPS" }
  ],
  manager: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08.24", method: "GPS" }
  ],
  employee: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" }
  ],
  scanner: [
    { id: "a-01", day: "08.03", status: "Tepat waktu", time: "Nadia Putri", method: "QR" },
    { id: "a-02", day: "08.07", status: "Tepat waktu", time: "Ilham Fadli", method: "QR" },
    { id: "a-03", day: "08.09", status: "Belum check-in", time: "1 scan gagal radius", method: "Manual" }
  ]
};

const requestFeed: Record<UserRole, LeaveRequestItem[]> = {
  superadmin: [
    { id: "req-01", title: "Cuti tahunan · Fikri Maulana", status: "Disetujui", detail: "2 hari kerja, mulai Jumat." }
  ],
  admin: [
    { id: "req-01", title: "Cuti tahunan · Fikri Maulana", status: "Disetujui", detail: "2 hari kerja, mulai Jumat." }
  ],
  manager: [
    { id: "req-01", title: "Izin tim lapangan", status: "Menunggu", detail: "Butuh keputusan supervisor sebelum jam 12.00." }
  ],
  employee: [
    { id: "req-01", title: "Cuti tahunan", status: "Disetujui", detail: "2 hari kerja disetujui untuk minggu depan." },
    { id: "req-02", title: "Izin pribadi", status: "Menunggu", detail: "Dokumen pendukung sedang direview admin." }
  ],
  scanner: [
    { id: "req-01", title: "Token gate timur", status: "Disetujui", detail: "QR aktif dan sinkron sampai 30 detik ke depan." },
    { id: "req-02", title: "Permintaan reset scanner", status: "Menunggu", detail: "Tunggu admin memperbarui PIN perangkat." }
  ]
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  role: z.literal("superadmin").default("superadmin")
});

const attendanceSchema = z.object({
  method: z.enum(["QR", "GPS", "Selfie", "Manual"]),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  selfieUrl: z.string().optional(),
  selfieData: z.string().optional(),
  selfieFileName: z.string().optional(),
  selfieContentType: z.string().optional(),
  deviceId: z.string().min(4).optional(),
  scannerToken: z.string().optional(),
  requiredSelfie: z.boolean().optional().default(false)
});

type AttendancePayload = z.infer<typeof attendanceSchema>;

function isPersistentSelfieUrl(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("blob:") && !value.startsWith("data:"));
}

async function resolveAttendanceSelfie(userId: string, payload: AttendancePayload) {
  if (isPersistentSelfieUrl(payload.selfieUrl)) {
    return { selfieUrl: payload.selfieUrl, selfieCaptured: true, reason: undefined as string | undefined };
  }

  if (!payload.selfieData) {
    return { selfieUrl: undefined, selfieCaptured: false, reason: undefined as string | undefined };
  }

  const upload = await uploadAttendanceSelfie(apiConfig.supabase, userId, {
    dataUrl: payload.selfieData,
    fileName: payload.selfieFileName,
    contentType: payload.selfieContentType
  });

  return {
    selfieUrl: upload.selfieUrl,
    selfieCaptured: true,
    reason: upload.reason
  };
}

function mergeSelfieStorageReason(
  validationStatus: AttendanceValidationStatus,
  reasons: string[],
  selfieStorageReason: string | undefined
) {
  if (!selfieStorageReason) {
    return { validationStatus, reasons };
  }

  return {
    validationStatus: validationStatus === "verified" ? "needs_review" as const : validationStatus,
    reasons: reasons.includes(selfieStorageReason) ? reasons : [...reasons, selfieStorageReason]
  };
}

const requestSchema = z.object({
  category: z.enum(["Izin", "Cuti", "Sakit", "Koreksi Absensi", "Lupa Check-in/out"]),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  title: z.string().min(3),
  detail: z.string().min(8)
}).refine((value) => value.endDate >= value.startDate, {
  message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."
});

const approvalSchema = z.object({
  status: z.enum(["Disetujui", "Ditolak"]),
  adminNote: z.string().trim().min(2).optional()
});

const exceptionDecisionSchema = z.object({
  status: z.enum(["Need Review", "Approved", "Rejected", "Request Correction"]),
  adminNote: z.string().trim().min(2)
});

const departmentSchema = z.object({
  name: z.string().trim().min(2),
  managerId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

const departmentPatchSchema = departmentSchema.partial();

const employeeDepartmentPatchSchema = z.object({
  departmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional()
}).refine((payload) => payload.departmentId !== undefined || payload.managerId !== undefined, {
  message: "departmentId or managerId is required."
});

const historyFilterSchema = z.enum(["all", "present", "issue"]).catch("all");

function signUser(user: AuthUser): string {
  return jwt.sign(user, jwtSecret, { expiresIn: "8h" });
}

function authenticate(authHeader?: string): AuthUser | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    return jwt.verify(token, jwtSecret) as AuthUser;
  } catch {
    return null;
  }
}

async function authenticateSupabase(authHeader?: string): Promise<AuthUser | null> {
  if (!sb || !authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const { data: { user: supaUser }, error } = await sb.auth.getUser(token);

  if (error || !supaUser) return null;

  return await supabaseGetProfile(sb, supaUser.id);
}

async function requireUserAsync(req: express.Request, res: express.Response): Promise<AuthUser | null> {
  // Local JWT first — covers demo accounts signed by this server in all storage modes.
  const local = authenticate(req.header("authorization"));
  if (local) return local;

  // Fall back to Supabase JWT for real user accounts (non-demo).
  if (useSupabase && sb) {
    const user = await authenticateSupabase(req.header("authorization"));
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }
    return user;
  }

  res.status(401).json({ message: "Unauthorized" });
  return null;
}

// Sync version kept for backward compat. Delegates to local-only auth.
function requireUser(req: express.Request, res: express.Response): AuthUser | null {
  const user = authenticate(req.header("authorization"));

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  return user;
}

function createEmptyAttendanceRecord(userId: string) {
  const template = createInitialStore().attendance["usr-employee-03"];

  return {
    ...template,
    id: `att-${userId}-${new Date().toISOString().slice(0, 10)}`,
    userId,
    state: "idle" as const,
    status: "Belum check-in" as const,
    checkInAt: undefined,
    checkInMethod: undefined,
    checkOutAt: undefined,
    checkOutMethod: undefined,
    locationLat: undefined,
    locationLng: undefined,
    validationStatus: "verified" as const,
    validationReasons: [],
    selfieUrl: "",
    deviceId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildAttendanceItem(userId: string): AttendanceTimelineItem {
  const record = store.attendance[userId] ?? createEmptyAttendanceRecord(userId);
  return buildAttendanceItemFromRecord(record);
}

function buildAttendanceItemFromRecord(record: AttendanceRecord): AttendanceTimelineItem {
  const duration =
    record.checkInAt && record.checkOutAt
      ? `${Math.floor((new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) / 3600000)}j ${String(
          Math.round(((new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) % 3600000) / 60000)
        ).padStart(2, "0")}m`
      : "Belum selesai";

  if (record.state === "checked_in") {
    return {
      id: record.id,
      day: "Hari ini",
      status: record.status === "Terlambat" ? "Terlambat" : "Tepat waktu",
      time: record.checkInAt?.slice(11, 16) ?? "--.--",
      method: record.checkInMethod ?? "QR",
      checkInTime: record.checkInAt,
      duration,
      locationName: record.locationName
    };
  }

  if (record.state === "checked_out") {
    return {
      id: record.id,
      day: "Hari ini",
      status: "Tepat waktu",
      time: record.checkInAt?.slice(11, 16) ?? "--.--",
      method: record.checkInMethod ?? record.checkOutMethod ?? "QR",
      checkInTime: record.checkInAt,
      checkOutTime: record.checkOutAt,
      duration,
      locationName: record.locationName
    };
  }

  return {
    id: record.id,
    day: "Hari ini",
    status: "Belum check-in",
    time: "--.--",
    method: "Manual",
    duration,
    locationName: record.locationName
  };
}

function listAttendanceHistory(user: AuthUser): AttendanceTimelineItem[] {
  const todayItem = buildAttendanceItem(user.id);
  const rest = store.attendanceHistory.filter((item) => item.day !== "Hari ini");

  return [todayItem, ...rest];
}

function buildRequestItem(request: (typeof store.requests)[number], actorName?: string): LeaveRequestItem {
  return {
    id: request.id,
    category: request.category,
    startDate: request.startDate,
    endDate: request.endDate,
    title: request.title,
    detail: request.detail,
    status: request.status,
    requester: actorName,
    adminNote: request.adminNote,
    createdAt: request.createdAt,
    reviewedBy: request.reviewedBy,
    reviewedAt: request.reviewedAt
  };
}

function buildScannerPayload() {
  const expiresInSeconds = Math.max(0, Math.ceil((new Date(store.scanner.expiresAt).getTime() - Date.now()) / 1000));

  return {
    id: store.scanner.id,
    token: store.scanner.token,
    expiresInSeconds,
    scansToday: store.scanner.scansToday,
    locationName: store.scanner.locationName,
    expiresAt: store.scanner.expiresAt,
    status: store.scanner.status
  } satisfies ScannerTokenPayload;
}

function userDirectory() {
  return Object.fromEntries(users.map((entry) => [entry.id, entry.fullName]));
}

function createLocalNotifications(drafts: ReturnType<typeof createRequestNotificationDrafts>) {
  const expanded = drafts.flatMap((draft) => {
    if (draft.recipientId) return [draft];
    if (draft.recipientRole === "admin") {
      return users
        .filter((candidate) => candidate.role === "admin" || candidate.role === "superadmin")
        .map((candidate) => ({ ...draft, recipientId: candidate.id, recipientRole: candidate.role }));
    }
    return [];
  });

  const now = new Date().toISOString();
  store.notifications ??= [];
  store.notifications.unshift(...expanded.map((draft) => ({
    ...draft,
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recipientId: draft.recipientId!,
    createdAt: now,
    readAt: null
  })));
}

function buildRequestNotificationDrafts(
  event: Parameters<typeof createRequestNotificationDrafts>[0]["event"],
  input: {
    organizationId: string;
    requestId: string;
    employeeId: string;
    employeeName: string;
    category: Parameters<typeof createRequestNotificationDrafts>[0]["category"];
    managerId?: string | null;
    reviewerNote?: string;
  }
) {
  return createRequestNotificationDrafts({ event, ...input });
}

async function notifyAttendanceExceptionCreated(input: {
  organizationId: string;
  exceptionId: string;
  employeeName: string;
  managerId?: string | null;
}) {
  const draft = createAttendanceExceptionNotificationDraft(input);
  // Only use Supabase when organizationId is a real UUID (not a local demo text ID).
  if (useSupabase && sb && isUuid(input.organizationId)) {
    await supabaseCreateNotifications(sb, [draft]);
    return;
  }
  createLocalNotifications([draft]);
}

function listExceptionItems(): AttendanceExceptionItem[] {
  return store.exceptions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((item) => toExceptionItem(item, userDirectory()));
}

async function getOrganizationIdForUser(userId: string) {
  if (!sb) {
    return null;
  }

  const { data: profile } = await sb.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  return profile?.organization_id ?? null;
}

function listLocalDepartments(): DepartmentItem[] {
  return localDepartments.map((department) => ({
    ...department,
    managerName: department.managerId ? users.find((user) => user.id === department.managerId)?.fullName ?? null : null,
    memberCount: users.filter((user) => user.departmentId === department.id).length
  }));
}

function calibrateLocalDemoLocationFromDevice(locationLat?: number, locationLng?: number) {
  if (locationLat === undefined || locationLng === undefined) return;
  const current = store.workLocations[0];
  if (!current || current.id !== "loc-hq") return;

  const calibrated = {
    ...current,
    latitude: locationLat,
    longitude: locationLng,
    radiusMeters: Math.max(current.radiusMeters, 250)
  };
  store.workLocations = [calibrated, ...store.workLocations.slice(1)];
  store.workLocationItems = store.workLocationItems.map((item) =>
    item.id === calibrated.id
      ? { ...item, latitude: calibrated.latitude, longitude: calibrated.longitude, radiusMeters: calibrated.radiusMeters }
      : item
  );
}

function updateLocalEmployeeStructure(employeeId: string, patch: { departmentId?: string | null; managerId?: string | null }) {
  const employee = users.find((entry) => entry.id === employeeId);
  if (!employee) return null;

  if (patch.departmentId !== undefined) {
    const department = patch.departmentId ? localDepartments.find((entry) => entry.id === patch.departmentId) : null;
    employee.departmentId = patch.departmentId ?? null;
    employee.departmentName = department?.name ?? null;
  }
  if (patch.managerId !== undefined) {
    const manager = patch.managerId ? users.find((entry) => entry.id === patch.managerId) : null;
    employee.managerId = patch.managerId ?? null;
    employee.managerName = manager?.fullName ?? null;
  }

  return computeEmployeeList(store, [employee])[0];
}

export function resetLocalOrganizationStructureForTests() {
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) return;
  localDepartments = [];
  for (const user of users) {
    user.departmentId = null;
    user.departmentName = null;
    user.managerId = null;
    user.managerName = null;
  }
}

export function resetLocalAttendanceStoreForTests() {
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) return;
  store = createInitialStore();
  localDepartments = seededLocalDepartments.map((department) => ({ ...department }));
  for (const user of users) {
    user.departmentId = null;
    user.departmentName = null;
    user.managerId = null;
    user.managerName = null;
  }
  const fikri = users.find((user) => user.id === "usr-employee-01");
  if (fikri) {
    fikri.departmentId = "dep-ops";
    fikri.departmentName = "Operasional";
    fikri.managerId = "usr-manager-01";
    fikri.managerName = "Raka Saputra";
  }
}

// In Supabase mode, reload the store on each request so updates from other serverless
// instances (e.g. a different Vercel lambda) are visible without a cold start.
if (useSupabase) {
  app.use((_req, _res, next) => {
    storage.load().then((fresh) => {
      store = fresh;
      next();
    }).catch(() => next());
  });
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "taptu-api",
    storageMode: apiConfig.storageMode,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body satisfies LoginRequest);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Email atau password tidak valid."
    });
  }

  // Demo accounts always take priority — they must work in all storage modes.
  const found = findLocalDemoUserByCredentials(parsed.data.email, parsed.data.password);
  if (found) {
    return res.json({ token: signUser(found), user: found } satisfies LoginResponse);
  }

  if (useSupabase && sb) {
    try {
      const result = await supabaseSignIn(sb, parsed.data.email, parsed.data.password);
      const response: LoginResponse = { token: result.accessToken, user: result.user };
      return res.json(response);
    } catch (err) {
      return res.status(401).json({ message: err instanceof Error ? err.message : "Login gagal." });
    }
  }

  return res.status(401).json({
    message: "Akun tidak ditemukan atau password salah."
  });
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body satisfies RegisterRequest);

  if (!parsed.success) {
    return res.status(400).json({ message: "Data registrasi tidak valid." });
  }

  const { fullName, email, password, organizationName, role } = parsed.data;

  if (useSupabase && sb) {
    try {
      const newUser = await supabaseSignUp(sb, { email, password, fullName, organizationName, role });
      const signInResult = await supabaseSignIn(sb, email, password);
      const response: LoginResponse = { token: signInResult.accessToken, user: newUser };
      return res.status(201).json(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registrasi gagal.";
      if (msg.includes("already") || msg.includes("duplicate")) {
        return res.status(409).json({ message: "Email sudah digunakan." });
      }
      return res.status(400).json({ message: msg });
    }
  }

  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ message: "Email sudah digunakan." });
  }

  const newUser: AuthUser & { password: string } = {
    id: `usr-${role}-${Date.now()}`,
    fullName,
    email,
    password,
    organizationName,
    role
  };

  users.push(newUser);

  const { password: _password, ...user } = newUser;
  const response: LoginResponse = {
    token: signUser(user),
    user
  };

  return res.status(201).json(response);
});

app.get("/api/auth/me", async (req, res) => {
  const user = await requireUserAsync(req, res);

  if (!user) {
    return;
  }

  return res.json({ user });
});

app.get("/api/dashboard", async (req, res) => {
  const user = await requireUserAsync(req, res);

  if (!user) {
    return;
  }

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const organizationId = isAdmin || user.role === "manager" ? await getOrganizationIdForUser(user.id) : undefined;
    const attendance = await supabaseGetAttendanceHistory(sb, user.id);
    const todayRecord = await supabaseGetTodayAttendance(sb, user.id);
    const requests = user.role === "manager" && organizationId
      ? await supabaseGetManagerRequests(sb, organizationId, user.id)
      : await supabaseGetRequests(sb, user.id, isAdmin, organizationId ?? undefined);
    const scannerState = user.role === "scanner" ? await supabaseGetScannerState(sb) : null;

    const payload: DashboardPayload = {
      greeting: `Halo, ${user.fullName}`,
      stats: roleStats[user.role] ?? roleStats.employee,
      schedule: [
        { time: "08.00", title: "Check-in kantor", detail: "QR utama akan refresh otomatis tiap 30 detik." },
        { time: "13.00", title: "Review izin harian", detail: "Approval manager dan rekap lokasi kerja." },
        { time: "17.00", title: "Check-out", detail: "Sinkron ke laporan harian dan payroll." }
      ],
      attendance,
      attendanceState: todayRecord.state,
      requests,
      scannerToken: scannerState?.token
    };
    return res.json(payload);
  }

  const payload: DashboardPayload = {
    greeting: `Halo, ${user.fullName}`,
    stats: roleStats[user.role] ?? roleStats.employee,
    schedule: [
      { time: "08.00", title: "Check-in kantor", detail: "QR utama akan refresh otomatis tiap 30 detik." },
      { time: "13.00", title: "Review izin harian", detail: "Approval manager dan rekap lokasi kerja." },
      { time: "17.00", title: "Check-out", detail: "Sinkron ke laporan harian dan payroll." }
    ],
    attendance:
      user.role === "employee"
        ? listAttendanceHistory(user)
        : attendanceFeed[user.role] ?? attendanceFeed.employee,
    attendanceState: store.attendance[user.id]?.state ?? "idle",
    requests:
      user.role === "employee"
        ? store.requests.filter((item) => item.userId === user.id).map((item) => buildRequestItem(item))
        : user.role === "admin" || user.role === "superadmin"
          ? store.requests.map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName))
          : user.role === "manager"
            ? (() => {
                const teamIds = new Set(users.filter((u) => u.role === "employee" && u.managerId === user.id).map((u) => u.id));
                return store.requests
                  .filter((item) => teamIds.has(item.userId) && ["Izin", "Koreksi Absensi", "Lupa Check-in/out"].includes(item.category))
                  .map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName));
              })()
            : requestFeed[user.role] ?? requestFeed.employee,
    scannerToken: user.role === "scanner" ? store.scanner.token : undefined
  };

  return res.json(payload);
});

app.get("/api/attendance/today", async (req, res) => {
  const user = await requireUserAsync(req, res);

  if (!user) {
    return;
  }

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const record = await supabaseGetTodayAttendance(sb, user.id);
    return res.json({
      id: user.id,
      day: "Hari ini",
      status: record.state === "idle" ? "Belum check-in" : "Tepat waktu",
      time: record.checkInAt ? record.checkInAt.slice(11, 16) : "--.--",
      method: record.checkInMethod ?? "Manual"
    });
  }

  return res.json(buildAttendanceItem(user.id));
});

app.get("/api/attendance/history", async (req, res) => {
  const user = await requireUserAsync(req, res);

  if (!user) {
    return;
  }

  const filter = historyFilterSchema.parse(req.query.filter);

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const items = await supabaseGetAttendanceHistory(sb, user.id, filter);
    return res.json(items);
  }

  if (user.role === "admin" || user.role === "superadmin") {
    return res.json(filterAttendanceHistory(store.attendanceHistory, filter));
  }

  return res.json(filterAttendanceHistory(listAttendanceHistory(user), filter));
});

app.post("/api/attendance/checkin", async (req, res) => {
  const user = await requireUserAsync(req, res);

  if (!user) {
    return;
  }

  const parsed = attendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Metode check-in tidak valid." });
  }

  const now = new Date().toISOString();

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const current = await supabaseGetTodayAttendance(sb, user.id);
    const organizationId = await getOrganizationIdForUser(user.id);
    const location = organizationId ? await supabaseGetPrimaryWorkLocation(sb, organizationId) : store.workLocations[0];
    const selfie = await resolveAttendanceSelfie(user.id, parsed.data);
    const validation = validateAttendanceSubmission({
      locationLat: parsed.data.locationLat,
      locationLng: parsed.data.locationLng,
      selfieUrl: selfie.selfieUrl ?? (selfie.selfieCaptured ? "pending://selfie" : undefined),
      deviceId: parsed.data.deviceId,
      scannerToken: parsed.data.scannerToken,
      requiredSelfie: parsed.data.requiredSelfie,
      previousDeviceId: current.deviceId,
      location,
      now
    });
    const mergedValidation = mergeSelfieStorageReason(validation.status, validation.reasons, selfie.reason);
    validation.status = mergedValidation.validationStatus;
    const reasons = mergedValidation.reasons;
    let scannerTokenId: string | undefined;

    if (parsed.data.method === "QR") {
      const scanner = await supabaseGetScannerState(sb);
      scannerTokenId = scanner.id;
      const scannerValidation = validateScannerToken(scanner, parsed.data.scannerToken);
      if (!scannerValidation.valid) {
        reasons.push(scannerValidation.reason ?? "Token scanner tidak valid.");
        validation.status = "needs_review";
        validation.exceptionType = scannerValidation.exceptionType;
        await supabaseCreateAuditLog(
          sb,
          createAuditLog(
            "scanner_token_invalid_attempt",
            user.fullName,
            user.role,
            user.id,
            scannerValidation.reason ?? "Token scanner tidak valid."
          )
        );
      }
    }

    const next = reduceAttendance(current, {
      type: "CHECK_IN",
      method: parsed.data.method as AttendanceMode,
      at: now,
      locationLat: parsed.data.locationLat,
      locationLng: parsed.data.locationLng,
      validationStatus: validation.status,
      validationReasons: reasons,
      selfieUrl: selfie.selfieUrl,
      deviceId: parsed.data.deviceId,
      scannerTokenId
    });
    if (next.state === current.state) {
      return res.status(409).json({ message: "Check-in sudah dilakukan atau state tidak valid." });
    }
    const persisted = await supabaseUpsertAttendance(sb, user.id, next);

    if (validation.exceptionType) {
      const exception = createAttendanceException(persisted, user.id, validation.exceptionType, reasons[0] ?? "Butuh review.");
      const createdException = await supabaseCreateAttendanceException(
        sb,
        exception
      );
      await notifyAttendanceExceptionCreated({
        organizationId: organizationId!,
        exceptionId: createdException.id,
        employeeName: user.fullName,
        managerId: user.managerId
      });
    }

    if (persisted.status === "Terlambat") {
      const lateException = createAttendanceException(
        persisted,
        user.id,
        "Late check-in",
        "Check-in melebihi toleransi 10 menit dari awal shift."
      );
      const createdLateException = await supabaseCreateAttendanceException(
        sb,
        lateException
      );
      await notifyAttendanceExceptionCreated({
        organizationId: organizationId!,
        exceptionId: createdLateException.id,
        employeeName: user.fullName,
        managerId: user.managerId
      });
    }

    if (reasons.some((item) => item.includes("Perangkat berbeda"))) {
      await supabaseCreateAuditLog(
        sb,
        createAuditLog("device_mismatch_exception", user.fullName, user.role, persisted.id ?? user.id, reasons.join(" | "))
      );
    }

    const response: AttendanceActionResponse = {
      attendanceState: persisted.state,
      validationStatus: persisted.validationStatus,
      validationReasons: persisted.validationReasons,
      record: buildAttendanceItemFromRecord(persisted)
    };
    return res.json(response);
  }

  const current = store.attendance[user.id] ?? createEmptyAttendanceRecord(user.id);
  if (current.state === "idle") {
    calibrateLocalDemoLocationFromDevice(parsed.data.locationLat, parsed.data.locationLng);
  }
  const selfie = await resolveAttendanceSelfie(user.id, parsed.data);
  const validation = validateAttendanceSubmission({
    locationLat: parsed.data.locationLat,
    locationLng: parsed.data.locationLng,
    selfieUrl: selfie.selfieUrl ?? (selfie.selfieCaptured ? "pending://selfie" : undefined),
    deviceId: parsed.data.deviceId,
    scannerToken: parsed.data.scannerToken,
    requiredSelfie: parsed.data.requiredSelfie,
    previousDeviceId: current.deviceId,
    location: store.workLocations[0],
    now
  });
  const mergedValidation = mergeSelfieStorageReason(validation.status, validation.reasons, selfie.reason);
  validation.status = mergedValidation.validationStatus;
  const reasons = mergedValidation.reasons;

  if (parsed.data.method === "QR") {
    const scannerValidation = validateScannerToken(store.scanner, parsed.data.scannerToken);

    if (!scannerValidation.valid) {
      const scannerReason = scannerValidation.reason ?? "Token scanner tidak valid.";
      reasons.push(scannerReason);
      validation.status = "needs_review";
      validation.exceptionType = scannerValidation.exceptionType;
      store.scanner = appendScannerAttempt(store.scanner, {
        id: `scan-${Date.now()}`,
        employeeId: user.id,
        employeeName: user.fullName,
        status: scannerValidation.exceptionType === "Expired QR" ? "expired" : "invalid",
        detail: scannerReason,
        createdAt: now
      });
      store.auditLogs.unshift(
        createAuditLog("scanner_token_invalid_attempt", "System", "scanner", user.id, scannerReason)
      );
    }
  }

  const next = reduceAttendance(current, {
    type: "CHECK_IN",
    method: parsed.data.method as AttendanceMode,
    at: now,
    locationLat: parsed.data.locationLat,
    locationLng: parsed.data.locationLng,
    validationStatus: validation.status,
    validationReasons: reasons,
    selfieUrl: selfie.selfieUrl,
    deviceId: parsed.data.deviceId,
    scannerTokenId: parsed.data.method === "QR" ? store.scanner.id : undefined
  });

  if (next.state === current.state) {
    return res.status(409).json({ message: "Check-in sudah dilakukan atau state tidak valid." });
  }

  store.attendance[user.id] = next;
  const historyItem = buildAttendanceItem(user.id);
  store.attendanceHistory = [historyItem, ...store.attendanceHistory.filter((item) => item.day !== "Hari ini")];

  if (validation.exceptionType) {
    const exception = createAttendanceException(next, user.id, validation.exceptionType, reasons[0] ?? "Butuh review.");
    store.exceptions.unshift(exception);
    await notifyAttendanceExceptionCreated({
      organizationId: localOrganizationId,
      exceptionId: exception.id,
      employeeName: user.fullName,
      managerId: user.managerId
    });
  }

  if (next.status === "Terlambat") {
    const exception = createAttendanceException(next, user.id, "Late check-in", "Check-in melebihi toleransi 10 menit dari awal shift.");
    store.exceptions.unshift(exception);
    await notifyAttendanceExceptionCreated({
      organizationId: localOrganizationId,
      exceptionId: exception.id,
      employeeName: user.fullName,
      managerId: user.managerId
    });
  }

  if (reasons.some((item) => item.includes("Perangkat berbeda"))) {
    store.auditLogs.unshift(createAuditLog("device_mismatch_exception", user.fullName, user.role, next.id ?? user.id, reasons.join(" | ")));
  }

  if (parsed.data.method === "QR") {
    store.scanner = appendScannerAttempt(store.scanner, {
      id: `scan-${Date.now()}-ok`,
      employeeId: user.id,
      employeeName: user.fullName,
      status: "success",
      detail: "QR check-in tercatat.",
      createdAt: now
    });
  }
  await storage.save(store).catch((err: unknown) => {
    console.error("[taptu-api] storage.save failed (check-in):", err);
  });

  const response: AttendanceActionResponse = {
    attendanceState: next.state,
    validationStatus: next.validationStatus,
    validationReasons: next.validationReasons,
    record: historyItem
  };

  return res.json(response);
});

app.post("/api/attendance/checkout", async (req, res) => {
  const user = await requireUserAsync(req, res);

  if (!user) {
    return;
  }

  const parsed = attendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Metode check-out tidak valid." });
  }

  const now = new Date().toISOString();

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const current = await supabaseGetTodayAttendance(sb, user.id);
    const organizationId = await getOrganizationIdForUser(user.id);
    const location = organizationId ? await supabaseGetPrimaryWorkLocation(sb, organizationId) : store.workLocations[0];
    const validation = validateAttendanceSubmission({
      locationLat: parsed.data.locationLat,
      locationLng: parsed.data.locationLng,
      selfieUrl: parsed.data.selfieUrl,
      deviceId: parsed.data.deviceId,
      scannerToken: parsed.data.scannerToken,
      previousDeviceId: current.deviceId,
      location,
      now
    });
    const next = reduceAttendance(current, {
      type: "CHECK_OUT",
      method: parsed.data.method as AttendanceMode,
      at: now,
      locationLat: parsed.data.locationLat,
      locationLng: parsed.data.locationLng,
      validationStatus: validation.status,
      validationReasons: validation.reasons,
      selfieUrl: parsed.data.selfieUrl,
      deviceId: parsed.data.deviceId
    });
    if (next.state === current.state) {
      return res.status(409).json({ message: "Check-out belum bisa dilakukan sebelum check-in." });
    }
    const persisted = await supabaseUpsertAttendance(sb, user.id, next);

    if (validation.exceptionType) {
      await supabaseCreateAttendanceException(
        sb,
        createAttendanceException(
          persisted,
          user.id,
          validation.exceptionType,
          validation.reasons[0] ?? "Check-out perlu review."
        )
      );
    }

    const response: AttendanceActionResponse = {
      attendanceState: persisted.state,
      validationStatus: persisted.validationStatus,
      validationReasons: persisted.validationReasons,
      record: buildAttendanceItemFromRecord(persisted)
    };
    return res.json(response);
  }

  const current = store.attendance[user.id] ?? createEmptyAttendanceRecord(user.id);
  const validation = validateAttendanceSubmission({
    locationLat: parsed.data.locationLat,
    locationLng: parsed.data.locationLng,
    selfieUrl: parsed.data.selfieUrl,
    deviceId: parsed.data.deviceId,
    scannerToken: parsed.data.scannerToken,
    previousDeviceId: current.deviceId,
    location: store.workLocations[0],
    now
  });
  const next = reduceAttendance(current, {
    type: "CHECK_OUT",
    method: parsed.data.method as AttendanceMode,
    at: now,
    locationLat: parsed.data.locationLat,
    locationLng: parsed.data.locationLng,
    validationStatus: validation.status,
    validationReasons: validation.reasons,
    selfieUrl: parsed.data.selfieUrl,
    deviceId: parsed.data.deviceId,
    scannerTokenId: parsed.data.method === "QR" ? store.scanner.id : undefined
  });

  if (next.state === current.state) {
    return res.status(409).json({ message: "Check-out belum bisa dilakukan sebelum check-in." });
  }

  store.attendance[user.id] = next;
  const historyItem = buildAttendanceItem(user.id);
  store.attendanceHistory = [historyItem, ...store.attendanceHistory.filter((item) => item.day !== "Hari ini")];
  if (validation.exceptionType) {
    store.exceptions.unshift(createAttendanceException(next, user.id, validation.exceptionType, validation.reasons[0] ?? "Check-out perlu review."));
  }
  await storage.save(store).catch((err: unknown) => {
    console.error("[taptu-api] storage.save failed (check-out):", err);
  });

  const response: AttendanceActionResponse = {
    attendanceState: next.state,
    validationStatus: next.validationStatus,
    validationReasons: next.validationReasons,
    record: historyItem
  };

  return res.json(response);
});

app.get("/api/requests", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const organizationId = user.role === "admin" || user.role === "superadmin" ? await getOrganizationIdForUser(user.id) : undefined;
    const items =
      user.role === "admin" || user.role === "superadmin"
        ? organizationId ? await getAdminApprovalRequests(sb, organizationId) : []
        : user.role === "manager"
          ? organizationId ? await supabaseGetManagerRequests(sb, organizationId, user.id) : []
          : await getEmployeeRequests(sb, user.id);
    return res.json(items);
  }

  if (user.role === "admin" || user.role === "superadmin" || user.role === "manager") {
    return res.json(
      store.requests
        .filter((item) => user.role !== "manager" || ["Izin", "Koreksi Absensi", "Lupa Check-in/out"].includes(item.category))
        .map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName))
    );
  }

  return res.json(store.requests.filter((item) => item.userId === user.id).map((item) => buildRequestItem(item)));
});

app.get("/api/requests/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const isAdmin = user.role === "admin" || user.role === "superadmin" || user.role === "manager";
    const organizationId = user.role === "manager" ? await getOrganizationIdForUser(user.id) : undefined;
    const item = await supabaseGetRequestById(sb, req.params.id, user.id, isAdmin, user.role, organizationId ?? undefined);
    if (!item) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
    return res.json(item);
  }

  const request = store.requests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
  if (user.role === "employee" && request.userId !== user.id) return res.status(403).json({ message: "Forbidden" });
  if (user.role === "manager" && !["Izin", "Koreksi Absensi", "Lupa Check-in/out"].includes(request.category)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(buildRequestItem(request, users.find((entry) => entry.id === request.userId)?.fullName));
});

app.get("/api/requests/:id/approval-timeline", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const isReviewer = user.role === "admin" || user.role === "superadmin" || user.role === "manager";
    const organizationId = user.role === "manager" ? await getOrganizationIdForUser(user.id) : undefined;
    const item = await supabaseGetRequestById(sb, req.params.id, user.id, isReviewer, user.role, organizationId ?? undefined);
    if (!item) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });

    const timeline = await getRequestApprovalTimeline(sb, req.params.id);
    return res.json(timeline);
  }

  return res.json([]);
});

app.post("/api/requests", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Judul atau detail pengajuan belum valid." });

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const created = await createEmployeeRequest(sb, user.id, parsed.data);
    const organizationId = await getOrganizationIdForUser(user.id);
    if (organizationId) {
      const managerStep = created.approvalSteps?.find((step) => step.approverRole === "manager");
      await supabaseCreateNotifications(sb, buildRequestNotificationDrafts("REQUEST_CREATED", {
        organizationId,
        requestId: created.id!,
        employeeId: user.id,
        employeeName: user.fullName,
        category: created.category!,
        managerId: managerStep?.approverId
      }));
    }
    return res.status(201).json({ request: created });
  }

  const nextRequest = {
    id: `req-${Date.now()}`,
    userId: user.id,
    category: parsed.data.category,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    title: parsed.data.title,
    detail: parsed.data.detail,
    status: "Menunggu" as const,
    createdAt: new Date().toISOString()
  };

  store.requests = reduceRequests(store.requests, { type: "CREATE", request: nextRequest });
  createLocalNotifications(buildRequestNotificationDrafts("REQUEST_CREATED", {
    organizationId: localOrganizationId,
    requestId: nextRequest.id,
    employeeId: user.id,
    employeeName: user.fullName,
    category: nextRequest.category,
    managerId: user.managerId
  }));
  await storage.save(store);
  return res.status(201).json({ request: buildRequestItem(nextRequest) });
});

app.delete("/api/requests/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const ok = await supabaseDeleteRequest(sb, req.params.id, user.id);
    if (!ok) return res.status(409).json({ message: "Pengajuan hanya bisa dibatalkan saat masih menunggu." });
    return res.json({ id: req.params.id, removed: true });
  }

  const existing = store.requests.find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
  if (user.role === "employee" && existing.userId !== user.id) return res.status(403).json({ message: "Forbidden" });

  const next = reduceRequests(store.requests, { type: "CANCEL", id: req.params.id, actorRole: user.role });
  if (next.length === store.requests.length) return res.status(409).json({ message: "Pengajuan hanya bisa dibatalkan saat masih menunggu." });

  store.requests = next;
  await storage.save(store);
  return res.json({ id: req.params.id, removed: true });
});

app.get("/api/admin/requests", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") return res.status(403).json({ message: "Forbidden" });

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const organizationId = await getOrganizationIdForUser(user.id);
    const items =
      user.role === "manager"
        ? organizationId ? await supabaseGetManagerRequests(sb, organizationId, user.id) : []
        : organizationId ? await getAdminApprovalRequests(sb, organizationId) : [];
    return res.json(items);
  }

  return res.json(store.requests.map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName)));
});

app.patch("/api/admin/requests/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") return res.status(403).json({ message: "Forbidden" });

  const parsed = approvalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Status approval tidak valid." });

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const actionContext = {
      id: user.id,
      role: user.role,
      note: parsed.data.adminNote
    };
    const updated = parsed.data.status === "Disetujui"
      ? await approveRequestStep(sb, req.params.id, actionContext)
      : await rejectRequestStep(sb, req.params.id, actionContext);
    if (!updated) return res.status(409).json({ message: "Step approval tidak tersedia untuk role ini." });
    const organizationId = await getOrganizationIdForUser(user.id);
    if (organizationId && updated.employeeId && updated.category) {
      const event = user.role === "manager"
        ? parsed.data.status === "Disetujui" ? "MANAGER_APPROVED" : "MANAGER_REJECTED"
        : parsed.data.status === "Disetujui" ? "HR_APPROVED" : "HR_REJECTED";
      await supabaseCreateNotifications(sb, buildRequestNotificationDrafts(event, {
        organizationId,
        requestId: updated.id!,
        employeeId: updated.employeeId,
        employeeName: updated.requester ?? "Karyawan",
        category: updated.category,
        reviewerNote: parsed.data.adminNote
      }));
    }
    await supabaseCreateAuditLog(
      sb,
      createAuditLog(
        parsed.data.status === "Disetujui" ? "approval_request_approved" : "approval_request_rejected",
        user.fullName,
        user.role,
        req.params.id,
        parsed.data.adminNote ?? `${updated.category} ${parsed.data.status.toLowerCase()}`
      )
    );
    return res.json({ request: updated });
  }

  store.requests = reduceRequests(store.requests, {
    type: parsed.data.status === "Disetujui" ? "APPROVE" : "REJECT",
    id: req.params.id,
    actorRole: user.role,
    adminNote: parsed.data.adminNote,
    reviewedBy: user.fullName,
    reviewedAt: new Date().toISOString()
  });

  const updated = store.requests.find((item) => item.id === req.params.id);
  if (!updated) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });

  if (updated.status === "Menunggu") {
    return res.status(403).json({ message: "Role ini tidak boleh memproses request tersebut." });
  }

  store.auditLogs.unshift(
    createAuditLog(
      parsed.data.status === "Disetujui" ? "approval_request_approved" : "approval_request_rejected",
      user.fullName,
      user.role,
      updated.id,
      parsed.data.adminNote ?? `${updated.category} ${parsed.data.status.toLowerCase()}`
    )
  );
  createLocalNotifications(buildRequestNotificationDrafts(
    user.role === "manager"
      ? parsed.data.status === "Disetujui" ? "MANAGER_APPROVED" : "MANAGER_REJECTED"
      : parsed.data.status === "Disetujui" ? "HR_APPROVED" : "HR_REJECTED",
    {
      organizationId: localOrganizationId,
      requestId: updated.id,
      employeeId: updated.userId,
      employeeName: users.find((entry) => entry.id === updated.userId)?.fullName ?? "Karyawan",
      category: updated.category,
      reviewerNote: parsed.data.adminNote
    }
  ));
  await storage.save(store);
  return res.json({ request: buildRequestItem(updated, users.find((entry) => entry.id === updated.userId)?.fullName) });
});

app.get("/api/admin/overview", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") return res.status(403).json({ message: "Forbidden" });

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (organizationId) {
      const overview = user.role === "manager"
        ? await supabaseGetManagerOverview(sb, organizationId, user.id)
        : await supabaseGetAdminOverview(sb, organizationId);
      return res.json(overview);
    }

    if (user.role === "manager") {
      const teamEmployees = users.filter((u) => u.role === "employee" && u.managerId === user.id);
      return res.json(computeManagerOverview(store, user.id, teamEmployees));
    }
  }

  if (user.role === "manager") {
    const teamEmployees = users.filter((u) => u.role === "employee" && u.managerId === user.id);
    return res.json(computeManagerOverview(store, user.id, teamEmployees));
  }

  const scopedUsers = users.filter((entry) => entry.role === "employee");

  const overview: AdminOverview = computeAdminOverview(
    store,
    scopedUsers.length,
    Object.fromEntries(scopedUsers.map((entry) => [entry.id, entry.fullName]))
  );
  return res.json(overview);
});

app.get("/api/employee/summary", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const summary = await supabaseGetEmployeeSummary(sb, user.id);
    return res.json(summary);
  }

  const summary: EmployeeSummary = computeEmployeeSummary(store, user.id);
  return res.json(summary);
});

app.get("/api/admin/exceptions", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) return res.json([]);
    return res.json(
      user.role === "manager"
        ? await supabaseGetManagerExceptions(sb, organizationId, user.id)
        : await supabaseGetExceptions(sb, organizationId)
    );
  }

  if (user.role === "manager") {
    const teamIds = users.filter((entry) => entry.role === "employee" && entry.managerId === user.id).map((entry) => entry.id);
    return res.json(listExceptionItems().filter((item) => teamIds.includes(item.employeeId)));
  }

  return res.json(listExceptionItems());
});

app.patch("/api/admin/exceptions/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = exceptionDecisionSchema.safeParse(req.body satisfies ValidationDecisionPayload);
  if (!parsed.success) {
    return res.status(400).json({ message: "Keputusan exception tidak valid." });
  }

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    if (user.role === "manager") {
      const organizationId = await getOrganizationIdForUser(user.id);
      if (!organizationId) return res.status(404).json({ message: "Exception tidak ditemukan." });
      const scopedExceptions = await supabaseGetManagerExceptions(sb, organizationId, user.id);
      if (!scopedExceptions.some((item) => item.id === req.params.id)) {
        return res.status(404).json({ message: "Exception tidak ditemukan." });
      }
    }

    const reviewed = await supabaseReviewException(sb, req.params.id, {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      reviewedBy: user.id
    });

    if (parsed.data.status === "Approved") {
      await sb
        .from("attendance_records")
        .update({ validation_status: "corrected", updated_at: new Date().toISOString() })
        .eq("id", reviewed.attendance_record_id);
    }

    if (parsed.data.status === "Rejected") {
      await sb
        .from("attendance_records")
        .update({ validation_status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", reviewed.attendance_record_id);
    }

    await supabaseCreateAuditLog(
      sb,
      createAuditLog(
        parsed.data.status === "Approved"
          ? "exception_approved"
          : parsed.data.status === "Rejected"
            ? "exception_rejected"
            : "correction_requested",
        user.fullName,
        user.role,
        req.params.id,
        parsed.data.adminNote
      )
    );
    return res.json({
      exception: {
        id: reviewed.id,
        attendanceRecordId: reviewed.attendance_record_id,
        employeeId: reviewed.employee_id,
        employeeName: "Employee",
        exceptionType: reviewed.exception_type,
        reason: reviewed.reason,
        status: reviewed.status,
        adminNote: reviewed.admin_note ?? undefined,
        reviewedBy: reviewed.reviewed_by ?? undefined,
        reviewedAt: reviewed.reviewed_at ?? undefined,
        createdAt: reviewed.created_at
      }
    });
  }

  store.exceptions = reduceExceptionReview(store.exceptions, {
    id: req.params.id,
    status: parsed.data.status,
    actorName: user.fullName,
    actorRole: user.role,
    adminNote: parsed.data.adminNote,
    reviewedAt: new Date().toISOString()
  });

  const updated = store.exceptions.find((item) => item.id === req.params.id);
  if (!updated) {
    return res.status(404).json({ message: "Exception tidak ditemukan." });
  }

  if (parsed.data.status === "Approved") {
    const record = Object.values(store.attendance).find((item) => item.id === updated.attendanceRecordId);
    if (record) {
      record.validationStatus = "corrected";
      record.validationReasons = record.validationReasons.filter((reason) => reason !== updated.reason);
      record.updatedAt = new Date().toISOString();
    }
  }

  if (parsed.data.status === "Rejected") {
    const record = Object.values(store.attendance).find((item) => item.id === updated.attendanceRecordId);
    if (record) {
      record.validationStatus = "rejected";
      record.updatedAt = new Date().toISOString();
    }
  }

  store.auditLogs.unshift(
    createAuditLog(
      parsed.data.status === "Approved"
        ? "exception_approved"
        : parsed.data.status === "Rejected"
          ? "exception_rejected"
          : "correction_requested",
      user.fullName,
      user.role,
      updated.id,
      parsed.data.adminNote
    )
  );
  await storage.save(store);

  return res.json({ exception: toExceptionItem(updated, userDirectory()) });
});

app.get("/api/admin/audit-logs", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (useSupabase && sb) {
    return res.json(await supabaseGetAuditLogs(sb));
  }

  return res.json(
    store.auditLogs
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 20)
  );
});

app.get("/api/notifications", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (useSupabase && sb && !isLocalDemoUser(user.id)) return res.json(await supabaseGetNotifications(sb, user.id));
  return res.json(filterNotificationsForRecipient(store.notifications ?? [], user.id));
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const item = await supabaseMarkNotificationRead(sb, req.params.id, user.id);
    if (!item) return res.status(404).json({ message: "Notifikasi tidak ditemukan." });
    return res.json(item);
  }
  const item = markNotificationRead(store.notifications ?? [], req.params.id, user.id);
  if (!item) return res.status(404).json({ message: "Notifikasi tidak ditemukan." });
  await storage.save(store);
  return res.json(item);
});

app.get("/api/departments", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (!canManageOrganizationStructure(user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) return res.json([]);
    return res.json(await supabaseGetDepartments(sb, organizationId));
  }

  return res.json(listLocalDepartments());
});

app.post("/api/departments", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (!canManageOrganizationStructure(user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Data divisi tidak valid." });

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) return res.status(400).json({ message: "Organisasi tidak ditemukan." });
    return res.status(201).json(await supabaseCreateDepartment(sb, organizationId, parsed.data));
  }

  const department: DepartmentItem = {
    id: `dep-${Date.now()}`,
    name: parsed.data.name,
    managerId: parsed.data.managerId ?? null,
    managerName: parsed.data.managerId ? users.find((entry) => entry.id === parsed.data.managerId)?.fullName ?? null : null,
    description: parsed.data.description ?? null,
    isActive: parsed.data.isActive ?? true,
    memberCount: 0
  };
  localDepartments = [...localDepartments, department];
  return res.status(201).json(department);
});

app.patch("/api/departments/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (!canManageOrganizationStructure(user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = departmentPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Data update divisi tidak valid." });

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) return res.status(400).json({ message: "Organisasi tidak ditemukan." });
    return res.json(await supabaseUpdateDepartment(sb, organizationId, req.params.id, parsed.data));
  }

  const existing = localDepartments.find((department) => department.id === req.params.id);
  if (!existing) return res.status(404).json({ message: "Divisi tidak ditemukan." });

  const updated: DepartmentItem = {
    ...existing,
    name: parsed.data.name ?? existing.name,
    managerId: parsed.data.managerId !== undefined ? parsed.data.managerId : existing.managerId,
    description: parsed.data.description !== undefined ? parsed.data.description : existing.description,
    isActive: parsed.data.isActive ?? existing.isActive
  };
  localDepartments = localDepartments.map((department) => department.id === req.params.id ? updated : department);
  return res.json(listLocalDepartments().find((department) => department.id === req.params.id) ?? updated);
});

app.patch("/api/employees/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (!canManageOrganizationStructure(user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = employeeDepartmentPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Data penempatan karyawan tidak valid." });

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) return res.status(400).json({ message: "Organisasi tidak ditemukan." });
    return res.json(await supabaseReassignEmployeeDepartment(sb, organizationId, req.params.id, parsed.data));
  }

  const updated = updateLocalEmployeeStructure(req.params.id, parsed.data);
  if (!updated) return res.status(404).json({ message: "Karyawan tidak ditemukan." });
  return res.json(updated);
});

// Employee list
app.get("/api/admin/employees", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const employeeFilters = user.role === "manager" ? undefined : {
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    departmentId: typeof req.query.departmentId === "string" ? req.query.departmentId : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined
  };

  if (useSupabase && sb && !isLocalDemoUser(user.id)) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (!organizationId) return res.json([]);
    return res.json(
      user.role === "manager"
        ? await supabaseGetManagerEmployeeList(sb, organizationId, user.id)
        : await supabaseGetEmployeeList(sb, organizationId, employeeFilters)
    );
  }

  const employeeUsers = user.role === "manager"
    ? users.filter((u) => u.role === "employee" && u.managerId === user.id)
    : users.filter((u) => u.role === "employee" || u.role === "manager");
  const list = applyEmployeeListFilters(computeEmployeeList(store, employeeUsers), employeeFilters);
  return res.json(list);
});

// Work locations
app.get("/api/admin/work-locations", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(store.workLocationItems);
});

const workLocationSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().min(10).max(5000)
});

app.post("/api/admin/work-locations", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = workLocationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Data lokasi tidak valid." });

  const location = createWorkLocationItem(parsed.data);
  store.workLocationItems = [...store.workLocationItems, location];
  store.workLocations = [...store.workLocations, toWorkLocationModel(location)];
  await storage.save(store);
  return res.status(201).json(location);
});

app.patch("/api/admin/work-locations/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const existing = store.workLocationItems.find((l) => l.id === req.params.id);
  if (!existing) return res.status(404).json({ message: "Lokasi tidak ditemukan." });

  const patchSchema = workLocationSchema.partial().extend({ status: z.enum(["active", "inactive"]).optional() });
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Data update tidak valid." });

  const updated = { ...existing, ...parsed.data };
  store.workLocationItems = store.workLocationItems.map((l) => l.id === req.params.id ? updated : l);
  store.workLocations = store.workLocations.map((location) =>
    location.id === req.params.id ? toWorkLocationModel(updated) : location
  );
  await storage.save(store);
  return res.json(updated);
});

// Shifts
app.get("/api/admin/shifts", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(store.shifts);
});

const shiftSchema = z.object({
  name: z.string().min(2),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format hh:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format hh:mm"),
  gracePeriodMinutes: z.number().min(0).max(60).optional(),
  workLocationId: z.string().optional(),
  workLocationName: z.string().optional(),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional()
});

app.post("/api/admin/shifts", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = shiftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Data shift tidak valid." });

  const location = store.workLocationItems.find((l) => l.id === parsed.data.workLocationId);
  const shift = createShiftRecord({
    ...parsed.data,
    workLocationName: location?.name ?? parsed.data.workLocationName
  });
  store.shifts = [...store.shifts, shift];
  await storage.save(store);
  return res.status(201).json(shift);
});

app.patch("/api/admin/shifts/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const existing = store.shifts.find((s) => s.id === req.params.id);
  if (!existing) return res.status(404).json({ message: "Shift tidak ditemukan." });

  const patchSchema = shiftSchema.partial().extend({ status: z.enum(["active", "archived"]).optional() });
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Data update shift tidak valid." });

  const updated = updateShiftRecord(existing, parsed.data);
  store.shifts = store.shifts.map((s) => s.id === req.params.id ? updated : s);
  await storage.save(store);
  return res.json(updated);
});

// Attendance reports
app.get("/api/admin/reports", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "manager") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const filters: AttendanceReportFilters = {
    dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
    dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
    employeeId: typeof req.query.employeeId === "string" ? req.query.employeeId : undefined,
    departmentId: typeof req.query.departmentId === "string" ? req.query.departmentId : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined
  };

  const rawLimit = parseInt(req.query.limit as string, 10);
  const rawOffset = parseInt(req.query.offset as string, 10);
  const pageLimit = isNaN(rawLimit) || rawLimit <= 0 ? 100 : Math.min(rawLimit, 500);
  const pageOffset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

  const organizationId = useSupabase && sb ? await getOrganizationIdForUser(user.id) : undefined;

  if (useSupabase && sb && organizationId) {
    const { rows, hasMore } = await supabaseGetAttendanceReportRows(sb, organizationId, filters, pageLimit, pageOffset);

    if (req.query.format === "csv") {
      const csv = generateCsvFromRows(rows);
      const today = new Date().toISOString().slice(0, 7);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="taptu-attendance-report-${today}.csv"`);
      return res.send(csv);
    }

    res.setHeader("X-Has-More", String(hasMore));
    res.setHeader("X-Pagination-Limit", String(pageLimit));
    res.setHeader("X-Pagination-Offset", String(pageOffset));
    return res.json(rows);
  }

  const scopedUserIds = user.role === "manager"
    ? new Set(users.filter((u) => u.role === "employee" && u.managerId === user.id).map((u) => u.id))
    : new Set(users.map((u) => u.id));

  const scopedStore = {
    ...store,
    attendance: Object.fromEntries(Object.entries(store.attendance).filter(([id]) => scopedUserIds.has(id)))
  };

  const rows = buildAttendanceReportRows(
    scopedStore,
    Object.fromEntries(users.map((u) => [u.id, u.fullName])),
    filters,
    Object.fromEntries(users.map((u) => [u.id, { departmentId: u.departmentId, departmentName: u.departmentName }]))
  );

  if (req.query.format === "csv") {
    const csv = generateCsvFromRows(rows);
    const today = new Date().toISOString().slice(0, 7);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="taptu-attendance-report-${today}.csv"`);
    return res.send(csv);
  }

  res.setHeader("X-Has-More", "false");
  res.setHeader("X-Pagination-Limit", String(pageLimit));
  res.setHeader("X-Pagination-Offset", String(pageOffset));
  return res.json(rows);
});

app.get("/api/scanner/state", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "scanner" && user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (useSupabase && sb) {
    const scanner = await supabaseGetScannerState(sb);
    return res.json({
      id: scanner.id,
      token: scanner.token,
      expiresInSeconds: Math.max(0, Math.ceil((new Date(scanner.expiresAt).getTime() - Date.now()) / 1000)),
      scansToday: scanner.scansToday,
      locationName: scanner.locationName,
      expiresAt: scanner.expiresAt,
      status: scanner.status,
      recentScans: scanner.recentScans
    });
  }

  return res.json({
    ...buildScannerPayload(),
    recentScans: store.scanner.recentScans.map((scan) => ({
      id: scan.id,
      employeeName: scan.employeeName ?? "Employee",
      status: scan.status,
      time: scan.createdAt.slice(11, 16),
      detail: scan.detail
    }))
  });
});

app.get("/api/scanner/token", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "scanner" && user.role !== "admin" && user.role !== "superadmin") return res.status(403).json({ message: "Forbidden" });

  if (useSupabase && sb) {
    const newToken = generateScannerToken();
    const state = await supabaseRefreshScannerToken(sb, newToken);
    return res.json({
      id: state.id,
      token: state.token,
      expiresInSeconds: Math.max(0, Math.ceil((new Date(state.expiresAt).getTime() - Date.now()) / 1000)),
      scansToday: state.scansToday,
      locationName: state.locationName,
      expiresAt: state.expiresAt,
      status: state.status
    } satisfies ScannerTokenPayload);
  }

  store.scanner = refreshScannerToken(store.scanner);
  store.auditLogs.unshift(createAuditLog("attendance_record_updated", user.fullName, user.role, store.scanner.id, "Scanner token diperbarui."));
  await storage.save(store);

  return res.json(buildScannerPayload());
});

app.post("/api/demo/reset", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "superadmin") {
    return res.status(403).json({ message: "Hanya superadmin yang dapat mereset demo." });
  }
  store = createInitialStore();
  const fikri = users.find((u) => u.id === "usr-employee-01");
  if (fikri) {
    fikri.departmentId = "dep-ops";
    fikri.departmentName = "Operasional";
    fikri.managerId = "usr-manager-01";
    fikri.managerName = "Raka Saputra";
  }
  localDepartments = seededLocalDepartments.map((d) => ({ ...d }));
  await storage.save(store).catch((err: unknown) => {
    console.error("[taptu-api] demo reset storage.save failed:", err);
  });
  return res.json({ ok: true, message: "Demo direset ke kondisi awal." });
});

// Catch unhandled async errors from route handlers (Express 4 does not auto-catch async throws).
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[taptu-api] Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ message: "Server error" });
  }
});

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  app.listen(port, () => {
    console.log(`Taptu API listening on http://localhost:${port}`);
  });
}

export function resetLocalNotificationStoreForTests() {
  store.notifications = [];
  store.requests = createInitialStore().requests;
}

export { app };
