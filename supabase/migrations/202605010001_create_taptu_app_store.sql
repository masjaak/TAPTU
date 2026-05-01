create table if not exists public.taptu_app_store (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.taptu_app_store enable row level security;

drop policy if exists "service role can manage app store" on public.taptu_app_store;

create policy "service role can manage app store"
  on public.taptu_app_store
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
