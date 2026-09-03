create or replace function private.c0197_capture_next_shootout_forward_v01()
returns jsonb language plpgsql set search_path=public,private,pg_temp as $$
declare
  v_gw integer;
  v_cap jsonb;
  v_market jsonb;
  v_eval_gw integer;
  v_evaluated jsonb := '[]'::jsonb;
begin
  for v_eval_gw in
    select distinct s.gameweek
    from public.research_c0197_shootout_forward_snapshots s
    where s.run_key='C0197_SHOOTOUT_FORWARD_20260904_V01'
      and not exists (
        select 1 from public.matches m
        join public.research_c0197_shootout_forward_snapshots sx on sx.match_id=m.id and sx.run_key=s.run_key and sx.gameweek=s.gameweek
        where sx.gameweek=s.gameweek and not m.finished
      )
  loop
    v_evaluated := v_evaluated || jsonb_build_array(private.c0197_evaluate_shootout_forward_v01(v_eval_gw));
  end loop;

  select min(gameweek) into v_gw
  from public.matches
  where gameweek is not null and not finished and kickoff_time>clock_timestamp();

  if v_gw is null then
    return jsonb_build_object('state','NO_FUTURE_GAMEWEEK','evaluations',v_evaluated,'model_effect_enabled',false);
  end if;

  v_cap := private.c0197_capture_shootout_forward_v01(v_gw,clock_timestamp());
  v_market := private.c0197_capture_shootout_market_checks_v01(v_gw);

  return jsonb_build_object('state','OK','gameweek',v_gw,'capture',v_cap,'market_checks',v_market,'evaluations',v_evaluated,'model_effect_enabled',false);
end $$;
revoke all on function private.c0197_capture_next_shootout_forward_v01() from public,anon,authenticated;

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='c0197-shootout-forward-shadow-v01' loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

select cron.schedule(
  'c0197-shootout-forward-shadow-v01',
  '50 */4 * * *',
  'select private.c0197_capture_next_shootout_forward_v01();'
);