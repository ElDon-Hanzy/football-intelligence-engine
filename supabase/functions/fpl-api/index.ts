import { createClient } from 'supabase';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const finiteOrNull=(v:any)=>{if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const distributionMeta=(p:any)=>{const d=p?.features?.point_distribution;return{q90:finiteOrNull(p?.q90??d?.q90),q95:finiteOrNull(p?.q95??d?.q95),distribution_version:typeof p?.distribution_version==='string'?p.distribution_version:typeof d?.version==='string'?d.version:null,tail_semantics:typeof p?.tail_semantics==='string'?p.tail_semantics:typeof p?.features?.tail_semantics==='string'?p.features.tail_semantics:null}};
const publicPrediction=(p:any)=>{if(!p)return p;const{features:_features,...rest}=p;return rest};
const ts=(x:any)=>x?new Date(x).getTime():NaN;
const fetchLiveFixtures=async(gw:number)=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),1500);
  try{
    const response=await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`,{headers:{'User-Agent':'FootballIntelligence/0.2'},signal:controller.signal});
    if(!response.ok)return [];
    const data=await response.json();
    return Array.isArray(data)?data:[];
  }catch{return [];}finally{clearTimeout(timeout);}
};

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'),serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}}),u=new URL(req.url),requested=Number(u.searchParams.get('gw')||0);

    const[{data:runs,error:rune},{data:teams,error:te},{data:allPlayers,error:pe}]=await Promise.all([
      sb.from('gameweek_prediction_runs').select('id,model_version_id,gameweek,generated_at,deadline_at,run_type,frozen,excluded_from_backtest,notes,metadata').eq('frozen',true).order('gameweek',{ascending:true}).order('generated_at',{ascending:false}).order('id',{ascending:false}),
      sb.from('teams').select('id,name,short_name'),
      sb.from('players').select('id,web_name,position,team_id,now_cost,selected_by_percent,status,chance_of_playing_next_round,news,updated_at')
    ]);
    if(rune)throw rune;if(te)throw te;if(pe)throw pe;if(!runs?.length)throw new Error('No frozen gameweek snapshots');
    const available=[...new Set((runs||[]).map((r:any)=>Number(r.gameweek)).filter((g:number)=>g>=1&&g<=38))].sort((a,b)=>a-b),gw=requested>=1&&requested<=38?requested:Math.max(...available);

    const{data:dbMatches,error:me}=await sb.from('matches').select('id,fpl_fixture_id,home_team_id,away_team_id,kickoff_time,home_score,away_score,finished,updated_at').eq('source','fpl').eq('gameweek',gw).order('kickoff_time');
    if(me)throw me;if(!dbMatches?.length)throw new Error(`No fixtures for GW${gw}`);
    const firstKickoff=[...(dbMatches||[])].map((m:any)=>ts(m.kickoff_time)).filter(Number.isFinite).sort((a,b)=>a-b)[0],derivedDeadline=Number.isFinite(firstKickoff)?firstKickoff-90*60*1000:NaN,gwRuns=(runs||[]).filter((r:any)=>Number(r.gameweek)===gw),eligible=gwRuns.filter((r:any)=>r.run_type==='pre_deadline'&&r.excluded_from_backtest!==true&&Number.isFinite(ts(r.generated_at))&&((r.deadline_at&&ts(r.generated_at)<ts(r.deadline_at))||(!r.deadline_at&&Number.isFinite(derivedDeadline)&&ts(r.generated_at)<derivedDeadline))),sortLatest=(a:any,b:any)=>ts(b.generated_at)-ts(a.generated_at)||Number(b.id)-Number(a.id),run=[...eligible].sort(sortLatest)[0]||[...gwRuns].sort(sortLatest)[0];
    if(!run)throw new Error(`No frozen snapshot for GW${gw}`);
    const historicalProjectionValid=eligible.some((r:any)=>Number(r.id)===Number(run.id)),deadlineMs=run.deadline_at?ts(run.deadline_at):derivedDeadline,isHistorical=Number.isFinite(deadlineMs)&&Date.now()>=deadlineMs,prevCandidates=(runs||[]).filter((r:any)=>Number(r.gameweek)<gw&&r.run_type==='pre_deadline'&&r.excluded_from_backtest!==true&&(!r.deadline_at||ts(r.generated_at)<ts(r.deadline_at))),prevRun=[...prevCandidates].sort((a:any,b:any)=>Number(b.gameweek)-Number(a.gameweek)||sortLatest(a,b))[0]||null;
    const nowMs=Date.now(),hasStarted=(dbMatches||[]).some((m:any)=>ts(m.kickoff_time)<=nowMs),allFinished=(dbMatches||[]).every((m:any)=>m.finished===true),liveFixturesPromise=hasStarted&&!allFinished?fetchLiveFixtures(gw):Promise.resolve([]);

    const[{data:mv},{data:activeMv},{data:decRaw},{data:rr},fixtures,{data:fixturePreds,error:fpe},{data:prefinal},{data:livePlan}]=await Promise.all([
      sb.from('model_versions').select('version').eq('id',run.model_version_id).single(),
      sb.from('model_versions').select('id,version').eq('is_active',true).single(),
      sb.from('decision_snapshots').select('*').eq('prediction_run_id',run.id).maybeSingle(),
      sb.from('gameweek_result_runs').select('id,observed_at,is_final,metadata').eq('gameweek',gw).order('is_final',{ascending:false}).order('observed_at',{ascending:false}).limit(1).maybeSingle(),
      liveFixturesPromise,
      sb.from('current_production_fixture_prediction_v01').select('id,match_id,captured_at,kickoff_time,is_pre_kickoff,home_lambda,away_lambda,top_scorelines,markets,confidence,headline_score,headline_score_probability,raw_modal_score,raw_modal_probability,script_family,script_confidence,reason_manifest,source_snapshot').eq('gameweek',gw),
      sb.from('current_fpl_prefinal_snapshot_v01').select('prediction_run_id,captured_at,deadline_at,cadence_reason').eq('gameweek',gw).maybeSingle(),
      sb.from('current_fpl_live_plan_v01').select('id,prediction_run_id,publication_status,final_status,execution_authorized,plan,captured_at').eq('gameweek',gw).maybeSingle()
    ]);
    if(fpe)throw fpe;
    const liveFixtureById=new Map((fixtures||[]).map((f:any)=>[Number(f.id),f])),finishedLive=new Set((fixtures||[]).length?(fixtures||[]).filter((f:any)=>f.finished===true||f.finished_provisional===true).map((f:any)=>Number(f.id)):(dbMatches||[]).filter((m:any)=>m.finished===true).map((m:any)=>Number(m.fpl_fixture_id))),snapshotFinishedIds=Array.isArray(rr?.metadata?.finished_fixture_ids)?new Set((rr.metadata.finished_fixture_ids||[]).map((x:any)=>Number(x))):null,rrObserved=rr?ts(rr.observed_at):0,dec=historicalProjectionValid?decRaw:null;
    const livePlanAligned=!isHistorical&&livePlan?.plan&&Number(livePlan?.prediction_run_id)===Number(run.id);
    const currentDecision=livePlanAligned?{
      starting_xi:Array.isArray(livePlan.plan?.starting_xi)?livePlan.plan.starting_xi:[],
      bench:Array.isArray(livePlan.plan?.bench_order)?livePlan.plan.bench_order:[],
      captain_player_id:finiteOrNull(livePlan.plan?.captain_player_id),
      vice_player_id:finiteOrNull(livePlan.plan?.vice_player_id),
      recommendations:{
        source:livePlan.plan?.source||'C0237_ALWAYS_LIVE_PLAN',
        publication_id:livePlan.id,
        publication_status:livePlan.publication_status,
        final_status:livePlan.final_status,
        execution_authorized:Boolean(livePlan.execution_authorized),
        transfers:Array.isArray(livePlan.plan?.transfers)?livePlan.plan.transfers:[],
        chip:livePlan.plan?.chip??'NONE',
        itb_tenths:finiteOrNull(livePlan.plan?.itb_tenths),
        rationale:livePlan.plan?.rationale??null,
        compatibility_semantics:'CURRENT_PREDEADLINE_LIVE_PLAN_OVERLAY_ONLY'
      }
    }:null;
    let ids:number[]=[];
    if(Array.isArray(decRaw?.squad))ids=decRaw.squad.map((x:any)=>Number(x.player_id||x.id)).filter(Boolean);
    if(!ids.length){const{data:sm}=await sb.from('squad_members').select('player_id').eq('active',true);ids=(sm||[]).map((x:any)=>Number(x.player_id))}

    const[{data:allPreds,error:pre},{data:states},prevStatesRes]=await Promise.all([
      sb.from('fpl_public_projection_payload_v01').select('player_id,expected_points,p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_start,p_goal,p_assist,p_clean_sheet,p_dc,p_bonus,expected_minutes,confidence,q90,q95,distribution_version,tail_semantics').eq('prediction_run_id',run.id),
      sb.from('player_state').select('player_id,as_of,expected_minutes,start_probability,role,formation,xg90,xa90,xgi90,shots_box90,big_chances90,cbit90,cbirt90,dc_probability').in('player_id',ids).lte('as_of',run.generated_at).order('as_of',{ascending:false}),
      prevRun?sb.from('player_state').select('player_id,as_of,expected_minutes,start_probability,role,formation,xg90,xa90,xgi90,shots_box90,big_chances90,cbit90,cbirt90,dc_probability').in('player_id',ids).lte('as_of',prevRun.generated_at).order('as_of',{ascending:false}):Promise.resolve({data:[]})
    ]);
    if(pre)throw pre;

    const priceRows:any[]=[];
    if(isHistorical){
      for(let from=0;;from+=1000){
        const{data,error}=await sb.from('fpl_prices').select('player_id,captured_at,gameweek,price,ownership').eq('gameweek',gw).lte('captured_at',run.generated_at).order('captured_at',{ascending:false}).range(from,from+999);
        if(error)throw error;priceRows.push(...(data||[]));if((data||[]).length<1000)break;
      }
    }
    const histPrice=new Map<number,any>();for(const r of priceRows)if(!histPrice.has(Number(r.player_id)))histPrice.set(Number(r.player_id),r);
    const tm=new Map((teams||[]).map((x:any)=>[Number(x.id),x])),pmap=new Map((allPlayers||[]).map((x:any)=>[Number(x.id),x])),predMap=new Map((allPreds||[]).map((x:any)=>[Number(x.player_id),x]));
    const playerMeta=(p:any)=>{
      if(!isHistorical)return{price_tenths:p?.now_cost==null?null:Number(p.now_cost),price:p?.now_cost==null?null:Number(p.now_cost)/10,ownership_percent:finiteOrNull(p?.selected_by_percent),fpl_status:p?.status||null,chance_of_playing_next_round:finiteOrNull(p?.chance_of_playing_next_round),news:p?.news||'',player_metadata_updated_at:p?.updated_at||null,player_metadata_source:'CURRENT_FPL_BOOTSTRAP'};
      const hp=histPrice.get(Number(p?.id));
      return{price_tenths:hp?.price==null?null:Number(hp.price),price:hp?.price==null?null:Number(hp.price)/10,ownership_percent:finiteOrNull(hp?.ownership),fpl_status:null,chance_of_playing_next_round:null,news:'',player_metadata_updated_at:hp?.captured_at||null,player_metadata_source:hp?'FPL_PRICE_SNAPSHOT':'UNAVAILABLE_HISTORICALLY'};
    };

    let allActuals:any[]=[],audit:any=null;
    if(rr){
      const{data:a,error:ae}=await sb.from('player_gameweek_actuals').select('player_id,fixture_ids,minutes,total_points,goals,assists,bonus,bps,defensive_contribution,xg,xa,xgi,xgc,clean_sheets').eq('result_run_id',rr.id);if(ae)throw ae;allActuals=a||[];
      const{data:as}=await sb.from('gameweek_audit_summaries').select('*').eq('prediction_run_id',run.id).eq('result_run_id',rr.id).maybeSingle();audit=as||null;
    }
    const actMap=new Map(allActuals.map((x:any)=>[Number(x.player_id),x])),actualValid=(pid:number)=>{const a=actMap.get(pid);if(!a||!rr)return null;const fids=(a.fixture_ids||[]).map(Number).filter(Number.isFinite);if(!fids.length)return null;if(snapshotFinishedIds)return fids.every((id:number)=>snapshotFinishedIds.has(id))?a:null;const valid=fids.every((id:number)=>{const live:any=liveFixtureById.get(id),db:any=(dbMatches||[]).find((m:any)=>Number(m.fpl_fixture_id)===id),ko=live?.kickoff_time?ts(live.kickoff_time):ts(db?.kickoff_time);return Boolean((live?(live.finished===true||live.finished_provisional===true):db?.finished===true)&&Number.isFinite(ko)&&rrObserved>=ko+105*60*1000)});return valid?a:null},currentByPlayer=new Map<number,any>();for(const s of(states||[]))if(!currentByPlayer.has(Number(s.player_id)))currentByPlayer.set(Number(s.player_id),s);const prevByPlayer=new Map<number,any>();for(const s of(prevStatesRes?.data||[]))if(!prevByPlayer.has(Number(s.player_id)))prevByPlayer.set(Number(s.player_id),s);

    const squad=ids.map(id=>{const p=pmap.get(id),pr=predMap.get(id);if(!p||!pr)return null;const cur=currentByPlayer.get(id)||null,prev=prevRun?(prevByPlayer.get(id)||null):null,changes:any={};if(cur&&prev)for(const k of['expected_minutes','start_probability','xg90','xa90','xgi90','shots_box90','big_chances90','cbit90','cbirt90','dc_probability'])changes[k]=Number(cur[k]||0)-Number(prev[k]||0);const a=actualValid(id);return{id,name:p.web_name,position:p.position,team:tm.get(Number(p.team_id))?.name,...playerMeta(p),...publicPrediction(pr),...distributionMeta(pr),actual:a,actual_status:a?'final':'pending',state:cur,previous_state:prev,knowledge_changes:changes}}).filter(Boolean),all_predictions=(allPreds||[]).map((pr:any)=>{const p=pmap.get(Number(pr.player_id));if(!p)return null;const a=actualValid(Number(pr.player_id)),err=a?Number(a.total_points)-Number(pr.expected_points):null,tol=Math.max(2,.30*Number(pr.expected_points));return{id:p.id,name:p.web_name,position:p.position,team:tm.get(Number(p.team_id))?.name,...playerMeta(p),...publicPrediction(pr),...distributionMeta(pr),actual:a,actual_status:a?'final':'pending',error:err,tolerance:tol,acceptable:a?Math.abs(err!)<=tol:null}}).filter(Boolean).sort((a:any,b:any)=>Number(b.expected_points)-Number(a.expected_points)),top_double_digit=[...all_predictions].sort((a:any,b:any)=>Number(b.p_10_plus||0)-Number(a.p_10_plus||0)||Number(b.p_15_plus||0)-Number(a.p_15_plus||0)||Number(b.expected_points||0)-Number(a.expected_points||0)).slice(0,10);

    const latestFixturePred=new Map<number,any>();for(const p of fixturePreds||[])latestFixturePred.set(Number(p.match_id),p);
    const fixture_results=(dbMatches||[]).map((m:any)=>{const f:any=liveFixtureById.get(Number(m.fpl_fixture_id))||null,p=latestFixturePred.get(Number(m.id))||null,home=tm.get(Number(m.home_team_id)),away=tm.get(Number(m.away_team_id)),top=Array.isArray(p?.top_scorelines)&&p.top_scorelines.length?p.top_scorelines[0]:null,hs=f?.team_h_score??m.home_score??null,as=f?.team_a_score??m.away_score??null,done=Boolean(f?(f.finished===true||f.finished_provisional===true):m.finished),headline=p?.headline_score||top?.score||null,headlineProb=p?.headline_score_probability??top?.prob??top?.probability??null;return{match_id:m.id,fpl_fixture_id:m.fpl_fixture_id,kickoff_time:m.kickoff_time,home_team:home?.name||null,away_team:away?.name||null,home_short:home?.short_name||null,away_short:away?.short_name||null,finished:done,home_score:hs,away_score:as,result_snapshot_finished:rr&&snapshotFinishedIds?snapshotFinishedIds.has(Number(m.fpl_fixture_id)):false,prediction:p?{snapshot_id:p.id,source_change_id:p.source_snapshot?.change_id||null,captured_at:p.captured_at,home_lambda:p.home_lambda,away_lambda:p.away_lambda,top_scoreline:headline,top_scoreline_probability:headlineProb,top_scorelines:p.top_scorelines||[],markets:p.markets||{},confidence:p.confidence,headline_score:p.headline_score||null,headline_score_probability:p.headline_score_probability??null,raw_modal_score:p.raw_modal_score||top?.score||null,raw_modal_probability:p.raw_modal_probability??top?.prob??top?.probability??null,script_family:p.script_family||null,script_confidence:p.script_confidence??null,reason_manifest:p.reason_manifest||null,selector:p.source_snapshot?.selector||null,frozen:ts(m.kickoff_time)<=Date.now()}:null}});

    const available_gameweeks=available.map(g=>{const xs=(runs||[]).filter((r:any)=>Number(r.gameweek)===g),valid=xs.filter((r:any)=>r.run_type==='pre_deadline'&&r.excluded_from_backtest!==true&&(!r.deadline_at||ts(r.generated_at)<ts(r.deadline_at))).sort(sortLatest)[0],fallback=[...xs].sort(sortLatest)[0],q=valid||fallback;return{gameweek:g,generated_at:q?.generated_at||null,run_type:q?.run_type||null,excluded_from_backtest:Boolean(q?.excluded_from_backtest),historical_projection_valid:Boolean(valid)}}),snapshotStage=Number(prefinal?.prediction_run_id)===Number(run.id)?'PRE_FINAL':(Number.isFinite(deadlineMs)&&Date.now()>=deadlineMs-2*60*60*1000&&Date.now()<deadlineMs?'FINAL_WINDOW':isHistorical?'HISTORICAL_FROZEN':'PRE_DEADLINE'),metadataAvailability={historical:isHistorical,price_ownership_source:isHistorical?(histPrice.size?'FPL_PRICE_SNAPSHOT':'UNAVAILABLE_HISTORICALLY'):'CURRENT_FPL_BOOTSTRAP',historical_price_players:histPrice.size,current_metadata_not_backfilled_into_history:true};
    const historicalDecision=dec?{starting_xi:dec.starting_xi,bench:dec.bench_order,captain_player_id:dec.captain_player_id,vice_player_id:dec.vice_player_id,recommendations:dec.recommendations}:null;
    const decision=currentDecision??historicalDecision;
    return new Response(JSON.stringify({ok:true,contract_version:'fpl_api_v15_compact_public_player_payload',available_gameweeks,gameweek:gw,prediction_run_id:run.id,model_version:mv?.version||'unknown',current_model_version:activeMv?.version||null,generated_at:run.generated_at,deadline_at:run.deadline_at||(Number.isFinite(derivedDeadline)?new Date(derivedDeadline).toISOString():null),run_type:run.run_type,excluded_from_backtest:Boolean(run.excluded_from_backtest),historical_projection_valid:historicalProjectionValid,historical_unavailable_reason:historicalProjectionValid?null:'NO_VALID_PREDEADLINE_PROJECTION',snapshot_stage:snapshotStage,prefinal:prefinal||null,metadata_availability:metadataAvailability,notes:run.notes,previous_gameweek:prevRun?.gameweek||null,decision,result_run:rr||null,audit,finished_fixture_ids:[...finishedLive],fixture_results,squad,top_double_digit,all_predictions,serving_semantics:{live_fixture_overlay:'BEST_EFFORT_BOUNDED_1500MS',db_fixture_fallback:true,current_predeadline_decision_source:currentDecision?'CURRENT_FPL_LIVE_PLAN_PUBLICATION':'FROZEN_DECISION_SNAPSHOT',historical_decision_source:'FROZEN_DECISION_SNAPSHOT_ONLY',live_plan_prediction_alignment_required:true,internal_feature_blobs_serialized:false,historical_forecasts_rewritten:false}}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
