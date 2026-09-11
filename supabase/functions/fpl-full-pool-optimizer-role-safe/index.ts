import { createClient } from 'jsr:@supabase/supabase-js@2';

const ADAPTER_VERSION='C0240_ROLE_SAFE_OPTIMIZER_ADAPTER_V02';
const CORE='fpl-full-pool-optimizer-core-v02';
const CONTROL=new Set(['HOLDING_MIDFIELDER','CENTRE_BACK','HYBRID_DEFENDER','WIDE_BACK','GOALKEEPER']);
const N=(x:any,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const uniq=(x:any[])=>[...new Set(x.map(Number).filter(v=>Number.isInteger(v)&&v>0))];

Deno.serve(async(req:Request)=>{try{
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)return Response.json({ok:false,error:'service credential missing'},{status:500});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const{data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
  if(ae||!tok||req.headers.get('x-engine-token')!==tok)return Response.json({ok:false,error:'unauthorized'},{status:401});
  const body=await req.json().catch(()=>({}));
  const gw=N(body.gameweek),h=Math.max(1,Math.min(5,N(body.horizon,3)));
  if(!gw)return Response.json({ok:false,error:'gameweek invalid'},{status:400});
  const gws=Array.from({length:h},(_,i)=>gw+i);

  const[{data:players,error:pe},{data:squad,error:se}]=await Promise.all([
    sb.from('players').select('id,position'),
    sb.from('squad_members').select('player_id').eq('active',true)
  ]);
  if(pe||se)throw pe||se;
  const pos=new Map((players||[]).map((p:any)=>[N(p.id),String(p.position||'')]));
  const current=new Set((squad||[]).map((s:any)=>N(s.player_id)));
  const roleRows:any[]=[];
  for(const g of gws){
    const{data,error}=await sb.from('current_player_fixture_roles').select('player_id,gameweek,primary_role,confidence').eq('gameweek',g).range(0,999);
    if(error)throw error;
    if((data||[]).length<500)return Response.json({ok:false,status:'ROLE_SAFE_ADAPTER_ROLE_STATE_INCOMPLETE',gameweek:g,rows:(data||[]).length,decisioning:false},{status:409});
    roleRows.push(...(data||[]));
  }
  const agg=new Map<number,{seen:number,risky:number}>();
  for(const r of roleRows){const id=N(r.player_id);if(!['MID','FWD'].includes(pos.get(id)||''))continue;const a=agg.get(id)||{seen:0,risky:0};a.seen++;if(N(r.confidence)>=.70&&CONTROL.has(String(r.primary_role||'')))a.risky++;agg.set(id,a)}
  const riskIds=[...agg.entries()].filter(([,a])=>a.seen>0&&a.risky/a.seen>=.5).map(([id])=>id);
  const riskSet=new Set(riskIds);
  const required=uniq(Array.isArray(body.required_player_ids)?body.required_player_ids:[]);
  const suppliedExcluded=uniq(Array.isArray(body.excluded_player_ids)?body.excluded_player_ids:[]);
  const constrained=required.length>0||suppliedExcluded.length>0||body.max_transfer_count!=null||body.adversarial_context!=null;
  const profileOnly=body.profile_only===true;
  const requiredConflict=required.filter(id=>riskSet.has(id));
  if(requiredConflict.length)return Response.json({ok:false,status:'ROLE_GATE_REQUIRED_PLAYER_CONFLICT',player_ids:requiredConflict,role_gate:{confidence_threshold:.70,horizon_majority_required:true,penalty_taker_exemption:false},decisioning:false},{status:409});

  const callCore=async(b:any)=>{
    const r=await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${CORE}`,{method:'POST',headers:{'content-type':'application/json','x-engine-token':String(tok),'authorization':`Bearer ${key}`},body:JSON.stringify(b)});
    const j=await r.json().catch(()=>null);return{http:r.status,ok:r.ok&&j?.ok===true,result:j};
  };
  const safeSquad=(x:any,allowRetained=false)=>Array.isArray(x?.squad)&&!x.squad.some((p:any)=>riskSet.has(N(p.player_id))&&(!allowRetained||!current.has(N(p.player_id))));
  const annotate=(j:any)=>({...j,role_safe_adapter_version:ADAPTER_VERSION,role_safe_policy:{control_defensive_mid_fwd_new_selection_forbidden:true,confidence_threshold:.70,horizon_majority_required:true,penalty_taker_exemption:false,risk_player_ids:riskIds},historical_forecasts_rewritten:false});

  if(constrained){
    const merged=uniq([...suppliedExcluded,...riskIds.filter(id=>!current.has(id))]);
    const z=await callCore({...body,excluded_player_ids:merged});
    if(!z.ok)return Response.json(annotate(z.result||{ok:false,status:'ROLE_SAFE_CORE_FAILURE'}),{status:z.http||500});
    if(z.result?.constrained_best&&!safeSquad(z.result.constrained_best,true))return Response.json(annotate({ok:false,status:'ROLE_SAFE_CONSTRAINED_RESULT_REJECTED',decisioning:false}),{status:409});
    return Response.json(annotate(z.result));
  }

  const base=await callCore(body);
  if(!base.ok)return Response.json(annotate(base.result||{ok:false,status:'ROLE_SAFE_CORE_FAILURE'}),{status:base.http||500});
  let out:any=base.result;

  if(profileOnly){
    if(out.wildcard_benchmark&&!safeSquad(out.wildcard_benchmark,false)){
      const z=await callCore({...body,free_transfers:15,max_transfer_count:15,excluded_player_ids:riskIds});
      if(!z.ok||!z.result?.constrained_best)return Response.json(annotate({ok:false,status:'ROLE_SAFE_PROFILE_SEARCH_FAILED',profile:body.ensemble_profile,decisioning:false}),{status:409});
      const c=z.result.constrained_best;
      out={...out,wildcard_benchmark:{...c,scenario:'WILDCARD_IDEAL_FRESH',transfer_cost_points:0,changes_required:N(c.transfers_in),search_independent_of_current_squad:true,profile:body.ensemble_profile},role_safe_profile_recomputed:true};
    }
    return Response.json(annotate(out));
  }

  const err=N(out.model_error_margin_points,1),roll=out.roll;
  const safeScenarios=(Array.isArray(out.transfer_scenarios)?out.transfer_scenarios:[]).filter((x:any)=>safeSquad(x,true)).sort((a:any,b:any)=>N(b.objective)-N(a.objective)||N(a.transfers_in)-N(b.transfers_in));
  const bestSafeNoChip=safeScenarios[0]||roll;
  const recommended=N(bestSafeNoChip?.objective)-N(roll?.objective)>=err?bestSafeNoChip:roll;

  let fresh=(Array.isArray(out.fresh_ensemble)?out.fresh_ensemble:[]).filter((x:any)=>safeSquad(x,false));
  if(!fresh.length){
    const z=await callCore({...body,ensemble_profile:'BALANCED_VALUE',free_transfers:15,max_transfer_count:15,excluded_player_ids:riskIds});
    if(z.ok&&z.result?.constrained_best&&safeSquad(z.result.constrained_best,false))fresh=[{...z.result.constrained_best,profile:'BALANCED_VALUE',scenario:'WILDCARD_IDEAL_FRESH',transfer_cost_points:0,changes_required:N(z.result.constrained_best.transfers_in),search_independent_of_current_squad:true}];
  }
  if(!fresh.length)return Response.json(annotate({ok:false,status:'ROLE_SAFE_FRESH_ENSEMBLE_EMPTY',decisioning:false}),{status:409});
  fresh.sort((a:any,b:any)=>N(b.objective)-N(a.objective));
  const wc=fresh[0],wcGain=N(wc.objective)-N(recommended.objective),wcGainRoll=N(wc.objective)-N(roll.objective);
  const wcClass=wcGain<err?'NO_MEANINGFUL_EDGE_VS_BEST_NO_CHIP':N(wc.transfers_in)<=N(out.free_transfers)+1?'REACHABLE_WITH_NORMAL_TRANSFERS':(wcGain>=Math.max(4,2*err)&&N(wc.transfers_in)>=4?'STRUCTURAL_WILDCARD_CANDIDATE':'DEFER_WILDCARD_EDGE_INSUFFICIENT');
  const wildcard={...wc,scenario:'WILDCARD_IDEAL_FRESH',transfer_cost_points:0,objective_gain_vs_best_no_chip:+wcGain.toFixed(3),objective_gain_vs_roll:+wcGainRoll.toFixed(3),changes_required:N(wc.transfers_in),classification:wcClass,search_independent_of_current_squad:true};
  out={...out,best_uncontrolled:bestSafeNoChip,role_controlled_best:bestSafeNoChip,recommended_by_noise_gate:recommended,transfer_scenarios:safeScenarios,fresh_ensemble:fresh,wildcard_benchmark:wildcard,wildcard_incremental_edge_vs_best_no_chip:+wcGain.toFixed(3),wildcard_classification:wcClass,objective_gap_best_vs_roll:+(N(bestSafeNoChip.objective)-N(roll.objective)).toFixed(3),edge_classification:N(recommended.objective)-N(roll.objective)>=err?'ROBUST_VS_ROLL_WITHIN_SEARCH':'NO_MEANINGFUL_EDGE_VS_ROLL',role_control_policy:{...(out.role_control_policy||{}),control_role_risk_definition:'FPL MID/FWD with CONTROL_DEFENSIVE role in >=50% of exact-GW role snapshots with confidence >=0.70; penalty duty does not cancel role risk',penalty_taker_exemption:false},role_safe_recomputed:true};
  return Response.json(annotate(out));
}catch(e){return Response.json({ok:false,status:'ROLE_SAFE_OPTIMIZER_ADAPTER_ERROR',error:e instanceof Error?e.message:String(e),decisioning:false},{status:500})}});
