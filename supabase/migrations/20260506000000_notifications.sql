create table if not exists public.notifications (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  type         text        not null,
  from_user_id uuid        references auth.users(id) on delete set null,
  message      text        not null,
  read         boolean     not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);
