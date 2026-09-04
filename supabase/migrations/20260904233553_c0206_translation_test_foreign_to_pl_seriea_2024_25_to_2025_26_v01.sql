with src(player_code,player_name,source_club,position_group,source_minutes,source_xg,source_xa,source_url,identity_note) as (
  values
    (433036,'Tijjani Reijnders','Milan','MID',3128,6.81::numeric,3.60::numeric,'https://www.statmuse.com/fc/ask/reijnders-xg-and-xa','exact name/source club; destination stable FPL code'),
    (456512,'Dan Ndoye','Bologna','MID',2143,7.01::numeric,2.82::numeric,'https://www.statmuse.com/fc/player/dan-ndoye-41528/career-stats','exact name/source club; destination stable FPL code'),
    (434752,'Jaka Bijol','Udinese','DEF',2963,1.86::numeric,0.74::numeric,'https://www.statmuse.com/fc/club/2024-25-udinese-296/stats/2025','source display J. Bijol; destination stable FPL code'),
    (523705,'Jackson Tchatchoua','Verona','DEF',3167,1.73::numeric,3.02::numeric,'https://www.statmuse.com/fc/club/2024-25-verona-299/stats/2025','source display J. Tchatchoua; destination stable FPL code'),
    (469272,'Loum Tchaouna','Lazio','MID',660,2.46::numeric,0.74::numeric,'https://www.statmuse.com/fc/player/loum-tchaouna-41695/career-stats?seasonYear=2025','exact name/source club; 660 source minutes clears exploratory gate only'),
    (247670,'Valentín Castellanos','Lazio','FWD',2384,13.55::numeric,2.46::numeric,'https://www.statmuse.com/fc/player/valent%C3%ADn-castellanos-8460/career-stats','source identity Valentín Castellanos; destination FPL web_name Taty and stable player code')
), dst as (
  select e.source_player_code player_code,min(e.source_player_name) web_name,min(e.source_position) position,
         sum(e.minutes)::int minutes,sum(e.xg) xg,sum(e.xa) xa,count(distinct e.source_team_code) team_count,min(e.source_team_code) team_code,
         array_agg(distinct e.source_key order by e.source_key) source_keys,array_agg(distinct e.source_commit_sha order by e.source_commit_sha) source_commits,
         min(e.captured_at) first_captured_at,max(e.captured_at) last_captured_at
  from public.research_c0197_player_match_evidence e
  where e.season='2025-2026' and e.source_player_code in (433036,456512,434752,523705,469272,247670)
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
select 'C0206_TEST_2024_25_2025_26_SERIEA_PL_'||player_code,player_name,'fpl_player_code:'||player_code,
  '2024-2025','2025-2026','Serie A','Premier League',source_club,destination_club,position_group,
  source_minutes,destination_minutes,source_xg,source_xa,destination_xg,destination_xa,
  jsonb_build_object('metric_source','StatMuse FC domestic Serie A season/player attacking stats','provider','StatMuse FC',
    'source_url',source_url,'source_as_of','2024-25 completed league season','source_name',player_name,'source_club',source_club,
    'identity_method','source name/source-club season match + destination stable FPL player_code','identity_note',identity_note,
    'minutes_field','MIN','xg_field','xG','xa_field','xA','domestic_league_only',true,'same_provider_for_source_xg_xa',true),
  jsonb_build_object('source_table','public.research_c0197_player_match_evidence','source_player_code',player_code,
    'destination_team_code',team_code,'source_keys',to_jsonb(source_keys),'source_commit_shas',to_jsonb(source_commits),
    'first_captured_at',first_captured_at,'last_captured_at',last_captured_at,'identity_method','stable_fpl_player_code','team_count',team_count),
  'TEST','ELIGIBLE',
  jsonb_build_object('change_id','C0206','cohort','2024-2025_to_2025-2026','cohort_role','latest eligible foreign-to-PL holdout',
    'source_league','Serie A','test_only',true,'used_for_fitting',false,'used_for_transform_scale',false,
    'source_minute_gate',450,'destination_minute_gate',450,
    'provider_consistency_note','Serie A source slice uses StatMuse for source minutes+xG+xA; destination remains canonical C0197 EPL evidence. TEST only.',
    'goalkeepers_excluded',true,'missing_data_is_not_zero',true,'current_2026_27_target_outcomes_used',false,'historical_forecasts_rewritten',false),true,false
from named where destination_minutes>=450 and team_count=1 and destination_xg is not null and destination_xa is not null
on conflict(pair_key) do nothing;
