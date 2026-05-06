-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique,
  bio                 text,
  avatar_url          text,
  showcase_shirt_ids  uuid[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly viewable"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── Friendships (follow model: user_id follows friend_id) ────────────────────
create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  friend_id   uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.friendships enable row level security;

create policy "Users see who they follow"
  on public.friendships for select using (auth.uid() = user_id);

create policy "Users can follow others"
  on public.friendships for insert with check (auth.uid() = user_id);

create policy "Users can unfollow"
  on public.friendships for delete using (auth.uid() = user_id);

-- ── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
