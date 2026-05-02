import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import type {
  AdminOverview,
  AttendanceExceptionItem,
  AttendanceTimelineItem,
  AttendanceActionResponse,
  AttendanceValidationStatus,
  AuditLogItem,
  AuthUser,
  DashboardPayload,
  DashboardStat,
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
  calculateDistanceMeters,
  computeAdminOverview,
  computeEmployeeSummary,
  createAttendanceException,
  createAuditLog,
  createInitialStore,
  filterAttendanceHistory,
  generateScannerToken,
  reduceAttendance,
  reduceExceptionReview,
  reduceRequests,
  refreshScannerToken,
  toExceptionItem,
  validateAttendanceSubmission,
  validateScannerToken,
  type AttendanceMode
} from "./domain";
import { getApiConfig } from "./config";
import { createStorageAdapter } from "./storage";
import { createSupabaseAdmin, type SupabaseAdmin } from "./supabase";
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseGetProfile,
  supabaseGetTodayAttendance,
  supabaseUpsertAttendance,
  supabaseGetAttendanceHistory,
  supabaseGetAllAttendanceHistory,
  supabaseGetRequests,
  supabaseCreateRequest,
  supabaseGetRequestById,
  supabaseUpdateRequestStatus,
  supabaseDeleteRequest,
  supabaseGetAdminOverview,
  supabaseGetEmployeeSummary,
  supabaseGetExceptions,
  supabaseGetAuditLogs,
  supabaseGetScannerState,
  supabaseGetPrimaryWorkLocation,
  supabaseRefreshScannerToken,
  supabaseReviewException,
  supabaseCreateAuditLog,
  supabaseCreateAttendanceException
} from "./supabaseQueries";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const jwtSecret = process.env.JWT_SECRET ?? "dev-secret";

app.use(cors());
app.use(express.json());

const users: Array<AuthUser & { password: string }> = [
  {
    id: "usr-superadmin-01",
    fullName: "Super Admin",
    email: "superadmin@taptu.app",
    password: "Taptu123!",
    organizationName: "TAPTU HQ",
    role: "superadmin"
  },
  {
    id: "usr-admin-01",
    fullName: "Nadia Putri",
    email: "admin@taptu.app",
    password: "Taptu123!",
    organizationName: "TAPTU HQ",
    role: "admin"
  },
  {
    id: "usr-manager-01",
    fullName: "Raka Saputra",
    email: "manager@taptu.app",
    password: "Taptu123!",
    organizationName: "TAPTU HQ",
    role: "manager"
  },
  {
    id: "usr-employee-01",
    fullName: "Fikri Maulana",
    email: "employee@taptu.app",
    password: "Taptu123!",
    organizationName: "TAPTU HQ",
    role: "employee"
  },
  {
    id: "usr-employee-02",
    fullName: "Anisa Rahma",
    email: "anisa@taptu.app",
    password: "Taptu123!",
    organizationName: "TAPTU HQ",
    role: "employee"
  },
  {
    id: "usr-employee-03",
    fullName: "Leo Pratama",
    email: "leo@taptu.app",
    password: "Taptu123!",
    organizationName: "TAPTU HQ",
    role: "employee"
  },
  {
    id: "usr-scanner-01",
    fullName: "Front Gate Scanner",
    email: "scanner@taptu.app",
    password: "Taptu123!",
    organizationName: "TAPTU HQ",
    role: "scanner"
  }
];

const apiDir = dirname(fileURLToPath(import.meta.url));
const storePath = join(apiDir, "..", "data", "demo-store.json");
const apiConfig = getApiConfig();
const storage = createStorageAdapter(apiConfig, storePath);
let store = await storage.load();

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
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08.24", method: "GPS" },
    { id: "a-03", day: "Kemarin", status: "Tepat waktu", time: "07.58", method: "QR" }
  ],
  admin: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08.24", method: "GPS" },
    { id: "a-03", day: "Kemarin", status: "Tepat waktu", time: "07.58", method: "QR" }
  ],
  manager: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { id: "a-02", day: "Hari ini", status: "Terlambat", time: "08.24", method: "GPS" },
    { id: "a-03", day: "Kemarin", status: "Tepat waktu", time: "07.58", method: "QR" }
  ],
  employee: [
    { id: "a-01", day: "Hari ini", status: "Tepat waktu", time: "08.03", method: "QR" },
    { id: "a-02", day: "Kemarin", status: "Tepat waktu", time: "07.55", method: "Selfie" },
    { id: "a-03", day: "Senin", status: "Izin", time: "08.00", method: "Manual" }
  ],
  scanner: [
    { id: "a-01", day: "08.03", status: "Tepat waktu", time: "Nadia Putri", method: "QR" },
    { id: "a-02", day: "08.07", status: "Tepat waktu", time: "Ilham Fadli", method: "QR" },
    { id: "a-03", day: "08.09", status: "Belum check-in", time: "1 scan gagal radius", method: "Manual" }
  ]
};

const requestFeed: Record<UserRole, LeaveRequestItem[]> = {
  superadmin: [
    { id: "req-01", title: "Izin sakit · Anisa Rahma", status: "Menunggu", detail: "Belum ada lampiran dokter final." },
    { id: "req-02", title: "Cuti tahunan · Fikri Maulana", status: "Disetujui", detail: "2 hari kerja, mulai Jumat." }
  ],
  admin: [
    { id: "req-01", title: "Izin sakit · Anisa Rahma", status: "Menunggu", detail: "Butuh approval hari ini sebelum 12.00." },
    { id: "req-02", title: "Cuti tahunan · Fikri Maulana", status: "Disetujui", detail: "2 hari kerja, mulai Jumat." },
    { id: "req-03", title: "Tukar shift · Leo Pratama", status: "Menunggu", detail: "Menunggu manager operasional." }
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

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  role: z.enum(["superadmin", "admin", "manager", "employee"]).default("superadmin")
});

const attendanceSchema = z.object({
  method: z.enum(["QR", "GPS", "Selfie", "Manual"]),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  selfieUrl: z.string().optional(),
  deviceId: z.string().min(4).optional(),
  scannerToken: z.string().optional(),
  requiredSelfie: z.boolean().optional().default(false)
});

const requestSchema = z.object({
  category: z.enum(["Izin", "Cuti", "Sakit", "Permission", "Attendance Correction", "Forgot Check-in/out"]),
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
  if (useSupabase && sb) {
    const user = await authenticateSupabase(req.header("authorization"));
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }
    return user;
  }

  const user = authenticate(req.header("authorization"));

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  return user;
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

  if (record.state === "checked_in") {
    return {
      id: record.id,
      day: "Hari ini",
      status: record.status === "Terlambat" ? "Terlambat" : "Tepat waktu",
      time: record.checkInAt?.slice(11, 16) ?? "--.--",
      method: record.checkInMethod ?? "QR"
    };
  }

  if (record.state === "checked_out") {
    return {
      id: record.id,
      day: "Hari ini",
      status: "Tepat waktu",
      time: record.checkOutAt?.slice(11, 16) ?? "--.--",
      method: record.checkOutMethod ?? "QR"
    };
  }

  return {
    id: record.id,
    day: "Hari ini",
    status: "Belum check-in",
    time: "--.--",
    method: "Manual"
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

  if (useSupabase && sb) {
    try {
      const result = await supabaseSignIn(sb, parsed.data.email, parsed.data.password);
      const response: LoginResponse = { token: result.accessToken, user: result.user };
      return res.json(response);
    } catch (err) {
      return res.status(401).json({ message: err instanceof Error ? err.message : "Login gagal." });
    }
  }

  const found = users.find((user) => user.email === parsed.data.email && user.password === parsed.data.password);

  if (!found) {
    return res.status(401).json({
      message: "Akun tidak ditemukan atau password salah."
    });
  }

  const { password: _password, ...user } = found;
  const response: LoginResponse = {
    token: signUser(user),
    user
  };

  return res.json(response);
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

  if (useSupabase && sb) {
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const organizationId = isAdmin || user.role === "manager" ? await getOrganizationIdForUser(user.id) : undefined;
    const attendance = await supabaseGetAttendanceHistory(sb, user.id);
    const todayRecord = await supabaseGetTodayAttendance(sb, user.id);
    const requests = await supabaseGetRequests(sb, user.id, isAdmin || user.role === "manager", organizationId ?? undefined);
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
        : user.role === "admin"
          ? store.requests.map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName))
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

  if (useSupabase && sb) {
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

  if (useSupabase && sb) {
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

  if (useSupabase && sb) {
    const current = await supabaseGetTodayAttendance(sb, user.id);
    const organizationId = await getOrganizationIdForUser(user.id);
    const location = organizationId ? await supabaseGetPrimaryWorkLocation(sb, organizationId) : store.workLocations[0];
    const validation = validateAttendanceSubmission({
      locationLat: parsed.data.locationLat,
      locationLng: parsed.data.locationLng,
      selfieUrl: parsed.data.selfieUrl,
      deviceId: parsed.data.deviceId,
      scannerToken: parsed.data.scannerToken,
      requiredSelfie: parsed.data.requiredSelfie,
      previousDeviceId: current.deviceId,
      location,
      now
    });
    const reasons = [...validation.reasons];
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
      selfieUrl: parsed.data.selfieUrl,
      deviceId: parsed.data.deviceId,
      scannerTokenId
    });
    if (next.state === current.state) {
      return res.status(409).json({ message: "Check-in sudah dilakukan atau state tidak valid." });
    }
    const persisted = await supabaseUpsertAttendance(sb, user.id, next);

    if (validation.exceptionType) {
      await supabaseCreateAttendanceException(
        sb,
        createAttendanceException(persisted, user.id, validation.exceptionType, reasons[0] ?? "Butuh review.")
      );
    }

    if (persisted.status === "Terlambat") {
      await supabaseCreateAttendanceException(
        sb,
        createAttendanceException(
          persisted,
          user.id,
          "Late check-in",
          "Check-in melebihi toleransi 10 menit dari awal shift."
        )
      );
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
      record: {
        day: "Hari ini",
        status: persisted.status === "Terlambat" ? "Terlambat" : "Tepat waktu",
        time: new Date().toTimeString().slice(0, 5),
        method: parsed.data.method as "QR" | "GPS" | "Selfie" | "Manual"
      }
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
    requiredSelfie: parsed.data.requiredSelfie,
    previousDeviceId: current.deviceId,
    location: store.workLocations[0],
    now
  });
  const reasons = [...validation.reasons];

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
    selfieUrl: parsed.data.selfieUrl,
    deviceId: parsed.data.deviceId,
    scannerTokenId: store.scanner.id
  });

  if (next.state === current.state) {
    return res.status(409).json({ message: "Check-in sudah dilakukan atau state tidak valid." });
  }

  store.attendance[user.id] = next;
  const historyItem = buildAttendanceItem(user.id);
  store.attendanceHistory = [historyItem, ...store.attendanceHistory.filter((item) => item.day !== "Hari ini")];

  if (validation.exceptionType) {
    store.exceptions.unshift(createAttendanceException(next, user.id, validation.exceptionType, reasons[0] ?? "Butuh review."));
  }

  if (next.status === "Terlambat") {
    store.exceptions.unshift(createAttendanceException(next, user.id, "Late check-in", "Check-in melebihi toleransi 10 menit dari awal shift."));
  }

  if (reasons.some((item) => item.includes("Perangkat berbeda"))) {
    store.auditLogs.unshift(createAuditLog("device_mismatch_exception", user.fullName, user.role, next.id ?? user.id, reasons.join(" | ")));
  }

  store.scanner = appendScannerAttempt(store.scanner, {
    id: `scan-${Date.now()}-ok`,
    employeeId: user.id,
    employeeName: user.fullName,
    status: "success",
    detail: `${parsed.data.method} check-in tercatat.`,
    createdAt: now
  });
  await storage.save(store);

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

  if (useSupabase && sb) {
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
      record: { day: "Hari ini", status: "Tepat waktu", time: new Date().toTimeString().slice(0, 5), method: parsed.data.method as "QR" | "GPS" | "Selfie" | "Manual" }
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
    scannerTokenId: store.scanner.id
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
  await storage.save(store);

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

  if (useSupabase && sb) {
    const isAdmin = user.role === "admin" || user.role === "superadmin" || user.role === "manager";
    const organizationId = isAdmin ? await getOrganizationIdForUser(user.id) : undefined;
    const items = await supabaseGetRequests(sb, user.id, isAdmin, organizationId ?? undefined);
    return res.json(items);
  }

  if (user.role === "admin" || user.role === "superadmin" || user.role === "manager") {
    return res.json(
      store.requests
        .filter((item) => user.role !== "manager" || ["Izin", "Permission", "Attendance Correction", "Forgot Check-in/out"].includes(item.category))
        .map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName))
    );
  }

  return res.json(store.requests.filter((item) => item.userId === user.id).map((item) => buildRequestItem(item)));
});

app.get("/api/requests/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb) {
    const isAdmin = user.role === "admin" || user.role === "superadmin" || user.role === "manager";
    const item = await supabaseGetRequestById(sb, req.params.id, user.id, isAdmin);
    if (!item) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
    if (user.role === "manager" && item.category && !["Izin", "Permission", "Attendance Correction", "Forgot Check-in/out"].includes(item.category)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json(item);
  }

  const request = store.requests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
  if (user.role === "employee" && request.userId !== user.id) return res.status(403).json({ message: "Forbidden" });
  if (user.role === "manager" && !["Izin", "Permission", "Attendance Correction", "Forgot Check-in/out"].includes(request.category)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(buildRequestItem(request, users.find((entry) => entry.id === request.userId)?.fullName));
});

app.post("/api/requests", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Judul atau detail pengajuan belum valid." });

  if (useSupabase && sb) {
    const created = await supabaseCreateRequest(sb, user.id, parsed.data);
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
  await storage.save(store);
  return res.status(201).json({ request: buildRequestItem(nextRequest) });
});

app.delete("/api/requests/:id", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb) {
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

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    const items = await supabaseGetRequests(sb, user.id, true, organizationId ?? undefined);
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

  if (useSupabase && sb) {
    if (user.role === "manager") {
      const existing = await supabaseGetRequestById(sb, req.params.id, user.id, true);
      if (!existing || !existing.category || !["Izin", "Permission", "Attendance Correction", "Forgot Check-in/out"].includes(existing.category)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
    const updated = await supabaseUpdateRequestStatus(sb, req.params.id, parsed.data.status, parsed.data.adminNote);
    if (!updated) return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
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
  await storage.save(store);
  return res.json({ request: buildRequestItem(updated, users.find((entry) => entry.id === updated.userId)?.fullName) });
});

app.get("/api/admin/overview", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;
  if (user.role !== "admin" && user.role !== "superadmin") return res.status(403).json({ message: "Forbidden" });

  if (useSupabase && sb) {
    const organizationId = await getOrganizationIdForUser(user.id);
    if (organizationId) {
      const overview = await supabaseGetAdminOverview(sb, organizationId);
      return res.json(overview);
    }
  }

  const overview: AdminOverview = computeAdminOverview(
    store,
    users.filter((entry) => entry.role === "employee").length,
    Object.fromEntries(users.map((entry) => [entry.id, entry.fullName]))
  );
  return res.json(overview);
});

app.get("/api/employee/summary", async (req, res) => {
  const user = await requireUserAsync(req, res);
  if (!user) return;

  if (useSupabase && sb) {
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
    return res.json(await supabaseGetExceptions(sb, organizationId));
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

  if (useSupabase && sb) {
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

app.listen(port, () => {
  console.log(`Taptu API listening on http://localhost:${port}`);
});
