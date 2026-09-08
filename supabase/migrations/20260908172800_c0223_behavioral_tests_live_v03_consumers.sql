-- C0223 — repair C0213 behavioral probes so they test the live v03 goal/assist consumers.
do $$
declare v_def text;
begin
  select pg_get_functiondef('private.run_c0213_behavioral_consumption_tests_v01(integer)'::regprocedure) into v_def;
  if position('fpl_fixture_goal_lambda_v03' in v_def)>0 and position('fpl_fixture_assist_lambda_v03' in v_def)>0 then return; end if;
  if position('v_goal_a:=private.fpl_fixture_goal_lambda_v02' in v_def)=0 then raise exception 'Expected v02 goal probe token not found'; end if;

  v_def:=replace(v_def,'v_goal_a numeric; v_goal_b numeric;','v_goal_a numeric; v_goal_b numeric;'||chr(10)||'  v_xg90 numeric; v_xa90 numeric;');
  v_def:=replace(v_def,
    'v_goal_a:=private.fpl_fixture_goal_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda,c.cutoff);',
    'select s.xg90,s.xa90 into v_xg90,v_xa90 from private.fpl_projection_player_state_v01(v_gw,c.cutoff) s where s.player_id=c.player_id;'||chr(10)||'  v_goal_a:=private.fpl_fixture_goal_lambda_v03(c.player_id,c.expected_minutes,c.team_lambda,c.cutoff,v_gw,v_xg90);');
  v_def:=replace(v_def,'v_goal_b:=private.fpl_fixture_goal_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda*0.8,c.cutoff);','v_goal_b:=private.fpl_fixture_goal_lambda_v03(c.player_id,c.expected_minutes,c.team_lambda*0.8,c.cutoff,v_gw,v_xg90);');
  v_def:=replace(v_def,'v_assist_a:=private.fpl_fixture_assist_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda,c.cutoff);','v_assist_a:=private.fpl_fixture_assist_lambda_v03(c.player_id,c.expected_minutes,c.team_lambda,c.cutoff,v_xa90);');
  v_def:=replace(v_def,'v_assist_b:=private.fpl_fixture_assist_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda*0.8,c.cutoff);','v_assist_b:=private.fpl_fixture_assist_lambda_v03(c.player_id,c.expected_minutes,c.team_lambda*0.8,c.cutoff,v_xa90);');
  v_def:=replace(v_def,'DB_FUNCTION:private.fpl_fixture_assist_lambda_v02(p_player_id bigint, p_xmin numeric, p_team_lambda numeric, p_cutoff timestamp with time zone)','DB_FUNCTION:private.fpl_fixture_assist_lambda_v03(p_player_id bigint, p_xmin numeric, p_team_lambda numeric, p_cutoff timestamp with time zone, p_current_xa90 numeric)');
  v_def:=replace(v_def,'DB_FUNCTION:private.fpl_fixture_goal_lambda_v02(p_player_id bigint, p_xmin numeric, p_team_lambda numeric, p_cutoff timestamp with time zone)','DB_FUNCTION:private.fpl_fixture_goal_lambda_v03(p_player_id bigint, p_xmin numeric, p_team_lambda numeric, p_cutoff timestamp with time zone, p_gameweek integer, p_current_xg90 numeric)');
  execute v_def;
end $$;
