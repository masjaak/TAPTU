# Taptu Current Handoff

Read this file first in future sessions. It is the low-token entrypoint; open `HANDOFF_TAPTU.md` only when deeper context is needed.

## Current status

- MVP documentation is current through Phase 7.5.
- Phase 6 completed employee-facing simplification and polish: simplified check-in/check-out, scanner token clarification, recent history fix, employee Pengajuan/Jadwal/Slip Gaji tabs, and mobile typography/spacing cleanup.
- Phase 7 added organization structure foundation, multi-step approval state machine (API), and manager dashboard UI.
- Phase 7.4 implemented the request approval state machine in API services: employee request creation, optional manager step, HR final step, rejection finalization, timeline retrieval, and backward-compatible status labels.
- Phase 7.5 shipped the manager dashboard UI: role-scoped navigation (home/team/attendance/requests/profile only), Beranda with team stats, Tim Saya roster, Presensi Tim attendance grid, Pengajuan with two-step approval banner, and Profil with identity + permissions panels. Step-aware `workflowStatus` labels now render in all request cards. Demo approval stub corrected to return role-aware transitions. 132 tests passing.

## Fixed decisions

- Manager remains a limited operational approver, not full HR admin.
- Manager nav is strictly: home, team, attendance, requests, profile. Reports, scanner, and locations are not accessible.
- Request approval is step-based: Manager approval advances to HR, does not finalize. HR approval finalizes.
- Employees without `manager_id` go directly to HR approval.
- Old `approval_requests.status` labels remain readable: `Menunggu`, `Disetujui`, `Ditolak`. `workflowStatus` adds step-aware labels on top.
- Scanner tokens belong to Scanner/Kiosk mode only; employee check-in/check-out should not expose token entry.
- Slip Gaji is lightweight/read-only until a real payslip source exists.
- Payroll-ready CSV/reporting is MVP scope; full payroll processing is not.
- Face recognition, advanced anti-spoofing, and real device fingerprinting are roadmap only.

## Known limitations

- Selfie upload/storage is still not finalized; `selfie_url` may remain nullable.
- Manager data scope: team roster and attendance grid are not department-segmented — manager sees org-wide data bounded only by approval step ownership, not by department.
- Approval UI timeline/step-history panel is not built; only the current `workflowStatus` label is shown per request card.
- Demo `approveRequest` stub returns a generic request title after action — does not preserve the original request title.
- Existing legacy single-step requests remain readable but are not backfilled into full step timelines.
- Shift assignment workflow is not complete in post-login UI/API.
- Employee Jadwal depends on limited schedule data; Slip Gaji has no real payslip model yet.
- Some operational routes still use local/demo-store style persistence rather than fully normalized Supabase reads/writes.
- Very narrow mobile screens still need manual QA with production-length names, notes, and dense report data.

## Roadmap only

- Reimbursement/klaim
- Secure file sharing/dokumen
- Advanced notifications
- Full payroll processing
- Full HRIS employee profile management
- Face recognition
- Advanced anti-spoofing
- Real device fingerprinting

## Most important docs

- `Documents/TAPTU/HANDOFF_CURRENT.md`
- `Documents/TAPTU/HANDOFF_TAPTU.md`
- `Documents/TAPTU/CHANGELOG_PHASE_7.md`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`
- `Documents/TAPTU/CHANGELOG_PHASE_5.md`

## Recommended next step

Operational hardening: surface approval step timelines clearly (step history panel), narrow manager data scope to assigned department/team, finish selfie storage, complete shift assignment UX/API, and replace remaining demo-store style routes with Supabase-backed reads/writes.
