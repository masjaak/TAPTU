-- ============================================================
-- Taptu relational schema
-- Run via Supabase Dashboard > SQL Editor or supabase db push
-- ============================================================

-- 1. Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- 2. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('superadmin','admin','employee','scanner')),
  organization_id uuid references public.organizations(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 3. Attendance records
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  state text not null check (state in ('idle','checked_in','checked_out')) default 'idle',
  check_in_at timestamptz,
  check_in_method text check (check_in_method in ('QR','GPS','Selfie','Manual')),
  check_out_at timestamptz,
  check_out_method text check (check_out_method in ('QR','GPS','Selfie','Manual')),
  date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table public.attendance enable row level security;

-- 4. Leave/permission requests
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('Izin','Cuti','Sakit')),
  start_date date not null,
  end_date date not null,
  title text not null,
  detail text not null,
  status text not null check (status in ('Menunggu','Disetujui','Ditolak')) default 'Menunggu',
  created_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- 5. Scanner state
create table if not exists public.scanner_state (
  id text primary key default 'default',
  token text not null,
  expires_in_seconds int not null default 30,
  scans_today int not null default 0,
  location_name text not null default 'Gerbang Utama',
  updated_at timestamptz not null default now()
);

alter table public.scanner_state enable row level security;

-- ============================================================
-- Row Level Security policies
-- ============================================================

-- Organizations: members can read their own org
create policy "Users can read own organization"
  on public.organizations for select
  using (
    id in (
      select organization_id from public.profiles
      where profiles.id = auth.uid()
    )
  );

-- Profiles: users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Profiles: admin/superadmin can read all profiles in their org
create policy "Admin can read org profiles"
  on public.profiles for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin','superadmin')
    )
  );

-- Profiles: users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Attendance: employees can read their own attendance
create policy "Users can read own attendance"
  on public.attendance for select
  using (user_id = auth.uid());

-- Attendance: admin/superadmin can read all attendance in their org
create policy "Admin can read org attendance"
  on public.attendance for select
  using (
    user_id in (
      select p2.id from public.profiles p2
      where p2.organization_id in (
        select organization_id from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin','superadmin')
      )
    )
  );

-- Attendance: users can insert their own attendance
create policy "Users can insert own attendance"
  on public.attendance for insert
  with check (user_id = auth.uid());

-- Attendance: users can update their own attendance (for checkout)
create policy "Users can update own attendance"
  on public.attendance for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Requests: employees can read their own requests
create policy "Users can read own requests"
  on public.requests for select
  using (user_id = auth.uid());

-- Requests: admin/superadmin can read all requests in their org
create policy "Admin can read org requests"
  on public.requests for select
  using (
    user_id in (
      select p2.id from public.profiles p2
      where p2.organization_id in (
        select organization_id from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin','superadmin')
      )
    )
  );

-- Requests: employees can create requests
create policy "Users can insert own requests"
  on public.requests for insert
  with check (user_id = auth.uid());

-- Requests: admin/superadmin can update request status (approve/reject)
create policy "Admin can update org requests"
  on public.requests for update
  using (
    user_id in (
      select p2.id from public.profiles p2
      where p2.organization_id in (
        select organization_id from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin','superadmin')
      )
    )
  );

-- Requests: owner can delete own pending request
create policy "Users can delete own pending requests"
  on public.requests for delete
  using (user_id = auth.uid() and status = 'Menunggu');

-- Scanner state: admin/superadmin/scanner can read
create policy "Scanner users can read scanner state"
  on public.scanner_state for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin','superadmin','scanner')
    )
  );

-- Scanner state: admin/superadmin/scanner can update
create policy "Scanner users can update scanner state"
  on public.scanner_state for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin','superadmin','scanner')
    )
  );

-- Service role can do everything (for API server-side operations)
create policy "Service role full access organizations"
  on public.organizations for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access profiles"
  on public.profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access attendance"
  on public.attendance for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access requests"
  on public.requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access scanner"
  on public.scanner_state for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- Seed initial scanner state
-- ============================================================
insert into public.scanner_state (id, token, expires_in_seconds, scans_today, location_name)
values ('default', 'HDR-31A-7XZ', 30, 0, 'Gerbang Utama')
on conflict (id) do nothing;

-- ============================================================
-- Function: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role, organization_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    (new.raw_user_meta_data->>'organization_id')::uuid
  );
  return new;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
