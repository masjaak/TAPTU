# Taptu

**Attendance Validation OS** for operational teams — not a full HRIS or payroll system.

Taptu proves a practical end-to-end attendance workflow: check-in validation, exception review, multi-step approvals, and HR-ready reporting — across four roles in one clean interface.

> Payroll is handled only as **Payroll Input Readiness** (CSV export for downstream processing). Full payroll processing is not in scope.

## What problem it solves

- Clock-in can be faked — GPS, device, and selfie signals give HR real evidence to validate
- Exception review is ad-hoc — Taptu provides a structured exception queue per role
- A manager's approval should not be final — the two-step flow requires HR to finalize
- HR Presensi, Manager Presensi Tim, and Employee Riwayat must agree — Taptu syncs them from one source

## Core features

- **Multi-signal check-in** — GPS geofence, QR scan, Selfie, and Manual, with per-signal trust scoring
- **Exception queue** — flagged records for geofence violations, device mismatches, and late arrivals
- **Two-step approval flow** — Manager approve → HR finalize; manager action is not final
- **Role-aware dashboards** — Employee, Manager, HR/Admin, Superadmin, and Scanner each see only their scope
- **HR reporting** — attendance table with per-employee status, validation detail, and CSV export
- **Scanner / Kiosk mode** — rotating 30-second QR token for gated entry points
- **PWA + iOS** — installable on mobile; Capacitor wrapper available

## Approval flow

```
pending_manager → (manager approve) → pending_hr → (HR approve) → approved
pending_manager → (reject)          → rejected
pending_hr      → (HR reject)       → rejected
```

Manager approval forwards to HR — it is not the final decision.

## Demo accounts

All accounts use password `Taptu123!`

| Role | Email |
|---|---|
| Employee | employee@taptu.app |
| Manager | manager@taptu.app |
| HR/Admin | admin@taptu.app |
| Superadmin | superadmin@taptu.app |
| Scanner | scanner@taptu.app |

**Demo universe:** Fikri Maulana (employee) → Raka Saputra (manager) → Nadia Putri (HR/Admin).
Manager sees Fikri only. HR/Admin sees the full organisation.

> Demo state is in-memory on Vercel serverless. Data resets on cold start. For stable cross-device demo, configure Supabase storage (see Environment).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + PWA |
| Mobile | Capacitor (iOS) |
| API | Node.js + Express |
| Storage | Local JSON (demo) or Supabase (production) |
| Shared types | `@taptu/shared` TypeScript package |
| Tests | Vitest — 387 passing |

## Local setup

```bash
npm install
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:5173
```

## Environment

Copy `apps/api/.env.example` to `apps/api/.env` and set:

```bash
TAPTU_STORAGE_MODE=local-demo           # default; writes to apps/api/data/demo-store.json (gitignored)

# Supabase mode (optional):
TAPTU_STORAGE_MODE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only — never expose in the web app
```

To use Supabase, apply the migrations in `supabase/migrations/` to your project via the Supabase SQL editor or CLI.

## Testing

```bash
cd apps/web
npx vitest run
```

## Build

```bash
npm run build
```

## Known limitations

- Vercel serverless in-memory demo resets on cold start — not reliable for cross-device use
- QR auto-detection not implemented; current flow uses manual confirmation
- Selfie upload storage not wired (`selfie_url` nullable)
- Supabase Auth password reset / production account creation not completed
- Device registry not completed
- iOS wrapper requires CocoaPods — run `npx cap add ios && npm run cap:sync` after setup

## Roadmap

1. Supabase-backed demo persistence (removes serverless reset problem)
2. Real QR auto-detection via camera scan
3. Selfie upload and storage pipeline
4. Supabase Auth + password reset
5. Device registry
6. Approval timeline UI
7. Report pagination frontend controls
8. Payroll Input Readiness — CSV export only, not full payroll

## Docs

- [`HANDOFF_CURRENT.md`](HANDOFF_CURRENT.md) — low-token session entrypoint
- [`HANDOFF_TAPTU.md`](HANDOFF_TAPTU.md) — full architecture and product context
- [`CHANGELOG_PHASE_10.md`](CHANGELOG_PHASE_10.md) — latest changelog
- [`docs/CHANGELOG_PHASE_9.md`](docs/CHANGELOG_PHASE_9.md) — Phase 9 changelog
- [`docs/`](docs/) — implementation notes and older changelogs
