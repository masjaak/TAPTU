# Taptu Current Handoff

Read this file first in future sessions. It is the low-token entrypoint; open `HANDOFF_TAPTU.md` only when deeper context is needed.

## Current status

- MVP documentation is current through Phase 6.5.
- Phase 6 completed employee-facing simplification and polish: simplified check-in/check-out, scanner token clarification, recent history fix, employee Pengajuan/Jadwal/Slip Gaji tabs, and mobile typography/spacing cleanup.
- No Phase 6.5 app code, database, or schema changes were made.

## Fixed decisions

- Manager remains a limited operational approver, not full HR admin.
- Scanner tokens belong to Scanner/Kiosk mode only; employee check-in/check-out should not expose token entry.
- Slip Gaji is lightweight/read-only until a real payslip source exists.
- Payroll-ready CSV/reporting is MVP scope; full payroll processing is not.
- Face recognition, advanced anti-spoofing, and real device fingerprinting are roadmap only.

## Known limitations

- Selfie upload/storage is still not finalized; `selfie_url` may remain nullable.
- Manager data scope is still broad and not department/team segmented.
- Shift assignment exists in schema context but is not a complete post-login assignment workflow.
- Some operational routes still use local/demo-store style persistence rather than fully normalized Supabase reads/writes.
- Employee Jadwal depends on limited schedule data, and Slip Gaji has no real payslip model yet.
- Very narrow mobile screens still need manual QA with production-length names, notes, and dense report data.

## Roadmap only

- Reimbursement/klaim
- Secure file sharing/dokumen
- Organization structure
- Advanced notifications
- Full payroll processing
- Full HRIS employee profile management
- Face recognition
- Advanced anti-spoofing
- Real device fingerprinting

## Most important docs

- `Documents/TAPTU/HANDOFF_CURRENT.md`
- `Documents/TAPTU/HANDOFF_TAPTU.md`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`
- `Documents/TAPTU/CHANGELOG_PHASE_5.md`

## Recommended next step

Start the next phase with persistence and trust hardening: finish selfie storage, complete shift assignment UX/API, narrow manager scoping, and replace remaining demo-store style routes where needed.
