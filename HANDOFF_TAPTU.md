# Taptu MVP Handoff

## A. Project summary

Taptu is an **Attendance Validation OS** for operational teams — not a full HRIS or payroll system. The product position is a modern attendance workspace that goes beyond simple clock-in/out by adding validation signals, scanner support, exception review, approvals, and HR-ready reporting inside a clean SaaS-style interface. Payroll is addressed only as **Payroll Input Readiness** (CSV export for downstream processing); full payroll processing is not in scope.

The MVP goal is to prove a practical end-to-end attendance workflow for Admin/HR, Manager, Employee, and Scanner/Kiosk roles without overbuilding advanced fraud, payroll, or full HRIS systems. Current status: documentation is updated through **Phase 10.15 — Final Demo Consistency QA**. Phase 10 delivered demo time normalization, manager team/nav cleanup, manager request scoping, and persistent demo approval state. Phase 9 delivered query safety defaults, DB index deployment to live Supabase, report API pagination, frontend fetch discipline fixes, and test suite hardening. **354 tests passing, 0 failures.** Known limitations remain around cross-device demo persistence, QR auto-detection, selfie storage, Supabase Auth completion, device registry, approval timeline UI, shift assignment, report pagination frontend controls, and very narrow mobile QA.

## B. Fixed product decisions

- Manager remains a limited operational approver, not a full HR admin.
- Advanced anti-spoofing and real device fingerprinting are out of MVP scope.
- Face recognition is out of MVP scope.
- Full payroll processing is out of MVP scope.
- Payroll-ready CSV/reporting output is part of MVP.
- Selfie capture/preview exists, but finalized storage/upload is still unfinished; `selfie_url` may remain nullable for now.
- Manager team, attendance, exceptions, and request access is scoped through current `manager_id` endpoints and route guards. Production QA with seeded manager/team data is still recommended.
- Scanner tokens are Scanner/Kiosk-only. Employee accounts should not manage or manually enter scanner tokens.
- Slip Gaji is lightweight/read-only until a real payslip data source exists.

## C. Completed phases summary

- Phase 1.5: UI cleanup, mobile layout fixes, design consistency tightening, old theme trace removal direction established.
- Phase 2: dashboard foundation, employee attendance flow, role-based routing, attendance workspace baseline.
- Phase 3: validation layer, scanner flow, geofence model, exception handling, approvals, basic audit support.
- Phase 4: team list, work location/geofence management, shift management, reports, CSV export, dashboard wiring.
- Phase 5.1: Supabase/database verification and shift schema migration addition.
- Phase 5.2: UI consistency and responsive QA pass.
- Phase 5.3: functional QA and targeted bug fixes.
- Phase 5.4: empty/loading/error states and accessibility polish.
- Phase 5.5: final documentation, roadmap, and handoff refresh.
- Phase 6.1: employee check-in/check-out simplification and scanner token separation.
- Phase 6.2: employee recent history row/detail bug fix.
- Phase 6.3: employee self-service tabs for Beranda, Presensi, Riwayat, Pengajuan, Jadwal, Slip Gaji, and Profil.
- Phase 6.4: mobile typography, spacing, wrapping, and dense surface polish.
- Phase 6.5: final Phase 6 QA documentation, roadmap, and handoff refresh.
- Phase 7.1: departments schema foundation and nullable profile organization metadata.
- Phase 7.3: `approval_steps` table and multi-step approval schema.
- Phase 7.4: request approval state machine in API services (create, manager step, HR step, reject, timeline).
- Phase 7.5: manager dashboard UI — scoped nav, Beranda/Tim Saya/Presensi Tim/Pengajuan/Profil pages, step-aware status labels, manager approval message, demo stub corrected.
- Phase 8.1: manager-scoped data APIs — `fetchManagerOverview`, `fetchManagerEmployeeList`, `fetchManagerExceptionQueue`, `fetchManagerRequests`. No org-wide fallback. `workflowStatus`/`statusLabel` preserved.
- Phase 8.3: Manager Dashboard UX polish — nav expanded to Beranda/Tim Saya/Presensi Tim/Pengajuan/Pengecualian/Profil, new Pengecualian page, rebuilt Beranda with team status panels, manager-specific Tim Saya and Presensi Tim, dedicated team approval queue in Pengajuan, manager permission summary in Profil. 141 tests passing.
- Phase 8.4-8.6: HR Struktur/Divisi & Penempatan added and connected to department/employee assignment APIs; HR Tim filter controls replaced with custom `FilterSelect` controls. 169 tests passing at Phase 8.6.
- Phase 8 final stabilization: targeted QA for approval two-step flow, employee attendance check-in/check-out persistence, HR/Manager attendance visibility, and role access guards.
- Phase 9 scale-up hardening: query safety defaults (`.limit()`, 30-day history filter, org-scoped exception count), report API pagination (`?limit`/`?offset` + `X-Has-More` headers, 500-row cap), frontend fetch discipline (`auditLogsLoaded` flag, `session?.token` dep, history filter same-filter guard, `filteredEmployees` useMemo), 6 DB indexes deployed to live Supabase, test suite hardened from 169 to **345 tests passing** (17 pre-existing infra failures fixed, 18 new regression tests added). No product features added.
- Phase 10.12: demo check-in time fixed to local ISO (no Z); Anisa/Budi removed from manager demo team (`managerId: undefined`); Notifikasi removed from manager nav.
- Phase 10.13: extracted `formatAttendanceTime` to `attendanceTime.ts`; state machine handles local ISO (slice), UTC+Z (Date parse), plain HH:mm (passthrough), missing (--:--); 16 unit tests.
- Phase 10.14: Manager Pengajuan scoped to Fikri-only requests; `getDemoManagerRequests()` added; `workflowStatus`/`statusLabel` present on all demo requests; manager approve → `pending_hr`.
- Phase 10.15: `demoFikriRequests` made mutable; `approveDemoRequest()` mutator persists approval state across re-fetches; `resetDemoAttendanceState()` resets request state. **354/354 tests passing.**

## D. Routes/pages

Main post-login pages currently surfaced through the app shell:

- Admin dashboard: summary stats, recent activity, quick actions.
- Manager dashboard: Beranda (team stats, date context, pending approvals panel, exceptions panel), Tim Saya (manager-scoped team roster), Presensi Tim (manager-scoped per-member attendance grid), Pengajuan (team approval queue primary, self-request secondary), Pengecualian (team exception queue with Indonesian type labels and actions), Profil (identity + active/inactive permission summary).
- Employee attendance page: simplified check-in/check-out, current validation state, and attendance history.
- Employee Pengajuan tab: request submit/list/detail/cancel flow using the existing approval request model.
- Employee Jadwal tab: lightweight assigned-shift/upcoming schedule view from currently available summary/dashboard data.
- Employee Slip Gaji tab: lightweight read-only placeholder that points to payroll-ready reporting while full payroll remains out of scope.
- Scanner mode: token display, countdown, status, refresh, recent scan history.
- HR Tim/Struktur: employee roster, validation status, and connected Divisi & Penempatan actions for create/edit division, assign manager, and reassign employee division.
- Exception review queue: approve, reject, request correction.
- Approval flow: request create/view/cancel and reviewer approve/reject actions.
- Shift management: create/edit shifts, tolerance, optional break windows, linked location.
- Work location/geofence management: create/edit locations with lat/lng/radius.
- Attendance reports: filters, report table, audit trail toggle.
- CSV/export flow: export report rows to CSV when data exists.
- Profile page: present but still lightweight/stub-like compared with core workspaces.
- Settings route exists in navigation definitions for elevated roles, but no dedicated completed workspace is documented in Phase 5.

## E. Roles and access

Demo accounts (all use password `Taptu123!`):

| Role | Email |
|---|---|
| Employee | employee@taptu.app |
| Manager | manager@taptu.app |
| HR/Admin | admin@taptu.app |
| Superadmin | superadmin@taptu.app |
| Scanner | scanner@taptu.app |

Role nav:

- **Employee**: Beranda, Presensi, Riwayat, Pengajuan, Jadwal, Slip Gaji, Profil.
- **Manager**: Beranda, Tim Saya, Presensi Tim, Pengajuan, Pengecualian, Profil. Laporan, Lokasi, Scanner, Struktur, Settings, Notifikasi are not accessible.
- **HR/Admin**: Beranda, Tim, Struktur, Presensi, Pengajuan, Lokasi, Laporan, Profil.
- **Superadmin**: same as HR/Admin + Settings (dedicated Settings workspace not fully built).
- **Scanner/Kiosk**: Scanner and Profil only; direct URLs to non-scanner workspaces fall back to scanner mode.

Manager scoping behavior:

- Nav enforced via `roleNavigation` in `appShellState.ts`; `toAppSection` guard rejects unlisted sections and falls back to the role default.
- Manager approval is step 1 only: Setujui advances request to `pending_hr`, not to `approved`. Action message: "Pengajuan diteruskan ke HR untuk keputusan final."
- Manager data uses manager-scoped endpoints. Direct route QA verifies manager cannot render HR reports, locations, scanner, structure, or settings workspaces.

Known role/access limitation:

- `settings` appears in role navigation definitions for superadmin/admin, but the handoff should treat it as non-core/not fully built unless explicitly completed later.

## F. Database/schema overview

Verified MVP tables from Phase 5.1:

- `work_locations`: geofence validation points and radius settings.
- `scanner_tokens`: short-lived scanner/kiosk tokens.
- `attendance_records`: attendance facts plus validation metadata.
- `attendance_exceptions`: review queue for suspicious or incomplete attendance.
- `approval_requests`: leave/permission/correction style requests.
- `audit_logs`: operational decision history.
- `shifts`: org-scoped work shifts with start/end time and late threshold.
- `shift_assignments`: per-employee, per-date assignment table added in Phase 5.1.

Model/status notes:

- `attendance_records.shift_id` remains `text` for backward compatibility.
- New assignment flow uses `shifts` UUID-backed records.
- `users` / `employees` / `roles` are present at the application/session level, but standalone table verification was not the focus of Phase 5.1 and should be revalidated before deep auth or org-model work.
- `teams` is not confirmed here as a completed dedicated MVP table. Team behavior is surfaced in UI, but department/team segmentation should be treated as incomplete.

Supabase migration status:

- Phase 5.1 verified required attendance tables.
- Added migration: `supabase/migrations/202605030001_shifts_schema.sql`.
- Some Phase 4/5 operational routes are still not fully backed by Supabase relational reads/writes and may still use local/demo-store style API paths.

## G. Attendance validation model

`attendance_records` currently documents or verifies these MVP validation fields:

- `validation_status`
- `validation_reasons`
- `location_lat`
- `location_lng`
- `selfie_url` (nullable / unfinished storage path)
- `device_id` (nullable; practical device identifier, not advanced fingerprinting)
- `scanner_token_id` (optional)
- `check_in_time`
- `check_out_time`
- `status`

Behavior:

- Exception records are created when attendance cannot be treated as fully trusted, such as missing selfie, invalid/expired scanner token, radius mismatch, or related validation concerns.
- Exceptions are reviewed in the operational queue and can be approved, rejected, or sent for correction.
- Advanced device signature/fingerprint validation is not part of MVP and should not be implied by current `device_id` support.

## H. Core workflows

- Employee check-in/check-out:
  employee uses one primary check-in and one check-out action, with validation state and feedback. Employee flow does not expose scanner token input.
- Location/geofence validation:
  location signals are captured and compared against configured work location/radius logic; outside-radius style cases can persist then enter exception review.
- Scanner token flow:
  scanner token is displayed, refreshed, counted down, and used for Scanner/Kiosk-mode attendance validation only.
- Scanner recent-scan history:
  recent success/invalid/expired attempts are surfaced in the scanner workspace.
- Exception review:
  admin/manager can approve, reject, or request correction with notes.
- Approval requests:
  employee submits request; if employee has `manager_id`, manager reviews first (step 1), then HR finalizes (step 2); otherwise goes directly to HR. Manager approve → `pending_hr`. HR approve → `approved`. Any reject → `rejected` with `adminNote` visible to employee. Request cards show step-aware `workflowStatus` labels.
- Employee Pengajuan:
  employee accesses the existing request submit/list/detail/cancel flow from a dedicated self-service tab.
- Shift assignment:
  data model exists via `shift_assignments`, but complete post-login assignment workflow is not yet finished.
- Employee Jadwal:
  employee can see lightweight assigned shift/upcoming schedule information when available, but richer schedule assignment still needs backend/API completion.
- Work location/geofence management:
  admin can create/edit lat/lng/radius work locations.
- Reports:
  admin can filter attendance data, inspect validation flags, and open audit trail; manager sees scoped Presensi Tim rather than HR reports.
- Payroll-ready CSV export:
  report rows can be exported for downstream payroll preparation, but full payroll processing is intentionally out of scope.
- Employee Slip Gaji:
  lightweight read-only tab exists, but no full payslip list/detail or payroll calculation model exists yet.

## I. UI/UX system status

- Visual style:
  aligned to landing/login direction with white and soft gray surfaces, strong blue accent, dark text, rounded cards, soft borders, and restrained shadows.
- AppShell/navigation:
  desktop sidebar, mobile header, and mobile drawer are implemented and role-aware.
- Responsive QA:
  Phase 5.2 completed; Phase 6.4 added mobile typography/spacing/wrapping polish across shared shell, employee tabs, scanner, admin, reports, and dense form/table surfaces.
- Empty/loading/error states:
  Phase 5.4 completed with clearer role-aware empty copy and actionable error states.
- Accessibility polish:
  Phase 5.4 added improved live regions, dialog semantics, form errors, labels, and better status readability.
- Old green theme traces:
  removed from the checked MVP surfaces; success/info states now use Taptu blue language instead of legacy green traces.

## J. How to run

From repo root:

- Install: `npm install`
- Full dev: `npm run dev`
- Web only: `npm run dev:web`
- API only: `npm run dev:api`
- Build web: `npm run build:web`
- Build all: `npm run build:all`
- Typecheck: `npm run typecheck`

Important env/config notes:

- Web can use `VITE_API_BASE_URL` for API routing.
- Web can optionally use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; if absent, frontend falls back to the Express API path.
- API supports `TAPTU_STORAGE_MODE` with `local-demo` default and `supabase` optional mode.
- When `TAPTU_STORAGE_MODE=supabase`, API requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Optional API Supabase store config: `SUPABASE_STORE_TABLE`, `SUPABASE_STORE_KEY`.
- API also uses `PORT` and `JWT_SECRET` for local runtime.

## K. How to test core flows

Concise manual checklist:

- Login and confirm role lands on the correct default route.
- Verify role navigation for admin, manager, employee, scanner.
- Employee check-in/check-out with visible validation feedback.
- Scanner mode token refresh, countdown, and recent scan state.
- Geofence validation surface and location re-check flow.
- Exception queue approve/reject/request correction actions.
- Approval request create/detail/cancel and reviewer actions.
- Team list rendering and search/filter behavior.
- Work location create/edit.
- Shift create/edit.
- Reports filter application and audit trail visibility.
- CSV export enabled only when report data exists.

## L. Known limitations

- **Vercel serverless in-memory demo is not reliable for cross-device persistence.** Each serverless invocation may get a fresh in-memory state. True cross-device demo requires Supabase-backed demo persistence.
- QR auto-detection is not implemented; QR currently uses honest manual confirmation flow.
- Selfie upload storage is not wired; `selfie_url` remains nullable.
- Supabase Auth password reset / production account creation is not completed.
- Device registry is not completed.
- Approval UI timeline/step-history panel is not built; only the current `workflowStatus` label is shown per request card.
- Shift assignment workflow is not completed in post-login UI/API.
- Employee Jadwal is lightweight and depends on limited schedule data.
- Employee Slip Gaji is lightweight/read-only; no real payslip source yet.
- Manager endpoints scoped by `manager_id`; production-seeded QA is recommended for real manager/team data.
- Report pagination headers exist in the API (`X-Has-More`, `X-Pagination-Limit`, `X-Pagination-Offset`); frontend paging controls are not exposed.
- Very narrow mobile layouts need manual QA with production-length names and dense report rows.
- Some Phase 4/5 operational routes still use local/demo-store paths rather than fully normalized Supabase relational persistence.
- Profile workspace is lightweight and not a full account/settings system.
- Advanced anti-spoofing, face recognition, and real device fingerprinting are out of MVP scope.
- Full payroll processing is out of MVP scope; Payroll Input Readiness (CSV export) is the only in-scope payroll work.

## M. Future roadmap

- Reimbursement/klaim.
- Secure file sharing/dokumen.
- Deeper organization structure and HRIS profile management beyond current Divisi & Penempatan.
- Advanced notifications.
- Full payroll processing.
- Full HRIS employee profile management.
- Face recognition.
- Advanced anti-spoofing.
- Real device fingerprinting.

## N. Recommended next steps

Phase 10.15 demo consistency QA is complete (354/354 tests passing). Next safe tasks:

1. **Supabase-backed demo persistence** — remove serverless in-memory fragility; demo state survives across devices and deployments. This is the largest demo reliability gap.
2. **Real QR auto-detection** — replace manual confirmation with camera-based QR code scanning.
3. **Selfie upload storage** — finalize `selfie_url` upload and retention path; currently nullable/preview-only.
4. **Supabase Auth / password reset** — complete production account creation and credential management.
5. **Device registry** — complete device identity binding for scanner and employee accounts.
6. **Approval timeline panel** — step-history UI on request cards using `approval_steps` table data (backend exists; UI missing).
7. **Report pagination frontend** — wire `?limit`/`?offset` to frontend report view (backend API is ready).
8. **Shift assignment workflow** — complete end-to-end shift assignment in post-login UI/API.
9. **Payroll Input Readiness** — CSV export for downstream processing only; full payroll processing remains out of scope.

Do not build: full payroll processing, reimbursement/klaim, advanced notifications, full HRIS profile management, face recognition, advanced anti-spoofing, real device fingerprinting.
