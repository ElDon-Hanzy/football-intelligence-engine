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

function topOutcome(markets:any):Outcome|null{
  const h=Number(markets?.home_win),d=Number(markets?.draw),a=Number(markets?.away_win);
  if(![h,d,a].every(Number.isFinite))return null;
  if(h>=d&&h>=a)return 'H';
  if(a>=d&&a>=h)return 'A';
  return 'D';
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
  const top=topOutcome(pred.markets);
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

  const hVenueXg=value(homeId,'XG_FOR_AVG',10,'HOME'),aVenueXg=value(awayId,'XG_FOR_AVG',10,'AWAY');
  higher('VENUE_ATTACK_XG',hVenueXg,aVenueXg,.25,.89,(_fav,h,a)=>`${homeName}'s last 10 home league matches average ${dec(h)} xG; ${awayName}'s last 10 away matches ${dec(a)} xG.`);

  const hVenueXga=value(homeId,'XG_AGAINST_AVG',10,'HOME'),aVenueXga=value(awayId,'XG_AGAINST_AVG',10,'AWAY');
  lower('VENUE_DEFENCE_XG',hVenueXga,aVenueXga,.25,.87,(_fav,h,a)=>`${homeName}'s last 10 home league matches average ${dec(h)} xGA; ${awayName}'s last 10 away matches ${dec(a)} xGA.`);

  const hVenueWin=value(homeId,'WIN_RATE',10,'HOME'),aVenueWin=value(awayId,'WIN_RATE',10,'AWAY');
  higher('VENUE_RESULTS',hVenueWin,aVenueWin,.15,.84,(_fav,h,a)=>`${homeName} have won ${pct(h)} of their last 10 home league matches; ${awayName} have won ${pct(a)} of their last 10 away matches.`);

  const hRecentGF=value(homeId,'GOALS_FOR_AVG',5,'ALL'),hRecentGA=value(homeId,'GOALS_AGAINST_AVG',5,'ALL');
  const aRecentGF=value(awayId,'GOALS_FOR_AVG',5,'ALL'),aRecentGA=value(awayId,'GOALS_AGAINST_AVG',5,'ALL');
  if(hRecentGF!=null&&hRecentGA!=null&&aRecentGF!=null&&aRecentGA!=null){
    const hBalance=hRecentGF-hRecentGA,aBalance=aRecentGF-aRecentGA;
    higher('RECENT_GOAL_BALANCE',hBalance,aBalance,.30,.82,(_fav,h,a)=>`Across the last five league matches, ${homeName}'s goal balance is ${h>=0?'+':''}${dec(h)} per match vs ${awayName} ${a>=0?'+':''}${dec(a)}.`);
  }

  const hFts=value(homeId,'FAILED_TO_SCORE',10,'ALL'),aFts=value(awayId,'FAILED_TO_SCORE',10,'ALL');
  lower('SCORING_RELIABILITY',hFts,aFts,.15,.75,(_fav,h,a)=>`${homeName} failed to score in ${pct(h)} of their last 10 league matches; ${awayName} in ${pct(a)}.`);

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
      .eq('as_of_gameweek',asOf).order('id',{ascending:false}).limit(1).maybeSingle();
    if(re)throw re;
    if(!run)return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:false,reason:`No C0162 snapshot after GW${asOf}`}),{headers:cors});

    const [{data:matches,error:me},{data:teams,error:te},{data:card,error:ce},{data:modal,error:moe},{data:recent,error:rre},{data:preds,error:pe},{data:teamStats,error:tse},{data:tactical,error:tme}]=await Promise.all([
      sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('teams').select('id,name,short_name'),
      sb.from('current_fixture_card_facts_v01').select('id,snapshot_run_id,match_id,team_id,opponent_team_id,fact_type,usefulness_score,card_rank,alignment,one_liner,payload,evidence_cutoff').eq('snapshot_run_id',run.id).eq('gameweek',gw).order('match_id').order('card_rank'),
      sb.from('current_fixture_modal_facts_v01').select('id,snapshot_run_id,match_id,team_id,opponent_team_id,fact_type,usefulness_score,candidate_rank,card_rank,alignment,one_liner,payload,evidence_cutoff').eq('snapshot_run_id',run.id).eq('gameweek',gw).order('match_id').order('usefulness_score',{ascending:false}),
      sb.from('team_recent_epl_result_snapshots').select('team_id,sequence_no,opponent_team_id,fixture_kickoff,venue,goals_for,goals_against,result').eq('snapshot_run_id',run.id).order('team_id').order('sequence_no'),
      sb.from('current_production_fixture_prediction_v01').select('id,match_id,captured_at,markets,home_lambda,away_lambda,source_snapshot').eq('gameweek',gw),
      sb.from('team_fact_snapshots').select('id,team_id,fact_type,window_matches,venue_scope,numeric_value,sample_size,payload').eq('snapshot_run_id',run.id),
      sb.from('current_fixture_tactical_matchups').select('id,match_id,team_id,opponent_team_id,kickoff_time,evidence_cutoff,signal_key,score,direction,confidence,model_effect_enabled').eq('gameweek',gw)
    ]);
    if(me)throw me;if(te)throw te;if(ce)throw ce;if(moe)throw moe;if(rre)throw rre;if(pe)throw pe;if(tse)throw tse;if(tme)throw tme;
    const tm=new Map((teams||[]).map((x:any)=>[Number(x.id),x]));
    const predBy=new Map((preds||[]).map((x:any)=>[Number(x.match_id),x]));
    const cardBy=new Map<number,any[]>(),modalBy=new Map<number,any[]>(),recentBy=new Map<number,any[]>();
    const statBy=new Map<string,StatRow>();
    for(const x of card||[]){const k=Number(x.match_id);if(!cardBy.has(k))cardBy.set(k,[]);cardBy.get(k)!.push(x)}
    for(const x of modal||[]){const k=Number(x.match_id);if(!modalBy.has(k))modalBy.set(k,[]);modalBy.get(k)!.push(x)}
    for(const x of recent||[]){const k=Number(x.team_id);if(!recentBy.has(k))recentBy.set(k,[]);recentBy.get(k)!.push({...x,opponent_name:tm.get(Number(x.opponent_team_id))?.name||null,opponent_short:tm.get(Number(x.opponent_team_id))?.short_name||null})}
    for(const x of teamStats||[]){statBy.set(statKey(Number(x.team_id),String(x.fact_type),x.window_matches==null?null:Number(x.window_matches),x.venue_scope==null?null:String(x.venue_scope)),x as StatRow)}
    const fixtures=(matches||[]).map((m:any)=>{
      const pred:any=predBy.get(Number(m.id))||null;
      const contextFacts=buildContextFacts({match:m,pred,run,tm,stats:statBy,tactical:tactical||[]});
      const signedFacts=modalBy.get(Number(m.id))||[];
      return {
        match_id:Number(m.id),gameweek:Number(m.gameweek),kickoff_time:m.kickoff_time,
        home:{id:Number(m.home_team_id),name:tm.get(Number(m.home_team_id))?.name||null,short_name:tm.get(Number(m.home_team_id))?.short_name||null,recent:recentBy.get(Number(m.home_team_id))||[]},
        away:{id:Number(m.away_team_id),name:tm.get(Number(m.away_team_id))?.name||null,short_name:tm.get(Number(m.away_team_id))?.short_name||null,recent:recentBy.get(Number(m.away_team_id))||[]},
        alignment_basis:pred?{snapshot_id:Number(pred.id),captured_at:pred.captured_at,source_change_id:pred.source_snapshot?.change_id||null,top_outcome:topOutcome(pred.markets),markets:pred.markets||{}}:null,
        card_facts:cardBy.get(Number(m.id))||[],modal_facts:[...signedFacts,...contextFacts]
      };
    });
    return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:true,evidence_source:'dynamic_c0166_plus_c0190_context',snapshot_run:run,fixtures}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
