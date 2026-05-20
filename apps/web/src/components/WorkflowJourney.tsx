import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

const CYCLE_MS = 3200;
const RESUME_MS = 5000;

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
    desc: "Atur perusahaan, lokasi kerja, shift, dan aturan validasi.",
    chip: "Setup",
    chipActive: "bg-[#1e3a5f]/70 text-[#93c5fd]"
  },
  {
    id: "03",
    title: "Tambah Admin HR",
    desc: "HR/Admin disiapkan untuk memantau, mereview, dan melaporkan absensi.",
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
    desc: "Karyawan check-in melalui mobile, QR, atau scanner.",
    chip: "Check-in",
    chipActive: "bg-[#1769ff]/35 text-[#93b4ff]"
  },
  {
    id: "07",
    title: "Validasi & Review",
    desc: "Taptu memvalidasi waktu, lokasi, perangkat, QR/scanner, dan selfie proof. Kasus tertentu masuk review manager.",
    chip: "Needs Review",
    chipActive: "bg-[#7c2d12]/50 text-[#fdba74]"
  },
  {
    id: "08",
    title: "Laporan HR-Ready",
    desc: "HR memberi keputusan final. Data bersih siap untuk rekap, laporan, dan Payroll Input Readiness.",
    chip: "HR Ready",
    chipActive: "bg-emerald-900/50 text-emerald-300"
  }
];

type CS = "dim" | "active" | "lit";

function cs(connIdx: number, activeIdx: number): CS {
  if (activeIdx > connIdx) return "lit";
  if (activeIdx === connIdx) return "active";
  return "dim";
}

// ─── Horizontal connector ───────────────────────────────────────────────────

function HConn({
  state,
  dir,
  lk,
  ci
}: {
  state: CS;
  dir: "right" | "left";
  lk: number;
  ci: number;
}) {
  const fillOrigin = dir === "right" ? "left center" : "right center";

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
          initial={{ [dir === "right" ? "left" : "right"]: "-4px" }}
          animate={{ [dir === "right" ? "left" : "right"]: "calc(100% - 4px)" }}
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

// ─── Vertical connector (04 → 05, right side of diagram) ────────────────────

function VConn({ state, lk }: { state: CS; lk: number }) {
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
          initial={{ top: "-4px" }}
          animate={{ top: "calc(100% - 4px)" }}
          transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
        />
      )}

      {/* Chevron at bottom */}
      <ChevronDown
        className={`absolute bottom-0 left-1/2 h-3.5 w-3.5 -translate-x-1/2 translate-y-1 transition-colors duration-500 ${
          state !== "dim" ? "text-[#1769ff]/80" : "text-white/20"
        }`}
      />
    </div>
  );
}

// ─── Step card ───────────────────────────────────────────────────────────────

function StepCard({
  step,
  isActive,
  onClick
}: {
  step: Step;
  isActive: boolean;
  onClick: () => void;
}) {
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
      {/* Pulsing ring when active */}
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
    </motion.button>
  );
}

// ─── Detail panel ────────────────────────────────────────────────────────────
// All step content stays in the DOM so tests can find text like "Payroll Input Readiness".

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
            {/* Big number */}
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

            {/* Counter */}
            <div className="shrink-0 pt-1">
              <span className="text-xs font-bold tabular-nums text-white/25">{i + 1} / {STEPS.length}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function WorkflowJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-cycle
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % STEPS.length;
        if (next === 0) setLoopKey((k) => k + 1);
        return next;
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused]);

  // Cleanup on unmount
  useEffect(() => () => { if (resumeRef.current) clearTimeout(resumeRef.current); }, []);

  function pick(i: number) {
    setActiveIndex(i);
    setPaused(true);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), RESUME_MS);
  }

  const row1 = STEPS.slice(0, 4); // 01–04
  const row2 = STEPS.slice(4, 8); // 05–08, rendered reversed so 05 sits under 04

  // Connector width class — keep in sync with HConn
  const connW = "w-8 lg:w-10 shrink-0";

  return (
    <div className="mt-10 space-y-4">

      {/* ── Desktop: serpentine 4 + 4 ─────────────────────────────── */}
      <div className="hidden lg:block">

        {/* Row 1: 01 → 02 → 03 → 04 */}
        <div className="flex items-stretch">
          {row1.map((step, i) => (
            <Fragment key={step.id}>
              <div className="flex-1 min-w-0">
                <StepCard step={step} isActive={activeIndex === i} onClick={() => pick(i)} />
              </div>
              {i < row1.length - 1 && (
                <HConn state={cs(i, activeIndex)} dir="right" lk={loopKey} ci={i} />
              )}
            </Fragment>
          ))}
        </div>

        {/* Zig-zag connector: vertical drop under card 04 */}
        {/* Mirror the row-1 structure as spacers so VConn aligns to card-04 center */}
        <div className="flex items-stretch">
          {[0, 1, 2].map((i) => (
            <Fragment key={i}>
              <div className="flex-1" />          {/* spacer = card width */}
              <div className={connW} />            {/* spacer = connector width */}
            </Fragment>
          ))}
          {/* Last cell: card 04 width, VConn centered */}
          <div className="flex flex-1 items-start justify-center pt-0">
            <VConn state={cs(3, activeIndex)} lk={loopKey} />
          </div>
        </div>

        {/* Row 2: 05 → 06 → 07 → 08, displayed right-to-left via flex-row-reverse */}
        {/* flex-row-reverse puts 05 on the far right (directly under 04) */}
        <div className="flex flex-row-reverse items-stretch">
          {row2.map((step, i) => {
            const stepIdx = i + 4;
            const connIdx = i + 4; // connectors 4,5,6 between steps 4→5, 5→6, 6→7
            return (
              <Fragment key={step.id}>
                <div className="flex-1 min-w-0">
                  <StepCard step={step} isActive={activeIndex === stepIdx} onClick={() => pick(stepIdx)} />
                </div>
                {/* Connector between this step and the next in flow order */}
                {i < row2.length - 1 && (
                  <HConn state={cs(connIdx, activeIndex)} dir="left" lk={loopKey} ci={connIdx} />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: vertical timeline ──────────────────────────────── */}
      <div className="lg:hidden space-y-0">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center pt-5">
              {/* Node dot */}
              <div
                className={`h-3 w-3 shrink-0 rounded-full border-2 transition-all duration-500 ${
                  activeIndex === i
                    ? "border-[#1769ff] bg-[#1769ff] shadow-[0_0_8px_rgba(23,105,255,0.8)]"
                    : activeIndex > i
                    ? "border-[#1769ff]/50 bg-[#1769ff]/30"
                    : "border-white/20 bg-transparent"
                }`}
              />
              {/* Spine line */}
              {i < STEPS.length - 1 && (
                <div className="relative mt-1 w-px flex-1">
                  <div className="h-full w-full bg-white/15" />
                  {cs(i, activeIndex) === "lit" && (
                    <div className="absolute inset-0 bg-[#1769ff]/50" />
                  )}
                  {cs(i, activeIndex) === "active" && (
                    <motion.div
                      key={`msp-${loopKey}-${i}`}
                      className="absolute top-0 w-full bg-[#1769ff]/65"
                      style={{ transformOrigin: "top center" }}
                      initial={{ scaleY: 0, height: "100%" }}
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

      {/* ── Detail panel ──────────────────────────────────────────── */}
      <DetailPanel activeIndex={activeIndex} />

      {/* ── Progress dots ─────────────────────────────────────────── */}
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
