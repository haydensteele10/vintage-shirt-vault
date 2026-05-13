-- Security hardening migration
-- Run in Supabase SQL Editor

-- ─── activity_feed table ─────────────────────────────────────────────────────

create table if not exists public.activity_feed (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null check (type in ('shirt_added', 'shirt_updated', 'shirt_showcased')),
  shirt_id   uuid        references public.shirts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists activity_feed_user_id_idx
  on public.activity_feed (user_id, created_at desc);
create index if not exists activity_feed_shirt_id_idx
  on public.activity_feed (shirt_id);

alter table public.activity_feed enable row level security;

-- Users can only insert their own activity
create policy "activity_feed: insert own"
  on public.activity_feed for insert
  with check (auth.uid() = user_id);

-- Users can read their own activity and activity from users they follow
create policy "activity_feed: read own and followed"
  on public.activity_feed for select
  using (
    auth.uid() = user_id
    or user_id in (
      select friend_id from public.friendships where user_id = auth.uid()
    )
  );

-- ─── Fix notifications INSERT policy ─────────────────────────────────────────
-- The original policy allowed any authenticated user to insert a notification
-- for any recipient with any from_user_id (enabling impersonation).
-- Replace with a policy that requires the sender to be the authenticated user.

drop policy if exists "Authenticated users can insert notifications" on public.notifications;

create policy "Users can insert notifications as themselves"
  on public.notifications for insert
  with check (auth.uid() = from_user_id);

-- ─── api_usage table (edge function rate limiting) ───────────────────────────

create table if not exists public.api_usage (
  id             uuid    primary key default gen_random_uuid(),
  user_id        uuid    not null references auth.users(id) on delete cascade,
  function_name  text    not null,
  usage_date     date    not null default current_date,
  call_count     integer not null default 0,
  unique(user_id, function_name, usage_date)
);

create index if not exists api_usage_lookup_idx
  on public.api_usage (user_id, function_name, usage_date);

alter table public.api_usage enable row level security;

-- Users can read their own usage (useful for showing quota in the UI later)
create policy "api_usage: users read own"
  on public.api_usage for select
  using (auth.uid() = user_id);

-- Direct client writes are not needed; the security-definer function below
-- handles all inserts/updates, bypassing RLS.

-- ─── Atomic rate-limit check + increment ─────────────────────────────────────
-- Returns TRUE  if the call is allowed (count was below limit and was incremented).
-- Returns FALSE if the user has already reached their daily limit (no increment).
-- Uses FOR UPDATE to serialise concurrent requests for the same user/function/date.

create or replace function public.check_and_increment_api_usage(
  p_user_id     uuid,
  p_function    text,
  p_date        date,
  p_limit       integer
) returns boolean
language plpgsql security definer as $$
declare
  v_count integer := 0;
begin
  -- Ensure the row exists
  insert into public.api_usage (user_id, function_name, usage_date, call_count)
  values (p_user_id, p_function, p_date, 0)
  on conflict (user_id, function_name, usage_date) do nothing;

  -- Lock the row to serialise concurrent increments
  select call_count into v_count
  from public.api_usage
  where user_id = p_user_id
    and function_name = p_function
    and usage_date = p_date
  for update;

  if v_count >= p_limit then
    return false;
  end if;

  update public.api_usage
     set call_count = call_count + 1
   where user_id = p_user_id
     and function_name = p_function
     and usage_date = p_date;

  return true;
end;
$$;
