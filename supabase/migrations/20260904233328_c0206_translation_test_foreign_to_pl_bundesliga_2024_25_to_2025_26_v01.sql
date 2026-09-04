with src(player_code,player_name,source_club,position_group,source_minutes,source_xg,source_xa,source_url,identity_note) as (
  values
    (510663,'Hugo Ekitiké','Frankfurt','FWD',2563,21.63::numeric,5.47::numeric,'https://www.statmuse.com/fc/ask?l=bundesliga&q=+xg%2Bxa+leaders+24-25','source display H. Ekitike; destination stable FPL code and full-name normalization Ekitike/Ekitiké'),
    (494595,'Florian Wirtz','Leverkusen','MID',2351,9.40::numeric,9.19::numeric,'https://www.statmuse.com/fc/club/2024-25-bayer-leverkusen-240/stats/2025','exact name and source club; destination stable FPL code'),
    (463936,'Jamie Bynoe-Gittens','Dortmund','MID',1776,3.74::numeric,4.15::numeric,'https://www.statmuse.com/fc/player/jamie-gittens-28751/career-stats','source display Jamie Gittens; destination stable FPL code Jamie Bynoe-Gittens'),
    (485711,'Benjamin Šeško','Leipzig','FWD',2380,9.56::numeric,1.71::numeric,'https://www.statmuse.com/fc/player/benjamin-%C5%A1e%C5%A1ko-30902/career-stats','exact player identity; destination FPL web_name uses Šeško / second_name Sesko'),
    (470313,'Nick Woltemade','Stuttgart','FWD',1622,10.82::numeric,3.50::numeric,'https://www.statmuse.com/fc/player/nick-woltemade-28685/career-stats?seasonYear=2025','exact name and source club; destination stable FPL code'),
    (493362,'Xavi Simons','Leipzig','MID',2150,5.36::numeric,5.65::numeric,'https://www.statmuse.com/fc/club/2024-25-rb-leipzig-260/stats/2025','exact name and source club; destination stable FPL code'),
    (466525,'Anton Stach','Hoffenheim','MID',2585,2.17::numeric,3.19::numeric,'https://www.statmuse.com/fc/ask?q=stach+xg+%2B+xa+last+10+gamez','exact name and source club; destination stable FPL code'),
    (216094,'Jeremie Frimpong','Leverkusen','DEF',2314,4.27::numeric,4.67::numeric,'https://www.statmuse.com/fc/club/2024-25-bayer-leverkusen-240/stats/2025','exact name and source club; destination stable FPL code')
), dst as (
  select e.source_player_code player_code,
         min(e.source_player_name) web_name,
         min(e.source_position) position,
         sum(e.minutes)::int minutes,
         sum(e.xg) xg,
         sum(e.xa) xa,
         count(distinct e.source_team_code) team_count,
         min(e.source_team_code) team_code,
         array_agg(distinct e.source_key order by e.source_key) source_keys,
         array_agg(distinct e.source_commit_sha order by e.source_commit_sha) source_commits,
         min(e.captured_at) first_captured_at,
         max(e.captured_at) last_captured_at
  from public.research_c0197_player_match_evidence e
  where e.season='2025-2026' and e.source_player_code in (510663,494595,463936,485711,470313,493362,466525,216094)
  group by e.source_player_code
), named as (
  select s.*,d.web_name,d.position,d.minutes destination_minutes,d.xg destination_xg,d.xa destination_xa,
         d.team_count,d.team_code,d.source_keys,d.source_commits,d.first_captured_at,d.last_captured_at,
         coalesce(h.team_name,t.name,'team_code:'||d.team_code::text) destination_club
  from src s join dst d using(player_code)
  left join public.historical_team_seasons h on h.season='2025-2026' and h.team_code=d.team_code
  left join public.teams t on t.team_code=d.team_code
)
insert into public.research_c0206_foreign_translation_pairs(
  pair_key,player_name,player_identity_key,source_season,destination_season,
  source_competition,destination_competition,source_club,destination_club,position_group,
  source_minutes,destination_minutes,source_xg,source_xa,destination_xg,destination_xa,
  source_provenance,destination_provenance,cohort_split,pair_quality_status,evidence,
  research_only,model_effect_enabled
)
select
  'C0206_TEST_2024_25_2025_26_BUNDESLIGA_PL_'||player_code,
  player_name,'fpl_player_code:'||player_code,
  '2024-2025','2025-2026','Bundesliga','Premier League',source_club,destination_club,position_group,
  source_minutes,destination_minutes,source_xg,source_xa,destination_xg,destination_xa,
  jsonb_build_object(
    'metric_source','StatMuse FC domestic Bundesliga season/player attacking stats',
    'provider','StatMuse FC','source_url',source_url,'source_as_of','2024-25 completed league season',
    'source_name',player_name,'source_club',source_club,
    'identity_method','source name/source-club season match + destination stable FPL player_code',
    'identity_note',identity_note,'minutes_field','MIN','xg_field','xG','xa_field','xA',
    'domestic_league_only',true,'same_provider_for_source_xg_xa',true
  ),
  jsonb_build_object(
    'source_table','public.research_c0197_player_match_evidence','source_player_code',player_code,
    'destination_team_code',team_code,'source_keys',to_jsonb(source_keys),'source_commit_shas',to_jsonb(source_commits),
    'first_captured_at',first_captured_at,'last_captured_at',last_captured_at,
    'identity_method','stable_fpl_player_code','team_count',team_count
  ),
  'TEST','ELIGIBLE',
  jsonb_build_object(
    'change_id','C0206','cohort','2024-2025_to_2025-2026','cohort_role','latest eligible foreign-to-PL holdout',
    'source_league','Bundesliga','test_only',true,'used_for_fitting',false,'used_for_transform_scale',false,
    'source_minute_gate',450,'destination_minute_gate',450,
    'provider_consistency_note','Bundesliga source slice uses StatMuse for source minutes+xG+xA; destination remains canonical C0197 EPL evidence. This TEST slice is not used to fit coefficients.',
    'goalkeepers_excluded',true,'missing_data_is_not_zero',true,'current_2026_27_target_outcomes_used',false,
    'historical_forecasts_rewritten',false
  ),true,false
from named
where destination_minutes>=450 and team_count=1 and destination_xg is not null and destination_xa is not null
on conflict(pair_key) do nothing;
