import { createClient } from 'supabase';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};
const n=(v:any)=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    if(req.method!=='GET')return new Response(JSON.stringify({ok:false,error:'GET required'}),{status:405,headers:cors});
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),requested=Number(u.searchParams.get('gw')||0);

    const {data:runs,error:re}=await sb.from('gameweek_prediction_runs').select('id,gameweek,generated_at').eq('frozen',true).order('gameweek',{ascending:true}).order('generated_at',{ascending:false});
    if(re)throw re;if(!runs?.length)throw new Error('No prediction runs');
    const gw=requested>=1&&requested<=38?requested:Math.max(...runs.map((x:any)=>Number(x.gameweek)));

    const [{data:matches,error:me},{data:teams,error:te},{data:players,error:pe},{data:rr,error:rre},{data:shadow,error:se}]=await Promise.all([
      sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id,home_score,away_score,finished').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('teams').select('id,name,short_name'),
      sb.from('players').select('id,web_name,position,team_id'),
      sb.from('gameweek_result_runs').select('id,gameweek,observed_at,is_final,source').eq('gameweek',gw).order('observed_at',{ascending:false}).limit(1).maybeSingle(),
      sb.from('matchup_predictive_predictions').select('id,match_id,gameweek,split,variant_key,captured_at,input_cutoff,kickoff_time,baseline_home_lambda,baseline_away_lambda,home_lambda,away_lambda,markets,home_log_adjustment,away_log_adjustment,chronology_valid,actual_data_used,model_effect_enabled').eq('experiment_key','E0011').eq('gameweek',gw).in('variant_key',['BASE','COMBINED_V01']).order('captured_at',{ascending:false})
    ]);
    if(me)throw me;if(te)throw te;if(pe)throw pe;if(rre)throw rre;if(se)throw se;
    const tm=new Map((teams||[]).map((x:any)=>[Number(x.id),x]));
    const pm=new Map((players||[]).map((x:any)=>[Number(x.id),x]));

    let actuals:any[]=[];
    if(rr?.id){
      const {data:a,error:ae}=await sb.from('player_gameweek_actuals').select('player_id,gameweek,minutes,starts,total_points,goals,assists,clean_sheets,bonus,bps,defensive_contribution,xg,xa,xgi').eq('result_run_id',rr.id);
      if(ae)throw ae;
      actuals=(a||[]).map((x:any)=>{const p=pm.get(Number(x.player_id)),t=p?tm.get(Number(p.team_id)):null;return {player_id:Number(x.player_id),name:p?.web_name||null,team:t?.name||null,position:p?.position||null,minutes:Number(x.minutes||0),starts:Number(x.starts||0),total_points:Number(x.total_points||0),goals:Number(x.goals||0),assists:Number(x.assists||0),clean_sheets:Number(x.clean_sheets||0),bonus:Number(x.bonus||0),bps:Number(x.bps||0),defensive_contribution:Number(x.defensive_contribution||0),xg:n(x.xg),xa:n(x.xa),xgi:n(x.xgi)};});
    }

    const latestShadow=new Map<string,any>();
    for(const x of shadow||[]){const k=`${x.match_id}:${x.variant_key}`;if(!latestShadow.has(k))latestShadow.set(k,x)}
    const fixture_rows=(matches||[]).map((m:any)=>{
      const home=tm.get(Number(m.home_team_id)),away=tm.get(Number(m.away_team_id));
      const base=latestShadow.get(`${m.id}:BASE`)||null,obs=latestShadow.get(`${m.id}:COMBINED_V01`)||null;
      return {match_id:Number(m.id),kickoff_time:m.kickoff_time,home:home?.name||null,away:away?.name||null,finished:Boolean(m.finished),actual:m.home_score==null||m.away_score==null?null:{home_score:Number(m.home_score),away_score:Number(m.away_score)},baseline:base?{home_lambda:n(base.home_lambda),away_lambda:n(base.away_lambda),markets:base.markets||{},captured_at:base.captured_at}:null,under_observation:obs?{home_lambda:n(obs.home_lambda),away_lambda:n(obs.away_lambda),markets:obs.markets||{},home_log_adjustment:n(obs.home_log_adjustment),away_log_adjustment:n(obs.away_log_adjustment),captured_at:obs.captured_at,chronology_valid:Boolean(obs.chronology_valid),actual_data_used:Boolean(obs.actual_data_used),model_effect_enabled:Boolean(obs.model_effect_enabled)}:null};
    });

    let validation_status:any=null;
    try{const {data:s}=await sb.rpc('matchup_predictive_validation_status_v01');validation_status=s||null}catch(_){validation_status=null}

    return new Response(JSON.stringify({ok:true,gameweek:gw,result_run:rr||null,player_actuals:actuals,fixtures:fixture_rows,observation:{experiment_key:'E0011',label:'UNDER OBSERVATION',production_effect:false,validation_status}}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});