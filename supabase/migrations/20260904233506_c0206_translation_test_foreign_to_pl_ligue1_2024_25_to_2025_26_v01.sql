with src(player_code,player_name,source_club,position_group,source_minutes,source_xg,source_xa,source_url,identity_note) as (
  values
    (466052,'Rayan Cherki','Lyon','MID',2041,5.05::numeric,11.84::numeric,'https://www.statmuse.com/fc/ask?l=ligue1&q=highest+xg%2Bxa+for+midfielders+2024-25','exact name/source club; destination stable FPL code'),
    (242882,'Bafodé Diakité','Lille','DEF',2766,2.35::numeric,0.81::numeric,'https://www.statmuse.com/fc/club/2024-25-lille-337/stats/2025','source display B. Diakité; destination stable FPL code'),
    (494521,'Adrien Truffert','Stade Rennais','DEF',2752,2.52::numeric,4.11::numeric,'https://www.statmuse.com/fc/club/stade-rennais-351/stats/2025','source display A. Truffert; destination stable FPL code'),
    (476887,'Dilane Bakwa','Strasbourg','MID',2497,4.33::numeric,6.03::numeric,'https://www.statmuse.com/fc/club/2025-strasbourg-355/stats/2025','source display D. Bakwa; destination stable FPL code'),
    (547027,'Habib Diarra','Strasbourg','MID',2352,3.36::numeric,4.27::numeric,'https://www.statmuse.com/fc/club/2025-strasbourg-355/stats/2025','source display H. Diarra; destination stable FPL code')
), dst as (
  select e.source_player_code player_code,min(e.source_player_name) web_name,min(e.source_position) position,
         sum(e.minutes)::int minutes,sum(e.xg) xg,sum(e.xa) xa,count(distinct e.source_team_code) team_count,
         min(e.source_team_code) team_code,array_agg(distinct e.source_key order by e.source_key) source_keys,
         array_agg(distinct e.source_commit_sha order by e.source_commit_sha) source_commits,
         min(e.captured_at) first_captured_at,max(e.captured_at) last_captured_at
  from public.research_c0197_player_match_evidence e
  where e.season='2025-2026' and e.source_player_code in (466052,242882,494521,476887,547027)
  group by e.source_player_code
), named as (
  select s.*,d.web_name,d.position,d.minutes destination_minutes,d.xg destination_xg,d.xa destination_xa,d.team_count,d.team_code,
         d.source_keys,d.source_commits,d.first_captured_at,d.last_captured_at,
         coalesce(h.team_name,t.name,'team_code:'||d.team_code::text) destination_club
  from src s join dst d using(player_code)
  left join public.historical_team_seasons h on h.season='2025-2026' and h.team_code=d.team_code
  left join public.teams t on t.team_code=d.team_code
)
insert into public.research_c0206_foreign_translation_pairs(
  pair_key,player_name,player_identity_key,source_season,destination_season,source_competition,destination_competition,
  source_club,destination_club,position_group,source_minutes,destination_minutes,source_xg,source_xa,destination_xg,destination_xa,
  source_provenance,destination_provenance,cohort_split,pair_quality_status,evidence,research_only,model_effect_enabled)
select 'C0206_TEST_2024_25_2025_26_LIGUE1_PL_'||player_code,player_name,'fpl_player_code:'||player_code,
  '2024-2025','2025-2026','Ligue 1','Premier League',source_club,destination_club,position_group,
  source_minutes,destination_minutes,source_xg,source_xa,destination_xg,destination_xa,
  jsonb_build_object('metric_source','StatMuse FC domestic Ligue 1 season/player attacking stats','provider','StatMuse FC',
    'source_url',source_url,'source_as_of','2024-25 completed league season','source_name',player_name,'source_club',source_club,
    'identity_method','source name/source-club season match + destination stable FPL player_code','identity_note',identity_note,
    'minutes_field','MIN','xg_field','xG','xa_field','xA','domestic_league_only',true,'same_provider_for_source_xg_xa',true),
  jsonb_build_object('source_table','public.research_c0197_player_match_evidence','source_player_code',player_code,
    'destination_team_code',team_code,'source_keys',to_jsonb(source_keys),'source_commit_shas',to_jsonb(source_commits),
    'first_captured_at',first_captured_at,'last_captured_at',last_captured_at,'identity_method','stable_fpl_player_code','team_count',team_count),
  'TEST','ELIGIBLE',
  jsonb_build_object('change_id','C0206','cohort','2024-2025_to_2025-2026','cohort_role','latest eligible foreign-to-PL holdout',
    'source_league','Ligue 1','test_only',true,'used_for_fitting',false,'used_for_transform_scale',false,
    'source_minute_gate',450,'destination_minute_gate',450,
    'provider_consistency_note','Ligue 1 source slice uses StatMuse for source minutes+xG+xA; destination remains canonical C0197 EPL evidence. TEST only.',
    'goalkeepers_excluded',true,'missing_data_is_not_zero',true,'current_2026_27_target_outcomes_used',false,'historical_forecasts_rewritten',false),true,false
from named where destination_minutes>=450 and team_count=1 and destination_xg is not null and destination_xa is not null
on conflict(pair_key) do nothing;
