-- Ensure a policy change creates a new immutable state and reports the canonical curve.
do $do$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('private.refresh_current_season_team_performance_v01(integer,timestamptz)'::regprocedure);

  v_def := replace(
    v_def,
    $$'weight_curve',case when f.prior_source='promoted_baseline' then 'n/(n+2), cap .85' else 'n/(n+3), cap .85' end$$,
    $$'weight_curve','current 75% matches 1-4; 80/85/90/95% matches 5-8; 100% at 9+'$$
  );

  v_def := replace(
    v_def,
    $$jsonb_build_object('team_id',f.team_id,$$,
    $$jsonb_build_object('policy','c0284_current_season_weight_v01','team_id',f.team_id,$$
  );

  if position('c0284_current_season_weight_v01' in v_def)=0 then
    raise exception 'C0284 refresh-function version patch did not match';
  end if;

  execute v_def;
end;
$do$;
