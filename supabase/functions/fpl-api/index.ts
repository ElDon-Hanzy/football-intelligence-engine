import { createClient } from 'supabase';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};

const finiteOrNull=(value:any)=>{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null};
const distributionMeta=(prediction:any)=>{const pd=prediction?.features?.point_distribution;return{q90:finiteOrNull(pd?.q90),q95:finiteOrNull(pd?.q95),distribution_version:typeof pd?.version==='string'?pd.version:null,tail_semantics:typeof prediction?.features?.tail_semantics==='string'?prediction.features.tail_semantics:null}};

Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!serviceKey)throw new Error('Missing Supabase service credential');
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
  const u=new URL(req.url),requested=Number(u.searchParams.get('gw')||0);

  const {data:runs,error:rune}=await sb.from('gameweek_prediction_runs').select('id,model_version_id,gameweek,generated_at,run_type,frozen,excluded_from_backtest,notes').eq('frozen',true).order('gameweek',{ascending:true}).order('generated_at',{ascending:false}).order('id',{ascending:false});
  if(rune)throw rune;if(!runs?.length)throw new Error('No frozen gameweek snapshots');
  const gw=requested>=1&&requested<=38?requested:Math.max(...runs.map((r:any)=>r.gameweek));
  const run=(runs||[]).filter((r:any)=>r.gameweek===gw).sort((a:any,b:any)=>new Date(b.generated_at).getTime()-new Date(a.generated_at).getTime()||Number(b.id)-Number(a.id))[0];
  if(!run)throw new Error(`No frozen snapshot for GW${gw}`);
  const prevRun=(runs||[]).filter((r:any)=>r.gameweek<gw).sort((a:any,b:any)=>b.gameweek-a.gameweek||new Date(b.generated_at).getTime()-new Date(a.generated_at).getTime()||Number(b.id)-Number(a.id))[0]||null;

  const [{data:mv},{data:activeMv},{data:dec},{data:rr},fr]=await Promise.all([
    sb.from('model_versions').select('version').eq('id',run.model_version_id).single(),
    sb.from('model_versions').select('id,version').eq('is_active',true).single(),
    sb.from('decision_snapshots').select('*').eq('prediction_run_id',run.id).maybeSingle(),
    sb.from('gameweek_result_runs').select('id,observed_at,is_final,metadata').eq('gameweek',gw).order('is_final',{ascending:false}).order('observed_at',{ascending:false}).limit(1).maybeSingle(),
    fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`,{headers:{'User-Agent':'FootballIntelligence/0.2'}})
  ]);
  if(!fr.ok)throw new Error(`FPL fixtures ${fr.status}`);
  const fixtures=await fr.json();
  const liveFixtureById=new Map((fixtures||[]).map((f:any)=>[Number(f.id),f]));
  const finishedLive=new Set((fixtures||[]).filter((f:any)=>f.finished===true||f.finished_provisional===true).map((f:any)=>Number(f.id)));
  const snapshotFinishedIds=Array.isArray(rr?.metadata?.finished_fixture_ids)?new Set((rr.metadata.finished_fixture_ids||[]).map((x:any)=>Number(x))):null;
  const rrObserved=rr?new Date(rr.observed_at).getTime():0;

  let ids:number[]=[];
  if(Array.isArray(dec?.squad))ids=dec.squad.map((x:any)=>Number(x.player_id||x.id)).filter(Boolean);
  if(!ids.length){const {data:sm}=await sb.from('squad_members').select('player_id').eq('active',true);ids=(sm||[]).map((x:any)=>x.player_id)}

  const [{data:allPreds},{data:allPlayers},{data:teams},{data:states},prevStatesRes,{data:dbMatches},{data:fixturePreds}]=await Promise.all([
    sb.from('model_predictions').select('player_id,expected_points,p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_start,p_goal,p_assist,p_clean_sheet,p_dc,p_bonus,expected_minutes,confidence,features').eq('prediction_run_id',run.id),
    sb.from('players').select('id,web_name,position,team_id,now_cost,selected_by_percent,status,chance_of_playing_next_round,news,updated_at'),
    sb.from('teams').select('id,name,short_name'),
    sb.from('player_state').select('player_id,as_of,expected_minutes,start_probability,role,formation,xg90,xa90,xgi90,shots_box90,big_chances90,cbit90,cbirt90,dc_probability').in('player_id',ids).lte('as_of',run.generated_at).order('as_of',{ascending:false}),
    prevRun?sb.from('player_state').select('player_id,as_of,expected_minutes,start_probability,role,formation,xg90,xa90,xgi90,shots_box90,big_chances90,cbit90,cbirt90,dc_probability').in('player_id',ids).lte('as_of',prevRun.generated_at).order('as_of',{ascending:false}):Promise.resolve({data:[]}),
    sb.from('matches').select('id,fpl_fixture_id,home_team_id,away_team_id,kickoff_time,home_score,away_score,finished,updated_at').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
    sb.from('current_production_fixture_prediction_v01').select('id,match_id,captured_at,kickoff_time,is_pre_kickoff,home_lambda,away_lambda,top_scorelines,markets,confidence,headline_score,headline_score_probability,raw_modal_score,raw_modal_probability,script_family,script_confidence,reason_manifest,source_snapshot').eq('gameweek',gw)
  ]);

  let allActuals:any[]=[],audit:any=null;
  if(rr){
    const {data:a,error:ae}=await sb.from('player_gameweek_actuals').select('player_id,fixture_ids,minutes,total_points,goals,assists,bonus,bps,defensive_contribution,xg,xa,xgi,xgc,clean_sheets').eq('result_run_id',rr.id);
    if(ae)throw ae;allActuals=a||[];
    const {data:as}=await sb.from('gameweek_audit_summaries').select('*').eq('prediction_run_id',run.id).eq('result_run_id',rr.id).maybeSingle();audit=as||null
  }

  const tm=new Map((teams||[]).map((x:any)=>[x.id,x])),pmap=new Map((allPlayers||[]).map((x:any)=>[x.id,x])),predMap=new Map((allPreds||[]).map((x:any)=>[x.player_id,x])),actMap=new Map(allActuals.map((x:any)=>[x.player_id,x]));
  const playerMeta=(p:any)=>({price_tenths:p?.now_cost==null?null:Number(p.now_cost),price:p?.now_cost==null?null:Number(p.now_cost)/10,ownership_percent:finiteOrNull(p?.selected_by_percent),fpl_status:p?.status||null,chance_of_playing_next_round:finiteOrNull(p?.chance_of_playing_next_round),news:p?.news||'',player_metadata_updated_at:p?.updated_at||null});
  const actualValid=(pid:number)=>{
    const a=actMap.get(pid);if(!a||!rr)return null;
    const fids=(a.fixture_ids||[]).map(Number).filter(Number.isFinite);if(!fids.length)return null;
    if(snapshotFinishedIds)return fids.every((id:number)=>snapshotFinishedIds.has(id))?a:null;
    const valid=fids.every((id:number)=>{const f:any=liveFixtureById.get(id);const ko=f?.kickoff_time?new Date(f.kickoff_time).getTime():NaN;return Boolean(f&&(f.finished===true||f.finished_provisional===true)&&Number.isFinite(ko)&&rrObserved>=ko+105*60*1000)});
    return valid?a:null
  };

  const currentByPlayer=new Map<number,any>();for(const s of(states||[])){if(!currentByPlayer.has(s.player_id))currentByPlayer.set(s.player_id,s)}
  const prevByPlayer=new Map<number,any>();for(const s of(prevStatesRes?.data||[])){if(!prevByPlayer.has(s.player_id))prevByPlayer.set(s.player_id,s)}
  const squad=ids.map(id=>{const p=pmap.get(id),pr=predMap.get(id);if(!p||!pr)return null;const cur=currentByPlayer.get(id)||null,prev=prevRun?(prevByPlayer.get(id)||null):null,changes:any={};if(cur&&prev){for(const k of ['expected_minutes','start_probability','xg90','xa90','xgi90','shots_box90','big_chances90','cbit90','cbirt90','dc_probability'])changes[k]=Number(cur[k]||0)-Number(prev[k]||0)}const a=actualValid(id);return{id,name:p.web_name,position:p.position,team:tm.get(p.team_id)?.name,...playerMeta(p),...pr,...distributionMeta(pr),actual:a,actual_status:a?'final':'pending',state:cur,previous_state:prev,knowledge_changes:changes}}).filter(Boolean);
  const all_predictions=(allPreds||[]).map((pr:any)=>{const p=pmap.get(pr.player_id);if(!p)return null;const a=actualValid(pr.player_id);const err=a?Number(a.total_points)-Number(pr.expected_points):null;const tol=Math.max(2,.30*Number(pr.expected_points));return{id:p.id,name:p.web_name,position:p.position,team:tm.get(p.team_id)?.name,...playerMeta(p),...pr,...distributionMeta(pr),actual:a,actual_status:a?'final':'pending',error:err,tolerance:tol,acceptable:a?Math.abs(err!)<=tol:null}}).filter(Boolean).sort((a:any,b:any)=>Number(b.expected_points)-Number(a.expected_points));

  let top_double_digit:any[]=[];
  if(activeMv){const {data:latest}=await sb.from('model_predictions').select('generated_at').eq('model_version_id',activeMv.id).eq('gameweek',gw).order('generated_at',{ascending:false}).limit(1).maybeSingle();if(latest){const {data:cur}=await sb.from('model_predictions').select('player_id,expected_points,expected_minutes,p_10_plus,p_15_plus,p_20_plus,p_start,p_goal,p_assist,p_dc,p_bonus,confidence,features').eq('model_version_id',activeMv.id).eq('gameweek',gw).eq('generated_at',latest.generated_at);top_double_digit=(cur||[]).map((x:any)=>{const p=pmap.get(x.player_id);return p?{id:p.id,name:p.web_name,position:p.position,team:tm.get(p.team_id)?.name,...playerMeta(p),...x,...distributionMeta(x)}:null}).filter(Boolean).sort((a:any,b:any)=>Number(b.p_10_plus)-Number(a.p_10_plus)||Number(b.p_15_plus)-Number(a.p_15_plus)||Number(b.expected_points)-Number(a.expected_points)).slice(0,10)}}

  const latestFixturePred=new Map<number,any>();for(const p of fixturePreds||[]){latestFixturePred.set(Number(p.match_id),p)}
  const fixture_results=(dbMatches||[]).map((m:any)=>{
    const f:any=liveFixtureById.get(Number(m.fpl_fixture_id))||null,p=latestFixturePred.get(Number(m.id))||null,home=tm.get(m.home_team_id),away=tm.get(m.away_team_id),top=Array.isArray(p?.top_scorelines)&&p.top_scorelines.length?p.top_scorelines[0]:null;
    const hs=f?.team_h_score??m.home_score??null,as=f?.team_a_score??m.away_score??null,done=Boolean(f?(f.finished===true||f.finished_provisional===true):m.finished);
    const headline=p?.headline_score||top?.score||null,headlineProb=p?.headline_score_probability??top?.prob??top?.probability??null;
    return {match_id:m.id,fpl_fixture_id:m.fpl_fixture_id,kickoff_time:m.kickoff_time,home_team:home?.name||null,away_team:away?.name||null,home_short:home?.short_name||null,away_short:away?.short_name||null,finished:done,home_score:hs,away_score:as,result_snapshot_finished:rr&&snapshotFinishedIds?snapshotFinishedIds.has(Number(m.fpl_fixture_id)):false,prediction:p?{snapshot_id:p.id,source_change_id:p.source_snapshot?.change_id||null,captured_at:p.captured_at,home_lambda:p.home_lambda,away_lambda:p.away_lambda,top_scoreline:headline,top_scoreline_probability:headlineProb,top_scorelines:p.top_scorelines||[],markets:p.markets||{},confidence:p.confidence,headline_score:p.headline_score||null,headline_score_probability:p.headline_score_probability??null,raw_modal_score:p.raw_modal_score||top?.score||null,raw_modal_probability:p.raw_modal_probability??top?.prob??top?.probability??null,script_family:p.script_family||null,script_confidence:p.script_confidence??null,reason_manifest:p.reason_manifest||null,selector:p.source_snapshot?.selector||null,frozen:new Date(m.kickoff_time).getTime()<=Date.now()}:null}
  });

  const gws=[...new Map((runs||[]).map((r:any)=>[r.gameweek,{gameweek:r.gameweek,generated_at:r.generated_at,run_type:r.run_type,excluded_from_backtest:r.excluded_from_backtest}])).values()].sort((a:any,b:any)=>a.gameweek-b.gameweek);
  return new Response(JSON.stringify({ok:true,available_gameweeks:gws,gameweek:gw,prediction_run_id:run.id,model_version:mv?.version||'unknown',current_model_version:activeMv?.version||null,generated_at:run.generated_at,run_type:run.run_type,excluded_from_backtest:run.excluded_from_backtest,notes:run.notes,previous_gameweek:prevRun?.gameweek||null,decision:dec?{starting_xi:dec.starting_xi,bench:dec.bench_order,captain_player_id:dec.captain_player_id,vice_player_id:dec.vice_player_id,recommendations:dec.recommendations}:null,result_run:rr||null,audit,finished_fixture_ids:[...finishedLive],fixture_results,squad,top_double_digit,all_predictions}),{headers:cors});
}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}});
