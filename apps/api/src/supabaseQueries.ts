import type { SupabaseAdmin } from "./supabase";
import type { AttendanceRecord, ExceptionRecord, RequestRecord, ScannerRecord, DemoStore, AuditLogRecord } from "./domain";
import type { AttendanceExceptionItem, AuthUser, UserRole } from "@taptu/shared";
import { createInitialStore } from "./domain";

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
    .select("full_name, role, organization_id, organizations(name)")
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
      organizationName: orgName
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
    .select("id, full_name, email, role, organization_id, organizations(name)")
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
    organizationName: orgName
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

export async function supabaseUpsertAttendance(
  sb: SupabaseAdmin,
  userId: string,
  record: AttendanceRecord
): Promise<AttendanceRecord> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("attendance_records")
    .upsert(
      {
        employee_id: userId,
        attendance_date: today,
        shift_id: record.shiftId,
        status: record.status,
        state: record.state,
        location_id: record.locationId ?? null,
        check_in_time: record.checkInAt ?? null,
        check_in_method: record.checkInMethod ?? null,
        check_out_time: record.checkOutAt ?? null,
        check_out_method: record.checkOutMethod ?? null,
        location_lat: record.locationLat ?? null,
        location_lng: record.locationLng ?? null,
        validation_status: record.validationStatus,
        validation_reasons: record.validationReasons,
        selfie_url: record.selfieUrl ?? null,
        device_id: record.deviceId ?? null,
        scanner_token_id: record.scannerTokenId ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "employee_id,attendance_date" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert attendance: ${error?.message ?? "Unknown error"}`);
  }

  return {
    id: data.id,
    userId: data.employee_id,
    shiftId: data.shift_id ?? "shift-pagi",
    shiftName: "Shift Pagi",
    shiftStartTime: "08:00",
    shiftEndTime: "17:00",
    locationId: data.location_id ?? DEFAULT_LOCATION.id,
    locationName: DEFAULT_LOCATION.name,
    state: data.state,
    status: data.status ?? (data.state === "checked_out" ? "Selesai" : data.state === "idle" ? "Belum check-in" : "Tepat waktu"),
    checkInAt: data.check_in_time ?? undefined,
    checkInMethod: data.check_in_method ?? undefined,
    checkOutAt: data.check_out_time ?? undefined,
    checkOutMethod: data.check_out_method ?? undefined,
    locationLat: data.location_lat ?? undefined,
    locationLng: data.location_lng ?? undefined,
    validationStatus: data.validation_status ?? "verified",
    validationReasons: data.validation_reasons ?? [],
    selfieUrl: data.selfie_url ?? undefined,
    deviceId: data.device_id ?? undefined,
    scannerTokenId: data.scanner_token_id ?? undefined,
    createdAt: data.created_at ?? `${today}T00:00:00.000Z`,
    updatedAt: data.updated_at ?? `${today}T00:00:00.000Z`
  };
}

export async function supabaseGetAttendanceHistory(
  sb: SupabaseAdmin,
  userId: string,
  filter: "all" | "present" | "issue" = "all"
) {
  let query = sb
    .from("attendance_records")
    .select("*")
    .eq("employee_id", userId)
    .order("attendance_date", { ascending: false })
    .limit(30);

  if (filter === "present") {
    query = query.in("state", ["checked_in", "checked_out"]);
  } else if (filter === "issue") {
    query = query.eq("state", "idle");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch attendance history: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    day: formatDateLabel(row.attendance_date),
    status: mapAttendanceStatus(row.state, row.check_in_time),
    time: row.check_in_time
      ? new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "--.--",
    method: (row.check_in_method ?? "Manual") as "QR" | "GPS" | "Selfie" | "Manual"
  }));
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

  let query = sb
    .from("attendance_records")
    .select("*, profiles(full_name)")
    .in("employee_id", userIds)
    .order("attendance_date", { ascending: false })
    .limit(100);

  if (filter === "present") {
    query = query.in("state", ["checked_in", "checked_out"]);
  } else if (filter === "issue") {
    query = query.eq("state", "idle");
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch all attendance: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    day: formatDateLabel(row.attendance_date),
    status: mapAttendanceStatus(row.state, row.check_in_time),
    time: row.check_in_time
      ? new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "--.--",
    method: (row.check_in_method ?? "Manual") as "QR" | "GPS" | "Selfie" | "Manual"
  }));
}

// ─── Requests ───────────────────────────────────────────────

export async function supabaseGetRequests(
  sb: SupabaseAdmin,
  userId: string,
  isAdmin: boolean,
  organizationId?: string
) {
  if (isAdmin && organizationId) {
    // Admin sees all requests from org members
    const { data: orgUsers } = await sb
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", organizationId);

    const userIds = (orgUsers ?? []).map((u) => u.id);
    const userMap = new Map((orgUsers ?? []).map((u) => [u.id, u.full_name]));

    const { data, error } = await sb
      .from("approval_requests")
      .select("*")
      .in("employee_id", userIds)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch requests: ${error.message}`);

    return (data ?? []).map((row) => ({
      id: row.id,
      requester: userMap.get(row.employee_id) ?? undefined,
      category: row.request_type,
      startDate: row.start_date,
      endDate: row.end_date,
      title: row.title,
      detail: row.reason,
      status: row.status as "Menunggu" | "Disetujui" | "Ditolak",
      adminNote: row.admin_note ?? undefined,
      createdAt: row.created_at,
      reviewedBy: undefined,
      reviewedAt: row.reviewed_at ?? undefined
    }));
  }

  // Employee sees own requests
  const { data, error } = await sb
    .from("approval_requests")
    .select("*")
    .eq("employee_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.request_type,
    startDate: row.start_date,
    endDate: row.end_date,
    title: row.title,
    detail: row.reason,
    status: row.status as "Menunggu" | "Disetujui" | "Ditolak",
    adminNote: row.admin_note ?? undefined,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? undefined
  }));
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
  const { data, error } = await sb
    .from("approval_requests")
    .insert({
      employee_id: userId,
      request_type: payload.category,
      start_date: payload.startDate,
      end_date: payload.endDate,
      title: payload.title,
      reason: payload.detail,
      status: "Menunggu"
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create request: ${error?.message}`);
  }

  return {
    id: data.id,
    category: data.request_type,
    startDate: data.start_date,
    endDate: data.end_date,
    title: data.title,
    detail: data.reason,
    status: data.status as "Menunggu" | "Disetujui" | "Ditolak",
    createdAt: data.created_at
  };
}

export async function supabaseGetRequestById(
  sb: SupabaseAdmin,
  requestId: string,
  userId: string,
  isAdmin: boolean
) {
  const { data, error } = await sb
    .from("approval_requests")
    .select("*, profiles(full_name)")
    .eq("id", requestId)
    .single();

  if (error || !data) return null;

  // Employees can only see their own
  if (!isAdmin && data.employee_id !== userId) return null;

  const profileData = data.profiles as Record<string, string> | null;

  return {
    id: data.id,
    requester: profileData?.full_name ?? undefined,
    category: data.request_type,
    startDate: data.start_date,
    endDate: data.end_date,
    title: data.title,
    detail: data.reason,
    status: data.status as "Menunggu" | "Disetujui" | "Ditolak",
    adminNote: data.admin_note ?? undefined,
    reviewedAt: data.reviewed_at ?? undefined
  };
}

export async function supabaseUpdateRequestStatus(
  sb: SupabaseAdmin,
  requestId: string,
  status: "Disetujui" | "Ditolak",
  adminNote?: string
) {
  const { data, error } = await sb
    .from("approval_requests")
    .update({ status, admin_note: adminNote ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "Menunggu") // only pending can be changed
    .select("*, profiles(full_name)")
    .single();

  if (error || !data) return null;

  const profileData = data.profiles as Record<string, string> | null;

  return {
    id: data.id,
    requester: profileData?.full_name ?? undefined,
    category: data.request_type,
    startDate: data.start_date,
    endDate: data.end_date,
    title: data.title,
    detail: data.reason,
    status: data.status as "Menunggu" | "Disetujui" | "Ditolak",
    adminNote: data.admin_note ?? undefined,
    reviewedAt: data.reviewed_at ?? undefined
  };
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

// ─── Employee summary ───────────────────────────────────────

export async function supabaseGetEmployeeSummary(
  sb: SupabaseAdmin,
  userId: string
) {
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
    }
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
