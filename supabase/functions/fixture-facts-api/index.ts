import { createClient } from 'supabase';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};

type Outcome='H'|'D'|'A';
type Alignment='SUPPORTS'|'CONTRADICTS'|'NEUTRAL';
type StatRow={id:number;team_id:number;fact_type:string;window_matches:number|null;venue_scope:string|null;numeric_value:number|string|null;sample_size:number|null;payload:any};

type ContextFact={
  id:number;snapshot_run_id:number;match_id:number;team_id:number;opponent_team_id:number;fact_type:string;
  usefulness_score:number;candidate_rank:number|null;card_rank:null;alignment:Alignment;one_liner:string;payload:any;evidence_cutoff:string;
};

type DecisionTarget='RESULT_DIRECTION'|'HOME_SCORING'|'AWAY_SCORING'|'SCORING_ENVIRONMENT'|'CONFIDENCE_UNCERTAINTY';
type TeamHistory={team_id:number;sample:number;wins:number;draws:number;losses:number;goals_for:number;goals_against:number;unbeaten:number;winless:number;scoring:number;failed_to_score:number;clean_sheets:number;conceding:number};

const round=(value:number,digits=4)=>Number(value.toFixed(digits));
const logContribution=(value:number|null,baseline:number,power:number):number|null=>value!=null&&value>0?round(power*Math.log(value/baseline),6):null;
const sha256=async(value:unknown):Promise<string>=>{
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map((b)=>b.toString(16).padStart(2,'0')).join('');
};

function streak(rows:any[],predicate:(row:any)=>boolean):number{
  let count=0;
  for(const row of [...rows].sort((a,b)=>new Date(b.fixture_kickoff).getTime()-new Date(a.fixture_kickoff).getTime())){
    if(!predicate(row))break;
    count++;
  }
  return count;
}

function teamHistory(teamId:number,allMatches:any[],sampleLimit:number):TeamHistory{
  const rows=allMatches.filter((match:any)=>Number(match.home_team_id)===teamId||Number(match.away_team_id)===teamId)
    .sort((a:any,b:any)=>new Date(a.kickoff_time).getTime()-new Date(b.kickoff_time).getTime())
    .slice(0,Math.max(0,sampleLimit))
    .map((match:any)=>{
      const home=Number(match.home_team_id)===teamId;
      return {fixture_kickoff:match.kickoff_time,goals_for:Number(home?match.home_score:match.away_score),goals_against:Number(home?match.away_score:match.home_score)};
    });
  const sum=(key:'goals_for'|'goals_against')=>rows.reduce((total,row)=>total+row[key],0);
  return {team_id:teamId,sample:rows.length,wins:rows.filter((r)=>r.goals_for>r.goals_against).length,draws:rows.filter((r)=>r.goals_for===r.goals_against).length,losses:rows.filter((r)=>r.goals_for<r.goals_against).length,goals_for:sum('goals_for'),goals_against:sum('goals_against'),unbeaten:streak(rows,(r)=>r.goals_for>=r.goals_against),winless:streak(rows,(r)=>r.goals_for<=r.goals_against),scoring:streak(rows,(r)=>r.goals_for>0),failed_to_score:streak(rows,(r)=>r.goals_for===0),clean_sheets:streak(rows,(r)=>r.goals_against===0),conceding:streak(rows,(r)=>r.goals_against>0)};
}

async function buildDecisionEvidence(args:{match:any;pred:any;tm:Map<number,any>;historyMatches:any[];integrityByTeam:Map<number,any>}):Promise<any>{
  const {match,pred,tm,historyMatches,integrityByTeam}=args;
  if(!pred)return null;
  const homeId=Number(match.home_team_id),awayId=Number(match.away_team_id),homeName=tm.get(homeId)?.name||'Home',awayName=tm.get(awayId)?.name||'Away';
  const source=pred.source_snapshot||{},formula=source.formula||{},homeState=source.home_team_state||{},awayState=source.away_team_state||{};
  const home=teamHistory(homeId,historyMatches,Number(homeState.completed_matches)||0),away=teamHistory(awayId,historyMatches,Number(awayState.completed_matches)||0);
  const league=Number(formula.league_xg)||1.35,attackPower=Number(formula.attack_power)||.9,defencePower=Number(formula.defence_power)||.7;
  const modelInputs=[
    {id:'home_attack_strength',target:'HOME_SCORING' as DecisionTarget,side:'HOME',label:`${homeName} attack strength`,value:numeric(homeState.canonical_attack),weight:attackPower,signed_contribution:logContribution(numeric(homeState.canonical_attack),league,attackPower),source:'source_snapshot.home_team_state.canonical_attack'},
    {id:'away_defence_strength',target:'HOME_SCORING' as DecisionTarget,side:'AWAY',label:`${awayName} defensive allowance`,value:numeric(awayState.canonical_defence),weight:defencePower,signed_contribution:logContribution(numeric(awayState.canonical_defence),league,defencePower),source:'source_snapshot.away_team_state.canonical_defence'},
    {id:'away_attack_strength',target:'AWAY_SCORING' as DecisionTarget,side:'AWAY',label:`${awayName} attack strength`,value:numeric(awayState.canonical_attack),weight:attackPower,signed_contribution:logContribution(numeric(awayState.canonical_attack),league,attackPower),source:'source_snapshot.away_team_state.canonical_attack'},
    {id:'home_defence_strength',target:'AWAY_SCORING' as DecisionTarget,side:'HOME',label:`${homeName} defensive allowance`,value:numeric(homeState.canonical_defence),weight:defencePower,signed_contribution:logContribution(numeric(homeState.canonical_defence),league,defencePower),source:'source_snapshot.home_team_state.canonical_defence'}
  ].filter((row)=>row.value!=null&&row.signed_contribution!=null&&Math.abs(row.signed_contribution)>1e-6).map((row)=>({...row,kind:'MODEL_INPUT',actual_model_input:true,sample:row.side==='HOME'?home.sample:away.sample,cutoff:pred.captured_at,text:`${row.label} contributes ${row.signed_contribution!>0?'+':''}${round(row.signed_contribution!,3)} log-goals to its target.`}));
  const contextFor=(team:TeamHistory,name:string,side:'HOME'|'AWAY',state:any)=>{
    const rate=(v:number)=>team.sample?round(v/team.sample,2):null;
    const facts:any[]=[
      {id:`${side.toLowerCase()}_record`,target:'RESULT_DIRECTION',text:`${name}: ${team.wins}W-${team.draws}D-${team.losses}L from ${team.sample} league matches.`,value:{wins:team.wins,draws:team.draws,losses:team.losses}},
      {id:`${side.toLowerCase()}_scoring`,target:side==='HOME'?'HOME_SCORING':'AWAY_SCORING',text:`${name}: ${team.goals_for} goals in ${team.sample} matches (${rate(team.goals_for)} per match).`,value:{total:team.goals_for,rate:rate(team.goals_for)}},
      {id:`${side.toLowerCase()}_conceding`,target:side==='HOME'?'AWAY_SCORING':'HOME_SCORING',text:`${name}: ${team.goals_against} conceded in ${team.sample} matches (${rate(team.goals_against)} per match).`,value:{total:team.goals_against,rate:rate(team.goals_against)}}
    ];
    if(team.unbeaten>=2)facts.push({id:`${side.toLowerCase()}_unbeaten`,target:'RESULT_DIRECTION',text:`${name} are unbeaten in ${team.unbeaten} league matches (${team.wins}W-${team.draws}D-${team.losses}L overall).`,value:team.unbeaten});
    if(team.winless>=2)facts.push({id:`${side.toLowerCase()}_winless`,target:'RESULT_DIRECTION',text:`${name} are winless in ${team.winless} league matches.`,value:team.winless});
    if(team.scoring>=2)facts.push({id:`${side.toLowerCase()}_scoring_streak`,target:side==='HOME'?'HOME_SCORING':'AWAY_SCORING',text:`${name} have scored in ${team.scoring} consecutive league matches.`,value:team.scoring});
    if(team.failed_to_score>=2)facts.push({id:`${side.toLowerCase()}_fts_streak`,target:side==='HOME'?'HOME_SCORING':'AWAY_SCORING',text:`${name} have failed to score in ${team.failed_to_score} consecutive league matches.`,value:team.failed_to_score});
    if(team.clean_sheets>=2)facts.push({id:`${side.toLowerCase()}_cs_streak`,target:side==='HOME'?'AWAY_SCORING':'HOME_SCORING',text:`${name} have kept ${team.clean_sheets} consecutive clean sheets.`,value:team.clean_sheets});
    if(team.conceding>=2)facts.push({id:`${side.toLowerCase()}_conceding_streak`,target:side==='HOME'?'AWAY_SCORING':'HOME_SCORING',text:`${name} have conceded in ${team.conceding} consecutive league matches.`,value:team.conceding});
    const integrity=integrityByTeam.get(team.team_id),xgSample=Number(integrity?.xg_sample_count)||0,xgf=numeric(state.current_xg_for_90),gf=rate(team.goals_for);
    if(xgSample>0&&xgf!=null)facts.push({id:`${side.toLowerCase()}_process`,target:side==='HOME'?'HOME_SCORING':'AWAY_SCORING',text:`${name}: ${round(xgf,2)} xG per covered match versus ${gf} actual goals per match (${xgSample}/${team.sample} xG coverage).`,value:{xg_rate:round(xgf,2),goal_rate:gf,coverage:xgSample},process_divergence:gf==null?null:round(gf-xgf,2)});
    return facts.map((fact)=>({...fact,kind:'OBSERVED_CONTEXT',side,actual_model_input:false,model_effect_enabled:false,weight:0,signed_contribution:0,sample:team.sample,cutoff:pred.captured_at,source:'reconstructed current-season fixtures capped by source_snapshot.completed_matches'}));
  };
  const context=[...contextFor(home,homeName,'HOME',homeState),...contextFor(away,awayName,'AWAY',awayState)];
  const markets=pred.markets||{},outcomes=[['HOME',numeric(markets.home_win)],['DRAW',numeric(markets.draw)],['AWAY',numeric(markets.away_win)]].filter((x)=>x[1]!=null).sort((a:any,b:any)=>b[1]-a[1]);
  const margin=outcomes.length>1?Number(outcomes[0][1])-Number(outcomes[1][1]):null;
  const risks:any[]=[];
  if(margin==null||margin<.08||pred.result_decision==='NO_MEANINGFUL_EDGE')risks.push({id:'result_margin',target:'RESULT_DIRECTION',text:`The leading 1X2 outcome is separated by only ${margin==null?'an unavailable':`${round(margin*100,1)} percentage-point`} margin.`,severity:margin==null?'HIGH':margin<.04?'HIGH':'MEDIUM'});
  if(pred.scoring_environment_state==='BLENDED_NEAR_TIE')risks.push({id:'environment_near_tie',target:'SCORING_ENVIRONMENT',text:'The two leading scoring environments are a near-tie; the full distribution matters more than the label.',severity:'MEDIUM'});
  for(const fact of context.filter((x:any)=>x.process_divergence!=null&&Math.abs(x.process_divergence)>=.35))risks.push({id:`${fact.id}_divergence`,target:fact.target,text:`Result and process diverge: ${fact.text}`,severity:'MEDIUM'});
  if(home.sample<5||away.sample<5)risks.push({id:'thin_sample',target:'CONFIDENCE_UNCERTAINTY',text:`Current-season samples remain thin (${homeName} ${home.sample}, ${awayName} ${away.sample}); prior influence is ${Math.round(Number(homeState.prior_season_weight||0)*100)}%/${Math.round(Number(awayState.prior_season_weight||0)*100)}%.`,severity:'HIGH'});
  const favourite=pred.result_decision==='HOME'?homeName:pred.result_decision==='AWAY'?awayName:null;
  const conflict=context.find((x:any)=>x.target==='RESULT_DIRECTION'&&((pred.result_decision==='HOME'&&x.side==='AWAY'&&/unbeaten/i.test(x.text))||(pred.result_decision==='AWAY'&&x.side==='HOME'&&/unbeaten/i.test(x.text))));
  if(conflict)risks.push({id:'directional_form_conflict',target:'RESULT_DIRECTION',text:`Counter-signal to the ${favourite} lean: ${conflict.text}`,severity:'MEDIUM'});
  const synthesis=pred.result_decision==='NO_MEANINGFUL_EDGE'?`No result direction clears the model-error threshold. The scoring-environment distribution is retained without manufacturing a draw call.`:`The net ${String(pred.result_decision).toLowerCase()} lean comes from the weighted attack/defence inputs. ${conflict?`It is tempered by ${conflict.text}`:'No stronger chronology-safe result conflict overturns it.'}`;
  const targets=(['RESULT_DIRECTION','HOME_SCORING','AWAY_SCORING','SCORING_ENVIRONMENT','CONFIDENCE_UNCERTAINTY'] as DecisionTarget[]).map((target)=>({target,model_inputs:modelInputs.filter((x)=>x.target===target),observed_context:context.filter((x)=>x.target===target),risks:risks.filter((x)=>x.target===target)}));
  const homeLambda=numeric(pred.home_lambda),awayLambda=numeric(pred.away_lambda);
  const homeIntegrity=integrityByTeam.get(homeId),awayIntegrity=integrityByTeam.get(awayId),homeXgSample=Number(homeIntegrity?.xg_sample_count)||0,awayXgSample=Number(awayIntegrity?.xg_sample_count)||0;
  const reliability={classification:Math.min(home.sample,away.sample)>=5&&Math.min(homeXgSample,awayXgSample)>=5?'MODERATE':'LIMITED',home:{result_sample:home.sample,xg_sample:homeXgSample,prior_weight:numeric(homeState.prior_season_weight)},away:{result_sample:away.sample,xg_sample:awayXgSample,prior_weight:numeric(awayState.prior_season_weight)},missing_is_not_zero:true};
  const playerImplications={scope:'TEAM_SCORING_TO_PLAYER_DISCOVERY_ONLY',publication_authority:false,requires_p7_lineage:true,home:`${homeName} attacking-player upside should be evaluated against ${homeLambda==null?'unavailable':homeLambda.toFixed(2)} projected team goals; no individual is promoted without the matching frozen player run.`,away:`${awayName} attacking-player upside should be evaluated against ${awayLambda==null?'unavailable':awayLambda.toFixed(2)} projected team goals; no individual is promoted without the matching frozen player run.`};
  const conclusion={result_decision:pred.result_decision,result_margin:margin==null?null:round(margin,4),scoring_environment:pred.primary_environment,scoring_environment_state:pred.scoring_environment_state,home_projected_goals:homeLambda,away_projected_goals:awayLambda};
  const contract={contract_version:'c0284_decision_evidence_v01',snapshot_id:Number(pred.snapshot_id),match_id:Number(match.id),gameweek:Number(match.gameweek),cutoff:pred.captured_at,decision_hash:pred.decision_hash,conclusion,targets,reliability,synthesis,player_implications:playerImplications,research_only_context:{model_effect_enabled:false,items:[]},audit:{chronology_safe:true,history_sample_matches_source_state:home.sample===Number(homeState.completed_matches)&&away.sample===Number(awayState.completed_matches),all_model_inputs_have_nonzero_signed_contribution:modelInputs.every((x)=>x.signed_contribution!==0),model_outputs_not_repeated_as_independent_evidence:true,decision_targets_complete:targets.length===5,risks_are_targeted:risks.every((x)=>Boolean(x.target)),player_implication_is_non_authorizing:playerImplications.publication_authority===false&&playerImplications.requires_p7_lineage===true,missing_is_not_zero:true,historical_forecasts_rewritten:false}};
  return {...contract,evidence_hash:await sha256(contract)};
}

function canonicalOutcome(pred:any):Outcome|null{
  const decision=String(pred?.result_decision||'');
  if(decision==='HOME'||decision==='H')return 'H';
  if(decision==='AWAY'||decision==='A')return 'A';
  if(decision==='DRAW'||decision==='D')return 'D';
  return null;
}

function numeric(value:any):number|null{
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}

function pct(value:number):string{return `${Math.round(value*100)}%`}
function dec(value:number):string{return value.toFixed(2)}

function statKey(teamId:number,factType:string,windowMatches:number|null,venueScope:string|null):string{
  return `${teamId}|${factType}|${windowMatches??'null'}|${venueScope??'null'}`;
}

function alignmentForTeam(favouredTeamId:number,top:Outcome|null,homeId:number,awayId:number):Alignment{
  if(top==='H')return favouredTeamId===homeId?'SUPPORTS':'CONTRADICTS';
  if(top==='A')return favouredTeamId===awayId?'SUPPORTS':'CONTRADICTS';
  return 'NEUTRAL';
}

function buildContextFacts(args:{
  match:any;pred:any;run:any;tm:Map<number,any>;stats:Map<string,StatRow>;tactical:any[];
}):ContextFact[]{
  const {match,pred,run,tm,stats,tactical}=args;
  if(!pred)return [];
  const matchId=Number(match.id),homeId=Number(match.home_team_id),awayId=Number(match.away_team_id);
  const homeName=tm.get(homeId)?.name||'Home',awayName=tm.get(awayId)?.name||'Away';
  const top=canonicalOutcome(pred);
  const facts:ContextFact[]=[];
  let seq=1;
  const get=(teamId:number,type:string,window:number|null,venue:string|null):StatRow|undefined=>stats.get(statKey(teamId,type,window,venue));
  const value=(teamId:number,type:string,window:number|null,venue:string|null):number|null=>numeric(get(teamId,type,window,venue)?.numeric_value);
  const sample=(teamId:number,type:string,window:number|null,venue:string|null):number|null=>get(teamId,type,window,venue)?.sample_size??null;
  const push=(family:string,favouredTeamId:number,usefulness:number,oneLiner:string,payload:any={},evidenceCutoff=run.evidence_cutoff)=>{
    const opponent=favouredTeamId===homeId?awayId:homeId;
    facts.push({
      id:2_000_000_000+matchId*100+seq++,snapshot_run_id:Number(run.id),match_id:matchId,team_id:favouredTeamId,opponent_team_id:opponent,
      fact_type:`C0190_${family}`,usefulness_score:usefulness,candidate_rank:null,card_rank:null,
      alignment:alignmentForTeam(favouredTeamId,top,homeId,awayId),one_liner:oneLiner,
      payload:{family,source:'C0190 human matchup context',actual_model_input:false,model_effect_enabled:false,...payload},evidence_cutoff:evidenceCutoff
    });
  };
  const higher=(family:string,homeValue:number|null,awayValue:number|null,threshold:number,usefulness:number,line:(favName:string,h:number,a:number)=>string,payload:any={})=>{
    if(homeValue==null||awayValue==null||Math.abs(homeValue-awayValue)<threshold)return;
    const fav=homeValue>awayValue?homeId:awayId;
    push(family,fav,usefulness,line(fav===homeId?homeName:awayName,homeValue,awayValue),payload);
  };
  const lower=(family:string,homeValue:number|null,awayValue:number|null,threshold:number,usefulness:number,line:(favName:string,h:number,a:number)=>string,payload:any={})=>{
    if(homeValue==null||awayValue==null||Math.abs(homeValue-awayValue)<threshold)return;
    const fav=homeValue<awayValue?homeId:awayId;
    push(family,fav,usefulness,line(fav===homeId?homeName:awayName,homeValue,awayValue),payload);
  };

  const baselineHome=numeric(pred.source_snapshot?.baseline_c0159_home_lambda);
  const baselineAway=numeric(pred.source_snapshot?.baseline_c0159_away_lambda);
  if(baselineHome!=null&&baselineAway!=null&&Math.abs(baselineHome-baselineAway)>=0.03){
    const fav=baselineHome>baselineAway?homeId:awayId;
    push('BASELINE_MODEL',fav,.97,`Before current-form evidence adjustments, the structural model slightly favoured ${fav===homeId?homeName:awayName}: ${dec(baselineHome)} vs ${dec(baselineAway)} expected goals.`,{baseline_home_lambda:baselineHome,baseline_away_lambda:baselineAway});
  }

  const hSeasonN=sample(homeId,'CURRENT_SEASON_WIN_RATE',null,'ALL'),aSeasonN=sample(awayId,'CURRENT_SEASON_WIN_RATE',null,'ALL');
  const hWin=value(homeId,'CURRENT_SEASON_WIN_RATE',null,'ALL'),aWin=value(awayId,'CURRENT_SEASON_WIN_RATE',null,'ALL');
  higher('SEASON_RESULTS',hWin,aWin,.20,.79,(_fav,h,a)=>`${homeName} have won ${Math.round(h*(hSeasonN||0))}/${hSeasonN||0} league matches this season; ${awayName} ${Math.round(a*(aSeasonN||0))}/${aSeasonN||0}.`,{home_sample:hSeasonN,away_sample:aSeasonN});

  const hGF=value(homeId,'CURRENT_SEASON_GOALS_FOR_AVG',null,'ALL'),aGF=value(awayId,'CURRENT_SEASON_GOALS_FOR_AVG',null,'ALL');
  higher('SEASON_SCORING',hGF,aGF,.40,.77,(_fav,h,a)=>`${homeName} are scoring ${dec(h)} goals per league match this season vs ${awayName} ${dec(a)} (${Math.min(hSeasonN||0,aSeasonN||0)} matches each).`,{home_sample:hSeasonN,away_sample:aSeasonN});

  const hGA=value(homeId,'CURRENT_SEASON_GOALS_AGAINST_AVG',null,'ALL'),aGA=value(awayId,'CURRENT_SEASON_GOALS_AGAINST_AVG',null,'ALL');
  lower('SEASON_DEFENCE',hGA,aGA,.35,.76,(_fav,h,a)=>`${homeName} have conceded ${dec(h)} goals per league match this season vs ${awayName} ${dec(a)} (${Math.min(hSeasonN||0,aSeasonN||0)} matches each).`,{home_sample:hSeasonN,away_sample:aSeasonN});

  const hCS=value(homeId,'CURRENT_SEASON_CLEAN_SHEETS',null,'ALL'),aCS=value(awayId,'CURRENT_SEASON_CLEAN_SHEETS',null,'ALL');
  higher('SEASON_CLEAN_SHEETS',hCS,aCS,.20,.74,(_fav,h,a)=>`${homeName} have kept clean sheets in ${pct(h)} of league matches this season; ${awayName} ${pct(a)}.`,{home_sample:hSeasonN,away_sample:aSeasonN});

  // Deliberately no rolling L5/L10 evidence here. Cross-season rolling windows
  // previously escaped into the public explanation layer and could outweigh or
  // contradict the canonical current-season state.

  const tacticalByKey=new Map<string,any[]>();
  for(const row of tactical||[]){
    if(Number(row.match_id)!==matchId)continue;
    if(new Date(row.evidence_cutoff||0).getTime()>=new Date(match.kickoff_time).getTime())continue;
    if(row.model_effect_enabled===true)continue;
    const key=String(row.signal_key||'');
    if(!['wide_channel_pressure','aerial_set_piece_mismatch','central_creation_vs_block','direct_transition_opportunity'].includes(key))continue;
    if(!tacticalByKey.has(key))tacticalByKey.set(key,[]);
    tacticalByKey.get(key)!.push(row);
  }
  const tacticalLabels:Record<string,string>={
    wide_channel_pressure:'wide-channel pressure',aerial_set_piece_mismatch:'aerial/set-piece matchup',central_creation_vs_block:'central creation matchup',direct_transition_opportunity:'transition opportunity'
  };
  for(const [key,rows] of tacticalByKey){
    const h=rows.find((r:any)=>Number(r.team_id)===homeId),a=rows.find((r:any)=>Number(r.team_id)===awayId);
    const hs=numeric(h?.score),as=numeric(a?.score),hc=numeric(h?.confidence),ac=numeric(a?.confidence);
    if(hs==null||as==null||hc==null||ac==null||Math.min(hc,ac)<.60||Math.abs(hs-as)<.08)continue;
    const fav=hs>as?homeId:awayId;
    const conf=Math.min(hc,ac);
    push(`TACTICAL_${key.toUpperCase()}`,fav,.73,`Tactical research currently gives ${fav===homeId?homeName:awayName} the stronger ${tacticalLabels[key]} (${Math.round(conf*100)}% confidence).`,{research_only:true,signal_key:key,home_score:hs,away_score:as,confidence:conf},fav===homeId?h.evidence_cutoff:a.evidence_cutoff);
  }

  return facts;
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||0);
    if(!Number.isInteger(gw)||gw<1||gw>38)throw new Error('Valid gw required');
    const asOf=gw-1;
    if(asOf<1)return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:false,reason:'No prior completed gameweek fact snapshot'}),{headers:cors});

    const {data:run,error:re}=await sb.from('team_fact_snapshot_runs')
      .select('id,as_of_gameweek,evidence_cutoff,source_match_cutoff,created_at,canonical_version')
      .lte('as_of_gameweek',asOf).order('as_of_gameweek',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle();
    if(re)throw re;
    if(!run)return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:false,reason:`No chronology-safe fact baseline exists before GW${gw}`}),{headers:cors});

    const [{data:matches,error:me},{data:teams,error:te},{data:modal,error:moe},{data:recent,error:rre},{data:preds,error:pe},{data:teamStats,error:tse},{data:tactical,error:tme},{data:historyMatches,error:hme},{data:integrity,error:ie}]=await Promise.all([
      sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('teams').select('id,name,short_name'),
      sb.from('current_fixture_modal_facts_v01').select('id,snapshot_run_id,match_id,team_id,opponent_team_id,fact_type,usefulness_score,candidate_rank,card_rank,alignment,one_liner,payload,evidence_cutoff').eq('gameweek',gw).order('match_id').order('usefulness_score',{ascending:false}),
      sb.from('team_recent_epl_result_snapshots').select('team_id,sequence_no,opponent_team_id,fixture_kickoff,venue,goals_for,goals_against,result').eq('snapshot_run_id',run.id).order('team_id').order('sequence_no'),
      sb.from('current_fixture_decision_contract_v01').select('snapshot_id,match_id,captured_at,markets,home_lambda,away_lambda,source_snapshot,result_decision,decision_contract_version,decision_hash').eq('gameweek',gw),
      sb.from('team_fact_snapshots').select('id,team_id,fact_type,window_matches,venue_scope,numeric_value,sample_size,payload').eq('snapshot_run_id',run.id),
      sb.from('current_fixture_tactical_matchups').select('id,match_id,team_id,opponent_team_id,kickoff_time,evidence_cutoff,signal_key,score,direction,confidence,model_effect_enabled').eq('gameweek',gw),
      sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id,home_score,away_score,finished').eq('source','fpl').eq('finished',true).lt('gameweek',gw).order('kickoff_time'),
      sb.from('current_season_state_integrity_v01').select('team_id,as_of,state_result_sample_count,result_sample_count,xg_sample_count,result_sample_ok,result_totals_ok,weight_schedule_ok,full_xg_coverage,integrity_status')
    ]);
    if(me)throw me;if(te)throw te;if(moe)throw moe;if(rre)throw rre;if(pe)throw pe;if(tse)throw tse;if(tme)throw tme;if(hme)throw hme;if(ie)throw ie;
    const tm=new Map((teams||[]).map((x:any)=>[Number(x.id),x]));
    const predBy=new Map((preds||[]).map((x:any)=>[Number(x.match_id),x]));
    const modalBy=new Map<number,any[]>(),recentBy=new Map<number,any[]>();
    const statBy=new Map<string,StatRow>();
    const integrityByTeam=new Map((integrity||[]).map((x:any)=>[Number(x.team_id),x]));
    for(const x of modal||[]){const k=Number(x.match_id);if(!modalBy.has(k))modalBy.set(k,[]);modalBy.get(k)!.push(x)}
    for(const x of recent||[]){const k=Number(x.team_id);if(!recentBy.has(k))recentBy.set(k,[]);recentBy.get(k)!.push({...x,opponent_name:tm.get(Number(x.opponent_team_id))?.name||null,opponent_short:tm.get(Number(x.opponent_team_id))?.short_name||null})}
    for(const x of teamStats||[]){statBy.set(statKey(Number(x.team_id),String(x.fact_type),x.window_matches==null?null:Number(x.window_matches),x.venue_scope==null?null:String(x.venue_scope)),x as StatRow)}
    const fixtures=await Promise.all((matches||[]).map(async(m:any)=>{
      const pred:any=predBy.get(Number(m.id))||null;
      const decisionEvidence=await buildDecisionEvidence({match:m,pred,tm,historyMatches:historyMatches||[],integrityByTeam});
      const contextFacts=buildContextFacts({match:m,pred,run,tm,stats:statBy,tactical:tactical||[]});
      // C0280 explanation rows are keyed to the immutable fixture prediction
      // snapshot, not the team-fact snapshot run. Exact alignment is mandatory.
      const signedFacts=(modalBy.get(Number(m.id))||[]).filter((x:any)=>Number(x.snapshot_run_id)===Number(pred?.snapshot_id));
      const mergedFacts=[...signedFacts,...contextFacts]
        .filter((x:any)=>!/(^|_)(L5|L10|L20)(_|$)|last\s+(five|10|ten|20|twenty)/i.test(`${x.fact_type} ${x.one_liner}`))
        .sort((a:any,b:any)=>Number(b.usefulness_score)-Number(a.usefulness_score));
      return {
        match_id:Number(m.id),gameweek:Number(m.gameweek),kickoff_time:m.kickoff_time,
        home:{id:Number(m.home_team_id),name:tm.get(Number(m.home_team_id))?.name||null,short_name:tm.get(Number(m.home_team_id))?.short_name||null,recent:recentBy.get(Number(m.home_team_id))||[]},
        away:{id:Number(m.away_team_id),name:tm.get(Number(m.away_team_id))?.name||null,short_name:tm.get(Number(m.away_team_id))?.short_name||null,recent:recentBy.get(Number(m.away_team_id))||[]},
        alignment_basis:pred?{snapshot_id:Number(pred.snapshot_id),captured_at:pred.captured_at,source_change_id:pred.source_snapshot?.change_id||null,top_outcome:canonicalOutcome(pred),result_decision:pred.result_decision,decision_contract_version:pred.decision_contract_version,decision_hash:pred.decision_hash,markets:pred.markets||{}}:null,
        decision_evidence:decisionEvidence,
        card_facts:mergedFacts.filter((x:any)=>x.alignment==='SUPPORTS').slice(0,3),modal_facts:mergedFacts
      };
    }));
    return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:true,evidence_source:'c0284_decision_evidence_v01_with_legacy_compatibility',decision_evidence_contract:'c0284_decision_evidence_v01',snapshot_run:run,legacy_snapshot_is_current:run.as_of_gameweek===asOf,fixtures}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
