# Changelog — Phase 5

## Phase 5.1 — Supabase/Database Verification (2026-05-03)

**Verified:**
- `work_locations` — present, Phase 3 migration
- `scanner_tokens` — present, Phase 3 migration
- `attendance_records` — present with all required MVP fields
- `attendance_exceptions` — present, Phase 3 migration
- `approval_requests` — present, Phase 3 migration
- `audit_logs` — present, Phase 3 migration

**attendance_records field check — all present:**
employee_id, shift_id, check_in_time, check_out_time, status, location_lat, location_lng,
validation_status, validation_reasons, selfie_url (nullable), device_id (nullable),
scanner_token_id (optional), created_at, updated_at

**Fixed:**
- Added migration `202605030001_shifts_schema.sql`
  - Created `shifts` table (org-scoped, with start/end time + late threshold)
  - Created `shift_assignments` table (per-employee, per-date)
  - RLS policies for service role, admin/manager, and employee reads

**Note:**
`attendance_records.shift_id` remains `text` (backward-compat). New shift assignments
use the `shifts` UUID FK. No data migration needed at this stage.

---

## Phase 5.2 — UI Consistency and Responsive QA (2026-05-03)

**Routes/screens checked:**
- Dashboard (admin, manager, employee)
- Employee attendance / check-in desk
- Scanner mode
- Team list + exception queue
- Approval/requests workspace
- Work locations + shift management
- Reports + audit trail
- AppShell (desktop sidebar, mobile header, mobile drawer)
- Shared components: Button, Panel, StatCard, StatusBadge, DataTable, Dialog, EmptyState, LoadingState, ErrorState

**UI issues checked:**
- Old theme colors (green/emerald/teal/lime): one trace found in reports flag badges
- Responsive overflow: team filter pills, reports toolbar, attendance button column
- Tables: DataTable uses `overflow-x-auto` — correctly handles all column-heavy views
- Navigation: mobile drawer closes on navigate, focus-visible states present on all interactive elements
- Forms: all inputs/selects share consistent `rounded-2xl border-[#e2e7f0]` style
- Button variants: PrimaryButton and SecondaryButton consistent throughout
- StatusBadge tones: no green; success uses Taptu blue (`#edf4ff`/`#174ea6`), consistent

**Fixes made (4 changes in `AppPage.tsx`):**
1. Selfie flag badge in reports: `bg-[#f0fdf4] text-[#16a34a]` → `bg-[#f1f5ff] text-[#1769ff]` (old green removed)
2. Team status count pills: added `flex-wrap` to prevent mobile overflow
3. Reports toolbar header row: added `flex-wrap` to prevent tight layout on narrow screens
4. Attendance check-in button column: added `[&>button]:w-full` so buttons are full-width on mobile

**Files changed:** `apps/web/src/pages/AppPage.tsx`

**Remaining UI TODOs:**
- Reports table has 8 columns — functional with `overflow-x-auto` but could benefit from a compact column option for tablet
- Profile workspace is a stub (EmptyState) — no UI to QA yet
- Selfie upload to server storage remains nullable/unfinished — documented in UI with correct placeholder copy

---

## Phase 5.4 — States and Accessibility Polish (2026-05-03)

**States checked:**
- Admin dashboard summary, employee attendance, scanner mode, exception queue, approval flow, team roster
- Work locations, shift management, attendance reports, audit trail, CSV export state
- Shared empty/loading/error primitives plus mobile navigation drawer and request detail dialog

**Accessibility improvements made:**
- Added `role="status"` / `role="alert"` semantics to loading, empty, error, and feedback states
- Added dialog labeling, mobile drawer dialog semantics, clearer search/file input labels, and inline form error messaging with `aria-invalid`
- Kept scanner status readable with explicit text for active vs expired token state, not color alone

**Files changed:**
- `apps/web/src/components/app.tsx`
- `apps/web/src/pages/AppPage.tsx`

**Remaining polish TODOs:**
- Selfie upload is still preview-only on the client; backend storage flow remains unfinished by MVP decision
- Reports and scanner workspaces could gain dedicated retry buttons later, but current errors now explain what to do next

---

## Phase 5.3 Functional QA (2026-05-03)

**Flows checked:**
- Login to `/app` and role-based routing for admin, manager, employee, scanner
- Manager role limitation in navigation and approval flow
- Admin dashboard summary and recent activity
- Employee check-in, check-out, current attendance status, location/device/selfie validation surface
- Scanner token refresh, countdown, recent scan history, invalid/expired token handling path
- Exception queue actions: approve, reject, request correction
- Approval requests: create, approve/reject, cancel pending request
- Team list rendering and report workspace / CSV export trigger
- Work location create/edit and shift create/edit screens

**Bugs fixed:**
- Fixed geofence source-of-truth sync after work location edits:
  editing a work location now updates both `workLocationItems` and `workLocations`, so future attendance validation uses the edited latitude/longitude/radius instead of stale values.
- Fixed one stale QA test assertion in `appPage.test.tsx` so the reports workspace check no longer fails on duplicate heading text.

**Files changed:**
- `apps/api/src/domain.ts`
- `apps/api/src/domain.test.ts`
- `apps/api/src/index.ts`
- `apps/web/src/test/appPage.test.tsx`
- `Documents/TAPTU/HANDOFF_CURRENT.md`
- `Documents/TAPTU/CHANGELOG_PHASE_5.md`

**Known issues:**
- Manager team scoping is still broad: manager can access org-wide operational lists instead of a true team-scoped subset.
- Shift assignment flow is not implemented in the post-login UI/API yet; shifts can be created/edited, but employee-to-shift assignment is not completed.
- Work locations, shifts, employee roster, and reports are still served from local store routes in the current API path, not fully backed by Supabase relational reads/writes.
- Selfie capture is only a local preview/input flow today; storage upload remains unfinished and `selfie_url` can stay nullable.

**Remaining functional TODOs:**
- Implement team-scoped manager filtering
- Implement shift assignment workflow
- Move phase-4/5 operational endpoints to Supabase-backed persistence
- Finalize selfie upload storage path

---

## Phase 5.5 Documentation, Roadmap, and Final MVP Handoff (2026-05-03)

**Updated:**
- Final handoff created/refreshed in `Documents/TAPTU/HANDOFF_TAPTU.md`
- Short current handoff refreshed in `Documents/TAPTU/HANDOFF_CURRENT.md`
- Future roadmap added and organized by suggested next phase
- Known MVP limitations consolidated and documented clearly
- Recommended next step after MVP added
