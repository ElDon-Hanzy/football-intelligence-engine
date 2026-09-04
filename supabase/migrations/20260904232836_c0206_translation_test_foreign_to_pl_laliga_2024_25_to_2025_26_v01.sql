with src(player_code,player_name,source_name,source_club,position_group,source_minutes,source_xg,source_xa,stats_path,stats_sha,passing_path,passing_sha,identity_note) as (
  values
    (481655,'Martín Zubimendi Ibáñez','Martín Zubimendi','Real Sociedad','MID',2962,2.6::numeric,1.3::numeric,
     'data/interim/Real Sociedad/fbref/df_player_stats_2425.csv','db65c832dd5156fcc0ec062e5c366c684741d42c',
     'data/interim/Real Sociedad/fbref/df_player_passing_2425.csv','3e9d5cd7fdaedd177a5f6e09baf5c018ae9a5c09',
     'exact first name + surname root; destination stable FPL code'),
    (500040,'Cristhian Mosquera','Cristhian Mosquera','Valencia CF','DEF',3319,0.4::numeric,0.3::numeric,
     'data/interim/Valencia CF/fbref/df_player_stats_2425.csv','180ec890317101e27b86be89df5e04e03a3eed97',
     'data/interim/Valencia CF/fbref/df_player_passing_2425.csv','0510f5a5d86e336995be6cf7cad36636b05384da',
     'exact full name; destination stable FPL code'),
    (586309,'Thierno Barry','Thierno Barry','Villarreal CF','FWD',2323,12.5::numeric,2.0::numeric,
     'data/interim/Villarreal CF/fbref/df_player_stats_2425.csv','67f8884a69fd5c44e3942545e5c2a34be31d6c3c',
     'data/interim/Villarreal CF/fbref/df_player_passing_2425.csv','1e74e7ddca231186c3a911173255fe942f1adbae',
     'exact full name; destination stable FPL code'),
    (488024,'Yéremy Pino Santos','Yeremi Pino','Villarreal CF','MID',1934,3.9::numeric,3.8::numeric,
     'data/interim/Villarreal CF/fbref/df_player_stats_2425.csv','67f8884a69fd5c44e3942545e5c2a34be31d6c3c',
     'data/interim/Villarreal CF/fbref/df_player_passing_2425.csv','1e74e7ddca231186c3a911173255fe942f1adbae',
     'accent/spelling normalization Yeremi -> Yéremy; surname Pino exact; destination stable FPL code')
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
  where e.season='2025-2026' and e.source_player_code in (481655,500040,586309,488024)
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
  'C0206_TEST_2024_25_2025_26_LALIGA_PL_'||player_code,
  player_name,
  'fpl_player_code:'||player_code,
  '2024-2025','2025-2026','La Liga','Premier League',source_club,destination_club,position_group,
  source_minutes,destination_minutes,source_xg,source_xa,destination_xg,destination_xa,
  jsonb_build_object(
    'metric_source','FBref-derived domestic-league club tables',
    'repository','markuskuehnle/football-talent-value-forecast',
    'repository_commit','206c7e1d3367dbc754ce00fb9ac57bdd136afbe2',
    'stats_path',stats_path,'stats_blob_sha',stats_sha,
    'passing_path',passing_path,'passing_blob_sha',passing_sha,
    'source_name',source_name,'source_club',source_club,
    'identity_method','source full-name/source-club match + destination stable FPL player_code',
    'identity_note',identity_note,
    'minutes_field','stats Min','xg_field','stats xG','xa_field','passing xA',
    'xag_not_substituted_for_xa',true,
    'domestic_league_only',true
  ),
  jsonb_build_object(
    'source_table','public.research_c0197_player_match_evidence',
    'source_player_code',player_code,'destination_team_code',team_code,
    'source_keys',to_jsonb(source_keys),'source_commit_shas',to_jsonb(source_commits),
    'first_captured_at',first_captured_at,'last_captured_at',last_captured_at,
    'identity_method','stable_fpl_player_code','team_count',team_count
  ),
  'TEST','ELIGIBLE',
  jsonb_build_object(
    'change_id','C0206','cohort','2024-2025_to_2025-2026',
    'cohort_role','latest eligible foreign-to-PL holdout',
    'source_league','La Liga','test_only',true,'used_for_fitting',false,'used_for_transform_scale',false,
    'source_minute_gate',450,'destination_minute_gate',450,
    'source_metric_consistency','xG and minutes from domestic standard table; true xA from domestic passing table; identical player-season 90s checked by source tables',
    'goalkeepers_excluded',true,'missing_data_is_not_zero',true,
    'current_2026_27_target_outcomes_used',false,'historical_forecasts_rewritten',false
  ),true,false
from named
where destination_minutes>=450 and team_count=1
  and destination_xg is not null and destination_xa is not null
on conflict(pair_key) do nothing;
