import { Fragment, useEffect, useRef, useState } from "react";
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

const LEFT_STEPS: Step[] = [
  {
    id: "s1",
    title: "Superadmin Setup",
    desc: "Superadmin membuat workspace pertama dan menjadi pemilik sistem. Atur perusahaan, lokasi, dan aturan validasi.",
    chip: "Superadmin",
    chipActive: "bg-[#4c1d95]/50 text-[#c4b5fd]"
  },
  {
    id: "s2",
    title: "Admin HR",
    desc: "HR/Admin disiapkan untuk memantau absensi, mengelola approval, dan mengakses laporan organisasi.",
    chip: "HR/Admin",
    chipActive: "bg-[#164e63]/70 text-[#67e8f9]"
  },
  {
    id: "s3",
    title: "Manager",
    desc: "Manager mendapat akses tim yang ditugaskan. Hanya melihat tim dalam supervisinya.",
    chip: "Manager",
    chipActive: "bg-[#1e3a5f]/70 text-[#93c5fd]"
  },
  {
    id: "s4",
    title: "Employee",
    desc: "Karyawan ditetapkan ke divisi, manager, shift, dan lokasi kerja sebelum mulai check-in.",
    chip: "Employee",
    chipActive: "bg-white/15 text-white/80"
  }
];

const RIGHT_STEPS: Step[] = [
  {
    id: "v1",
    title: "Check-in",
    desc: "Karyawan check-in melalui mobile, QR, selfie, atau scanner. Taptu mencatat waktu, lokasi, dan bukti hadir.",
    chip: "Check-in",
    chipActive: "bg-[#1769ff]/35 text-[#93b4ff]"
  },
  {
    id: "v2",
    title: "Validation Layer",
    desc: "Taptu memeriksa waktu, lokasi, perangkat, QR/scanner, dan selfie proof secara otomatis.",
    chip: "Validasi",
    chipActive: "bg-[#1e3a5f]/70 text-[#93c5fd]"
  },
  {
    id: "v3",
    title: "Exception Review",
    desc: "Data bermasalah masuk antrean exception. Manager review dan memberi keputusan sebelum diteruskan ke HR.",
    chip: "Needs Review",
    chipActive: "bg-[#7c2d12]/50 text-[#fdba74]"
  },
  {
    id: "v4",
    title: "HR-ready Report",
    desc: "HR memberi keputusan final. Data bersih siap untuk rekap, laporan, dan Payroll Input Readiness.",
    chip: "HR Ready",
    chipActive: "bg-emerald-900/50 text-emerald-300"
  }
];

const ALL_STEPS: Step[] = [...LEFT_STEPS, ...RIGHT_STEPS];

// ─── Mini previews (compact for hub cards) ────────────────────────────────────

function PreviewShell({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`mt-3 rounded-[12px] border p-2.5 transition-all duration-500 ${
        isActive ? "border-white/18 bg-white/[0.08]" : "border-white/8 bg-white/[0.025]"
      }`}
    >
      {children}
    </div>
  );
}

function tx(isActive: boolean, on: string, off: string) {
  return isActive ? on : off;
}

// s1 — Superadmin Setup
function PreviewS1({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-2">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-[#111827]">
          <span className="text-[10px] font-black text-white">T</span>
        </div>
        <p className={`truncate text-[10px] font-black ${tx(isActive, "text-white/90", "text-white/35")}`}>
          PT Maju Jaya
        </p>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-white/15"}`} />
        <span className={`text-[9px] font-bold ${tx(isActive, "text-emerald-300", "text-white/20")}`}>
          Workspace aktif
        </span>
      </div>
    </PreviewShell>
  );
}

// s2 — Admin HR
function PreviewS2({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-1.5">
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
            isActive ? "bg-[#164e63] text-[#67e8f9]" : "bg-white/8 text-white/30"
          }`}
        >
          N
        </div>
        <p className={`min-w-0 flex-1 text-[10px] font-black ${tx(isActive, "text-white/90", "text-white/35")}`}>
          Nadia Putri
        </p>
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

// s3 — Manager
function PreviewS3({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-1.5">
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
            isActive ? "bg-[#1e3a5f] text-[#93c5fd]" : "bg-white/8 text-white/30"
          }`}
        >
          R
        </div>
        <p className={`min-w-0 flex-1 text-[10px] font-black ${tx(isActive, "text-white/90", "text-white/35")}`}>
          Raka Saputra
        </p>
        <span className={`text-[9px] ${tx(isActive, "text-white/55", "text-white/20")}`}>12 karyawan</span>
      </div>
    </PreviewShell>
  );
}

// s4 — Employee
function PreviewS4({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-1.5">
        <div
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-black ${
            isActive ? "bg-white/15 text-white/80" : "bg-white/8 text-white/30"
          }`}
        >
          F
        </div>
        <p className={`text-[10px] font-black ${tx(isActive, "text-white/90", "text-white/35")}`}>Fikri Maulana</p>
      </div>
      <div className="mt-1.5 flex gap-1">
        {["Operasional", "Shift Pagi"].map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
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

// v1 — Check-in
function PreviewV1({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-black tabular-nums ${tx(isActive, "text-white", "text-white/35")}`}>
          08:42
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            isActive ? "bg-emerald-900/50 text-emerald-300" : "bg-white/5 text-white/20"
          }`}
        >
          In radius
        </span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {["QR", "Manual", "Scanner"].map((m) => (
          <div
            key={m}
            className={`flex-1 rounded-[6px] py-0.5 text-center text-[8px] font-bold ${
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

// v2 — Validation Layer
function PreviewV2({ isActive }: { isActive: boolean }) {
  const checks = [
    { label: "Waktu", ok: true },
    { label: "Lokasi", ok: true },
    { label: "QR/Scanner", ok: true },
    { label: "Selfie", ok: false }
  ] as const;
  return (
    <PreviewShell isActive={isActive}>
      <div className="space-y-1">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isActive ? (ok ? "bg-emerald-400" : "bg-orange-400") : "bg-white/15"
              }`}
            />
            <span className={`flex-1 text-[9px] ${tx(isActive, "text-white/60", "text-white/25")}`}>{label}</span>
            <span
              className={`text-[9px] font-bold ${
                isActive ? (ok ? "text-emerald-300/80" : "text-orange-300/80") : "text-white/20"
              }`}
            >
              {ok ? "✓" : "⚠"}
            </span>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

// v3 — Exception Review
function PreviewV3({ isActive }: { isActive: boolean }) {
  return (
    <PreviewShell isActive={isActive}>
      <div className="flex items-center gap-1.5">
        <div
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] text-[10px] font-black ${
            isActive ? "bg-[#7c2d12]/50 text-[#fdba74]" : "bg-white/8 text-white/30"
          }`}
        >
          3
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[9px] font-bold ${tx(isActive, "text-[#fdba74]", "text-white/20")}`}>Perlu Review</p>
          <p className={`text-[8px] ${tx(isActive, "text-white/45", "text-white/15")}`}>Selfie exception</p>
        </div>
      </div>
    </PreviewShell>
  );
}

// v4 — HR-ready Report
function PreviewV4({ isActive }: { isActive: boolean }) {
  const stats = [
    { val: "18", col: "text-emerald-300", label: "Hadir" },
    { val: "2", col: "text-orange-300", label: "Terlambat" },
    { val: "1", col: "text-[#93b4ff]", label: "Izin" }
  ] as const;
  return (
    <PreviewShell isActive={isActive}>
      <p className={`text-[9px] font-black ${tx(isActive, "text-white/70", "text-white/25")}`}>Rekap Mei 2026</p>
      <div className="mt-1 flex gap-1.5 text-center">
        {stats.map(({ val, col, label }) => (
          <div key={label} className="flex-1">
            <p className={`text-[11px] font-black ${isActive ? col : "text-white/30"}`}>{val}</p>
            <p className={`text-[8px] ${tx(isActive, "text-white/40", "text-white/20")}`}>{label}</p>
          </div>
        ))}
      </div>
      <div
        className={`mt-1.5 rounded-[6px] py-0.5 text-center text-[8px] font-bold ${
          isActive ? "bg-emerald-900/40 text-emerald-300" : "bg-white/5 text-white/20"
        }`}
      >
        Payroll Input Readiness
      </div>
    </PreviewShell>
  );
}

const MINI_PREVIEWS: Record<string, React.ComponentType<{ isActive: boolean }>> = {
  s1: PreviewS1, s2: PreviewS2, s3: PreviewS3, s4: PreviewS4,
  v1: PreviewV1, v2: PreviewV2, v3: PreviewV3, v4: PreviewV4
};

// ─── Hub center card ──────────────────────────────────────────────────────────

function HubCard({ activeIndex }: { activeIndex: number }) {
  const chips = ["Validasi", "Approval", "Audit Trail", "HR-ready"];
  const phase = activeIndex < 4 ? "Setup" : "Validation";
  return (
    <div className="relative flex w-full flex-col items-center rounded-[28px] border border-[#1769ff]/30 bg-[#1769ff]/10 p-5 text-center shadow-[0_0_40px_rgba(23,105,255,0.22)]">
      {/* Breathing ring */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#1769ff]/40"
        animate={{ opacity: [0.3, 0.85, 0.3] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Logo mark */}
      <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#1769ff] text-sm font-black text-white shadow-[0_0_16px_rgba(23,105,255,0.55)]">
        T
      </div>
      {/* Brand */}
      <p className="mt-3 text-base font-black tracking-[-0.03em] text-white">Taptu</p>
      <p className="mt-0.5 text-[11px] leading-snug text-white/50">Attendance Validation OS</p>
      {/* Feature chips */}
      <div className="mt-3 flex flex-wrap justify-center gap-1">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-[#1769ff]/30 bg-[#1769ff]/12 px-2 py-0.5 text-[9px] font-bold text-[#93b4ff]"
          >
            {chip}
          </span>
        ))}
      </div>
      {/* Step counter */}
      <div className="mt-3 rounded-full bg-white/8 px-3 py-1 text-[9px] font-bold text-white/40 tabular-nums">
        {phase} · {activeIndex + 1} / 8
      </div>
    </div>
  );
}

// ─── Connector line (always travels left→right for unified flow) ──────────────

function ConnLine({
  active,
  lit,
  lk,
  ci
}: {
  active: boolean;
  lit: boolean;
  lk: number;
  ci: number;
}) {
  return (
    <div className="relative h-px w-10 shrink-0 lg:w-14">
      {/* Track */}
      <div className="h-px w-full bg-white/15" />
      {/* Animated fill */}
      {(active || lit) && (
        <motion.div
          key={`cf-${lk}-${ci}`}
          className="absolute top-0 h-px w-full bg-[#1769ff]/65"
          style={{ transformOrigin: "left center" }}
          initial={{ scaleX: active ? 0 : 1 }}
          animate={{ scaleX: 1 }}
          transition={active ? { duration: CYCLE_MS / 1000, ease: "linear" } : { duration: 0 }}
        />
      )}
      {/* Traveling dot */}
      {active && (
        <motion.div
          key={`cd-${lk}-${ci}`}
          className="absolute z-10 h-2 w-2 rounded-full bg-[#1769ff] shadow-[0_0_6px_rgba(23,105,255,0.9)]"
          style={{ top: "calc(50% - 4px)" }}
          initial={{ left: "0px" }}
          animate={{ left: "calc(100% - 8px)" }}
          transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
        />
      )}
    </div>
  );
}

// ─── Hub step card ────────────────────────────────────────────────────────────

function HubStepCard({
  step,
  stepIdx,
  isActive,
  onClick
}: {
  step: Step;
  stepIdx: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const MiniPreview = MINI_PREVIEWS[step.id];
  return (
    <motion.button
      onClick={onClick}
      className={`relative w-full rounded-[18px] border p-4 text-left transition-all duration-500 ${
        isActive
          ? "border-[#1769ff]/55 bg-[#1769ff]/14 shadow-[0_0_24px_rgba(23,105,255,0.20)]"
          : "border-white/10 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/20"
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      {isActive && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-[#1769ff]/45"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="flex items-start gap-2.5">
        {/* Number badge */}
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-[8px] text-[10px] font-black transition-all duration-500 ${
            isActive ? "bg-[#1769ff] text-white" : "bg-white/10 text-white/40"
          }`}
        >
          {stepIdx + 1}
        </div>
        <div className="min-w-0 flex-1">
          {/* Title */}
          <p
            className={`text-[12px] font-black leading-snug tracking-[-0.02em] transition-colors duration-500 ${
              isActive ? "text-white" : "text-white/60"
            }`}
          >
            {step.title}
          </p>
          {/* Status chip */}
          <span
            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold transition-all duration-500 ${
              isActive ? step.chipActive : "bg-white/8 text-white/25"
            }`}
          >
            {step.chip}
          </span>
        </div>
      </div>
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
      {ALL_STEPS.map((step, i) => (
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
              {i + 1}
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
                {i + 1} / {ALL_STEPS.length}
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

  // TICK — auto-advance
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % ALL_STEPS.length;
        if (next === 0) setLoopKey((k) => k + 1);
        return next;
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => () => { if (resumeRef.current) clearTimeout(resumeRef.current); }, []);

  // PICK — user selects step
  function pick(i: number) {
    setActiveIndex(i);
    setPaused(true);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), RESUME_MS);
  }

  return (
    <div className="mt-10 space-y-4">

      {/* ── Desktop: hub layout ──────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        {/* Group label row */}
        <div className="mb-4 flex items-center">
          <div className="flex-1 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              Setup &amp; Role Access
            </span>
          </div>
          {/* Spacer to match hub + connector columns */}
          <div className="w-64 shrink-0" />
          <div className="flex-1 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              Attendance Validation Flow
            </span>
          </div>
        </div>

        {/* Hub grid: left cards | left connectors | hub | right connectors | right cards */}
        <div
          className="grid items-center gap-x-2 gap-y-4"
          style={{
            gridTemplateColumns: "1fr auto auto auto 1fr",
            gridTemplateRows: "repeat(4, auto)"
          }}
        >
          {/* Hub — col 3, spans all 4 rows */}
          <div style={{ gridColumn: 3, gridRow: "1 / 5" }} className="flex justify-center self-stretch py-2">
            <HubCard activeIndex={activeIndex} />
          </div>

          {/* Left cards + connectors */}
          {LEFT_STEPS.map((step, i) => {
            const stepIdx = i;
            const isActive = activeIndex === stepIdx;
            const isLit = activeIndex > stepIdx;
            return (
              <Fragment key={step.id}>
                <div style={{ gridColumn: 1, gridRow: i + 1 }}>
                  <HubStepCard step={step} stepIdx={stepIdx} isActive={isActive} onClick={() => pick(stepIdx)} />
                </div>
                <div style={{ gridColumn: 2, gridRow: i + 1 }} className="flex items-center self-center">
                  <ConnLine active={isActive} lit={isLit} lk={loopKey} ci={i} />
                </div>
              </Fragment>
            );
          })}

          {/* Right connectors + cards */}
          {RIGHT_STEPS.map((step, i) => {
            const stepIdx = i + 4;
            const isActive = activeIndex === stepIdx;
            const isLit = activeIndex > stepIdx;
            return (
              <Fragment key={step.id}>
                <div style={{ gridColumn: 4, gridRow: i + 1 }} className="flex items-center self-center">
                  <ConnLine active={isActive} lit={isLit} lk={loopKey} ci={stepIdx} />
                </div>
                <div style={{ gridColumn: 5, gridRow: i + 1 }}>
                  <HubStepCard step={step} stepIdx={stepIdx} isActive={isActive} onClick={() => pick(stepIdx)} />
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: hub top + 2×2 card grids ────────────────────────────────── */}
      <div className="lg:hidden space-y-5">
        {/* Central hub card */}
        <div className="flex justify-center">
          <div className="w-56">
            <HubCard activeIndex={activeIndex} />
          </div>
        </div>

        {/* Setup group */}
        <div>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            Setup &amp; Role Access
          </p>
          <div className="grid grid-cols-2 gap-3">
            {LEFT_STEPS.map((step, i) => (
              <HubStepCard
                key={step.id}
                step={step}
                stepIdx={i}
                isActive={activeIndex === i}
                onClick={() => pick(i)}
              />
            ))}
          </div>
        </div>

        {/* Validation group */}
        <div>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            Attendance Validation Flow
          </p>
          <div className="grid grid-cols-2 gap-3">
            {RIGHT_STEPS.map((step, i) => (
              <HubStepCard
                key={step.id}
                step={step}
                stepIdx={i + 4}
                isActive={activeIndex === i + 4}
                onClick={() => pick(i + 4)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────────── */}
      <DetailPanel activeIndex={activeIndex} />

      {/* ── Progress dots ────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 pt-1">
        {ALL_STEPS.map((step, i) => (
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
