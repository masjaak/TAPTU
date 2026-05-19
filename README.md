# TAPTU

**Attendance Validation OS** untuk tim operasional — bukan full HRIS atau payroll. Taptu membuktikan end-to-end attendance workflow (validasi, exception review, approval, HR-ready reporting) untuk role Admin/HR, Manager, Karyawan, dan Scanner/Kiosk.

> Payroll ditangani hanya sebagai **Payroll Input Readiness** (CSV export untuk downstream processing). Full payroll processing tidak dalam scope.

## Stack

- `apps/web` — React + Vite + Tailwind + PWA
- `apps/api` — Node.js + Express
- `packages/shared` — shared TypeScript types

## Akun demo

Semua akun menggunakan password `Taptu123!`

| Role | Email |
|---|---|
| Employee | employee@taptu.app |
| Manager | manager@taptu.app |
| HR/Admin | admin@taptu.app |
| Superadmin | superadmin@taptu.app |
| Scanner | scanner@taptu.app |

## Demo universe

- **Fikri Maulana** — demo employee; Divisi Operasional; managed by Raka Saputra.
- **Raka Saputra** — demo manager; manages Fikri only (team scope).
- Manager melihat hanya Fikri. HR/Admin melihat seluruh organisasi.

## Approval flow

```
pending_manager → (manager setujui) → pending_hr → (HR setujui) → approved
pending_manager → (tolak)           → rejected
pending_hr      → (HR tolak)        → rejected
```

Manager approve meneruskan ke HR — bukan keputusan final. HR yang finalisasi.

## Status terkini

- Dokumentasi current s.d. **Phase 10.15 — Final Demo Consistency QA**.
- **354/354 tests passing.**
- Demo approval state persists across re-fetches (mutable `demoFikriRequests`).
- Check-in time disimpan sebagai local ISO (no Z suffix) — tidak ada UTC offset regression.
- `formatAttendanceTime` utility handles local ISO, UTC+Z, plain HH:mm, dan missing value.

## Known limitations

- Vercel serverless in-memory demo tidak reliable untuk cross-device persistence. Demo lintas device butuh Supabase-backed persistence.
- QR auto-detection belum diimplementasi; saat ini menggunakan honest manual confirmation.
- Selfie upload storage belum terhubung (`selfie_url` nullable).
- Supabase Auth password reset / production account creation belum selesai.
- Device registry belum selesai.

## Menjalankan project

```bash
npm install
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:5173
```

## Testing

```bash
cd apps/web
npx vitest run
```

## Build

```bash
npm run build
```

## Supabase storage

Local development defaults to `local-demo` (writes `apps/api/data/demo-store.json`).
Untuk menggunakan Supabase:

1. Jalankan `supabase/migrations/202605010001_create_taptu_app_store.sql` di Supabase SQL editor (project `ajlfwivpllbcmadscmkb`).
2. Copy `apps/api/.env.example` ke `apps/api/.env`.
3. Set environment variables:

```bash
TAPTU_STORAGE_MODE=supabase
SUPABASE_URL=https://ajlfwivpllbcmadscmkb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` hanya untuk server-side. Jangan expose di web app.

## Docs

- `HANDOFF_CURRENT.md` — low-token entrypoint untuk sesi baru
- `HANDOFF_TAPTU.md` — full context dan arsitektur
- `CHANGELOG_PHASE_10.md` — Phase 10 changelog
- `CHANGELOG_PHASE_9.md` — Phase 9 changelog

## Catatan iOS

Wrapper iOS belum digenerate karena `CocoaPods` belum tersedia di environment ini. Setelah `CocoaPods` siap, lanjutkan dari `apps/web`:

```bash
npx cap add ios
npm run cap:sync
```
