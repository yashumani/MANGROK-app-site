-- Production metering, idempotency, refund safety, and experiment metadata for Mangrok Alchemy.
-- Apply after 001_platform.sql and 002_alchemy.sql.

alter table public.alchemy_experiments
  add column if not exists request_id uuid,
  add column if not exists duration_ms integer,
  add column if not exists entitlement_plan text,
  add column if not exists status text not null default 'completed',
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists alchemy_experiments_owner_request_idx
  on public.alchemy_experiments(owner_id, request_id)
  where request_id is not null;

create index if not exists alchemy_experiments_owner_created_idx
  on public.alchemy_experiments(owner_id, created_at desc);

create table if not exists public.alchemy_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  allowed boolean not null,
  remaining integer not null default 0,
  plan text not null,
  status text not null,
  counter_kind text check (counter_kind in ('trial','period')),
  model text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  completed_at timestamptz,
  refunded_at timestamptz,
  refund_reason text,
  created_at timestamptz not null default now(),
  unique(user_id, request_id)
);

create index if not exists alchemy_usage_events_user_created_idx
  on public.alchemy_usage_events(user_id, created_at desc);

alter table public.alchemy_usage_events enable row level security;

drop policy if exists alchemy_usage_events_select_own on public.alchemy_usage_events;
create policy alchemy_usage_events_select_own
  on public.alchemy_usage_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists alchemy_experiments_update_own on public.alchemy_experiments;
create policy alchemy_experiments_update_own
  on public.alchemy_experiments for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Remove the non-idempotent Alpha RPC installed by 002_alchemy.sql.
drop function if exists public.consume_alchemy_credit();

create or replace function public.get_alchemy_entitlement()
returns table(
  allowed boolean,
  remaining integer,
  plan text,
  status text,
  trial_limit integer,
  trial_used integer,
  period_limit integer,
  period_used integer,
  period_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  entitlement public.alchemy_entitlements%rowtype;
  paid_period_valid boolean;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;

  insert into public.alchemy_entitlements(user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select * into entitlement
  from public.alchemy_entitlements
  where user_id = current_user_id;

  paid_period_valid := entitlement.period_ends_at is null or entitlement.period_ends_at > now();

  if entitlement.status = 'active'
     and entitlement.plan in ('pro','studio','admin')
     and paid_period_valid
     and (entitlement.period_limit is null or entitlement.period_used < entitlement.period_limit) then
    return query select
      true,
      case when entitlement.period_limit is null then -1 else greatest(0, entitlement.period_limit - entitlement.period_used) end,
      entitlement.plan,
      entitlement.status,
      entitlement.trial_limit,
      entitlement.trial_used,
      entitlement.period_limit,
      entitlement.period_used,
      entitlement.period_ends_at;
    return;
  end if;

  if entitlement.status = 'trialing' and entitlement.trial_used < entitlement.trial_limit then
    return query select
      true,
      greatest(0, entitlement.trial_limit - entitlement.trial_used),
      entitlement.plan,
      entitlement.status,
      entitlement.trial_limit,
      entitlement.trial_used,
      entitlement.period_limit,
      entitlement.period_used,
      entitlement.period_ends_at;
    return;
  end if;

  return query select
    false,
    0,
    entitlement.plan,
    entitlement.status,
    entitlement.trial_limit,
    entitlement.trial_used,
    entitlement.period_limit,
    entitlement.period_used,
    entitlement.period_ends_at;
end;
$$;

create or replace function public.consume_alchemy_credit(p_request_id uuid)
returns table(allowed boolean, remaining integer, plan text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  entitlement public.alchemy_entitlements%rowtype;
  existing public.alchemy_usage_events%rowtype;
  result_allowed boolean := false;
  result_remaining integer := 0;
  result_kind text := null;
  paid_period_valid boolean;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if p_request_id is null then raise exception 'request id required'; end if;

  insert into public.alchemy_entitlements(user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select * into entitlement
  from public.alchemy_entitlements
  where user_id = current_user_id
  for update;

  select * into existing
  from public.alchemy_usage_events
  where user_id = current_user_id and request_id = p_request_id;

  -- A completed or still-active request is idempotent. A refunded request is a
  -- retry and must consume a fresh credit before the model is called again.
  if existing.id is not null and existing.refunded_at is null then
    return query select existing.allowed, existing.remaining, existing.plan, existing.status;
    return;
  end if;

  paid_period_valid := entitlement.period_ends_at is null or entitlement.period_ends_at > now();

  if entitlement.status = 'active'
     and entitlement.plan in ('pro','studio','admin')
     and paid_period_valid
     and (entitlement.period_limit is null or entitlement.period_used < entitlement.period_limit) then
    result_allowed := true;
    result_kind := 'period';
    update public.alchemy_entitlements
      set period_used = period_used + 1, updated_at = now()
      where user_id = current_user_id;
    result_remaining := case
      when entitlement.period_limit is null then -1
      else greatest(0, entitlement.period_limit - entitlement.period_used - 1)
    end;
  elsif entitlement.status = 'trialing' and entitlement.trial_used < entitlement.trial_limit then
    result_allowed := true;
    result_kind := 'trial';
    update public.alchemy_entitlements
      set trial_used = trial_used + 1, updated_at = now()
      where user_id = current_user_id;
    result_remaining := greatest(0, entitlement.trial_limit - entitlement.trial_used - 1);
  end if;

  if existing.id is null then
    insert into public.alchemy_usage_events(user_id, request_id, allowed, remaining, plan, status, counter_kind)
    values (current_user_id, p_request_id, result_allowed, result_remaining, entitlement.plan, entitlement.status, result_kind);
  else
    update public.alchemy_usage_events
      set allowed = result_allowed,
          remaining = result_remaining,
          plan = entitlement.plan,
          status = entitlement.status,
          counter_kind = result_kind,
          model = null,
          latency_ms = null,
          completed_at = null,
          refunded_at = null,
          refund_reason = null,
          created_at = now()
      where id = existing.id;
  end if;

  return query select result_allowed, result_remaining, entitlement.plan, entitlement.status;
end;
$$;

-- Refunds and completion markers are intentionally service-role-only. Browser
-- clients can consume their own credit but cannot restore it after a successful run.
create or replace function public.refund_alchemy_credit_for_user(
  p_user_id uuid,
  p_request_id uuid,
  p_reason text default 'model request failed'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  usage public.alchemy_usage_events%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_user_id is null or p_request_id is null then return false; end if;

  perform 1 from public.alchemy_entitlements where user_id = p_user_id for update;

  select * into usage
  from public.alchemy_usage_events
  where user_id = p_user_id and request_id = p_request_id
  for update;

  if usage.id is null or not usage.allowed or usage.refunded_at is not null or usage.completed_at is not null then return false; end if;

  if usage.counter_kind = 'trial' then
    update public.alchemy_entitlements
      set trial_used = greatest(0, trial_used - 1), updated_at = now()
      where user_id = p_user_id;
  elsif usage.counter_kind = 'period' then
    update public.alchemy_entitlements
      set period_used = greatest(0, period_used - 1), updated_at = now()
      where user_id = p_user_id;
  end if;

  update public.alchemy_usage_events
    set refunded_at = now(), refund_reason = left(coalesce(p_reason, 'model request failed'), 500)
    where id = usage.id;
  return true;
end;
$$;

create or replace function public.complete_alchemy_usage_for_user(
  p_user_id uuid,
  p_request_id uuid,
  p_model text,
  p_latency_ms integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  update public.alchemy_usage_events
  set model = left(coalesce(p_model, ''), 180),
      latency_ms = greatest(0, coalesce(p_latency_ms, 0)),
      completed_at = now()
  where user_id = p_user_id and request_id = p_request_id and allowed and refunded_at is null and completed_at is null;
  return found;
end;
$$;

revoke all on function public.get_alchemy_entitlement() from public;
revoke all on function public.consume_alchemy_credit(uuid) from public;
revoke all on function public.refund_alchemy_credit_for_user(uuid, uuid, text) from public;
revoke all on function public.complete_alchemy_usage_for_user(uuid, uuid, text, integer) from public;

grant execute on function public.get_alchemy_entitlement() to authenticated;
grant execute on function public.consume_alchemy_credit(uuid) to authenticated;
grant execute on function public.refund_alchemy_credit_for_user(uuid, uuid, text) to service_role;
grant execute on function public.complete_alchemy_usage_for_user(uuid, uuid, text, integer) to service_role;
