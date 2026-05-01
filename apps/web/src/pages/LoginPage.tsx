import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../lib/api";
import { saveSession } from "../lib/session";

const inputClass =
  "w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-5 py-4 text-base text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10";

const labelClass = "mb-2 block text-sm font-bold text-[#111827]";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

          <div className="mt-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">Platform</p>
            <h1 className="mt-5 text-4xl font-black leading-snug tracking-[-0.03em] md:text-5xl">
              Satu login untuk semua peran.
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-[#8b9199]">
              Admin, karyawan, dan scanner punya akses yang sesuai peran masing-masing. Tidak ada data yang bocor ke peran yang salah.
            </p>
          </div>

          <div className="mt-10 rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
              Akun demo tersedia
            </p>
            <div className="mt-5 space-y-3 text-sm text-white/60">
              <p><span className="font-bold text-white/80">Superadmin</span> - superadmin@taptu.app</p>
              <p><span className="font-bold text-white/80">Admin HR</span> - admin@taptu.app</p>
              <p><span className="font-bold text-white/80">Karyawan</span> - employee@taptu.app</p>
              <p><span className="font-bold text-white/80">Scanner</span> - scanner@taptu.app</p>
              <p className="pt-2 text-white/30">Password semua akun: <span className="font-mono text-white/50">Taptu123!</span></p>
            </div>
          </div>

          <p className="mt-auto pt-10 text-xs text-white/25">
            Demo mode - kredensial hardcoded untuk pengujian alur.
          </p>
        </div>

        {/* Right: form panel */}
        <div className="flex items-center justify-center rounded-[32px] bg-white p-8 shadow-[0_24px_70px_rgba(20,24,31,0.10)] lg:p-12">
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">Masuk</p>
            <h2 className="mt-5 text-3xl font-black leading-snug tracking-[-0.03em] text-[#111827]">
              Akses workspace Taptu.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#596172]">
              Masuk dengan email dan password akun Taptu Anda.
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
                  placeholder="akun@organisasi.com"
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
                  placeholder="Password Anda"
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
