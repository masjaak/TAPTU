# Taptu Current Handoff

Read this file first in future coding sessions. Only open `HANDOFF_TAPTU.md` if more detail is needed.

## Current MVP status

- MVP is functionally assembled through Phase 5.5
- Phase 5.1 database verification completed
- Phase 5.2 UI consistency and responsive QA completed
- Phase 5.3 functional QA completed
- Phase 5.4 empty/loading/error states and accessibility polish completed
- Phase 5.5 final documentation, roadmap, and handoff completed

## Fixed product decisions

- Manager is a limited operational approver, not full HR admin
- Advanced anti-spoofing and real device fingerprinting are out of MVP scope
- Face recognition is out of MVP scope
- Full payroll processing is out of MVP scope
- Payroll-ready CSV/reporting output is part of MVP
- Selfie storage/upload is still unfinished and must remain documented as nullable/incomplete
- Department-level manager segmentation is not completed in MVP and should be treated as a future improvement unless the existing model is extended cleanly

## Key completed features

- Role-based app shell for admin, manager, employee, scanner
- Employee attendance desk with validation state, geofence/device checks, and selfie preview flow
- Scanner token workspace with refresh, countdown, and recent scan history surface
- Exception queue, approval requests, team roster, work locations, shift management, reports, audit trail, CSV export
- UI consistency pass and state/accessibility polish across completed MVP screens

## Key known limitations

- Manager data scope is still broad and not segmented by department/team
- Shift assignment workflow is not completed in post-login UI/API
- Some operational routes still use local/demo-store style API paths rather than full Supabase relational persistence
- Selfie upload is preview-only today; server storage path is not finalized
- Advanced fraud detection, face recognition, and payroll processing are not part of MVP

## Most important files/docs

- `Documents/TAPTU/HANDOFF_CURRENT.md`
- `Documents/TAPTU/HANDOFF_TAPTU.md`
- `Documents/TAPTU/CHANGELOG_PHASE_5.md`
- `apps/web/src/pages/AppPage.tsx`
- `apps/web/src/lib/appShellState.ts`
- `apps/api/src/config.ts`

## Recommended next phase

- Phase 6 should prioritize persistence hardening and operational trust:
  finalize Supabase-backed phase 4/5 data flows, complete shift assignment, finish selfie storage, and narrow manager access scope.
