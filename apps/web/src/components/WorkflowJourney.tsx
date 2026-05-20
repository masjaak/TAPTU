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
  chapter: 0 | 1 | 2;
}

const STEPS: Step[] = [
  // Chapter 0: Setup Workspace
  {
    id: "01", chapter: 0, chip: "Superadmin",
    title: "Buat Workspace",
    desc: "Superadmin membuat workspace pertama dan menjadi pemilik sistem."
  },
  {
    id: "02", chapter: 0, chip: "Setup",
    title: "Setup Organisasi",
    desc: "Atur lokasi kerja, shift, divisi, dan aturan validasi absensi."
  },
  {
    id: "03", chapter: 0, chip: "HR/Admin",
    title: "Tambah Admin HR",
    desc: "HR/Admin mendapat akses monitor absensi, approval, dan laporan."
  },
  {
    id: "04", chapter: 0, chip: "Manager",
    title: "Tambah Manager",
    desc: "Manager hanya melihat tim yang berada dalam supervisinya."
  },
  {
    id: "05", chapter: 0, chip: "Employee",
    title: "Tambah Karyawan",
    desc: "Karyawan ditetapkan ke divisi, manager, shift, dan lokasi kerja."
  },
  // Chapter 1: Validasi Kehadiran
  {
    id: "06", chapter: 1, chip: "Check-in",
    title: "Check-in Karyawan",
    desc: "Karyawan check-in melalui mobile, QR, selfie, atau scanner."
  },
  {
    id: "07", chapter: 1, chip: "Validasi",
    title: "Validasi & Review",
    desc: "Taptu cek waktu, lokasi, perangkat, QR/scanner, dan selfie proof. Data bermasalah masuk antrean."
  },
  // Chapter 2: Approval & Laporan
  {
    id: "08", chapter: 2, chip: "HR Ready",
    title: "Laporan HR-Ready",
    desc: "HR memberi keputusan final. Data bersih siap untuk rekap dan Payroll Input Readiness."
  }
];

const CHAPTER_INFO = [
  { label: "Setup Workspace",      dot: "#1769ff", pill: "bg-blue-500/15 text-blue-300 border-blue-400/30" },
  { label: "Validasi Kehadiran",   dot: "#f59e0b", pill: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  { label: "Approval & Laporan",   dot: "#10b981", pill: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" }
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tx(on: string, off: string, active: boolean) {
  return active ? on : off;
}

// ─── Browser frame (Setup + Report stages) ────────────────────────────────────

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_28px_80px_rgba(10,18,32,0.32),0_4px_16px_rgba(10,18,32,0.14)]">
      <div className="flex items-center gap-2 border-b border-gray-200/80 bg-[#F2F4F7] px-4 py-2.5">
        <div className="flex gap-1.5 shrink-0">
          <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 mx-3">
          <div className="rounded-[6px] bg-white/80 py-1 text-center text-[11px] text-gray-400">
            app.taptu.id
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Phone frame (Attendance stage) ──────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-52 overflow-hidden rounded-[36px] border-[5px] border-[#1A1D26] bg-[#1A1D26] shadow-[0_28px_80px_rgba(10,18,32,0.40)]">
      <div className="relative overflow-hidden rounded-[28px] bg-[#0D0F16]" style={{ minHeight: 300 }}>
        <div className="absolute left-1/2 top-3 z-10 h-3.5 w-16 -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

// ─── Stage content per step (all kept in DOM via opacity toggle) ──────────────

// Step 01 — Buat Workspace
function Stage01() {
  return (
    <BrowserFrame>
      <div className="p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Workspace baru</p>
        <div className="flex items-center gap-3 rounded-[12px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#1769ff] text-sm font-black text-white">
            T
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-gray-900">PT Maju Jaya</p>
            <p className="mt-0.5 text-xs text-gray-400">taptu.app/pt-maju-jaya</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-700">Workspace aktif</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[["Superadmin", "#1769ff"], ["Owner", "#6366f1"]].map(([role, col]) => (
            <div key={role} className="rounded-[10px] bg-gray-50 p-3">
              <div className="grid h-7 w-7 place-items-center rounded-[8px] text-[10px] font-black text-white" style={{ background: col }}>S</div>
              <p className="mt-2 text-xs font-black text-gray-800">{role}</p>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

// Step 02 — Setup Organisasi
function Stage02() {
  const rows = [
    ["Lokasi", "Kantor Pusat — Jakarta"],
    ["Shift", "07:00 – 16:00"],
    ["GPS radius", "500 m"],
    ["Validasi", "QR + Selfie + GPS"]
  ] as const;
  return (
    <BrowserFrame>
      <div className="p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Setup Organisasi</p>
        <div className="divide-y divide-gray-100 rounded-[12px] border border-gray-100 bg-white shadow-sm">
          {rows.map(([label, val]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-700">{val}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-[10px] bg-blue-50 border border-blue-200 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#1769ff]" />
          <span className="text-[11px] font-bold text-blue-700">Konfigurasi disimpan</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

// Step 03 — Tambah Admin HR
function Stage03() {
  return (
    <BrowserFrame>
      <div className="p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Undang Admin HR</p>
        <div className="rounded-[12px] border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-sm font-black text-teal-700">N</div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-gray-900">Nadia Putri</p>
              <p className="mt-0.5 text-xs text-gray-500">nadia@pt-maju-jaya.com</p>
            </div>
            <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-700">
              Akses penuh
            </span>
          </div>
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {["Absensi", "Approval", "Laporan", "Divisi"].map(f => (
                <span key={f} className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{f}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[10px] bg-teal-50 border border-teal-200 px-3 py-2 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          <span className="text-[11px] font-bold text-teal-700">HR/Admin role aktif</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

// Step 04 — Tambah Manager
function Stage04() {
  return (
    <BrowserFrame>
      <div className="p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Tambah Manager</p>
        <div className="rounded-[12px] border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">R</div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-gray-900">Raka Saputra</p>
              <p className="mt-0.5 text-xs text-gray-500">Manager — Divisi Operasional</p>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {["F","A","D","B","C"].map((l, i) => (
                  <div key={i} className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-gray-200 text-[9px] font-black text-gray-600">{l}</div>
                ))}
              </div>
              <span className="text-xs text-gray-500">12 karyawan dalam tim</span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// Step 05 — Tambah Karyawan
function Stage05() {
  return (
    <BrowserFrame>
      <div className="p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Tambah Karyawan</p>
        <div className="rounded-[12px] border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-200 text-sm font-black text-gray-600">F</div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-gray-900">Fikri Maulana</p>
              <p className="mt-0.5 text-xs text-gray-500">fikri@pt-maju-jaya.com</p>
            </div>
          </div>
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {["Divisi Operasional", "Shift Pagi 07:00", "Blok A — Jakarta"].map(tag => (
                <span key={tag} className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["Manager", "Raka S."], ["Shift", "07:00–16:00"], ["Lokasi", "Blok A"]].map(([k, v]) => (
            <div key={k} className="rounded-[10px] bg-gray-50 border border-gray-100 p-2 text-center">
              <p className="text-[9px] text-gray-400">{k}</p>
              <p className="mt-0.5 text-[11px] font-black text-gray-700">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

// Step 06 — Check-in Karyawan (phone frame)
function Stage06() {
  return (
    <PhoneFrame>
      <div className="px-4 pt-10 pb-5 space-y-3">
        <div className="text-center">
          <p className="text-3xl font-black tabular-nums text-white">08:42</p>
          <p className="mt-0.5 text-xs text-white/40">Senin, 20 Mei 2026</p>
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 py-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-300">In radius</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {["QR", "Manual", "Scanner"].map(m => (
            <div key={m} className="rounded-[10px] bg-white/8 border border-white/12 py-2 text-center text-[10px] font-bold text-white/60">
              {m}
            </div>
          ))}
        </div>
        <div className="rounded-[12px] bg-[#1769ff] py-2.5 text-center text-[11px] font-black text-white">
          Check-in Sekarang
        </div>
        <div className="divide-y divide-white/8 rounded-[12px] bg-white/6 border border-white/10 text-[10px]">
          {[["Lokasi", "Kantor Pusat ✓"], ["GPS", "500 m ✓"], ["Perangkat", "Terdaftar ✓"]].map(([k,v]) => (
            <div key={k} className="flex items-center justify-between px-3 py-1.5">
              <span className="text-white/40">{k}</span>
              <span className="font-bold text-emerald-300">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Step 07 — Validasi & Review (phone + side panel)
function Stage07() {
  const checks = [
    { label: "Waktu", val: "08:42", ok: true },
    { label: "Lokasi", val: "Kantor Pusat", ok: true },
    { label: "QR/Scanner", val: "Valid", ok: true },
    { label: "Selfie", val: "Butuh Review", ok: false }
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      <PhoneFrame>
        <div className="px-4 pt-10 pb-4 space-y-2">
          <p className="text-center text-xs font-black text-white/60">Validasi Otomatis</p>
          <div className="divide-y divide-white/8 rounded-[12px] bg-white/6 border border-white/10">
            {checks.map(({ label, val, ok }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2">
                <div className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-emerald-400" : "bg-orange-400"}`} />
                <span className="flex-1 text-[10px] text-white/60">{label}</span>
                <span className={`text-[10px] font-bold ${ok ? "text-emerald-300" : "text-orange-300"}`}>{val}</span>
              </div>
            ))}
          </div>
          <div className="rounded-[10px] bg-orange-500/15 border border-orange-400/30 px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-orange-300">1 item masuk antrean review</span>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

// Step 08 — Laporan HR-Ready
function Stage08() {
  const stats = [
    { val: "18", label: "Hadir", col: "text-emerald-600" },
    { val: "2", label: "Terlambat", col: "text-amber-600" },
    { val: "1", label: "Izin", col: "text-blue-600" }
  ] as const;
  return (
    <BrowserFrame>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Laporan Kehadiran</p>
            <p className="mt-0.5 font-black text-gray-900">Rekap Mei 2026</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
            HR Ready
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map(({ val, label, col }) => (
            <div key={label} className="rounded-[12px] border border-gray-100 bg-white p-3 text-center shadow-sm">
              <p className={`text-2xl font-black ${col}`}>{val}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[12px] border border-gray-100 bg-white p-4 shadow-sm space-y-2">
          {[
            { label: "Status", val: "Siap ekspor", ok: true },
            { label: "Approval", val: "Selesai", ok: true },
            { label: "Exception", val: "0 pending", ok: true }
          ].map(({ label, val, ok }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`flex items-center gap-1 text-[11px] font-bold ${ok ? "text-emerald-700" : "text-gray-600"}`}>
                {ok && <span className="text-emerald-500">✓</span>} {val}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-700">Payroll Input Readiness</span>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">Export</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

const STAGE_COMPONENTS = [Stage01, Stage02, Stage03, Stage04, Stage05, Stage06, Stage07, Stage08] as const;

// ─── Product stage (all steps always in DOM, opacity toggle) ─────────────────

function ProductStage({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative">
      {STEPS.map((step, i) => {
        const StageComp = STAGE_COMPONENTS[i];
        return (
          <div
            key={step.id}
            aria-hidden={i !== activeIndex}
            className={`transition-all duration-500 ${
              i === activeIndex
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none absolute inset-0 opacity-0"
            }`}
          >
            <StageComp />
          </div>
        );
      })}
    </div>
  );
}

// ─── Chapter label pill ───────────────────────────────────────────────────────

function ChapterPill({ chapter, small = false }: { chapter: 0 | 1 | 2; small?: boolean }) {
  const info = CHAPTER_INFO[chapter];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold ${info.pill} ${
        small ? "text-[9px]" : "text-[10px]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.dot }} />
      {info.label}
    </span>
  );
}

// ─── Desktop step list ────────────────────────────────────────────────────────

function StepListItem({
  step,
  stepIdx,
  isActive,
  isDone,
  onClick
}: {
  step: Step;
  stepIdx: number;
  isActive: boolean;
  isDone: boolean;
  onClick: () => void;
}) {
  const dotColor = CHAPTER_INFO[step.chapter].dot;
  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-[14px] px-4 py-3 text-left transition-all duration-400 ${
        isActive ? "bg-white/[0.07] ring-1 ring-white/10" : "hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Dot */}
        <div className="relative mt-1 flex shrink-0 flex-col items-center">
          <div
            className="h-3 w-3 rounded-full border-2 transition-all duration-500"
            style={{
              borderColor: isActive || isDone ? dotColor : "rgba(255,255,255,0.20)",
              background: isActive || isDone ? dotColor : "transparent"
            }}
          />
        </div>
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-black transition-colors duration-400 ${
                isActive ? "text-white" : isDone ? "text-white/60" : "text-white/40"
              }`}
            >
              {stepIdx + 1 < 10 ? `0${stepIdx + 1}` : stepIdx + 1}
            </span>
            <p
              className={`text-[13px] font-black leading-tight transition-colors duration-400 ${
                isActive ? "text-white" : isDone ? "text-white/55" : "text-white/35"
              }`}
            >
              {step.title}
            </p>
          </div>
          {isActive && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="mt-1.5 text-xs leading-5 text-white/50"
            >
              {step.desc}
            </motion.p>
          )}
        </div>
      </div>
    </button>
  );
}

function StepListPanel({ activeIndex, onPick }: { activeIndex: number; onPick: (i: number) => void }) {
  const chapters = [0, 1, 2] as const;
  return (
    <div className="space-y-2">
      {chapters.map((ch) => {
        const chSteps = STEPS.map((s, i) => ({ s, i })).filter(({ s }) => s.chapter === ch);
        return (
          <div key={ch}>
            {/* Chapter label */}
            <div className="mb-1.5 px-4">
              <ChapterPill chapter={ch} />
            </div>
            {/* Steps */}
            {chSteps.map(({ s, i }) => (
              <StepListItem
                key={s.id}
                step={s}
                stepIdx={i}
                isActive={activeIndex === i}
                isDone={activeIndex > i}
                onClick={() => onPick(i)}
              />
            ))}
            {/* Divider between chapters */}
            {ch < 2 && <div className="my-3 mx-4 h-px bg-white/8" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Desktop caption bar (below product stage) ────────────────────────────────

function StageCaption({ activeIndex }: { activeIndex: number }) {
  const step = STEPS[activeIndex];
  return (
    <div className="mt-4 overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.05] px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#1769ff] text-xs font-black text-white">
          {step.id}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-black text-white">{step.title}</p>
            <ChapterPill chapter={step.chapter} small />
          </div>
          <p className="mt-1 text-sm leading-6 text-white/50">{step.desc}</p>
        </div>
        <span className="shrink-0 text-xs font-bold tabular-nums text-white/25">
          {activeIndex + 1} / {STEPS.length}
        </span>
      </div>
    </div>
  );
}

// ─── Mobile layout ────────────────────────────────────────────────────────────

function MobileLayout({ activeIndex, onPick }: { activeIndex: number; onPick: (i: number) => void }) {
  return (
    <div className="space-y-5">
      {/* Chapter sections */}
      {([0, 1, 2] as const).map((ch) => {
        const chSteps = STEPS.map((s, i) => ({ s, i })).filter(({ s }) => s.chapter === ch);
        const isChActive = STEPS[activeIndex].chapter === ch;
        return (
          <div key={ch}>
            <div className="mb-2">
              <ChapterPill chapter={ch} />
            </div>
            <div className="space-y-1.5">
              {chSteps.map(({ s, i }) => (
                <button
                  key={s.id}
                  onClick={() => onPick(i)}
                  className={`flex w-full items-start gap-3 rounded-[12px] border p-3.5 text-left transition-all duration-400 ${
                    activeIndex === i
                      ? "border-[#1769ff]/40 bg-[#1769ff]/10"
                      : "border-white/8 bg-white/[0.04] hover:bg-white/[0.07]"
                  }`}
                >
                  <div
                    className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 transition-all duration-400"
                    style={{
                      borderColor: activeIndex === i || activeIndex > i ? CHAPTER_INFO[s.chapter].dot : "rgba(255,255,255,0.20)",
                      background: activeIndex === i || activeIndex > i ? CHAPTER_INFO[s.chapter].dot : "transparent"
                    }}
                  />
                  <div className="min-w-0">
                    <p className={`text-[12px] font-black leading-tight ${activeIndex === i ? "text-white" : "text-white/45"}`}>
                      {s.title}
                    </p>
                    {activeIndex === i && (
                      <p className="mt-1 text-[11px] leading-5 text-white/50">{s.desc}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkflowJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TICK — auto-advance every CYCLE_MS
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

  useEffect(() => () => { if (resumeRef.current) clearTimeout(resumeRef.current); }, []);

  function pick(i: number) {
    setActiveIndex(i);
    setPaused(true);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), RESUME_MS);
  }

  return (
    <div className="mt-10 space-y-4">

      {/* ── Desktop: step list (left) + product stage (right) ─────────────── */}
      <div className="hidden lg:flex items-start gap-8">
        {/* Left: step list */}
        <div className="w-72 xl:w-80 shrink-0">
          <StepListPanel activeIndex={activeIndex} onPick={pick} />
        </div>

        {/* Right: product stage + caption */}
        <div className="min-w-0 flex-1">
          {/* Floating glow behind the mockup */}
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-8 rounded-full opacity-30 blur-3xl"
              style={{
                background: `radial-gradient(ellipse, ${CHAPTER_INFO[STEPS[activeIndex].chapter].dot}44 0%, transparent 70%)`
              }}
            />
            <motion.div
              key={`mockup-${loopKey}-${activeIndex}`}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <ProductStage activeIndex={activeIndex} />
            </motion.div>
          </div>
          <StageCaption activeIndex={activeIndex} />
        </div>
      </div>

      {/* ── Mobile: product stage (top) + chapter step list (below) ─────── */}
      <div className="lg:hidden space-y-5">
        <ProductStage activeIndex={activeIndex} />
        <MobileLayout activeIndex={activeIndex} onPick={pick} />
      </div>

      {/* ── Progress dots ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 pt-2">
        {STEPS.map((step, i) => (
          <button
            key={step.id}
            aria-label={`Step ${i + 1}: ${step.title}`}
            onClick={() => pick(i)}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i === activeIndex
                ? "opacity-100"
                : activeIndex > i
                ? "opacity-50"
                : "opacity-20"
            }`}
            style={{ background: i <= activeIndex ? CHAPTER_INFO[STEPS[i].chapter].dot : "#ffffff" }}
          />
        ))}
      </div>
    </div>
  );
}
