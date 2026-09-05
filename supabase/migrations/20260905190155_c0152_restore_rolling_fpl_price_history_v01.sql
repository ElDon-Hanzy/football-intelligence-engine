create or replace function private.c0152_block_fpl_price_history_mutation_v01()
returns trigger
language plpgsql
security definer
set search_path=private,public,pg_temp
as $$
begin
  raise exception 'public.fpl_prices is append-only';
end $$;

drop trigger if exists trg_c0152_fpl_prices_append_only on public.fpl_prices;
create trigger trg_c0152_fpl_prices_append_only
before update or delete on public.fpl_prices
for each row execute function private.c0152_block_fpl_price_history_mutation_v01();

create index if not exists idx_fpl_prices_captured_at_desc on public.fpl_prices(captured_at desc);
create index if not exists idx_fpl_prices_player_captured_desc on public.fpl_prices(player_id,captured_at desc);

create or replace function private.c0152_fpl_price_history_status_v01()
returns jsonb
language sql
stable
security definer
set search_path=private,public,pg_temp
as $$
with p as (
  select max(updated_at) latest_players_refresh,count(*) player_count from public.players
), h as (
  select max(captured_at) latest_price_capture,count(*) total_rows,count(distinct player_id) distinct_players,max(gameweek) latest_gameweek,count(distinct captured_at) capture_count from public.fpl_prices
), latest as (
  select count(*) latest_capture_rows from public.fpl_prices where captured_at=(select latest_price_capture from h)
), trg as (
  select exists(select 1 from pg_trigger where tgrelid='public.fpl_prices'::regclass and tgname='trg_c0152_fpl_prices_append_only' and not tgisinternal) append_only_trigger
), cj as (
  select count(*) scheduled_jobs,max(schedule) filter(where active) schedule from cron.job where jobname='c0152-fpl-price-history-4h'
)
select jsonb_build_object(
  'change_id','C0152',
  'latest_players_refresh',p.latest_players_refresh,
  'latest_price_capture',h.latest_price_capture,
  'lag_seconds',case when h.latest_price_capture is null or p.latest_players_refresh is null then null else extract(epoch from (p.latest_players_refresh-h.latest_price_capture)) end,
  'player_count',p.player_count,
  'history_distinct_players',h.distinct_players,
  'latest_capture_rows',latest.latest_capture_rows,
  'latest_gameweek',h.latest_gameweek,
  'capture_count',h.capture_count,
  'total_rows',h.total_rows,
  'append_only_trigger',trg.append_only_trigger,
  'scheduled_jobs',cj.scheduled_jobs,
  'schedule',cj.schedule,
  'fresh_within_5h',h.latest_price_capture is not null and h.latest_price_capture > now()-interval '5 hours'
) from p cross join h cross join latest cross join trg cross join cj;
$$;

revoke all on function private.c0152_fpl_price_history_status_v01() from public;
grant execute on function private.c0152_fpl_price_history_status_v01() to service_role;

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='c0152-fpl-price-history-4h' loop
    perform cron.unschedule(r.jobid);
  end loop;
  perform cron.schedule(
    'c0152-fpl-price-history-4h',
    '5 */4 * * *',
    $cron$select net.http_get(url := 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/sync-fpl-data');$cron$
  );
end $$;