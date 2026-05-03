# Taptu MVP Handoff

## A. Project summary

Taptu is an Attendance Validation OS for operational teams. The product position is a modern attendance workspace that goes beyond simple clock-in/out by adding validation signals, scanner support, exception review, approvals, and HR-ready reporting inside a clean SaaS-style interface.

The MVP goal is to prove a practical end-to-end attendance workflow for Admin/HR, Manager, Employee, and Scanner/Kiosk roles without overbuilding advanced fraud or payroll systems. Current status: MVP is documented and QA-passed through Phase 5.5, with known limitations still remaining around persistence hardening, manager scoping, shift assignment, and selfie storage finalization.

## B. Fixed product decisions

- Manager remains a limited operational approver, not a full HR admin.
- Advanced anti-spoofing and real device fingerprinting are out of MVP scope.
- Face recognition is out of MVP scope.
- Full payroll processing is out of MVP scope.
- Payroll-ready CSV/reporting output is part of MVP.
- Selfie capture/preview exists, but finalized storage/upload is still unfinished; `selfie_url` may remain nullable for now.
- Department-level manager segmentation is not completed in MVP. Current manager access is broader than ideal and should be treated as a future improvement.

## C. Completed phases summary

- Phase 1.5: UI cleanup, mobile layout fixes, design consistency tightening, old theme trace removal direction established.
- Phase 2: dashboard foundation, employee attendance flow, role-based routing, attendance workspace baseline.
- Phase 3: validation layer, scanner flow, geofence model, exception handling, approvals, basic audit support.
- Phase 4: team list, work location/geofence management, shift management, reports, CSV export, dashboard wiring.
- Phase 5.1: Supabase/database verification and shift schema migration addition.
- Phase 5.2: UI consistency and responsive QA pass.
- Phase 5.3: functional QA and targeted bug fixes.
- Phase 5.4: empty/loading/error states and accessibility polish.
- Phase 5.5: final documentation, roadmap, and handoff refresh.

## D. Routes/pages

Main post-login pages currently surfaced through the app shell:

- Admin dashboard: summary stats, recent activity, quick actions.
- Manager home/team view: lighter operational summary, team roster, exception review, approvals, reports.
- Employee attendance page: check-in/check-out, current validation state, attendance history.
- Scanner mode: token display, countdown, status, refresh, recent scan history.
- Team list: employee roster and validation status.
- Exception review queue: approve, reject, request correction.
- Approval flow: request create/view/cancel and reviewer approve/reject actions.
- Shift management: create/edit shifts, tolerance, optional break windows, linked location.
- Work location/geofence management: create/edit locations with lat/lng/radius.
- Attendance reports: filters, report table, audit trail toggle.
- CSV/export flow: export report rows to CSV when data exists.
- Profile page: present but still lightweight/stub-like compared with core workspaces.
- Settings route exists in navigation definitions for elevated roles, but no dedicated completed workspace is documented in Phase 5.

## E. Roles and access

- Admin/HR:
  full MVP operations surface including dashboard, team, attendance, requests, locations, reports, and profile.
- Manager:
  limited operational approver. Can access home, team, attendance, requests, reports, and profile. Not treated as full HR admin.
- Employee:
  attendance, requests, and profile only.
- Scanner/Kiosk:
  scanner workspace and profile only.

Manager scoping behavior:

- Current limitation: manager visibility is still too broad and behaves closer to org-wide operational access than true department/team segmentation.
- Department-level manager segmentation should be implemented later if the data model is extended cleanly.

Known role/access limitation:

- `settings` appears in role navigation definitions for superadmin/admin, but the handoff should treat it as non-core/not fully built unless explicitly completed later.

## F. Database/schema overview

Verified MVP tables from Phase 5.1:

- `work_locations`: geofence validation points and radius settings.
- `scanner_tokens`: short-lived scanner/kiosk tokens.
- `attendance_records`: attendance facts plus validation metadata.
- `attendance_exceptions`: review queue for suspicious or incomplete attendance.
- `approval_requests`: leave/permission/correction style requests.
- `audit_logs`: operational decision history.
- `shifts`: org-scoped work shifts with start/end time and late threshold.
- `shift_assignments`: per-employee, per-date assignment table added in Phase 5.1.

Model/status notes:

- `attendance_records.shift_id` remains `text` for backward compatibility.
- New assignment flow uses `shifts` UUID-backed records.
- `users` / `employees` / `roles` are present at the application/session level, but standalone table verification was not the focus of Phase 5.1 and should be revalidated before deep auth or org-model work.
- `teams` is not confirmed here as a completed dedicated MVP table. Team behavior is surfaced in UI, but department/team segmentation should be treated as incomplete.

Supabase migration status:

- Phase 5.1 verified required attendance tables.
- Added migration: `supabase/migrations/202605030001_shifts_schema.sql`.
- Some Phase 4/5 operational routes are still not fully backed by Supabase relational reads/writes and may still use local/demo-store style API paths.

## G. Attendance validation model

`attendance_records` currently documents or verifies these MVP validation fields:

- `validation_status`
- `validation_reasons`
- `location_lat`
- `location_lng`
- `selfie_url` (nullable / unfinished storage path)
- `device_id` (nullable; practical device identifier, not advanced fingerprinting)
- `scanner_token_id` (optional)
- `check_in_time`
- `check_out_time`
- `status`

Behavior:

- Exception records are created when attendance cannot be treated as fully trusted, such as missing selfie, invalid/expired scanner token, radius mismatch, or related validation concerns.
- Exceptions are reviewed in the operational queue and can be approved, rejected, or sent for correction.
- Advanced device signature/fingerprint validation is not part of MVP and should not be implied by current `device_id` support.

## H. Core workflows

- Employee check-in/check-out:
  employee uses attendance desk, can provide scanner token/selfie/location, receives validation state and feedback.
- Location/geofence validation:
  location signals are captured and compared against configured work location/radius logic; outside-radius style cases can persist then enter exception review.
- Scanner token flow:
  scanner token is displayed, refreshed, counted down, and used for scanner-mode attendance validation.
- Scanner recent-scan history:
  recent success/invalid/expired attempts are surfaced in the scanner workspace.
- Exception review:
  admin/manager can approve, reject, or request correction with notes.
- Approval requests:
  employee submits request, reviewer approves/rejects, employee can cancel pending items.
- Shift assignment:
  data model exists via `shift_assignments`, but complete post-login assignment workflow is not yet finished.
- Work location/geofence management:
  admin can create/edit lat/lng/radius work locations.
- Reports:
  admin/manager can filter attendance data, inspect validation flags, and open audit trail.
- Payroll-ready CSV export:
  report rows can be exported for downstream payroll preparation, but full payroll processing is intentionally out of scope.

## I. UI/UX system status

- Visual style:
  aligned to landing/login direction with white and soft gray surfaces, strong blue accent, dark text, rounded cards, soft borders, and restrained shadows.
- AppShell/navigation:
  desktop sidebar, mobile header, and mobile drawer are implemented and role-aware.
- Responsive QA:
  Phase 5.2 completed; known overflow issues were addressed.
- Empty/loading/error states:
  Phase 5.4 completed with clearer role-aware empty copy and actionable error states.
- Accessibility polish:
  Phase 5.4 added improved live regions, dialog semantics, form errors, labels, and better status readability.
- Old green theme traces:
  removed from the checked MVP surfaces; success/info states now use Taptu blue language instead of legacy green traces.

## J. How to run

From repo root:

- Install: `npm install`
- Full dev: `npm run dev`
- Web only: `npm run dev:web`
- API only: `npm run dev:api`
- Build web: `npm run build:web`
- Build all: `npm run build:all`
- Typecheck: `npm run typecheck`

Important env/config notes:

- Web can use `VITE_API_BASE_URL` for API routing.
- Web can optionally use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; if absent, frontend falls back to the Express API path.
- API supports `TAPTU_STORAGE_MODE` with `local-demo` default and `supabase` optional mode.
- When `TAPTU_STORAGE_MODE=supabase`, API requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Optional API Supabase store config: `SUPABASE_STORE_TABLE`, `SUPABASE_STORE_KEY`.
- API also uses `PORT` and `JWT_SECRET` for local runtime.

## K. How to test core flows

Concise manual checklist:

- Login and confirm role lands on the correct default route.
- Verify role navigation for admin, manager, employee, scanner.
- Employee check-in/check-out with visible validation feedback.
- Scanner mode token refresh, countdown, and recent scan state.
- Geofence validation surface and location re-check flow.
- Exception queue approve/reject/request correction actions.
- Approval request create/detail/cancel and reviewer actions.
- Team list rendering and search/filter behavior.
- Work location create/edit.
- Shift create/edit.
- Reports filter application and audit trail visibility.
- CSV export enabled only when report data exists.

## L. Known limitations

- Selfie storage/upload is not finalized; current flow is preview/input oriented and `selfie_url` remains nullable.
- Advanced anti-spoofing is out of MVP scope.
- Real device fingerprinting is out of MVP scope.
- Face recognition is out of MVP scope.
- Full payroll processing is out of MVP scope.
- Department-level manager segmentation is not completed.
- Manager team scoping is still broader than intended.
- Shift assignment workflow is not completed in post-login UI/API.
- Some phase 4/5 operational endpoints still rely on local/demo-store style paths rather than fully normalized Supabase relational persistence.
- Profile workspace is lightweight and not a full account/settings system.

## M. Future roadmap

- Attendance confidence score
  what: combine validation signals into one review-friendly confidence layer.
  why: helps ops prioritize suspicious attendance faster.
  suggested phase: Phase 6 or 7.

- Advanced device fingerprint validation
  what: replace simple `device_id` with stronger device trust logic.
  why: reduces repeat spoofing and device sharing abuse.
  suggested phase: Phase 7.

- Advanced anti-spoof checks
  what: stronger GPS/time/device anomaly detection.
  why: raises trust in attendance records.
  suggested phase: Phase 7.

- Face recognition
  what: optional identity confirmation on attendance capture.
  why: stronger identity assurance for higher-risk environments.
  suggested phase: later, only if privacy/compliance are addressed.

- Finalized selfie storage/upload service
  what: persist selfie evidence to storage with retrievable URLs and retention policy.
  why: completes the current proof flow and auditability.
  suggested phase: Phase 6.

- Offline mode with later sync
  what: queue attendance actions locally when connection is unstable.
  why: important for field operations and weak-network environments.
  suggested phase: Phase 6 or 7.

- Multi-location attendance map
  what: map-based view of work locations and attendance context.
  why: better operational visibility for multi-site organizations.
  suggested phase: Phase 7.

- Payroll bridge/export templates
  what: richer CSV templates and payroll-system-ready mappings.
  why: improves handoff from attendance to payroll ops without building payroll itself.
  suggested phase: Phase 6.

- Full payroll processing integration
  what: direct payroll calculations and integrations.
  why: removes downstream manual steps.
  suggested phase: post-MVP expansion, not near-term.

- Anti-fraud timeline
  what: chronological fraud-risk narrative per employee/record.
  why: improves investigation and manager review context.
  suggested phase: Phase 7.

- Advanced audit log
  what: richer actor/object/change metadata and filtering.
  why: improves compliance and operational traceability.
  suggested phase: Phase 6 or 7.

- WhatsApp/Slack reminders
  what: attendance reminders, pending review nudges, exception alerts.
  why: improves adoption and response speed.
  suggested phase: Phase 6.

- Multi-company workspace
  what: support multiple orgs/tenants with stronger separation.
  why: needed for scale beyond single-company deployments.
  suggested phase: post-MVP platform expansion.

- Mobile app version
  what: dedicated mobile experience beyond web/PWA shell.
  why: better camera, location, kiosk, and offline ergonomics.
  suggested phase: after core persistence and trust flows are stable.

- Advanced analytics for lateness, absence, and shift performance
  what: trend reporting and operational KPIs.
  why: moves product from record-keeping to workforce insight.
  suggested phase: Phase 7.

- Department-level manager segmentation
  what: manager visibility and action scope narrowed to assigned department/team.
  why: fixes one of the clearest current MVP access limitations.
  suggested phase: Phase 6.

## N. Recommended next step after MVP

Recommended next step: Phase 6 should focus on operational hardening, not new surface area.

Priority order:

1. Finish Supabase-backed persistence for phase 4/5 data flows.
2. Implement shift assignment workflow end to end.
3. Finalize selfie storage/upload and retention behavior.
4. Add department/team-scoped manager access.

This sequence closes the largest trust and handoff gaps while preserving the current MVP product shape.
