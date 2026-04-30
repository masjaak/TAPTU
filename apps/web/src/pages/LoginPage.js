import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const session = await login({ email, password });
            saveSession(session);
            navigate("/app");
        }
        catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : "Login gagal.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx(Shell, { children: _jsxs("div", { className: "mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-14", children: [_jsxs("div", { className: "rounded-[36px] bg-ink p-8 text-white lg:p-10", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.28em] text-[#8ed3b7]", children: "Login web dan mobile" }), _jsx("h1", { className: "mt-6 text-4xl font-semibold tracking-[-0.04em]", children: "Masuk ke Hadiri tanpa membuang langkah penting." }), _jsx("p", { className: "mt-6 max-w-lg text-base leading-8 text-[#bdd3ca]", children: "Halaman ini jadi fondasi untuk login website dan wrapper iPhone. Role admin, employee, dan scanner sudah disiapkan sebagai baseline supaya kamu bisa lanjut ke flow produksi." }), _jsxs("div", { className: "mt-8 rounded-[28px] border border-white/10 bg-white/6 p-5", children: [_jsx("p", { className: "text-sm font-semibold", children: "Akun demo" }), _jsxs("ul", { className: "mt-4 space-y-3 text-sm text-[#d2e3dc]", children: [_jsx("li", { children: "Admin: admin@hadiri.app / Hadiri123!" }), _jsx("li", { children: "Karyawan: employee@hadiri.app / Hadiri123!" }), _jsx("li", { children: "Scanner: scanner@hadiri.app / Hadiri123!" })] })] })] }), _jsx("div", { className: "flex items-center", children: _jsxs("form", { onSubmit: handleSubmit, className: "w-full rounded-[36px] border border-[#dde6dd] bg-white p-7 shadow-panel md:p-10", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.2em] text-moss", children: "Masuk" }), _jsx("h2", { className: "mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink", children: "Akses workspace Hadiri" }), _jsx("p", { className: "mt-3 text-base leading-7 text-[#61726c]", children: "Gunakan akun demo dulu. Setelah backend produksi siap, flow ini tinggal diarahkan ke database dan OTP." })] }), _jsxs("div", { className: "mt-8 space-y-5", children: [_jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-2 block text-sm font-medium text-[#31423b]", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), className: "w-full rounded-3xl border border-[#d6ddd6] bg-[#fbfcfa] px-5 py-4 text-base outline-none transition focus:border-moss" })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-2 block text-sm font-medium text-[#31423b]", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), className: "w-full rounded-3xl border border-[#d6ddd6] bg-[#fbfcfa] px-5 py-4 text-base outline-none transition focus:border-moss" })] })] }), error ? _jsx("p", { className: "mt-5 rounded-3xl bg-[#fff2ee] px-4 py-3 text-sm text-[#a54c2f]", children: error }) : null, _jsxs("div", { className: "mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsx(Button, { type: "submit", disabled: loading, className: "sm:min-w-[180px]", children: loading ? "Memproses..." : "Masuk" }), _jsx(Link, { to: "/", className: "text-sm font-medium text-[#556862] underline-offset-4 hover:underline", children: "Kembali ke landing page" })] })] }) })] }) }));
}
