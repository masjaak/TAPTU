import type { SupabaseAdmin } from "./supabase";
import type { AttendanceRecord, ExceptionRecord, RequestRecord, ScannerRecord, DemoStore, AuditLogRecord, EmployeeListFilters } from "./domain";
import type { ApprovalStepItem, ApprovalWorkflowStatus, AttendanceExceptionItem, AttendanceReportFilters, AttendanceReportRow, AttendanceTimelineItem, AuthUser, DepartmentItem, EmployeeListItem, EmployeeSummary, LeaveRequestItem, UserRole } from "@taptu/shared";
import { applyEmployeeListFilters, createApprovalStepPlan, createInitialStore, getApprovalStatusLabel } from "./domain";

/**
 * Full relational Supabase adapter.
 * Operates on normalized tables (profiles, attendance_records, approval_requests, scanner_tokens)
 * instead of a single JSON blob.
 */

const DEFAULT_LOCATION = {
  id: "loc-hq",
  name: "Kantor Pusat",
  latitude: -6.2088,
  longitude: 106.8456,
  radiusMeters: 150
};

function isUuid(value: string | undefined | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function toNullableUuid(value: string | undefined | null) {
  return isUuid(value) ? value : null;
}

type ProfileStructureRelation = { name?: string | null; full_name?: string | null } | null;

type ProfileStructureRow = {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
  department_id?: string | null;
  manager_id?: string | null;
  position?: string | null;
  employee_code?: string | null;
  departments?: ProfileStructureRelation | ProfileStructureRelation[];
  manager?: ProfileStructureRelation | ProfileStructureRelation[];
};

type DepartmentStructureRow = {
  id?: string;
  name?: string | null;
  manager_id?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  manager?: ProfileStructureRelation | ProfileStructureRelation[];
};

function readProfileStructure(row: ProfileStructureRow | null | undefined) {
  const department = firstRelation(row?.departments);
  const manager = firstRelation(row?.manager);

  return {
    departmentId: row?.department_id ?? null,
    departmentName: department?.name ?? null,
    managerId: row?.manager_id ?? null,
    managerName: manager?.full_name ?? null,
    position: row?.position ?? null,
    employeeCode: row?.employee_code ?? null
  };
}

const EMPLOYEE_LIST_SELECT = "id, full_name, email, role, department_id, manager_id, position, employee_code, departments(name), manager:profiles!profiles_manager_id_fkey(full_name)";
const DEPARTMENT_SELECT = "id, name, manager_id, description, is_active, manager:profiles!departments_manager_id_fkey(full_name)";
const TEAM_PROFILE_SELECT = "id, full_name";

async function getManagerTeamProfiles<T extends ProfileStructureRow>(
  sb: SupabaseAdmin,
  organizationId: string,
  managerId: string,
  selectColumns: string
): Promise<T[]> {
  if (!organizationId || !managerId) return [];

  const { data, error } = await sb
    .from("profiles")
    .select(selectColumns)
    .eq("organization_id", organizationId)
    .eq("manager_id", managerId)
    .in("role", ["employee"]);

  if (error) {
    throw new Error(`Failed to fetch manager team: ${error.message}`);
  }

  return (data ?? []) as unknown as T[];
}

function emptyOverview() {
  return {
    totalEmployees: 0,
    checkedInToday: 0,
    onTimeToday: 0,
    lateToday: 0,
    pendingRequests: 0,
    absentToday: 0,
    exceptionCount: 0,
    recentActivity: []
  };
}

// ─── Auth ───────────────────────────────────────────────────

export async function supabaseSignUp(
  sb: SupabaseAdmin,
  payload: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
    role: UserRole;
  }
): Promise<AuthUser> {
  // 1. Create or get organization
  let orgId: string;
  const { data: existingOrg } = await sb
    .from("organizations")
    .select("id")
    .eq("name", payload.organizationName)
    .maybeSingle();

  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    const { data: newOrg, error: orgError } = await sb
      .from("organizations")
      .insert({ name: payload.organizationName })
      .select("id")
      .single();

    if (orgError || !newOrg) {
      throw new Error(`Failed to create organization: ${orgError?.message}`);
    }
    orgId = newOrg.id;
  }

  // 2. Create auth user (trigger will create profile)
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName,
      role: payload.role,
      organization_id: orgId
    }
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create user: ${authError?.message}`);
  }

  return {
    id: authData.user.id,
    fullName: payload.fullName,
    email: payload.email,
    role: payload.role,
    organizationName: payload.organizationName
  };
}

export async function supabaseSignIn(
  sb: SupabaseAdmin,
  email: string,
  password: string
): Promise<{ user: AuthUser; accessToken: string }> {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    throw new Error(error?.message ?? "Invalid credentials");
  }

  // Fetch profile for role/org info
  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, role, organization_id, department_id, manager_id, position, employee_code, organizations(name), departments(name), manager:profiles!profiles_manager_id_fkey(full_name)")
    .eq("id", data.user.id)
    .single();

  const orgName =
    (profile as Record<string, unknown>)?.organizations &&
    typeof (profile as Record<string, unknown>).organizations === "object"
      ? ((profile as Record<string, unknown>).organizations as Record<string, string>)?.name ?? ""
      : "";

  return {
    user: {
      id: data.user.id,
      fullName: profile?.full_name ?? "",
      email: data.user.email ?? email,
      role: (profile?.role as UserRole) ?? "employee",
      organizationName: orgName,
      ...readProfileStructure(profile)
    },
    accessToken: data.session.access_token
  };
}

export async function supabaseGetProfile(
  sb: SupabaseAdmin,
  userId: string
): Promise<AuthUser | null> {
  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name, email, role, organization_id, department_id, manager_id, position, employee_code, organizations(name), departments(name), manager:profiles!profiles_manager_id_fkey(full_name)")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const orgName =
    (profile as Record<string, unknown>)?.organizations &&
    typeof (profile as Record<string, unknown>).organizations === "object"
      ? ((profile as Record<string, unknown>).organizations as Record<string, string>)?.name ?? ""
      : "";

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role as UserRole,
    organizationName: orgName,
    ...readProfileStructure(profile)
  };
}

// ─── Attendance ─────────────────────────────────────────────

export async function supabaseGetTodayAttendance(
  sb: SupabaseAdmin,
  userId: string
): Promise<AttendanceRecord> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("attendance_records")
    .select("*")
    .eq("employee_id", userId)
    .eq("attendance_date", today)
    .maybeSingle();

  if (!data) {
    return {
      id: `att-${userId}-${today}`,
      userId,
      shiftId: "shift-pagi",
      shiftName: "Shift Pagi",
      shiftStartTime: "08:00",
      shiftEndTime: "17:00",
      locationId: DEFAULT_LOCATION.id,
      locationName: DEFAULT_LOCATION.name,
      state: "idle",
      status: "Belum check-in",
      validationStatus: "verified",
      validationReasons: [],
      createdAt: `${today}T00:00:00.000Z`,
      updatedAt: `${today}T00:00:00.000Z`
    };
  }

  return {
    id: data.id ?? `att-${userId}-${today}`,
    userId: data.employee_id,
    shiftId: "shift-pagi",
    shiftName: "Shift Pagi",
    shiftStartTime: "08:00",
    shiftEndTime: "17:00",
    locationId: data.location_id ?? DEFAULT_LOCATION.id,
    locationName: DEFAULT_LOCATION.name,
    state: data.state,
    status: data.status ?? (data.state === "checked_out" ? "Selesai" : data.state === "idle" ? "Belum check-in" : "Tepat waktu"),
    checkInAt: data.check_in_time,
    checkInMethod: data.check_in_method,
    checkOutAt: data.check_out_time,
    checkOutMethod: data.check_out_method,
    locationLat: data.location_lat ?? undefined,
    locationLng: data.location_lng ?? undefined,
    validationStatus: data.validation_status ?? "verified",
    validationReasons: data.validation_reasons ?? [],
    selfieUrl: data.selfie_url ?? undefined,
    deviceId: data.device_id ?? undefined,
    scannerTokenId: data.scanner_token_id ?? undefined,
    createdAt: data.created_at ?? data.check_in_time ?? `${today}T00:00:00.000Z`,
    updatedAt: data.updated_at ?? data.check_out_time ?? data.check_in_time ?? `${today}T00:00:00.000Z`
  };
}

function toAttendanceRecordFromRow(row: Record<string, any>, userId: string): AttendanceRecord {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: row.id,
    userId: row.employee_id ?? userId,
    shiftId: row.shift_id ?? "shift-pagi",
    shiftName: "Shift Pagi",
    shiftStartTime: "08:00",
    shiftEndTime: "17:00",
    locationId: row.location_id ?? DEFAULT_LOCATION.id,
    locationName: DEFAULT_LOCATION.name,
    state: row.state,
    status: row.status ?? (row.state === "checked_out" ? "Selesai" : row.state === "idle" ? "Belum check-in" : "Tepat waktu"),
    checkInAt: row.check_in_time ?? undefined,
    checkInMethod: row.check_in_method ?? undefined,
    checkOutAt: row.check_out_time ?? undefined,
    checkOutMethod: row.check_out_method ?? undefined,
    locationLat: row.location_lat ?? undefined,
    locationLng: row.location_lng ?? undefined,
    validationStatus: row.validation_status ?? "verified",
    validationReasons: row.validation_reasons ?? [],
    selfieUrl: row.selfie_url ?? undefined,
    deviceId: row.device_id ?? undefined,
    scannerTokenId: row.scanner_token_id ?? undefined,
    createdAt: row.created_at ?? `${today}T00:00:00.000Z`,
    updatedAt: row.updated_at ?? `${today}T00:00:00.000Z`
  };
}

function toAttendanceRecordPayload(userId: string, record: AttendanceRecord, attendanceDate = new Date().toISOString().slice(0, 10)) {
  return {
    employee_id: userId,
    attendance_date: attendanceDate,
    shift_id: record.shiftId,
    status: record.status,
    state: record.state,
    location_id: toNullableUuid(record.locationId),
    check_in_time: record.checkInAt ?? null,
    check_in_method: record.checkInMethod ?? null,
    check_out_time: record.checkOutAt ?? null,
    check_out_method: record.checkOutMethod ?? null,
    location_lat: record.locationLat ?? null,
    location_lng: record.locationLng ?? null,
    validation_status: record.validationStatus,
    validation_reasons: record.validationReasons,
    selfie_url: record.selfieUrl || null,
    device_id: record.deviceId ?? null,
    scanner_token_id: toNullableUuid(record.scannerTokenId),
    updated_at: new Date().toISOString()
  };
}

export async function supabaseCreateCheckInRecord(
  sb: SupabaseAdmin,
  userId: string,
  record: AttendanceRecord
): Promise<AttendanceRecord> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("attendance_records")
    .insert(toAttendanceRecordPayload(userId, record, today))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create check-in attendance: ${error?.message ?? "Unknown error"}`);
  }

  return toAttendanceRecordFromRow(data, userId);
}

export async function supabaseUpdateCheckOutRecord(
  sb: SupabaseAdmin,
  recordId: string,
  record: AttendanceRecord
): Promise<AttendanceRecord> {
  const { data, error } = await sb
    .from("attendance_records")
    .update(toAttendanceRecordPayload(record.userId, record))
    .eq("id", recordId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update check-out attendance: ${error?.message ?? "Unknown error"}`);
  }

  return toAttendanceRecordFromRow(data, record.userId);
}

export async function supabaseUpsertAttendance(
  sb: SupabaseAdmin,
  userId: string,
  record: AttendanceRecord
): Promise<AttendanceRecord> {
  if (record.state === "checked_out" && record.id) {
    return supabaseUpdateCheckOutRecord(sb, record.id, record);
  }

  return supabaseCreateCheckInRecord(sb, userId, record);
}

export async function supabaseGetAttendanceHistory(
  sb: SupabaseAdmin,
  userId: string,
  filter: "all" | "present" | "issue" = "all"
) {
  const query = sb
    .from("attendance_records")
    .select("*, work_locations(name)")
    .eq("employee_id", userId)
    .order("attendance_date", { ascending: false })
    .limit(30);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch attendance history: ${error.message}`);
  }

  return filterAttendanceRows(data ?? [], filter).map(toAttendanceTimelineItem);
}

function filterAttendanceRows<T extends { state?: string | null; validation_status?: string | null; status?: string | null }>(
  rows: T[],
  filter: "all" | "present" | "issue"
) {
  if (filter === "present") {
    return rows.filter((row) => row.state === "checked_in" || row.state === "checked_out");
  }

  if (filter === "issue") {
    return rows.filter(
      (row) =>
        row.state === "idle" ||
        row.status === "Belum check-in" ||
        (row.validation_status !== null && row.validation_status !== undefined && row.validation_status !== "verified")
    );
  }

  return rows;
}

function formatDuration(checkInTime?: string | null, checkOutTime?: string | null) {
  if (!checkInTime || !checkOutTime) return "Belum selesai";
  const start = new Date(checkInTime);
  const end = new Date(checkOutTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
    return "Belum selesai";
  }

  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}j ${String(minutes).padStart(2, "0")}m`;
}

function toAttendanceTimelineItem(row: Record<string, any>): AttendanceTimelineItem {
  const location = firstRelation(row.work_locations);

  return {
    id: row.id,
    day: formatDateLabel(row.attendance_date),
    status: row.status === "Terlambat" || row.status === "Belum check-in" ? row.status : mapAttendanceStatus(row.state, row.check_in_time),
    time: row.check_in_time
      ? new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "--.--",
    method: (row.check_in_method ?? "Manual") as "QR" | "GPS" | "Selfie" | "Manual",
    checkInTime: row.check_in_time ?? undefined,
    checkOutTime: row.check_out_time ?? undefined,
    duration: formatDuration(row.check_in_time, row.check_out_time),
    locationName: location?.name ?? DEFAULT_LOCATION.name
  };
}

export async function supabaseGetAllAttendanceHistory(
  sb: SupabaseAdmin,
  organizationId: string,
  filter: "all" | "present" | "issue" = "all"
) {
  // Get all users in the org
  const { data: orgUsers } = await sb
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId);

  const userIds = (orgUsers ?? []).map((u) => u.id);
  if (userIds.length === 0) return [];

  const query = sb
    .from("attendance_records")
    .select("*, profiles(full_name), work_locations(name)")
    .in("employee_id", userIds)
    .order("attendance_date", { ascending: false })
    .limit(100);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch all attendance: ${error.message}`);

  return filterAttendanceRows(data ?? [], filter).map(toAttendanceTimelineItem);
}

type SupabaseAttendanceReportRow = {
  id: string;
  employee_id: string;
  attendance_date: string;
  shift_id: string | null;
  status: AttendanceReportRow["status"] | null;
  state: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  validation_status: AttendanceReportRow["validationStatus"] | null;
  validation_reasons: string[] | null;
  location_lat: number | null;
  location_lng: number | null;
  selfie_url: string | null;
  device_id: string | null;
  profiles?: { full_name?: string | null; department_id?: string | null; departments?: ProfileStructureRelation | ProfileStructureRelation[] } | { full_name?: string | null; department_id?: string | null; departments?: ProfileStructureRelation | ProfileStructureRelation[] }[] | null;
  work_locations?: { name?: string | null } | { name?: string | null }[] | null;
  attendance_exceptions?: Array<{ status?: string | null }> | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function supabaseBuildAttendanceReportRows(rows: SupabaseAttendanceReportRow[]): AttendanceReportRow[] {
  return rows.map((row) => {
    const profile = firstRelation(row.profiles);
    const workLocation = firstRelation(row.work_locations);
    const status = row.status ?? (row.state === "checked_out" ? "Selesai" : mapAttendanceStatus(row.state ?? "idle", row.check_in_time));
    const pendingException = (row.attendance_exceptions ?? []).some(
      (item) => item.status === "Need Review" || item.status === "Request Correction"
    );

    return {
      id: row.id,
      employeeName: profile?.full_name ?? "Employee",
      employeeId: row.employee_id,
      departmentId: profile?.department_id ?? null,
      departmentName: firstRelation(profile?.departments)?.name ?? null,
      date: row.attendance_date,
      shiftName: row.shift_id ?? "shift-pagi",
      workLocationName: workLocation?.name ?? DEFAULT_LOCATION.name,
      checkInTime: row.check_in_time ?? undefined,
      checkOutTime: row.check_out_time ?? undefined,
      status,
      validationStatus: row.validation_status ?? "verified",
      validationReasons: row.validation_reasons ?? [],
      locationLat: row.location_lat ?? undefined,
      locationLng: row.location_lng ?? undefined,
      isLate: status === "Terlambat",
      hasException: pendingException || (row.validation_status !== null && row.validation_status !== "verified"),
      selfieProof: Boolean(row.selfie_url),
      deviceValidated: Boolean(row.device_id),
      approvalStatus: undefined,
      adminNote: undefined
    };
  });
}

export async function supabaseGetAttendanceReportRows(
  sb: SupabaseAdmin,
  organizationId: string,
  filters: AttendanceReportFilters = {}
): Promise<AttendanceReportRow[]> {
  let usersQuery = sb
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId);

  if (filters.departmentId) usersQuery = usersQuery.eq("department_id", filters.departmentId);

  const { data: orgUsers, error: usersError } = await usersQuery;

  if (usersError) {
    throw new Error(`Failed to fetch report employees: ${usersError.message}`);
  }

  const userIds = (orgUsers ?? []).map((user) => user.id);
  if (userIds.length === 0) return [];

  let query = sb
    .from("attendance_records")
    .select("*, profiles(full_name, department_id, departments(name)), work_locations(name), attendance_exceptions(status)")
    .in("employee_id", userIds)
    .order("attendance_date", { ascending: false })
    .limit(500);

  if (filters.dateFrom) query = query.gte("attendance_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("attendance_date", filters.dateTo);
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.status === "needs_review") {
    query = query.eq("validation_status", "needs_review");
  } else if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch attendance report: ${error.message}`);
  }

  return supabaseBuildAttendanceReportRows((data ?? []) as SupabaseAttendanceReportRow[]);
}

// ─── Requests ───────────────────────────────────────────────

type ApprovalRequestRow = Record<string, any>;
type ApprovalStepRow = Record<string, any>;

function toApprovalStepItem(row: ApprovalStepRow): ApprovalStepItem {
  return {
    id: row.id,
    requestId: row.request_id,
    stepOrder: row.step_order,
    approverRole: row.approver_role,
    approverId: row.approver_id ?? null,
    status: row.status,
    note: row.note ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getRequestWorkflowStatus(row: ApprovalRequestRow, steps: ApprovalStepItem[] = []): ApprovalWorkflowStatus {
  if (row.final_status === "cancelled") return "cancelled";
  if (row.final_status === "rejected" || row.status === "Ditolak" || steps.some((step) => step.status === "rejected")) return "rejected";
  if (row.final_status === "approved" || row.status === "Disetujui") return "approved";

  const managerStep = steps.find((step) => step.approverRole === "manager");
  const hrStep = steps.find((step) => step.approverRole === "hr");
  const currentStep = steps.find((step) => step.stepOrder === (row.current_step ?? 1));

  if (currentStep?.approverRole === "manager" && currentStep.status === "pending") return "pending_manager";
  if (currentStep?.approverRole === "hr" && currentStep.status === "pending") return "pending_hr";
  if (managerStep?.status === "approved" && hrStep?.status === "pending") return "pending_hr";
  if (managerStep?.status === "pending") return "pending_manager";
  if (managerStep?.status === "approved") return "approved_by_manager";
  if (hrStep?.status === "pending") return "pending_hr";

  return "pending_hr";
}

function toLeaveRequestItem(row: ApprovalRequestRow, requester?: string, steps: ApprovalStepItem[] = []): LeaveRequestItem {
  const workflowStatus = getRequestWorkflowStatus(row, steps);

  return {
    id: row.id,
    requester,
    category: row.request_type,
    startDate: row.start_date,
    endDate: row.end_date,
    title: row.title,
    detail: row.reason,
    status: row.status as "Menunggu" | "Disetujui" | "Ditolak",
    adminNote: row.admin_note ?? undefined,
    createdAt: row.created_at,
    reviewedBy: undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    currentStep: row.current_step ?? null,
    finalStatus: row.final_status ?? null,
    workflowStatus,
    statusLabel: getApprovalStatusLabel(workflowStatus),
    completedAt: row.completed_at ?? null,
    approvalSteps: steps
  };
}

async function getApprovalStepsByRequestIds(sb: SupabaseAdmin, requestIds: string[]) {
  if (requestIds.length === 0) return new Map<string, ApprovalStepItem[]>();

  const { data, error } = await sb
    .from("approval_steps")
    .select("*")
    .in("request_id", requestIds)
    .order("step_order", { ascending: true });

  if (error) throw new Error(`Failed to fetch approval steps: ${error.message}`);

  const byRequestId = new Map<string, ApprovalStepItem[]>();
  for (const row of data ?? []) {
    const step = toApprovalStepItem(row);
    byRequestId.set(step.requestId, [...(byRequestId.get(step.requestId) ?? []), step]);
  }

  return byRequestId;
}

async function getApprovalStepsForRequest(sb: SupabaseAdmin, requestId: string) {
  const { data, error } = await sb
    .from("approval_steps")
    .select("*")
    .eq("request_id", requestId)
    .order("step_order", { ascending: true });

  if (error) throw new Error(`Failed to fetch approval steps: ${error.message}`);

  return (data ?? []).map(toApprovalStepItem);
}

export async function getEmployeeRequests(
  sb: SupabaseAdmin,
  userId: string
) {
  const { data, error } = await sb
    .from("approval_requests")
    .select("*")
    .eq("employee_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);

  const rows = data ?? [];
  const stepsByRequestId = await getApprovalStepsByRequestIds(sb, rows.map((row) => row.id));

  return rows.map((row) => toLeaveRequestItem(row, undefined, stepsByRequestId.get(row.id) ?? []));
}

export async function getAdminApprovalRequests(
  sb: SupabaseAdmin,
  organizationId: string
) {
  const { data: orgUsers } = await sb
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", organizationId);

  const userIds = (orgUsers ?? []).map((u) => u.id);
  const userMap = new Map((orgUsers ?? []).map((u) => [u.id, u.full_name]));
  if (userIds.length === 0) return [];

  const { data, error } = await sb
    .from("approval_requests")
    .select("*")
    .in("employee_id", userIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);

  const rows = data ?? [];
  const stepsByRequestId = await getApprovalStepsByRequestIds(sb, rows.map((row) => row.id));

  return rows.map((row) => toLeaveRequestItem(row, userMap.get(row.employee_id) ?? undefined, stepsByRequestId.get(row.id) ?? []));
}

export async function getManagerApprovalRequests(
  sb: SupabaseAdmin,
  managerId: string
) {
  const { data: steps, error: stepsError } = await sb
    .from("approval_steps")
    .select("request_id")
    .eq("approver_role", "manager")
    .eq("approver_id", managerId);

  if (stepsError) throw new Error(`Failed to fetch manager approval steps: ${stepsError.message}`);

  const requestIds = [...new Set((steps ?? []).map((step) => step.request_id))];
  if (requestIds.length === 0) return [];

  const { data, error } = await sb
    .from("approval_requests")
    .select("*, profiles(full_name)")
    .in("id", requestIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch manager requests: ${error.message}`);

  const rows = data ?? [];
  const stepsByRequestId = await getApprovalStepsByRequestIds(sb, rows.map((row) => row.id));

  return rows.map((row) => {
    const profileData = row.profiles as Record<string, string> | null;
    return toLeaveRequestItem(row, profileData?.full_name ?? undefined, stepsByRequestId.get(row.id) ?? []);
  });
}

export async function supabaseGetRequests(
  sb: SupabaseAdmin,
  userId: string,
  isAdmin: boolean,
  organizationId?: string
) {
  if (isAdmin && organizationId) {
    return getAdminApprovalRequests(sb, organizationId);
  }

  return getEmployeeRequests(sb, userId);
}

export async function supabaseGetManagerRequests(
  sb: SupabaseAdmin,
  organizationId: string,
  managerId: string
) {
  const teamProfiles = await getManagerTeamProfiles<{ id: string; full_name: string }>(
    sb,
    organizationId,
    managerId,
    TEAM_PROFILE_SELECT
  );
  const employeeIds = teamProfiles.map((profile) => profile.id);
  if (employeeIds.length === 0) return [];

  const userMap = new Map(teamProfiles.map((profile) => [profile.id, profile.full_name]));
  const { data, error } = await sb
    .from("approval_requests")
    .select("*")
    .in("employee_id", employeeIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch manager requests: ${error.message}`);

  const rows = data ?? [];
  const stepsByRequestId = await getApprovalStepsByRequestIds(sb, rows.map((row) => row.id));

  return rows.map((row) => toLeaveRequestItem(row, userMap.get(row.employee_id) ?? undefined, stepsByRequestId.get(row.id) ?? []));
}

export async function createEmployeeRequest(
  sb: SupabaseAdmin,
  userId: string,
  payload: {
    category: RequestRecord["category"];
    startDate: string;
    endDate: string;
    title: string;
    detail: string;
  }
) {
  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("manager_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to fetch employee manager: ${profileError.message}`);
  }

  const { data, error } = await sb
    .from("approval_requests")
    .insert({
      employee_id: userId,
      request_type: payload.category,
      start_date: payload.startDate,
      end_date: payload.endDate,
      title: payload.title,
      reason: payload.detail,
      status: "Menunggu",
      current_step: 1,
      final_status: "pending"
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create request: ${error?.message}`);
  }

  const steps = createApprovalStepPlan(data.id, profile?.manager_id ?? null).map((step) => ({
    request_id: step.requestId,
    step_order: step.stepOrder,
    approver_role: step.approverRole,
    approver_id: step.approverId ?? null,
    status: step.status
  }));
  const { error: stepsError } = await sb.from("approval_steps").insert(steps);

  if (stepsError) {
    throw new Error(`Failed to create request approval steps: ${stepsError.message}`);
  }

  return toLeaveRequestItem(data, undefined, steps.map((step) => toApprovalStepItem({
    id: undefined,
    request_id: step.request_id,
    step_order: step.step_order,
    approver_role: step.approver_role,
    approver_id: step.approver_id,
    status: step.status
  })));
}

export async function supabaseCreateRequest(
  sb: SupabaseAdmin,
  userId: string,
  payload: {
    category: RequestRecord["category"];
    startDate: string;
    endDate: string;
    title: string;
    detail: string;
  }
) {
  return createEmployeeRequest(sb, userId, payload);
}

export async function supabaseGetRequestById(
  sb: SupabaseAdmin,
  requestId: string,
  userId: string,
  isAdmin: boolean,
  actorRole?: UserRole,
  organizationId?: string
) {
  const { data, error } = await sb
    .from("approval_requests")
    .select("*, profiles(full_name)")
    .eq("id", requestId)
    .single();

  if (error || !data) return null;

  // Employees can only see their own
  if (!isAdmin && data.employee_id !== userId) return null;
  if (actorRole === "manager") {
    if (!organizationId) return null;
    const teamProfiles = await getManagerTeamProfiles<{ id: string }>(
      sb,
      organizationId,
      userId,
      "id"
    );
    if (!teamProfiles.some((profile) => profile.id === data.employee_id)) return null;
  }

  const profileData = data.profiles as Record<string, string> | null;
  const steps = await getApprovalStepsForRequest(sb, requestId);

  return toLeaveRequestItem(data, profileData?.full_name ?? undefined, steps);
}

async function getApprovalRequestWithSteps(sb: SupabaseAdmin, requestId: string) {
  const { data, error } = await sb
    .from("approval_requests")
    .select("*, profiles(full_name)")
    .eq("id", requestId)
    .single();

  if (error || !data) return null;

  return {
    request: data,
    steps: await getApprovalStepsForRequest(sb, requestId)
  };
}

function canReviewStep(step: ApprovalStepItem, actor: { id: string; role: UserRole }) {
  if (step.approverRole === "manager") {
    return actor.role === "manager" && step.approverId === actor.id;
  }

  if (step.approverRole === "hr") {
    return actor.role === "admin" || actor.role === "superadmin";
  }

  return false;
}

async function markApprovalStep(
  sb: SupabaseAdmin,
  stepId: string,
  status: "approved" | "rejected",
  note: string | undefined,
  reviewedAt: string
) {
  const { error } = await sb
    .from("approval_steps")
    .update({ status, note: note ?? null, reviewed_at: reviewedAt, updated_at: reviewedAt })
    .eq("id", stepId)
    .select();

  if (error) {
    throw new Error(`Failed to update approval step: ${error.message}`);
  }
}

async function updateApprovalRequestAfterStep(
  sb: SupabaseAdmin,
  requestId: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await sb
    .from("approval_requests")
    .update(payload)
    .eq("id", requestId)
    .select("*, profiles(full_name)")
    .single();

  if (error || !data) return null;

  const profileData = data.profiles as Record<string, string> | null;
  const steps = await getApprovalStepsForRequest(sb, requestId);

  return toLeaveRequestItem(data, profileData?.full_name ?? undefined, steps);
}

async function updateLegacySingleStepRequest(
  sb: SupabaseAdmin,
  requestId: string,
  actor: { id: string; role: UserRole; note?: string; reviewedAt?: string },
  status: "Disetujui" | "Ditolak"
) {
  if (actor.role !== "admin" && actor.role !== "superadmin") return null;

  const finalStatus = status === "Disetujui" ? "approved" : "rejected";
  const reviewedAt = actor.reviewedAt ?? new Date().toISOString();

  return updateApprovalRequestAfterStep(sb, requestId, {
    status,
    final_status: finalStatus,
    completed_at: reviewedAt,
    admin_note: actor.note ?? null,
    reviewed_by: actor.id,
    reviewed_at: reviewedAt
  });
}

export async function approveRequestStep(
  sb: SupabaseAdmin,
  requestId: string,
  actor: { id: string; role: UserRole; note?: string; reviewedAt?: string }
) {
  const current = await getApprovalRequestWithSteps(sb, requestId);
  if (!current) return null;

  const reviewedAt = actor.reviewedAt ?? new Date().toISOString();
  const steps = current.steps;
  if (steps.length === 0) {
    return updateLegacySingleStepRequest(sb, requestId, actor, "Disetujui");
  }

  const currentStepOrder = current.request.current_step ?? 1;
  const step = steps.find((item) => item.stepOrder === currentStepOrder && item.status === "pending");
  if (!step || !canReviewStep(step, actor)) return null;

  if (step.approverRole === "hr") {
    const previousStepsApproved = steps
      .filter((item) => item.stepOrder < step.stepOrder)
      .every((item) => item.status === "approved");
    if (!previousStepsApproved) return null;
  }

  await markApprovalStep(sb, step.id!, "approved", actor.note, reviewedAt);

  const nextStep = steps.find((item) => item.stepOrder > step.stepOrder && item.status === "pending");
  if (nextStep) {
    return updateApprovalRequestAfterStep(sb, requestId, {
      status: "Menunggu",
      current_step: nextStep.stepOrder,
      final_status: "pending",
      admin_note: actor.note ?? current.request.admin_note ?? null
    });
  }

  return updateApprovalRequestAfterStep(sb, requestId, {
    status: "Disetujui",
    final_status: "approved",
    completed_at: reviewedAt,
    admin_note: actor.note ?? null,
    reviewed_by: actor.id,
    reviewed_at: reviewedAt
  });
}

export async function rejectRequestStep(
  sb: SupabaseAdmin,
  requestId: string,
  actor: { id: string; role: UserRole; note?: string; reviewedAt?: string }
) {
  const current = await getApprovalRequestWithSteps(sb, requestId);
  if (!current) return null;

  const reviewedAt = actor.reviewedAt ?? new Date().toISOString();
  const steps = current.steps;
  if (steps.length === 0) {
    return updateLegacySingleStepRequest(sb, requestId, actor, "Ditolak");
  }

  const currentStepOrder = current.request.current_step ?? 1;
  const step = steps.find((item) => item.stepOrder === currentStepOrder && item.status === "pending");
  if (!step || !canReviewStep(step, actor)) return null;

  await markApprovalStep(sb, step.id!, "rejected", actor.note, reviewedAt);

  return updateApprovalRequestAfterStep(sb, requestId, {
    status: "Ditolak",
    final_status: "rejected",
    completed_at: reviewedAt,
    admin_note: actor.note ?? null,
    reviewed_by: actor.id,
    reviewed_at: reviewedAt
  });
}

export async function getRequestApprovalTimeline(
  sb: SupabaseAdmin,
  requestId: string
) {
  return getApprovalStepsForRequest(sb, requestId);
}

export async function supabaseUpdateRequestStatus(
  sb: SupabaseAdmin,
  requestId: string,
  status: "Disetujui" | "Ditolak",
  adminNote?: string
) {
  const actor = {
    id: "legacy-admin",
    role: "admin" as UserRole,
    note: adminNote
  };

  return status === "Disetujui"
    ? approveRequestStep(sb, requestId, actor)
    : rejectRequestStep(sb, requestId, actor);
}

export async function supabaseDeleteRequest(
  sb: SupabaseAdmin,
  requestId: string,
  userId: string
) {
  const { error } = await sb
    .from("approval_requests")
    .delete()
    .eq("id", requestId)
    .eq("employee_id", userId)
    .eq("status", "Menunggu");

  return !error;
}

// ─── Admin overview ─────────────────────────────────────────

export async function supabaseGetAdminOverview(
  sb: SupabaseAdmin,
  organizationId: string
) {
  const today = new Date().toISOString().slice(0, 10);

  // Total employees in org
  const { count: totalEmployees } = await sb
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "employee");

  // Today's attendance
  const { data: todayAtt } = await sb
    .from("attendance_records")
    .select("state, status, check_in_time, employee_id, validation_status, validation_reasons, profiles!inner(organization_id, full_name)")
    .eq("attendance_date", today)
    .eq("profiles.organization_id", organizationId);

  const checkedIn = (todayAtt ?? []).filter(
    (r) => r.state === "checked_in" || r.state === "checked_out"
  );
  const onTime = checkedIn.filter((r) => {
    if (!r.check_in_time) return false;
    const hour = new Date(r.check_in_time).getHours();
    const minute = new Date(r.check_in_time).getMinutes();
    return hour < 8 || (hour === 8 && minute <= 15);
  });

  // Pending requests
  const { count: pendingRequests } = await sb
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "Menunggu")
    .in(
      "employee_id",
      (todayAtt ?? []).map((r) => r.employee_id)
    );

  const { count: exceptionCount } = await sb
    .from("attendance_exceptions")
    .select("id", { count: "exact", head: true })
    .in("status", ["Need Review", "Request Correction"]);

  return {
    totalEmployees: totalEmployees ?? 0,
    checkedInToday: checkedIn.length,
    onTimeToday: onTime.length,
    lateToday: checkedIn.length - onTime.length,
    pendingRequests: pendingRequests ?? 0,
    absentToday: Math.max(0, (totalEmployees ?? 0) - checkedIn.length),
    exceptionCount: exceptionCount ?? checkedIn.length - onTime.length,
    recentActivity: (todayAtt ?? []).slice(0, 5).map((row, index) => ({
      id: `${row.employee_id}-${index}`,
      employeeName:
        row.profiles && typeof row.profiles === "object" && "full_name" in row.profiles
          ? ((row.profiles as { full_name?: string }).full_name ?? "Employee")
          : "Employee",
      event: row.validation_status === "verified" ? (row.state === "checked_out" ? "Check-out" : "Check-in") : "Butuh review",
      time: row.check_in_time
        ? new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : "--.--",
      status: row.status ?? (row.state === "checked_out" ? "Selesai" : "Tepat waktu"),
      detail: row.validation_status === "verified" ? "Sinkron dari attendance_records" : ((row.validation_reasons as string[] | null)?.join(", ") ?? "Butuh review")
    }))
  };
}

export async function supabaseGetManagerOverview(
  sb: SupabaseAdmin,
  organizationId: string,
  managerId: string
) {
  const today = new Date().toISOString().slice(0, 10);
  const teamProfiles = await getManagerTeamProfiles<{ id: string; full_name: string }>(
    sb,
    organizationId,
    managerId,
    TEAM_PROFILE_SELECT
  );
  const employeeIds = teamProfiles.map((profile) => profile.id);
  if (employeeIds.length === 0) return emptyOverview();

  const employeeNameById = new Map(teamProfiles.map((profile) => [profile.id, profile.full_name]));

  const { data: todayAtt, error: attendanceError } = await sb
    .from("attendance_records")
    .select("state, status, check_in_time, employee_id, validation_status, validation_reasons")
    .eq("attendance_date", today)
    .in("employee_id", employeeIds);

  if (attendanceError) {
    throw new Error(`Failed to fetch manager attendance overview: ${attendanceError.message}`);
  }

  const checkedIn = (todayAtt ?? []).filter(
    (row) => row.state === "checked_in" || row.state === "checked_out"
  );
  const onTime = checkedIn.filter((row) => {
    if (!row.check_in_time) return false;
    const hour = new Date(row.check_in_time).getHours();
    const minute = new Date(row.check_in_time).getMinutes();
    return hour < 8 || (hour === 8 && minute <= 15);
  });

  const { count: pendingRequests, error: requestError } = await sb
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "Menunggu")
    .in("employee_id", employeeIds);

  if (requestError) {
    throw new Error(`Failed to fetch manager pending requests: ${requestError.message}`);
  }

  const { count: exceptionCount, error: exceptionError } = await sb
    .from("attendance_exceptions")
    .select("id", { count: "exact", head: true })
    .in("employee_id", employeeIds)
    .in("status", ["Need Review", "Request Correction"]);

  if (exceptionError) {
    throw new Error(`Failed to fetch manager exceptions count: ${exceptionError.message}`);
  }

  return {
    totalEmployees: employeeIds.length,
    checkedInToday: checkedIn.length,
    onTimeToday: onTime.length,
    lateToday: checkedIn.length - onTime.length,
    pendingRequests: pendingRequests ?? 0,
    absentToday: Math.max(0, employeeIds.length - checkedIn.length),
    exceptionCount: exceptionCount ?? 0,
    recentActivity: (todayAtt ?? []).slice(0, 5).map((row, index) => ({
      id: `${row.employee_id}-${index}`,
      employeeName: employeeNameById.get(row.employee_id) ?? "Employee",
      event: row.validation_status === "verified" ? (row.state === "checked_out" ? "Check-out" : "Check-in") : "Butuh review",
      time: row.check_in_time
        ? new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : "--.--",
      status: row.status ?? (row.state === "checked_out" ? "Selesai" : "Tepat waktu"),
      detail: row.validation_status === "verified" ? "Sinkron dari attendance_records" : ((row.validation_reasons as string[] | null)?.join(", ") ?? "Butuh review")
    }))
  };
}

async function getEmployeeListForProfiles(
  sb: SupabaseAdmin,
  profiles: ProfileStructureRow[]
): Promise<EmployeeListItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const employeeIds = profiles.map((profile) => profile.id).filter((id): id is string => Boolean(id));
  if (employeeIds.length === 0) return [];

  const { data: attendance, error: attendanceError } = await sb
    .from("attendance_records")
    .select("employee_id, state, status, check_in_time, validation_status, shift_id, work_locations(name)")
    .eq("attendance_date", today)
    .in("employee_id", employeeIds);

  if (attendanceError) {
    throw new Error(`Failed to fetch employee attendance: ${attendanceError.message}`);
  }

  const attendanceByEmployeeId = new Map((attendance ?? []).map((record) => [record.employee_id, record]));

  return profiles.map((profile) => {
    const record = attendanceByEmployeeId.get(profile.id);
    let todayStatus: EmployeeListItem["todayStatus"] = "absent";

    if (record?.state === "checked_in" || record?.state === "checked_out") {
      todayStatus = record.status === "Terlambat" ? "late" : "present";
    }

    const workLocation = firstRelation(record?.work_locations);

    return {
      id: profile.id!,
      fullName: profile.full_name ?? "Employee",
      email: profile.email ?? "",
      role: profile.role as UserRole,
      ...readProfileStructure(profile),
      todayStatus,
      checkInTime: record?.check_in_time ? new Date(record.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : undefined,
      validationStatus: record?.validation_status as EmployeeListItem["validationStatus"] | undefined,
      shiftName: record?.shift_id ?? undefined,
      locationName: workLocation?.name ?? undefined
    };
  });
}

function toDepartmentItem(row: DepartmentStructureRow, memberCounts = new Map<string, number>()): DepartmentItem {
  const manager = firstRelation(row.manager);

  return {
    id: row.id!,
    name: row.name ?? "",
    managerId: row.manager_id ?? null,
    managerName: manager?.full_name ?? null,
    description: row.description ?? null,
    isActive: row.is_active ?? true,
    memberCount: memberCounts.get(row.id!) ?? 0
  };
}

function toNullableId(value: string | undefined | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toEmployeeListItemFromProfile(profile: ProfileStructureRow): EmployeeListItem {
  return {
    id: profile.id!,
    fullName: profile.full_name ?? "Employee",
    email: profile.email ?? "",
    role: profile.role as UserRole,
    ...readProfileStructure(profile),
    todayStatus: "absent"
  };
}

async function assertProfileInOrganization(
  sb: SupabaseAdmin,
  organizationId: string,
  profileId: string,
  message: string
) {
  const { data, error } = await sb
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(message);
  }
}

async function assertDepartmentInOrganization(
  sb: SupabaseAdmin,
  organizationId: string,
  departmentId: string,
  message: string
) {
  const { data, error } = await sb
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(message);
  }
}

export async function supabaseGetDepartments(
  sb: SupabaseAdmin,
  organizationId: string
): Promise<DepartmentItem[]> {
  const { data: departments, error: departmentsError } = await sb
    .from("departments")
    .select(DEPARTMENT_SELECT)
    .eq("organization_id", organizationId)
    .order("name");

  if (departmentsError) {
    throw new Error(`Failed to fetch departments: ${departmentsError.message}`);
  }

  const { data: members, error: membersError } = await sb
    .from("profiles")
    .select("department_id")
    .eq("organization_id", organizationId);

  if (membersError) {
    throw new Error(`Failed to fetch department members: ${membersError.message}`);
  }

  const memberCounts = new Map<string, number>();
  for (const member of members ?? []) {
    if (!member.department_id) continue;
    memberCounts.set(member.department_id, (memberCounts.get(member.department_id) ?? 0) + 1);
  }

  return ((departments ?? []) as DepartmentStructureRow[]).map((department) => toDepartmentItem(department, memberCounts));
}

export async function supabaseCreateDepartment(
  sb: SupabaseAdmin,
  organizationId: string,
  payload: { name: string; managerId?: string | null; description?: string | null; isActive?: boolean }
): Promise<DepartmentItem> {
  const managerId = toNullableId(payload.managerId);
  if (managerId) {
    await assertProfileInOrganization(sb, organizationId, managerId, "Department manager must be in the same organization.");
  }

  const { data, error } = await sb
    .from("departments")
    .insert({
      organization_id: organizationId,
      name: payload.name,
      manager_id: managerId,
      description: payload.description ?? null,
      is_active: payload.isActive ?? true
    })
    .select(DEPARTMENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(`Failed to create department: ${error?.message ?? "No department returned"}`);
  }

  return toDepartmentItem(data as DepartmentStructureRow);
}

export async function supabaseUpdateDepartment(
  sb: SupabaseAdmin,
  organizationId: string,
  departmentId: string,
  payload: { name?: string; managerId?: string | null; description?: string | null; isActive?: boolean }
): Promise<DepartmentItem> {
  const update: Record<string, unknown> = {};

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.description !== undefined) update.description = payload.description;
  if (payload.isActive !== undefined) update.is_active = payload.isActive;
  if (payload.managerId !== undefined) {
    const managerId = toNullableId(payload.managerId);
    if (managerId) {
      await assertProfileInOrganization(sb, organizationId, managerId, "Department manager must be in the same organization.");
    }
    update.manager_id = managerId;
  }

  const { data, error } = await sb
    .from("departments")
    .update(update)
    .eq("id", departmentId)
    .eq("organization_id", organizationId)
    .select(DEPARTMENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(`Failed to update department: ${error?.message ?? "No department returned"}`);
  }

  return toDepartmentItem(data as DepartmentStructureRow);
}

export async function supabaseReassignEmployeeDepartment(
  sb: SupabaseAdmin,
  organizationId: string,
  employeeId: string,
  payload: { departmentId?: string | null; managerId?: string | null }
): Promise<EmployeeListItem> {
  const update: Record<string, unknown> = {};

  if (payload.departmentId !== undefined) {
    const departmentId = toNullableId(payload.departmentId);
    if (departmentId) {
      await assertDepartmentInOrganization(sb, organizationId, departmentId, "Employee department must be in the same organization.");
    }
    update.department_id = departmentId;
  }

  if (payload.managerId !== undefined) {
    const managerId = toNullableId(payload.managerId);
    if (managerId) {
      await assertProfileInOrganization(sb, organizationId, managerId, "Employee manager must be in the same organization.");
    }
    update.manager_id = managerId;
  }

  const { data, error } = await sb
    .from("profiles")
    .update(update)
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .select(EMPLOYEE_LIST_SELECT)
    .single();

  if (error || !data) {
    throw new Error(`Failed to update employee department: ${error?.message ?? "No employee returned"}`);
  }

  return toEmployeeListItemFromProfile(data as ProfileStructureRow);
}

export async function supabaseGetEmployeeList(
  sb: SupabaseAdmin,
  organizationId: string,
  filters?: EmployeeListFilters
): Promise<EmployeeListItem[]> {
  const { data: profiles, error: profilesError } = await sb
    .from("profiles")
    .select(EMPLOYEE_LIST_SELECT)
    .eq("organization_id", organizationId)
    .in("role", ["employee", "manager"]);

  if (profilesError) {
    throw new Error(`Failed to fetch employees: ${profilesError.message}`);
  }

  const items = await getEmployeeListForProfiles(sb, (profiles ?? []) as ProfileStructureRow[]);
  return applyEmployeeListFilters(items, filters);
}

export async function supabaseGetManagerEmployeeList(
  sb: SupabaseAdmin,
  organizationId: string,
  managerId: string
): Promise<EmployeeListItem[]> {
  const profiles = await getManagerTeamProfiles<ProfileStructureRow>(
    sb,
    organizationId,
    managerId,
    EMPLOYEE_LIST_SELECT
  );

  return getEmployeeListForProfiles(sb, profiles);
}

// ─── Employee summary ───────────────────────────────────────

export async function supabaseGetEmployeeSummary(
  sb: SupabaseAdmin,
  userId: string
): Promise<EmployeeSummary> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: history } = await sb
    .from("attendance_records")
    .select("state, check_in_time")
    .eq("employee_id", userId);

  const attended = (history ?? []).filter(
    (r) => r.state === "checked_in" || r.state === "checked_out"
  );
  const onTime = attended.filter((r) => {
    if (!r.check_in_time) return false;
    const hour = new Date(r.check_in_time).getHours();
    const minute = new Date(r.check_in_time).getMinutes();
    return hour < 8 || (hour === 8 && minute <= 15);
  });

  const { count: pendingRequests } = await sb
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", userId)
    .eq("status", "Menunggu");

  // Today's attendance state
  const { data: todayRecord } = await sb
    .from("attendance_records")
    .select("*")
    .eq("employee_id", userId)
    .eq("attendance_date", today)
    .maybeSingle();

  const { data: profile } = await sb
    .from("profiles")
    .select("department_id, manager_id, position, employee_code, departments(name), manager:profiles!profiles_manager_id_fkey(full_name)")
    .eq("id", userId)
    .maybeSingle();

  return {
    totalDays: attended.length,
    onTimeDays: onTime.length,
    lateDays: attended.length - onTime.length,
    pendingRequests: pendingRequests ?? 0,
    currentAttendanceState: (todayRecord?.state ?? "idle") as "idle" | "checked_in" | "checked_out",
    assignedShift: {
      id: "shift-pagi",
      name: "Shift Pagi",
      startTime: "08:00",
      endTime: "17:00",
      locationName: "Kantor Pusat"
    },
    todayRecord: {
      id: todayRecord?.id ?? `att-${userId}-${today}`,
      employeeId: userId,
      shiftId: "shift-pagi",
      checkInTime: todayRecord?.check_in_time ?? undefined,
      checkOutTime: todayRecord?.check_out_time ?? undefined,
      status: todayRecord?.status ?? (todayRecord?.state === "checked_out" ? "Selesai" : todayRecord?.state === "checked_in" ? "Tepat waktu" : "Belum check-in"),
      locationLat: todayRecord?.location_lat ?? undefined,
      locationLng: todayRecord?.location_lng ?? undefined,
      validationStatus: todayRecord?.validation_status ?? "verified",
      validationReasons: todayRecord?.validation_reasons ?? [],
      selfieUrl: todayRecord?.selfie_url ?? undefined,
      deviceId: todayRecord?.device_id ?? undefined,
      createdAt: todayRecord?.created_at ?? `${today}T00:00:00.000Z`,
      updatedAt: todayRecord?.updated_at ?? `${today}T00:00:00.000Z`
    },
    profile: readProfileStructure(profile)
  };
}

// ─── Scanner ────────────────────────────────────────────────

export async function supabaseGetScannerState(
  sb: SupabaseAdmin
): Promise<ScannerRecord> {
  const { data } = await sb
    .from("scanner_tokens")
    .select("*, work_locations(name)")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return {
      id: "scanner-default",
      token: "HDR-000-000",
      locationId: DEFAULT_LOCATION.id,
      locationName: DEFAULT_LOCATION.name,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      status: "active",
      scansToday: 0,
      recentScans: []
    };
  }

  return {
    id: data.id,
    token: data.token,
    locationId: data.work_location_id ?? DEFAULT_LOCATION.id,
    expiresAt: data.expires_at,
    status: data.status,
    scansToday: data.scans_today,
    locationName: (data.work_locations as Record<string, string> | null)?.name ?? DEFAULT_LOCATION.name,
    recentScans: []
  };
}

export async function supabaseGetPrimaryWorkLocation(
  sb: SupabaseAdmin,
  organizationId: string
) {
  const { data, error } = await sb
    .from("work_locations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch work location: ${error.message}`);
  }

  if (!data) {
    return DEFAULT_LOCATION;
  }

  return {
    id: data.id,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    radiusMeters: data.radius_meters
  };
}

export async function supabaseRefreshScannerToken(
  sb: SupabaseAdmin,
  newToken: string
): Promise<ScannerRecord> {
  const { data, error } = await sb
    .from("scanner_tokens")
    .update({
      token: newToken,
      expires_at: new Date(Date.now() + 30_000).toISOString(),
      status: "active",
      updated_at: new Date().toISOString()
    })
    .eq("status", "active")
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to refresh scanner token: ${error?.message}`);
  }

  return {
    id: data.id,
    token: data.token,
    locationId: data.work_location_id ?? DEFAULT_LOCATION.id,
    expiresAt: data.expires_at,
    status: data.status,
    scansToday: data.scans_today,
    locationName: DEFAULT_LOCATION.name,
    recentScans: []
  };
}

export async function supabaseGetExceptions(
  sb: SupabaseAdmin,
  organizationId: string
): Promise<AttendanceExceptionItem[]> {
  const { data: orgUsers } = await sb
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", organizationId);

  const userMap = new Map((orgUsers ?? []).map((item) => [item.id, item.full_name]));
  const userIds = (orgUsers ?? []).map((item) => item.id);
  if (userIds.length === 0) return [];

  const { data, error } = await sb
    .from("attendance_exceptions")
    .select("*")
    .in("employee_id", userIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch exceptions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    attendanceRecordId: row.attendance_record_id,
    employeeId: row.employee_id,
    employeeName: userMap.get(row.employee_id) ?? "Employee",
    exceptionType: row.exception_type,
    reason: row.reason,
    status: row.status,
    adminNote: row.admin_note ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at
  }));
}

export async function supabaseGetManagerExceptions(
  sb: SupabaseAdmin,
  organizationId: string,
  managerId: string
): Promise<AttendanceExceptionItem[]> {
  const teamProfiles = await getManagerTeamProfiles<{ id: string; full_name: string }>(
    sb,
    organizationId,
    managerId,
    TEAM_PROFILE_SELECT
  );

  const userMap = new Map(teamProfiles.map((profile) => [profile.id, profile.full_name]));
  const userIds = teamProfiles.map((profile) => profile.id);
  if (userIds.length === 0) return [];

  const { data, error } = await sb
    .from("attendance_exceptions")
    .select("*")
    .in("employee_id", userIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch manager exceptions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    attendanceRecordId: row.attendance_record_id,
    employeeId: row.employee_id,
    employeeName: userMap.get(row.employee_id) ?? "Employee",
    exceptionType: row.exception_type,
    reason: row.reason,
    status: row.status,
    adminNote: row.admin_note ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at
  }));
}

export async function supabaseCreateAttendanceException(
  sb: SupabaseAdmin,
  exception: ExceptionRecord
) {
  const { data, error } = await sb
    .from("attendance_exceptions")
    .insert({
      attendance_record_id: exception.attendanceRecordId,
      employee_id: exception.employeeId,
      exception_type: exception.exceptionType,
      reason: exception.reason,
      status: exception.status,
      admin_note: exception.adminNote ?? null,
      reviewed_by: exception.reviewedBy ?? null,
      reviewed_at: exception.reviewedAt ?? null,
      created_at: exception.createdAt
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create attendance exception: ${error?.message}`);
  }

  return data;
}

export async function supabaseReviewException(
  sb: SupabaseAdmin,
  exceptionId: string,
  payload: { status: AttendanceExceptionItem["status"]; adminNote: string; reviewedBy: string }
) {
  const { data, error } = await sb
    .from("attendance_exceptions")
    .update({
      status: payload.status,
      admin_note: payload.adminNote,
      reviewed_by: payload.reviewedBy,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", exceptionId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to review exception: ${error?.message}`);
  }

  return data;
}

export async function supabaseCreateAuditLog(
  sb: SupabaseAdmin,
  log: AuditLogRecord
) {
  const { error } = await sb
    .from("audit_logs")
    .insert({
      id: log.id,
      actor_role: log.actorRole,
      action: log.action,
      target_id: log.targetId,
      detail: log.detail,
      created_at: log.createdAt
    });

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }
}

export async function supabaseGetAuditLogs(
  sb: SupabaseAdmin
) {
  const { data, error } = await sb
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    actorName: "Admin",
    actorRole: row.actor_role,
    targetId: row.target_id,
    detail: row.detail,
    createdAt: row.created_at
  }));
}

// ─── Helpers ────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr + "T00:00:00");
  const diffMs = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";

  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return dayNames[date.getDay()] ?? dateStr;
}

function mapAttendanceStatus(
  state: string,
  checkInAt: string | null
): "Tepat waktu" | "Terlambat" | "Izin" | "Belum check-in" {
  if (state === "idle") return "Belum check-in";

  if (checkInAt) {
    const hour = new Date(checkInAt).getHours();
    const minute = new Date(checkInAt).getMinutes();
    if (hour < 8 || (hour === 8 && minute <= 15)) return "Tepat waktu";
    return "Terlambat";
  }

  return "Tepat waktu";
}
