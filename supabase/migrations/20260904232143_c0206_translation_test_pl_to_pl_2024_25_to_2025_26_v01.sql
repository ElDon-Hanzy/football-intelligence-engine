with s24 as (
  select source_player_code,
         min(source_player_name) player_name,
         min(source_position) position,
         sum(minutes)::int minutes,
         sum(xg) xg,
         sum(xa) xa,
         count(distinct source_team_code) team_count,
         min(source_team_code) team_code,
         array_agg(distinct source_key order by source_key) source_keys,
         array_agg(distinct source_commit_sha order by source_commit_sha) source_commits,
         min(captured_at) first_captured_at,
         max(captured_at) last_captured_at
  from public.research_c0197_player_match_evidence
  where season='2024-2025' and source_player_code is not null
  group by source_player_code
), s25 as (
  select source_player_code,
         min(source_player_name) player_name,
         min(source_position) position,
         sum(minutes)::int minutes,
         sum(xg) xg,
         sum(xa) xa,
         count(distinct source_team_code) team_count,
         min(source_team_code) team_code,
         array_agg(distinct source_key order by source_key) source_keys,
         array_agg(distinct source_commit_sha order by source_commit_sha) source_commits,
         min(captured_at) first_captured_at,
         max(captured_at) last_captured_at
  from public.research_c0197_player_match_evidence
  where season='2025-2026' and source_player_code is not null
  group by source_player_code
), eligible as (
  select s24.*, s25.player_name player_name25, s25.position position25,
         s25.minutes minutes25, s25.xg xg25, s25.xa xa25,
         s25.team_code team_code25, s25.source_keys source_keys25,
         s25.source_commits source_commits25,
         s25.first_captured_at first_captured_at25,
         s25.last_captured_at last_captured_at25,
         case
           when lower(coalesce(s25.position,s24.position,'')) like 'def%' then 'DEF'
           when lower(coalesce(s25.position,s24.position,'')) like 'mid%' then 'MID'
           when lower(coalesce(s25.position,s24.position,'')) like 'for%' then 'FWD'
         end position_group
  from s24 join s25 using(source_player_code)
  where s24.minutes>=450 and s25.minutes>=450
    and s24.team_count=1 and s25.team_count=1
    and s24.team_code<>s25.team_code
    and s24.xg is not null and s24.xa is not null
    and s25.xg is not null and s25.xa is not null
    and lower(coalesce(s25.position,s24.position,'')) not like 'goal%'
), named as (
  select e.*,
    coalesce(ts.name,
      case e.team_code
        when 1 then 'Man Utd' when 2 then 'Leeds' when 3 then 'Arsenal' when 4 then 'Newcastle'
        when 6 then 'Spurs' when 7 then 'Aston Villa' when 8 then 'Chelsea' when 11 then 'Everton'
        when 13 then 'Leicester City' when 14 then 'Liverpool' when 17 then 'Nott''m Forest'
        when 20 then 'Southampton' when 21 then 'West Ham' when 31 then 'Crystal Palace'
        when 36 then 'Brighton' when 39 then 'Wolves' when 40 then 'Ipswich Town'
        when 43 then 'Man City' when 54 then 'Fulham' when 91 then 'Bournemouth' when 94 then 'Brentford'
        else 'team_code:'||e.team_code::text end) source_club_name,
    coalesce(h25.team_name,td.name,'team_code:'||e.team_code25::text) destination_club_name
  from eligible e
  left join public.teams ts on ts.team_code=e.team_code
  left join public.teams td on td.team_code=e.team_code25
  left join public.historical_team_seasons h25 on h25.season='2025-2026' and h25.team_code=e.team_code25
)
insert into public.research_c0206_foreign_translation_pairs(
  pair_key,player_name,player_identity_key,source_season,destination_season,
  source_competition,destination_competition,source_club,destination_club,position_group,
  source_minutes,destination_minutes,source_xg,source_xa,destination_xg,destination_xa,
  source_provenance,destination_provenance,cohort_split,pair_quality_status,evidence,
  research_only,model_effect_enabled
)
select
  'C0206_TEST_2024_25_2025_26_PLPL_'||source_player_code,
  coalesce(player_name25,player_name),
  'fpl_player_code:'||source_player_code,
  '2024-2025','2025-2026','Premier League','Premier League',
  source_club_name,destination_club_name,position_group,
  minutes,minutes25,xg,xa,xg25,xa25,
  jsonb_build_object(
    'source_table','public.research_c0197_player_match_evidence',
    'source_player_code',source_player_code,
    'source_team_code',team_code,
    'source_keys',to_jsonb(source_keys),
    'source_commit_shas',to_jsonb(source_commits),
    'first_captured_at',first_captured_at,'last_captured_at',last_captured_at,
    'identity_method','stable_fpl_player_code','team_count',1
  ),
  jsonb_build_object(
    'source_table','public.research_c0197_player_match_evidence',
    'source_player_code',source_player_code,
    'destination_team_code',team_code25,
    'source_keys',to_jsonb(source_keys25),
    'source_commit_shas',to_jsonb(source_commits25),
    'first_captured_at',first_captured_at25,'last_captured_at',last_captured_at25,
    'identity_method','stable_fpl_player_code','team_count',1
  ),
  'TEST','ELIGIBLE',
  jsonb_build_object(
    'change_id','C0206','cohort','2024-2025_to_2025-2026',
    'cohort_role','latest eligible PL-to-PL holdout control',
    'test_only',true,'used_for_fitting',false,'used_for_transform_scale',false,
    'source_minute_gate',450,'destination_minute_gate',450,
    'single_club_each_season_required',true,'club_changed_between_seasons',true,
    'goalkeepers_excluded',true,'missing_data_is_not_zero',true,
    'current_2026_27_target_outcomes_used',false,'historical_forecasts_rewritten',false
  ),
  true,false
from named
where position_group is not null
on conflict (pair_key) do nothing;
