-- C0150: restore stable player-event lineage, explicit penalty separation and target-fixture conditioning.
-- Prospective only: frozen historical predictions are never mutated.

create or replace function private.fpl_fixture_goal_lambda_v02(
  p_player_id bigint,
  p_xmin numeric,
  p_team_lambda numeric,
  p_cutoff timestamptz
) returns numeric
language plpgsql
stable
security definer
set search_path=private,public,pg_temp
as $$
declare
  v_rate record;
  v_active record;
  v_base_xg90 numeric;
  v_current_xg90 numeric;
  v_form_ratio numeric := 1;
  v_fixture_ratio numeric := 1;
  v_anchor_goal_lambda numeric := 0;
  v_anchor_open_lambda numeric := 0;
  v_penalty_lambda numeric := 0;
  v_role_mult numeric := 1;
  v_current_pen_rank integer;
  v_out numeric;
begin
  if coalesce(p_xmin,0)<=0 then return 0; end if;

  select mp.expected_minutes,mp.p_goal,mp.features,mp.generated_at
    into v_rate
  from public.model_predictions mp
  join public.model_versions mv on mv.id=mp.model_version_id and mv.version='0.1.2'
  where mp.player_id=p_player_id and mp.prediction_run_id is null
    and mp.generated_at<p_cutoff and mp.features ? 'npxg90' and mp.features ? 'matchup'
  order by mp.generated_at desc limit 1;

  select mp.expected_minutes,mp.p_goal,mp.features,mp.generated_at
    into v_active
  from public.model_predictions mp
  join public.model_versions mv on mv.id=mp.model_version_id and mv.is_active=true
  where mp.player_id=p_player_id and mp.prediction_run_id is null and mp.generated_at<p_cutoff
  order by mp.generated_at desc limit 1;

  select ps.xg90 into v_base_xg90
  from public.player_state ps
  where ps.player_id=p_player_id and v_rate.generated_at is not null and ps.as_of<=v_rate.generated_at
  order by ps.as_of desc limit 1;

  select ps.xg90 into v_current_xg90
  from public.player_state ps
  where ps.player_id=p_player_id and ps.as_of<=p_cutoff
  order by ps.as_of desc limit 1;

  select penalties_order into v_current_pen_rank from public.players where id=p_player_id;

  if v_rate.expected_minutes is null or coalesce((v_rate.features->>'npxg90')::numeric,0)<=0 then
    return greatest(0,coalesce(v_current_xg90,0)*p_xmin/90.0*private.fpl_player_goal_confirmation_v01(p_player_id,p_cutoff));
  end if;

  if coalesce(v_base_xg90,0)>0 and v_current_xg90 is not null then
    v_form_ratio := greatest(0.5,least(2.0,v_current_xg90/v_base_xg90));
  end if;

  if coalesce((v_rate.features->>'team_lambda')::numeric,0)>0 and coalesce(p_team_lambda,0)>0 then
    v_fixture_ratio := power(greatest(0.5,least(2.0,p_team_lambda/(v_rate.features->>'team_lambda')::numeric)),0.90);
  end if;

  v_role_mult := greatest(0.75,least(1.25,coalesce((v_active.features->>'role_attack_multiplier')::numeric,1)));

  v_anchor_goal_lambda := case when v_rate.p_goal is not null and v_rate.p_goal>0 and v_rate.p_goal<0.999999 then -ln(1-v_rate.p_goal) else 0 end;
  v_anchor_open_lambda := greatest(0,(v_rate.features->>'npxg90')::numeric * v_rate.expected_minutes/90.0 * (v_rate.features->>'matchup')::numeric);

  if coalesce((v_rate.features->>'penalties_order')::integer,99)=1 then
    v_penalty_lambda := greatest(0,v_anchor_goal_lambda-v_anchor_open_lambda);
  end if;

  v_out :=
    ((v_rate.features->>'npxg90')::numeric * v_form_ratio * p_xmin/90.0 * (v_rate.features->>'matchup')::numeric * v_fixture_ratio * v_role_mult)
    + case when coalesce(v_current_pen_rank,99)=1 and v_rate.expected_minutes>0
           then v_penalty_lambda*p_xmin/v_rate.expected_minutes else 0 end;

  return greatest(0,v_out*private.fpl_player_goal_confirmation_v01(p_player_id,p_cutoff));
end;
$$;

create or replace function private.fpl_fixture_assist_lambda_v02(
  p_player_id bigint,
  p_xmin numeric,
  p_team_lambda numeric,
  p_cutoff timestamptz
) returns numeric
language plpgsql
stable
security definer
set search_path=private,public,pg_temp
as $$
declare
  v_rate record;
  v_active record;
  v_base_xa90 numeric;
  v_current_xa90 numeric;
  v_form_ratio numeric := 1;
  v_fixture_ratio numeric := 1;
  v_role_mult numeric := 1;
  v_out numeric;
begin
  if coalesce(p_xmin,0)<=0 then return 0; end if;

  select mp.expected_minutes,mp.p_assist,mp.features,mp.generated_at
    into v_rate
  from public.model_predictions mp
  join public.model_versions mv on mv.id=mp.model_version_id and mv.version='0.1.2'
  where mp.player_id=p_player_id and mp.prediction_run_id is null
    and mp.generated_at<p_cutoff and mp.features ? 'assist90'
  order by mp.generated_at desc limit 1;

  select mp.features,mp.generated_at into v_active
  from public.model_predictions mp
  join public.model_versions mv on mv.id=mp.model_version_id and mv.is_active=true
  where mp.player_id=p_player_id and mp.prediction_run_id is null and mp.generated_at<p_cutoff
  order by mp.generated_at desc limit 1;

  select ps.xa90 into v_base_xa90
  from public.player_state ps
  where ps.player_id=p_player_id and v_rate.generated_at is not null and ps.as_of<=v_rate.generated_at
  order by ps.as_of desc limit 1;

  select ps.xa90 into v_current_xa90
  from public.player_state ps
  where ps.player_id=p_player_id and ps.as_of<=p_cutoff
  order by ps.as_of desc limit 1;

  if v_rate.expected_minutes is null or coalesce((v_rate.features->>'assist90')::numeric,0)<=0 then
    return greatest(0,coalesce(v_current_xa90,0)*p_xmin/90.0*private.fpl_player_assist_confirmation_v01(p_player_id,p_cutoff));
  end if;

  if coalesce(v_base_xa90,0)>0 and v_current_xa90 is not null then
    v_form_ratio := greatest(0.5,least(2.0,v_current_xa90/v_base_xa90));
  end if;

  if coalesce((v_rate.features->>'team_lambda')::numeric,0)>0 and coalesce(p_team_lambda,0)>0 then
    v_fixture_ratio := power(greatest(0.5,least(2.0,p_team_lambda/(v_rate.features->>'team_lambda')::numeric)),0.70);
  end if;

  v_role_mult := greatest(0.75,least(1.25,coalesce((v_active.features->>'role_attack_multiplier')::numeric,1)));
  v_out := (v_rate.features->>'assist90')::numeric * v_form_ratio * p_xmin/90.0 * v_fixture_ratio * v_role_mult;
  return greatest(0,v_out*private.fpl_player_assist_confirmation_v01(p_player_id,p_cutoff));
end;
$$;

-- Patch the existing rolling generator in place. The function name stays stable for cron/API callers.
do $$
declare v_def text;
begin
  select pg_get_functiondef('private.generate_upcoming_fpl_snapshot_v01(integer,boolean)'::regprocedure) into v_def;

  if position($q$where mp.model_version_id=v_model_id
      and mp.generated_at<v_now
      and (mp.gameweek<v_gw or (mp.gameweek=v_gw and mp.prediction_run_id is not null))$q$ in v_def)=0 then
    raise exception 'C0150 baseline-selection patch target not found';
  end if;
  v_def := replace(v_def,
$q$where mp.model_version_id=v_model_id
      and mp.generated_at<v_now
      and (mp.gameweek<v_gw or (mp.gameweek=v_gw and mp.prediction_run_id is not null))$q$,
$q$where mp.model_version_id=v_model_id
      and mp.generated_at<v_now
      and mp.prediction_run_id is null$q$);

  if position($q$coalesce(new_xg90,0)*coalesce(new_xmin,0)/90.0*goal_scale*private.fpl_player_goal_confirmation_v01(player_id,v_now) new_lg,$q$ in v_def)=0 then
    raise exception 'C0150 goal-lambda patch target not found';
  end if;
  v_def := replace(v_def,
$q$coalesce(new_xg90,0)*coalesce(new_xmin,0)/90.0*goal_scale*private.fpl_player_goal_confirmation_v01(player_id,v_now) new_lg,$q$,
$q$private.fpl_fixture_goal_lambda_v02(player_id,new_xmin,new_team_lambda,v_now) new_lg,$q$);

  if position($q$coalesce(new_xa90,0)*coalesce(new_xmin,0)/90.0*assist_scale*private.fpl_player_assist_confirmation_v01(player_id,v_now) new_la,$q$ in v_def)=0 then
    raise exception 'C0150 assist-lambda patch target not found';
  end if;
  v_def := replace(v_def,
$q$coalesce(new_xa90,0)*coalesce(new_xmin,0)/90.0*assist_scale*private.fpl_player_assist_confirmation_v01(player_id,v_now) new_la,$q$,
$q$private.fpl_fixture_assist_lambda_v02(player_id,new_xmin,new_team_lambda,v_now) new_la,$q$);

  v_def := replace(v_def,'rolling_projection_v0.1','rolling_projection_v0.2_event_integrity');
  v_def := replace(v_def,$q$'change_id','C0135'$q$,$q$'change_id','C0150','parent_change_id','C0135'$q$);
  v_def := replace(v_def,'C0135 rolling immutable pre-deadline FPL snapshot. New snapshots may supersede this before deadline; this row itself is immutable.','C0150 rolling immutable pre-deadline FPL snapshot. Stable anchor + target-fixture event conditioning; this row itself is immutable.');
  execute v_def;
end $$;
