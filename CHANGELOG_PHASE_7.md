# Taptu Phase 7 Changelog

## Phase 7.1 - Organization Structure Foundation

- Added `departments` schema foundation.
- Added nullable profile organization metadata: `department_id`, `manager_id`, `position`, and `employee_code`.
- Added service-role and read policies for department access.
- Kept existing profiles backward compatible because all new profile fields are nullable.

## Phase 7.3 - Multi-Step Approval Foundation

- Added `approval_steps` table for scalable approval routing.
- Added step fields: `request_id`, `step_order`, `approver_role`, nullable `approver_id`, `status`, `note`, `reviewed_at`, `created_at`, and `updated_at`.
- Added `approval_requests.current_step`, `final_status`, and `completed_at`.
- Preserved old `approval_requests` columns: `status`, `reviewed_by`, `reviewed_at`, and `admin_note`.
- Added indexes for `approval_steps.request_id`, `approval_steps.approver_id`, and `approval_steps.status`.

## Phase 7.4 - Request Approval State Machine

- Added step-aware request services:
  - `createEmployeeRequest`
  - `getEmployeeRequests`
  - `getAdminApprovalRequests`
  - `getManagerApprovalRequests`
  - `approveRequestStep`
  - `rejectRequestStep`
  - `getRequestApprovalTimeline`
- Request creation now creates a manager approval step only when the employee has `manager_id`.
- Requests without a manager go directly to HR approval.
- Manager approval advances the request to HR and does not finalize it.
- HR approval finalizes the request as approved.
- Any manager or HR rejection finalizes the request as rejected.
- Added workflow statuses and UI labels:
  - `pending_manager` -> `Menunggu Manager`
  - `approved_by_manager` -> `Disetujui Manager`
  - `pending_hr` -> `Menunggu HR`
  - `approved` -> `Disetujui`
  - `rejected` -> `Ditolak`
  - `cancelled` -> `Dibatalkan`
- Kept old single-step request labels backward compatible.

## Phase 7.5 - Manager Dashboard UI and Approval UX

### Manager navigation boundary

- Manager nav locked to: `home`, `team`, `attendance`, `requests`, `profile`.
- `reports`, `scanner`, and `locations` are not in manager navigation — `roleNavigation["manager"]` and `toAppSection` guard access.

### Manager dashboard pages

- **Beranda**: team stat cards (Hadir, Terlambat, Belum hadir, Menunggu approval), recent team activity table, quick action panel (Review pengajuan, Tim saya).
- **Tim Saya**: employee roster with "Tim saya" eyebrow (not "Daftar karyawan"), scoped to manager's team.
- **Presensi Tim**: attendance status grid with per-member check-in/shift/validation columns.
- **Pengajuan**: two-step approval banner always visible to manager. Requests loaded from `getDashboard.requests` on initial mount, not from `fetchRequests` (Refresh button only).
- **Profil**: identity panel (nama, email, organisasi, role) + permissions panel (Review pengajuan, Keputusan final, Laporan global) — not a generic empty state.

### Step-aware status labels in request cards

- `workflowStatus` field now resolved to Indonesian label: `pending_manager` → Menunggu Manager, `approved_by_manager` → Disetujui Manager, `pending_hr` → Menunggu HR, `approved` → Disetujui, `rejected` → Ditolak, `cancelled` → Dibatalkan.
- Resolution order: `item.statusLabel` → `getWorkflowStatusLabel(item.workflowStatus)` → `item.status` (legacy fallback).
- Status badge tone now uses `workflowStatus` for correct color (danger for rejected, success for approved, warning otherwise).

### Manager approval action message

- When manager clicks Setujui, action message reads: "Pengajuan diteruskan ke HR untuk keputusan final." — not "Pengajuan disetujui."
- HR/admin Setujui still reads: "Pengajuan disetujui."

### Demo-mode approval stub

- `approveRequest` demo branch now reads role from token (`token.split(":")[1]`).
- Manager approve → `workflowStatus: "pending_hr"`, `statusLabel: "Menunggu HR"`, `status: "Menunggu"`.
- Admin/HR approve → `workflowStatus: "approved"`, `statusLabel: "Disetujui"`, `status: "Disetujui"`.
- Any reject → `workflowStatus: "rejected"`, `statusLabel: "Ditolak"`, `status: "Ditolak"`, `adminNote` preserved.

### Rejection note visibility

- `item.adminNote` rendered as "Catatan reviewer: …" on the request card with no role guard — visible to employee, manager, and admin.

### Verification

- 132 tests passing across 9 test files (`npm run test` from `apps/web`).
- 4 new unit tests in `api.test.ts` covering all demo approval transitions (manager approve, admin approve, manager reject, admin reject).
- 3 new integration tests in `appPage.test.tsx` covering workflowStatus label rendering, manager action message, and employee rejection note visibility.

### Limitations carried forward

- Demo `approveRequest` stub returns a generic `title: "Demo request"` — does not preserve the original request title after approval.
- Approval UI timeline/step-by-step history panel is still not built; only the current status label is shown.
- Historical single-step requests are not backfilled into full step timelines.
- Manager data scope (team roster, attendance, requests) is still not strictly department-segmented — manager sees org-wide data filtered only by approval step ownership, not department.
