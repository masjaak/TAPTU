import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../lib/api";
import { saveSession } from "../lib/session";

const inputClass =
  "w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-5 py-4 text-base text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10";

const labelClass = "mb-2 block text-sm font-bold text-[#111827]";

export function RegisterPage() {
  const navigate = useNavigate();

  const [organizationName, setOrganizationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);

    try {
      const session = await register({ fullName, email, password, organizationName });
      saveSession(session);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#e9eaec] px-4 py-8 text-[#101217] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <a href="/" className="flex items-center gap-3" aria-label="Taptu home">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#111827] text-sm font-black text-white">
            T
          </span>
          <span className="text-sm font-black tracking-[-0.02em] text-[#111827]">Taptu</span>
        </a>

        <div className="mt-8 rounded-[32px] bg-white p-8 shadow-[0_24px_70px_rgba(20,24,31,0.10)] lg:p-10">
          <span
            data-testid="role-badge-superadmin"
            className="inline-flex items-center rounded-full bg-[#fff3dc] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#92600a]"
          >
            Superadmin
          </span>

          <h1 className="mt-5 text-3xl font-black leading-snug tracking-[-0.03em] text-[#111827]">
            Buat akun superadmin.
          </h1>
          <p className="mt-5 text-base leading-8 text-[#596172]">
            Superadmin punya akses penuh ke seluruh organisasi, karyawan, dan konfigurasi sistem Taptu.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div>
              <label htmlFor="organizationName" className={labelClass}>
                Nama organisasi
              </label>
              <input
                id="organizationName"
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="PT Taptu Indonesia"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="fullName" className={labelClass}>
                Nama lengkap
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama sesuai identitas"
                className={inputClass}
              />
            </div>

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
                placeholder="superadmin@organisasi.com"
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
                placeholder="Minimal 8 karakter"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Konfirmasi password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className={inputClass}
              />
            </div>

            {error ? (
              <p className="rounded-2xl bg-[#fff2ee] px-4 py-3 text-sm font-medium text-[#a54c2f]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-[#1769ff] px-6 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,105,255,0.22)] transition hover:bg-[#0d5be8] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]"
            >
              {loading ? "Membuat akun..." : "Buat akun"}
            </button>

            <div className="flex items-center justify-between pt-2 text-sm">
              <p className="text-[#596172]">
                Sudah punya akun?{" "}
                <Link to="/login" className="font-bold text-[#1769ff] hover:underline">
                  Masuk
                </Link>
              </p>
              <Link to="/" className="font-medium text-[#596172] hover:text-[#111827]">
                Kembali ke beranda
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
