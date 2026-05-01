import type { SupabaseAdmin } from "./supabase";
import type { AttendanceRecord, RequestRecord, ScannerRecord, DemoStore } from "./domain";
import type { AuthUser, UserRole } from "@taptu/shared";
import { createInitialStore } from "./domain";

/**
 * Full relational Supabase adapter.
 * Operates on normalized tables (profiles, attendance, requests, scanner_state)
 * instead of a single JSON blob.
 */

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
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (!data) {
    return { userId, state: "idle" };
  }

  return {
    userId: data.user_id,
    state: data.state,
    checkInAt: data.check_in_at,
    checkInMethod: data.check_in_method,
    checkOutAt: data.check_out_at,
    checkOutMethod: data.check_out_method
  };
}

export async function supabaseUpsertAttendance(
  sb: SupabaseAdmin,
  userId: string,
  record: AttendanceRecord
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb
    .from("attendance")
    .upsert(
      {
        user_id: userId,
        date: today,
        state: record.state,
        check_in_at: record.checkInAt ?? null,
        check_in_method: record.checkInMethod ?? null,
        check_out_at: record.checkOutAt ?? null,
        check_out_method: record.checkOutMethod ?? null
      },
      { onConflict: "user_id,date" }
    );

  if (error) {
    throw new Error(`Failed to upsert attendance: ${error.message}`);
  }
}

export async function supabaseGetAttendanceHistory(
  sb: SupabaseAdmin,
  userId: string,
  filter: "all" | "present" | "issue" = "all"
) {
  let query = sb
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
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
    day: formatDateLabel(row.date),
    status: mapAttendanceStatus(row.state, row.check_in_at),
    time: row.check_in_at
      ? new Date(row.check_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
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
    .from("attendance")
    .select("*, profiles(full_name)")
    .in("user_id", userIds)
    .order("date", { ascending: false })
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
    day: formatDateLabel(row.date),
    status: mapAttendanceStatus(row.state, row.check_in_at),
    time: row.check_in_at
      ? new Date(row.check_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
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
      .from("requests")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch requests: ${error.message}`);

    return (data ?? []).map((row) => ({
      id: row.id,
      requester: userMap.get(row.user_id) ?? undefined,
      category: row.category as "Izin" | "Cuti" | "Sakit",
      startDate: row.start_date,
      endDate: row.end_date,
      title: row.title,
      detail: row.detail,
      status: row.status as "Menunggu" | "Disetujui" | "Ditolak"
    }));
  }

  // Employee sees own requests
  const { data, error } = await sb
    .from("requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category as "Izin" | "Cuti" | "Sakit",
    startDate: row.start_date,
    endDate: row.end_date,
    title: row.title,
    detail: row.detail,
    status: row.status as "Menunggu" | "Disetujui" | "Ditolak"
  }));
}

export async function supabaseCreateRequest(
  sb: SupabaseAdmin,
  userId: string,
  payload: {
    category: "Izin" | "Cuti" | "Sakit";
    startDate: string;
    endDate: string;
    title: string;
    detail: string;
  }
) {
  const { data, error } = await sb
    .from("requests")
    .insert({
      user_id: userId,
      category: payload.category,
      start_date: payload.startDate,
      end_date: payload.endDate,
      title: payload.title,
      detail: payload.detail,
      status: "Menunggu"
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create request: ${error?.message}`);
  }

  return {
    id: data.id,
    category: data.category as "Izin" | "Cuti" | "Sakit",
    startDate: data.start_date,
    endDate: data.end_date,
    title: data.title,
    detail: data.detail,
    status: data.status as "Menunggu" | "Disetujui" | "Ditolak"
  };
}

export async function supabaseGetRequestById(
  sb: SupabaseAdmin,
  requestId: string,
  userId: string,
  isAdmin: boolean
) {
  const { data, error } = await sb
    .from("requests")
    .select("*, profiles(full_name)")
    .eq("id", requestId)
    .single();

  if (error || !data) return null;

  // Employees can only see their own
  if (!isAdmin && data.user_id !== userId) return null;

  const profileData = data.profiles as Record<string, string> | null;

  return {
    id: data.id,
    requester: profileData?.full_name ?? undefined,
    category: data.category as "Izin" | "Cuti" | "Sakit",
    startDate: data.start_date,
    endDate: data.end_date,
    title: data.title,
    detail: data.detail,
    status: data.status as "Menunggu" | "Disetujui" | "Ditolak"
  };
}

export async function supabaseUpdateRequestStatus(
  sb: SupabaseAdmin,
  requestId: string,
  status: "Disetujui" | "Ditolak"
) {
  const { data, error } = await sb
    .from("requests")
    .update({ status })
    .eq("id", requestId)
    .eq("status", "Menunggu") // only pending can be changed
    .select("*, profiles(full_name)")
    .single();

  if (error || !data) return null;

  const profileData = data.profiles as Record<string, string> | null;

  return {
    id: data.id,
    requester: profileData?.full_name ?? undefined,
    category: data.category as "Izin" | "Cuti" | "Sakit",
    startDate: data.start_date,
    endDate: data.end_date,
    title: data.title,
    detail: data.detail,
    status: data.status as "Menunggu" | "Disetujui" | "Ditolak"
  };
}

export async function supabaseDeleteRequest(
  sb: SupabaseAdmin,
  requestId: string,
  userId: string
) {
  const { error } = await sb
    .from("requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", userId)
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
    .from("attendance")
    .select("state, check_in_at, user_id, profiles!inner(organization_id)")
    .eq("date", today)
    .eq("profiles.organization_id", organizationId);

  const checkedIn = (todayAtt ?? []).filter(
    (r) => r.state === "checked_in" || r.state === "checked_out"
  );
  const onTime = checkedIn.filter((r) => {
    if (!r.check_in_at) return false;
    const hour = new Date(r.check_in_at).getHours();
    const minute = new Date(r.check_in_at).getMinutes();
    return hour < 8 || (hour === 8 && minute <= 15);
  });

  // Pending requests
  const { count: pendingRequests } = await sb
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "Menunggu")
    .in(
      "user_id",
      (todayAtt ?? []).map((r) => r.user_id)
    );

  return {
    totalEmployees: totalEmployees ?? 0,
    checkedInToday: checkedIn.length,
    onTimeToday: onTime.length,
    lateToday: checkedIn.length - onTime.length,
    pendingRequests: pendingRequests ?? 0
  };
}

// ─── Employee summary ───────────────────────────────────────

export async function supabaseGetEmployeeSummary(
  sb: SupabaseAdmin,
  userId: string
) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: history } = await sb
    .from("attendance")
    .select("state, check_in_at")
    .eq("user_id", userId);

  const attended = (history ?? []).filter(
    (r) => r.state === "checked_in" || r.state === "checked_out"
  );
  const onTime = attended.filter((r) => {
    if (!r.check_in_at) return false;
    const hour = new Date(r.check_in_at).getHours();
    const minute = new Date(r.check_in_at).getMinutes();
    return hour < 8 || (hour === 8 && minute <= 15);
  });

  const { count: pendingRequests } = await sb
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "Menunggu");

  // Today's attendance state
  const { data: todayRecord } = await sb
    .from("attendance")
    .select("state")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  return {
    totalDays: attended.length,
    onTimeDays: onTime.length,
    lateDays: attended.length - onTime.length,
    pendingRequests: pendingRequests ?? 0,
    currentAttendanceState: (todayRecord?.state ?? "idle") as "idle" | "checked_in" | "checked_out"
  };
}

// ─── Scanner ────────────────────────────────────────────────

export async function supabaseGetScannerState(
  sb: SupabaseAdmin
): Promise<ScannerRecord> {
  const { data } = await sb
    .from("scanner_state")
    .select("*")
    .eq("id", "default")
    .single();

  if (!data) {
    return { token: "HDR-000-000", expiresInSeconds: 30, scansToday: 0, locationName: "Gerbang Utama" };
  }

  return {
    token: data.token,
    expiresInSeconds: data.expires_in_seconds,
    scansToday: data.scans_today,
    locationName: data.location_name
  };
}

export async function supabaseRefreshScannerToken(
  sb: SupabaseAdmin,
  newToken: string
): Promise<ScannerRecord> {
  const { data, error } = await sb
    .from("scanner_state")
    .update({
      token: newToken,
      expires_in_seconds: 30,
      updated_at: new Date().toISOString()
    })
    .eq("id", "default")
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to refresh scanner token: ${error?.message}`);
  }

  return {
    token: data.token,
    expiresInSeconds: data.expires_in_seconds,
    scansToday: data.scans_today,
    locationName: data.location_name
  };
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
