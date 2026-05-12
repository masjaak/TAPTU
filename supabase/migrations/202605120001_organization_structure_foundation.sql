-- ============================================================
-- Taptu Phase 7.1: organization structure foundation
-- Adds departments and optional employee reporting metadata.
-- Existing profiles remain valid because all new fields are nullable.
-- ============================================================

-- 1. Departments
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  manager_id uuid references public.profiles(id) on delete set null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.departments enable row level security;

create index if not exists departments_organization_id_idx
  on public.departments (organization_id);

create index if not exists departments_manager_id_idx
  on public.departments (manager_id);

-- 2. Profile organization metadata
alter table public.profiles
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists manager_id uuid references public.profiles(id) on delete set null,
  add column if not exists position text,
  add column if not exists employee_code text;

create index if not exists profiles_department_id_idx
  on public.profiles (department_id);

create index if not exists profiles_manager_id_idx
  on public.profiles (manager_id);

create policy "Service role full access departments"
  on public.departments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Admin can read org departments"
  on public.departments for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin','superadmin','manager')
    )
  );

create policy "Employee can read own department"
  on public.departments for select
  using (
    id in (
      select department_id from public.profiles
      where profiles.id = auth.uid()
    )
  );
