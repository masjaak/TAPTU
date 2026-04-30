import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Bell,
  Clock3,
  Home,
  LogOut,
  MapPinned,
  QrCode,
  ScanFace,
  ShieldCheck,
  TimerReset,
  UserRound
} from "lucide-react";

import type { AttendanceTimelineItem, DashboardPayload, DashboardStat, LeaveRequestItem } from "@taptu/shared";

import { Button } from "../components/Button";
import { Shell } from "../components/Shell";
import { StatusPill } from "../components/StatusPill";
import { clearSession, readSession } from "../lib/session";
import { getDashboard } from "../lib/api";

type TabKey = "home" | "attendance" | "requests" | "scanner" | "profile";

export function AppPage() {
  const session = readSession();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [schedule, setSchedule] = useState<Array<{ time: string; title: string; detail: string }>>([]);
  const [attendance, setAttendance] = useState<AttendanceTimelineItem[]>([]);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [scannerToken, setScannerToken] = useState<string | undefined>();
  const [greeting, setGreeting] = useState("");
  const [tab, setTab] = useState<TabKey>("home");

  const tabs = useMemo(() => {
    const base = [
      { key: "home" as const, label: "Beranda", icon: Home },
      { key: "attendance" as const, label: "Absensi", icon: QrCode },
      { key: "requests" as const, label: "Izin", icon: TimerReset }
    ];

    if (session?.user.role === "scanner") {
      return [...base, { key: "scanner" as const, label: "Scanner", icon: ScanFace }, { key: "profile" as const, label: "Profil", icon: UserRound }];
    }

    return [...base, { key: "profile" as const, label: "Profil", icon: UserRound }];
  }, [session?.user.role]);

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
        setRequests(data.requests);
        setScannerToken(data.scannerToken);
      })
      .catch(() => {
        clearSession();
        location.assign("/login");
      });
  }, [session]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  function toneForStatus(status: AttendanceTimelineItem["status"] | LeaveRequestItem["status"]) {
    if (status === "Terlambat" || status === "Menunggu") {
      return "amber" as const;
    }
    if (status === "Belum check-in" || status === "Ditolak") {
      return "slate" as const;
    }
    return "green" as const;
  }

  return (
    <Shell>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
        <header className="flex flex-col gap-5 rounded-[30px] border border-[#dbe5dc] bg-white p-5 shadow-panel md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss">{session.user.role} workspace</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{greeting || `Halo, ${session.user.fullName}`}</h1>
            <p className="mt-2 text-base text-[#63746d]">
              {session.user.organizationName} · Responsive PWA untuk website dan mobile wrapper.
            </p>
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

        <nav className="sticky top-4 z-10 rounded-[28px] border border-[#dbe4da] bg-white/92 p-2 shadow-panel backdrop-blur">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
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
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stats.map((item) => (
                <article key={item.label} className="rounded-[28px] border border-[#dfe6de] bg-white p-5 shadow-panel sm:p-6">
                  <p className="text-sm font-semibold text-[#52645d]">{item.label}</p>
                  <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">{item.value}</p>
                  <p className="mt-3 text-sm leading-6 text-[#667770]">{item.detail}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Fokus hari ini</p>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-ink sm:text-2xl">Flow absensi yang siap diteruskan ke produk penuh.</h2>
                  </div>
                  <Bell className="h-6 w-6 text-moss" />
                </div>
                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  {[
                    [QrCode, "QR token aman", "Refresh tiap 30 detik dan siap offline queue."],
                    [MapPinned, "GPS dan radius", "Fondasi lokasi kerja dan validasi check-in."],
                    [ScanFace, "Selfie evidence", "Siap diarahkan ke storage produksi."]
                  ].map(([Icon, title, detail]) => (
                    <div key={title as string} className="rounded-[24px] border border-[#e4ebe4] bg-[#fbfcf8] p-5">
                      <Icon className="h-10 w-10 rounded-2xl bg-white p-2.5 text-moss shadow-sm" />
                      <h3 className="mt-5 text-lg font-semibold text-ink">{title as string}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#62736d]">{detail as string}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-[#dae5db] bg-[#12261f] p-5 text-white shadow-panel sm:p-6">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-6 w-6 text-[#97d7be]" />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#97d7be]">Rencana implementasi</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Baseline sprint pertama</h2>
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
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[30px] border border-[#dae5db] bg-[#10211c] p-5 text-white shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#97d7be]">Absensi hari ini</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Masuk kerja tanpa langkah yang bikin lambat.</h2>
              <p className="mt-4 text-sm leading-7 text-[#b9cfc5]">
                Tampilan ini disusun mobile-first supaya check-in, GPS, dan selfie bisa dipakai nyaman di layar kecil.
              </p>
              <div className="mt-6 grid gap-3">
                <Button className="w-full">Check-in sekarang</Button>
                <Button variant="secondary" className="w-full border-white/20 bg-white/8 text-white hover:bg-white/12">
                  Check-out shift
                </Button>
              </div>
              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-semibold">Metode aktif</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["QR kantor pusat", "GPS lokasi", "Selfie bukti"].map((item) => (
                    <span key={item} className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#d3e2db]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Riwayat singkat</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">Jejak kehadiran terbaru</h2>
                </div>
                <ShieldCheck className="h-6 w-6 text-moss" />
              </div>
              <div className="mt-6 space-y-3">
                {attendance.map((item) => (
                  <article key={item.day + item.time} className="rounded-[24px] border border-[#e6ece5] bg-[#fbfcfa] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.day}</p>
                        <p className="mt-1 text-sm text-[#667770]">{item.time}</p>
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
          </section>
        ) : null}

        {tab === "requests" ? (
          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Pengajuan dan approval</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">Panel izin yang lebih mudah dibaca di mobile.</h2>
              <p className="mt-4 text-sm leading-7 text-[#64756e]">
                Flow ini disiapkan agar employee dan admin bisa melihat status approval tanpa kehilangan konteks.
              </p>
              <div className="mt-6 grid gap-3">
                <Button className="w-full">Ajukan izin baru</Button>
                <Button variant="secondary" className="w-full">Lihat kebijakan cuti</Button>
              </div>
            </div>
            <div className="space-y-3">
              {requests.map((item) => (
                <article key={item.title} className="rounded-[28px] border border-[#dfe6de] bg-white p-5 shadow-panel">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#62726c]">{item.detail}</p>
                    </div>
                    <StatusPill tone={toneForStatus(item.status)}>{item.status}</StatusPill>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "scanner" ? (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[30px] border border-[#dae5db] bg-[#10211c] p-5 text-white shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#97d7be]">Mode scanner</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">QR refresh dan scan log dalam satu layar.</h2>
              <div className="mt-6 rounded-[26px] border border-white/10 bg-white/6 p-5">
                <p className="text-sm text-[#a4cbbc]">Token aktif</p>
                <p className="mt-3 text-4xl font-semibold tracking-[0.12em]">{scannerToken ?? "HDR-31A-7XZ"}</p>
                <p className="mt-3 text-sm text-[#bad1c8]">Auto refresh tiap 30 detik. Siap dipakai untuk fullscreen scanner PWA.</p>
              </div>
            </div>
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Scan log</p>
              <div className="mt-5 space-y-3">
                {attendance.map((item) => (
                  <article key={item.day + item.time} className="rounded-[24px] border border-[#e6ece5] bg-[#fbfcfa] p-4">
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
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">{session.user.fullName}</h2>
              <div className="mt-6 space-y-4 text-sm text-[#61726c]">
                <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="font-semibold text-ink">Email</p>
                  <p className="mt-2">{session.user.email}</p>
                </div>
                <div className="rounded-[24px] border border-[#e5ece4] bg-[#fbfcfa] p-4">
                  <p className="font-semibold text-ink">Organisasi</p>
                  <p className="mt-2">{session.user.organizationName}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-[#dae5db] bg-white p-5 shadow-panel sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Preferensi berikutnya</p>
              <div className="mt-5 space-y-3">
                {[
                  "Integrasi push notification FCM",
                  "Sinkron offline queue untuk check-in",
                  "Foto selfie dan bukti lokasi produksi"
                ].map((item) => (
                  <div key={item} className="rounded-[22px] border border-[#e5ece4] bg-[#fbfcfa] px-4 py-4 text-sm text-[#5f706a]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
