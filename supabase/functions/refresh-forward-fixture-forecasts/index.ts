import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const emsg=(e:any)=>e instanceof Error?e.message:typeof e==='string'?e:JSON.stringify(e);
const round=(n:number,d:number)=>Number(n.toFixed(d));
const factorial=(n:number)=>{let x=1;for(let i=2;i<=n;i++)x*=i;return x};
async function sha256(s:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function bundle(home:number,away:number){
  const matrix:Record<string,number>={};
  const rows:{h:number,a:number,p:number}[]=[];
  let hw=0,dr=0,aw=0,o25=0,btts=0;
  for(let h=0;h<=7;h++)for(let a=0;a<=7;a++){
    const ph=Math.exp(-home)*Math.pow(home,h)/factorial(h);
    const pa=Math.exp(-away)*Math.pow(away,a)/factorial(a);
    const p=ph*pa; rows.push({h,a,p}); matrix[`${h}-${a}`]=round(p,6);
    if(h>a)hw+=p; else if(h===a)dr+=p; else aw+=p;
    if(h+a>=3)o25+=p; if(h>0&&a>0)btts+=p;
  }
  rows.sort((x,y)=>y.p-x.p||x.h-y.h||x.a-y.a);
  return {
    score_matrix:matrix,
    top_scorelines:rows.slice(0,5).map(x=>({score:`${x.h}-${x.a}`,prob:round(x.p,6)})),
    markets:{home_win:round(hw,4),draw:round(dr,4),away_win:round(aw,4),over_2_5:round(o25,4),under_2_5:round(1-o25,4),btts_yes:round(btts,4),btts_no:round(1-btts,4),home_clean_sheet:round(Math.exp(-away),4),away_clean_sheet:round(Math.exp(-home),4)}
  };
}
function seasonWeights(matches:number){
  if(matches<=0)return {current:0,prior:1,band:'PRIOR_ONLY_NO_CURRENT_MATCHES'};
  const prior=matches<=4?.25:matches===5?.20:matches===6?.15:matches===7?.10:matches===8?.05:0;
  return {current:1-prior,prior,band:`CURRENT_${Math.round((1-prior)*100)}_PRIOR_${Math.round(prior*100)}`};
}
function canonicalState(row:any){
  const matches=Number(row.completed_matches||0),weights=seasonWeights(matches);
  const currentAttack=row.current_xg_for_90==null?null:.75*Number(row.current_xg_for_90)+.25*Number(row.current_goals_for_90);
  const currentDefence=row.current_xg_against_90==null?null:.80*Number(row.current_xg_against_90)+.20*Number(row.current_goals_against_90);
  const priorAttack=row.prior_xg_for_90==null?null:Number(row.prior_xg_for_90),priorDefence=row.prior_xg_against_90==null?null:Number(row.prior_xg_against_90);
  const blend=(current:number|null,prior:number|null)=>weights.current===0?prior:weights.prior===0?current:current==null||prior==null?null:weights.current*current+weights.prior*prior;
  return {...row,matches,weights,currentAttack,currentDefence,attack:blend(currentAttack,priorAttack),defence:blend(currentDefence,priorDefence)};
}

Deno.serve(async(req)=>{try{
  if(req.method!=='POST')return new Response(JSON.stringify({ok:false,error:'POST required'}),{status:405,headers:H});
  const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const key=ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if(!key)throw new Error('Missing service credential');
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const {data:adminToken,error:authError}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
  if(authError||!adminToken||req.headers.get('x-engine-token')!==adminToken)return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:H});
  const body=await req.json().catch(()=>({})); const observedAt=new Date().toISOString(); let gw=Number(body.gameweek||0);
  if(!gw){const {data:nxt,error}=await sb.from('matches').select('gameweek,kickoff_time').eq('source','fpl').gt('kickoff_time',observedAt).not('gameweek','is',null).order('kickoff_time',{ascending:true}).limit(1).maybeSingle();if(error)throw error;gw=Number(nxt?.gameweek||0)}
  if(!gw)return new Response(JSON.stringify({ok:true,gameweek:null,fixtures:0,inserted:0,message:'No future FPL fixture'}),{headers:H});
  const {data:fixtures,error:fe}=await sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id').eq('source','fpl').eq('gameweek',gw).gt('kickoff_time',observedAt).order('kickoff_time',{ascending:true}); if(fe)throw fe;
  if(!fixtures?.length)return new Response(JSON.stringify({ok:true,gameweek:gw,fixtures:0,inserted:0,message:'No pre-kickoff fixtures'}),{headers:H});
  const {data:mv,error:mve}=await sb.from('model_versions').select('id,version').eq('version','0.1.3').eq('is_active',true).order('id',{ascending:false}).limit(1).maybeSingle(); if(mve)throw mve; if(!mv)throw new Error('Active model version 0.1.3 not found');
  const teamIds=[...new Set((fixtures||[]).flatMap((f:any)=>[Number(f.home_team_id),Number(f.away_team_id)]))];
  const {data:states,error:se}=await sb.from('current_season_team_performance_states').select('id,season_start,team_id,as_of,completed_matches,prior_source,prior_xg_for_90,prior_xg_against_90,current_goals_for_90,current_goals_against_90,current_xg_for_90,current_xg_against_90,current_shots_for_90,current_shots_against_90,current_sot_for_90,current_sot_against_90,current_big_chances_for_90,current_big_chances_against_90,process_coverage,evidence_hash').in('team_id',teamIds).lte('as_of',observedAt).order('as_of',{ascending:false}).limit(500); if(se)throw se;
  const latest=new Map<number,any>(); for(const raw of states||[]){const s=canonicalState(raw);if(!latest.has(Number(s.team_id))&&s.attack!=null&&s.defence!=null)latest.set(Number(s.team_id),s)}
  const matchIds=(fixtures||[]).map((f:any)=>Number(f.id));
  const {data:existing,error:ee}=await sb.from('fixture_prediction_snapshots').select('id,match_id,home_lambda,away_lambda,source_snapshot').in('match_id',matchIds).eq('gameweek',gw); if(ee)throw ee;
  const byMatch=new Map<number,any[]>(); for(const e of existing||[]){const k=Number(e.match_id);if(!byMatch.has(k))byMatch.set(k,[]);byMatch.get(k)!.push(e)}
  const rows:any[]=[]; const skipped:any[]=[];
  for(const f of fixtures||[]){
    const hs=latest.get(Number(f.home_team_id)),as=latest.get(Number(f.away_team_id));
    if(!hs||!as){skipped.push({match_id:f.id,reason:'missing_team_state'});continue}
    const hA=Number(hs.attack),hD=Number(hs.defence),aA=Number(as.attack),aD=Number(as.defence);
    const home=round(1.35*1.05*Math.pow(hA/1.35,.90)*Math.pow(aD/1.35,.70)*1.04,3);
    const away=round(1.35*1.05*Math.pow(aA/1.35,.90)*Math.pow(hD/1.35,.70)*.97,3);
    const duplicate=(byMatch.get(Number(f.id))||[]).some((e:any)=>e.source_snapshot?.generator==='forward_fixture_v0.2.0_current_season'&&Number(e.source_snapshot?.home_team_state?.id)===Number(hs.id)&&Number(e.source_snapshot?.away_team_state?.id)===Number(as.id)&&Number(e.home_lambda)===home&&Number(e.away_lambda)===away);
    if(duplicate){skipped.push({match_id:f.id,reason:'unchanged'});continue}
    const b=bundle(home,away); const forecastHash=await sha256(`forward_fixture_v0.2.0_current_season|${f.id}|${hs.id}|${as.id}|${home}|${away}`);
    const statePayload=(s:any)=>({id:s.id,as_of:s.as_of,completed_matches:s.matches,current_season_weight:s.weights.current,prior_season_weight:s.weights.prior,weight_band:s.weights.band,current_goals_for_90:s.current_goals_for_90,current_goals_against_90:s.current_goals_against_90,current_xg_for_90:s.current_xg_for_90,current_xg_against_90:s.current_xg_against_90,canonical_attack:s.attack,canonical_defence:s.defence,prior_source:s.prior_source,evidence_hash:s.evidence_hash});
    rows.push({match_id:f.id,gameweek:gw,model_version_id:mv.id,captured_at:observedAt,kickoff_time:f.kickoff_time,is_pre_kickoff:true,frozen:false,home_lambda:home,away_lambda:away,score_matrix:b.score_matrix,top_scorelines:b.top_scorelines,markets:b.markets,confidence:null,change_reasons:[{type:'canonical_current_season_state',generator:'forward_fixture_v0.2.0_current_season',note:'Current-season xG and goals are the performance baseline; prior season is capped at 25% after one match and decays to zero at nine matches.'}],source_snapshot:{change_id:'C0283',engine:'shared_scoreline_v0.2.0_current_season',generator:'forward_fixture_v0.2.0_current_season',forecast_hash:forecastHash,model_version:'0.1.3',captured_at:observedAt,home_team_state:statePayload(hs),away_team_state:statePayload(as),formula:{league_xg:1.35,goal_scale:1.05,attack_power:.90,defence_power:.70,home_multiplier:1.04,away_multiplier:.97,current_attack_mix:{xg:.75,goals:.25},current_defence_mix:{xga:.80,goals_against:.20},prior_cap_after_first_match:.25,prior_zero_after_matches:9},legacy_cross_season_l5_consumed:false,legacy_cross_season_l10_consumed:false,legacy_l20_consumed:false,missing_is_not_zero:true}});
  }
  let inserted=0;if(rows.length){const {data,error}=await sb.from('fixture_prediction_snapshots').insert(rows).select('id');if(error)throw new Error(`forecast insert: ${emsg(error)}`);inserted=(data||[]).length}
  return new Response(JSON.stringify({ok:true,gameweek:gw,fixtures:fixtures.length,candidates:rows.length,inserted,skipped,observed_at:observedAt,generator:'forward_fixture_v0.2.0_current_season',model_version_id:mv.id,pre_kickoff_only:true,historical_forecasts_rewritten:false}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:emsg(e)}),{status:500,headers:H})}});
