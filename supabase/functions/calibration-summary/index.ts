import { createClient } from 'supabase';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};

const asNumber=(v:any)=>v==null?null:Number(v);
const average=(values:any[])=>{
  const xs=values.map(asNumber).filter((x:any)=>x!=null&&Number.isFinite(x));
  return xs.length?xs.reduce((s:number,x:number)=>s+x,0)/xs.length:null;
};
const rate=(values:boolean[])=>values.length?values.filter(Boolean).length/values.length:null;

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||1);

    const {data:active}=await sb.from('model_versions').select('id,version,config').eq('is_active',true).single();
    if(!active)throw new Error('No active model');
    const {data:frozen}=await sb.from('gameweek_prediction_runs').select('id,model_version_id,generated_at').eq('gameweek',gw).eq('frozen',true).order('generated_at',{ascending:false}).limit(1).maybeSingle();
    const {data:dec}=frozen?await sb.from('decision_snapshots').select('starting_xi,squad').eq('prediction_run_id',frozen.id).maybeSingle():{data:null};
    let ids:number[]=[];
    if(Array.isArray(dec?.squad))ids=dec.squad.map((x:any)=>Number(x.player_id||x.id)).filter(Boolean);
    if(!ids.length){const {data:sm}=await sb.from('squad_members').select('player_id').eq('active',true);ids=(sm||[]).map((x:any)=>x.player_id)}
    const {data:latestActive}=await sb.from('model_predictions').select('generated_at').eq('model_version_id',active.id).eq('gameweek',gw).order('generated_at',{ascending:false}).limit(1).maybeSingle();
    let activeRows:any[]=[];
    if(latestActive){const {data:a}=await sb.from('model_predictions').select('player_id,expected_points,expected_minutes,p_10_plus,p_15_plus,p_20_plus,p_start,p_clean_sheet,p_dc,p_bonus').eq('model_version_id',active.id).eq('gameweek',gw).eq('generated_at',latestActive.generated_at).in('player_id',ids);activeRows=a||[]}
    let frozenRows:any[]=[];
    if(frozen){const {data:f}=await sb.from('model_predictions').select('player_id,expected_points').eq('prediction_run_id',frozen.id).in('player_id',ids);frozenRows=f||[]}
    const [{data:pls},{data:teams}]=await Promise.all([sb.from('players').select('id,web_name,position,team_id').in('id',ids),sb.from('teams').select('id,short_name')]);
    const tm=new Map((teams||[]).map((x:any)=>[x.id,x.short_name])),am=new Map(activeRows.map((x:any)=>[x.player_id,x])),fm=new Map(frozenRows.map((x:any)=>[x.player_id,x]));
    const {data:br}=await sb.from('projection_benchmark_runs').select('id,source').eq('gameweek',gw);
    const brIds=(br||[]).map((x:any)=>x.id),srcMap=new Map((br||[]).map((x:any)=>[x.id,x.source]));
    let bench:any[]=[];
    if(brIds.length){const {data:b}=await sb.from('player_projection_benchmarks').select('benchmark_run_id,player_id,expected_points').in('benchmark_run_id',brIds).in('player_id',ids);bench=b||[]}
    const bm=new Map<number,any[]>();for(const b of bench){const arr=bm.get(b.player_id)||[];arr.push({source:srcMap.get(b.benchmark_run_id),xpts:Number(b.expected_points)});bm.set(b.player_id,arr)}
    const rows=(pls||[]).map((p:any)=>{const a=am.get(p.id),f=fm.get(p.id),bs=bm.get(p.id)||[],mean=bs.length?bs.reduce((s,x)=>s+x.xpts,0)/bs.length:null;return {player_id:p.id,name:p.web_name,team:tm.get(p.team_id),position:p.position,frozen_xpts:f?Number(f.expected_points):null,current_xpts:a?Number(a.expected_points):null,benchmark_mean:mean,benchmark_sources:bs,current:a||null}}).filter((x:any)=>x.current_xpts!=null||x.frozen_xpts!=null);
    const xiIds=new Set((dec?.starting_xi||[]).map((x:any)=>Number(x.id)));
    const sum=(arr:any[],key:string)=>arr.reduce((s,x)=>s+Number(x[key]||0),0);
    const xi=rows.filter((x:any)=>xiIds.size?xiIds.has(x.player_id):true);
    const matched=rows.filter((x:any)=>x.current_xpts!=null&&x.benchmark_mean!=null);
    const mae=matched.length?matched.reduce((s,x)=>s+Math.abs(x.current_xpts-x.benchmark_mean),0)/matched.length:null,bias=matched.length?matched.reduce((s,x)=>s+(x.current_xpts-x.benchmark_mean),0)/matched.length:null;

    const selectedAblationKey='A0005';
    const {data:ablationRun}=await sb.from('walk_forward_ablation_runs').select('id,ablation_key,walk_forward_run_id,experiment_key,change_id,version,created_at,actual_data_used_in_generation,model_effect_enabled').eq('ablation_key',selectedAblationKey).order('created_at',{ascending:false}).limit(1).maybeSingle();
    let forward:any={available:false,selected_ablation_key:selectedAblationKey};
    if(ablationRun){
      const [walkRes,predRes,evalRes,cohortRes,marketRes,reliabilityRes,gateRes]=await Promise.all([
        sb.from('walk_forward_runs').select('id,run_key,experiment_key,change_id,engine_version,created_at,training_end,validation_gameweek,test_gameweek,definition_hash,actual_data_used_in_generation,model_effect_enabled').eq('id',ablationRun.walk_forward_run_id).maybeSingle(),
        sb.from('walk_forward_ablation_predictions').select('id,match_id,split,variant_key,top_scoreline,actual_data_used,model_effect_enabled,created_at').eq('ablation_run_id',ablationRun.id),
        sb.from('walk_forward_ablation_evaluations').select('prediction_id,match_id,variant_key,split,evaluated_at,actual_home_goals,actual_away_goals,brier,score_log_loss,direction_hit,actual_home_xg,actual_away_xg,process_mae,gap_error').eq('ablation_run_id',ablationRun.id),
        sb.from('walk_forward_fixture_cohort').select('id,match_id,gameweek,split,kickoff_time,inclusion_status,actual_data_used,model_effect_enabled').eq('run_id',ablationRun.walk_forward_run_id).order('kickoff_time'),
        sb.from('walk_forward_calibration_market_summary').select('*').eq('ablation_run_id',ablationRun.id).order('variant_key').order('split'),
        sb.from('walk_forward_reliability_bins').select('*').eq('ablation_run_id',ablationRun.id).order('variant_key').order('split').order('bin'),
        sb.from('model_promotion_gate_assessments').select('assessment_key,change_id,ablation_run_id,candidate_variant,assessed_at,gate_version,gate_status,metrics,model_effect_enabled').order('assessed_at',{ascending:false}).limit(1).maybeSingle()
      ]);
      for(const result of [walkRes,predRes,evalRes,cohortRes,marketRes,reliabilityRes,gateRes])if(result.error)throw result.error;
      const walk=walkRes.data,preds=predRes.data||[],evals=evalRes.data||[],cohort=cohortRes.data||[];
      const evalByPrediction=new Map(evals.map((e:any)=>[Number(e.prediction_id),e]));
      const groups=new Map<string,any>();
      for(const p of preds){const key=`${p.variant_key}::${p.split}`;if(!groups.has(key))groups.set(key,{variant_key:p.variant_key,split:p.split,predictions:[],evaluations:[]});const g=groups.get(key);g.predictions.push(p);const e=evalByPrediction.get(Number(p.id));if(e)g.evaluations.push({...e,top_scoreline:p.top_scoreline})}
      const variants=[...groups.values()].map((g:any)=>{const ev=g.evaluations;const exact=ev.map((e:any)=>Boolean(e.top_scoreline&&e.actual_home_goals!=null&&e.actual_away_goals!=null&&e.top_scoreline===`${e.actual_home_goals}-${e.actual_away_goals}`));return {variant_key:g.variant_key,split:g.split,total_predictions:g.predictions.length,evaluated_fixtures:ev.length,pending_fixtures:g.predictions.length-ev.length,avg_brier:average(ev.map((e:any)=>e.brier)),avg_score_log_loss:average(ev.map((e:any)=>e.score_log_loss)),direction_accuracy:rate(ev.map((e:any)=>Boolean(e.direction_hit))),exact_top_score_rate:rate(exact),avg_process_mae:average(ev.map((e:any)=>e.process_mae)),avg_gap_error:average(ev.map((e:any)=>e.gap_error))}}).sort((a:any,b:any)=>a.split.localeCompare(b.split)||a.variant_key.localeCompare(b.variant_key));
      const completeCohort=cohort.filter((c:any)=>c.inclusion_status==='COMPLETE');
      const splitCoverage=['VALIDATION','TEST'].map(split=>{const splitRows=completeCohort.filter((c:any)=>c.split===split);const times=splitRows.map((x:any)=>x.kickoff_time).filter(Boolean).sort();return {split,gameweek:splitRows[0]?.gameweek??null,fixtures:splitRows.length,next_kickoff:times[0]||null,last_kickoff:times.at(-1)||null}});
      const integrity={ablation_actual_data_used:Boolean(ablationRun.actual_data_used_in_generation),ablation_model_effect_enabled:Boolean(ablationRun.model_effect_enabled),walk_actual_data_used:Boolean(walk?.actual_data_used_in_generation),walk_model_effect_enabled:Boolean(walk?.model_effect_enabled),prediction_actual_data_violations:preds.filter((p:any)=>p.actual_data_used===true).length,prediction_model_effect_violations:preds.filter((p:any)=>p.model_effect_enabled===true).length,cohort_actual_data_violations:completeCohort.filter((c:any)=>c.actual_data_used===true).length,cohort_model_effect_violations:completeCohort.filter((c:any)=>c.model_effect_enabled===true).length};
      forward={available:true,selected_ablation_key:selectedAblationKey,walk_forward:walk,ablation:ablationRun,coverage:{predictions:preds.length,evaluations:evals.length,cohort_fixtures:completeCohort.length,splits:splitCoverage},integrity,variants,market:marketRes.data||[],reliability_bins:reliabilityRes.data||[],latest_promotion_gate:gateRes.data||null};
    }

    const {data:blindRuns,error:blindRunError}=await sb.from('blind_current_engine_runs').select('id,gameweek,replay_version,created_at,actual_data_used,model_effect_enabled,forward_valid').order('created_at',{ascending:false});if(blindRunError)throw blindRunError;
    let retrospective:any[]=[];const blindIds=(blindRuns||[]).map((r:any)=>r.id);
    if(blindIds.length){const {data:blindEvals,error:blindEvalError}=await sb.from('blind_current_engine_evaluations').select('run_id,direction_hit,exact_top_score_hit,brier_1x2,score_log_loss,process_mae,gap_error,total_xg_error').in('run_id',blindIds);if(blindEvalError)throw blindEvalError;retrospective=(blindRuns||[]).map((r:any)=>{const ev=(blindEvals||[]).filter((e:any)=>e.run_id===r.id);return {...r,evaluated_fixtures:ev.length,direction_accuracy:rate(ev.map((e:any)=>Boolean(e.direction_hit))),exact_top_score_rate:rate(ev.map((e:any)=>Boolean(e.exact_top_score_hit))),avg_brier:average(ev.map((e:any)=>e.brier_1x2)),avg_score_log_loss:average(ev.map((e:any)=>e.score_log_loss)),avg_process_mae:average(ev.map((e:any)=>e.process_mae)),avg_gap_error:average(ev.map((e:any)=>e.gap_error)),avg_total_xg_error:average(ev.map((e:any)=>e.total_xg_error))}})}

    return new Response(JSON.stringify({ok:true,gameweek:gw,active_model:active.version,active_config:active.config,active_generated_at:latestActive?.generated_at||null,frozen_prediction_run_id:frozen?.id||null,summary:{frozen_xi_xpts:xiIds.size?sum(xi,'frozen_xpts'):null,current_xi_xpts:xiIds.size?sum(xi,'current_xpts'):null,benchmark_xi_xpts:xiIds.size?xi.filter((x:any)=>x.benchmark_mean!=null).reduce((s,x)=>s+x.benchmark_mean,0):null,benchmark_xi_matched:xi.filter((x:any)=>x.benchmark_mean!=null).length,matched_players:matched.length,mae,bias},players:rows,validation:{forward,retrospective}}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
