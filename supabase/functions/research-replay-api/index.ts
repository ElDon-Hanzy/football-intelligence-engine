import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
const H={'Access-Control-Allow-Origin':'*','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const n=(v:any)=>v==null?null:Number(v);
Deno.serve(async req=>{try{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'),key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Missing service credential');
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||1);
  const [{data:run,error:re},{data:shadowRun,error:sre}]=await Promise.all([
    sb.from('blind_fixture_replay_runs').select('*').eq('gameweek',gw).order('id',{ascending:false}).limit(1).maybeSingle(),
    sb.from('enriched_shadow_runs').select('*').eq('gameweek',gw).order('id',{ascending:false}).limit(1).maybeSingle()
  ]);if(re)throw re;if(sre)throw sre;
  const [tr,fr]=await Promise.all([
    sb.from('teams').select('id,name,short_name'),
    sb.from('matches').select('id,home_team_id,away_team_id,home_score,away_score,finished,kickoff_time').eq('source','fpl').eq('gameweek',gw)
  ]);for(const x of [tr,fr])if(x.error)throw x.error;
  const tm=new Map((tr.data||[]).map((x:any)=>[Number(x.id),x])),fm=new Map((fr.data||[]).map((x:any)=>[Number(x.id),x]));
  let fixtures:any[]=[];
  if(run){
    const [mr,sr,er]=await Promise.all([
      sb.from('blind_fixture_replay_matches').select('*').eq('run_id',run.id).order('kickoff_time'),
      sb.from('blind_fixture_replay_signals').select('*').eq('run_id',run.id),
      sb.from('blind_fixture_replay_evaluations').select('*').eq('run_id',run.id)
    ]);for(const x of [mr,sr,er])if(x.error)throw x.error;
    const ev=new Map((er.data||[]).map((x:any)=>[Number(x.match_id),x]));
    fixtures=(mr.data||[]).map((m:any)=>{const f=fm.get(Number(m.match_id)),home=tm.get(Number(f?.home_team_id)),away=tm.get(Number(f?.away_team_id));const sig=(sr.data||[]).filter((x:any)=>Number(x.match_id)===Number(m.match_id));return{match_id:m.match_id,kickoff_time:m.kickoff_time,home_team:home||null,away_team:away||null,base_prediction_available:m.base_prediction_available,base_prediction_origin:m.base_prediction_origin||null,base_prediction_reconstructed:Boolean(m.base_prediction_reconstructed),base_prediction:m.base_prediction_available?{home_lambda:m.home_lambda,away_lambda:m.away_lambda,top_scoreline:m.top_scoreline,top_scoreline_probability:m.top_scoreline_probability,markets:m.markets,captured_at:m.base_prediction_captured_at}:null,expected_xi_available:{home:m.home_expected_xi_available,away:m.away_expected_xi_available},signals:{home:sig.filter((x:any)=>Number(x.team_id)===Number(f?.home_team_id)),away:sig.filter((x:any)=>Number(x.team_id)===Number(f?.away_team_id))},evaluation:ev.get(Number(m.match_id))||null,finished:Boolean(f?.finished),actual_score:f?.finished?`${f?.home_score}-${f?.away_score}`:null,research_only:true,forward_valid:false,actual_data_used_in_generation:false};});
  }
  let enriched_shadow:any={available:false,fixtures:[]};
  if(shadowRun){
    const [pr,er]=await Promise.all([
      sb.from('enriched_shadow_predictions').select('*').eq('run_id',shadowRun.id).order('kickoff_time'),
      sb.from('enriched_shadow_evaluations').select('*').eq('run_id',shadowRun.id)
    ]);for(const x of [pr,er])if(x.error)throw x.error;
    const ev=new Map((er.data||[]).map((x:any)=>[Number(x.match_id),x]));
    const shadowFixtures=(pr.data||[]).map((p:any)=>{const f=fm.get(Number(p.match_id)),e=ev.get(Number(p.match_id))||null;return{match_id:p.match_id,kickoff_time:p.kickoff_time,home_team:tm.get(Number(f?.home_team_id))||null,away_team:tm.get(Number(f?.away_team_id))||null,finished:Boolean(f?.finished),actual_score:f?.finished?`${f?.home_score}-${f?.away_score}`:null,baseline_origin:p.baseline_origin,original_comparison_available:Boolean(p.original_comparison_available),baseline:{home_lambda:p.baseline_home_lambda,away_lambda:p.baseline_away_lambda,top_scoreline:p.baseline_top_scoreline,markets:p.baseline_markets},shadow:{home_lambda:p.shadow_home_lambda,away_lambda:p.shadow_away_lambda,top_scoreline:p.shadow_top_scoreline,markets:p.shadow_markets},adjustments:p.adjustments,input_cutoff:p.input_cutoff,evidence:p.evidence,evaluation:e,research_only:true,forward_valid:false,model_effect_enabled:false};});
    const comparable=shadowFixtures.filter((x:any)=>x.finished&&x.original_comparison_available&&x.evaluation),better=comparable.filter((x:any)=>x.evaluation.comparison_status==='SHADOW_BETTER').length,worse=comparable.filter((x:any)=>x.evaluation.comparison_status==='SHADOW_WORSE').length,similar=comparable.filter((x:any)=>x.evaluation.comparison_status==='SIMILAR').length;
    const avg=(key:string)=>comparable.length?comparable.reduce((s:number,x:any)=>s+(n(x.evaluation?.[key])||0),0)/comparable.length:null;
    enriched_shadow={available:true,run:{id:shadowRun.id,shadow_version:shadowRun.shadow_version,created_at:shadowRun.created_at,source_replay_run_id:shadowRun.source_replay_run_id,integration_policy:shadowRun.integration_policy,actual_data_used:false,model_effect_enabled:false,forward_valid:false},summary:{comparable_finished:comparable.length,baseline_outcome_hits:comparable.filter((x:any)=>x.evaluation.baseline_outcome_hit).length,shadow_outcome_hits:comparable.filter((x:any)=>x.evaluation.shadow_outcome_hit).length,baseline_exact_hits:comparable.filter((x:any)=>x.evaluation.baseline_top_scoreline_hit).length,shadow_exact_hits:comparable.filter((x:any)=>x.evaluation.shadow_top_scoreline_hit).length,avg_baseline_brier:avg('baseline_brier_1x2'),avg_shadow_brier:avg('shadow_brier_1x2'),avg_brier_delta:avg('brier_delta_shadow_minus_baseline'),avg_baseline_score_log_loss:avg('baseline_score_log_loss'),avg_shadow_score_log_loss:avg('shadow_score_log_loss'),better,worse,similar},fixtures:shadowFixtures,research_only:true,forward_valid:false};
  }
  return new Response(JSON.stringify({ok:true,gameweek:gw,available:Boolean(run),run:run?{id:run.id,replay_version:run.replay_version,created_at:run.created_at,input_policy:run.input_policy,actual_data_used:false,model_effect_enabled:false}:null,fixtures,research_only:true,forward_valid:false,enriched_shadow}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}});
