# Taptu Current Handoff

Read this file first in future sessions. It is the low-token entrypoint; open `HANDOFF_TAPTU.md` only when deeper context is needed.

## Current status

- Documentation is current through Phase 8.3.
- Phase 6 completed employee-facing simplification and polish.
- Phase 7 added organization structure, multi-step approval state machine (API), and initial manager dashboard UI.
- Phase 7.4 implemented request approval state machine: employee creation, optional manager step, HR final step, rejection finalization, backward-compatible status labels.
- Phase 7.5 shipped initial manager dashboard: role-scoped nav, Beranda with team stats, Tim Saya, Presensi Tim, Pengajuan with two-step banner, Profil. 132 tests passing.
- Phase 8.1 wired manager-scoped data: `fetchManagerOverview`, `fetchManagerEmployeeList`, `fetchManagerExceptionQueue`, `fetchManagerRequests`. No org-wide fallback. `workflowStatus`/`statusLabel` preserved.
- Phase 8.3 completed Manager Dashboard UX polish: nav updated to Beranda/Tim Saya/Presensi Tim/Pengajuan/Pengecualian/Profil, new Pengecualian page, manager-specific request queue, rebuilt home with team status panels, refined team and attendance views, manager permission summary in Profil. 141 tests passing.
- Phase 8.4 added HR Divisi & Penempatan UI: division overview table in HR Tim workspace derived from existing `employeeList` data. Shows division name, manager, member count, status. "Lihat anggota" filters the employee table. Edit/Atur manager disabled with backend TODO notice. Manager role does not see this section. **162 tests passing.**

## Fixed decisions

- Manager remains a limited operational approver, not full HR admin.
- Manager nav is: Beranda, Tim Saya, Presensi Tim, Pengajuan, Pengecualian, Profil. Laporan, Lokasi global, Scanner, and settings are not accessible.
- Request approval is step-based: Manager approval advances to HR, does not finalize. HR approval finalizes.
- Employees without `manager_id` go directly to HR approval.
- Old `approval_requests.status` labels remain readable. `workflowStatus` adds step-aware labels on top.
- Scanner tokens belong to Scanner/Kiosk mode only.
- Slip Gaji is lightweight/read-only until a real payslip source exists.
- Payroll-ready CSV/reporting is MVP scope; full payroll processing is not.
- Face recognition, advanced anti-spoofing, and real device fingerprinting are roadmap only.

## Known limitations

- Selfie upload/storage is still not finalized; `selfie_url` may remain nullable.
- Manager data scope: team roster is scoped via `manager_id`, but real production QA with seeded manager/team data not yet done.
- Approval UI timeline/step-history panel is not built; only `workflowStatus` label shown per request card.
- Demo `approveRequest` stub returns a generic request title after action — does not preserve the original request title.
- Shift assignment workflow is not complete in post-login UI/API.
- Employee Jadwal depends on limited schedule data; Slip Gaji has no real payslip model yet.
- Some operational routes still use local/demo-store style persistence rather than fully normalized Supabase reads/writes.
- Very narrow mobile screens still need manual QA with production-length names, notes, and dense report data.
- Superadmin boundary is conceptual; no dedicated Superadmin-only settings UI built.

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

1. Manual QA Phase 8 manager scenarios with seeded manager/team data (check home, Tim Saya, Presensi Tim, Pengajuan, Pengecualian, Profil).
2. If Phase 8 passes QA → Phase 9: approval step timeline panel + reporting hardening.
3. Do not build payroll, notifications, chat/comments, analytics, or reimbursement yet.
