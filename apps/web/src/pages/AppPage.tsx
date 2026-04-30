import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bell, Clock3, LogOut, MapPinned, QrCode, ScanFace, ShieldCheck, TrendingUp, Users } from "lucide-react";

import type {
  AdminOverview,
  AttendanceTimelineItem,
  DashboardPayload,
  DashboardScheduleItem,
  DashboardStat,
  EmployeeSummary,
  LeaveRequestItem
} from "@taptu/shared";

import { Button } from "../components/Button";
import { Shell } from "../components/Shell";
import { StatusPill } from "../components/StatusPill";
import {
  approveRequest,
  cancelRequest,
  checkIn,
  checkOut,
  createRequest,
  fetchAdminOverview,
  fetchAttendanceHistoryByFilter,
  fetchRequestDetail,
  fetchAttendanceHistory,
  fetchEmployeeSummary,
  fetchRequests,
  getDashboard,
  refreshScannerToken
} from "../lib/api";
import { getTabsForRole, transitionTab, type AppTabKey } from "../lib/appShellState";
import { formatAttendanceGroupLabel, groupAttendanceHistory, nextScannerCountdown, validateRequestForm } from "../lib/mobileWorkflow";
import { clearSession, readSession } from "../lib/session";

const attendanceMethods = ["QR", "GPS", "Selfie"] as const;
const attendanceFilters = ["all", "present", "issue"] as const;

export function AppPage() {
  const session = readSession();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [schedule, setSchedule] = useState<DashboardScheduleItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceTimelineItem[]>([]);
  const [attendanceState, setAttendanceState] = useState<"idle" | "checked_in" | "checked_out">("idle");
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [scannerToken, setScannerToken] = useState<string | undefined>();
  const [scannerMeta, setScannerMeta] = useState<{ expiresInSeconds: number; scansToday: number; locationName: string } | null>(null);
  const [greeting, setGreeting] = useState("");
  const [tab, setTab] = useState<AppTabKey>("home");
  const [requestForm, setRequestForm] = useState({
    category: "Izin" as "Izin" | "Cuti" | "Sakit",
    startDate: "",
    endDate: "",
    title: "",
    detail: ""
  });
  const [requestDetail, setRequestDetail] = useState<LeaveRequestItem | null>(null);
  const [historyFilter, setHistoryFilter] = useState<(typeof attendanceFilters)[number]>("all");
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: "ok" | "err" } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const groupedAttendance = groupAttendanceHistory(attendance);

  const tabs = useMemo(() => getTabsForRole(session?.user.role ?? "employee"), [session?.user.role]);
  const scannerRoleActive = session?.user.role === "scanner";
  const isAdmin = session?.user.role === "admin" || session?.user.role === "superadmin";

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
      })
      .catch(() => {
        clearSession();
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

    if (tab === "scanner" && scannerRoleActive && !scannerMeta) {
      refreshScannerToken(session.token)
        .then((response) => {
          setScannerToken(response.token);
          setScannerMeta({
            expiresInSeconds: response.expiresInSeconds,
            scansToday: response.scansToday,
            locationName: response.locationName
          });
        })
        .catch(() => undefined);
    }

    if (tab === "home" && isAdmin && !adminOverview) {
      fetchAdminOverview(session.token)
        .then((data) => setAdminOverview(data))
        .catch(() => undefined);
    }

    if (tab === "profile" && !employeeSummary) {
      fetchEmployeeSummary(session.token)
        .then((data) => setEmployeeSummary(data))
        .catch(() => undefined);
    }
  }, [historyFilter, scannerMeta, scannerRoleActive, session, tab, isAdmin, adminOverview, employeeSummary]);

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
  const isScanner = currentSession.user.role === "scanner";

  function toneForStatus(status: AttendanceTimelineItem["status"] | LeaveRequestItem["status"]) {
    if (status === "Terlambat" || status === "Menunggu") {
      return "amber" as const;
    }
    if (status === "Belum check-in" || status === "Ditolak") {
      return "slate" as const;
    }
    return "green" as const;
  }

  function setActionMessage(message: string, tone: "ok" | "err" = "ok") {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 2800);
  }

  async function handleCheckIn(method: (typeof attendanceMethods)[number]) {
    setBusyAction(`checkin-${method}`);

    try {
      const response = await checkIn(currentSession.token, method);
      setAttendanceState(response.attendanceState);
      setAttendance((current) => [response.record, ...current.filter((item) => item.day !== "Hari ini")]);
      setStats((current) =>
        current.map((item) => (item.label === "Status Hari Ini" ? { ...item, value: "Check-in", detail: `Masuk ${response.record.time} WIB via ${method}` } : item))
      );
      setActionMessage("Check-in berhasil tersimpan.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Check-in gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckOut(method: (typeof attendanceMethods)[number]) {
    setBusyAction(`checkout-${method}`);

    try {
      const response = await checkOut(currentSession.token, method);
      setAttendanceState(response.attendanceState);
      setAttendance((current) => [response.record, ...current.filter((item) => item.day !== "Hari ini")]);
      setStats((current) =>
        current.map((item) => (item.label === "Status Hari Ini" ? { ...item, value: "Check-out", detail: `Pulang ${response.record.time} WIB via ${method}` } : item))
      );
      setActionMessage("Check-out berhasil tersimpan.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Check-out gagal.", "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateRequestForm(requestForm);

    if (validationError) {
      setActionMessage(validationError);
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
      const response = await approveRequest(currentSession.token, id, status);
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
      const next = await fetchRequests(currentSession.token, isAdmin);
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

  return (
    <Shell>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
        <header className="flex flex-col gap-5 rounded-[30px] border border-[#dbe5dc] bg-white p-5 shadow-panel md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-moss">{currentSession.user.role} workspace</p>
            <h1 className="font-display mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{greeting || `Halo, ${currentSession.user.fullName}`}</h1>
            <p className="mt-2 text-base text-[#63746d]">{currentSession.user.organizationName} · Responsive PWA untuk website dan mobile wrapper.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              clearSession();
              location.assign("/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </header>

        {feedback ? (
          <div
            className={`rounded-[24px] border px-4 py-3 text-sm shadow-panel ${
              feedback.tone === "err"
                ? "border-[#f0d9d9] bg-[#fdf4f4] text-[#7a3535]"
                : "border-[#d9e2da] bg-white text-[#2b3e37]"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <nav className="sticky top-4 z-10 rounded-[28px] border border-[#dbe4da] bg-white/92 p-2 shadow-panel backdrop-blur">
          <div className={`grid gap-2 ${tabs.length >= 5 ? "grid-cols-5" : "grid-cols-4"}`}>
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setTab((current) =>
                    transitionTab(currentSession.user.role, current, {
                      type:
                        item.key === "home"
                          ? "OPEN_HOME"
                          : item.key === "attendance"
                            ? "OPEN_ATTENDANCE"
                            : item.key === "requests"
                              ? "OPEN_REQUESTS"
                              : item.key === "scanner"
                                ? "OPEN_SCANNER"
                                : "OPEN_PROFILE"
                    })
                  )
                }
                className={`flex flex-col items-center justify-center rounded-[22px] px-3 py-3 text-center text-xs font-semibold transition ${
                  tab === item.key ? "bg-ink text-white" : "text-[#5c6d67] hover:bg-[#f3f6f1]"
                }`}
              >
                <item.icon className="mb-2 h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {tab === "home" ? (
          <>
            {isAdmin && adminOverview ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total Karyawan", value: String(adminOverview.totalEmployees), detail: "Terdaftar dalam sistem" },
                  { label: "Hadir Hari Ini", value: String(adminOverview.checkedInToday), detail: `${adminOverview.onTimeToday} tepat waktu · ${adminOverview.lateToday} terlambat` },
                  { label: "Tingkat Kehadiran", value: adminOverview.totalEmployees > 0 ? `${Math.round((adminOverview.checkedInToday / adminOverview.totalEmployees) * 100)}%` : "0%", detail: "Dari total karyawan aktif" },
                  { label: "Permintaan Pending", value: String(adminOverview.pendingRequests), detail: "Menunggu approval admin" }
                ].map((item) => (
                  <article key={item.label} className="rounded-[28px] border border-[#dfe6de] bg-white p-5 shadow-panel sm:p-6">
                    <p className="text-sm font-semibold text-[#52645d]">{item.label}</p>
                    <p className="font-display mt-4 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">{item.value}</p>
                    <p className="mt-3 text-sm leading-6 text-[#667770]">{item.detail}</p>
                  </article>
                ))}
              </section>
            ) : !isAdmin ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stats.map((item) => (
                  <article key={item.label} className="rounded-[28px] border border-[#dfe6de] bg-white p-5 shadow-panel sm:p-6">
                    <p className="text-sm font-semibold text-[#52645d]">{item.label}</p>
                    <p className="font-display mt-4 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">{item.value}</p>
                    <p className="mt-3 text-sm leading-6 text-[#667770]">{item.detail}</p>
                  </article>
                ))}
              </section>
            ) : null}

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              {isAdmin && adminOverview ? (
                <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Ringkasan kehadiran</p>
                      <h2 className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-ink sm:text-2xl">Aktivitas hari ini langsung dari store yang aktif.</h2>
                    </div>
                    <Users className="h-6 w-6 text-moss" />
                  </div>
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink">Check-in rate</span>
                      <span className="text-[#5d6e67]">
                        {adminOverview.checkedInToday} / {adminOverview.totalEmployees} karyawan
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[#eef2ee]">
                      <div
                        className="h-full rounded-full bg-[#2d5246] transition-all"
                        style={{ width: adminOverview.totalEmployees > 0 ? `${Math.round((adminOverview.checkedInToday / adminOverview.totalEmployees) * 100)}%` : "0%" }}
                      />
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Tepat waktu", value: adminOverview.onTimeToday, color: "text-[#2d5246]" },
                      { label: "Terlambat", value: adminOverview.lateToday, color: "text-[#8a5c2e]" },
                      { label: "Belum hadir", value: Math.max(0, adminOverview.totalEmployees - adminOverview.checkedInToday), color: "text-[#5c5c6a]" }
                    ].map((item) => (
                      <div key={item.label} className="rounded-[22px] border border-[#e4ebe4] bg-[#fbfcf8] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#667770]">{item.label}</p>
                        <p className={`font-display mt-2 text-2xl font-semibold tracking-[-0.04em] ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Fokus hari ini</p>
                      <h2 className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-ink sm:text-2xl">Absensi, izin, dan scanner berjalan dari satu fondasi yang sama.</h2>
                    </div>
                    <Bell className="h-6 w-6 text-moss" />
                  </div>
                  <div className="mt-7 grid gap-4 md:grid-cols-3">
                    {[
                      [QrCode, "Check-in cepat", "Tombol hadir dan pulang sekarang punya state yang jelas."],
                      [MapPinned, "Izin lebih rapi", "Employee kirim pengajuan, admin review dari panel yang sama."],
                      [ScanFace, "Scanner aktif", "Token QR bisa di-refresh dari mode scanner kapan saja."]
                    ].map(([Icon, title, detail]) => (
                      <div key={title as string} className="rounded-[24px] border border-[#e4ebe4] bg-[#fbfcf8] p-5">
                        <Icon className="h-10 w-10 rounded-2xl bg-white p-2.5 text-moss shadow-sm" />
                        <h3 className="mt-5 text-lg font-semibold text-ink">{title as string}</h3>
                        <p className="mt-3 text-sm leading-6 text-[#62736d]">{detail as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[30px] border border-[#dae5db] bg-[#12261f] p-5 text-white shadow-panel sm:p-6">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-6 w-6 text-[#97d7be]" />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#97d7be]">Rencana kerja</p>
                    <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Flow mobile utama yang sekarang sudah aktif</h2>
                  </div>
                </div>
                <div className="mt-7 space-y-4">
                  {schedule.map((item) => (
                    <div key={item.time + item.title} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-lg font-semibold">{item.time}</p>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[#bdd9cc]">Aktif</span>
                      </div>
                      <p className="mt-4 text-base font-medium">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#b8cec3]">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "attendance" ? (
          <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[30px] border border-[#dae5db] bg-[#10211c] p-5 text-white shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#97d7be]">Absensi hari ini</p>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.03em]">Check-in dan check-out sekarang sudah punya jalur aksi nyata.</h2>
              <p className="mt-4 text-sm leading-7 text-[#b9cfc5]">Pilih metode yang cocok untuk shift hari ini. Guard state akan menolak transisi yang tidak valid.</p>
              <div className="mt-6 grid gap-3">
                {attendanceMethods.map((method) => (
                  <div key={method} className="grid gap-3 sm:grid-cols-2">
                    <Button className="w-full" disabled={attendanceState !== "idle" || busyAction !== null} onClick={() => handleCheckIn(method)}>
                      {busyAction === `checkin-${method}` ? "Memproses..." : `Check-in via ${method}`}
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full border-white/20 bg-white/8 text-white hover:bg-white/12"
                      disabled={attendanceState !== "checked_in" || busyAction !== null}
                      onClick={() => handleCheckOut(method)}
                    >
                      {busyAction === `checkout-${method}` ? "Memproses..." : `Check-out via ${method}`}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-semibold">State saat ini</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#d3e2db]">{attendanceState}</span>
                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#d3e2db]">Shift Pagi</span>
                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#d3e2db]">Lokasi utama</span>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Riwayat singkat</p>
                  <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">Jejak kehadiran terbaru</h2>
                </div>
                <ShieldCheck className="h-6 w-6 text-moss" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {attendanceFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setHistoryFilter(filter)}
                    className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                      historyFilter === filter ? "bg-ink text-white" : "border border-[#dfe6de] bg-[#fbfcfa] text-[#5d6d66]"
                    }`}
                  >
                    {filter === "all" ? "Semua" : filter === "present" ? "Tepat waktu" : "Perlu perhatian"}
                  </button>
                ))}
              </div>
              <div className="mt-6 space-y-4">
                {groupedAttendance.map((group) => (
                  <div key={group.day}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#6a7b75]">
                      {formatAttendanceGroupLabel(group.day, group.items.length)}
                    </p>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <article key={`${item.day}-${item.time}-${item.method}`} className="rounded-[24px] border border-[#e6ece5] bg-[#fbfcfa] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">{item.time}</p>
                              <p className="mt-1 text-sm text-[#667770]">{item.day}</p>
                            </div>
                            <StatusPill tone={toneForStatus(item.status)}>{item.status}</StatusPill>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm text-[#576863]">
                            <span>Metode {item.method}</span>
                            <span>Sinkron</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "requests" ? (
          <section className="grid gap-5 xl:grid-cols-[0.82fr_1fr_0.78fr]">
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Pengajuan dan approval</p>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">
                {isAdmin ? "Admin bisa review pengajuan langsung dari panel ini." : "Karyawan bisa kirim izin tanpa keluar dari mobile workspace."}
              </h2>
              {isAdmin ? (
                <div className="mt-6 grid gap-3">
                  <Button className="w-full" disabled={busyAction === "reload-requests"} onClick={reloadRequests}>
                    {busyAction === "reload-requests" ? "Memuat..." : "Muat ulang daftar pengajuan"}
                  </Button>
                </div>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={handleCreateRequest}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#31423b]">Tipe</span>
                      <select
                        value={requestForm.category}
                        onChange={(event) => setRequestForm((current) => ({ ...current, category: event.target.value as "Izin" | "Cuti" | "Sakit" }))}
                        className="w-full rounded-2xl border border-[#d6ddd6] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-moss"
                      >
                        <option value="Izin">Izin</option>
                        <option value="Cuti">Cuti</option>
                        <option value="Sakit">Sakit</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#31423b]">Mulai</span>
                      <input
                        type="date"
                        value={requestForm.startDate}
                        onChange={(event) => setRequestForm((current) => ({ ...current, startDate: event.target.value }))}
                        className="w-full rounded-2xl border border-[#d6ddd6] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-moss"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#31423b]">Selesai</span>
                      <input
                        type="date"
                        value={requestForm.endDate}
                        onChange={(event) => setRequestForm((current) => ({ ...current, endDate: event.target.value }))}
                        className="w-full rounded-2xl border border-[#d6ddd6] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-moss"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#31423b]">Judul pengajuan</span>
                    <input
                      value={requestForm.title}
                      onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-2xl border border-[#d6ddd6] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-moss"
                      placeholder="Contoh: Izin pribadi"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#31423b]">Detail</span>
                    <textarea
                      value={requestForm.detail}
                      onChange={(event) => setRequestForm((current) => ({ ...current, detail: event.target.value }))}
                      className="min-h-[120px] w-full rounded-2xl border border-[#d6ddd6] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-moss"
                      placeholder="Tuliskan alasan dan waktu pengajuan."
                    />
                  </label>
                  <Button className="w-full" type="submit" disabled={busyAction === "create-request"}>
                    {busyAction === "create-request" ? "Mengirim..." : "Kirim pengajuan"}
                  </Button>
                </form>
              )}
            </div>
            <div className="space-y-3">
              {requests.map((item) => (
                <article key={item.id ?? item.title} className="rounded-[28px] border border-[#dfe6de] bg-white p-5 shadow-panel">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                      {item.requester ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-moss">{item.requester}</p> : null}
                      <p className="mt-3 text-sm leading-7 text-[#62726c]">{item.detail}</p>
                    </div>
                    <StatusPill tone={toneForStatus(item.status)}>{item.status}</StatusPill>
                  </div>
                  {item.id ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="secondary" disabled={busyAction === `detail-${item.id}`} onClick={() => openRequestDetail(item.id!)}>
                        {busyAction === `detail-${item.id}` ? "Memuat..." : "Lihat detail"}
                      </Button>
                      {!isAdmin && item.status === "Menunggu" ? (
                        <Button variant="secondary" disabled={busyAction === `cancel-${item.id}`} onClick={() => handleCancelRequest(item.id!)}>
                          {busyAction === `cancel-${item.id}` ? "Membatalkan..." : "Batalkan"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {isAdmin && item.status === "Menunggu" && item.id ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Button disabled={busyAction === `Disetujui-${item.id}`} onClick={() => handleApproval(item.id!, "Disetujui")}>
                        {busyAction === `Disetujui-${item.id}` ? "Memproses..." : "Setujui"}
                      </Button>
                      <Button variant="secondary" disabled={busyAction === `Ditolak-${item.id}`} onClick={() => handleApproval(item.id!, "Ditolak")}>
                        {busyAction === `Ditolak-${item.id}` ? "Memproses..." : "Tolak"}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Detail pengajuan</p>
              {requestDetail ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Judul</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{requestDetail.title}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Tipe</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{requestDetail.category ?? "-"}</p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Mulai</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{requestDetail.startDate ?? "-"}</p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Selesai</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{requestDetail.endDate ?? "-"}</p>
                    </div>
                  </div>
                  {requestDetail.requester ? (
                    <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Pengaju</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{requestDetail.requester}</p>
                    </div>
                  ) : null}
                  <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Status</p>
                    <div className="mt-3">
                      <StatusPill tone={toneForStatus(requestDetail.status)}>{requestDetail.status}</StatusPill>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Catatan</p>
                    <p className="mt-3 text-sm leading-7 text-[#5f706a]">{requestDetail.detail}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-dashed border-[#d8e0d8] bg-[#fbfcfa] px-4 py-6 text-sm leading-7 text-[#60716b]">
                  Pilih salah satu pengajuan untuk melihat detailnya di panel ini.
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === "scanner" ? (
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[34px] border border-[#0f2b22] bg-[#10211c] p-5 text-white shadow-panel sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#97d7be]">Mode scanner</p>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.03em]">Tampilan scanner dibuat lebih fokus, lebih besar, dan lebih siap dipakai di lapangan.</h2>
              <div className="mt-6 rounded-[30px] border border-white/10 bg-[#173229] p-6">
                <p className="text-sm text-[#a4cbbc]">Token aktif</p>
                <p className="font-display mt-4 text-5xl font-semibold tracking-[0.14em] sm:text-6xl">{scannerToken ?? "HDR-31A-7XZ"}</p>
                <div className="mt-6 rounded-[24px] border border-dashed border-[#2a4c41] bg-[#10261f] px-4 py-10 text-center">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8fbcae]">Area QR fullscreen</p>
                  <div className="mx-auto mt-5 flex h-56 w-full max-w-[320px] items-center justify-center rounded-[28px] border border-white/10 bg-[#0d1d18]">
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <div key={index} className={`h-8 w-8 rounded-[8px] ${index % 3 === 0 || index % 5 === 0 ? "bg-white" : "bg-[#2d4b41]"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#bad1c8]">Auto refresh siap dipakai untuk scanner PWA fullscreen di iPad atau tablet front desk.</p>
                <Button className="mt-5 w-full" disabled={busyAction === "refresh-scanner"} onClick={handleRefreshScannerToken}>
                  {busyAction === "refresh-scanner" ? "Memperbarui..." : "Refresh token scanner"}
                </Button>
              </div>
            </div>
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Status scanner</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#657670]">TTL</p>
                  <p className="font-display mt-2 text-2xl text-ink">{scannerMeta?.expiresInSeconds ?? 30}s</p>
                </div>
                <div className="rounded-[22px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#657670]">Scan hari ini</p>
                  <p className="font-display mt-2 text-2xl text-ink">{scannerMeta?.scansToday ?? 124}</p>
                </div>
                <div className="rounded-[22px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#657670]">Lokasi</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{scannerMeta?.locationName ?? "Gerbang Utama"}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {attendance.map((item) => (
                  <article key={`${item.day}-${item.time}-${item.method}`} className="rounded-[24px] border border-[#e6ece5] bg-[#fbfcfa] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.day}</p>
                        <p className="mt-1 text-sm text-[#667770]">{item.time}</p>
                      </div>
                      <StatusPill tone={toneForStatus(item.status)}>{item.status}</StatusPill>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "profile" ? (
          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Profil akun</p>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">{currentSession.user.fullName}</h2>
              <div className="mt-6 space-y-4 text-sm text-[#61726c]">
                <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Email</p>
                  <p className="mt-2 font-medium text-ink">{currentSession.user.email}</p>
                </div>
                <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Organisasi</p>
                  <p className="mt-2 font-medium text-ink">{currentSession.user.organizationName}</p>
                </div>
                <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64756e]">Role</p>
                  <p className="mt-2 font-medium capitalize text-ink">{currentSession.user.role}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Ringkasan kehadiran</p>
                <TrendingUp className="h-5 w-5 text-moss" />
              </div>
              {employeeSummary ? (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Total Hadir", value: String(employeeSummary.totalDays), color: "text-ink" },
                      { label: "Tepat Waktu", value: String(employeeSummary.onTimeDays), color: "text-[#2d5246]" },
                      { label: "Terlambat", value: String(employeeSummary.lateDays), color: "text-[#8a5c2e]" }
                    ].map((item) => (
                      <div key={item.label} className="rounded-[22px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#667770]">{item.label}</p>
                        <p className={`font-display mt-2 text-2xl font-semibold tracking-[-0.04em] ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#667770]">Izin pending</p>
                      <p className="font-display mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">{employeeSummary.pendingRequests}</p>
                    </div>
                    <div className="rounded-[22px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#667770]">Status hari ini</p>
                      <p className="mt-2 text-sm font-semibold capitalize text-ink">
                        {employeeSummary.currentAttendanceState === "idle"
                          ? "Belum check-in"
                          : employeeSummary.currentAttendanceState === "checked_in"
                            ? "Sudah check-in"
                            : "Sudah check-out"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-5 space-y-3">
                  {["Tingkat kehadiran", "Izin yang disetujui", "Riwayat check-in bulan ini"].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-[22px] bg-[#f2f4f2]" />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
