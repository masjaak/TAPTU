import { ArrowRight, BadgeCheck, ChartNoAxesCombined, ScanLine, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../components/Button";
import { Shell } from "../components/Shell";

const features = [
  {
    icon: ScanLine,
    title: "Check-in cepat via QR, GPS, atau selfie",
    description: "Karyawan tidak perlu alur yang rumit. Scanner mode dan mobile-first flow dirancang untuk kondisi lapangan."
  },
  {
    icon: ShieldCheck,
    title: "Approval dan audit trail lebih rapi",
    description: "Admin bisa memantau keterlambatan, izin, dan aktivitas harian dari satu workspace yang konsisten."
  },
  {
    icon: Smartphone,
    title: "PWA yang siap dipasang seperti app",
    description: "Satu codebase untuk website, PWA, dan wrapper iPhone agar tim tidak terpecah di banyak platform."
  }
];

const metrics = [
  { value: "30s", label: "Refresh QR token" },
  { value: "3 role", label: "Karyawan, admin, scanner" },
  { value: "24/7", label: "Siap untuk operasi shift" }
];

export function LandingPage() {
  return (
    <Shell>
      <header className="border-b border-[#e7ece3]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-moss">Hadiri by TAPTU</p>
            <p className="mt-1 text-sm text-[#586a63]">Absensi yang lebih rapi untuk tim modern.</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost">Fitur</Button>
            <Button variant="ghost">Alur Kerja</Button>
            <Link to="/login">
              <Button variant="primary">Masuk ke aplikasi</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-20">
            <div className="relative z-10">
              <p className="inline-flex items-center rounded-2xl border border-[#d6ddd6] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-moss shadow-sm">
                PWA mobile-first + login website
              </p>
              <h1 className="font-display mt-7 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink md:text-5xl lg:text-6xl">
                Satu sistem absensi untuk tim lapangan, admin, dan scanner yang harus selalu sinkron.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#52635d] md:text-lg">
                Hadiri dirancang agar landing page, login web, dashboard operasional, dan pengalaman mobile terasa satu keluarga.
                Responsif, jelas, dan siap dilanjutkan ke aplikasi produksi.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link to="/login">
                  <Button className="w-full sm:w-auto">
                    Coba login demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="secondary" className="w-full sm:w-auto">
                  Lihat alur attendance
                </Button>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-[28px] border border-[#e2e8de] bg-white/80 p-5 shadow-panel">
                    <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-ink">{metric.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5d6d66]">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <div className="rounded-[36px] border border-[#dae5db] bg-[#fdfefc] p-4 shadow-panel md:p-6">
                <div className="rounded-[28px] bg-ink p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-xs uppercase tracking-[0.24em] text-[#a4cdbf]">Admin workspace</p>
                      <h2 className="font-display mt-3 text-2xl font-semibold">Monitor kehadiran tanpa tampilan yang berantakan.</h2>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm">Live sync</div>
                  </div>
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {["248 karyawan", "14 pengajuan", "91% tepat waktu"].map((item) => (
                      <div key={item} className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                        <p className="text-sm text-[#b8cec3]">Ringkasan</p>
                        <p className="mt-3 text-lg font-semibold">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[26px] bg-white p-5 text-ink">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Aktivitas hari ini</p>
                          <p className="mt-1 text-sm text-[#667670]">Scan, check-in, dan approval terbaru.</p>
                        </div>
                        <BadgeCheck className="h-5 w-5 text-moss" />
                      </div>
                      <div className="mt-5 space-y-3">
                        {[
                          ["08.03", "Nadia check-in di Kantor Pusat"],
                          ["08.15", "QR Scanner Gate Timur diperbarui"],
                          ["09.20", "2 izin menunggu approval manager"]
                        ].map(([time, title]) => (
                          <div key={title} className="flex items-start gap-3 rounded-2xl border border-[#e8eeea] px-4 py-3">
                            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-moss">{time}</span>
                            <p className="text-sm leading-6 text-[#44544d]">{title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[26px] bg-[#132822] p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display text-sm font-semibold text-white">Tren kehadiran</p>
                          <p className="mt-1 text-sm text-[#96b8aa]">Minggu ini lebih stabil dari pekan lalu.</p>
                        </div>
                        <ChartNoAxesCombined className="h-5 w-5 text-[#88c8af]" />
                      </div>
                      <div className="mt-6 flex h-44 items-end gap-3">
                        {[52, 64, 73, 68, 81, 85, 92].map((value, index) => (
                          <div key={index} className="flex flex-1 flex-col items-center gap-3">
                            <div className="w-full rounded-full bg-white/8 p-1">
                              <div className="rounded-full bg-[#7eb79e]" style={{ height: `${value}%` }} />
                            </div>
                            <span className="text-xs text-[#9bbcaf]">{["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"][index]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-14">
          <div className="grid gap-5 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-[28px] border border-[#dde6dd] bg-white p-7 shadow-panel">
                <feature.icon className="h-10 w-10 rounded-2xl bg-mist p-2.5 text-moss" />
                <h3 className="font-display mt-6 text-2xl font-semibold tracking-[-0.03em] text-ink">{feature.title}</h3>
                <p className="mt-4 text-base leading-8 text-[#5c6c66]">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}
