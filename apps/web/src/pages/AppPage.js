import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bell, Clock3, LogOut, MapPinned, QrCode, ScanFace } from "lucide-react";
import { Button } from "../components/Button";
import { Shell } from "../components/Shell";
import { clearSession, readSession } from "../lib/session";
import { getDashboard } from "../lib/api";
export function AppPage() {
    const session = readSession();
    const [stats, setStats] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [greeting, setGreeting] = useState("");
    useEffect(() => {
        if (!session) {
            return;
        }
        getDashboard(session.token)
            .then((data) => {
            setGreeting(data.greeting);
            setStats(data.stats);
            setSchedule(data.schedule);
        })
            .catch(() => {
            clearSession();
            location.assign("/login");
        });
    }, [session]);
    if (!session) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return (_jsx(Shell, { children: _jsxs("div", { className: "mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10", children: [_jsxs("header", { className: "flex flex-col gap-5 rounded-[34px] border border-[#dbe5dc] bg-white p-6 shadow-panel md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold uppercase tracking-[0.2em] text-moss", children: [session.user.role, " workspace"] }), _jsx("h1", { className: "mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink", children: greeting || `Halo, ${session.user.fullName}` }), _jsxs("p", { className: "mt-2 text-base text-[#63746d]", children: [session.user.organizationName, " \u00B7 Responsive PWA untuk website dan mobile wrapper."] })] }), _jsxs(Button, { variant: "secondary", onClick: () => {
                                clearSession();
                                location.assign("/login");
                            }, children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), "Keluar"] })] }), _jsx("section", { className: "grid gap-4 lg:grid-cols-3", children: stats.map((item) => (_jsxs("article", { className: "rounded-[30px] border border-[#dfe6de] bg-white p-6 shadow-panel", children: [_jsx("p", { className: "text-sm font-semibold text-[#52645d]", children: item.label }), _jsx("p", { className: "mt-4 text-4xl font-semibold tracking-[-0.05em] text-ink", children: item.value }), _jsx("p", { className: "mt-3 text-sm leading-6 text-[#667770]", children: item.detail })] }, item.label))) }), _jsxs("section", { className: "grid gap-5 lg:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("div", { className: "rounded-[32px] border border-[#dae5db] bg-white p-6 shadow-panel", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.18em] text-moss", children: "Fokus hari ini" }), _jsx("h2", { className: "mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink", children: "Flow absensi yang siap diteruskan ke produk penuh." })] }), _jsx(Bell, { className: "h-6 w-6 text-moss" })] }), _jsx("div", { className: "mt-7 grid gap-4 md:grid-cols-3", children: [
                                        [QrCode, "QR token aman", "Refresh tiap 30 detik dan siap offline queue."],
                                        [MapPinned, "GPS dan radius", "Fondasi lokasi kerja dan validasi check-in."],
                                        [ScanFace, "Selfie evidence", "Placeholder untuk upload ke storage produksi."]
                                    ].map(([Icon, title, detail]) => (_jsxs("div", { className: "rounded-[24px] border border-[#e4ebe4] bg-[#fbfcf8] p-5", children: [_jsx(Icon, { className: "h-10 w-10 rounded-2xl bg-white p-2.5 text-moss shadow-sm" }), _jsx("h3", { className: "mt-5 text-lg font-semibold text-ink", children: title }), _jsx("p", { className: "mt-3 text-sm leading-6 text-[#62736d]", children: detail })] }, title))) })] }), _jsxs("div", { className: "rounded-[32px] border border-[#dae5db] bg-[#12261f] p-6 text-white shadow-panel", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Clock3, { className: "h-6 w-6 text-[#97d7be]" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.18em] text-[#97d7be]", children: "Rencana implementasi" }), _jsx("h2", { className: "mt-2 text-2xl font-semibold tracking-[-0.03em]", children: "Baseline sprint pertama" })] })] }), _jsx("div", { className: "mt-7 space-y-4", children: schedule.map((item) => (_jsxs("div", { className: "rounded-[24px] border border-white/10 bg-white/6 p-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("p", { className: "text-lg font-semibold", children: item.time }), _jsx("span", { className: "rounded-full bg-white/10 px-3 py-1 text-xs text-[#bdd9cc]", children: "Aktif" })] }), _jsx("p", { className: "mt-4 text-base font-medium", children: item.title }), _jsx("p", { className: "mt-2 text-sm leading-6 text-[#b8cec3]", children: item.detail })] }, item.time + item.title))) })] })] })] }) }));
}
