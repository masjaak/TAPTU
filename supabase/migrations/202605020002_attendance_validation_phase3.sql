-- ============================================================
-- Taptu Phase 3: attendance validation, scanner, exceptions
-- ============================================================

-- 0. Expand manager role support
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('superadmin','admin','manager','employee','scanner'));

-- 1. Work locations
create table if not exists public.work_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 150,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_locations enable row level security;

-- 2. New scanner tokens table
create table if not exists public.scanner_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  work_location_id uuid references public.work_locations(id) on delete set null,
  status text not null check (status in ('active','expired','invalidated')) default 'active',
  expires_at timestamptz not null,
  scans_today int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scanner_tokens enable row level security;

-- 3. New attendance records table
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  shift_id text not null default 'shift-pagi',
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text not null check (status in ('Belum check-in','Tepat waktu','Terlambat','Selesai')) default 'Belum check-in',
  state text not null check (state in ('idle','checked_in','checked_out')) default 'idle',
  location_id uuid references public.work_locations(id) on delete set null,
  location_lat double precision,
  location_lng double precision,
  validation_status text not null check (validation_status in ('verified','needs_review','blocked','rejected','corrected')) default 'verified',
  validation_reasons text[] not null default '{}',
  selfie_url text,
  device_id text,
  scanner_token_id uuid references public.scanner_tokens(id) on delete set null,
  attendance_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, attendance_date)
);

alter table public.attendance_records enable row level security;

-- 4. Attendance exceptions
create table if not exists public.attendance_exceptions (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  exception_type text not null check (
    exception_type in (
      'Outside radius',
      'Late check-in',
      'Missing checkout',
      'Invalid QR',
      'Expired QR',
      'Different device',
      'Missing selfie',
      'Selfie issue'
    )
  ),
  reason text not null,
  status text not null check (status in ('Need Review','Approved','Rejected','Request Correction')) default 'Need Review',
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.attendance_exceptions enable row level security;

-- 5. Approval requests
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (
    request_type in ('Izin','Cuti','Sakit','Permission','Attendance Correction','Forgot Check-in/out')
  ),
  start_date date not null,
  end_date date not null,
  title text not null,
  reason text not null,
  status text not null check (status in ('Menunggu','Disetujui','Ditolak')) default 'Menunggu',
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.approval_requests enable row level security;

-- 6. Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null,
  action text not null,
  target_id text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- 7. Seed HQ location and scanner token if absent
insert into public.work_locations (organization_id, name, latitude, longitude, radius_meters)
select id, 'Kantor Pusat', -6.2088, 106.8456, 150
from public.organizations
where not exists (
  select 1 from public.work_locations where work_locations.organization_id = organizations.id and work_locations.name = 'Kantor Pusat'
);

insert into public.scanner_tokens (token, work_location_id, status, expires_at, scans_today)
select
  'HDR-31A-7XZ',
  wl.id,
  'active',
  now() + interval '30 seconds',
  0
from public.work_locations wl
where not exists (select 1 from public.scanner_tokens);

-- 8. Migrate current attendance rows if present
insert into public.attendance_records (
  employee_id,
  shift_id,
  check_in_time,
  check_out_time,
  status,
  state,
  attendance_date,
  created_at,
  updated_at
)
select
  a.user_id,
  'shift-pagi',
  a.check_in_at,
  a.check_out_at,
  case
    when a.state = 'checked_out' then 'Selesai'
    when a.state = 'checked_in' then 'Tepat waktu'
    else 'Belum check-in'
  end,
  a.state,
  a.date,
  a.created_at,
  a.created_at
from public.attendance a
on conflict (employee_id, attendance_date) do nothing;

-- 9. Migrate current requests into approval requests if present
insert into public.approval_requests (
  employee_id,
  request_type,
  start_date,
  end_date,
  title,
  reason,
  status,
  created_at
)
select
  r.user_id,
  r.category,
  r.start_date,
  r.end_date,
  r.title,
  r.detail,
  r.status,
  r.created_at
from public.requests r
on conflict do nothing;

-- 10. Policies
create policy "Service role full access work locations"
  on public.work_locations for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access scanner tokens"
  on public.scanner_tokens for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access attendance records"
  on public.attendance_records for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access attendance exceptions"
  on public.attendance_exceptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access approval requests"
  on public.approval_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access audit logs"
  on public.audit_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
