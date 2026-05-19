# Taptu Current Handoff

Read this file first in future sessions. It is the low-token entrypoint; open `HANDOFF_TAPTU.md` only when deeper context is needed.

## What Taptu is

Taptu is an **Attendance Validation OS** for operational teams — not a full HRIS or payroll system. The product proves a practical end-to-end attendance workflow (validation, exception review, approvals, HR-ready reporting) for Admin/HR, Manager, Employee, and Scanner/Kiosk roles. Payroll is addressed only as **Payroll Input Readiness** (CSV export for downstream processing); full payroll processing is not in scope.

## Current status

Documentation is current through **Phase 10.15 — Final Demo Consistency QA** (complete).

- **Phase 9** delivered scale-up hardening: query safety defaults, DB indexes on live Supabase (`ajlfwivpllbcmadscmkb`), report pagination API, frontend fetch discipline, test suite hardened to 345 passing tests.
- **Phase 10.12** fixed demo check-in time source (local ISO, no Z), removed Anisa/Budi from manager demo team, removed Notifikasi from manager nav.
- **Phase 10.13** extracted `formatAttendanceTime` to a testable utility (`attendanceTime.ts`); handles local ISO (slice), UTC+Z (Date parse), plain HH:mm passthrough, and missing (--:--).
- **Phase 10.14** scoped Manager Pengajuan to Fikri-only requests with proper `workflowStatus`/`statusLabel` fields; manager approve → `pending_hr` (not final).
- **Phase 10.15** made `demoFikriRequests` mutable with `approveDemoRequest()` mutator so approval state persists across re-fetches; `resetDemoAttendanceState()` also resets request state for test isolation.
- **Test suite: 354/354 passing, 0 failures.**

## Role architecture

| Role | Demo account | Nav |
|---|---|---|
| Employee | employee@taptu.app / Taptu123! | Beranda, Presensi, Riwayat, Pengajuan, Jadwal, Slip Gaji, Profil |
| Manager | manager@taptu.app / Taptu123! | Beranda, Tim Saya, Presensi Tim, Pengajuan, Pengecualian, Profil |
| HR/Admin | admin@taptu.app / Taptu123! | Beranda, Tim, Struktur, Presensi, Pengajuan, Lokasi, Laporan, Profil |
| Superadmin | superadmin@taptu.app / Taptu123! | Same as HR/Admin + Settings (workspace not fully built) |
| Scanner | scanner@taptu.app / Taptu123! | Scanner, Profil only |

## Demo universe

- **Fikri Maulana** (`usr-employee-01`) — demo employee account; Divisi Operasional; `managerId: "usr-manager-01"`.
- **Raka Saputra** (`usr-manager-01`) — demo manager account; manages Fikri only.
- Manager demo team is Fikri-only. Anisa Rahma and Budi Santoso have `managerId: undefined` (excluded from manager team scope).
- HR/Admin overview is org-wide (all employees with `role === "employee"`).
- Fikri's attendance check-in/check-out stored as local ISO (no Z suffix) — `formatAttendanceTime` slices `[11,16]` for display.

## Approval flow (state machine)

```
pending_manager → (manager approve) → pending_hr → (HR approve) → approved
pending_manager → (manager reject)  → rejected
pending_hr      → (HR reject)       → rejected
```

- `statusLabel`: Menunggu Manager → Menunggu HR → Disetujui / Ditolak
- Manager approval message: "Pengajuan diteruskan ke HR untuk keputusan final."
- Demo approval state persists across re-fetches via mutable `demoFikriRequests` in `demo.ts`.

## Fixed decisions

- Manager is a limited operational approver — not full HR admin.
- Manager nav excludes: Laporan, Lokasi, Scanner, Struktur, Settings, Notifikasi.
- Manager data is scoped through manager-specific endpoints; no org-wide fallback.
- Scanner tokens are Scanner/Kiosk mode only.
- Selfie capture/preview exists; finalized upload/storage is still not wired.
- Slip Gaji is lightweight/read-only until a real payslip source exists.
- Payroll Input Readiness (CSV export) is MVP; full payroll processing is not.
- Face recognition, advanced anti-spoofing, real device fingerprinting are roadmap only.

## Known limitations

- **Vercel serverless in-memory demo is not reliable for cross-device persistence.** Each serverless invocation may get a fresh in-memory state. True cross-device demo requires Supabase-backed demo persistence.
- QR auto-detection is not implemented. QR currently uses honest manual confirmation flow.
- Selfie upload storage is not wired; `selfie_url` remains nullable.
- Supabase Auth password reset / account creation flow is not completed.
- Device registry is not completed.
- Approval UI timeline/step-history panel is not built; only `workflowStatus` label shown per request card.
- Shift assignment workflow is incomplete in post-login UI/API.
- Report pagination headers exist in API; frontend paging controls are not exposed.
- Very narrow mobile screens need manual QA with production-length names and dense report data.
- Some Phase 4/5 operational routes still use local/demo-store paths rather than fully normalized Supabase reads/writes.

## Next safe tasks

1. **Supabase-backed demo persistence** — remove serverless in-memory fragility; demo state survives across devices and deployments.
2. **Real QR auto-detection** — replace manual confirmation with camera-based QR code scan.
3. **Selfie upload storage** — finalize `selfie_url` upload and retention path.
4. **Supabase Auth / password reset** — complete production account creation and credential management.
5. **Device registry** — complete device identity binding for scanner and employee accounts.
6. **Approval timeline panel** — step-history UI on request cards using `approval_steps` table data.
7. **Report pagination frontend** — wire `?limit`/`?offset` to frontend report view (backend is ready).
8. **Payroll Input Readiness** — later, not full payroll; CSV export for downstream processing only.

## Most important docs

- `Documents/TAPTU/HANDOFF_CURRENT.md` ← you are here
- `Documents/TAPTU/HANDOFF_TAPTU.md`
- `Documents/TAPTU/CHANGELOG_PHASE_10.md`
- `Documents/TAPTU/CHANGELOG_PHASE_9.md`
