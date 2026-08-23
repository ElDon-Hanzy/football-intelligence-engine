import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
const H={'Access-Control-Allow-Origin':'*','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
Deno.serve(async req=>{try{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'),key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Missing service credential');
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||1);
  const {data:run,error:re}=await sb.from('blind_fixture_replay_runs').select('*').eq('gameweek',gw).order('id',{ascending:false}).limit(1).maybeSingle();if(re)throw re;
  if(!run)return new Response(JSON.stringify({ok:true,gameweek:gw,available:false,research_only:true,fixtures:[]}),{headers:H});
  const [mr,sr,er,tr,fr]=await Promise.all([
    sb.from('blind_fixture_replay_matches').select('*').eq('run_id',run.id).order('kickoff_time'),
    sb.from('blind_fixture_replay_signals').select('*').eq('run_id',run.id),
    sb.from('blind_fixture_replay_evaluations').select('*').eq('run_id',run.id),
    sb.from('teams').select('id,name,short_name'),
    sb.from('matches').select('id,home_team_id,away_team_id,home_score,away_score,finished').eq('source','fpl').eq('gameweek',gw)
  ]);for(const x of [mr,sr,er,tr,fr])if(x.error)throw x.error;
  const tm=new Map((tr.data||[]).map((x:any)=>[Number(x.id),x])),fm=new Map((fr.data||[]).map((x:any)=>[Number(x.id),x])),ev=new Map((er.data||[]).map((x:any)=>[Number(x.match_id),x]));
  const fixtures=(mr.data||[]).map((m:any)=>{const f=fm.get(Number(m.match_id)),home=tm.get(Number(f?.home_team_id)),away=tm.get(Number(f?.away_team_id));const sig=(sr.data||[]).filter((x:any)=>Number(x.match_id)===Number(m.match_id));return{match_id:m.match_id,kickoff_time:m.kickoff_time,home_team:home||null,away_team:away||null,base_prediction_available:m.base_prediction_available,base_prediction:m.base_prediction_available?{home_lambda:m.home_lambda,away_lambda:m.away_lambda,top_scoreline:m.top_scoreline,top_scoreline_probability:m.top_scoreline_probability,markets:m.markets,captured_at:m.base_prediction_captured_at}:null,expected_xi_available:{home:m.home_expected_xi_available,away:m.away_expected_xi_available},signals:{home:sig.filter((x:any)=>Number(x.team_id)===Number(f?.home_team_id)),away:sig.filter((x:any)=>Number(x.team_id)===Number(f?.away_team_id))},evaluation:ev.get(Number(m.match_id))||null,finished:Boolean(f?.finished),actual_score:f?.finished?`${f?.home_score}-${f?.away_score}`:null,research_only:true,forward_valid:false,actual_data_used_in_generation:false};});
  return new Response(JSON.stringify({ok:true,gameweek:gw,available:true,run:{id:run.id,replay_version:run.replay_version,created_at:run.created_at,input_policy:run.input_policy,actual_data_used:false,model_effect_enabled:false},fixtures,research_only:true,forward_valid:false}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}});
