import type {
  AdminOverview,
  ApprovalRequestType,
  AttendanceActionResponse,
  AttendanceExceptionItem,
  AttendanceReportRow,
  AttendanceTimelineItem,
  AuditLogItem,
  AuthUser,
  DashboardPayload,
  DepartmentItem,
  EmployeeListItem,
  EmployeeSummary,
  LeaveRequestItem,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RequestActionResponse,
  ScannerTokenPayload,
  ShiftRecord,
  ValidationDecisionPayload,
  WorkLocationItem
} from "@taptu/shared";

import {
  getDemoAdminOverview,
  getDemoAttendanceHistory,
  getDemoDashboard,
  getDemoDepartments,
  getDemoEmployeeList,
  getDemoExceptionQueue,
  getDemoEmployeeSummary,
  getDemoManagerOverview,
  getDemoRequests,
  getDemoManagerRequests,
  getDemoNotifications,
  approveDemoRequest,
  getDemoAuditLogs,
  getDemoReportRows,
  getDemoScannerState,
  getDemoScannerToken,
  getDemoShifts,
  getDemoWorkLocations,
  isDemoToken,
  createDemoDepartment,
  createDemoShift,
  createDemoWorkLocation,
  reassignDemoEmployeeDepartment,
  recordDemoCheckIn,
  recordDemoCheckOut,
  resetDemoAttendanceState,
  updateDemoDepartment,
  updateDemoShift,
  updateDemoWorkLocation,
  tryDemoLogin,
  getDemoRoleFromToken
} from "./demo";

export { resetDemoAttendanceState };

import { supabase } from "./supabase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
// VITE_BROWSER_LOCAL_DEMO=true: demo works offline but cross-device sync is disabled.
// Set to false (default) for shared API-backed demo across devices.
// Default is false — only enable explicitly when running fully offline.
const useBrowserLocalDemo = import.meta.env.VITE_BROWSER_LOCAL_DEMO === "true";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (useBrowserLocalDemo) {
    const demo = tryDemoLogin(payload.email, payload.password);
    if (demo) return Promise.resolve(demo);
  }

  // Always call the shared Express API backend first. The backend issues a signed server JWT
  // for demo accounts so all subsequent calls go through the backend (cross-device sync).
  // For real Supabase users the backend delegates to supabaseSignIn and returns the access token.
  // Supabase direct auth is a fallback only when the API server is unreachable (network error).
  try {
    return await requestJson<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Only try Supabase/demo fallback when the API was not properly reached:
    // – Network error ("Tidak dapat terhubung...") — server unreachable
    // – Generic "Permintaan gagal." — API returned a non-JSON response (e.g. 404 HTML)
    // – SyntaxError — API returned 200 HTML (Vercel SPA rewrite with no backend)
    // Do NOT fall back for specific auth errors (e.g. "Akun tidak ditemukan...") — those mean
    // the API is working and the credentials are genuinely wrong.
    const msg = err instanceof Error ? err.message : "";
    const apiNotFunctional =
      msg.startsWith("Tidak dapat terhubung") ||
      msg === "Permintaan gagal." ||
      err instanceof SyntaxError ||
      err instanceof TypeError; // fetch returned an unexpected value (stub/mock returning undefined)
    if (apiNotFunctional) {
      // API unreachable — try Supabase direct auth for real users in static/serverless deployments.
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: payload.email,
          password: payload.password
        });
        if (!error && data.session) {
          try {
            const { user } = await requestJson<{ user: AuthUser }>("/auth/me", {}, data.session.access_token);
            return { token: data.session.access_token, user };
          } catch {
            // /auth/me also unreachable — fall through to demo fallback below
          }
        }
      }
      // Final fallback: browser-local demo tokens for offline / no-backend use.
      const demo = tryDemoLogin(payload.email, payload.password);
      if (demo) return demo;
    }
    throw err;

  }
}

export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getDashboard(token: string): Promise<DashboardPayload> {
  if (isDemoToken(token)) {
    const dashboard = getDemoDashboard(token);
    if (token === "demo:manager") {
      return Promise.resolve({ ...dashboard, attendance: [], requests: [] });
    }
    return Promise.resolve(dashboard);
  }
  return requestJson<DashboardPayload>("/dashboard", {}, token);
}

export async function checkIn(
  token: string,
  payload: {
    method: "QR" | "GPS" | "Selfie" | "Manual";
    locationLat?: number;
    locationLng?: number;
    selfieUrl?: string;
    selfieData?: string;
    selfieFileName?: string;
    selfieContentType?: string;
    deviceId?: string;
    scannerToken?: string;
    requiredSelfie?: boolean;
  }
) {
  const hasSelfieProof = Boolean(payload.selfieUrl || payload.selfieData);
  if (isDemoToken(token)) {
    // Determine the employee id from the demo token (employee role → usr-employee-01)
    const demoEmployeeId = "usr-employee-01";
    // Write check-in into the shared demo store so manager/HR overview reflects it
    recordDemoCheckIn(demoEmployeeId, payload.method);
    const selfieNote = hasSelfieProof ? "Selfie tersimpan sebagai bukti hadir." : undefined;
    const response: AttendanceActionResponse = {
      attendanceState: "checked_in",
      // Check-in succeeds regardless of selfie — selfie is optional evidence
      validationStatus: hasSelfieProof ? "needs_review" : "verified",
      validationReasons: selfieNote ? [selfieNote] : [],
      record: { day: "Hari ini", status: "Tepat waktu", time: new Date().toTimeString().slice(0, 5), method: payload.method }
    };
    return Promise.resolve(response);
  }
  return requestJson<AttendanceActionResponse>(
    "/attendance/checkin",
    { method: "POST", body: JSON.stringify(payload) },
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

export async function checkOut(
  token: string,
  payload: {
    method: "QR" | "GPS" | "Selfie" | "Manual";
    locationLat?: number;
    locationLng?: number;
    selfieUrl?: string;
    deviceId?: string;
    scannerToken?: string;
  }
) {
  if (isDemoToken(token)) {
    const demoEmployeeId = "usr-employee-01";
    recordDemoCheckOut(demoEmployeeId);
    const response: AttendanceActionResponse = {
      attendanceState: "checked_out",
      validationStatus: "verified",
      validationReasons: [],
      record: { day: "Hari ini", status: "Tepat waktu", time: new Date().toTimeString().slice(0, 5), method: payload.method }
    };
    return Promise.resolve(response);
  }
  return requestJson<AttendanceActionResponse>(
    "/attendance/checkout",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export async function createRequest(
  token: string,
  // TODO(backend): expand API to accept all ApprovalRequestType values and optional correction fields
  payload: Record<string, unknown> & { category: string; startDate: string; endDate: string; title: string; detail: string }
) {
  if (isDemoToken(token)) {
    const response: RequestActionResponse = {
      request: { id: `demo-req-${Date.now()}`, title: payload.title, detail: payload.detail, category: payload.category as ApprovalRequestType, startDate: payload.startDate, endDate: payload.endDate, status: "Menunggu" }
    };
    return Promise.resolve(response);
  }
  return requestJson<RequestActionResponse>(
    "/requests",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export async function approveRequest(token: string, id: string, status: "Disetujui" | "Ditolak", adminNote?: string) {
  if (isDemoToken(token)) {
    const role = getDemoRoleFromToken(token)!;

    // Mutate demoFikriRequests if the id belongs to Fikri's requests
    const mutated = approveDemoRequest(id, role, status, adminNote);
    if (mutated) {
      return Promise.resolve<RequestActionResponse>({ request: mutated });
    }

    // Fallback for requests not in Fikri's list (e.g., static admin requests)
    const isRejection = status === "Ditolak";
    const isManagerRole = role === "manager";
    const workflowStatus = isRejection ? "rejected" : isManagerRole ? "pending_hr" : "approved";
    const statusLabel = isRejection ? "Ditolak" : isManagerRole ? "Menunggu HR" : "Disetujui";
    const resolvedStatus: "Menunggu" | "Disetujui" | "Ditolak" = isRejection ? "Ditolak" : isManagerRole ? "Menunggu" : "Disetujui";
    const response: RequestActionResponse = {
      request: { id, title: "Demo request", status: resolvedStatus, detail: "Demo approval.", adminNote, workflowStatus, statusLabel }
    };
    return Promise.resolve(response);
  }
  return requestJson<RequestActionResponse>(
    `/admin/requests/${id}`,
    { method: "PATCH", body: JSON.stringify({ status, adminNote }) },
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

export async function fetchNotifications(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoNotifications(token));
  return requestJson<import("@taptu/shared").NotificationItem[]>("/notifications", {}, token);
}

export async function markNotificationRead(token: string, id: string) {
  return requestJson<import("@taptu/shared").NotificationItem>(`/notifications/${id}/read`, { method: "PATCH" }, token);
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

export async function fetchScannerState(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoScannerState());
  return requestJson<ScannerTokenPayload & { recentScans: Array<{ id: string; employeeName: string; status: "success" | "invalid" | "expired"; time: string; detail: string }> }>("/scanner/state", {}, token);
}

export async function fetchAdminOverview(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoAdminOverview());
  return requestJson<AdminOverview>("/admin/overview", {}, token);
}

export async function fetchManagerOverview(token: string) {
  if (isDemoToken(token)) {
    return Promise.resolve(getDemoManagerOverview());
  }
  return requestJson<AdminOverview>("/admin/overview", {}, token);
}

export async function fetchEmployeeSummary(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoEmployeeSummary());
  return requestJson<EmployeeSummary>("/employee/summary", {}, token);
}

export async function fetchExceptionQueue(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoExceptionQueue());
  return requestJson<AttendanceExceptionItem[]>("/admin/exceptions", {}, token);
}

export async function fetchManagerExceptionQueue(token: string) {
  if (isDemoToken(token)) return Promise.resolve([]);
  return requestJson<AttendanceExceptionItem[]>("/admin/exceptions", {}, token);
}

export async function reviewException(token: string, id: string, payload: ValidationDecisionPayload) {
  if (isDemoToken(token)) {
    const found = getDemoExceptionQueue().find((item) => item.id === id);
    return Promise.resolve({
      exception: found ? { ...found, status: payload.status, adminNote: payload.adminNote, reviewedBy: "Demo Admin", reviewedAt: new Date().toISOString() } : null
    });
  }
  return requestJson<{ exception: AttendanceExceptionItem }>(
    `/admin/exceptions/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token
  );
}

export async function fetchAuditLogs(token: string) {
  if (isDemoToken(token)) return Promise.resolve(getDemoAuditLogs());
  return requestJson<AuditLogItem[]>("/admin/audit-logs", {}, token);
}

export async function fetchEmployeeList(token: string, filters?: { search?: string; departmentId?: string; status?: string }): Promise<EmployeeListItem[]> {
  if (isDemoToken(token)) return Promise.resolve(getDemoEmployeeList());
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.departmentId) params.set("departmentId", filters.departmentId);
  if (filters?.status) params.set("status", filters.status);
  const query = params.toString();
  return requestJson<EmployeeListItem[]>(`/admin/employees${query ? `?${query}` : ""}`, {}, token);
}

export async function fetchDepartments(token: string): Promise<DepartmentItem[]> {
  if (isDemoToken(token)) return Promise.resolve(getDemoDepartments());
  return requestJson<DepartmentItem[]>("/departments", {}, token);
}

export async function createDepartment(
  token: string,
  payload: { name: string; managerId?: string | null; description?: string | null; isActive?: boolean }
): Promise<DepartmentItem> {
  if (isDemoToken(token)) {
    return Promise.resolve(createDemoDepartment(payload));
  }
  return requestJson<DepartmentItem>("/departments", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateDepartment(
  token: string,
  id: string,
  patch: { name?: string; managerId?: string | null; description?: string | null; isActive?: boolean }
): Promise<DepartmentItem> {
  if (isDemoToken(token)) {
    return Promise.resolve(updateDemoDepartment(id, patch));
  }
  return requestJson<DepartmentItem>(`/departments/${id}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
}

export async function reassignEmployeeDepartment(
  token: string,
  id: string,
  patch: { departmentId?: string | null; managerId?: string | null }
): Promise<EmployeeListItem> {
  if (isDemoToken(token)) {
    return Promise.resolve(reassignDemoEmployeeDepartment(id, patch));
  }
  return requestJson<EmployeeListItem>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
}

export async function fetchManagerEmployeeList(token: string): Promise<EmployeeListItem[]> {
  if (isDemoToken(token)) {
    // Return only team members whose managerId matches the demo manager
    const managerId = "usr-manager-01";
    return Promise.resolve(getDemoEmployeeList().filter((e) => e.managerId === managerId));
  }
  return requestJson<EmployeeListItem[]>("/admin/employees", {}, token);
}

export async function fetchManagerRequests(token: string): Promise<LeaveRequestItem[]> {
  if (isDemoToken(token)) return Promise.resolve(getDemoManagerRequests());
  return requestJson<LeaveRequestItem[]>("/admin/requests", {}, token);
}

export async function fetchWorkLocations(token: string): Promise<WorkLocationItem[]> {
  if (isDemoToken(token)) return Promise.resolve(getDemoWorkLocations());
  return requestJson<WorkLocationItem[]>("/admin/work-locations", {}, token);
}

export async function createWorkLocation(token: string, payload: Omit<WorkLocationItem, "id" | "status" | "createdAt">): Promise<WorkLocationItem> {
  if (isDemoToken(token)) {
    return Promise.resolve(createDemoWorkLocation(payload));
  }
  return requestJson<WorkLocationItem>("/admin/work-locations", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateWorkLocation(token: string, id: string, patch: Partial<WorkLocationItem>): Promise<WorkLocationItem> {
  if (isDemoToken(token)) {
    return Promise.resolve(updateDemoWorkLocation(id, patch));
  }
  return requestJson<WorkLocationItem>(`/admin/work-locations/${id}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
}

export async function fetchShifts(token: string): Promise<ShiftRecord[]> {
  if (isDemoToken(token)) return Promise.resolve(getDemoShifts());
  return requestJson<ShiftRecord[]>("/admin/shifts", {}, token);
}

export async function createShift(token: string, payload: Omit<ShiftRecord, "id" | "status" | "createdAt" | "updatedAt">): Promise<ShiftRecord> {
  if (isDemoToken(token)) {
    return Promise.resolve(createDemoShift(payload));
  }
  return requestJson<ShiftRecord>("/admin/shifts", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateShift(token: string, id: string, patch: Partial<ShiftRecord>): Promise<ShiftRecord> {
  if (isDemoToken(token)) {
    return Promise.resolve(updateDemoShift(id, patch));
  }
  return requestJson<ShiftRecord>(`/admin/shifts/${id}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
}

export async function fetchReportRows(token: string, filters?: { dateFrom?: string; dateTo?: string; employeeId?: string; departmentId?: string; status?: string }): Promise<AttendanceReportRow[]> {
  if (isDemoToken(token)) {
    const employees = new Map(getDemoEmployeeList().map((employee) => [employee.id, employee]));
    const rows = getDemoReportRows().filter((row) => {
      if (filters?.dateFrom && row.date < filters.dateFrom) return false;
      if (filters?.dateTo && row.date > filters.dateTo) return false;
      if (filters?.status && row.status !== filters.status && row.validationStatus !== filters.status) return false;
      if (filters?.employeeId && row.employeeId !== filters.employeeId) return false;
      if (filters?.departmentId && employees.get(row.employeeId)?.departmentId !== filters.departmentId) return false;
      return true;
    });
    return Promise.resolve(rows);
  }
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.employeeId) params.set("employeeId", filters.employeeId);
  if (filters?.departmentId) params.set("departmentId", filters.departmentId);
  if (filters?.status) params.set("status", filters.status);
  const query = params.toString();
  return requestJson<AttendanceReportRow[]>(`/admin/reports${query ? `?${query}` : ""}`, {}, token);
}

export function exportReportCsv(rows: AttendanceReportRow[], fileName?: string): void {
  const headers = [
    "Employee Name", "Employee ID", "Date", "Shift", "Work Location",
    "Check-in Time", "Check-out Time", "Status", "Validation Status",
    "Validation Reasons", "Latitude", "Longitude", "Is Late", "Has Exception",
    "Selfie Proof", "Device Validated", "Approval Status", "Admin Note"
  ];

  const escape = (value: string | number | boolean | undefined) => {
    if (value === undefined || value === null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const dataRows = rows.map((row) => [
    escape(row.employeeName), escape(row.employeeId), escape(row.date),
    escape(row.shiftName), escape(row.workLocationName),
    escape(row.checkInTime ? row.checkInTime.slice(11, 16) : ""),
    escape(row.checkOutTime ? row.checkOutTime.slice(11, 16) : ""),
    escape(row.status), escape(row.validationStatus),
    escape(row.validationReasons.join(" | ")),
    escape(row.locationLat), escape(row.locationLng),
    escape(row.isLate), escape(row.hasException),
    escape(row.selfieProof), escape(row.deviceValidated),
    escape(row.approvalStatus ?? ""), escape(row.adminNote ?? "")
  ].join(","));

  const csv = [headers.join(","), ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? `taptu-attendance-report-${new Date().toISOString().slice(0, 7)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    console.error(`[taptu] API ${init.method ?? "GET"} ${path} → ${response.status}`, data);
    throw new Error(data.message ?? "Permintaan gagal.");
  }

  try {
    return await response.json() as Promise<T>;
  } catch {
    // 200 OK with a non-JSON body (e.g. Vercel SPA rewrite forwarding index.html to /api routes)
    throw new Error("Permintaan gagal.");
  }
}
