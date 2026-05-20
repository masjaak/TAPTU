import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_MS = 3200;
const RESUME_MS = 5000;

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Step {
  id: string;
  title: string;
  desc: string;
  chip: string;
  chipActive: string;
}

const STEPS: Step[] = [
  {
    id: "01",
    title: "Buat Workspace",
    desc: "Superadmin memulai workspace pertama untuk perusahaan.",
    chip: "Superadmin",
    chipActive: "bg-[#4c1d95]/50 text-[#c4b5fd]"
  },
  {
    id: "02",
    title: "Setup Organisasi",
    desc: "Atur lokasi kerja, shift, divisi, dan aturan validasi.",
    chip: "Setup",
    chipActive: "bg-[#1e3a5f]/70 text-[#93c5fd]"
  },
  {
    id: "03",
    title: "Tambah Admin HR",
    desc: "HR/Admin disiapkan untuk memantau absensi, approval, dan laporan.",
    chip: "HR/Admin",
    chipActive: "bg-[#164e63]/70 text-[#67e8f9]"
  },
  {
    id: "04",
    title: "Tambah Manager",
    desc: "Manager hanya melihat tim yang berada dalam supervisinya.",
    chip: "Manager",
    chipActive: "bg-[#1e3a5f]/70 text-[#93c5fd]"
  },
  {
    id: "05",
    title: "Tambah Karyawan",
    desc: "Karyawan ditetapkan ke divisi, manager, shift, dan lokasi kerja.",
    chip: "Employee",
    chipActive: "bg-white/15 text-white/80"
  },
  {
    id: "06",
    title: "Check-in Karyawan",
    desc: "Karyawan check-in melalui mobile, QR, selfie, atau scanner.",
    chip: "Check-in",
    chipActive: "bg-[#1769ff]/35 text-[#93b4ff]"
  },
  {
    id: "07",
    title: "Validasi & Review",
    desc: "Taptu memeriksa waktu, lokasi, perangkat, QR/scanner, dan selfie proof. Data bermasalah masuk antrean review.",
    chip: "Needs Review",
    chipActive: "bg-[#7c2d12]/50 text-[#fdba74]"
  },
  {
    id: "08",
    title: "Laporan HR-Ready",
    desc: "HR memberi keputusan final. Data bersih siap untuk laporan dan Payroll Input Readiness.",
    chip: "HR Ready",
    chipActive: "bg-emerald-900/50 text-emerald-300"
  }
];

// ─── State machine ────────────────────────────────────────────────────────────
// States: activeIndex (0–7), paused (bool), loopKey (int)
// Events: TICK (advance step), PICK(i) (user selects), RESUME (timer fires)

type ConnectorState = "dim" | "active" | "lit";

function connectorState(connIdx: number, activeIdx: number): ConnectorState {
  if (activeIdx > connIdx) return "lit";
  if (activeIdx === connIdx) return "active";
  return "dim";
}

// ─── Mini preview sub-panel ───────────────────────────────────────────────────

function PreviewShell({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`mt-4 rounded-[14px] border p-3 transition-all duration-500 ${
        isActive ? "border-white/18 bg-white/[0.08]" : "border-white/8 bg-white/[0.025]"
      }`}
    >
      {children}
    </div>
  );
}

function t(isActive: boolean, on: string, off: string) {
  return isActive ? on : off;
}

// 01 — Workspace creation
function Preview01({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] bg-[#111827]">
          <span className="text-xs font-black text-white">T</span>
        </div>
        <div className="min-w-0">
          <p className={`truncate text-[11px] font-black ${t(isActive, "text-white/90", "text-white/35")}`}>
            PT Maju Jaya
          </p>
          <p className={`truncate text-[9px] ${t(isActive, "text-white/45", "text-white/20")}`}>
            taptu.app/maju
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-white/15"}`} />
        <span className={`text-[10px] font-bold ${t(isActive, "text-emerald-300", "text-white/20")}`}>
          Workspace aktif
        </span>
      </div>
    </PreviewShell>
  );
}

// 02 — Org setup (location, shift, GPS radius)
function Preview02({ isActive }: { isActive: boolean }) {
  const rows = [
    ["Lokasi", "Kantor Pusat"],
    ["Shift", "07:00–16:00"],
    ["GPS radius", "500 m"]
  ] as const;
  return (
    <PreviewShell isActive={isActive}>
      <div className="space-y-1.5">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className={`text-[10px] ${t(isActive, "text-white/50", "text-white/20")}`}>{label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                isActive ? "bg-white/10 text-white/75" : "bg-white/5 text-white/20"
              }`}
            >
              {val}
            </span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

// 03 — Admin HR role card
function Preview03({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-2">
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black ${
            isActive ? "bg-[#164e63] text-[#67e8f9]" : "bg-white/8 text-white/30"
          }`}
        >
          N
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-black ${t(isActive, "text-white/90", "text-white/35")}`}>Nadia Putri</p>
          <p className={`text-[10px] ${t(isActive, "text-[#67e8f9]/70", "text-white/20")}`}>HR/Admin</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            isActive ? "bg-[#164e63]/60 text-[#67e8f9]" : "bg-white/5 text-white/20"
          }`}
        >
          Akses penuh
        </span>
      </div>
    </PreviewShell>
  );
}

// 04 — Manager with team count
function Preview04({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-2">
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black ${
            isActive ? "bg-[#1e3a5f] text-[#93c5fd]" : "bg-white/8 text-white/30"
          }`}
        >
          R
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-black ${t(isActive, "text-white/90", "text-white/35")}`}>Raka Saputra</p>
          <p className={`text-[10px] ${t(isActive, "text-white/45", "text-white/20")}`}>Manager</p>
        </div>
      </div>
      <div
        className={`ml-3.5 mt-1.5 flex items-center gap-1 border-l pl-2 ${
          isActive ? "border-white/20" : "border-white/8"
        }`}
      >
        <span className={`text-[10px] ${t(isActive, "text-white/55", "text-white/20")}`}>12 karyawan</span>
      </div>
    </PreviewShell>
  );
}

// 05 — Employee assignment
function Preview05({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-2">
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
            isActive ? "bg-white/15 text-white/80" : "bg-white/8 text-white/30"
          }`}
        >
          F
        </div>
        <p className={`text-[11px] font-black ${t(isActive, "text-white/90", "text-white/35")}`}>Fikri Maulana</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {["Operasional", "Shift Pagi", "Blok A"].map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
              isActive ? "bg-white/10 text-white/65" : "bg-white/5 text-white/20"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </PreviewShell>
  );
}

// 06 — Check-in UI (time, radius, method chips)
function Preview06({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-black tabular-nums ${t(isActive, "text-white", "text-white/35")}`}>
          08:42
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
            isActive ? "bg-emerald-900/50 text-emerald-300" : "bg-white/5 text-white/20"
          }`}
        >
          In radius
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {["QR", "Manual", "Scanner"].map((m) => (
          <div
            key={m}
            className={`flex-1 rounded-[8px] py-1 text-center text-[9px] font-bold ${
              isActive ? "bg-[#1769ff]/20 text-[#93b4ff]" : "bg-white/5 text-white/20"
            }`}
          >
            {m}
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

// 07 — Validation checklist (✓ pass, ⚠ review)
function Preview07({ isActive }: { isActive: boolean }) {
  const checks = [
    { label: "Waktu", ok: true, val: "08:42" },
    { label: "Lokasi", ok: true, val: "OK" },
    { label: "QR/Scanner", ok: true, val: "Valid" },
    { label: "Selfie", ok: false, val: "Review" }
  ] as const;
  return (
    <PreviewShell isActive={isActive}>
      <div className="space-y-1">
        {checks.map(({ label, ok, val }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isActive ? (ok ? "bg-emerald-400" : "bg-orange-400") : "bg-white/15"
              }`}
            />
            <span className={`flex-1 text-[10px] ${t(isActive, "text-white/55", "text-white/25")}`}>
              {label}
            </span>
            <span
              className={`text-[10px] font-bold ${
                isActive
                  ? ok ? "text-emerald-300/80" : "text-orange-300/80"
                  : "text-white/20"
              }`}
            >
              {val}
            </span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

// 08 — HR-ready report with stats
function Preview08({ isActive }: { isActive: boolean }) {
  const stats = [
    { label: "Hadir", val: "18", active: "text-emerald-300" },
    { label: "Terlambat", val: "2", active: "text-orange-300" },
    { label: "Izin", val: "1", active: "text-[#93b4ff]" }
  ] as const;
  return (
    <PreviewShell isActive={isActive}>
      <p className={`text-[10px] font-black ${t(isActive, "text-white/70", "text-white/25")}`}>Rekap Mei 2026</p>
      <div className="mt-1.5 flex gap-2 text-center">
        {stats.map(({ label, val, active }) => (
          <div key={label} className="flex-1">
            <p className={`text-sm font-black ${isActive ? active : "text-white/30"}`}>{val}</p>
            <p className={`text-[9px] ${t(isActive, "text-white/40", "text-white/20")}`}>{label}</p>
          </div>
        ))}
      </div>
      <div
        className={`mt-2 rounded-[8px] py-1 text-center text-[9px] font-bold ${
          isActive ? "bg-emerald-900/40 text-emerald-300" : "bg-white/5 text-white/20"
        }`}
      >
        HR Ready · Payroll Input Readiness
      </div>
    </PreviewShell>
  );
}

const MINI_PREVIEWS: Record<string, React.ComponentType<{ isActive: boolean }>> = {
  "01": Preview01,
  "02": Preview02,
  "03": Preview03,
  "04": Preview04,
  "05": Preview05,
  "06": Preview06,
  "07": Preview07,
  "08": Preview08
};

// ─── Horizontal connector ─────────────────────────────────────────────────────

function HConn({
  state,
  dir,
  lk,
  ci
}: {
  state: ConnectorState;
  dir: "right" | "left";
  lk: number;
  ci: number;
}) {
  const fillOrigin = dir === "right" ? "left center" : "right center";
  const dotStart = dir === "right" ? { left: "0px" } : { right: "0px" };
  const dotEnd = dir === "right"
    ? { left: "calc(100% - 8px)" }
    : { right: "calc(100% - 8px)" };

  return (
    <div className="relative flex w-8 shrink-0 items-center self-center lg:w-10">
      {/* Track */}
      <div className="h-px w-full rounded-full bg-white/15" />

      {/* Animated fill */}
      {state !== "dim" && (
        <motion.div
          key={`hf-${lk}-${ci}`}
          className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-[#1769ff]/65"
          style={{ transformOrigin: fillOrigin }}
          initial={{ scaleX: state === "active" ? 0 : 1 }}
          animate={{ scaleX: 1 }}
          transition={
            state === "active"
              ? { duration: CYCLE_MS / 1000, ease: "linear" }
              : { duration: 0 }
          }
        />
      )}

      {/* Traveling dot */}
      {state === "active" && (
        <motion.div
          key={`hd-${lk}-${ci}`}
          className="absolute z-10 h-2 w-2 rounded-full bg-[#1769ff] shadow-[0_0_7px_rgba(23,105,255,0.9)]"
          style={{ top: "calc(50% - 4px)" }}
          initial={dotStart}
          animate={dotEnd}
          transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
        />
      )}

      {/* Direction chevron */}
      {dir === "right" ? (
        <ChevronRight
          className={`absolute -right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-colors duration-500 ${
            state !== "dim" ? "text-[#1769ff]/80" : "text-white/20"
          }`}
        />
      ) : (
        <ChevronLeft
          className={`absolute -left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-colors duration-500 ${
            state !== "dim" ? "text-[#1769ff]/80" : "text-white/20"
          }`}
        />
      )}
    </div>
  );
}

// ─── Vertical connector (zig-zag from step 04 down to step 05) ───────────────

function VConn({ state, lk }: { state: ConnectorState; lk: number }) {
  return (
    <div className="relative flex h-10 w-5 items-center justify-center lg:h-12 lg:w-6">
      {/* Track */}
      <div className="h-full w-px rounded-full bg-white/15" />

      {/* Animated fill */}
      {state !== "dim" && (
        <motion.div
          key={`vf-${lk}-${state}`}
          className="absolute h-full w-0.5 rounded-full bg-[#1769ff]/65"
          style={{ transformOrigin: "top center" }}
          initial={{ scaleY: state === "active" ? 0 : 1 }}
          animate={{ scaleY: 1 }}
          transition={
            state === "active"
              ? { duration: CYCLE_MS / 1000, ease: "linear" }
              : { duration: 0 }
          }
        />
      )}

      {/* Traveling dot */}
      {state === "active" && (
        <motion.div
          key={`vd-${lk}`}
          className="absolute left-1/2 z-10 h-2 w-2 -translate-x-1/2 rounded-full bg-[#1769ff] shadow-[0_0_7px_rgba(23,105,255,0.9)]"
          initial={{ top: "0px" }}
          animate={{ top: "calc(100% - 8px)" }}
          transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
        />
      )}

      <ChevronDown
        className={`absolute bottom-0 left-1/2 h-3.5 w-3.5 -translate-x-1/2 translate-y-1 transition-colors duration-500 ${
          state !== "dim" ? "text-[#1769ff]/80" : "text-white/20"
        }`}
      />
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step, isActive, onClick }: { step: Step; isActive: boolean; onClick: () => void }) {
  const MiniPreview = MINI_PREVIEWS[step.id];

  return (
    <motion.button
      onClick={onClick}
      className={`relative w-full rounded-[22px] border p-5 text-left transition-all duration-500 lg:p-6 ${
        isActive
          ? "border-[#1769ff]/55 bg-[#1769ff]/14 shadow-[0_0_28px_rgba(23,105,255,0.22)]"
          : "border-white/10 bg-white/[0.06] hover:bg-white/[0.1] hover:border-white/20"
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Pulsing ring */}
      {isActive && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-[#1769ff]/45"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Number badge */}
      <div
        className={`grid h-8 w-8 place-items-center rounded-[10px] text-xs font-black transition-all duration-500 ${
          isActive ? "bg-[#1769ff] text-white" : "bg-white/10 text-white/40"
        }`}
      >
        {step.id}
      </div>

      {/* Title */}
      <p
        className={`mt-4 text-[13px] font-black leading-snug tracking-[-0.02em] transition-colors duration-500 lg:text-sm ${
          isActive ? "text-white" : "text-white/60"
        }`}
      >
        {step.title}
      </p>

      {/* Status chip */}
      <span
        className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-all duration-500 ${
          isActive ? step.chipActive : "bg-white/8 text-white/25"
        }`}
      >
        {step.chip}
      </span>

      {/* Mini visual preview */}
      <MiniPreview isActive={isActive} />
    </motion.button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
// All step content stays in the DOM (opacity toggle, not removal)
// so tests and screen readers can always find "Payroll Input Readiness".

function DetailPanel({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] p-6 lg:p-7">
      {STEPS.map((step, i) => (
        <div
          key={step.id}
          aria-hidden={i !== activeIndex}
          className={`transition-all duration-350 ${
            i === activeIndex
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none absolute inset-0 p-6 opacity-0 lg:p-7"
          }`}
        >
          <div className="flex items-start gap-5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#1769ff] text-base font-black text-white lg:h-14 lg:w-14">
              {step.id}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-base font-black leading-tight text-white lg:text-lg">{step.title}</p>
              <p className="mt-2 text-sm leading-7 text-white/55 lg:text-[15px] lg:leading-8">{step.desc}</p>
              <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${step.chipActive}`}>
                {step.chip}
              </span>
            </div>
            <div className="shrink-0 pt-1">
              <span className="text-xs font-bold tabular-nums text-white/25">
                {i + 1} / {STEPS.length}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkflowJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TICK event — advance step on interval
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % STEPS.length;
        if (next === 0) setLoopKey((k) => k + 1); // reset connector animations
        return next;
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused]);

  // Cleanup resume timer on unmount
  useEffect(() => () => { if (resumeRef.current) clearTimeout(resumeRef.current); }, []);

  // PICK event — user manually selects a step
  function pick(i: number) {
    setActiveIndex(i);
    setPaused(true);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    // RESUME event — fires after RESUME_MS inactivity
    resumeRef.current = setTimeout(() => setPaused(false), RESUME_MS);
  }

  const row1 = STEPS.slice(0, 4); // steps 01–04
  const row2 = STEPS.slice(4, 8); // steps 05–08, rendered reversed so 05 sits under 04

  // Connector width — must stay in sync with HConn's own width class
  const connW = "w-8 shrink-0 lg:w-10";

  return (
    <div className="mt-10 space-y-4">

      {/* ── Desktop: serpentine 4 + 4 ─────────────────────────────────────── */}
      <div className="hidden lg:block">

        {/* Row 1: 01 → 02 → 03 → 04 */}
        <div className="flex items-stretch">
          {row1.map((step, i) => (
            <Fragment key={step.id}>
              <div className="flex-1 min-w-0">
                <StepCard step={step} isActive={activeIndex === i} onClick={() => pick(i)} />
              </div>
              {i < row1.length - 1 && (
                <HConn
                  state={connectorState(i, activeIndex)}
                  dir="right"
                  lk={loopKey}
                  ci={i}
                />
              )}
            </Fragment>
          ))}
        </div>

        {/* Zig-zag bridge: spacer row mirrors row-1 structure so VConn aligns under card 04 */}
        <div className="flex items-stretch">
          {[0, 1, 2].map((i) => (
            <Fragment key={i}>
              <div className="flex-1" />
              <div className={connW} />
            </Fragment>
          ))}
          {/* Last slot = card 04 width, VConn centered */}
          <div className="flex flex-1 justify-center">
            <VConn state={connectorState(3, activeIndex)} lk={loopKey} />
          </div>
        </div>

        {/* Row 2: 05 → 06 → 07 → 08, displayed right-to-left via flex-row-reverse */}
        {/* flex-row-reverse puts step 05 on the far right, directly under step 04 */}
        <div className="flex flex-row-reverse items-stretch">
          {row2.map((step, i) => {
            const stepIdx = i + 4;
            const connIdx = i + 4; // connectors 4 (05→06), 5 (06→07), 6 (07→08)
            return (
              <Fragment key={step.id}>
                <div className="flex-1 min-w-0">
                  <StepCard step={step} isActive={activeIndex === stepIdx} onClick={() => pick(stepIdx)} />
                </div>
                {i < row2.length - 1 && (
                  <HConn
                    state={connectorState(connIdx, activeIndex)}
                    dir="left"
                    lk={loopKey}
                    ci={connIdx}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: vertical timeline ──────────────────────────────────────── */}
      <div className="lg:hidden space-y-0">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center pt-5">
              {/* Node */}
              <div
                className={`h-3 w-3 shrink-0 rounded-full border-2 transition-all duration-500 ${
                  activeIndex === i
                    ? "border-[#1769ff] bg-[#1769ff] shadow-[0_0_8px_rgba(23,105,255,0.8)]"
                    : activeIndex > i
                    ? "border-[#1769ff]/50 bg-[#1769ff]/30"
                    : "border-white/20 bg-transparent"
                }`}
              />
              {/* Spine line with fill animation */}
              {i < STEPS.length - 1 && (
                <div className="relative mt-1 w-px flex-1">
                  <div className="h-full w-full bg-white/15" />
                  {connectorState(i, activeIndex) === "lit" && (
                    <div className="absolute inset-0 bg-[#1769ff]/50" />
                  )}
                  {connectorState(i, activeIndex) === "active" && (
                    <motion.div
                      key={`msp-${loopKey}-${i}`}
                      className="absolute top-0 w-full bg-[#1769ff]/65"
                      style={{ transformOrigin: "top center", height: "100%" }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Card */}
            <div className="flex-1 min-w-0 pb-3">
              <StepCard step={step} isActive={activeIndex === i} onClick={() => pick(i)} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Detail panel ──────────────────────────────────────────────────── */}
      <DetailPanel activeIndex={activeIndex} />

      {/* ── Progress dots ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 pt-1">
        {STEPS.map((step, i) => (
          <button
            key={step.id}
            aria-label={`Step ${i + 1}: ${step.title}`}
            onClick={() => pick(i)}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i === activeIndex ? "bg-[#1769ff]" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
