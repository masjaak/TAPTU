import type {
  AttendanceActionResponse,
  AttendanceTimelineItem,
  DashboardPayload,
  LeaveRequestItem,
  LoginRequest,
  LoginResponse,
  RequestActionResponse,
  ScannerTokenPayload
} from "@taptu/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getDashboard(token: string): Promise<DashboardPayload> {
  return requestJson<DashboardPayload>("/dashboard", {}, token);
}

export async function checkIn(token: string, method: "QR" | "GPS" | "Selfie" | "Manual") {
  return requestJson<AttendanceActionResponse>(
    "/attendance/checkin",
    {
      method: "POST",
      body: JSON.stringify({ method })
    },
    token
  );
}

export async function fetchAttendanceHistory(token: string) {
  return requestJson<AttendanceTimelineItem[]>("/attendance/history", {}, token);
}

export async function fetchAttendanceHistoryByFilter(token: string, filter: "all" | "present" | "issue") {
  return requestJson<AttendanceTimelineItem[]>(`/attendance/history?filter=${filter}`, {}, token);
}

export async function checkOut(token: string, method: "QR" | "GPS" | "Selfie" | "Manual") {
  return requestJson<AttendanceActionResponse>(
    "/attendance/checkout",
    {
      method: "POST",
      body: JSON.stringify({ method })
    },
    token
  );
}

export async function createRequest(
  token: string,
  payload: { category: "Izin" | "Cuti" | "Sakit"; startDate: string; endDate: string; title: string; detail: string }
) {
  return requestJson<RequestActionResponse>(
    "/requests",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );
}

export async function approveRequest(token: string, id: string, status: "Disetujui" | "Ditolak") {
  return requestJson<RequestActionResponse>(
    `/admin/requests/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status })
    },
    token
  );
}

export async function fetchRequests(token: string, admin = false) {
  return requestJson<LeaveRequestItem[]>(admin ? "/admin/requests" : "/requests", {}, token);
}

export async function fetchRequestDetail(token: string, id: string) {
  return requestJson<LeaveRequestItem>(`/requests/${id}`, {}, token);
}

export async function cancelRequest(token: string, id: string) {
  return requestJson<{ id: string; removed: boolean }>(
    `/requests/${id}`,
    {
      method: "DELETE"
    },
    token
  );
}

export async function refreshScannerToken(token: string) {
  return requestJson<ScannerTokenPayload>("/scanner/token", {}, token);
}

async function requestJson<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: "Permintaan gagal." }));
    throw new Error(data.message ?? "Permintaan gagal.");
  }

  return response.json() as Promise<T>;
}
