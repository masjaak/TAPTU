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
