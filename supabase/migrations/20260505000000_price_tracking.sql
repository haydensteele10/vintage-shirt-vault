-- Price tracking: new columns + pg_cron daily price refresh

-- ─── New columns on shirts ────────────────────────────────────────────────────
alter table public.shirts
  add column if not exists tour_or_event    text,
  add column if not exists graphic_keywords text,
  add column if not exists sport            text,
  add column if not exists location         text,
  add column if not exists price_last_checked timestamptz;

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- ─── Daily price refresh cron job ────────────────────────────────────────────
-- Runs at 03:00 UTC every day.
-- The update-prices Edge Function reads all shirts, fetches eBay comps,
-- and updates current_value if the price moved by more than 5%.
-- CRON_SECRET must match the CRON_SECRET Supabase secret set on the function.
select cron.schedule(
  'daily-price-refresh',
  '0 3 * * *',
  $$
    select extensions.http_post(
      url     := 'https://ctpryejoamxlmxvqywda.supabase.co/functions/v1/update-prices',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'x-cron-secret', current_setting('app.cron_secret', true)
      ),
      body    := '{}'::jsonb
    )
  $$
);
