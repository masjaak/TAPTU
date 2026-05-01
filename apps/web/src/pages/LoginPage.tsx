import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../lib/api";
import { saveSession } from "../lib/session";

type DemoRole = "superadmin" | "admin" | "employee" | "scanner";

const demoAccounts: { role: DemoRole; label: string; email: string; password: string }[] = [
  { role: "superadmin", label: "Super Admin", email: "superadmin@taptu.app", password: "Taptu123!" },
  { role: "admin", label: "Admin HR", email: "admin@taptu.app", password: "Taptu123!" },
  { role: "employee", label: "Karyawan", email: "employee@taptu.app", password: "Taptu123!" },
  { role: "scanner", label: "Scanner Gate", email: "scanner@taptu.app", password: "Taptu123!" }
];

const roleBadge: Record<DemoRole, string> = {
  superadmin: "bg-[#fff3dc] text-[#92600a]",
  admin: "bg-[#f1f5ff] text-[#1769ff]",
  employee: "bg-[#f0fdf4] text-[#16a34a]",
  scanner: "bg-[#fff7f0] text-[#c2410c]"
};

const inputClass =
  "w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-5 py-4 text-base text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10";

const labelClass = "mb-2 block text-sm font-bold text-[#111827]";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@taptu.app");
  const [password, setPassword] = useState("Taptu123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await login({ email, password });
      saveSession(session);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(acc: (typeof demoAccounts)[number]) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-[#e9eaec] px-4 py-4 text-[#101217] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 sm:gap-6 lg:min-h-[calc(100vh-32px)] lg:grid-cols-2 lg:items-stretch">

        {/* Left: dark info panel */}
        <div className="flex flex-col rounded-[32px] bg-[#111827] p-8 text-white lg:p-12">
          <a href="/" className="flex items-center gap-3" aria-label="Taptu home">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-sm font-black text-[#111827]">
              T
            </span>
            <span className="text-sm font-black tracking-[-0.02em]">Taptu</span>
          </a>

          <div className="mt-14">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">Platform</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.045em] md:text-5xl">
              Satu login untuk semua peran.
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-[#8b9199]">
              Admin, karyawan, dan scanner punya akses yang sesuai peran masing-masing. Tidak ada data yang bocor ke peran yang salah.
            </p>
          </div>

          {/* Demo accounts — clickable to fill form */}
          <div data-testid="demo-accounts-panel" className="mt-10 rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
              Akun demo — klik untuk pakai
            </p>
            <div className="mt-5 space-y-3">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${roleBadge[acc.role]}`}>
                      {acc.label}
                    </span>
                    <span className="text-sm text-white/60">{acc.email}</span>
                  </div>
                  <span className="text-xs text-white/30">Pakai</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-auto pt-10 text-xs text-white/25">
            Demo mode — kredensial hardcoded untuk pengujian alur.
          </p>
        </div>

        {/* Right: form panel */}
        <div className="flex items-center justify-center rounded-[32px] bg-white p-8 shadow-[0_24px_70px_rgba(20,24,31,0.10)] lg:p-12">
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">Masuk</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-[#111827]">
              Akses workspace Taptu.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#596172]">
              Pilih akun demo di sebelah atau masuk dengan email terdaftar.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {error ? (
              <p className="mt-5 rounded-2xl bg-[#fff2ee] px-4 py-3 text-sm font-medium text-[#a54c2f]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-2xl bg-[#1769ff] px-6 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,105,255,0.22)] transition hover:bg-[#0d5be8] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>

            <div className="mt-6 flex items-center justify-between text-sm">
              <Link
                to="/register"
                className="font-bold text-[#1769ff] underline-offset-4 hover:underline"
              >
                Daftarkan akun superadmin
              </Link>
              <Link
                to="/"
                className="font-medium text-[#596172] hover:text-[#111827]"
              >
                Kembali ke beranda
              </Link>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
