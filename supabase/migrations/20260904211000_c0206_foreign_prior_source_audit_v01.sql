create table if not exists public.research_c0206_foreign_prior_source_audits (
  id bigserial primary key,
  player_id bigint not null references public.players(id),
  captured_at timestamptz not null default clock_timestamp(),
  epl_minutes_2025_26 integer not null default 0,
  epl_minutes_2024_25 integer not null default 0,
  epl_xg_2024_25 numeric,
  epl_xa_2024_25 numeric,
  external_season_rows integer not null default 0,
  external_competitions text[],
  latest_transfer_event_type text,
  latest_transfer_event_at timestamptz,
  source_club_name text,
  source_league_known boolean not null default false,
  research_path text not null,
  decision text not null,
  evidence jsonb not null default '{}'::jsonb,
  model_effect_enabled boolean not null default false,
  constraint c0206_foreign_source_audit_effect_off check (model_effect_enabled=false)
);

create index if not exists idx_c0206_foreign_source_audit_player_time
  on public.research_c0206_foreign_prior_source_audits(player_id,captured_at desc);

create or replace function private.block_c0206_foreign_source_audit_mutation_v01()
returns trigger language plpgsql as $$ begin raise exception 'C0206 foreign prior source audits are append-only'; end $$;
drop trigger if exists trg_block_c0206_foreign_source_audit_update on public.research_c0206_foreign_prior_source_audits;
create trigger trg_block_c0206_foreign_source_audit_update
before update or delete on public.research_c0206_foreign_prior_source_audits
for each row execute function private.block_c0206_foreign_source_audit_mutation_v01();

create or replace function private.capture_c0206_foreign_prior_source_audit_v01()
returns jsonb
language plpgsql
security definer
set search_path=private,public,pg_temp
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_rows integer;
begin
  with excluded as (
    select r.player_id
    from private.c0204_projection_coverage_rows_v01(4,v_now) r
    where r.coverage_status<>'PROJECTABLE'
  ), epl25 as (
    select p.id player_id,coalesce(h.minutes,0)::int minutes
    from public.players p
    left join public.historical_player_seasons h on h.player_code=p.player_code and h.season='2025-2026'
  ), epl24 as (
    select p.id player_id,
      coalesce(sum(e.minutes) filter(where e.minutes>0),0)::int minutes,
      sum(e.xg) filter(where e.minutes>0) xg,
      sum(e.xa) filter(where e.minutes>0) xa,
      count(*) filter(where e.minutes>0 and e.xg is null) missing_xg_played,
      count(*) filter(where e.minutes>0 and e.xa is null) missing_xa_played,
      count(distinct e.source_commit_sha) source_commits
    from public.players p
    left join public.research_c0197_player_match_evidence e
      on e.source_player_code=p.player_code and e.season='2024-2025'
    group by p.id
  ), ext as (
    select p.id player_id,count(e.id)::int external_rows,array_agg(distinct e.competition order by e.competition) filter(where e.id is not null) competitions
    from public.players p
    left join public.external_player_seasons e on e.player_code=p.player_code
    group by p.id
  ), tx as (
    select p.id player_id,t.event_type,t.event_at,t.source_club_name,t.source_key,t.source_url
    from public.players p
    left join lateral (
      select e.event_type,e.event_at,e.source_club_name,e.source_key,e.source_url
      from public.player_transfer_events e where e.player_id=p.id
      order by e.event_at desc,e.id desc limit 1
    ) t on true
  ), z as (
    select x.player_id,coalesce(a.minutes,0) m25,coalesce(b.minutes,0) m24,b.xg xg24,b.xa xa24,
      b.missing_xg_played,b.missing_xa_played,b.source_commits,
      coalesce(c.external_rows,0) external_rows,c.competitions,
      d.event_type,d.event_at,d.source_club_name,d.source_key,d.source_url
    from excluded x
    left join epl25 a on a.player_id=x.player_id
    left join epl24 b on b.player_id=x.player_id
    left join ext c on c.player_id=x.player_id
    left join tx d on d.player_id=x.player_id
  )
  insert into public.research_c0206_foreign_prior_source_audits(
    player_id,captured_at,epl_minutes_2025_26,epl_minutes_2024_25,epl_xg_2024_25,epl_xa_2024_25,
    external_season_rows,external_competitions,latest_transfer_event_type,latest_transfer_event_at,source_club_name,
    source_league_known,research_path,decision,evidence,model_effect_enabled)
  select player_id,v_now,m25,m24,xg24,xa24,external_rows,competitions,event_type,event_at,source_club_name,
    false,
    case
      when m25>=900 then 'SAME_LEAGUE_2025_26'
      when m24>=900 and missing_xg_played=0 and missing_xa_played=0 then 'SAME_LEAGUE_2024_25_RECENCY_SHRINK'
      when m25>0 or m24>0 then 'LOW_EPL_SAMPLE'
      when external_rows>0 then 'FOREIGN_SOURCE_AVAILABLE_TRANSLATION_UNCALIBRATED'
      when source_club_name is null then 'SOURCE_CLUB_LEAGUE_DISCOVERY_REQUIRED'
      else 'FOREIGN_LEAGUE_TRANSLATION_REQUIRED'
    end,
    case
      when m25>=900 then 'HANDLE_WITH_SAME_LEAGUE_PRIOR'
      when m24>=900 and missing_xg_played=0 and missing_xa_played=0 then 'RESEARCH_OLDER_EPL_PRIOR_BEFORE_FOREIGN_TRANSLATION'
      when m25>0 or m24>0 then 'KEEP_EXCLUDED_EPL_SAMPLE_TOO_SMALL'
      when external_rows>0 then 'KEEP_EXCLUDED_UNTIL_LEAGUE_TRANSLATION_CALIBRATED'
      when source_club_name is null then 'KEEP_EXCLUDED_SOURCE_PROVENANCE_INCOMPLETE'
      else 'KEEP_EXCLUDED_UNTIL_FOREIGN_SOURCE_AND_TRANSLATION_VALIDATED'
    end,
    jsonb_build_object(
      'change_id','C0206','audit_version','foreign_prior_source_audit_v01',
      'c0197_2024_25_missing_xg_played',missing_xg_played,
      'c0197_2024_25_missing_xa_played',missing_xa_played,
      'c0197_2024_25_source_commit_count',source_commits,
      'transfer_source_key',source_key,'transfer_source_url',source_url,
      'league_translation_model_effect_enabled',false,
      'missing_data_is_not_zero',true,'historical_forecasts_rewritten',false
    ),false
  from z;
  get diagnostics v_rows=row_count;
  return jsonb_build_object('ok',true,'change_id','C0206','captured_at',v_now,'rows',v_rows,'model_effect_enabled',false,'historical_forecasts_rewritten',false);
end $$;

create or replace function private.c0206_foreign_prior_source_audit_status_v01()
returns jsonb
language sql
stable
security definer
set search_path=private,public,pg_temp
as $$
with lt as (select max(captured_at) t from public.research_c0206_foreign_prior_source_audits), x as (
 select a.*,p.web_name,p.position,t.short_name club
 from public.research_c0206_foreign_prior_source_audits a join lt on lt.t=a.captured_at
 join public.players p on p.id=a.player_id join public.teams t on t.id=p.team_id
)
select jsonb_build_object(
  'change_id','C0206','captured_at',(select t from lt),'rows',count(*),
  'same_league_2024_25_candidates',count(*) filter(where research_path='SAME_LEAGUE_2024_25_RECENCY_SHRINK'),
  'low_epl_sample',count(*) filter(where research_path='LOW_EPL_SAMPLE'),
  'foreign_source_available_uncalibrated',count(*) filter(where research_path='FOREIGN_SOURCE_AVAILABLE_TRANSLATION_UNCALIBRATED'),
  'source_discovery_required',count(*) filter(where research_path='SOURCE_CLUB_LEAGUE_DISCOVERY_REQUIRED'),
  'foreign_translation_required',count(*) filter(where research_path='FOREIGN_LEAGUE_TRANSLATION_REQUIRED'),
  'model_effect_violations',count(*) filter(where model_effect_enabled),
  'players',coalesce(jsonb_agg(jsonb_build_object('player_id',player_id,'name',web_name,'club',club,'position',position,
    'epl25_minutes',epl_minutes_2025_26,'epl24_minutes',epl_minutes_2024_25,'external_rows',external_season_rows,
    'transfer_event',latest_transfer_event_type,'source_club',source_club_name,'research_path',research_path,'decision',decision)
    order by research_path,web_name),'[]'::jsonb)
) from x;
$$;