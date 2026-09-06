do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='football_intelligence_role_tactical_refresh' and active limit 1;
  if v_job is not null then
    perform cron.alter_job(v_job, command => $cmd$select private.invoke_engine_ingest('refresh-role-tactical-intelligence',jsonb_build_object('gameweek',g.gameweek)) from (select distinct gameweek from public.matches where source='fpl' and gameweek is not null and kickoff_time>now() order by gameweek limit 3) g;$cmd$);
  end if;

  select jobid into v_job from cron.job where jobname='football_intelligence_forward_forecast_refresh' and active limit 1;
  if v_job is not null then
    perform cron.alter_job(v_job, command => $cmd$select private.invoke_engine_ingest('refresh-forward-fixture-forecasts',jsonb_build_object('gameweek',g.gameweek)) from (select distinct gameweek from public.matches where source='fpl' and gameweek is not null and kickoff_time>now() order by gameweek limit 3) g;$cmd$);
  end if;

  select jobid into v_job from cron.job where jobname='football_intelligence_feature_snapshot_refresh' and active limit 1;
  if v_job is not null then
    perform cron.alter_job(v_job, command => $cmd$select public.generate_fixture_team_feature_snapshots_v01(g.gameweek,null) from (select distinct gameweek from public.matches where source='fpl' and gameweek is not null and kickoff_time>now() order by gameweek limit 3) g;$cmd$);
  end if;

  select jobid into v_job from cron.job where jobname='football_intelligence_forward_enriched_refresh' and active limit 1;
  if v_job is not null then
    perform cron.alter_job(v_job, command => $cmd$select private.invoke_engine_ingest('refresh-forward-enriched-predictions',jsonb_build_object('gameweek',g.gameweek)) from (select distinct gameweek from public.matches where source='fpl' and gameweek is not null and kickoff_time>now() order by gameweek limit 3) g;$cmd$);
  end if;

  select jobid into v_job from cron.job where jobname='c0159_production_fixture_refresh' and active limit 1;
  if v_job is not null then
    perform cron.alter_job(v_job, command => $cmd$select private.refresh_c0166_fixture_cycle_v01(g.gameweek)
from (select distinct gameweek from public.matches
      where source='fpl' and gameweek is not null and kickoff_time>now()
      order by gameweek limit 3) g;$cmd$);
  end if;
end $$;