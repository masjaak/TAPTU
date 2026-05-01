import type {
  AdminOverview,
  AttendanceActionResponse,
  AttendanceTimelineItem,
  DashboardPayload,
  EmployeeSummary,
  LeaveRequestItem,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RequestActionResponse,
  ScannerTokenPayload
} from "@taptu/shared";

import {
  getDemoAdminOverview,
  getDemoAttendanceHistory,
  getDemoDashboard,
  getDemoEmployeeSummary,
  getDemoRequests,
  getDemoScannerToken,
  isDemoToken,
  tryDemoLogin
} from "./demo";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const demo = tryDemoLogin(payload.email, payload.password);
  if (demo) return Promise.resolve(demo);
  return requestJson<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getDashboard(token: string): Promise<DashboardPayload> {
  if (isDemoToken(token)) return Promise.resolve(getDemoDashboard(token));
  return requestJson<DashboardPayload>("/dashboard", {}, token);
}

export async function checkIn(token: string, method: "QR" | "GPS" | "Selfie" | "Manual") {
  if (isDemoToken(token)) {
    const response: AttendanceActionResponse = {
      attendanceState: "checked_in",
      record: { day: "Hari ini", status: "Tepat waktu", time: new Date().toTimeString().slice(0, 5), method }
    };
    return Promise.resolve(response);
  }
  return requestJson<AttendanceActionResponse>(
    "/attendance/checkin",
    { method: "POST", body: JSON.stringify({ method }) },
    token
  );
}

export async function fetchAttendanceHistory(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoAttendanceHistory(token));
  return requestJson<AttendanceTimelineItem[]>("/attendance/history", {}, token);
}

export async function fetchAttendanceHistoryByFilter(token: string, filter: "all" | "present" | "issue") {
  if (isDemoToken(token)) {
    const all = getDemoAttendanceHistory(token);
    if (filter === "present") return Promise.resolve(all.filter((i) => i.status === "Tepat waktu"));
    if (filter === "issue") return Promise.resolve(all.filter((i) => i.status !== "Tepat waktu"));
    return Promise.resolve(all);
  }
  return requestJson<AttendanceTimelineItem[]>(`/attendance/history?filter=${filter}`, {}, token);
}

export async function checkOut(token: string, method: "QR" | "GPS" | "Selfie" | "Manual") {
  if (isDemoToken(token)) {
    const response: AttendanceActionResponse = {
      attendanceState: "checked_out",
      record: { day: "Hari ini", status: "Tepat waktu", time: new Date().toTimeString().slice(0, 5), method }
    };
    return Promise.resolve(response);
  }
  return requestJson<AttendanceActionResponse>(
    "/attendance/checkout",
    { method: "POST", body: JSON.stringify({ method }) },
    token
  );
}

export async function createRequest(
  token: string,
  payload: { category: "Izin" | "Cuti" | "Sakit"; startDate: string; endDate: string; title: string; detail: string }
) {
  if (isDemoToken(token)) {
    const response: RequestActionResponse = {
      request: { id: `demo-req-${Date.now()}`, ...payload, status: "Menunggu" }
    };
    return Promise.resolve(response);
  }
  return requestJson<RequestActionResponse>(
    "/requests",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export async function approveRequest(token: string, id: string, status: "Disetujui" | "Ditolak") {
  if (isDemoToken(token)) {
    const response: RequestActionResponse = {
      request: { id, title: "Demo request", status, detail: "Demo approval." }
    };
    return Promise.resolve(response);
  }
  return requestJson<RequestActionResponse>(
    `/admin/requests/${id}`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    token
  );
}

export async function fetchRequests(token: string, admin = false) {
  if (isDemoToken(token)) return Promise.resolve(getDemoRequests(token));
  return requestJson<LeaveRequestItem[]>(admin ? "/admin/requests" : "/requests", {}, token);
}

export async function fetchRequestDetail(token: string, id: string) {
  if (isDemoToken(token)) {
    const all = getDemoRequests(token);
    const found = all.find((r) => r.id === id);
    if (found) return Promise.resolve(found);
    return Promise.resolve({ id, title: "Demo request", status: "Menunggu" as const, detail: "Demo detail." });
  }
  return requestJson<LeaveRequestItem>(`/requests/${id}`, {}, token);
}

export async function cancelRequest(token: string, id: string) {
  if (isDemoToken(token)) return Promise.resolve({ id, removed: true });
  return requestJson<{ id: string; removed: boolean }>(
    `/requests/${id}`,
    { method: "DELETE" },
    token
  );
}

export async function refreshScannerToken(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoScannerToken());
  return requestJson<ScannerTokenPayload>("/scanner/token", {}, token);
}

export async function fetchAdminOverview(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoAdminOverview());
  return requestJson<AdminOverview>("/admin/overview", {}, token);
}

export async function fetchEmployeeSummary(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoEmployeeSummary());
  return requestJson<EmployeeSummary>("/employee/summary", {}, token);
}

async function requestJson<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {})
      }
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Jalankan npm run dev:api terlebih dahulu.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: "Permintaan gagal." }));
    throw new Error(data.message ?? "Permintaan gagal.");
  }

  return response.json() as Promise<T>;
}
