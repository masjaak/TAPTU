# Taptu Current Handoff

Read this file first in future sessions. It is the low-token entrypoint; open `HANDOFF_TAPTU.md` only when deeper context is needed.

## Current status

- Documentation is current through **Phase 9 scale-up hardening** (complete).
- Phase 6 completed employee-facing simplification and polish.
- Phase 7 added organization structure, multi-step approval state machine (API), and initial manager dashboard UI.
- Phase 8 completed manager-scoped data wiring, Manager Dashboard UX polish, HR Struktur/Divisi & Penempatan, two-step approval QA, and attendance persistence QA. **169 tests at Phase 8.6.**
- Phase 9 delivered scale-up hardening with no new product features:
  - **Query safety defaults**: `.limit(50/100)` on notifications, history, exceptions; 30-day date filter on history; org-scoped exception count in admin overview.
  - **Report pagination**: `?limit`/`?offset` params, `X-Has-More`/`X-Pagination-Limit`/`X-Pagination-Offset` headers, 500-row server-side cap.
  - **Frontend fetch discipline**: `auditLogsLoaded` boolean flag (replaced length check), `session?.token` added to dashboard effect deps, history filter same-filter guard (`if (filter === historyFilter) return`), `filteredEmployees` useMemo.
  - **DB indexes deployed to live Supabase** (`ajlfwivpllbcmadscmkb`): 6 indexes across `profiles`, `attendance_records`, `approval_requests`, and `attendance_exceptions`.
  - **Test suite hardening**: resolved 17 pre-existing test infrastructure failures (missing jsdom annotations, wrong path resolution), added 18 new tests (history filter refetch × 3, role flow regression QA × 5, landing page × 10 previously broken). **345 tests passing across 25 test files, 0 failures.**

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
- Report pagination headers exist in API; frontend report view does not yet expose paging controls to the user.

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
- `Documents/TAPTU/CHANGELOG_PHASE_9.md`
- `Documents/TAPTU/CHANGELOG_PHASE_8.md`
- `Documents/TAPTU/CHANGELOG_PHASE_7.md`
- `Documents/TAPTU/CHANGELOG_PHASE_6.md`

## Recommended next step

Phase 9 scale-up hardening is complete. Next safe tasks for Phase 10:

1. **Manual QA with seeded data** — run the app against real manager/team data in production Supabase; verify org-scoped queries and index effectiveness.
2. **Approval timeline panel** — add a step-history UI to request cards so users can see when manager approved vs. when HR finalized, using `approval_steps` table data.
3. **Report pagination frontend** — wire `?limit`/`?offset` API params to the report view; the backend is ready, the UI just needs page controls.
4. **Shift assignment workflow** — complete the end-to-end shift assignment flow in post-login UI/API (`shift_assignments` table exists, UI is incomplete).
5. **Selfie storage finalization** — finalize `selfie_url` upload/storage path; currently nullable and preview-only.
6. Do not build payroll, notifications, chat/comments, analytics, or reimbursement yet.
