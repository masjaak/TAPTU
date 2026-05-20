import { Fragment, useEffect, useState } from "react";
import { motion } from "motion/react";

const CYCLE_MS = 2400;

interface Step {
  id: string;
  title: string;
  copy: string;
  badge: string;
  badgeActive: string;
}

const setupPhase: Step[] = [
  {
    id: "01",
    title: "Buat Workspace",
    copy: "Superadmin membuat workspace pertama dan menjadi pemilik sistem.",
    badge: "Superadmin",
    badgeActive: "bg-[#4c1d95]/50 text-[#c4b5fd]"
  },
  {
    id: "02",
    title: "Setup Organisasi",
    copy: "Konfigurasi perusahaan, lokasi kerja, shift, dan aturan validasi absensi.",
    badge: "Konfigurasi",
    badgeActive: "bg-[#1e3a5f]/70 text-[#93c5fd]"
  },
  {
    id: "03",
    title: "Tambah Admin HR",
    copy: "HR/Admin mendapat akses monitor absensi, approval, dan pelaporan organisasi.",
    badge: "HR/Admin",
    badgeActive: "bg-[#164e63]/70 text-[#67e8f9]"
  },
  {
    id: "04",
    title: "Tambah Manager",
    copy: "Manager mendapat akses tim yang ditugaskan. Hanya melihat tim mereka.",
    badge: "Manager",
    badgeActive: "bg-[#1e3a5f]/70 text-[#93c5fd]"
  },
  {
    id: "05",
    title: "Tambah Karyawan",
    copy: "Karyawan ditugaskan ke divisi, manager, shift, dan lokasi kerja.",
    badge: "Employee",
    badgeActive: "bg-white/15 text-white/80"
  }
];

const dailyPhase: Step[] = [
  {
    id: "06",
    title: "Check-in Karyawan",
    copy: "Karyawan check-in via mobile, QR, atau scanner. Taptu mencatat waktu, lokasi, perangkat, dan bukti hadir.",
    badge: "Check-in",
    badgeActive: "bg-[#1769ff]/35 text-[#93b4ff]"
  },
  {
    id: "07",
    title: "Validasi & Review",
    copy: "Data bersih masuk langsung. Data bermasalah masuk antrean exception. Manager memberi review sebelum ke HR.",
    badge: "Needs Review",
    badgeActive: "bg-[#7c2d12]/50 text-[#fdba74]"
  },
  {
    id: "08",
    title: "Laporan HR-Ready",
    copy: "HR membuat keputusan final. Data bersih siap untuk rekap, laporan, dan Payroll Input Readiness.",
    badge: "HR Ready",
    badgeActive: "bg-emerald-900/50 text-emerald-300"
  }
];

const allSteps = [...setupPhase, ...dailyPhase];

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
      className={`relative w-full rounded-[18px] border p-4 text-left transition-all duration-500 lg:flex-1 lg:min-w-0 ${
        isActive
          ? "border-[#1769ff]/50 bg-[#1769ff]/12 shadow-[0_0_22px_rgba(23,105,255,0.22)]"
          : "border-white/10 bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/20"
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {isActive && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[18px] border border-[#1769ff]/40"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      )}
      <div
        className={`grid h-7 w-7 place-items-center rounded-[10px] text-[11px] font-black transition-colors duration-500 ${
          isActive ? "bg-[#1769ff] text-white" : "bg-white/10 text-white/40"
        }`}
      >
        {step.id}
      </div>
      <p
        className={`mt-3 text-sm font-black leading-tight tracking-[-0.02em] transition-colors duration-500 ${
          isActive ? "text-white" : "text-white/60"
        }`}
      >
        {step.title}
      </p>
      <span
        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold transition-all duration-500 ${
          isActive ? step.badgeActive : "bg-white/8 text-white/25"
        }`}
      >
        {step.badge}
      </span>
    </motion.button>
  );
}

function HorizConnector({ lit }: { lit: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-center lg:w-5 lg:h-auto h-3 w-full">
      <div
        className={`lg:h-px lg:w-full w-px h-full rounded-full transition-colors duration-500 ${
          lit ? "bg-[#1769ff]/50" : "bg-white/12"
        }`}
      />
    </div>
  );
}

function PhaseDivider() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="h-px flex-1 bg-white/10" />
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-[#1769ff]"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
          Alur absensi harian dimulai
        </span>
      </div>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function ActiveStepPanel({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
      {allSteps.map((step, i) => (
        <div
          key={step.id}
          aria-hidden={i !== activeIndex}
          className={`transition-all duration-300 ${
            i === activeIndex
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none absolute inset-0 p-5 opacity-0"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#1769ff] text-sm font-black text-white">
              {step.id}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-white">{step.title}</p>
              <p className="mt-1.5 text-sm leading-6 text-white/55">{step.copy}</p>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${step.badgeActive}`}>
                {step.badge}
              </span>
            </div>
            <div className="shrink-0 pt-0.5">
              <span className="text-xs font-bold tabular-nums text-white/25">
                {i + 1} / {allSteps.length}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkflowDiagram() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % allSteps.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused]);

  function pickStep(i: number) {
    setActiveIndex(i);
    setPaused(true);
  }

  return (
    <div className="mt-10 space-y-3">
      {/* Phase 1 */}
      <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-1">
        <div className="px-4 pb-1 pt-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            Persiapan Workspace
          </span>
        </div>
        <div className="flex flex-col gap-1.5 p-1.5 lg:flex-row lg:items-stretch">
          {setupPhase.map((step, i) => (
            <Fragment key={step.id}>
              <StepCard
                step={step}
                isActive={activeIndex === i}
                onClick={() => pickStep(i)}
              />
              {i < setupPhase.length - 1 && (
                <HorizConnector lit={activeIndex === i || activeIndex === i + 1} />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <PhaseDivider />

      {/* Phase 2 */}
      <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-1">
        <div className="px-4 pb-1 pt-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
            Validasi &amp; Pelaporan
          </span>
        </div>
        <div className="flex flex-col gap-1.5 p-1.5 lg:flex-row lg:items-stretch">
          {dailyPhase.map((step, i) => {
            const idx = i + setupPhase.length;
            return (
              <Fragment key={step.id}>
                <StepCard
                  step={step}
                  isActive={activeIndex === idx}
                  onClick={() => pickStep(idx)}
                />
                {i < dailyPhase.length - 1 && (
                  <HorizConnector lit={activeIndex === idx || activeIndex === idx + 1} />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      <ActiveStepPanel activeIndex={activeIndex} />

      {/* Step progress dots */}
      <div className="flex gap-1.5 px-1 pt-1">
        {allSteps.map((step, i) => (
          <button
            key={step.id}
            aria-label={`Step ${i + 1}: ${step.title}`}
            onClick={() => pickStep(i)}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i === activeIndex ? "bg-[#1769ff]" : "bg-white/18"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
