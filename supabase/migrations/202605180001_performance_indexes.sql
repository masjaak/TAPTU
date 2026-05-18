-- ============================================================
-- Performance indexes for hot query paths
-- 2026-05-18
--
-- Already indexed (no action needed):
--   profiles.manager_id           → profiles_manager_id_idx (phase 7.1)
--   profiles.department_id        → profiles_department_id_idx (phase 7.1)
--   departments.organization_id   → departments_organization_id_idx (phase 7.1)
--   approval_steps.request_id     → approval_steps_request_id_idx (phase 7.3)
--   approval_steps.approver_id    → approval_steps_approver_id_idx (phase 7.3)
--   notifications.recipient_id    → notifications_recipient_created_idx (phase 9.1)
--
-- Not a column (skip):
--   attendance_records.organization_id  — org scope reached via employee_id → profiles
--   approval_requests.workflow_status   — computed in app code from approval_steps
--
-- Redundant (skip):
--   attendance_records.employee_id — leading column of the existing UNIQUE
--     constraint index on (employee_id, attendance_date); PostgreSQL uses that
--     composite index for WHERE employee_id = ? queries already.
-- ============================================================

-- profiles.organization_id
-- Used on almost every org-scoped query:
--   .eq("organization_id", orgId)  →  admin overview, employee list,
--   exception count, department list, attendance history org lookup.
create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id);

-- attendance_records.attendance_date DESC
-- Used for the 30-day date range filter added in the query safeguard pass:
--   .gte("attendance_date", thirtyDaysAgo)
-- and for ORDER BY attendance_date DESC on every history / report query.
create index if not exists attendance_records_attendance_date_idx
  on public.attendance_records (attendance_date desc);

-- attendance_records.created_at DESC
-- Used for ORDER BY created_at DESC on attendance history and timeline queries.
create index if not exists attendance_records_created_at_idx
  on public.attendance_records (created_at desc);

-- approval_requests.employee_id
-- Used in .in("employee_id", userIds) across every request lookup
-- (admin overview, manager view, employee self-service).
create index if not exists approval_requests_employee_id_idx
  on public.approval_requests (employee_id);

-- approval_requests.status
-- Used in .eq("status", "Menunggu") for pending-request counts and
-- in the admin overview query that filters by status before scoping to org.
create index if not exists approval_requests_status_idx
  on public.approval_requests (status);
