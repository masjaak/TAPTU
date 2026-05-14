# Taptu Phase 8 Changelog

## Phase 8 Final Stabilization – QA Closure

### Manager Dashboard completed and scoped

- Manager Dashboard is considered complete for Phase 8: Beranda, Tim Saya, Presensi Tim, Pengajuan, Pengecualian, and Profil are all role-specific.
- Manager data paths use manager-scoped APIs: `fetchManagerOverview`, `fetchManagerEmployeeList`, `fetchManagerExceptionQueue`, and `fetchManagerRequests`.
- Manager direct route access is guarded through `roleNavigation`/`toAppSection`; Laporan, Lokasi, Scanner, Struktur, and Settings fall back safely.
- Manager Presensi Tim is covered by targeted QA to ensure it renders `fetchManagerEmployeeList` data only, not HR/global report rows.

### HR Dashboard and HR Struktur hardening

- HR Dashboard remains the org-wide operational workspace.
- HR/Admin navigation is locked to: Beranda, Tim, Struktur, Presensi, Pengajuan, Lokasi, Laporan, Profil.
- HR direct route access to reports remains valid and covered by targeted route QA.
- HR Struktur/Divisi & Penempatan is added and connected through department APIs.

### Department/division placement status

- `GET /api/departments` / `fetchDepartments` supplies the HR Divisi panel.
- `POST /api/departments` / `createDepartment` supports Tambah divisi.
- `PATCH /api/departments/:id` / `updateDepartment` supports Edit divisi and Atur manager.
- `PATCH /api/employees/:id` / `reassignEmployeeDepartment` supports Ubah divisi for employees.
- Failure paths are covered for create/edit style flows so UI does not show fake success when backend writes fail.
- Full HRIS employee profile management remains out of scope.

### Approval two-step flow

- Employee request creation creates manager + HR approval steps when employee has `manager_id`.
- Employees without `manager_id` go directly to HR approval.
- Manager approval advances the request to `pending_hr` / "Menunggu HR"; it does not final-approve.
- HR approval finalizes as `approved` / "Disetujui".
- Manager or HR rejection finalizes as `rejected` / "Ditolak"; reviewer note remains visible to employee in Riwayat Pengajuan.
- Invalid transitions are covered: HR cannot approve a request still waiting for Manager, and Manager cannot final-approve an HR-stage request.

### Attendance QA status

- Employee check-in creates an `attendance_records` row.
- Check-in success refreshes Employee Riwayat.
- After check-in, Employee can check-out.
- Check-out updates the same active attendance record by id, instead of creating a duplicate.
- HR Presensi uses org-wide report rows.
- Manager Presensi Tim uses only manager-scoped team attendance.
- Employee attendance history is filtered by the current employee id.
- Failed check-in/check-out saves show errors and do not show fake success or refresh history as if persistence succeeded.

### Role access guard QA status

- Employee direct URLs to HR/Manager/Superadmin sections fall back to employee home.
- Manager direct URLs to HR Laporan, Lokasi, Scanner, Struktur, and Settings fall back to manager home.
- HR can access Tim, Struktur, Presensi, Pengajuan, Lokasi, Laporan, and Profil.
- Superadmin access remains valid according to current role system: includes Settings in navigation, but Scanner remains excluded.
- Scanner can access Scanner and Profil only; direct URLs to other sections fall back to Scanner mode.

### Tests run

- `npm run test --workspace @taptu/api -- supabaseQueries.test.ts` — 21 tests passing.
- `npm run test --workspace @taptu/web -- appPage.test.tsx` — 103 tests passing.
- `npm run test --workspace @taptu/web -- appShellState.test.ts` — 12 tests passing.
- Per instruction, no build was run for this documentation update.

### Remaining limitations

- Selfie upload/storage remains unfinished; `selfie_url` may remain nullable.
- Approval timeline/step-history UI is not built; cards show the current workflow label and notes only.
- Superadmin Settings is present in navigation, but no dedicated settings workspace is completed.
- Shift assignment workflow remains incomplete in post-login UI/API.
- Employee Jadwal and Slip Gaji remain lightweight placeholders backed by limited data.
- Some operational paths still use local/demo-store style persistence instead of fully normalized Supabase flows.
- Production-like manual QA is still recommended for seeded manager/team data and very narrow mobile screens with long names/notes.

### Next safe phase

- Next safe phase: **Phase 9 operational hardening**.
- Recommended starting scope: manual QA with seeded manager/team data, approval timeline panel, reporting hardening, Supabase persistence gaps, shift assignment, selfie storage finalization, and dense mobile QA.
- Continue avoiding payroll, notifications, chat/comments, analytics, reimbursement, and broad HRIS expansion until the stabilized MVP paths are hardened.

## Phase 8.1 – Manager-Scoped Data Foundation (Codex)

- Added `fetchManagerOverview` — returns team-only stat summary (checkedInToday, lateToday, absentToday, pendingRequests, exceptionCount, recentActivity).
- Added `fetchManagerEmployeeList` — returns only employees where `manager_id` matches the requesting manager.
- Added `fetchManagerExceptionQueue` — returns attendance exceptions for manager's direct reports only.
- Added `fetchManagerRequests` — returns approval requests where the manager is the assigned approver at the current step.
- No org-wide fallback: if manager has no team, each endpoint returns an empty list.
- Manager home loads via `fetchManagerOverview`, not `fetchAdminOverview`.
- Manager requests initial load uses `fetchManagerRequests`, not the `getDashboard` seed payload.
- `workflowStatus` and `statusLabel` are preserved in manager request cards.

## Phase 8.3 – Manager Dashboard UX Polish (Claude)

### Navigation

- Manager nav updated to: `Beranda`, `Tim Saya`, `Presensi Tim`, `Pengajuan`, `Pengecualian`, `Profil`.
- New `exceptions` section key added to `AppSectionKey`.
- Manager-specific label overrides applied in `getNavigationForRole` and `getTabsForRole`: team → "Tim Saya", attendance → "Presensi Tim", exceptions → "Pengecualian".
- Admin/HR navigation unchanged.
- Manager does not see: Laporan, Lokasi global, Scanner, Superadmin settings.
- Mobile bottom nav enabled for manager with 5 items: home, team, requests, exceptions, profile.

### Beranda

- `renderManagerHome` rebuilt with `PageHeader` (date context, eyebrow "Beranda Supervisor").
- 5 stat cards: Hadir hari ini, Terlambat, Belum hadir, Menunggu approval, Perlu review.
- "Aktivitas tim hari ini" panel replaces old activity table title.
- "Pengajuan menunggu" panel shows count and quick-navigate button to Pengajuan tab.
- "Pengecualian validasi" panel shows count and quick-navigate button to Pengecualian tab.
- Empty states for all three content panels when data is zero.

### Tim Saya

- `PageHeader` added: eyebrow "Tim Saya", title "Anggota Tim", description manager-specific.
- Table columns for manager: Karyawan, Departemen, Shift, Check-in, Status hari ini, Validasi.
- Removed "Role" and "Manager" columns from manager view (irrelevant for own-team context).
- Employee code shown alongside email in name column.
- All copy changed from HR-wide language ("Daftar karyawan aktif") to manager-specific ("Anggota tim Anda").
- Exception queue and exception info panel hidden from Tim Saya for manager (moved to dedicated Pengecualian page).

### Presensi Tim

- `PageHeader` added: eyebrow "Presensi Tim", title "Status Kehadiran Hari Ini".
- Stat card labels simplified: "Hadir", "Terlambat", "Belum hadir", "Izin / cuti".
- Table now shows Departemen in employee sub-label instead of raw email.
- Status labels: Tepat waktu, Terlambat, Izin, Belum hadir.

### Pengajuan

- Manager gets dedicated `renderManagerRequestsPage` instead of shared request workspace.
- Team approval queue is primary (full-width panel at top).
- "Alur persetujuan dua tahap" notice updated: "Persetujuan Anda adalah langkah pertama. Pengajuan belum selesai sampai HR memberikan keputusan final."
- Request cards show requester name prominently above title.
- Category shown in blue accent; admin note shown in inset sub-panel if present.
- Note label changed to "Catatan keputusan" with clearer hint text.
- Self-request form moved to secondary panel "Pengajuan saya" below the queue.

### Pengecualian (new page)

- New route `/app/exceptions` handled by `renderManagerExceptionsPage`.
- `PageHeader` added: eyebrow "Pengecualian", title "Pengecualian Tim", description "Tinjau validasi kehadiran anggota tim yang membutuhkan keputusan."
- Exception types translated to Indonesian: Outside radius → "Di luar radius", Invalid QR → "QR tidak valid", Expired QR → "QR kedaluwarsa", Different device → "Perangkat berbeda", etc.
- Status labels translated: Need Review → "Perlu review", Approved → "Disetujui", Rejected → "Ditolak".
- Creation date shown per exception item.
- Actions: Setujui, Tolak, Minta koreksi.
- Empty state: "Belum ada pengecualian — Kasus validasi tim akan muncul jika membutuhkan review."
- Data loading triggered when `tab === "exceptions"` (same as `tab === "team"` for exceptions queue).

### Profil

- Department field shown if available on `AuthUser`.
- Permissions panel expanded to 7 items with active/inactive badges:
  - Active: Melihat anggota tim, Memantau presensi tim, Meninjau pengajuan tim, Meninjau pengecualian tim.
  - Inactive: Ekspor laporan global, Kelola lokasi kerja, Kelola shift global.

### Tests

- `appShellState.test.ts`: manager nav test updated to include `exceptions`. Two new tests added for manager label overrides and admin label preservation.
- `appPage.test.tsx`: 4 existing manager tests updated to match new copy. New assertions for pending approvals panel and exceptions panel on home.
- Final result: **141 tests passing**, 0 failures.

## Phase 8.4 – HR Divisi & Penempatan UI

### Data source

- No new API or schema changes. Division data is derived from `employeeList` via a new `divisiList` useMemo in `AppPage.tsx`.
- `divisiList` groups employees by `departmentId`/`departmentName`, computes `memberCount` and `managerName` (unique manager names across employees in each department).

### UI added — HR Tim workspace

- New `<div data-testid="divisi-penempatan-section">` panel added to `renderTeamWorkspace`, below the exception queue section, visible only for admin/HR (`!isManager`).
- Panel title: "Divisi & Penempatan", eyebrow: "Struktur tim".
- Yellow TODO banner: notes that create/edit/assign manager/reassign employee actions require backend API — marked for Codex.
- Empty state: "Belum ada divisi" when no employees have `departmentId` set.
- Division table columns: Divisi, Manager, Jumlah anggota, Status, Aksi.
  - Manager column: shows `managerName` or "Belum ditetapkan" if none.
  - Member count: `{n} anggota`.
  - Status: always shows "Aktif" badge (no active/inactive field in current schema; derived from having members).
  - Aksi: "Lihat anggota" (connected — sets `employeeDepartmentFilter` to filter the employee table above); "Edit" (disabled); "Atur manager" (disabled).
- Each row has `data-testid="divisi-row-{departmentId}"` for test targeting.
- Manager role: section is not rendered (`!isManager` guard).

### What is read-only / not connected

- "Edit" button: disabled. Needs `PATCH /departments/:id` (name, description).
- "Atur manager" button: disabled. Needs `PATCH /departments/:id` with `managerId`.
- Create new division: not implemented. Needs `POST /departments`.
- Employee department reassignment: read-only field in existing employee table. Needs `PATCH /employees/:id` with `departmentId`.

### Backend tasks for Codex

1. `POST /departments` — create division with name, optional managerId.
2. `PATCH /departments/:id` — edit name; assign/remove manager.
3. `PATCH /employees/:id` — reassign employee to department.
4. `GET /departments` — dedicated endpoint so division list is not dependent on fetching the full employee list.

### Tests

- `appPage.test.tsx`: new `describe("HR Divisi & Penempatan")` block with 6 tests covering: section renders, empty state, row data (name/manager/count), Lihat anggota filter, manager role exclusion, disabled Edit buttons.
- Final result: **162 tests passing**, 0 failures.

## Phase 8.6 – HR Tim Custom Filter Dropdowns

### New component: `FilterSelect` (`components/app.tsx`)

- Added `FilterSelectOption` interface: `{ value: string; label: string }`.
- Added `FilterSelect` component: custom combobox-style dropdown using React portal, same scroll-safe behavior as `CategorySelect`.
- Trigger button: `role="combobox"`, `aria-label`, `aria-expanded`, `aria-haspopup="listbox"`. No native macOS popup.
- Options rendered via portal into `document.body` with `role="listbox"` and `role="option"`. Max height 260px with internal scroll.
- Dropdown does not close when user scrolls inside the options list.
- Selected option shown with blue accent and checkmark. Unselected options highlight on hover.
- `onChange` receives the option `value` (not label), compatible with ID-based filter state.

### AppPage.tsx changes

- Imported `FilterSelect` from `../components/app`.
- Replaced `<select aria-label="Divisi / Departemen">` in HR Tim filter strip with `<FilterSelect>`.
- Replaced `<select aria-label="Status hari ini">` in HR Tim filter strip with `<FilterSelect>`.
- Report filter strip and Dialog form selects (Manager divisi, Divisi baru) remain as native `<select>` — those are form controls, not filter strips.

### Tests

- Updated `"keeps HR team organization-wide by default and filters by search, division, and status"`: replaced `fireEvent.change` on native select with `fireEvent.click(combobox)` + `fireEvent.mouseDown(option)`.
- Updated `"shows only the default division option when no departments exist"`: open combobox then assert `role="option"` items.
- Updated `"does not show HR global filters on the manager team page"`: `queryByRole("combobox", ...)` instead of `queryByLabelText`.
- Updated `"HR Tim filter bar renders search and both filter controls accessible"`: `getByRole("combobox", ...)` instead of `getByLabelText`.
- Added `"HR Tim division filter is a custom combobox, not a native select"`: checks `tagName !== SELECT` and `aria-haspopup="listbox"`.
- Added `"HR Tim status filter is a custom combobox, not a native select"`: same checks.
- Added `"HR Tim division filter options come from employee department data"`: opens dropdown, verifies options include department names derived from employee list.
- Final result: **169 tests passing**, 0 failures.

## Phase 8.5 – HR Divisi & Penempatan Connected Actions

### Backend API used

- `GET /api/departments` → `fetchDepartments` — loads departments when `tab === "team"` and `isAdmin`.
- `POST /api/departments` → `createDepartment` — creates new division.
- `PATCH /api/departments/:id` → `updateDepartment` — edits name or assigns manager.
- `PATCH /api/employees/:id` → `reassignEmployeeDepartment` — reassigns employee to a different division.

### UI changes (AppPage.tsx)

- **Data source switch:** Divisi panel now uses `departments` state (fetched from API) instead of `divisiList` derived from employee list. Separate loading/error states.
- **Tambah divisi button:** Opens Dialog form with "Nama divisi" input and "Manager divisi" dropdown (populated from employees with manager/admin role). On submit: calls `createDepartment`, refreshes `departments`, shows success toast.
- **Edit divisi button:** Opens same form pre-filled with division name and current manager. On submit: calls `updateDepartment`, refreshes `departments`.
- **Atur manager button:** Opens same edit form — same behavior as "Edit" (user can change manager in the form).
- **Ubah divisi button (employee table):** New "Aksi" column added to admin employee table. "Ubah divisi" opens Dialog with dropdown of available departments. On submit: calls `reassignEmployeeDepartment`, refreshes `employeeList` via `fetchEmployeeList`.
- **Status column:** Uses `DepartmentItem.isActive` — shows "Aktif" or "Nonaktif" badge.
- **Member count:** Uses `DepartmentItem.memberCount` from API (not derived).
- **No fake success:** All actions wired to real API calls with `busyAction` loading state and error display.

### Tests

- Rewrote `describe("HR Divisi & Penempatan")` block: updated 6 existing tests to use API-provided department data (`fetchDepartments` mock) instead of derived `divisiList`.
- Added 4 new action tests: Tambah divisi (create + refresh), Edit divisi (pre-fill + update), Atur manager (manager assignment), Ubah divisi (employee reassignment + employee list refresh).
- Fixed `fetchDepartments` missing from `HR team filters` and `HR filter bar UI polish` describe-level `beforeEach` blocks.
- Final result: **166 tests passing**, 0 failures.
