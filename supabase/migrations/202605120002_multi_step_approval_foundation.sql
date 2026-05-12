-- ============================================================
-- Taptu Phase 7.3: multi-step approval foundation
-- Adds request approval steps while preserving existing single-step columns.
-- State model for approval_steps.status:
-- pending -> approved | rejected | skipped | cancelled
-- No transition automation is introduced in this phase.
-- ============================================================

-- 1. Backward-compatible request progress fields
alter table public.approval_requests
  add column if not exists current_step integer default 1 check (current_step is null or current_step > 0),
  add column if not exists final_status text check (final_status is null or final_status in ('pending','approved','rejected','cancelled')),
  add column if not exists completed_at timestamptz;

-- 2. Approval steps
create table if not exists public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  approver_role text not null,
  approver_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','skipped','cancelled')),
  note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, step_order)
);

alter table public.approval_steps enable row level security;

create index if not exists approval_steps_request_id_idx
  on public.approval_steps (request_id);

create index if not exists approval_steps_approver_id_idx
  on public.approval_steps (approver_id);

create index if not exists approval_steps_status_idx
  on public.approval_steps (status);

-- 3. Service-role access for API-managed approval orchestration
create policy "Service role full access approval steps"
  on public.approval_steps for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
