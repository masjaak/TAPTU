# Changelog — Phase 6

## Phase 6.1 Employee Check-in Simplification (2026-05-03)

**Checked:**
- Employee attendance screen and role navigation
- Employee check-in/check-out client payloads
- Scanner/Kiosk workspace separation

**Fixed:**
- Removed employee-facing scanner token input from the attendance desk.
- Replaced separate QR/GPS/Selfie check-in buttons with one primary "Check-in sekarang" action and one "Check-out sekarang" action.
- Changed employee check-in/check-out payloads to use `Manual`, so scanner token validation remains isolated to Scanner/Kiosk mode.
- Prevented non-QR local-store attendance actions from attaching scanner IDs or scanner scan history entries.
- Clarified attendance copy: location, selfie proof when needed, and device/session signal are part of the check-in validation flow.
- Added an inline blocked state when location/device validation is not ready.

**Files changed:**
- `apps/web/src/pages/AppPage.tsx`
- `apps/web/src/lib/appShellState.ts`
- `apps/web/src/test/appPage.test.tsx`
- `apps/api/src/index.ts`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

**Scanner token handling:**
- Scanner token remains for Scanner/Kiosk mode only.
- Employee accounts no longer manage or enter scanner tokens directly.

**Remaining TODOs:**
- Selfie upload still uses local preview and remains nullable until storage integration is finalized.
- Kiosk/QR gate consumption can be handled behind the scanner flow later without exposing token controls to employees.

---

## Phase 6.2 Recent History Bug Fix (2026-05-03)

**Checked:**
- Employee attendance recent history surface
- History filter selected state
- Direct employee attendance history data rendering

**Fixed:**
- Replaced the employee recent history table with comfortable tap-target history rows.
- Added native expandable history rows so tapping an item opens its detail.
- Preserved filter active state and added clearer pressed state semantics to filter pills.

**Files changed:**
- `apps/web/src/pages/AppPage.tsx`
- `apps/web/src/test/appPage.test.tsx`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

**Remaining TODOs:**
- History detail is lightweight and uses the current timeline fields only; richer validation metadata can be added later if the history API exposes it.

---

## Phase 6.3 Employee Self-service Tabs (2026-05-03)

**Checked:**
- Employee navigation and app section routing
- Employee attendance, recent history, request, profile, and summary surfaces
- Existing approval/request categories and shift summary data
- Payroll-ready report/CSV surface for payslip scope reference

**Added:**
- Employee self-service navigation now includes Beranda, Presensi, Riwayat, Pengajuan, Jadwal, Slip Gaji, and Profil.
- Beranda shows a today-first employee summary using the existing dashboard and employee summary data.
- Riwayat is now its own employee tab with the expandable recent history rows from Phase 6.2.
- Jadwal shows the assigned shift from the employee summary and upcoming schedule items when dashboard data exists.
- Slip Gaji is a lightweight read-only placeholder because no payslip data model exists yet.

**Connected flows:**
- Pengajuan continues to use the existing request submit/list/detail/cancel flow for Izin, Cuti, Sakit, Permission, Attendance Correction, and Forgot Check-in/out.
- Lembur remains documented as roadmap because it is not currently supported by the approval flow.
- Slip Gaji points to existing payroll-ready attendance CSV/reporting while keeping full payroll processing out of scope.

**Files changed:**
- `apps/web/src/lib/appShellState.ts`
- `apps/web/src/pages/AppPage.tsx`
- `apps/web/src/test/appShellState.test.ts`
- `apps/web/src/test/appPage.test.tsx`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

**Remaining TODOs:**
- Upcoming shift assignment still depends on richer schedule data from the dashboard/API.
- Payslip needs a real read-only payslip source before list/detail can replace the placeholder.

---

## Phase 6.4 Mobile Typography and Spacing Polish (2026-05-03)

**Checked:**
- Shared app shell, mobile navigation drawer, page header, panels, stats, forms, buttons, tables, empty/loading/error states
- Employee Beranda, Presensi, Riwayat, Pengajuan, Jadwal, Slip Gaji, and Profil surfaces
- Admin/Superadmin dashboard, roster, locations/shift management, reports, and audit table surfaces
- Scanner mode surfaces affected by shared sizing and token typography

**Fixed:**
- Reduced mobile heading/stat/token sizes while keeping larger desktop sizing.
- Tightened mobile shell/card radius and padding so frames fit narrow screens more safely.
- Added safer text wrapping and `min-w-0` handling for nav labels, cards, badges, tables, and long operational copy.
- Improved mobile table containment with horizontal scroll and bounded cell widths.
- Stacked dense admin/superadmin action rows and form buttons on mobile before returning to desktop rows.

**Files changed:**
- `apps/web/src/components/app.tsx`
- `apps/web/src/pages/AppPage.tsx`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

**Remaining mobile TODOs:**
- Manual screenshot QA on very narrow devices should still review dense report tables with real production-length names and notes.

---

## Phase 6.5 Final QA, Roadmap, and Handoff Update (2026-05-03)

**Checked:**
- `Documents/TAPTU/HANDOFF_CURRENT.md`
- `Documents/TAPTU/HANDOFF_TAPTU.md`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

**Documented Phase 6 summary:**
- Employee check-in/check-out was simplified to one primary check-in action and one check-out action.
- Scanner token handling was clarified as Scanner/Kiosk-only, not employee-managed.
- Employee recent history tap/detail behavior was fixed and documented.
- Employee self-service tabs now include Pengajuan, Jadwal, and lightweight Slip Gaji.
- Mobile typography, spacing, wrapping, and dense table/form polish were completed.

**Roadmap updated as roadmap-only:**
- Reimbursement/klaim.
- Secure file sharing/dokumen.
- Organization structure.
- Advanced notifications.
- Full payroll processing.
- Full HRIS employee profile management.
- Face recognition.
- Advanced anti-spoofing.
- Real device fingerprinting.

**Known remaining limitations:**
- Selfie upload/storage remains unfinished and nullable.
- Manager scoping remains broad until department/team segmentation is implemented.
- Shift assignment is not complete end to end in post-login UI/API.
- Employee Jadwal depends on limited schedule data.
- Employee Slip Gaji has no real payslip source yet.
- Some operational flows still need Supabase persistence hardening.
- Very narrow mobile screens still need production-data manual QA.

**Files changed:**
- `Documents/TAPTU/HANDOFF_CURRENT.md`
- `Documents/TAPTU/HANDOFF_TAPTU.md`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

**No app changes:**
- No application code modified.
- No database/schema changes made.
- No roadmap features built.

---

## Employee Check-in and Attendance History Hotfix (2026-05-03)

**Checked:**
- Employee attendance/check-in page.
- Employee navigation/tab state.
- Employee attendance history rendering and filter loading.
- Employee check-in API action wiring.

**Fixed:**
- Primary employee Check-in now opens the camera/selfie file capture directly.
- Capturing a selfie auto-submits the check-in instead of requiring a separate selfie frame and second check-in step.
- Removed employee-facing technical storage/nullable copy from the check-in UI.
- Presensi now loads and renders the employee attendance history with the same clean list/detail states as Riwayat.
- History empty, loading, and error states remain user-friendly, and detail rows keep comfortable mobile tap targets.

**Files changed:**
- `apps/web/src/pages/AppPage.tsx`
- `apps/web/src/test/appPage.test.tsx`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

**Remaining limitations:**
- Selfie storage/upload is still not finalized; `selfie_url` may remain nullable internally until storage integration is completed.
