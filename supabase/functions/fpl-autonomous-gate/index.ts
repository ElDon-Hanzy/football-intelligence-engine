import { createClient } from 'jsr:@supabase/supabase-js@2';
const VERSION='C0234_AUTONOMOUS_FINAL_GATE_V07_C0230_ADVISORY';
const N=(x:any,d=0)=>Number.isFinite(Number(x))?Number(x):d;
async function sha(x:any){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x)));return[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('')}
Deno.serve(async(req:Request)=>{try{
 const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'),key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)return Response.json({ok:false,error:'service credential missing'},{status:500});
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
 const{data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
 if(ae||!tok||req.headers.get('x-engine-token')!==tok)return Response.json({ok:false,error:'unauthorized'},{status:401});
 const b=await req.json().catch(()=>({})),gw=N(b.gameweek),h=Math.max(1,Math.min(5,N(b.horizon,5)));if(!gw)return Response.json({ok:false,error:'gameweek invalid'},{status:400});
 const [er,sr,fr,orr,rr,tr,ar,msr,fxr,prr,readyR,cr,c248r]=await Promise.all([
  sb.from('fpl_squad_ensemble_runs').select('id,result,input_signature,model_error_margin_points').eq('gameweek',gw).eq('horizon',h).order('captured_at',{ascending:false}).limit(1).single(),
  sb.from('fpl_structural_control_runs').select('id,result,input_signature').eq('gameweek',gw).eq('horizon',h).order('captured_at',{ascending:false}).limit(1).single(),
  sb.from('fpl_forward_management_runs').select('id,result,input_signature').eq('gameweek',gw).eq('horizon',h).order('captured_at',{ascending:false}).limit(1).single(),
  sb.from('fpl_or_utility_runs').select('id,result,input_signature').eq('gameweek',gw).eq('horizon',h).order('captured_at',{ascending:false}).limit(1).single(),
  sb.from('fpl_red_team_runs').select('id,result,input_signature').eq('gameweek',gw).eq('horizon',h).order('captured_at',{ascending:false}).limit(1).single(),
  sb.from('fpl_team_regime_diagnostic_runs').select('id,result,input_signature').eq('gameweek',gw).order('captured_at',{ascending:false}).limit(1).maybeSingle(),
  sb.from('fpl_final_adversarial_runs').select('id,result,input_signature,stability_status,ensemble_run_id,structural_run_id,forward_run_id,or_utility_run_id,red_team_run_id,manager_state_id').eq('gameweek',gw).eq('horizon',h).order('captured_at',{ascending:false}).limit(1).single(),
  sb.from('fpl_manager_state_snapshots').select('id,free_transfers,bank_tenths,evidence').eq('gameweek',gw).order('captured_at',{ascending:false}).limit(1).single(),
  sb.from('matches').select('kickoff_time').eq('source','fpl').eq('gameweek',gw).order('kickoff_time',{ascending:true}).limit(1).single(),
  sb.from('gameweek_prediction_runs').select('id,generated_at').eq('gameweek',gw).order('generated_at',{ascending:false}).limit(1).single(),
  sb.rpc('c0234_c0213_readiness_bridge_v01',{p_gameweek:gw}),
  sb.rpc('c0242_consistency_status_bridge_v01',{p_gameweek:gw,p_horizon:h}),
  sb.rpc('c0248_decision_control_status_bridge_v01',{p_gameweek:gw,p_horizon:h})
 ]);
 for(const x of [er,sr,fr,orr,rr,tr,ar,msr,fxr,prr,readyR,cr,c248r])if(x.error)throw x.error;
 const e:any=er.data.result,s:any=sr.data.result,f:any=fr.data.result,o:any=orr.data.result,red:any=rr.data.result,team:any=tr.data?.result||null,adv:any=ar.data.result,ready:any=readyR.data,consistency:any=cr.data,c248:any=c248r.data;
 if(!e?.ok||!s?.ok||!f?.ok||!o?.ok||!red?.ok||!adv?.ok||!consistency?.ok||!c248?.ok)return Response.json({ok:false,status:'UPSTREAM_AUTONOMY_LAYER_NOT_READY',decisioning:false},{status:409});
 const teamAdvisory={change_id:'C0230',available:team?.ok===true,run_id:tr.data?.id??null,status:team?.status||'NOT_AVAILABLE',model_effect_enabled:false,blocking:false};
 const decisionLineageGreen=N(ar.data.ensemble_run_id)===N(er.data.id)&&N(ar.data.structural_run_id)===N(sr.data.id)&&N(ar.data.forward_run_id)===N(fr.data.id)&&N(ar.data.or_utility_run_id)===N(orr.data.id)&&N(ar.data.red_team_run_id)===N(rr.data.id)&&N(ar.data.manager_state_id)===N(msr.data.id);
 const predictionLineageGreen=N(adv.current_prediction_run_id)===N(prr.data.id),lineageGreen=decisionLineageGreen&&predictionLineageGreen;
 const cov=adv.coverage||{},advStable=ar.data.stability_status==='STABLE_NO_MEANINGFUL_EDGE'&&lineageGreen&&N(cov.slot_attack_count)===15&&N(cov.structure_attack_count)>=8&&N(cov.path_attack_count)>=3&&cov.baseline_exact_same_horizon===true&&cov.transfer_path_complete===true&&cov.sensitivity_complete===true&&cov.repeat_cycle_no_new_edge===true&&N(cov.failed_tasks)===0;
 const now=new Date(),kick=new Date(fxr.data.kickoff_time),deadline=new Date(kick.getTime()-90*60*1000),finalThreshold=new Date(deadline.getTime()-2*60*60*1000),latestProj=new Date(prr.data.generated_at),finalWindowOpen=now>=finalThreshold,finalRefreshGreen=finalWindowOpen&&latestProj>=finalThreshold;
 const entry=N(msr.data?.evidence?.entry_id,3559923);let chipHistory:any[]=[],chipHistoryVerified=false;try{const hr=await fetch(`https://fantasy.premierleague.com/api/entry/${entry}/history/`,{headers:{'User-Agent':'FootballIntelligence/1.0'}});if(hr.ok){const hj=await hr.json();chipHistory=Array.isArray(hj?.chips)?hj.chips:[];chipHistoryVerified=true}}catch{}
 const usedThisHalf=(needle:string)=>chipHistory.filter((c:any)=>String(c.name||'').toLowerCase().includes(needle)&&N(c.event)<=19).length;
 const chipAvailable=(choice:string)=>{if(choice==='NONE')return true;if(!chipHistoryVerified)return false;if(gw>19)return true;const q=choice==='WILDCARD'?'wildcard':choice==='FREE_HIT'?'freehit':choice==='BENCH_BOOST'?'bboost':choice==='TRIPLE_CAPTAIN'?'3xc':'';return q?usedThisHalf(q)===0:false};
 const err=N(er.data.model_error_margin_points,1),legacyRoll=N(e.roll?.objective),legacySurvivor:any=adv.survivor||e.best_no_chip,legacySurvivorObj=N(legacySurvivor?.objective,N(e.best_no_chip?.objective));
 const redEvaluated=['PASS','EDGE_NOT_ROBUST','CHALLENGED_BY_EQUIVALENT'].includes(String(red.red_team_status));
 const consistencyReady=consistency?.decision_consistency_ready===true;
 const c248SelectorReady=c248?.selector_cutover_candidate_ready===true,c248Ready=c248?.decision_control_ready===true&&c248SelectorReady;
 const chipChoice=String(c248?.current_chip?.recommended_current_chip||'UNRESOLVED'),currentNoChipRobust=c248?.current_chip?.current_no_chip_robust===true;
 const selected:any=c248?.selected_normal_path||c248?.best_normal_root||null,selectedRoot=String(selected?.root||''),selectedEdge=N(selected?.edge_vs_roll_root,-999),rollComparisonGreen=selectedRoot==='ROLL'||selectedEdge>=err;
 const gates:any[]=[
  {gate:'C0213_DECISION_READINESS',pass:ready?.decision_ready===true,detail:ready?.contract_version||null},
  {gate:'TARGET_PROJECTIONS_AND_ROLES',pass:ready?.projection_ready===true,detail:`latest_projection_run=${prr.data.id}`},
  {gate:'ENSEMBLE_GENERATED',pass:e.status==='ENSEMBLE_READY'&&N(e.convergence?.unique_family_signatures)>=2,detail:e.ensemble_classification},
  {gate:'UNCERTAINTY_STATE_AND_SENSITIVITY',pass:cov.sensitivity_complete===true,detail:{c0240_sensitivity_complete:cov.sensitivity_complete}},
  {gate:'STRUCTURAL_ENSEMBLE_EVALUATED',pass:s.status==='STRUCTURAL_CONTROL_READY',detail:s.adjudication},
  {gate:'RANK_LEVERAGE_CONTROL',pass:o.status==='OR_UTILITY_READY'&&o.policy?.numeric_xpts_adjustment===false,detail:o.rank_state?.regime||null},
  {gate:'FORWARD_MANAGEMENT',pass:f.status==='FORWARD_MANAGEMENT_READY',detail:'legacy supporting evaluator remains required until separately retired'},
  {gate:'C0233_RED_TEAM_EVALUATED',pass:redEvaluated,detail:{status:red.red_team_status,blocking_reasons:red.blocking_reasons||[],adjudicator:'C0240_SUPPORTING_BENCHMARK'}},
  {gate:'C0240_SUPPORTING_ADVERSARIAL_BENCHMARK',pass:advStable,detail:{run_id:ar.data.id,stability_status:ar.data.stability_status,decision_lineage_green:decisionLineageGreen,prediction_lineage_green:predictionLineageGreen,coverage:cov}},
  {gate:'C0242_DECISION_CONSISTENCY',pass:consistencyReady,detail:{contract_version:consistency?.contract_version,named_challengers:consistency?.named_challengers,captaincy_decision_class:consistency?.captaincy?.decision_class}},
  {gate:'C0248_SELECTED_PATH_AUTHORITY',pass:c248Ready,detail:{planner_run_id:c248?.planner_run_id,planner_version:c248?.planner_version,selector_cutover_candidate_ready:c248SelectorReady,selected_normal_root:selectedRoot,selected_normal_edge_vs_roll:selectedEdge,hardening_contract:c248?.hardening_contract}},
  {gate:'ROLL_COMPARISON',pass:rollComparisonGreen,detail:{selected_root:selectedRoot,selected_edge_vs_roll:selectedEdge,model_error_margin:err,legacy_roll_objective:legacyRoll,legacy_c0240_objective:legacySurvivorObj}},
  {gate:'FINAL_T_MINUS_2H_REFRESH',pass:finalRefreshGreen,detail:{deadline_at:deadline.toISOString(),final_refresh_threshold:finalThreshold.toISOString(),latest_projection_at:latestProj.toISOString(),window_open:finalWindowOpen}},
  {gate:'CHIP_AVAILABILITY',pass:chipAvailable(chipChoice),detail:{recommended_current_chip:chipChoice,history_verified:chipHistoryVerified,used:chipHistory}},
  {gate:'C0248_CURRENT_CHIP_ACTION',pass:chipChoice!=='UNRESOLVED'&&(chipChoice!=='NONE'||currentNoChipRobust),detail:{recommended_current_chip:chipChoice,current_no_chip_robust:currentNoChipRobust,bench_boost:c248?.current_chip?.bench_boost,triple_captain:c248?.current_chip?.triple_captain,free_hit:c248?.current_chip?.free_hit,wildcard:c248?.current_chip?.wildcard}}
 ];
 const blockers=gates.filter(g=>!g.pass).map(g=>g.gate),finalStatus=blockers.length?'DECISION_NOT_READY':'FINAL_AUTONOMOUS_DECISION';let action:any={type:'NONE',authorized:false,selector:'C0248'};
 if(finalStatus==='FINAL_AUTONOMOUS_DECISION'){
   if(chipChoice==='WILDCARD')action={type:'WILDCARD',selector:'C0248',details:c248?.wildcard_root?.first_action||null,selected_path:c248?.wildcard_root||null,authorized:false};
   else if(chipChoice==='FREE_HIT')action={type:'FREE_HIT',selector:'C0248',details:c248?.free_hit_root?.first_action||null,selected_path:c248?.free_hit_root||null,authorized:false};
   else if(chipChoice==='BENCH_BOOST')action={type:'BENCH_BOOST',selector:'C0248',details:c248?.bench_boost_root?.first_action||null,selected_path:c248?.bench_boost_root||null,authorized:false};
   else if(chipChoice==='TRIPLE_CAPTAIN')action={type:'TRIPLE_CAPTAIN',selector:'C0248',details:c248?.triple_captain_root?.first_action||null,selected_path:c248?.triple_captain_root||null,authorized:false};
   else if(chipChoice==='NONE'&&selectedRoot==='ROLL')action={type:'ROLL',selector:'C0248',details:selected?.first_action||null,selected_path:selected,authorized:false};
   else if(chipChoice==='NONE'&&selectedEdge>=err)action={type:'NORMAL_TRANSFERS',selector:'C0248',details:selected?.first_action||null,selected_path:selected,authorized:false};
 }
 const result={ok:true,status:'AUTONOMOUS_GATE_EVALUATED',change_id:'C0234',version:VERSION,gameweek:gw,horizon:h,final_status:finalStatus,action,gate_summary:{passed:gates.filter(g=>g.pass).length,total:gates.length,blockers},gates,advisories:{team_regime:teamAdvisory},decision_context:{c0230_team_regime_advisory:teamAdvisory,c0248_selector_authority:true,c0248_planner_run_id:c248?.planner_run_id,c0248_planner_version:c248?.planner_version,c0248_selected_normal_root:selectedRoot,c0248_selected_edge_vs_roll:selectedEdge,c0248_current_chip:chipChoice,c0248_price_all_wait:c248?.current_chip?.price_timing?.all_current_roots_wait_for_information,c0248_wildcard_raw_edge:c248?.terminal_sensitivity?.raw_exact_horizon_wildcard_edge,c0240_supporting_run_id:ar.data.id,c0240_supporting_status:ar.data.stability_status,c0242_decision_consistency_ready:consistencyReady,captaincy_decision_class:consistency?.captaincy?.decision_class,captaincy_nominal_mean_leader:consistency?.captaincy?.nominal_mean_leader,captaincy_tail_leader:consistency?.captaincy?.tail_leader,captaincy_floor_leader:consistency?.captaincy?.floor_leader,captaincy_equivalent_candidates:consistency?.captaincy?.equivalent_candidates,named_challengers:consistency?.named_challengers},fallback_reference:{c0240_survivor:legacySurvivor,c0248_selected_normal_path:selected,not_authorized:true},chip_state:{source:'PUBLIC_FPL_ENTRY_HISTORY_LIVE',verified:chipHistoryVerified,used:chipHistory,current_action:c248?.current_chip},deadline_state:{first_kickoff:kick.toISOString(),deadline_at:deadline.toISOString(),final_refresh_threshold:finalThreshold.toISOString(),latest_projection_at:latestProj.toISOString()},policy:{read_only:true,writes_manager_plan:false,executes_transfers:false,final_can_refuse:true,c0230_team_regime_shadow_advisory_only:true,c0248_selected_path_is_normal_action_authority:true,c0240_retained_as_supporting_adversarial_benchmark:true,c0242_named_challengers_must_be_resolved:true,c0242_captaincy_no_meaningful_edge_must_not_be_described_as_edge:true,c0248_current_chip_action_must_be_robust:true,price_signal_cannot_create_transfer:true,standing_final_t_minus_2h_refresh_required:true,historical_forecasts_append_only:true},historical_forecasts_rewritten:false,decisioning:false};
 const sig=await sha({VERSION,ensemble:er.data.input_signature,structural:sr.data.input_signature,forward:fr.data.input_signature,or:orr.data.input_signature,red:rr.data.input_signature,team:tr.data?.input_signature||null,c0240:ar.data.input_signature,c0242:consistency,c0248:{run_id:c248?.planner_run_id,ready:c248Ready,selected:selected,current_chip:c248?.current_chip,terminal:c248?.terminal_sensitivity},ready:ready?.decision_ready,projection:prr.data.id,finalRefreshGreen,chipHistory});
 const{data:old,error:oe}=await sb.from('fpl_autonomous_gate_runs').select('id').eq('input_signature',sig).maybeSingle();if(oe)throw oe;let id=old?.id?N(old.id):null;if(!id){const{data:ins,error:ie}=await sb.from('fpl_autonomous_gate_runs').insert({gameweek:gw,horizon:h,ensemble_run_id:er.data.id,structural_run_id:sr.data.id,forward_run_id:fr.data.id,or_utility_run_id:orr.data.id,red_team_run_id:rr.data.id,team_regime_run_id:tr.data?.id??null,input_signature:sig,result,final_status:finalStatus,historical_forecasts_rewritten:false}).select('id').single();if(ie)throw ie;id=N(ins.id)}
 return Response.json({...result,autonomous_gate_run_id:id,input_signature:sig});
}catch(e){return Response.json({ok:false,status:'AUTONOMOUS_GATE_ERROR',error:e instanceof Error?e.message:String(e),decisioning:false},{status:500})}});