import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Clock3,
  Fingerprint,
  MapPin,
  QrCode,
  RadioTower,
  ShieldCheck,
  Smartphone,
  UsersRound
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Shell } from "../components/Shell";

const revealViewport = { once: true, margin: "-80px" } as const;

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65 } }
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } }
};

const deskItems = [
  {
    icon: QrCode,
    title: "QR refresh otomatis",
    copy: "Token scanner berubah berkala supaya check-in tetap cepat tanpa membuka celah titip scan."
  },
  {
    icon: MapPin,
    title: "Lokasi punya guard",
    copy: "Check-in di luar radius tidak langsung masuk laporan final. Admin melihatnya sebagai antrian review."
  },
  {
    icon: Fingerprint,
    title: "Bukti hadir berlapis",
    copy: "QR, waktu, lokasi, dan selfie bisa dipakai sebagai konteks sebelum data masuk payroll."
  }
];

const workflowSteps = [
  ["01", "Scan", "Tim check-in dari PWA atau gate scanner."],
  ["02", "Validasi", "Sistem membaca lokasi, waktu, perangkat, dan status shift."],
  ["03", "Review", "Anomali masuk queue admin, bukan laporan final."],
  ["04", "Laporan", "Data yang lolos guard siap dipakai HR dan payroll."]
];

const roleCards = [
  {
    icon: UsersRound,
    title: "Admin HR",
    copy: "Dashboard ringan untuk melihat siapa hadir, siapa terlambat, dan apa yang perlu keputusan."
  },
  {
    icon: Smartphone,
    title: "Karyawan mobile",
    copy: "Check-in dibuat secepat membuka app, tanpa formulir internal yang berat."
  },
  {
    icon: RadioTower,
    title: "Scanner gate",
    copy: "Mode scanner fokus pada scan, refresh token, dan status lokasi kerja."
  }
];

const trustSignals = [
  { value: "30s", label: "QR token refresh" },
  { value: "3 mode", label: "Admin, mobile, scanner" },
  { value: "1 queue", label: "Review pengecualian" },
  { value: "24/7", label: "Siap untuk shift" }
];

const faqs = [
  {
    question: "Apakah Taptu hanya untuk tim lapangan?",
    answer: "Tidak. Taptu cocok untuk tim hybrid yang punya kantor, gate scanner, lokasi lapangan, dan karyawan mobile."
  },
  {
    question: "Apa yang bisa dicoba di demo?",
    answer: "Kamu bisa masuk sebagai admin, karyawan, atau scanner untuk melihat alur utama dari sisi yang berbeda."
  },
  {
    question: "Apa yang perlu disiapkan sebelum produksi?",
    answer: "Aturan lokasi, struktur shift, kebijakan approval, database produksi, OTP, dan integrasi payroll jika dibutuhkan."
  }
];

function PrimaryLink({ children, to }: { children: ReactNode; to: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        className="inline-flex items-center justify-center rounded-2xl bg-[#1769ff] px-6 py-4 text-sm font-bold text-white shadow-[0_18px_42px_rgba(23,105,255,0.28)] transition hover:bg-[#0d5be8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]"
      >
        {children}
      </Link>
    </motion.div>
  );
}

function SectionLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <motion.a
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-[#d8dde7] bg-white px-6 py-4 text-sm font-bold text-[#111827] shadow-[0_12px_32px_rgba(20,24,31,0.06)] transition hover:border-[#b9c2d3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.a>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">{children}</p>;
}

export function LandingPage() {
  return (
    <Shell>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-[#d9d9d9] px-4 py-6 text-[#101217] sm:px-6 lg:px-8">
          <motion.main initial="hidden" animate="visible" variants={stagger}>
            <section className="mx-auto max-w-7xl overflow-hidden rounded-[34px] border border-white/70 bg-[#f9fafc] shadow-[0_34px_90px_rgba(20,24,31,0.18)]">
              <header className="relative z-20 flex items-center justify-between border-b border-[#edf0f5] px-5 py-4 md:px-8">
                <a href="#top" className="flex items-center gap-3" aria-label="Taptu home">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#111827] text-sm font-black text-white">
                    T
                  </span>
                  <span className="text-sm font-black tracking-[-0.02em]">Taptu</span>
                </a>
                <nav className="hidden items-center gap-8 text-xs font-semibold text-[#596172] md:flex" aria-label="Primary navigation">
                  <a href="#desk" className="transition hover:text-[#111827]">
                    Platform
                  </a>
                  <a href="#workflow" className="transition hover:text-[#111827]">
                    Workflow
                  </a>
                  <a href="#roles" className="transition hover:text-[#111827]">
                    Roles
                  </a>
                  <a href="#faq" className="transition hover:text-[#111827]">
                    FAQ
                  </a>
                </nav>
                <div className="flex items-center gap-3">
                  <Link className="hidden text-xs font-semibold text-[#596172] transition hover:text-[#111827] sm:inline" to="/login">
                    Sign in
                  </Link>
                  <Link
                    className="rounded-xl border border-[#d8dde7] bg-white px-4 py-2.5 text-xs font-bold text-[#111827] shadow-[0_10px_24px_rgba(20,24,31,0.06)]"
                    to="/login"
                  >
                    Coba demo
                  </Link>
                </div>
              </header>

              <div id="top" className="relative min-h-[680px] overflow-hidden px-5 py-14 md:px-8 lg:min-h-[720px]">
                <div className="absolute inset-0 bg-[radial-gradient(#d9dee8_1px,transparent_1px)] [background-size:18px_18px]" />
                <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f9fafc] to-transparent" />

                <motion.div
                  className="absolute left-6 top-16 hidden w-56 rotate-[-6deg] rounded-[22px] border border-[#ece3a8] bg-[#fff177] p-5 shadow-[0_24px_60px_rgba(20,24,31,0.16)] lg:block"
                  variants={fadeUp}
                >
                  <p className="text-sm font-black leading-6 text-[#37321a]">Catatan shift</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f5623]">Review scan luar radius sebelum tutup payroll.</p>
                </motion.div>

                <motion.div
                  className="absolute right-10 top-20 hidden w-56 rotate-[7deg] rounded-[24px] border border-[#e7ebf2] bg-white p-5 shadow-[0_24px_70px_rgba(20,24,31,0.14)] lg:block"
                  variants={fadeUp}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-9 w-9 rounded-2xl bg-[#f1f5ff] p-2 text-[#1769ff]" />
                    <div>
                      <p className="text-sm font-black">Reminder</p>
                      <p className="text-xs text-[#7a8495]">Approval izin</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-[#f6f8fb] p-3 text-xs font-bold text-[#596172]">14 request menunggu</div>
                </motion.div>

                <motion.div
                  className="absolute bottom-10 left-8 hidden w-64 rounded-[24px] border border-[#e7ebf2] bg-white p-5 shadow-[0_24px_70px_rgba(20,24,31,0.12)] md:block"
                  variants={fadeUp}
                >
                  <p className="text-sm font-black">Validasi hari ini</p>
                  <div className="mt-4 space-y-3">
                    {["QR Gate Timur", "GPS Kantor Pusat"].map((item, index) => (
                      <div key={item}>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#596172]">
                          <span>{item}</span>
                          <span>{index === 0 ? "82%" : "64%"}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#ecf0f6]">
                          <div className={index === 0 ? "h-full w-[82%] rounded-full bg-[#1769ff]" : "h-full w-[64%] rounded-full bg-[#ff7a45]"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="absolute bottom-12 right-8 hidden w-64 rounded-[24px] border border-[#e7ebf2] bg-white p-5 shadow-[0_24px_70px_rgba(20,24,31,0.12)] md:block"
                  variants={fadeUp}
                >
                  <p className="text-sm font-black">Integrasi operasional</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[CalendarCheck, ShieldCheck, Clock3].map((Icon, index) => (
                      <div key={index} className="grid h-14 place-items-center rounded-2xl bg-[#f6f8fb]">
                        <Icon className="h-6 w-6 text-[#1769ff]" />
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center pt-20 text-center md:pt-24" variants={fadeUp}>
                  <div className="grid h-16 w-16 place-items-center rounded-[22px] border border-[#e2e7f0] bg-white shadow-[0_22px_50px_rgba(20,24,31,0.12)]">
                    <div className="grid grid-cols-2 gap-1.5">
                      <span className="h-3.5 w-3.5 rounded-full bg-[#1769ff]" />
                      <span className="h-3.5 w-3.5 rounded-full bg-[#111827]" />
                      <span className="h-3.5 w-3.5 rounded-full bg-[#7dd3fc]" />
                      <span className="h-3.5 w-3.5 rounded-full bg-[#a3a3a3]" />
                    </div>
                  </div>
                  <h1 className="mt-9 max-w-4xl text-[46px] font-black leading-[1.02] tracking-[-0.065em] text-[#0f1115] md:text-7xl lg:text-[82px]">
                    Kelola absensi tim
                    <span className="block text-[#9aa1ad]">dalam satu alur kerja</span>
                  </h1>
                  <p className="mt-6 max-w-xl text-base leading-7 text-[#596172] md:text-lg">
                    Taptu menyatukan check-in mobile, scanner gate, validasi lokasi, approval izin, dan laporan admin dalam
                    satu workspace yang terasa ringan.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <PrimaryLink to="/login">
                      Coba demo Taptu
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </PrimaryLink>
                    <SectionLink href="#workflow">Lihat alur validasi</SectionLink>
                  </div>
                </motion.div>
              </div>
            </section>

            <motion.section
              id="desk"
              className="mx-auto mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-14 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-20"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                <motion.div variants={fadeUp}>
                  <SectionLabel>Platform</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Attendance desk yang siap dipakai.
                  </h2>
                  <p className="mt-5 max-w-lg text-base leading-8 text-[#596172]">
                    Desain baru mengikuti pola hero yang bersih: banyak ruang kosong, satu pesan utama, dan UI attendance yang
                    langsung menjelaskan fungsi produk.
                  </p>
                </motion.div>
                <div className="grid gap-4 md:grid-cols-3">
                  {deskItems.map((item) => (
                    <motion.article
                      key={item.title}
                      className="rounded-[26px] border border-[#edf0f5] bg-[#f9fafc] p-6"
                      variants={fadeUp}
                      whileHover={{ y: -5 }}
                    >
                      <item.icon className="h-11 w-11 rounded-2xl bg-white p-2.5 text-[#1769ff] shadow-[0_14px_30px_rgba(20,24,31,0.08)]" />
                      <h3 className="mt-6 text-xl font-black tracking-[-0.03em]">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#596172]">{item.copy}</p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              id="workflow"
              className="mx-auto mt-8 max-w-7xl overflow-hidden rounded-[32px] bg-[#101217] px-5 py-14 text-white shadow-[0_24px_70px_rgba(20,24,31,0.18)] md:px-8 lg:px-12 lg:py-20"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                <motion.div variants={fadeUp}>
                  <SectionLabel>Workflow</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Dari scan sampai laporan.
                  </h2>
                  <p className="mt-5 max-w-lg text-base leading-8 text-[#b7bfca]">
                    Setiap check-in punya status. Alur ini membuat data yang masuk payroll lebih bersih dan lebih mudah
                    dipertanggungjawabkan.
                  </p>
                </motion.div>
                <div className="grid gap-4">
                  {workflowSteps.map(([number, title, copy]) => (
                    <motion.article
                      key={title}
                      className="grid gap-5 rounded-[26px] border border-white/10 bg-white/[0.07] p-5 md:grid-cols-[72px_1fr]"
                      variants={fadeUp}
                    >
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#1769ff] text-lg font-black">{number}</div>
                      <div>
                        <h3 className="text-2xl font-black tracking-[-0.04em]">{title}</h3>
                        <p className="mt-2 text-base leading-7 text-[#b7bfca]">{copy}</p>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              id="roles"
              className="mx-auto mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-14 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-20"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <motion.div className="mx-auto max-w-3xl text-center" variants={fadeUp}>
                <SectionLabel>Dibuat untuk tiga mode kerja</SectionLabel>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                  Dibuat untuk tiga mode kerja.
                </h2>
                <p className="mt-5 text-base leading-8 text-[#596172]">
                  Setiap peran melihat interface yang sesuai konteks, bukan dashboard yang dipaksakan sama untuk semua orang.
                </p>
              </motion.div>
              <div className="mt-10 grid gap-4 lg:grid-cols-3">
                {roleCards.map((role) => (
                  <motion.article
                    key={role.title}
                    className="rounded-[28px] border border-[#edf0f5] bg-[#f9fafc] p-7"
                    variants={fadeUp}
                    whileHover={{ y: -5 }}
                  >
                    <role.icon className="h-12 w-12 rounded-2xl bg-white p-2.5 text-[#1769ff] shadow-[0_14px_30px_rgba(20,24,31,0.08)]" />
                    <h3 className="mt-7 text-2xl font-black tracking-[-0.04em]">{role.title}</h3>
                    <p className="mt-3 text-base leading-8 text-[#596172]">{role.copy}</p>
                  </motion.article>
                ))}
              </div>
            </motion.section>

            <motion.section
              className="mx-auto mt-8 max-w-7xl rounded-[32px] bg-[#f9fafc] px-5 py-14 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-20"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <motion.div variants={fadeUp}>
                  <SectionLabel>Trust signals</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Sinyal yang membuat admin percaya.
                  </h2>
                </motion.div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {trustSignals.map((signal) => (
                    <motion.div key={signal.label} className="rounded-[26px] bg-white p-6 text-center" variants={fadeUp}>
                      <p className="text-4xl font-black tracking-[-0.06em] text-[#1769ff]">{signal.value}</p>
                      <p className="mt-3 text-sm font-bold text-[#596172]">{signal.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              id="faq"
              className="mx-auto mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-14 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-20"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
                <motion.div variants={fadeUp}>
                  <SectionLabel>FAQ</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Pertanyaan sebelum mulai.
                  </h2>
                </motion.div>
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <motion.article key={faq.question} className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-6" variants={fadeUp}>
                      <h3 className="text-lg font-black tracking-[-0.02em]">{faq.question}</h3>
                      <p className="mt-3 text-base leading-7 text-[#596172]">{faq.answer}</p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              className="mx-auto mt-8 max-w-7xl rounded-[32px] bg-[#1769ff] px-5 py-12 text-white shadow-[0_24px_70px_rgba(23,105,255,0.22)] md:px-8 lg:px-12"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={fadeUp}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Mulai dari demo</p>
                  <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Coba alur Taptu sebelum masuk produksi.
                  </h2>
                </div>
                <PrimaryLink to="/login">
                  Coba demo Taptu
                  <ArrowRight className="ml-2 h-4 w-4" />
                </PrimaryLink>
              </div>
            </motion.section>
          </motion.main>

          <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-2 py-8 text-sm text-[#596172] md:flex-row md:items-center md:justify-between">
            <p className="font-black text-[#101217]">Taptu Attendance OS</p>
            <p>Web, PWA, scanner, dan admin workflow untuk absensi tim.</p>
          </footer>
        </div>
      </MotionConfig>
    </Shell>
  );
}
