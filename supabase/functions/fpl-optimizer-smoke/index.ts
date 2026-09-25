import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION='C0287_INTERNAL_OPTIMIZER_SMOKE_V01';
const N=(x:any,d=0)=>Number.isFinite(Number(x))?Number(x):d;

// Internal-only test harness. It neither writes a manager plan nor returns a
// transfer/chip decision. The engine token stays server-side and the compact
// evidence record is the test result consumed by Work/SQL.
Deno.serve(async(req:Request)=>{
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)return Response.json({ok:false,status:'SERVICE_CREDENTIAL_MISSING'},{status:500});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const {data:token,error:authError}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
  if(authError||!token||req.headers.get('x-engine-token')!==token)return Response.json({ok:false,status:'UNAUTHORIZED'},{status:401});
  try{
    const body=await req.json().catch(()=>({}));
    const gw=N(body.gameweek,6),h=Math.max(1,Math.min(5,N(body.horizon,3)));
    const expectedRuns=Array.isArray(body.expected_prediction_run_ids)?body.expected_prediction_run_ids.map(Number):null;
    if(!gw)return Response.json({ok:false,status:'GAMEWEEK_INVALID'},{status:400});
    const r=await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fpl-full-pool-optimizer`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${key}`,'x-engine-token':String(token)},body:JSON.stringify({gameweek:gw,horizon:h,free_transfers:1})});
    const result=await r.json().catch(()=>null);
    const runs=Array.isArray(result?.prediction_runs)?result.prediction_runs:[];
    const runIds=runs.map((x:any)=>N(x.run_id));
    const checks={
      http_200:r.status===200,
      optimizer_ok:result?.ok===true,
      collectible_objective:result?.optimizer_version==='C0287_COLLECTIBLE_XI_CANONICAL_V01'&&result?.objective_contract?.raw_xv_sum_is_not_a_decision_objective===true,
      gameweek_identity:N(result?.gameweek)===gw,
      horizon_identity:runs.length===h&&runs.every((x:any,i:number)=>N(x.gameweek)===gw+i),
      rows_complete:runs.length===h&&N(result?.prediction_rows_loaded)>=604*h&&N(result?.role_rows_loaded)>=604*h,
      expected_runs:!expectedRuns||JSON.stringify(runIds)===JSON.stringify(expectedRuns),
      decision_read_only:result?.decisioning===false&&result?.writes_manager_plan===false
    };
    const pass=Object.values(checks).every(Boolean);
    const evidence={version:VERSION,gameweek:gw,horizon:h,http_status:r.status,checks,prediction_runs:runs,optimizer_version:result?.optimizer_version??null,objective_contract:result?.objective_contract??null,active_model:result?.model_version??null,roll_objective:result?.roll?.objective??null,decisioning:result?.decisioning??null,writes_manager_plan:result?.writes_manager_plan??null,rollback:'redeploy fpl-full-pool-optimizer-core-v02 version 1',historical_forecasts_rewritten:false};
    const {error:ie}=await sb.from('c0285_phase_evidence').insert({phase:'C0287-RUNTIME-SMOKE',captured_at:new Date().toISOString(),status:pass?'PASS':'FAIL',evidence});
    if(ie)throw ie;
    return Response.json({ok:pass,status:pass?'SMOKE_PASS':'SMOKE_FAIL',...evidence},{status:pass?200:409});
  }catch(e){return Response.json({ok:false,status:'SMOKE_EXCEPTION',error:e instanceof Error?e.message:String(e)},{status:500});}
});
