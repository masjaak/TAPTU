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

import { WorkflowJourney } from "../components/WorkflowJourney";

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
    copy: "Token scanner berganti berkala agar check-in tetap cepat tanpa membuka celah titip scan."
  },
  {
    icon: MapPin,
    title: "Lokasi punya guard",
    copy: "Check-in di luar radius tidak langsung jadi data final. HR melihatnya sebagai antrian review."
  },
  {
    icon: Fingerprint,
    title: "Bukti hadir berlapis",
    copy: "QR, waktu, lokasi, perangkat, dan selfie membantu HR membaca konteks kehadiran."
  }
];


const validationProgress = [
  {
    label: "QR Gate Timur",
    value: 82,
    color: "#1769ff"
  },
  {
    label: "GPS Kantor Pusat",
    value: 64,
    color: "#ff7a45"
  }
];

const roleCards = [
  {
    icon: Smartphone,
    title: "Employee",
    copy: "Check-in, check-out, riwayat, pengajuan, jadwal, slip gaji, dan profil pribadi."
  },
  {
    icon: UsersRound,
    title: "Manager",
    copy: "Melihat tim sendiri, meninjau pengajuan, dan mengecek pengecualian sebelum masuk HR."
  },
  {
    icon: ShieldCheck,
    title: "HR/Admin",
    copy: "Mengelola karyawan, struktur tim, lokasi, shift, approval akhir, dan laporan."
  },
  {
    icon: Fingerprint,
    title: "Superadmin",
    copy: "Mengatur organisasi, role, dan batas akses agar fitur tidak bocor ke peran yang salah."
  },
  {
    icon: RadioTower,
    title: "Scanner",
    copy: "Mode gate khusus untuk scan cepat dengan QR token yang terus diperbarui."
  }
];

const trustSignals = [
  { value: "30s", label: "QR token refresh" },
  { value: "5 role", label: "Employee, Manager, HR, Superadmin, Scanner" },
  { value: "2 tahap", label: "Approval Manager → HR" },
  { value: "1 antrian", label: "Pengecualian untuk direview" }
];

const structureCards = [
  {
    title: "Divisi & Penempatan",
    copy: "Kelompokkan karyawan berdasarkan divisi, manager, dan lokasi kerja."
  },
  {
    title: "Approval dua tahap",
    copy: "Manager memberi review awal. HR memberi keputusan final."
  },
  {
    title: "Catatan reviewer",
    copy: "Alasan penolakan atau koreksi bisa dilihat kembali oleh karyawan."
  }
];

const useCaseCards = [
  {
    title: "Kantor & Back Office",
    copy: "Absensi harian dengan shift, lokasi kerja, dan approval izin."
  },
  {
    title: "Outlet / Cabang",
    copy: "Pantau tim di beberapa lokasi tanpa mencampur data antar cabang."
  },
  {
    title: "Hotel & Operasional",
    copy: "Cocok untuk shift pagi, sore, malam, dan tim yang berpindah area."
  },
  {
    title: "Tim Lapangan",
    copy: "Check-in mobile tetap divalidasi dengan lokasi, waktu, dan perangkat."
  }
];

const productionChecklist = [
  "Data karyawan",
  "Divisi dan manager",
  "Shift kerja",
  "Lokasi kerja",
  "Aturan approval",
  "Kebijakan validasi"
];

const faqs = [
  {
    question: "Apakah Taptu hanya untuk tim lapangan?",
    answer: "Tidak. Taptu cocok untuk tim kantor, outlet, lapangan, dan karyawan mobile yang butuh validasi lokasi atau scanner gate."
  },
  {
    question: "Apa yang bisa dicoba di demo?",
    answer: "Kamu bisa mencoba alur sebagai Employee, Manager, HR, dan Scanner untuk melihat perbedaan akses tiap peran."
  },
  {
    question: "Apakah HR bisa mengatur divisi?",
    answer: "Ya. HR dapat membuat divisi, menetapkan manager, dan mengatur penempatan karyawan."
  },
  {
    question: "Apakah pengajuan langsung disetujui HR?",
    answer: "Tidak selalu. Jika karyawan memiliki manager, pengajuan masuk ke manager terlebih dahulu sebelum diteruskan ke HR."
  },
  {
    question: "Apakah data absensi langsung masuk laporan?",
    answer: "Data normal bisa masuk rekap. Data yang bermasalah masuk antrian review agar HR punya jejak keputusan."
  },
  {
    question: "Apa yang perlu disiapkan sebelum produksi?",
    answer: "Data karyawan, struktur divisi, shift, lokasi kerja, aturan approval, dan kebijakan validasi."
  }
];

const pulseLoop = {
  rotate: [0, -13, 11, -8, 5, 0],
  scale: [1, 1.08, 1.04, 1.06, 1],
  transition: { duration: 2.4, repeat: Infinity, repeatDelay: 1.6 }
};

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

function CTAWhiteLink({ children, to }: { children: ReactNode; to: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        data-testid="cta-demo-action"
        className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-sm font-bold text-[#1769ff] shadow-[0_18px_42px_rgba(255,255,255,0.22)] transition hover:bg-[#f0f4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        {children}
      </Link>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">{children}</p>;
}

export function LandingPage() {
  return (
    <Shell>
      <MotionConfig reducedMotion="user">
        <div
          className="min-h-screen bg-[#e9eaec] px-4 py-4 text-[#101217] sm:px-6 lg:px-8"
          data-testid="landing-stage"
          data-variant="card-tight"
        >
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
                  aria-label="Catatan shift sticky note"
                  className="absolute left-6 top-16 hidden w-56 rounded-[22px] border border-[#ece3a8] bg-[#fff177] p-5 shadow-[0_24px_60px_rgba(20,24,31,0.16)] lg:block"
                  data-motion-style="sticky-note"
                  initial={{ opacity: 0, y: 30, rotate: -11 }}
                  animate={{ opacity: 1, y: [0, -7, 0, 5, 0], rotate: [-6, -8, -5, -7, -6] }}
                  transition={{
                    opacity: { duration: 0.55 },
                    y: { duration: 5.8, repeat: Infinity, repeatType: "mirror" },
                    rotate: { duration: 5.8, repeat: Infinity, repeatType: "mirror" }
                  }}
                  whileHover={{ rotate: -3, scale: 1.03, y: -10 }}
                >
                  <p className="text-sm font-black leading-6 text-[#37321a]">Catatan shift</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f5623]">Scan di luar radius perlu review sebelum masuk laporan.</p>
                </motion.div>

                <motion.div
                  className="absolute right-10 top-20 hidden w-56 rounded-[24px] border border-[#e7ebf2] bg-white p-5 shadow-[0_24px_70px_rgba(20,24,31,0.14)] lg:block"
                  initial={{ opacity: 0, y: 28, rotate: 10 }}
                  animate={{ opacity: 1, y: [0, 7, 0], rotate: [7, 9, 6, 7] }}
                  transition={{
                    opacity: { duration: 0.55, delay: 0.1 },
                    y: { duration: 5.5, repeat: Infinity, repeatType: "mirror" },
                    rotate: { duration: 5.5, repeat: Infinity, repeatType: "mirror" }
                  }}
                  whileHover={{ rotate: 4, scale: 1.03, y: -6 }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div aria-label="Reminder bell notification" data-motion-style="bell-ring" animate={pulseLoop}>
                      <Bell className="h-9 w-9 rounded-2xl bg-[#f1f5ff] p-2 text-[#1769ff]" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-black">Reminder</p>
                      <p className="text-xs text-[#7a8495]">Approval izin</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-[#f6f8fb] p-3 text-xs font-bold text-[#596172]">14 pengajuan menunggu keputusan.</div>
                </motion.div>

                <motion.div
                  className="absolute bottom-10 left-8 hidden w-64 rounded-[24px] border border-[#e7ebf2] bg-white p-5 shadow-[0_24px_70px_rgba(20,24,31,0.12)] md:block"
                  variants={fadeUp}
                >
                  <p className="text-sm font-black">Validasi hari ini</p>
                  <p className="mt-2 text-xs leading-5 text-[#7a8495]">QR gate dan GPS kantor perlu dicek berkala.</p>
                  <div className="mt-4 space-y-3">
                    {validationProgress.map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#596172]">
                          <span>{item.label}</span>
                          <span>{item.value}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#ecf0f6]">
                          <motion.div
                            aria-label={`${item.label} validation progress`}
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={item.value}
                            className="h-full rounded-full"
                            data-motion-state="visible"
                            data-motion-target={item.value}
                            initial={{ width: "0%" }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ duration: 1.1, delay: 0.35 }}
                            role="progressbar"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  aria-label="Integrasi operasional icons"
                  className="absolute bottom-12 right-8 hidden w-64 rounded-[24px] border border-[#e7ebf2] bg-white p-5 shadow-[0_24px_70px_rgba(20,24,31,0.12)] md:block"
                  data-motion-style="staggered-icons"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: [0, -6, 0] }}
                  transition={{
                    opacity: { duration: 0.55, delay: 0.16 },
                    y: { duration: 6, repeat: Infinity, repeatType: "mirror" }
                  }}
                  whileHover={{ scale: 1.02, y: -10 }}
                >
                  <p className="text-sm font-black">Integrasi operasional</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[CalendarCheck, ShieldCheck, Clock3].map((Icon, index) => (
                      <motion.div
                        key={index}
                        className="grid h-14 place-items-center rounded-2xl bg-[#f6f8fb]"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3.5, delay: index * 0.35, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                        whileHover={{ y: -6 }}
                      >
                        <Icon className="h-6 w-6 text-[#1769ff]" />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center pt-20 text-center md:pt-24" variants={fadeUp}>
                  <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[#111827] shadow-[0_22px_50px_rgba(20,24,31,0.22)]">
                    <span className="text-2xl font-black tracking-[-0.02em] text-white">T</span>
                  </div>
                  <h1
                    aria-label="Absensi tim yang dicek sebelum masuk laporan."
                    className="mt-10 max-w-4xl text-[34px] font-black leading-[1.08] tracking-[-0.03em] text-[#0f1115] min-[390px]:text-[38px] sm:text-[42px] md:text-5xl lg:text-[68px]"
                    data-lines="2"
                  >
                    <span className="block" data-line="1">Absensi tim yang dicek</span>
                    <span className="block text-[#9aa1ad]" data-line="2">sebelum masuk laporan.</span>
                  </h1>
                  <p className="mt-7 max-w-2xl text-base leading-8 text-[#596172] md:text-lg">
                    Taptu membantu HR mengelola check-in, validasi lokasi, pengajuan izin, struktur tim, dan laporan kehadiran
                    tanpa memaksa semua peran memakai dashboard yang sama.
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
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-16 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-24"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                <motion.div variants={fadeUp}>
                  <SectionLabel>Platform</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Attendance desk untuk tim operasional.
                  </h2>
                  <p className="mt-5 max-w-lg text-base leading-8 text-[#596172]">
                    Satu tempat untuk melihat siapa sudah hadir, siapa terlambat, pengajuan apa yang menunggu, dan data mana
                    yang perlu diperiksa sebelum masuk laporan.
                  </p>
                </motion.div>
                <div className="grid gap-5 md:grid-cols-3">
                  {deskItems.map((item) => (
                    <motion.article
                      key={item.title}
                      className="rounded-[26px] border border-[#edf0f5] bg-[#f9fafc] p-7"
                      variants={fadeUp}
                      whileHover={{ y: -5 }}
                    >
                      <item.icon className="h-11 w-11 rounded-2xl bg-white p-2.5 text-[#1769ff] shadow-[0_14px_30px_rgba(20,24,31,0.08)]" />
                      <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#596172]">{item.copy}</p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              id="workflow"
              className="mx-auto mt-6 sm:mt-8 max-w-7xl overflow-hidden rounded-[32px] bg-[#101217] px-5 py-16 text-white shadow-[0_24px_70px_rgba(20,24,31,0.18)] md:px-8 lg:px-12 lg:py-24"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <motion.div className="mx-auto max-w-2xl text-center" variants={fadeUp}>
                <SectionLabel>Workflow</SectionLabel>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                  Bagaimana Taptu bekerja.
                </h2>
                <p className="mt-5 text-base leading-8 text-[#b7bfca]">
                  Taptu membantu perusahaan mulai dari setup workspace, mengatur role, memvalidasi absensi karyawan, sampai
                  menghasilkan laporan HR-ready yang lebih bisa dipercaya.
                </p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <WorkflowJourney />
              </motion.div>
            </motion.section>

            <motion.section
              id="roles"
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-16 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-24"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <motion.div className="mx-auto max-w-3xl text-center" variants={fadeUp}>
                <SectionLabel>Roles</SectionLabel>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                  Ruang kerja berbeda untuk tiap peran.
                </h2>
                <p className="mt-5 text-base leading-8 text-[#596172]">
                  Employee, Manager, HR, Superadmin, dan Scanner hanya melihat hal yang perlu mereka kerjakan.
                </p>
              </motion.div>
              <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                {roleCards.map((role) => (
                  <motion.article
                    key={role.title}
                    className="rounded-[28px] border border-[#edf0f5] bg-[#f9fafc] p-7 xl:p-6 2xl:p-7"
                    variants={fadeUp}
                    whileHover={{ y: -5 }}
                  >
                    <role.icon className="h-12 w-12 rounded-2xl bg-white p-2.5 text-[#1769ff] shadow-[0_14px_30px_rgba(20,24,31,0.08)]" />
                    <h3 className="mt-6 text-2xl font-black tracking-[-0.04em]">{role.title}</h3>
                    <p className="mt-3 text-base leading-7 text-[#596172]">{role.copy}</p>
                  </motion.article>
                ))}
              </div>
            </motion.section>

            <motion.section
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-14 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 md:py-16 lg:px-12 lg:py-20"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <motion.div className="max-w-3xl" variants={fadeUp}>
                <SectionLabel>Use case</SectionLabel>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                  Cocok untuk tim yang punya banyak cara hadir.
                </h2>
                <p className="mt-5 text-base leading-8 text-[#596172]">
                  Taptu bisa dipakai untuk kantor pusat, outlet, hotel, restoran, tim lapangan, dan lokasi kerja yang butuh
                  validasi kehadiran lebih rapi.
                </p>
              </motion.div>
              <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 xl:grid-cols-4">
                {useCaseCards.map((item) => (
                  <motion.article
                    key={item.title}
                    className="rounded-[26px] border border-[#edf0f5] bg-[#f9fafc] p-6"
                    variants={fadeUp}
                    whileHover={{ y: -5 }}
                  >
                    <h3 className="text-xl font-black tracking-[-0.03em]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#596172]">{item.copy}</p>
                  </motion.article>
                ))}
              </div>
            </motion.section>

            <motion.section
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-14 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 md:py-16 lg:px-12 lg:py-20"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-10">
                <motion.div variants={fadeUp}>
                  <SectionLabel>Struktur & Approval</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Approval mengikuti struktur tim.
                  </h2>
                  <p className="mt-5 max-w-lg text-base leading-8 text-[#596172]">
                    Pengajuan tidak selalu langsung ke HR. Jika karyawan punya manager, request masuk ke manager lebih dulu
                    sebelum keputusan final dari HR.
                  </p>
                </motion.div>
                <div className="grid gap-5 md:grid-cols-3">
                  {structureCards.map((item) => (
                    <motion.article
                      key={item.title}
                      className="rounded-[26px] border border-[#edf0f5] bg-[#f9fafc] p-7"
                      variants={fadeUp}
                      whileHover={{ y: -5 }}
                    >
                      <h3 className="text-xl font-black tracking-[-0.03em]">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#596172]">{item.copy}</p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-16 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-24"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                <motion.div variants={fadeUp}>
                  <SectionLabel>Siap produksi</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Yang perlu disiapkan sebelum Taptu dipakai.
                  </h2>
                </motion.div>
                <motion.div className="grid gap-3 sm:grid-cols-2 sm:gap-4" variants={fadeUp}>
                  {productionChecklist.map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] px-4 py-3.5 text-sm font-bold text-[#101217] sm:px-5 sm:py-4 sm:text-base"
                    >
                      {item}
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.section>

            <motion.section
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-[#f9fafc] px-5 py-16 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-24"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <motion.div className="mx-auto max-w-3xl text-center" variants={fadeUp}>
                <SectionLabel>Trust signals</SectionLabel>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                  Data hadir yang lebih mudah dipercaya.
                </h2>
                <p data-testid="trust-signals-copy" className="mt-5 text-base leading-8 text-[#596172]">
                  Setiap angka berasal dari proses validasi, bukan hanya tombol check-in.
                </p>
              </motion.div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {trustSignals.map((signal) => (
                  <motion.div
                    key={signal.label}
                    aria-label={`${signal.value} - ${signal.label}`}
                    className="rounded-[26px] border border-[#edf0f5] bg-white p-8 text-center shadow-[0_8px_24px_rgba(20,24,31,0.06)]"
                    variants={fadeUp}
                    whileHover={{ y: -4 }}
                  >
                    <p className="text-4xl font-black tracking-[-0.03em] text-[#1769ff]">{signal.value}</p>
                    <div className="mx-auto mt-4 h-px w-8 bg-[#edf0f5]" />
                    <p className="mt-4 text-sm font-bold leading-6 text-[#596172]">{signal.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <motion.section
              id="faq"
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-white px-5 py-16 shadow-[0_24px_70px_rgba(20,24,31,0.09)] md:px-8 lg:px-12 lg:py-24"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
                <motion.div variants={fadeUp}>
                  <SectionLabel>FAQ</SectionLabel>
                  <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Pertanyaan sebelum mencoba.
                  </h2>
                </motion.div>
                <div className="space-y-5">
                  {faqs.map((faq) => (
                    <motion.article key={faq.question} className="rounded-[24px] border border-[#edf0f5] bg-[#f9fafc] p-7" variants={fadeUp}>
                      <h3 className="text-lg font-black tracking-[-0.02em]">{faq.question}</h3>
                      <p className="mt-3 text-base leading-7 text-[#596172]">{faq.answer}</p>
                    </motion.article>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              className="mx-auto mt-6 sm:mt-8 max-w-7xl rounded-[32px] bg-[#1769ff] px-5 py-16 text-white shadow-[0_24px_70px_rgba(23,105,255,0.22)] md:px-8 lg:px-12 lg:py-24"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={fadeUp}
            >
              <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="max-w-2xl">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">Mulai dari demo</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
                    Coba alur Taptu dari check-in sampai review HR.
                  </h2>
                  <p data-testid="cta-sub-copy" className="mt-4 text-base leading-7 text-white/70">
                    Coba sebagai Employee, Manager, HR, atau Scanner untuk melihat bagaimana data kehadiran diproses sebelum
                    masuk laporan.
                  </p>
                </div>
                <div className="shrink-0">
                  <CTAWhiteLink to="/login">
                    Coba demo Taptu
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </CTAWhiteLink>
                </div>
              </div>
            </motion.section>
          </motion.main>

          <footer className="mx-auto max-w-7xl px-5 pb-10 pt-6 md:px-8">
            <div className="border-t border-[#c8cacd] pt-8">
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <a href="#top" className="flex items-center gap-3" aria-label="Taptu home">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#111827] text-sm font-black text-white">
                    T
                  </span>
                  <div>
                    <p className="text-sm font-black text-[#101217]">Taptu</p>
                    <p className="text-xs text-[#7a8495]">Attendance OS</p>
                  </div>
                </a>
                <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#596172]">
                  <a href="#desk" className="transition hover:text-[#111827]">Platform</a>
                  <a href="#workflow" className="transition hover:text-[#111827]">Workflow</a>
                  <a href="#roles" className="transition hover:text-[#111827]">Roles</a>
                  <a href="#faq" className="transition hover:text-[#111827]">FAQ</a>
                </nav>
                <p className="text-xs text-[#7a8495]">© 2026 Taptu. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </MotionConfig>
    </Shell>
  );
}
