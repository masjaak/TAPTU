# Taptu — Role Flow & Access Boundaries

---

## Roles

| Role | Created by | Purpose |
|------|-----------|---------|
| **Superadmin** | Public registration | Workspace owner, org-level setup |
| **Admin HR** | Superadmin / Admin HR from dashboard | Employee data, HR reports, final approval |
| **Manager** | Superadmin / Admin HR from dashboard | Team attendance review, first-stage approval |
| **Employee (Karyawan)** | Superadmin / Admin HR from dashboard | Daily check-in/check-out, requests |
| **Scanner / Kiosk** | Superadmin / Admin HR from dashboard | QR token display, kiosk mode |

> **Public registration creates Superadmin only.** All other accounts are created from inside the authenticated dashboard.

---

## Access Matrix

| Feature | Superadmin | Admin HR | Manager | Employee | Scanner |
|---------|:---------:|:--------:|:-------:|:--------:|:-------:|
| Workspace settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create/manage accounts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Departments & structure | ✅ | ✅ | 👁 read | ❌ | ❌ |
| Work locations | ✅ | ✅ | 👁 read | ❌ | ❌ |
| Shifts | ✅ | ✅ | 👁 read | 👁 own | ❌ |
| Org-wide attendance | ✅ | ✅ | ❌ | ❌ | ❌ |
| Team attendance (own team) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Own attendance | ✅ | ✅ | ✅ | ✅ | ❌ |
| Exceptions (org-wide) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Exceptions (own team) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Approval requests (all) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approval requests (own team) | ❌ | ❌ | ✅ step 1 | ❌ | ❌ |
| Own requests | ✅ | ✅ | ✅ | ✅ | ❌ |
| HR report + CSV export | ✅ | ✅ | ❌ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ❌ |
| Audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Scanner mode / QR display | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## What Each Role Cannot See

**Superadmin**
- No explicit restriction within their own workspace
- Cannot access other workspaces (organization-scoped)

**Admin HR**
- Cannot access Superadmin-only settings (if any are restricted to workspace owner)

**Manager**
- Cannot see employees outside their assigned team (`profiles.manager_id ≠ manager.id`)
- Cannot see organization-wide HR reports or payroll export
- Cannot finalize approval (step 2 belongs to Admin HR)
- Cannot see other managers' teams

**Employee**
- Cannot see other employees' records
- Cannot see team management or HR views
- Cannot approve or reject requests

**Scanner**
- Cannot see any employee or HR data
- Limited to scanner workspace: QR display + own profile only

---

## Approval Responsibility

```
Employee submits request (Izin / Cuti / Sakit / Koreksi Absensi / Lupa Check-in/out)
  │
  ▼
Step 1 — Manager review
  ├─ Approved by Manager → request forwarded to HR (still "Menunggu HR")
  └─ Rejected by Manager → request closed as "Ditolak"
  │
  ▼
Step 2 — Admin HR final decision
  ├─ Approved by HR → final status "Disetujui"
  └─ Rejected by HR → final status "Ditolak"
```

**Key rule:** Manager approval at step 1 does **not** mean the request is approved. It advances the request to Admin HR for final decision. `approval_steps.step_order` tracks position in the chain.

**Exception review** (attendance_exceptions) follows a simpler path:
```
Exception created (needs_review)
  └─ Manager or Admin HR reviews
       ├─ Approved → exception closed, attendance record updated
       ├─ Rejected → exception closed as rejected
       └─ Request Correction → employee may be asked to re-submit
```

---

## Dashboard Navigation Per Role

| Role | App sections |
|------|-------------|
| Superadmin | Home, Team, Structure, Attendance, Requests, Notifications, Locations, Reports, Settings, Profile |
| Admin HR | Home, Team, Structure, Attendance, Requests, Notifications, Locations, Reports, Profile |
| Manager | Home, Team, Attendance, Requests, Exceptions, Profile |
| Employee | Home, Attendance, History, Requests, Notifications, Schedule, Profile |
| Scanner | Scanner, Profile |

> **Payslip** section is Employee-facing. Taptu provides Payroll Input Readiness data only — not full payroll calculation.
