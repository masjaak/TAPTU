-- ============================================================
-- Taptu Phase 5.1: shifts and shift_assignments tables
-- attendance_records.shift_id remains text for backward compat
-- ============================================================

-- 1. Shifts
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  late_threshold_minutes int not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shifts enable row level security;

create policy "Service role full access shifts"
  on public.shifts for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Admin can read org shifts"
  on public.shifts for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin','superadmin','manager')
    )
  );

-- 2. Shift assignments
create table if not exists public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  effective_date date not null,
  created_at timestamptz not null default now(),
  unique(employee_id, effective_date)
);

alter table public.shift_assignments enable row level security;

create policy "Service role full access shift assignments"
  on public.shift_assignments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Admin can read org shift assignments"
  on public.shift_assignments for select
  using (
    employee_id in (
      select p2.id from public.profiles p2
      where p2.organization_id in (
        select organization_id from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin','superadmin','manager')
      )
    )
  );

create policy "Employee can read own shift assignments"
  on public.shift_assignments for select
  using (employee_id = auth.uid());
