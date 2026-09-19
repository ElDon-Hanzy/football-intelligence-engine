-- Policy outputs participate in state identity so a corrected curve creates a new state.
do $do$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('private.refresh_current_season_team_performance_v01(integer,timestamptz)'::regprocedure);
  v_def := replace(
    v_def,
    $$'policy','c0284_current_season_weight_v01','team_id',f.team_id,$$,
    $$'policy','c0284_current_season_weight_v02','base_current_weight',f.base_w,'team_id',f.team_id,$$
  );
  if position('c0284_current_season_weight_v02' in v_def)=0 then
    raise exception 'C0284 weight-hash patch did not match';
  end if;
  execute v_def;
end;
$do$;
