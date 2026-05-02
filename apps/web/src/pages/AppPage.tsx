import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Crosshair,
  FileClock,
  FolderKanban,
  LogOut,
  MapPinned,
  QrCode,
  Radar,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  TimerReset,
  Users
} from "lucide-react";

import type {
  AdminOverview,
  AttendanceExceptionItem,
  AttendanceRecord,
  AttendanceTimelineItem,
  AuditLogItem,
  DashboardPayload,
  DashboardScheduleItem,
  DashboardStat,
  EmployeeSummary,
  LeaveRequestItem,
  UserRole
} from "@taptu/shared";

import {
  AppShell,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  FormInput,
  LoadingState,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatCard,
  StatusBadge
} from "../components/app";
import {
  approveRequest,
  cancelRequest,
  checkIn,
  checkOut,
  createRequest,
  fetchAuditLogs,
  fetchAdminOverview,
  fetchAttendanceHistoryByFilter,
  fetchEmployeeSummary,
  fetchExceptionQueue,
  fetchRequestDetail,
  fetchRequests,
  fetchScannerState,
  getDashboard,
  refreshScannerToken,
  reviewException
} from "../lib/api";
import { getNavigationForRole, toAppSection, type AppTabKey } from "../lib/appShellState";
import {
  calculateDistanceMeters,
  evaluateAttendanceTrust,
  secureAttendancePolicy,
  type AttendanceTrustSignal
} from "../lib/attendanceTrust";
import { nextScannerCountdown, validateRequestForm } from "../lib/mobileWorkflow";
import { clearSession, readSession } from "../lib/session";

const attendanceMethods = ["QR", "GPS", "Selfie"] as const;
const attendanceFilters = ["all", "present", "issue"] as const;

const roleLabels: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin HR",
  manager: "Manager",
  employee: "Employee",
  scanner: "Scanner Kiosk"
};

export function AppPage() {
  const session = readSession();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const sessionRole = session?.user.role ?? "employee";
  const activeSection = useMemo(() => toAppSection(section, sessionRole), [section, sessionRole]);

  const [greeting, setGreeting] = useState("");
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [schedule, setSchedule] = useState<DashboardScheduleItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceTimelineItem[]>([]);
  const [attendanceState, setAttendanceState] = useState<"idle" | "checked_in" | "checked_out">("idle");
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [scannerToken, setScannerToken] = useState<string | undefined>();
  const [scannerMeta, setScannerMeta] = useState<{ expiresInSeconds: number; scansToday: number; locationName: string } | null>(null);
  const [scannerScans, setScannerScans] = useState<Array<{ id: string; employeeName: string; status: "success" | "invalid" | "expired"; time: string; detail: string }>>([]);
  const [tab, setTab] = useState<AppTabKey>(activeSection);
  const [historyFilter, setHistoryFilter] = useState<(typeof attendanceFilters)[number]>("all");
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary | null>(null);
  const [requestForm, setRequestForm] = useState({
    category: "Izin" as "Izin" | "Cuti" | "Sakit" | "Permission" | "Attendance Correction" | "Forgot Check-in/out",
    startDate: "",
    endDate: "",
    title: "",
    detail: ""
  });
  const [requestDetail, setRequestDetail] = useState<LeaveRequestItem | null>(null);
  const [exceptionQueue, setExceptionQueue] = useState<AttendanceExceptionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [exceptionNotes, setExceptionNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ message: string; tone: "ok" | "err" } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [attendanceTrustSignal, setAttendanceTrustSignal] = useState<AttendanceTrustSignal>({
    serverTimeSkewMinutes: 0,
    distanceFromOfficeMeters: 96,
    locationAccuracyMeters: 24,
    mockLocationDetected: false
  });
  const [attendanceCapture, setAttendanceCapture] = useState({
    locationLat: undefined as number | undefined,
    locationLng: undefined as number | undefined,
    selfieUrl: "",
    scannerToken: "",
    requiredSelfie: true,
    deviceId: ""
  });

  const appNavigation = useMemo(() => getNavigationForRole(sessionRole), [sessionRole]);
  const attendanceTrust = useMemo(
    () => evaluateAttendanceTrust(attendanceTrustSignal, secureAttendancePolicy),
    [attendanceTrustSignal]
  );

  const isAdmin = sessionRole === "admin" || sessionRole === "superadmin";
  const isManager = sessionRole === "manager";
  const isEmployee = sessionRole === "employee";
  const isScanner = sessionRole === "scanner";
  const canReviewRequests = isAdmin || isManager;

  useEffect(() => {
    setTab(activeSection);
  }, [activeSection]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const storageKey = "taptu-device-id";
    const existing = localStorage.getItem(storageKey);
    const deviceId = existing ?? `device-${Math.random().toString(36).slice(2, 10)}`;
    if (!existing) {
      localStorage.setItem(storageKey, deviceId);
    }
    setAttendanceCapture((current) => ({ ...current, deviceId }));
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    getDashboard(session.token)
      .then((data: DashboardPayload) => {
        setGreeting(data.greeting);
        setStats(data.stats);
        setSchedule(data.schedule);
        setAttendance(data.attendance);
        setAttendanceState(data.attendanceState ?? "idle");
        setRequests(data.requests);
        setScannerToken(data.scannerToken);
        setDashboardLoaded(true);
        setPageError(null);
      })
      .catch((error) => {
        clearSession();
        setPageError(error instanceof Error ? error.message : "Workspace gagal dimuat.");
        location.assign("/login");
      });
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (tab === "attendance") {
      fetchAttendanceHistoryByFilter(session.token, historyFilter)
        .then((items) => setAttendance(items))
        .catch(() => undefined);
    }

    if (tab === "home" && isAdmin && !adminOverview) {
      fetchAdminOverview(session.token)
        .then((data) => setAdminOverview(data))
        .catch(() => undefined);
    }

    if ((tab === "attendance" || tab === "profile") && isEmployee && !employeeSummary) {
      fetchEmployeeSummary(session.token)
        .then((data) => setEmployeeSummary(data))
        .catch(() => undefined);
    }

    if (tab === "scanner" && !scannerMeta && (isScanner || isAdmin)) {
      fetchScannerState(session.token)
        .then((response) => {
          setScannerToken(response.token);
          setScannerMeta({
            expiresInSeconds: response.expiresInSeconds,
            scansToday: response.scansToday,
            locationName: response.locationName
          });
          setScannerScans(response.recentScans);
        })
        .catch(() => undefined);
    }

    if (tab === "team" && (isAdmin || isManager) && exceptionQueue.length === 0) {
      fetchExceptionQueue(session.token)
        .then((items) => setExceptionQueue(items))
        .catch(() => undefined);
    }

    if (tab === "reports" && (isAdmin || isManager) && auditLogs.length === 0) {
      fetchAuditLogs(session.token)
        .then((items) => setAuditLogs(items))
        .catch(() => undefined);
    }
  }, [adminOverview, auditLogs.length, employeeSummary, exceptionQueue.length, historyFilter, isAdmin, isEmployee, isManager, isScanner, scannerMeta, session, tab]);

  useEffect(() => {
    if (tab !== "scanner" || !scannerMeta) {
      return;
    }

    const timer = window.setInterval(() => {
      setScannerMeta((current) =>
        current
          ? {
              ...current,
              expiresInSeconds: nextScannerCountdown(current.expiresInSeconds)
            }
          : current
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [scannerMeta, tab]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const currentSession = session;

  function setActionMessage(message: string, tone: "ok" | "err" = "ok") {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 2800);
  }

  function updateEmployeeRecord(partial: Partial<AttendanceRecord>, nextState: "idle" | "checked_in" | "checked_out") {
    if (!employeeSummary) {
      return;
    }

    setEmployeeSummary({
      ...employeeSummary,
      currentAttendanceState: nextState,
      todayRecord: {
        ...employeeSummary.todayRecord,
        ...partial,
        updatedAt: new Date().toISOString()
      }
    });
  }

  async function handleVerifyAttendanceDevice() {
    if (!navigator.geolocation) {
      setAttendanceTrustSignal({
        serverTimeSkewMinutes: 0,
        mockLocationDetected: true
      });
      setActionMessage("Perangkat ini tidak mendukung verifikasi lokasi.", "err");
      return;
    }

    setBusyAction("verify-device");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 9000
        });
      });

      const distance = calculateDistanceMeters(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        {
          latitude: secureAttendancePolicy.officeLatitude,
          longitude: secureAttendancePolicy.officeLongitude
        }
      );

      setAttendanceTrustSignal({
        serverTimeSkewMinutes: 0,
        distanceFromOfficeMeters: distance,
        locationAccuracyMeters: position.coords.accuracy,
        mockLocationDetected: false
      });
      setAttendanceCapture((current) => ({
        ...current,
        locationLat: position.coords.latitude,
        locationLng: position.coords.longitude
      }));
      setActionMessage("Verifikasi perangkat selesai.");
    } catch {
      setAttendanceTrustSignal({
        serverTimeSkewMinutes: 0,
        mockLocationDetected: true
      });
      setActionMessage("Lokasi tidak bisa diverifikasi. Izinkan GPS lalu coba lagi.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckIn(method: (typeof attendanceMethods)[number]) {
    setBusyAction(`checkin-${method}`);

    try {
      const response = await checkIn(currentSession.token, {
        method,
        locationLat: attendanceCapture.locationLat,
        locationLng: attendanceCapture.locationLng,
        selfieUrl: attendanceCapture.selfieUrl || undefined,
        deviceId: attendanceCapture.deviceId || undefined,
        scannerToken: method === "QR" ? attendanceCapture.scannerToken || undefined : undefined,
        requiredSelfie: attendanceCapture.requiredSelfie
      });
      setAttendanceState(response.attendanceState);
      setAttendance((current) => [response.record, ...current.filter((item) => item.day !== "Hari ini")]);
      updateEmployeeRecord(
        {
          checkInTime: new Date().toISOString(),
          status: response.record.status === "Terlambat" ? "Terlambat" : "Tepat waktu",
          validationStatus: response.validationStatus ?? "verified",
          validationReasons: response.validationReasons ?? []
        },
        response.attendanceState
      );
      setActionMessage(response.validationStatus === "needs_review" ? "Check-in tersimpan dan masuk exception queue untuk review." : "Check-in berhasil tersimpan.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Check-in gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckOut(method: (typeof attendanceMethods)[number]) {
    setBusyAction(`checkout-${method}`);

    try {
      const response = await checkOut(currentSession.token, {
        method,
        locationLat: attendanceCapture.locationLat,
        locationLng: attendanceCapture.locationLng,
        selfieUrl: attendanceCapture.selfieUrl || undefined,
        deviceId: attendanceCapture.deviceId || undefined,
        scannerToken: method === "QR" ? attendanceCapture.scannerToken || undefined : undefined
      });
      setAttendanceState(response.attendanceState);
      setAttendance((current) => [response.record, ...current.filter((item) => item.day !== "Hari ini")]);
      updateEmployeeRecord(
        {
          checkOutTime: new Date().toISOString(),
          status: "Selesai",
          validationStatus: response.validationStatus ?? "verified",
          validationReasons: response.validationReasons ?? []
        },
        response.attendanceState
      );
      setActionMessage(response.validationStatus === "needs_review" ? "Check-out tersimpan dan perlu review admin." : "Check-out berhasil tersimpan.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Check-out gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  function handleSelfieUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAttendanceCapture((current) => ({ ...current, selfieUrl: previewUrl }));
    setActionMessage("Selfie proof siap dikirim bersama attendance.");
  }

  async function handleCreateRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateRequestForm(requestForm);

    if (validationError) {
      setActionMessage(validationError, "err");
      return;
    }

    setBusyAction("create-request");

    try {
      const response = await createRequest(currentSession.token, requestForm);
      setRequests((current) => [response.request, ...current]);
      setRequestForm({ category: "Izin", startDate: "", endDate: "", title: "", detail: "" });
      setActionMessage("Pengajuan izin berhasil dikirim.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Pengajuan izin gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApproval(id: string, status: "Disetujui" | "Ditolak") {
    setBusyAction(`${status}-${id}`);

    try {
      const response = await approveRequest(currentSession.token, id, status, approvalNotes[id]);
      setRequests((current) => current.map((item) => (item.id === id ? response.request : item)));
      setActionMessage(status === "Disetujui" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Approval gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function reloadRequests() {
    setBusyAction("reload-requests");

    try {
      const next = await fetchRequests(currentSession.token, canReviewRequests);
      setRequests(next);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Daftar pengajuan gagal dimuat.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function openRequestDetail(id: string) {
    setBusyAction(`detail-${id}`);

    try {
      const detail = await fetchRequestDetail(currentSession.token, id);
      setRequestDetail(detail);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Detail pengajuan gagal dimuat.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelRequest(id: string) {
    setBusyAction(`cancel-${id}`);

    try {
      await cancelRequest(currentSession.token, id);
      setRequests((current) => current.filter((item) => item.id !== id));
      if (requestDetail?.id === id) {
        setRequestDetail(null);
      }
      setActionMessage("Pengajuan berhasil dibatalkan.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Pengajuan gagal dibatalkan.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshScannerToken() {
    setBusyAction("refresh-scanner");

    try {
      const response = await refreshScannerToken(currentSession.token);
      setScannerToken(response.token);
      setScannerMeta({
        expiresInSeconds: response.expiresInSeconds,
        scansToday: response.scansToday,
        locationName: response.locationName
      });
      setActionMessage("Token scanner berhasil diperbarui.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Token scanner gagal diperbarui.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExceptionDecision(id: string, status: "Approved" | "Rejected" | "Request Correction") {
    setBusyAction(`exception-${status}-${id}`);

    try {
      const response = await reviewException(currentSession.token, id, {
        status,
        adminNote: exceptionNotes[id] || "Ditinjau dari queue operasional."
      });
      setExceptionQueue((current) =>
        current.map((item) => (item.id === id && response.exception ? response.exception : item))
      );
      setActionMessage("Exception diperbarui.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Exception gagal diperbarui.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  function renderAdminDashboard() {
    if (!adminOverview) {
      return <LoadingState label="Memuat ringkasan admin" />;
    }

    const quickActions = [
      { key: "team", label: "Kelola karyawan", icon: Users },
      { key: "requests", label: "Review approval", icon: TimerReset },
      { key: "scanner", label: "Scanner mode", icon: ScanFace },
      { key: "reports", label: "Buka laporan", icon: FileClock },
      { key: "locations", label: "Atur lokasi", icon: MapPinned }
    ] as const;

    return (
      <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Present today" value={String(adminOverview.checkedInToday)} detail={`${adminOverview.onTimeToday} tepat waktu`} />
          <StatCard label="Late employees" value={String(adminOverview.lateToday)} detail="Perlu follow-up supervisor" />
          <StatCard label="Absent / not checked-in" value={String(adminOverview.absentToday)} detail={`Dari ${adminOverview.totalEmployees} karyawan`} />
          <StatCard label="Pending approvals" value={String(adminOverview.pendingRequests)} detail="Izin dan cuti menunggu keputusan" />
          <StatCard label="Need review" value={String(adminOverview.exceptionCount)} detail="Validasi lokasi atau perangkat" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel eyebrow="Today attendance summary" title="Tim langsung terlihat dari layar pertama">
            {adminOverview.recentActivity.length === 0 ? (
              <EmptyState title="Belum ada aktivitas hadir" description="Aktivitas check-in dan exception akan muncul di sini setelah tim mulai clock-in." />
            ) : (
              <DataTable
                caption="Aktivitas absensi terbaru"
                columns={[
                  { key: "employee", header: "Employee" },
                  { key: "event", header: "Event" },
                  { key: "time", header: "Time" },
                  { key: "status", header: "Status" }
                ]}
                rows={adminOverview.recentActivity.map((item) => ({
                  id: item.id,
                  employee: (
                    <div>
                      <p className="font-black text-[#111827]">{item.employeeName}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{item.detail}</p>
                    </div>
                  ),
                  event: item.event,
                  time: item.time,
                  status: <StatusBadge tone={item.event === "Butuh review" ? "warning" : "info"}>{item.status}</StatusBadge>
                }))}
              />
            )}
          </Panel>

          <Panel eyebrow="Quick actions" title="Operasional HR">
            <div className="grid gap-3">
              {quickActions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    const next = appNavigation.find((entry) => entry.key === item.key);
                    if (next) {
                      setTab(next.key as AppTabKey);
                      navigate(next.path);
                    }
                  }}
                  className="flex items-center justify-between rounded-[22px] border border-[#edf0f5] bg-[#f9fafc] px-4 py-4 text-left transition hover:border-[#d6def0] hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#1769ff] shadow-sm">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#111827]">{item.label}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">Lanjutkan dari shell yang sama.</p>
                    </div>
                  </div>
                  <StatusBadge tone="info">Open</StatusBadge>
                </button>
              ))}
            </div>
          </Panel>
        </section>
      </>
    );
  }

  function renderManagerHome() {
    return (
      <>
        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} detail={item.detail} />
          ))}
        </section>
        <Panel eyebrow="Team dashboard" title="Supervisor view masih dibatasi">
          <EmptyState
            title="Manager memakai view yang lebih ringan"
            description="Gunakan panel ini untuk memantau kehadiran tim, lalu masuk ke tab Absensi atau Izin saat perlu follow-up."
          />
        </Panel>
      </>
    );
  }

  function renderEmployeeAttendance() {
    if (!employeeSummary) {
      return <LoadingState label="Memuat status absensi hari ini" />;
    }

    const validationTone =
      employeeSummary.todayRecord.validationStatus === "verified"
        ? "success"
        : employeeSummary.todayRecord.validationStatus === "needs_review"
          ? "warning"
          : "danger";

    const historyRows = attendance.map((item) => ({
      id: item.id ?? `${item.day}-${item.time}`,
      day: item.day,
      method: item.method,
      time: item.time,
      status: <StatusBadge tone={item.status === "Belum check-in" ? "neutral" : item.status === "Terlambat" ? "warning" : "success"}>{item.status}</StatusBadge>
    }));

    return (
      <>
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel eyebrow="Attendance desk" title="Clock-in cepat, guard tetap ketat">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-bold text-[#596172]">
                  {now.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
                <p className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#111827]">{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge tone="info">{employeeSummary.assignedShift.name}</StatusBadge>
                  <StatusBadge tone={attendanceState === "checked_out" ? "success" : attendanceState === "checked_in" ? "info" : "neutral"}>
                    {attendanceState === "checked_out" ? "Sudah check-out" : attendanceState === "checked_in" ? "Sudah check-in" : "Belum check-in"}
                  </StatusBadge>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#596172]">
                  Shift {employeeSummary.assignedShift.startTime} - {employeeSummary.assignedShift.endTime} · {employeeSummary.assignedShift.locationName}. Timestamp final memakai server, bukan jam di perangkat.
                </p>
                <div className="mt-5 grid gap-3">
                  <FormInput
                    label="Scanner token"
                    value={attendanceCapture.scannerToken}
                    onChange={(event) => setAttendanceCapture((current) => ({ ...current, scannerToken: event.target.value }))}
                    placeholder="Masukkan token QR gate"
                  />
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-[#111827]">Selfie proof</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleSelfieUpload}
                      className="w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-4 py-3 text-sm text-[#111827]"
                    />
                  </label>
                  {attendanceCapture.selfieUrl ? (
                    <div className="flex items-center gap-3 rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] p-3">
                      <img src={attendanceCapture.selfieUrl} alt="Preview selfie attendance" className="h-16 w-16 rounded-2xl object-cover" />
                      <div>
                        <p className="text-sm font-black text-[#111827]">Selfie proof siap</p>
                        <p className="mt-1 text-xs font-semibold text-[#667085]">Disimpan sementara di perangkat. Storage server tetap nullable sampai integrasi upload final.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3">
                {attendanceMethods.map((method) => (
                  <PrimaryButton
                    key={`checkin-${method}`}
                    disabled={attendanceState !== "idle" || busyAction === `checkin-${method}`}
                    onClick={() => handleCheckIn(method)}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    {busyAction === `checkin-${method}` ? "Menyimpan..." : `Check-in ${method}`}
                  </PrimaryButton>
                ))}
                <SecondaryButton
                  disabled={attendanceState !== "checked_in" || busyAction === "checkout-QR"}
                  onClick={() => handleCheckOut("QR")}
                >
                  <Clock3 className="mr-2 h-4 w-4" />
                  {busyAction === "checkout-QR" ? "Menyimpan..." : "Check-out sekarang"}
                </SecondaryButton>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Validation" title="Status lokasi dan perangkat">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#111827]">Current attendance status</p>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      {employeeSummary.todayRecord.checkInTime
                        ? `Check-in tersimpan pada ${new Date(employeeSummary.todayRecord.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                        : "Belum ada record check-in hari ini."}
                    </p>
                    {employeeSummary.todayRecord.validationReasons.length > 0 ? (
                      <p className="mt-2 text-xs font-semibold text-[#8a5c00]">{employeeSummary.todayRecord.validationReasons.join(" · ")}</p>
                    ) : null}
                  </div>
                  <StatusBadge tone={validationTone}>
                    {employeeSummary.todayRecord.validationStatus === "needs_review"
                      ? "Need Review"
                      : employeeSummary.todayRecord.validationStatus === "blocked"
                        ? "Blocked"
                        : "Verified"}
                  </StatusBadge>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-[#1769ff]" />
                  <div>
                    <p className="text-sm font-black text-[#111827]">Location validation status</p>
                    <p className="mt-2 text-sm leading-6 text-[#596172]">{attendanceTrust.detail}</p>
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-[#667085]">
                      <p>Radius kantor: {secureAttendancePolicy.allowedRadiusMeters} meter</p>
                      <p>Jarak saat ini: {attendanceTrustSignal.distanceFromOfficeMeters ?? "Belum dicek"} meter</p>
                      <p>Device ID: {attendanceCapture.deviceId || "Belum dibuat"}</p>
                      <p>Fake GPS: {attendanceTrustSignal.mockLocationDetected ? "Terdeteksi" : "Tidak terdeteksi"}</p>
                    </div>
                  </div>
                </div>
                <SecondaryButton className="mt-4 w-full" disabled={busyAction === "verify-device"} onClick={handleVerifyAttendanceDevice}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {busyAction === "verify-device" ? "Memverifikasi..." : "Verifikasi ulang perangkat"}
                </SecondaryButton>
              </div>

              <div className="rounded-[24px] border border-dashed border-[#d8dde7] bg-white p-4">
                <div className="flex items-start gap-3">
                  <Camera className="mt-1 h-5 w-5 text-[#1769ff]" />
                  <div>
                    <p className="text-sm font-black text-[#111827]">Selfie / proof flow</p>
                    <p className="mt-2 text-sm leading-6 text-[#596172]">
                      Capture dan preview selfie sudah aktif. Upload ke storage backend tetap nullable dan akan disambungkan penuh pada fase lanjutan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </section>

        <Panel eyebrow="Recent history" title="Riwayat absensi terbaru">
          <div className="mb-5 flex flex-wrap gap-2">
            {attendanceFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setHistoryFilter(filter)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                  historyFilter === filter ? "bg-[#111827] text-white" : "bg-[#f1f5ff] text-[#1769ff]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          {historyRows.length === 0 ? (
            <EmptyState title="Belum ada histori absensi" description="Riwayat check-in dan check-out akan muncul setelah tindakan pertama hari ini." />
          ) : (
            <DataTable
              caption="Riwayat absensi employee"
              columns={[
                { key: "day", header: "Hari" },
                { key: "time", header: "Time" },
                { key: "method", header: "Method" },
                { key: "status", header: "Status" }
              ]}
              rows={historyRows}
            />
          )}
        </Panel>
      </>
    );
  }

  function renderAttendanceWorkspace() {
    if (isEmployee) {
      return renderEmployeeAttendance();
    }

    return (
      <Panel eyebrow="Team attendance" title="Monitor kehadiran tanpa membuka laporan penuh">
        {attendance.length === 0 ? (
          <EmptyState title="Belum ada data absensi" description="Clock-in tim akan muncul di sini saat data mulai masuk." />
        ) : (
          <DataTable
            caption="Daftar absensi"
            columns={[
              { key: "day", header: "Hari" },
              { key: "time", header: "Time" },
              { key: "method", header: "Method" },
              { key: "status", header: "Status" }
            ]}
            rows={attendance.map((item) => ({
              id: item.id ?? `${item.day}-${item.time}`,
              day: item.day,
              time: item.time,
              method: item.method,
              status: <StatusBadge tone={item.status === "Terlambat" ? "warning" : item.status === "Belum check-in" ? "neutral" : "success"}>{item.status}</StatusBadge>
            }))}
          />
        )}
      </Panel>
    );
  }

  function renderRequestsWorkspace() {
    return (
      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel eyebrow="Request form" title="Pengajuan tetap dekat dengan attendance flow">
          <form className="grid gap-4" onSubmit={handleCreateRequest}>
            <SelectInput
              label="Kategori"
              value={requestForm.category}
              onChange={(event) => setRequestForm((current) => ({ ...current, category: event.target.value as typeof requestForm.category }))}
            >
              <option value="Izin">Izin</option>
              <option value="Cuti">Cuti</option>
              <option value="Sakit">Sakit</option>
              <option value="Permission">Permission</option>
              <option value="Attendance Correction">Attendance Correction</option>
              <option value="Forgot Check-in/out">Forgot Check-in/out</option>
            </SelectInput>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Tanggal mulai" type="date" value={requestForm.startDate} onChange={(event) => setRequestForm((current) => ({ ...current, startDate: event.target.value }))} />
              <FormInput label="Tanggal selesai" type="date" value={requestForm.endDate} onChange={(event) => setRequestForm((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
            <FormInput label="Judul" value={requestForm.title} onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))} />
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#111827]">Detail</span>
              <textarea
                value={requestForm.detail}
                onChange={(event) => setRequestForm((current) => ({ ...current, detail: event.target.value }))}
                className="min-h-[140px] w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-5 py-4 text-base text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10"
              />
            </label>
            <PrimaryButton type="submit" disabled={busyAction === "create-request"}>
              {busyAction === "create-request" ? "Mengirim..." : "Kirim pengajuan"}
            </PrimaryButton>
          </form>
        </Panel>

        <Panel eyebrow="Approval queue" title="Request yang sedang aktif">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm leading-6 text-[#596172]">Admin melihat seluruh antrean, employee hanya melihat request miliknya.</p>
            <SecondaryButton onClick={reloadRequests} disabled={busyAction === "reload-requests"}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </SecondaryButton>
          </div>
          {requests.length === 0 ? (
            <EmptyState title="Belum ada pengajuan aktif" description="Request baru akan muncul di sini setelah dikirim." />
          ) : (
            <div className="space-y-3">
              {requests.map((item) => (
                <article key={item.id ?? item.title} className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-[#111827]">{item.title}</p>
                      {item.category ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1769ff]">{item.category}</p> : null}
                      <p className="mt-2 text-sm leading-6 text-[#596172]">{item.detail}</p>
                      {item.adminNote ? <p className="mt-2 text-xs font-semibold text-[#667085]">Catatan reviewer: {item.adminNote}</p> : null}
                    </div>
                    <StatusBadge tone={item.status === "Menunggu" ? "warning" : item.status === "Ditolak" ? "danger" : "success"}>{item.status}</StatusBadge>
                  </div>
                  {(isAdmin || isManager) && item.id ? (
                    <div className="mt-4">
                      <FormInput
                        label="Catatan approval"
                        value={approvalNotes[item.id] ?? ""}
                        onChange={(event) => setApprovalNotes((current) => ({ ...current, [item.id!]: event.target.value }))}
                        placeholder="Tambahkan alasan atau catatan reviewer"
                      />
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => item.id && openRequestDetail(item.id)}>Detail</SecondaryButton>
                    {(isAdmin || isManager) && item.id ? (
                      <>
                        <PrimaryButton onClick={() => handleApproval(item.id!, "Disetujui")} disabled={busyAction === `Disetujui-${item.id}`}>
                          Setujui
                        </PrimaryButton>
                        <SecondaryButton onClick={() => handleApproval(item.id!, "Ditolak")} disabled={busyAction === `Ditolak-${item.id}`}>
                          Tolak
                        </SecondaryButton>
                      </>
                    ) : null}
                    {!isAdmin && item.status === "Menunggu" && item.id ? (
                      <SecondaryButton onClick={() => handleCancelRequest(item.id!)} disabled={busyAction === `cancel-${item.id}`}>
                        Batalkan
                      </SecondaryButton>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>
    );
  }

  function renderProfileWorkspace() {
    if (!isEmployee || !employeeSummary) {
      return (
        <Panel eyebrow="Profile" title="Role profile">
          <EmptyState title="Profil ringkas" description="Ringkasan akun dan KPI personal akan ditampilkan lebih dalam pada fase berikutnya." />
        </Panel>
      );
    }

    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total hari hadir" value={String(employeeSummary.totalDays)} detail="Dari histori attendance aktif" />
        <StatCard label="Tepat waktu" value={String(employeeSummary.onTimeDays)} detail="Kinerja sesuai jam shift" />
        <StatCard label="Terlambat" value={String(employeeSummary.lateDays)} detail="Perlu follow-up jika berulang" />
        <StatCard label="Pending request" value={String(employeeSummary.pendingRequests)} detail="Masih menunggu keputusan admin" />
      </section>
    );
  }

  function renderTeamWorkspace() {
    return (
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="Exception queue" title="Attendance exceptions yang perlu keputusan">
          {exceptionQueue.length === 0 ? (
            <EmptyState title="Tidak ada exception aktif" description="Queue ini akan menampung kasus radius, token, selfie, atau device mismatch." />
          ) : (
            <div className="space-y-3">
              {exceptionQueue.map((item) => (
                <article key={item.id} className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-[#111827]">{item.employeeName}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1769ff]">{item.exceptionType}</p>
                      <p className="mt-2 text-sm leading-6 text-[#596172]">{item.reason}</p>
                    </div>
                    <StatusBadge tone={item.status === "Need Review" ? "warning" : item.status === "Rejected" ? "danger" : "success"}>{item.status}</StatusBadge>
                  </div>
                  {(isAdmin || isManager) ? (
                    <div className="mt-4">
                      <FormInput
                        label="Catatan review"
                        value={exceptionNotes[item.id] ?? ""}
                        onChange={(event) => setExceptionNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        placeholder="Tambahkan alasan keputusan"
                      />
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => handleExceptionDecision(item.id, "Approved")} disabled={busyAction === `exception-Approved-${item.id}`}>Approve</PrimaryButton>
                    <SecondaryButton onClick={() => handleExceptionDecision(item.id, "Rejected")} disabled={busyAction === `exception-Rejected-${item.id}`}>Reject</SecondaryButton>
                    <SecondaryButton onClick={() => handleExceptionDecision(item.id, "Request Correction")} disabled={busyAction === `exception-Request Correction-${item.id}`}>Request correction</SecondaryButton>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Exception types" title="Apa yang sedang divalidasi">
          <div className="grid gap-3">
            {[
              "Outside radius",
              "Late check-in",
              "Invalid QR",
              "Expired QR",
              "Different device",
              "Missing selfie"
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-[#edf0f5] bg-white p-4">
                <p className="text-sm font-black text-[#111827]">{item}</p>
                <p className="mt-2 text-sm leading-6 text-[#667085]">Kasus ini tidak dibuang. Taptu menyimpannya sebagai exception agar HR tetap bisa memutuskan dengan jejak audit.</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    );
  }

  function renderScannerWorkspace() {
    return (
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel eyebrow="Scanner mode" title="Gate kiosk aktif">
          <div className="rounded-[26px] border border-[#111827] bg-[#111827] p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8bb8ff]">Token aktif</p>
                <p className="mt-3 text-4xl font-black tracking-[-0.04em]">{scannerToken ?? "HDR-000-000"}</p>
                <p className="mt-3 text-sm leading-7 text-[#cbd5e1]">
                  Token dinamis ini dipakai scanner gate. Attempt invalid atau expired akan masuk audit dan exception flow.
                </p>
              </div>
              <ScanFace className="h-8 w-8 text-[#8bb8ff]" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8bb8ff]">Countdown</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{scannerMeta?.expiresInSeconds ?? 30}s</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8bb8ff]">Status</p>
                <p className="mt-2 text-xl font-black">{scannerMeta?.expiresInSeconds === 0 ? "Expired" : "Active"}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8bb8ff]">Lokasi</p>
                <p className="mt-2 text-xl font-black">{scannerMeta?.locationName ?? "Gerbang Utama"}</p>
              </div>
            </div>
            <PrimaryButton className="mt-6" onClick={handleRefreshScannerToken} disabled={busyAction === "refresh-scanner"}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {busyAction === "refresh-scanner" ? "Memperbarui..." : "Refresh token"}
            </PrimaryButton>
          </div>
        </Panel>

        <Panel eyebrow="Recent scans" title="Status scan terakhir">
          {scannerScans.length === 0 ? (
            <EmptyState title="Belum ada scan terbaru" description="Scan sukses, invalid, atau expired akan masuk ke daftar operasional ini." />
          ) : (
            <div className="grid gap-3">
              {scannerScans.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-[#edf0f5] bg-[#f9fafc] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#111827]">{item.employeeName}</p>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">{item.detail}</p>
                    </div>
                    <StatusBadge tone={item.status === "success" ? "success" : item.status === "expired" ? "warning" : "danger"}>{item.status}</StatusBadge>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">{item.time}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    );
  }

  function renderLocationsWorkspace() {
    return (
      <Panel eyebrow="Geofence logic" title="Validasi lokasi kerja">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Work location" value="Kantor Pusat" detail="Radius 150 meter" />
          <StatCard label="Current distance" value={`${attendanceTrustSignal.distanceFromOfficeMeters ?? 0} m`} detail="Diambil dari perangkat employee saat verifikasi" />
          <StatCard label="Validation mode" value="Persist then review" detail="Di luar radius membuat exception, bukan langsung hilang." />
        </div>
      </Panel>
    );
  }

  function renderReportsWorkspace() {
    return (
      <Panel eyebrow="Audit trail" title="Jejak keputusan operasional">
        {auditLogs.length === 0 ? (
          <EmptyState title="Belum ada audit log" description="Approve/reject exception, approval request, dan scanner invalid attempt akan tampil di sini." />
        ) : (
          <DataTable
            caption="Audit logs"
            columns={[
              { key: "action", header: "Action" },
              { key: "actor", header: "Actor" },
              { key: "detail", header: "Detail" },
              { key: "time", header: "Time" }
            ]}
            rows={auditLogs.map((item) => ({
              id: item.id,
              action: item.action,
              actor: `${item.actorName} · ${item.actorRole}`,
              detail: item.detail,
              time: new Date(item.createdAt).toLocaleString("id-ID")
            }))}
          />
        )}
      </Panel>
    );
  }

  function renderPlaceholder(title: string, description: string) {
    return (
      <Panel eyebrow="In progress" title={title}>
        <EmptyState title={title} description={description} />
      </Panel>
    );
  }

  function renderTabContent() {
    if (pageError) {
      return <ErrorState title="Workspace gagal dimuat" description={pageError} />;
    }

    if (!dashboardLoaded) {
      return <LoadingState label="Memuat workspace" />;
    }

    if (tab === "home") {
      if (isAdmin) {
        return renderAdminDashboard();
      }
      if (isManager) {
        return renderManagerHome();
      }
    }

    if (tab === "attendance") {
      return renderAttendanceWorkspace();
    }

    if (tab === "requests") {
      return renderRequestsWorkspace();
    }

    if (tab === "profile") {
      return renderProfileWorkspace();
    }

    if (tab === "scanner") {
      return renderScannerWorkspace();
    }

    if (tab === "team") {
      return renderTeamWorkspace();
    }

    if (tab === "locations") {
      return renderLocationsWorkspace();
    }

    if (tab === "reports") {
      return renderReportsWorkspace();
    }

    return renderPlaceholder("Workspace", "Halaman ini belum memiliki modul khusus untuk role aktif.");
  }

  return (
    <AppShell
      user={{
        fullName: currentSession.user.fullName,
        organizationName: currentSession.user.organizationName,
        roleLabel: roleLabels[currentSession.user.role]
      }}
      navigation={appNavigation}
      activeKey={tab}
      onNavigate={(item) => {
        setTab(item.key as AppTabKey);
        navigate(item.path);
      }}
      actions={
        <SecondaryButton
          onClick={() => {
            clearSession();
            location.assign("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </SecondaryButton>
      }
    >
      <PageHeader
        eyebrow={`${roleLabels[currentSession.user.role]} workspace`}
        title={greeting || `Halo, ${currentSession.user.fullName}`}
        description={`${currentSession.user.organizationName} · Attendance desk dengan guard waktu, lokasi, dan integritas perangkat.`}
      />

      {feedback ? (
        <div
          className={`rounded-[22px] border px-4 py-3 text-sm shadow-[0_12px_32px_rgba(20,24,31,0.06)] ${
            feedback.tone === "err"
              ? "border-[#f2caca] bg-[#fff5f5] text-[#8a2f2f]"
              : "border-[#d7e5ff] bg-white text-[#174ea6]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {renderTabContent()}

      <Dialog title={requestDetail?.title ?? "Detail pengajuan"} open={Boolean(requestDetail)} onClose={() => setRequestDetail(null)}>
        {requestDetail ? (
          <div className="space-y-4">
            <StatusBadge tone={requestDetail.status === "Menunggu" ? "warning" : requestDetail.status === "Ditolak" ? "danger" : "success"}>{requestDetail.status}</StatusBadge>
            {requestDetail.category ? <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1769ff]">{requestDetail.category}</p> : null}
            <p className="text-sm leading-7 text-[#596172]">{requestDetail.detail}</p>
            {requestDetail.startDate ? (
              <p className="text-sm font-semibold text-[#111827]">
                {requestDetail.startDate} {requestDetail.endDate ? `- ${requestDetail.endDate}` : ""}
              </p>
            ) : null}
            {requestDetail.adminNote ? <p className="text-sm font-semibold text-[#667085]">Catatan reviewer: {requestDetail.adminNote}</p> : null}
          </div>
        ) : null}
      </Dialog>
    </AppShell>
  );
}
