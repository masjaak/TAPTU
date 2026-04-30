import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import type {
  AttendanceTimelineItem,
  AuthUser,
  DashboardPayload,
  DashboardStat,
  LeaveRequestItem,
  LoginRequest,
  LoginResponse,
  UserRole
} from "@taptu/shared";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const jwtSecret = process.env.JWT_SECRET ?? "dev-secret";

app.use(cors());
app.use(express.json());

const users: Array<AuthUser & { password: string }> = [
  {
    id: "usr-admin-01",
    fullName: "Nadia Putri",
    email: "admin@hadiri.app",
    password: "Hadiri123!",
    organizationName: "TAPTU HQ",
    role: "admin"
  },
  {
    id: "usr-employee-01",
    fullName: "Fikri Maulana",
    email: "employee@hadiri.app",
    password: "Hadiri123!",
    organizationName: "TAPTU HQ",
    role: "employee"
  },
  {
    id: "usr-scanner-01",
    fullName: "Front Gate Scanner",
    email: "scanner@hadiri.app",
    password: "Hadiri123!",
    organizationName: "TAPTU HQ",
    role: "scanner"
  }
];

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

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "hadiri-api",
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

app.get("/api/auth/me", (req, res) => {
  const user = authenticate(req.header("authorization"));

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user });
});

app.get("/api/dashboard", (req, res) => {
  const user = authenticate(req.header("authorization"));

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const payload: DashboardPayload = {
    greeting: `Halo, ${user.fullName}`,
    stats: roleStats[user.role] ?? roleStats.employee,
    schedule: [
      { time: "08.00", title: "Check-in kantor", detail: "QR utama akan refresh otomatis tiap 30 detik." },
      { time: "13.00", title: "Review izin harian", detail: "Approval manager dan rekap lokasi kerja." },
      { time: "17.00", title: "Check-out", detail: "Sinkron ke laporan harian dan payroll." }
    ],
    attendance: attendanceFeed[user.role] ?? attendanceFeed.employee,
    requests: requestFeed[user.role] ?? requestFeed.employee,
    scannerToken: user.role === "scanner" ? "HDR-31A-7XZ" : undefined
  };

  return res.json(payload);
});

app.listen(port, () => {
  console.log(`Hadiri API listening on http://localhost:${port}`);
});
