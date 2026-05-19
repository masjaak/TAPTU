# Changelog — Phase 9: Scale-Up Hardening

Phase 9 focus: query safety defaults, DB index deployment, report pagination, frontend fetch discipline, and full test suite hardening. No new product features. All changes are invisible to end users but critical for production readiness.

---

## 9.1 — Backend query safety defaults

### Supabase query limits
Added `.limit()` guards on all unbounded queries that could OOM or time out under production data:

- `fetchNotifications`: `.limit(50)` — prevents large org notification floods
- `fetchAttendanceHistoryByFilter`: `.limit(100)` — attendance history per employee per filter
- `fetchAttendanceExceptions`: `.limit(50)` — exception queue cap

### 30-day date filter on history
`fetchAttendanceHistoryByFilter` now adds a `gte` filter for 30 days back when no explicit date range is supplied. Prevents full-table scans on orgs with long attendance history.

### Org-scoped exception count in admin overview
`fetchAdminOverview` exception count query now filters by `organization_id` so the count shown in the dashboard is org-scoped, not global.

---

## 9.2 — Report pagination (API)

Report endpoint now supports cursor-style pagination:

- Query params: `?limit` (default 100, max 500) and `?offset` (default 0)
- Response headers: `X-Has-More`, `X-Pagination-Limit`, `X-Pagination-Offset`
- 500-row hard cap enforced server-side regardless of `?limit` value
- Allows frontend to implement progressive loading or page controls without fetching all rows at once

---

## 9.3 — Frontend fetch discipline

### `auditLogsLoaded` flag
Replaced length-check guard (`auditLogs.length === 0`) with a proper boolean `auditLogsLoaded` flag. Length-check incorrectly suppressed re-fetching when legitimately zero audit logs were returned.

### `session?.token` as dashboard effect dependency
Added `session?.token` to the dashboard `useEffect` dependency array. Previously the dashboard could mount with a stale or missing session token and never re-trigger the data fetch when the session was restored.

### History filter refetch guard
Filter button `onClick` now short-circuits with `if (filter === historyFilter) return;` before calling `setAttendanceHistoryLoaded(false)`. Prevents redundant re-fetch when the same filter is clicked twice without a real change.

### `filteredEmployees` useMemo
Employee list filtering extracted into a `useMemo` to avoid recomputing the filtered list on unrelated renders. No behavior change; fixes unnecessary render cycles in the HR Tim view.

---

## 9.4 — DB indexes pushed to live Supabase

Two migration files applied to production Supabase project (`ajlfwivpllbcmadscmkb`):

**`202605180001_performance_indexes.sql`**
- `profiles_organization_id_idx` — `public.profiles (organization_id)`
- `attendance_records_attendance_date_idx` — `public.attendance_records (attendance_date DESC)`
- `attendance_records_created_at_idx` — `public.attendance_records (created_at DESC)`
- `approval_requests_employee_id_idx` — `public.approval_requests (employee_id)`
- `approval_requests_status_idx` — `public.approval_requests (status)`

**`202605180002_attendance_exceptions_indexes.sql`**
- `attendance_exceptions_employee_id_status_idx` — `public.attendance_exceptions (employee_id, status)` composite

All indexes use `CREATE INDEX IF NOT EXISTS` for idempotency.

---

## 9.5 — Test suite hardening

### Test count
- Phase 8.6 end: **169 tests passing**
- Phase 9 end: **345 tests passing** (176 new tests added)

### Pre-existing test infrastructure issues resolved
17 failures fixed in the existing test suite — none were app regressions, all were test environment setup issues:

- All jsdom-requiring test files lacked `// @vitest-environment jsdom` annotation (required when vitest runs from monorepo root rather than `apps/web` directly, bypassing `vite.config.ts` `setupFiles`)
- `metadata.test.ts` was resolving `index.html` relative to monorepo root instead of `apps/web/`
- `designSystem.test.tsx` was resolving source files two levels above monorepo root due to incorrect `../..` prefix

### AppPage test additions (121 AppPage tests total, up from 103)
New `describe` blocks added to `appPage.test.tsx`:

**History filter refetch (3 tests)**
1. Clicking Hadir filter re-fetches with correct filter value and shows new records
2. Filter change produces no more than 2 fetches total (no infinite re-fetch loop)
3. Clicking same filter twice fetches only once more (guard prevents double fetch)

**Role flow regression QA (5 tests)**
1. No session → redirects to `/login`, workspace content not rendered, `getDashboard` not called
2. Superadmin role → loads admin dashboard overview, `fetchAdminOverview` called with `"demo:superadmin"`, `fetchEmployeeSummary` not called
3. Employee navigating directly to `/app/team` → `toAppSection` guard returns "home", HR employee list not fetched
4. Employee submitting an izin request → `createRequest` called with `category: "Izin"`, result card shows `"Menunggu Manager"` status label
5. HR approving `approved_by_manager` request → `approveRequest("demo:admin", "req-final", "Disetujui", undefined)` called, toast shows `"Pengajuan disetujui."`

### landingPage test additions (18 tests, all passing)
`beforeAll` block added with `MockIntersectionObserver` to fix framer-motion `whileInView` failures in jsdom. Framer-motion's `whileInView` uses `IntersectionObserver`; without the mock, React Router's `ErrorBoundary` swallows the error and the page renders nothing, causing all positive assertions to fail silently.

---

## Known issues at Phase 9 close

None blocking. Pre-existing limitations from Phase 8 remain (selfie storage, shift assignment, approval timeline UI, very narrow mobile QA) — these are unchanged by Phase 9 work.

---

## Files changed (Phase 9)

**Backend / API**
- `packages/api/src/services/supabaseQueries.ts` — query limits, 30-day filter, org-scoped exception count
- `packages/api/src/routes/reports.ts` — pagination params and headers

**Frontend**
- `apps/web/src/pages/AppPage.tsx` — `auditLogsLoaded` flag, session dep, history filter guard, filteredEmployees memo

**Migrations**
- `supabase/migrations/202605180001_performance_indexes.sql`
- `supabase/migrations/202605180002_attendance_exceptions_indexes.sql`

**Tests**
- `apps/web/src/test/appPage.test.tsx` — 18 new tests (filter refetch + role flow regression)
- `apps/web/src/test/landingPage.test.tsx` — `// @vitest-environment jsdom` + `MockIntersectionObserver` beforeAll
- `apps/web/src/test/loginPage.test.tsx` — `// @vitest-environment jsdom` annotation
- `apps/web/src/test/registerPage.test.tsx` — `// @vitest-environment jsdom` annotation
- `apps/web/src/test/designSystem.test.tsx` — `// @vitest-environment jsdom` + corrected path resolution
- `apps/web/src/test/metadata.test.ts` — corrected `apps/web` base path resolution
