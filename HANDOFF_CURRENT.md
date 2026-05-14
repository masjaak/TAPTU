# Taptu Current Handoff

Read this file first in future sessions. It is the low-token entrypoint; open `HANDOFF_TAPTU.md` only when deeper context is needed.

## Current status

- Documentation is current through Phase 8 final stabilization.
- Phase 6 completed employee-facing simplification and polish.
- Phase 7 added organization structure, multi-step approval state machine (API), and initial manager dashboard UI.
- Phase 7.4 implemented request approval state machine: employee creation, optional manager step, HR final step, rejection finalization, backward-compatible status labels.
- Phase 7.5 shipped initial manager dashboard: role-scoped nav, Beranda with team stats, Tim Saya, Presensi Tim, Pengajuan with two-step banner, Profil. 132 tests passing.
- Phase 8.1 wired manager-scoped data: `fetchManagerOverview`, `fetchManagerEmployeeList`, `fetchManagerExceptionQueue`, `fetchManagerRequests`. No org-wide fallback. `workflowStatus`/`statusLabel` preserved.
- Phase 8.3 completed Manager Dashboard UX polish: nav updated to Beranda/Tim Saya/Presensi Tim/Pengajuan/Pengecualian/Profil, new Pengecualian page, manager-specific request queue, rebuilt home with team status panels, refined team and attendance views, manager permission summary in Profil. 141 tests passing.
- Phase 8.4 added HR Divisi & Penempatan UI shell: division table in HR Tim workspace, data derived from employee list, actions disabled with TODO notice. 162 tests passing.
- Phase 8.5 connected all Divisi & Penempatan actions to backend API: Tambah divisi (createDepartment), Edit/Atur manager (updateDepartment), Ubah divisi in employee table (reassignEmployeeDepartment). Data source switched to `fetchDepartments` with loading/error states. 166 tests passing.
- Phase 8.6 replaced native `<select>` filter controls in HR Tim with custom `FilterSelect` component (Taptu style, portal dropdown, scroll-safe, no native browser popup). New `FilterSelect` exported from `components/app.tsx`. Divisi and Status filters in HR Tim filter strip now use combobox role. **169 tests passing.**
- Phase 8 final stabilization completed targeted QA for Manager Dashboard scoping, HR Dashboard hardening, HR Struktur/Divisi & Penempatan, approval two-step flow, attendance check-in/check-out persistence, and role access guards. Latest targeted runs: `npm run test --workspace @taptu/api -- supabaseQueries.test.ts` (**21 tests passing**), `npm run test --workspace @taptu/web -- appPage.test.tsx` (**103 tests passing**), `npm run test --workspace @taptu/web -- appShellState.test.ts` (**12 tests passing**).

## Fixed decisions

- Manager remains a limited operational approver, not full HR admin.
- Manager nav is: Beranda, Tim Saya, Presensi Tim, Pengajuan, Pengecualian, Profil. Laporan, Lokasi global, Scanner, and settings are not accessible.
- Manager data is scoped through manager-specific endpoints and direct-route guards; no org-wide fallback should be used for manager team, attendance, exceptions, or requests.
- HR/Admin nav is: Beranda, Tim, Struktur, Presensi, Pengajuan, Lokasi, Laporan, Profil.
- Superadmin keeps current elevated navigation including Settings, but the dedicated settings workspace is still not implemented.
- Scanner nav is Scanner and Profil only; direct URLs to non-scanner workspaces fall back to scanner mode.
- Request approval is step-based: Manager approval advances to HR, does not finalize. HR approval finalizes.
- Employees without `manager_id` go directly to HR approval.
- Old `approval_requests.status` labels remain readable. `workflowStatus` adds step-aware labels on top.
- Scanner tokens belong to Scanner/Kiosk mode only.
- Slip Gaji is lightweight/read-only until a real payslip source exists.
- Payroll-ready CSV/reporting is MVP scope; full payroll processing is not.
- Face recognition, advanced anti-spoofing, and real device fingerprinting are roadmap only.

## Known limitations

- Selfie upload/storage is still not finalized; `selfie_url` may remain nullable.
- Manager data scope is implemented via `manager_id` for current manager endpoints and covered by targeted tests, but real production QA with seeded manager/team data is still recommended.
- Approval UI timeline/step-history panel is not built; only `workflowStatus` label shown per request card.
- Demo `approveRequest` stub returns a generic request title after action — does not preserve the original request title.
- Shift assignment workflow is not complete in post-login UI/API.
- Employee Jadwal depends on limited schedule data; Slip Gaji has no real payslip model yet.
- Some operational routes still use local/demo-store style persistence rather than fully normalized Supabase reads/writes.
- Very narrow mobile screens still need manual QA with production-length names, notes, and dense report data.
- Superadmin boundary is conceptual; no dedicated Superadmin-only settings UI built.
- HR Struktur/Divisi & Penempatan is connected for create/edit/manager assignment/employee reassignment, but deeper HRIS profile management remains out of scope.

## Roadmap only

- Reimbursement/klaim
- Secure file sharing/dokumen
- Advanced notifications
- Full payroll processing
- Full HRIS employee profile management
- Face recognition
- Advanced anti-spoofing
- Real device fingerprinting
- Payroll, notifications, chat/comments, analytics

## Most important docs

- `Documents/TAPTU/HANDOFF_CURRENT.md`
- `Documents/TAPTU/HANDOFF_TAPTU.md`
- `Documents/TAPTU/CHANGELOG_PHASE_8.md`
- `Documents/TAPTU/CHANGELOG_PHASE_7.md`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

## Recommended next step

1. Next safe phase: Phase 9 operational hardening.
2. Start with manual QA using seeded manager/team data, then add approval step timeline panel and reporting hardening.
3. Keep scope focused on stabilization: Supabase persistence gaps, shift assignment, selfie storage, dense mobile QA.
4. Do not build payroll, notifications, chat/comments, analytics, or reimbursement yet.
