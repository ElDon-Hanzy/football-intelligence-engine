-- C0223 — force projection core through the semantic production fixture selector.
do $$
declare v_def text;
begin
  select pg_get_functiondef('private.generate_upcoming_fpl_projection_core_v01(integer,boolean)'::regprocedure) into v_def;
  if position('from public.fixture_prediction_snapshots f' in v_def)=0 then
    if position('from public.current_production_fixture_prediction_v01 f' in v_def)>0 then return; end if;
    raise exception 'Expected fixture source token not found in projection core';
  end if;
  v_def:=replace(v_def,'from public.fixture_prediction_snapshots f','from public.current_production_fixture_prediction_v01 f');
  execute v_def;
end $$;
