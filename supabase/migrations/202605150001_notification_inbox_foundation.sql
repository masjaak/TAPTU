-- Phase 9.1: lightweight in-app notification inbox
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create policy "Users can read own notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "Users can mark own notifications read"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "Service role full access notifications"
  on public.notifications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
