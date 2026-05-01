import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Fingerprint,
  MapPin,
  RadioTower,
  ScanLine,
  ShieldCheck,
  Smartphone,
  UsersRound
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Shell } from "../components/Shell";

const proofMetrics = [
  { value: "30s", label: "QR token refresh", detail: "Mengurangi risiko titip scan di titik kerja." },
  { value: "3 peran", label: "Admin, tim, scanner", detail: "Setiap orang melihat hal yang perlu dikerjakan saja." },
  { value: "1 alur", label: "Web dan PWA", detail: "Login, scan, izin, dan audit tetap satu bahasa visual." }
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Validasi sebelum data masuk laporan",
    description: "QR, lokasi, selfie, dan waktu dibuat sebagai checkpoint, bukan sekadar tombol hadir."
  },
  {
    icon: Clock3,
    title: "Manager melihat pengecualian lebih cepat",
    description: "Keterlambatan, izin, dan scan bermasalah naik ke permukaan tanpa membuka banyak tab."
  },
  {
    icon: BadgeCheck,
    title: "Audit trail siap dibaca ulang",
    description: "Riwayat perubahan dibuat jelas agar keputusan operasional tidak bergantung pada chat."
  }
];

const workflowStates = [
  {
    state: "01",
    title: "Tim check-in",
    copy: "Karyawan membuka PWA, scan QR, lalu sistem mencatat waktu, perangkat, dan konteks lokasi."
  },
  {
    state: "02",
    title: "Sistem memvalidasi",
    copy: "Status bergerak dari draft -> validasi lokasi -> masuk log admin. Transisi yang tidak valid ditahan."
  },
  {
    state: "03",
    title: "Admin mengambil keputusan",
    copy: "Izin, terlambat, dan anomali scan tampil sebagai antrian kerja yang bisa diprioritaskan."
  }
];

const roleCards = [
  {
    icon: UsersRound,
    title: "Admin HR",
    description: "Pantau kehadiran harian, lihat pengecualian, dan tindak lanjuti approval dari satu meja kerja."
  },
  {
    icon: Smartphone,
    title: "Karyawan lapangan",
    description: "Check-in tetap cepat di mobile tanpa merasa seperti mengisi form internal yang berat."
  },
  {
    icon: ScanLine,
    title: "Scanner gate",
    description: "Mode scanner fokus pada scan dan refresh token, bukan navigasi dashboard yang tidak perlu."
  }
];

const dashboardRows = [
  ["08.03", "Nadia check-in dari Kantor Pusat", "Valid"],
  ["08.15", "Gate Timur refresh QR token", "Sync"],
  ["09.20", "2 izin sakit menunggu manager", "Review"],
  ["10.05", "Scan luar radius ditahan sistem", "Blocked"]
];

const rolloutItems = [
  {
    title: "Demo role sudah lengkap",
    description: "Admin, karyawan, dan scanner punya pintu masuk sendiri supaya evaluasi tidak berhenti di satu tampilan."
  },
  {
    title: "PWA siap jadi kebiasaan tim",
    description: "Flow mobile dibuat cepat untuk check-in harian dan tetap cukup jelas saat dipasang seperti aplikasi."
  },
  {
    title: "Fondasi audit sudah terlihat",
    description: "Status, validasi, dan pengecualian disusun sebagai riwayat kerja yang bisa dibaca ulang oleh HR."
  },
  {
    title: "Siap disambungkan ke produksi",
    description: "Struktur login, dashboard, dan API demo sudah rapi untuk diarahkan ke database, OTP, dan payroll."
  }
];

const faqs = [
  {
    question: "Apakah Taptu hanya untuk tim lapangan?",
    answer: "Tidak. Taptu cocok untuk tim hybrid yang punya kantor, titik kerja, gate scanner, dan karyawan mobile dalam satu operasi."
  },
  {
    question: "Apakah demo ini sudah bisa dicoba tanpa setup?",
    answer: "Bisa. Gunakan akun demo di halaman login untuk melihat alur admin, karyawan, dan scanner."
  },
  {
    question: "Apa yang perlu disiapkan sebelum produksi?",
    answer: "Database produksi, aturan lokasi, kebijakan approval, metode OTP, dan integrasi payroll jika dibutuhkan."
  }
];

const revealViewport = { once: true, margin: "-80px" };
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } }
};
const staggerGroup = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } }
};

function PrimaryLink({ children, to }: { children: ReactNode; to: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        className="inline-flex items-center justify-center rounded-full bg-[#0f211c] px-6 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(15,33,28,0.22)] transition duration-200 hover:bg-[#1b332c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0f211c]"
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
      className="inline-flex items-center justify-center rounded-full border border-[#c8d2c8] bg-[#fffdf7] px-6 py-4 text-sm font-bold text-[#13231e] transition duration-200 hover:-translate-y-0.5 hover:border-[#93a994] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0f211c]"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.a>
  );
}

export function LandingPage() {
  return (
    <Shell>
      <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-hidden bg-[#f5f0e6] text-[#13231e]">
        <header className="relative z-20 border-b border-[#ded6c7]/80 bg-[#f5f0e6]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8 lg:px-10">
            <a href="#top" className="group flex items-center gap-3" aria-label="Taptu home">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#13231e] text-sm font-black text-[#f7d36b] shadow-[0_12px_30px_rgba(19,35,30,0.2)]">
                T
              </span>
              <span>
                <span className="block text-lg font-black tracking-[-0.04em]">Taptu</span>
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-[#617067]">Attendance OS</span>
              </span>
            </a>

            <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
              <a className="rounded-full px-4 py-2 text-sm font-semibold text-[#4e6057] hover:bg-white/70" href="#proof">
                Bukti
              </a>
              <a className="rounded-full px-4 py-2 text-sm font-semibold text-[#4e6057] hover:bg-white/70" href="#workflow">
                Alur
              </a>
              <a className="rounded-full px-4 py-2 text-sm font-semibold text-[#4e6057] hover:bg-white/70" href="#roles">
                Peran
              </a>
              <a className="rounded-full px-4 py-2 text-sm font-semibold text-[#4e6057] hover:bg-white/70" href="#faq">
                FAQ
              </a>
              <Link
                className="ml-2 rounded-full bg-[#13231e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#203830] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#13231e]"
                to="/login"
              >
                Coba demo Taptu
              </Link>
            </nav>
          </div>
        </header>

        <main id="top">
          <motion.section className="relative" initial="hidden" animate="visible" variants={staggerGroup}>
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(247,211,107,0.35),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(44,107,90,0.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.62),transparent_42%)]"
              initial={{ opacity: 0.65, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2 }}
            />
            <div className="absolute left-1/2 top-0 h-full w-px bg-[#d6cebf]" />
            <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-20">
              <motion.div className="max-w-3xl" variants={fadeUp}>
                <p className="inline-flex items-center rounded-full border border-[#d7cdbd] bg-[#fffaf0] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#77633a]">
                  Absensi operasional untuk tim hybrid
                </p>
                <h1 className="mt-6 max-w-4xl text-[44px] font-black leading-[0.98] tracking-[-0.055em] text-[#10201b] md:text-6xl lg:text-[72px]">
                  Absensi rapi tanpa chat berantakan.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#4d5e56] md:text-lg">
                  Taptu membantu tim lapangan, kantor, HR, dan gate scanner bergerak dalam satu alur kehadiran yang mudah
                  diaudit. Cepat untuk karyawan, jelas untuk admin, aman untuk keputusan operasional.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <PrimaryLink to="/login">
                    Coba demo Taptu
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </PrimaryLink>
                  <SectionLink href="#workflow">Lihat cara kerja</SectionLink>
                </div>

                <motion.div className="mt-9 grid gap-3 sm:grid-cols-3" variants={staggerGroup}>
                  {proofMetrics.map((metric) => (
                    <motion.div key={metric.label} className="rounded-[26px] border border-[#ded6c7] bg-[#fffaf0]/80 p-5 backdrop-blur" variants={fadeUp}>
                      <p className="text-2xl font-black tracking-[-0.05em] text-[#13231e]">{metric.value}</p>
                      <p className="mt-2 text-sm font-bold text-[#34463e]">{metric.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[#69766f]">{metric.detail}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              <motion.div className="relative lg:pt-6" variants={fadeUp}>
                <div className="absolute -right-10 top-8 hidden h-36 w-36 rounded-full bg-[#f7d36b] lg:block" />
                <div className="relative rounded-[34px] border border-[#11231d] bg-[#11231d] p-3 shadow-[0_30px_80px_rgba(17,35,29,0.22)]">
                  <div className="rounded-[26px] border border-white/10 bg-[#172b24] p-5 text-white md:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f7d36b]">Live operations board</p>
                        <h2 className="mt-3 max-w-md text-2xl font-black leading-tight tracking-[-0.035em] md:text-3xl">
                          Dibangun untuk keputusan operasional, bukan sekadar daftar hadir.
                        </h2>
                      </div>
                      <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-[#d9eee5]">
                        91% on-time
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                      <div className="rounded-[24px] bg-[#f8f1e4] p-5 text-[#13231e]">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#5c6a63]">Hari ini</p>
                          <RadioTower className="h-5 w-5 text-[#2c6b5a]" />
                        </div>
                        <div className="mt-6 space-y-4">
                          {dashboardRows.map(([time, title, status]) => (
                            <div key={title} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl bg-white px-3 py-3">
                              <span className="text-xs font-black text-[#829087]">{time}</span>
                              <span className="text-sm font-semibold leading-5 text-[#273a33]">{title}</span>
                              <span className="rounded-full bg-[#edf3ed] px-2.5 py-1 text-[11px] font-black text-[#2c6b5a]">
                                {status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.08] p-5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#a8c7ba]">Validasi</p>
                            <Fingerprint className="h-5 w-5 text-[#f7d36b]" />
                          </div>
                          <div className="mt-6 grid grid-cols-3 gap-2">
                            {["QR", "GPS", "Selfie"].map((item) => (
                              <div key={item} className="rounded-2xl bg-white/10 px-3 py-4 text-center text-sm font-black">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[24px] bg-[#f7d36b] p-5 text-[#13231e]">
                          <MapPin className="h-6 w-6" />
                          <p className="mt-4 text-sm font-black uppercase tracking-[0.16em]">Geo rule aktif</p>
                          <p className="mt-2 text-3xl font-black tracking-[-0.05em]">12 lokasi</p>
                          <p className="mt-2 text-sm leading-6 text-[#594a24]">Check-in di luar radius masuk review, bukan laporan final.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            id="proof"
            className="border-y border-[#ded6c7] bg-[#fffaf0]"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={staggerGroup}
          >
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-10 lg:py-20">
              <motion.div variants={fadeUp}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#77633a]">Trust first</p>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] text-[#10201b] md:text-[44px]">
                  Data absensi harus bisa dipercaya sebelum dipakai untuk payroll.
                </h2>
              </motion.div>
              <div className="grid gap-4 md:grid-cols-3">
                {trustPoints.map((point) => (
                  <motion.article
                    key={point.title}
                    className="rounded-[28px] border border-[#e1d8c9] bg-white p-6 shadow-[0_18px_45px_rgba(54,45,28,0.06)]"
                    variants={fadeUp}
                  >
                    <point.icon className="h-11 w-11 rounded-2xl bg-[#edf3ed] p-2.5 text-[#2c6b5a]" />
                    <h3 className="mt-5 text-xl font-black leading-tight tracking-[-0.03em] text-[#13231e]">{point.title}</h3>
                    <p className="mt-3 text-base leading-7 text-[#607068]">{point.description}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            id="workflow"
            className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:px-10 lg:py-20"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={staggerGroup}
          >
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
              <motion.div variants={fadeUp}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#77633a]">State-machine flow</p>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] text-[#10201b] md:text-[44px]">
                  Alur yang jelas sebelum tim masuk laporan final.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-[#56665f] md:text-lg">
                  Taptu memperlakukan check-in seperti transisi status. Ada kondisi awal, validasi, guard, dan hasil akhir
                  yang bisa ditelusuri.
                </p>
              </motion.div>

              <div className="grid gap-4">
                {workflowStates.map((step) => (
                  <motion.article
                    key={step.state}
                    className="grid gap-5 rounded-[30px] border border-[#ded6c7] bg-[#fffaf0] p-5 md:grid-cols-[76px_1fr] md:p-6"
                    variants={fadeUp}
                    whileHover={{ y: -4 }}
                  >
                    <div className="grid h-[72px] w-[72px] place-items-center rounded-[22px] bg-[#13231e] text-xl font-black text-[#f7d36b]">
                      {step.state}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-[-0.035em] text-[#13231e] md:text-2xl">{step.title}</h3>
                      <p className="mt-3 text-base leading-7 text-[#5f6f67]">{step.copy}</p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            id="roles"
            className="bg-[#13231e] text-white"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={staggerGroup}
          >
            <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div className="max-w-3xl" variants={fadeUp}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f7d36b]">Role clarity</p>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] md:text-[44px]">
                  Siap dipakai oleh tiga peran tanpa membuat semuanya terasa sama.
                </h2>
              </motion.div>

              <div className="mt-9 grid gap-4 lg:grid-cols-3">
                {roleCards.map((role) => (
                  <motion.article
                    key={role.title}
                    className="rounded-[30px] border border-white/10 bg-white/[0.08] p-7"
                    variants={fadeUp}
                    whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.11)" }}
                  >
                    <role.icon className="h-12 w-12 rounded-2xl bg-white/10 p-2.5 text-[#f7d36b]" />
                    <h3 className="mt-6 text-2xl font-black tracking-[-0.04em]">{role.title}</h3>
                    <p className="mt-3 text-base leading-8 text-[#c4d4cd]">{role.description}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            className="mx-auto max-w-7xl px-5 py-16 md:px-8 lg:px-10 lg:py-20"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={staggerGroup}
          >
            <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
              <motion.div variants={fadeUp}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#77633a]">Rollout readiness</p>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] text-[#10201b] md:text-[44px]">
                  Yang sudah disiapkan untuk rollout.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-[#56665f] md:text-lg">
                  Landing page tidak boleh berhenti di visual. Bagian ini menjawab apa yang siap diuji, apa yang sudah
                  punya struktur, dan apa yang perlu dilanjutkan sebelum produksi.
                </p>
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2">
                {rolloutItems.map((item) => (
                  <motion.article
                    key={item.title}
                    className="rounded-[28px] border border-[#ded6c7] bg-[#fffaf0] p-6 shadow-[0_18px_45px_rgba(54,45,28,0.05)]"
                    variants={fadeUp}
                    whileHover={{ y: -4 }}
                  >
                    <CheckCircle2 className="h-9 w-9 rounded-2xl bg-[#edf3ed] p-2 text-[#2c6b5a]" />
                    <h3 className="mt-5 text-xl font-black leading-tight tracking-[-0.03em] text-[#13231e]">{item.title}</h3>
                    <p className="mt-3 text-base leading-7 text-[#607068]">{item.description}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            id="faq"
            className="border-y border-[#ded6c7] bg-[#fffaf0]"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={staggerGroup}
          >
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-20">
              <motion.div variants={fadeUp}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#77633a]">FAQ</p>
                <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] text-[#10201b] md:text-[44px]">
                  Pertanyaan sebelum mulai.
                </h2>
              </motion.div>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <motion.article key={faq.question} className="rounded-[26px] border border-[#e1d8c9] bg-white p-6" variants={fadeUp}>
                    <h3 className="text-lg font-black tracking-[-0.02em] text-[#13231e]">{faq.question}</h3>
                    <p className="mt-3 text-base leading-7 text-[#607068]">{faq.answer}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            className="relative px-5 py-16 md:px-8 lg:px-10 lg:py-20"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
          >
            <div className="mx-auto max-w-7xl overflow-hidden rounded-[34px] border border-[#d8cdbc] bg-[#fffaf0]">
              <div className="grid gap-8 p-7 md:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#77633a]">Mulai dari demo</p>
                  <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-[-0.045em] text-[#10201b] md:text-[44px]">
                    Lihat apakah alur Taptu cocok untuk ritme tim kamu.
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-[#5a6a62] md:text-lg">
                    Masuk ke demo, cek dashboard, coba mode mobile, lalu nilai apakah struktur ini cukup jelas untuk
                    dipakai sebagai fondasi produksi.
                  </p>
                </div>
                <div className="flex flex-col justify-end gap-4 rounded-[30px] bg-[#13231e] p-6 text-white">
                  <CheckCircle2 className="h-10 w-10 text-[#f7d36b]" />
                  <p className="text-xl font-black tracking-[-0.04em]">Tidak perlu setup untuk melihat flow utama.</p>
                  <PrimaryLink to="/login">
                    Coba demo Taptu
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </PrimaryLink>
                </div>
              </div>
            </div>
          </motion.section>
        </main>

        <footer className="border-t border-[#ded6c7] px-5 py-8 md:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#607068] md:flex-row md:items-center md:justify-between">
            <p className="font-bold text-[#13231e]">Taptu Attendance OS</p>
            <p>Demo attendance platform untuk web, PWA, dan scanner workflow.</p>
          </div>
        </footer>
      </div>
      </MotionConfig>
    </Shell>
  );
}
