create or replace view public.current_player_state_base
with (security_invoker=true)
as
select distinct on (ps.player_id)
  ps.*
from public.player_state ps
join public.model_versions mv on mv.id=ps.model_version_id and mv.version='0.1.2'
where coalesce(ps.state->>'refresh_family','') <> 'current_season_official'
order by ps.player_id,ps.as_of desc,ps.id desc;

create or replace view public.current_player_state_latest
with (security_invoker=true)
as
select distinct on (ps.player_id)
  ps.*
from public.player_state ps
join public.model_versions mv on mv.id=ps.model_version_id and mv.version='0.1.2'
order by ps.player_id,ps.as_of desc,ps.id desc;

revoke all on public.current_player_state_base from anon, authenticated;
revoke all on public.current_player_state_latest from anon, authenticated;
grant select on public.current_player_state_base to service_role;
grant select on public.current_player_state_latest to service_role;
