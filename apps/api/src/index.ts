import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { join } from "node:path";
import { z } from "zod";

import type {
  AdminOverview,
  AttendanceTimelineItem,
  AttendanceActionResponse,
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
  UserRole
} from "@taptu/shared";
import { computeAdminOverview, computeEmployeeSummary, createInitialStore, filterAttendanceHistory, reduceAttendance, reduceRequests, refreshScannerToken, type AttendanceMode } from "./domain";
import { getApiConfig } from "./config";
import { createStorageAdapter } from "./storage";

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
    id: "usr-employee-01",
    fullName: "Fikri Maulana",
    email: "employee@taptu.app",
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

const storePath = join(process.cwd(), "apps", "api", "data", "demo-store.json");
const apiConfig = getApiConfig();
const storage = createStorageAdapter(apiConfig.storageMode, storePath);
let store = await storage.load();

const roleStats: Record<UserRole, DashboardStat[]> = {
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

const attendanceFeed: Record<UserRole, AttendanceTimelineItem[]> = {
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

const requestFeed: Record<UserRole, LeaveRequestItem[]> = {
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  role: z.enum(["superadmin", "admin", "employee"]).default("superadmin")
});

const attendanceSchema = z.object({
  method: z.enum(["QR", "GPS", "Selfie", "Manual"])
});

const requestSchema = z.object({
  category: z.enum(["Izin", "Cuti", "Sakit"]),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  title: z.string().min(3),
  detail: z.string().min(8)
}).refine((value) => value.endDate >= value.startDate, {
  message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."
});

const approvalSchema = z.object({
  status: z.enum(["Disetujui", "Ditolak"])
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

function requireUser(req: express.Request, res: express.Response): AuthUser | null {
  const user = authenticate(req.header("authorization"));

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  return user;
}

function buildAttendanceItem(userId: string): AttendanceTimelineItem {
  const record = store.attendance[userId] ?? { userId, state: "idle" as const };

  if (record.state === "checked_in") {
    return {
      id: userId,
      day: "Hari ini",
      status: "Tepat waktu",
      time: record.checkInAt?.slice(11, 16).replace("T", "") ?? "--.--",
      method: record.checkInMethod ?? "QR"
    };
  }

  if (record.state === "checked_out") {
    return {
      id: userId,
      day: "Hari ini",
      status: "Tepat waktu",
      time: record.checkOutAt?.slice(11, 16).replace("T", "") ?? "--.--",
      method: record.checkOutMethod ?? "QR"
    };
  }

  return {
    id: userId,
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
    requester: actorName
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "taptu-api",
    storageMode: apiConfig.storageMode,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/auth/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body satisfies LoginRequest);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Email atau password tidak valid."
    });
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

app.post("/api/auth/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body satisfies RegisterRequest);

  if (!parsed.success) {
    return res.status(400).json({ message: "Data registrasi tidak valid." });
  }

  const { fullName, email, password, organizationName, role } = parsed.data;

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

app.get("/api/auth/me", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  return res.json({ user });
});

app.get("/api/dashboard", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
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

app.get("/api/attendance/today", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  return res.json(buildAttendanceItem(user.id));
});

app.get("/api/attendance/history", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  const filter = historyFilterSchema.parse(req.query.filter);

  if (user.role === "admin" || user.role === "superadmin") {
    return res.json(filterAttendanceHistory(store.attendanceHistory, filter));
  }

  return res.json(filterAttendanceHistory(listAttendanceHistory(user), filter));
});

app.post("/api/attendance/checkin", async (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  const parsed = attendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Metode check-in tidak valid." });
  }

  const current = store.attendance[user.id] ?? { userId: user.id, state: "idle" as const };
  const next = reduceAttendance(current, {
    type: "CHECK_IN",
    method: parsed.data.method as AttendanceMode,
    at: new Date().toISOString()
  });

  if (next.state === current.state) {
    return res.status(409).json({ message: "Check-in sudah dilakukan atau state tidak valid." });
  }

  store.attendance[user.id] = next;
  const historyItem = buildAttendanceItem(user.id);
  store.attendanceHistory = [historyItem, ...store.attendanceHistory.filter((item) => item.day !== "Hari ini")];
  await storage.save(store);

  const response: AttendanceActionResponse = {
    attendanceState: next.state,
    record: historyItem
  };

  return res.json(response);
});

app.post("/api/attendance/checkout", async (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  const parsed = attendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Metode check-out tidak valid." });
  }

  const current = store.attendance[user.id] ?? { userId: user.id, state: "idle" as const };
  const next = reduceAttendance(current, {
    type: "CHECK_OUT",
    method: parsed.data.method as AttendanceMode,
    at: new Date().toISOString()
  });

  if (next.state === current.state) {
    return res.status(409).json({ message: "Check-out belum bisa dilakukan sebelum check-in." });
  }

  store.attendance[user.id] = next;
  const historyItem = buildAttendanceItem(user.id);
  store.attendanceHistory = [historyItem, ...store.attendanceHistory.filter((item) => item.day !== "Hari ini")];
  await storage.save(store);

  const response: AttendanceActionResponse = {
    attendanceState: next.state,
    record: historyItem
  };

  return res.json(response);
});

app.get("/api/requests", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  if (user.role === "admin") {
    return res.json(
      store.requests.map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName))
    );
  }

  return res.json(store.requests.filter((item) => item.userId === user.id).map((item) => buildRequestItem(item)));
});

app.get("/api/requests/:id", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  const request = store.requests.find((item) => item.id === req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
  }

  if (user.role === "employee" && request.userId !== user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return res.json(buildRequestItem(request, users.find((entry) => entry.id === request.userId)?.fullName));
});

app.post("/api/requests", async (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Judul atau detail pengajuan belum valid." });
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

  store.requests = reduceRequests(store.requests, {
    type: "CREATE",
    request: nextRequest
  });
  await storage.save(store);

  const response: RequestActionResponse = {
    request: buildRequestItem(nextRequest)
  };

  return res.status(201).json(response);
});

app.delete("/api/requests/:id", async (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  const existing = store.requests.find((item) => item.id === req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
  }

  if (user.role === "employee" && existing.userId !== user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const next = reduceRequests(store.requests, {
    type: "CANCEL",
    id: req.params.id,
    actorRole: user.role
  });

  if (next.length === store.requests.length) {
    return res.status(409).json({ message: "Pengajuan hanya bisa dibatalkan saat masih menunggu." });
  }

  store.requests = next;
  await storage.save(store);

  return res.json({ id: req.params.id, removed: true });
});

app.get("/api/admin/requests", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  return res.json(store.requests.map((item) => buildRequestItem(item, users.find((entry) => entry.id === item.userId)?.fullName)));
});

app.patch("/api/admin/requests/:id", async (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const parsed = approvalSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Status approval tidak valid." });
  }

  store.requests = reduceRequests(store.requests, {
    type: parsed.data.status === "Disetujui" ? "APPROVE" : "REJECT",
    id: req.params.id,
    actorRole: user.role
  });

  const updated = store.requests.find((item) => item.id === req.params.id);

  if (!updated) {
    return res.status(404).json({ message: "Pengajuan tidak ditemukan." });
  }

  const response: RequestActionResponse = {
    request: buildRequestItem(updated, users.find((entry) => entry.id === updated.userId)?.fullName)
  };

  await storage.save(store);

  return res.json(response);
});

app.get("/api/admin/overview", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const overview: AdminOverview = computeAdminOverview(store, users.filter((u) => u.role === "employee").length);

  return res.json(overview);
});

app.get("/api/employee/summary", (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  const summary: EmployeeSummary = computeEmployeeSummary(store, user.id);

  return res.json(summary);
});

app.get("/api/scanner/token", async (req, res) => {
  const user = requireUser(req, res);

  if (!user) {
    return;
  }

  if (user.role !== "scanner" && user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  store.scanner = refreshScannerToken(store.scanner);
  await storage.save(store);

  const payload: ScannerTokenPayload = {
    token: store.scanner.token,
    expiresInSeconds: store.scanner.expiresInSeconds,
    scansToday: store.scanner.scansToday,
    locationName: store.scanner.locationName
  };

  return res.json(payload);
});

app.listen(port, () => {
  console.log(`Taptu API listening on http://localhost:${port}`);
});
