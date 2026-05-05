-- Vintage Shirt Vault schema
-- Run this in the Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ─── Shirts ──────────────────────────────────────────────────────────────────
create table public.shirts (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade,
  brand         text        not null,
  era           text,
  year          integer,
  style         text        not null,  -- band_tee | sports | workwear | souvenir | other
  size          text,
  condition     text        not null,  -- Mint | Excellent | Good | Fair | Poor
  purchase_price  numeric(10,2),
  purchase_date   date,
  current_value   numeric(10,2),
  valuation_notes text,
  notes           text,
  photos          jsonb       default '[]'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Price History ────────────────────────────────────────────────────────────
create table public.price_history (
  id          uuid        default gen_random_uuid() primary key,
  shirt_id    uuid        not null references public.shirts(id) on delete cascade,
  price       numeric(10,2) not null,
  recorded_at timestamptz default now(),
  source      text,
  notes       text
);

create index price_history_shirt_id_idx on public.price_history(shirt_id);
create index price_history_recorded_at_idx on public.price_history(recorded_at desc);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shirts_updated_at
  before update on public.shirts
  for each row execute function public.update_updated_at();

-- ─── Row-level security ───────────────────────────────────────────────────────
alter table public.shirts enable row level security;
alter table public.price_history enable row level security;

-- Users can only see and modify their own shirts
create policy "shirts: owner access"
  on public.shirts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Price history follows the parent shirt's ownership
create policy "price_history: owner access"
  on public.price_history for all
  using  (exists (
    select 1 from public.shirts
    where shirts.id = price_history.shirt_id
      and shirts.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.shirts
    where shirts.id = price_history.shirt_id
      and shirts.user_id = auth.uid()
  ));
