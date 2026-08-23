-- Final Role / Tactical Intelligence v0.1 refresh functions.
-- Automated role labels are event archetypes, not asserted exact tactical positions.
-- Team box-pressure column is retained for schema compatibility but v0.1.1 semantics are attacking box occupation, not defensive pressing.

create or replace function public.refresh_player_role_profiles()
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare v_now timestamptz:=clock_timestamp();v_inserted integer:=0;
begin
  with event_rows as materialized (
    select pm.player_id,p.position,m.kickoff_time,pm.minutes,
      case when pm.source='fpl_core_insights_premier_league' then 1::numeric else .3::numeric end w,
      pm.source,pm.raw
    from public.player_matches pm
    join public.players p on p.id=pm.player_id
    join public.matches m on m.id=pm.match_id
    where pm.source in ('fpl_core_insights','fpl_core_insights_premier_league') and coalesce(pm.minutes,0)>0 and m.kickoff_time<v_now
  ),agg as materialized (
    select player_id,max(position) position,max(kickoff_time) evidence_cutoff,
      sum(minutes*w) weighted_minutes,
      coalesce(sum(minutes) filter(where source='fpl_core_insights_premier_league'),0) competitive_minutes,
      coalesce(sum(minutes) filter(where source='fpl_core_insights'),0) preseason_minutes,
      90*sum(coalesce(private.json_num(raw,'accurate_crosses'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'accurate_crosses') is not null),0) cross90,
      90*sum(coalesce(private.json_num(raw,'final_third_passes'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'final_third_passes') is not null),0) final390,
      90*sum(coalesce(private.json_num(raw,'chances_created'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'chances_created') is not null),0) chance90,
      90*sum(coalesce(private.json_num(raw,'touches_opposition_box'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'touches_opposition_box') is not null),0) box90,
      90*sum(coalesce(private.json_num(raw,'total_shots'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'total_shots') is not null),0) shots90,
      90*sum(coalesce(private.json_num(raw,'xg'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'xg') is not null),0) xg90,
      90*sum(coalesce(private.json_num(raw,'xa'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'xa') is not null),0) xa90,
      90*sum(coalesce(private.json_num(raw,'successful_dribbles'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'successful_dribbles') is not null),0) drib90,
      90*sum(coalesce(private.json_num(raw,'tackles'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'tackles') is not null),0) tackles90,
      90*sum(coalesce(private.json_num(raw,'interceptions'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'interceptions') is not null),0) interc90,
      90*sum(coalesce(private.json_num(raw,'recoveries'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'recoveries') is not null),0) recoveries90,
      90*sum(coalesce(private.json_num(raw,'clearances'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'clearances') is not null),0) clear90,
      90*sum(coalesce(private.json_num(raw,'aerial_duels_won'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'aerial_duels_won') is not null),0) aerial90,
      90*sum(coalesce(private.json_num(raw,'accurate_long_balls'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'accurate_long_balls') is not null),0) long90,
      90*sum(coalesce(private.json_num(raw,'offsides'),0)*w)/nullif(sum(minutes*w) filter(where private.json_num(raw,'offsides') is not null),0) offsides90
    from event_rows group by player_id
  ),scored as materialized (
    select a.player_id,s.role_label,s.score,row_number() over(partition by a.player_id order by s.score desc nulls last,s.role_label) rn
    from agg a cross join lateral (values
      ('GOALKEEPER',case when a.position='GKP' then 1::numeric end),
      ('CENTRE_BACK',case when a.position='DEF' then .35*private.unit_score(coalesce(a.clear90,0),4)+.20*private.unit_score(coalesce(a.aerial90,0),2.5)+.15*private.unit_score(coalesce(a.interc90,0),1.5)+.15*private.unit_score(coalesce(a.long90,0),4)+.15*private.unit_score(coalesce(a.tackles90,0),2) end),
      ('WIDE_BACK',case when a.position='DEF' then .25*private.unit_score(coalesce(a.cross90,0),1.5)+.25*private.unit_score(coalesce(a.final390,0),8)+.15*private.unit_score(coalesce(a.drib90,0),1)+.20*private.unit_score(coalesce(a.box90,0),2.5)+.15*private.unit_score(coalesce(a.chance90,0),1) end),
      ('HYBRID_DEFENDER',case when a.position='DEF' then .25*private.unit_score(coalesce(a.clear90,0),4)+.15*private.unit_score(coalesce(a.aerial90,0),2.5)+.15*private.unit_score(coalesce(a.tackles90,0),2)+.15*private.unit_score(coalesce(a.cross90,0),1.5)+.15*private.unit_score(coalesce(a.final390,0),8)+.15*private.unit_score(coalesce(a.box90,0),2.5) end),
      ('HOLDING_MIDFIELDER',case when a.position='MID' then .30*private.unit_score(coalesce(a.recoveries90,0),5)+.25*private.unit_score(coalesce(a.tackles90,0),2)+.20*private.unit_score(coalesce(a.interc90,0),1.5)+.15*private.unit_score(coalesce(a.long90,0),4)+.10*private.unit_score(coalesce(a.clear90,0),2) end),
      ('BOX_TO_BOX',case when a.position='MID' then .25*private.unit_score(coalesce(a.recoveries90,0),5)+.20*private.unit_score(coalesce(a.tackles90,0),2)+.20*private.unit_score(coalesce(a.final390,0),9)+.20*private.unit_score(coalesce(a.box90,0),3)+.15*private.unit_score(coalesce(a.shots90,0),2) end),
      ('CREATOR_10',case when a.position='MID' then .30*private.unit_score(coalesce(a.chance90,0),1.8)+.25*private.unit_score(coalesce(a.xa90,0),.28)+.25*private.unit_score(coalesce(a.final390,0),9)+.20*private.unit_score(coalesce(a.box90,0),3) end),
      ('WIDE_ATTACKER',case when a.position='MID' then .25*private.unit_score(coalesce(a.cross90,0),1.6)+.25*private.unit_score(coalesce(a.drib90,0),1.5)+.25*private.unit_score(coalesce(a.box90,0),3)+.15*private.unit_score(coalesce(a.shots90,0),2.2)+.10*private.unit_score(coalesce(a.chance90,0),1.5) end),
      ('CENTRAL_STRIKER',case when a.position='FWD' then .35*private.unit_score(coalesce(a.xg90,0),.38)+.25*private.unit_score(coalesce(a.box90,0),4)+.20*private.unit_score(coalesce(a.shots90,0),2.5)+.10*private.unit_score(coalesce(a.offsides90,0),.6)+.10*private.unit_score(coalesce(a.aerial90,0),2) end),
      ('LINK_FORWARD',case when a.position='FWD' then .30*private.unit_score(coalesce(a.xa90,0),.25)+.25*private.unit_score(coalesce(a.chance90,0),1.5)+.25*private.unit_score(coalesce(a.final390,0),7)+.20*private.unit_score(coalesce(a.box90,0),3) end),
      ('WIDE_FORWARD',case when a.position='FWD' then .30*private.unit_score(coalesce(a.drib90,0),1.5)+.25*private.unit_score(coalesce(a.cross90,0),1.2)+.20*private.unit_score(coalesce(a.box90,0),3.5)+.15*private.unit_score(coalesce(a.shots90,0),2.3)+.10*private.unit_score(coalesce(a.xa90,0),.25) end),
      ('TARGET_FORWARD',case when a.position='FWD' then .35*private.unit_score(coalesce(a.aerial90,0),2.5)+.30*private.unit_score(coalesce(a.box90,0),4)+.20*private.unit_score(coalesce(a.xg90,0),.4)+.15*private.unit_score(coalesce(a.chance90,0),1.2) end)
    ) s(role_label,score) where s.score is not null
  ),top2 as materialized (
    select player_id,max(role_label) filter(where rn=1) top_role,max(score) filter(where rn=1) top_score,max(role_label) filter(where rn=2) second_role,max(score) filter(where rn=2) second_score from scored group by player_id
  ),final_roles as materialized (
    select a.*,t.top_role,t.top_score,t.second_role,t.second_score,
      case when a.weighted_minutes<90 or coalesce(t.top_score,0)<.18 then 'UNRESOLVED' else t.top_role end primary_role,
      case when a.weighted_minutes<90 or coalesce(t.top_score,0)<.18 then t.top_role else t.second_role end secondary_role,
      case when a.weighted_minutes<90 or coalesce(t.top_score,0)<.18 then least(.50,.15+.35*(1-exp(-a.weighted_minutes/240))) else least(.92,.28+.38*(1-exp(-a.weighted_minutes/240))+.20*least(1,greatest(0,(coalesce(t.top_score,0)-coalesce(t.second_score,0))/.18))+.14*least(1,a.competitive_minutes/270)) end confidence
    from agg a join top2 t using(player_id)
  ),ins as (
    insert into public.player_role_profile_observations(player_id,observed_at,evidence_cutoff,taxonomy_version,primary_role,secondary_role,primary_score,secondary_score,confidence,weighted_minutes,competitive_minutes,preseason_minutes,feature_vector,evidence,observation_hash,model_effect_enabled)
    select f.player_id,v_now,f.evidence_cutoff,'event_role_v0.1',f.primary_role,f.secondary_role,round(f.top_score,4),round(f.second_score,4),round(f.confidence,4),round(f.weighted_minutes,2),round(f.competitive_minutes,2),round(f.preseason_minutes,2),
      jsonb_build_object('cross90',round(f.cross90,4),'final_third_passes90',round(f.final390,4),'chances_created90',round(f.chance90,4),'box_touches90',round(f.box90,4),'shots90',round(f.shots90,4),'xg90',round(f.xg90,4),'xa90',round(f.xa90,4),'dribbles90',round(f.drib90,4),'tackles90',round(f.tackles90,4),'interceptions90',round(f.interc90,4),'recoveries90',round(f.recoveries90,4),'clearances90',round(f.clear90,4),'aerials_won90',round(f.aerial90,4),'long_balls90',round(f.long90,4),'offsides90',round(f.offsides90,4)),
      jsonb_build_object('method','heuristic_event_profile_v0.1_sql','fpl_position_guardrail',f.position,'source_weights',jsonb_build_object('premier_league',1,'friendlies',.3),'manual_research_kept_separate',true,'role_is_archetype_not_exact_tactical_position',true,'model_effect_enabled',false),
      md5(jsonb_build_object('player_id',f.player_id,'taxonomy','event_role_v0.1','primary_role',f.primary_role,'secondary_role',f.secondary_role,'top_score',round(f.top_score,4),'second_score',round(f.second_score,4),'weighted_minutes',round(f.weighted_minutes,2),'competitive_minutes',round(f.competitive_minutes,2),'preseason_minutes',round(f.preseason_minutes,2),'features',jsonb_build_array(round(f.cross90,4),round(f.final390,4),round(f.chance90,4),round(f.box90,4),round(f.shots90,4),round(f.xg90,4),round(f.xa90,4),round(f.drib90,4),round(f.tackles90,4),round(f.interc90,4),round(f.recoveries90,4),round(f.clear90,4),round(f.aerial90,4),round(f.long90,4),round(f.offsides90,4)))::text),false
    from final_roles f on conflict(player_id,observation_hash) do nothing returning 1
  ) select count(*) into v_inserted from ins;
  return jsonb_build_object('ok',true,'inserted',v_inserted,'model_effect_enabled',false,'taxonomy_version','event_role_v0.1');
end $$;
revoke all on function public.refresh_player_role_profiles() from public,anon,authenticated;
grant execute on function public.refresh_player_role_profiles() to service_role;

create or replace function public.refresh_team_tactical_profiles_v011()
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare n integer:=0;v_now timestamptz:=clock_timestamp();
begin
  with team_events as materialized (
    select m.home_team_id team_id,m.kickoff_time,.3::numeric w,false competitive,m.raw,true home from public.matches m join public.teams t on t.id=m.home_team_id where m.source='fpl_core_insights' and m.competition='friendly' and m.finished=true and m.kickoff_time<v_now
    union all
    select m.away_team_id,m.kickoff_time,.3,false,m.raw,false from public.matches m join public.teams t on t.id=m.away_team_id where m.source='fpl_core_insights' and m.competition='friendly' and m.finished=true and m.kickoff_time<v_now
    union all
    select x.team_id,x.fixture_kickoff,case when lower(coalesce(x.raw->>'stats_processed','false'))='true' then 1::numeric else .75::numeric end,true,x.raw,(x.venue='home') from public.team_match_intelligence x join public.teams t on t.id=x.team_id where x.source='fpl_core_insights_premier_league' and x.fixture_kickoff<v_now
  ),raw_metrics as materialized (
    select team_id,kickoff_time,w,competitive,
      private.json_num(raw,case when home then 'home_possession' else 'away_possession' end) possession,
      private.json_num(raw,case when home then 'home_passes' else 'away_passes' end) passes,
      private.json_num(raw,case when home then 'home_opposition_half' else 'away_opposition_half' end) opposition_half,
      private.json_num(raw,case when home then 'home_accurate_long_balls' else 'away_accurate_long_balls' end) long_acc,
      private.json_num(raw,case when home then 'home_accurate_long_balls_pct' else 'away_accurate_long_balls_pct' end) long_pct,
      private.json_num(raw,case when home then 'home_accurate_crosses' else 'away_accurate_crosses' end) cross_acc,
      private.json_num(raw,case when home then 'home_accurate_crosses_pct' else 'away_accurate_crosses_pct' end) cross_pct,
      private.json_num(raw,case when home then 'home_touches_in_opposition_box' else 'away_touches_in_opposition_box' end) box_touches,
      private.json_num(raw,case when home then 'home_expected_goals_xg' else 'away_expected_goals_xg' end) xg,
      private.json_num(raw,case when home then 'home_xg_set_play' else 'away_xg_set_play' end) set_xg,
      private.json_num(raw,case when home then 'home_corners' else 'away_corners' end) corners,
      private.json_num(raw,case when home then 'home_clearances' else 'away_clearances' end) clearances,
      private.json_num(raw,case when home then 'home_interceptions' else 'away_interceptions' end) interceptions,
      private.json_num(raw,case when home then 'home_blocks' else 'away_blocks' end) blocks,
      private.json_num(raw,case when home then 'home_total_shots' else 'away_total_shots' end) shots
    from team_events
  ),vec as materialized (
    select *,case when passes>0 and opposition_half is not null then opposition_half/passes end territory,case when passes>0 and long_acc is not null and long_pct>0 then (long_acc/(long_pct/100))/passes end long_share,case when cross_acc is not null and cross_pct>0 then cross_acc/(cross_pct/100) end crosses_est from raw_metrics where possession is not null
  ),axes as materialized (
    select *,
      .55*greatest(0,least(1,(possession-38)/30))+.45*greatest(0,least(1,(coalesce(territory,.35)-.22)/.30)) control,
      .55*greatest(0,least(1,(coalesce(long_share,.08)-.035)/.13))+.45*greatest(0,least(1,(54-possession)/28)) direct,
      .65*greatest(0,least(1,coalesce(crosses_est,0)/18))+.35*greatest(0,least(1,coalesce(cross_acc,0)/5)) width,
      .40*greatest(0,least(1,coalesce(box_touches,0)/30))+.35*greatest(0,least(1,coalesce(xg,0)/2.2))+.25*greatest(0,least(1,coalesce(shots,0)/18)) box_occupation,
      .60*greatest(0,least(1,case when xg>.15 and set_xg is not null then (set_xg/xg)/.38 else 0 end))+.40*greatest(0,least(1,coalesce(corners,0)/8)) setp,
      .45*greatest(0,least(1,coalesce(clearances,0)/28))+.30*greatest(0,least(1,(58-possession)/30))+.25*greatest(0,least(1,(coalesce(interceptions,0)+coalesce(blocks,0))/12)) defb from vec
  ),a as materialized (
    select team_id,max(kickoff_time) evidence_cutoff,sum(w) weighted_matches,count(*) filter(where competitive) competitive_matches,count(*) filter(where not competitive) preseason_matches,sum(control*w)/sum(w) control,sum(direct*w)/sum(w) direct,sum(width*w)/sum(w) width,sum(box_occupation*w)/sum(w) box_occupation,sum(setp*w)/sum(w) setp,sum(defb*w)/sum(w) defb from axes group by team_id
  ),ranked as materialized (
    select a.team_id,s.style,s.score,row_number() over(partition by a.team_id order by s.score desc,s.style) rn from a cross join lateral (values ('POSSESSION_CONTROL',a.control),('DIRECT_TRANSITION',a.direct),('WIDE_DELIVERY',a.width),('HIGH_BOX_OCCUPATION',a.box_occupation),('SET_PIECE_EMPHASIS',a.setp),('DEEP_DEFENSIVE_BLOCK',a.defb)) s(style,score)
  ),top_style as materialized (
    select team_id,max(style) filter(where rn=1) top_style,max(score) filter(where rn=1) top_score from ranked group by team_id
  ),f as materialized (
    select a.*,case when ts.top_score<.46 then 'BALANCED' else ts.top_style end style_label,least(.90,.30+.42*(1-exp(-a.weighted_matches/2.5))+.18*least(1,a.competitive_matches::numeric/3)) confidence from a join top_style ts using(team_id)
  ),ins as (
    insert into public.team_tactical_profile_observations(team_id,observed_at,evidence_cutoff,taxonomy_version,style_label,possession_control_score,directness_score,width_score,box_pressure_score,set_piece_score,defensive_block_score,confidence,weighted_matches,competitive_matches,preseason_matches,feature_vector,evidence,observation_hash,model_effect_enabled)
    select team_id,v_now,evidence_cutoff,'team_style_v0.1.1',style_label,round(control,4),round(direct,4),round(width,4),round(box_occupation,4),round(setp,4),round(defb,4),round(confidence,4),round(weighted_matches,2),competitive_matches,preseason_matches,
      jsonb_build_object('possession_control',round(control,4),'directness',round(direct,4),'width',round(width,4),'attacking_box_occupation',round(box_occupation,4),'set_piece',round(setp,4),'defensive_block',round(defb,4)),
      jsonb_build_object('method','multi_axis_team_style_v0.1.1_sql','source_weights',jsonb_build_object('premier_league_processed',1,'premier_league_partial',.75,'friendlies',.3),'box_pressure_column_semantics','attacking box occupation/pressure; NOT defensive pressing intensity','pressing_not_modeled_yet',true,'style_label_is_dominant_heuristic_not_formation',true,'model_effect_enabled',false),
      md5(jsonb_build_object('team_id',team_id,'taxonomy','team_style_v0.1.1','style',style_label,'axes',jsonb_build_array(round(control,4),round(direct,4),round(width,4),round(box_occupation,4),round(setp,4),round(defb,4)),'weighted_matches',round(weighted_matches,2),'competitive_matches',competitive_matches,'preseason_matches',preseason_matches)::text),false
    from f on conflict(team_id,observation_hash) do nothing returning 1
  ) select count(*) into n from ins;
  return jsonb_build_object('ok',true,'inserted',n,'taxonomy_version','team_style_v0.1.1','pressing_not_modeled_yet',true,'model_effect_enabled',false);
end $$;
revoke all on function public.refresh_team_tactical_profiles_v011() from public,anon,authenticated;
grant execute on function public.refresh_team_tactical_profiles_v011() to service_role;

create or replace function public.refresh_player_fixture_role_snapshots(p_gameweek integer default null)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare n integer:=0;v_now timestamptz:=clock_timestamp();v_gw integer:=p_gameweek;
begin
  if v_gw is null then select m.gameweek into v_gw from public.matches m where m.source='fpl' and m.gameweek is not null and m.kickoff_time>v_now order by m.kickoff_time limit 1; end if;
  if v_gw is null then return jsonb_build_object('ok',true,'gameweek',null,'inserted',0); end if;
  with future as materialized (select m.id,m.gameweek,m.kickoff_time from public.matches m where m.source='fpl' and m.gameweek=v_gw and m.kickoff_time>v_now),src as materialized (
    select a.id availability_observation_id,a.match_id,a.team_id,a.opponent_team_id,a.player_id,a.expected_xi,a.availability_status,a.confidence availability_confidence,f.kickoff_time fixture_kickoff,rp.observed_at profile_observed_at,rp.taxonomy_version,rp.primary_role,rp.secondary_role,rp.primary_score,rp.secondary_score,rp.confidence role_conf,rp.observation_hash profile_hash
    from public.current_player_fixture_availability a join future f on f.id=a.match_id left join public.current_player_role_profiles rp on rp.player_id=a.player_id and rp.evidence_cutoff<f.kickoff_time
  ),ins as (
    insert into public.player_fixture_role_observations(match_id,gameweek,team_id,opponent_team_id,player_id,kickoff_time,captured_at,profile_observed_at,taxonomy_version,primary_role,secondary_role,primary_score,secondary_score,expected_xi,availability_status,confidence,evidence,observation_hash,model_effect_enabled)
    select match_id,v_gw,team_id,opponent_team_id,player_id,fixture_kickoff,v_now,profile_observed_at,coalesce(taxonomy_version,'event_role_v0.1'),primary_role,secondary_role,primary_score,secondary_score,expected_xi,availability_status,case when role_conf is null then null else least(role_conf,coalesce(availability_confidence,1)) end,
      jsonb_build_object('role_profile_status',case when profile_hash is null then 'NO_EVENT_PROFILE' else 'AVAILABLE' end,'availability_observation_id',availability_observation_id,'role_profile_hash',profile_hash,'role_is_archetype_not_exact_tactical_position',true,'model_effect_enabled',false),
      md5(jsonb_build_object('match_id',match_id,'player_id',player_id,'availability_id',availability_observation_id,'profile_hash',profile_hash,'taxonomy',taxonomy_version,'expected_xi',expected_xi,'availability',availability_status)::text),false
    from src on conflict(match_id,player_id,observation_hash) do nothing returning 1
  ) select count(*) into n from ins;
  return jsonb_build_object('ok',true,'gameweek',v_gw,'inserted',n,'model_effect_enabled',false);
end $$;
revoke all on function public.refresh_player_fixture_role_snapshots(integer) from public,anon,authenticated;
grant execute on function public.refresh_player_fixture_role_snapshots(integer) to service_role;

create or replace function public.refresh_team_fixture_tactical_snapshots(p_gameweek integer default null)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare n integer:=0;v_now timestamptz:=clock_timestamp();v_gw integer:=p_gameweek;
begin
  if v_gw is null then select gameweek into v_gw from public.matches where source='fpl' and gameweek is not null and kickoff_time>v_now order by kickoff_time limit 1; end if;
  if v_gw is null then return jsonb_build_object('ok',true,'gameweek',null,'inserted',0); end if;
  with future as materialized (select id,gameweek,kickoff_time,home_team_id,away_team_id from public.matches where source='fpl' and gameweek=v_gw and kickoff_time>v_now),sides as materialized (
    select id match_id,gameweek,kickoff_time,home_team_id team_id,away_team_id opponent_team_id from future union all select id,gameweek,kickoff_time,away_team_id,home_team_id from future
  ),src as materialized (
    select s.*,tp.observed_at profile_observed_at,tp.taxonomy_version,tp.style_label,tp.possession_control_score,tp.directness_score,tp.width_score,tp.box_pressure_score,tp.set_piece_score,tp.defensive_block_score,tp.confidence,tp.observation_hash profile_hash from sides s left join public.current_team_tactical_profiles tp on tp.team_id=s.team_id and tp.evidence_cutoff<s.kickoff_time
  ),ins as (
    insert into public.team_fixture_tactical_observations(match_id,gameweek,team_id,opponent_team_id,kickoff_time,captured_at,profile_observed_at,taxonomy_version,style_label,possession_control_score,directness_score,width_score,box_pressure_score,set_piece_score,defensive_block_score,confidence,evidence,observation_hash,model_effect_enabled)
    select match_id,gameweek,team_id,opponent_team_id,kickoff_time,v_now,profile_observed_at,coalesce(taxonomy_version,'team_style_v0.1.1'),style_label,possession_control_score,directness_score,width_score,box_pressure_score,set_piece_score,defensive_block_score,confidence,
      jsonb_build_object('tactical_profile_status',case when profile_hash is null then 'NO_PROFILE' else 'AVAILABLE' end,'profile_hash',profile_hash,'box_pressure_score_meaning','attacking box occupation/pressure; NOT defensive pressing intensity','pressing_not_modeled_yet',true,'style_label_is_dominant_heuristic_not_formation',true,'model_effect_enabled',false),
      md5(jsonb_build_object('match_id',match_id,'team_id',team_id,'profile_hash',profile_hash,'taxonomy',taxonomy_version,'style',style_label)::text),false
    from src on conflict(match_id,team_id,observation_hash) do nothing returning 1
  ) select count(*) into n from ins;
  return jsonb_build_object('ok',true,'gameweek',v_gw,'inserted',n,'model_effect_enabled',false);
end $$;
revoke all on function public.refresh_team_fixture_tactical_snapshots(integer) from public,anon,authenticated;
grant execute on function public.refresh_team_fixture_tactical_snapshots(integer) to service_role;
