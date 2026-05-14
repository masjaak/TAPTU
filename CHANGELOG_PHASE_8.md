# Taptu Phase 8 Changelog

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
