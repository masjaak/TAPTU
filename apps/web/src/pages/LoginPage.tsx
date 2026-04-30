import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../components/Button";
import { Shell } from "../components/Shell";
import { login } from "../lib/api";
import { saveSession } from "../lib/session";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@hadiri.app");
  const [password, setPassword] = useState("Hadiri123!");
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
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-14">
        <div className="rounded-[36px] bg-ink p-8 text-white lg:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[#8ed3b7]">Login web dan mobile</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em]">Masuk ke Hadiri tanpa membuang langkah penting.</h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-[#bdd3ca]">
            Halaman ini jadi fondasi untuk login website dan wrapper iPhone. Role admin, employee, dan scanner sudah disiapkan
            sebagai baseline supaya kamu bisa lanjut ke flow produksi.
          </p>
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/6 p-5">
            <p className="text-sm font-semibold">Akun demo</p>
            <ul className="mt-4 space-y-3 text-sm text-[#d2e3dc]">
              <li>Admin: admin@hadiri.app / Hadiri123!</li>
              <li>Karyawan: employee@hadiri.app / Hadiri123!</li>
              <li>Scanner: scanner@hadiri.app / Hadiri123!</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center">
          <form onSubmit={handleSubmit} className="w-full rounded-[36px] border border-[#dde6dd] bg-white p-7 shadow-panel md:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss">Masuk</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">Akses workspace Hadiri</h2>
              <p className="mt-3 text-base leading-7 text-[#61726c]">
                Gunakan akun demo dulu. Setelah backend produksi siap, flow ini tinggal diarahkan ke database dan OTP.
              </p>
            </div>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#31423b]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-3xl border border-[#d6ddd6] bg-[#fbfcfa] px-5 py-4 text-base outline-none transition focus:border-moss"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#31423b]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-3xl border border-[#d6ddd6] bg-[#fbfcfa] px-5 py-4 text-base outline-none transition focus:border-moss"
                />
              </label>
            </div>

            {error ? <p className="mt-5 rounded-3xl bg-[#fff2ee] px-4 py-3 text-sm text-[#a54c2f]">{error}</p> : null}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" disabled={loading} className="sm:min-w-[180px]">
                {loading ? "Memproses..." : "Masuk"}
              </Button>
              <Link to="/" className="text-sm font-medium text-[#556862] underline-offset-4 hover:underline">
                Kembali ke landing page
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Shell>
  );
}
