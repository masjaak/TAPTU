# Changelog — Phase 10

Phase 10 is a multi-sub-phase demo consistency and stability series. No new product features are added in Phase 10; all work is demo correctness, test coverage, and quality hardening.

---

## Phase 10.15 — Final Demo Consistency QA (2026-05-19)

**Goal:** Make approval state persist across re-fetches in the demo; final QA checklist across all 5 demo accounts.

### Changes

**`apps/web/src/lib/demo.ts`**
- Renamed `FIKRI_REQUESTS` → `INITIAL_FIKRI_REQUESTS` (const, used as reset source).
- Declared `demoFikriRequests` as mutable `let` initialized from `INITIAL_FIKRI_REQUESTS.map(r => ({...r}))`.
- Added `approveDemoRequest(id, role, status, adminNote?)` — mutates `demoFikriRequests` in place with correct state-machine transitions:
  - Manager approve → `workflowStatus: "pending_hr"`, `statusLabel: "Menunggu HR"`, `status: "Menunggu"`
  - HR approve → `workflowStatus: "approved"`, `statusLabel: "Disetujui"`, `status: "Disetujui"`
  - Any reject → `workflowStatus: "rejected"`, `statusLabel: "Ditolak"`, `status: "Ditolak"`
- `resetDemoAttendanceState()` now also resets `demoFikriRequests` alongside employees and history.

**`apps/web/src/lib/api.ts`**
- `approveRequest` now calls `approveDemoRequest` first for demo tokens; mutated result is returned directly.
- Fallback path retained for non-Fikri requests (requests not in `demoFikriRequests`).

**`apps/web/src/test/api.test.ts`**
- 7 new PHASE 10.15 tests: manager approve persists to re-fetch, HR approve persists, reject persists, reset restores `pending_manager`, manager dashboard returns empty attendance (no stale QR), all 5 demo accounts route correctly, manager team remains Fikri-only after reset.

### Test result
354/354 passing, 0 failures.

---

## Phase 10.14 — Manager Pengajuan Scoping (2026-05-19)

**Goal:** Manager Pengajuan shows only Fikri's requests (not org-wide dummy data); `workflowStatus`/`statusLabel` fields present on all demo requests.

### Changes

**`apps/web/src/lib/demo.ts`**
- Added `FIKRI_REQUESTS: LeaveRequestItem[]` with two seed requests:
  - `req-fikri-01`: `workflowStatus: "pending_manager"`, `statusLabel: "Menunggu Manager"`
  - `req-fikri-02`: `workflowStatus: "approved"`, `statusLabel: "Disetujui"`
- Added `getDemoManagerRequests()` — returns Fikri requests.
- `getDemoDashboard` uses `getDemoManagerRequests()` for manager role.
- `getDemoManagerOverview().pendingRequests` counts `pending_manager` requests.
- `REQUESTS.manager = []` (manager uses dedicated function, not static array).

**`apps/web/src/lib/api.ts`**
- `fetchManagerRequests` calls `getDemoManagerRequests()` for demo tokens.

### Test result
9 new PHASE 10.14 tests passing; full suite green.

---

## Phase 10.13 — Attendance Time Formatter (2026-05-19)

**Goal:** Extract `formatAttendanceTime` to a testable utility; handle local ISO (no Z), UTC+Z, plain HH:mm, and missing values correctly.

### Changes

**`apps/web/src/lib/attendanceTime.ts`** (new file)
- `formatAttendanceTime(value?)` state machine:
  - `undefined` / empty string → `"--:--"`
  - ISO with `Z` or `±HH:MM` suffix → `new Date(value).getHours():getMinutes()` (local time)
  - ISO without UTC indicator (local demo ISO) → `value.slice(11, 16)`
  - Plain `HH:mm` string → passthrough
  - Invalid Date fallback → passthrough

**`apps/web/src/pages/AppPage.tsx`**
- Removed inline `formatAttendanceTime` definition; added import from `../lib/attendanceTime`.

**`apps/web/src/test/attendanceTime.test.ts`** (new file)
- 16 unit tests covering all 4 branches including UTC offset regression.

**`apps/web/src/test/appPage.test.tsx`**
- Stripped `.000Z` suffix from all 83 ISO timestamp mock values (`.000Z"` → `"`) so mocks match local ISO format and avoid UTC offset regressions in CI environments.

### Test result
Full suite green after mock timestamp normalization.

---

## Phase 10.12 — Demo Time Source and Manager Dummy Data (2026-05-19)

**Goal:** Fix demo check-in time showing UTC offset (e.g. "05:16" instead of local "12:20"); remove Anisa/Budi from manager team; remove Notifikasi from manager nav.

### Changes

**`apps/web/src/lib/demo.ts`**
- `recordDemoCheckIn` and `recordDemoCheckOut` now store `checkInTime`/`checkOutTime` as local ISO (`${today}T${time}:00`, no Z suffix).
- `employeeToReportRow` builds local ISO without Z suffix.
- Anisa Rahma (`usr-employee-02`) and Budi Santoso (`usr-employee-05`) set to `managerId: undefined, managerName: undefined` — excluded from `getDemoManagerOverview()` team filter.

**`apps/web/src/lib/appShellState.ts`**
- Manager `roleNavigation` updated: removed `"notifications"`.
  - Was: `["home", "team", "attendance", "requests", "notifications", "exceptions", "profile"]`
  - Now: `["home", "team", "attendance", "requests", "exceptions", "profile"]`

**`apps/web/src/test/api.test.ts`**
- Updated Phase 10.11 manager overview tests: `totalEmployees` 3→1, `checkedInToday` 2→0.
- 11 new PHASE 10.12 tests.

**`apps/web/src/test/appShellState.test.ts`**
- Removed "notifications" from expected manager nav in existing tests; added new PHASE 10.12 manager nav test.

### Test result
Full suite green after fixes.

---

## Known limitations added in Phase 10

- Vercel serverless in-memory demo state is not reliable for cross-device persistence. Supabase-backed demo persistence is needed for stable cross-device QA.
- QR auto-detection not implemented; camera currently uses honest manual confirmation.
- Selfie upload storage not wired.
- Supabase Auth password reset / production account creation not completed.
- Device registry not completed.
