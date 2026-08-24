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
  const {data:states,error:se}=await sb.from('team_state').select('id,team_id,as_of,sample_matches,xg_for_90,xg_against_90,state').in('team_id',teamIds).lte('as_of',observedAt).order('as_of',{ascending:false}).limit(500); if(se)throw se;
  const latest=new Map<number,any>(); for(const s of states||[])if(!latest.has(Number(s.team_id))&&s.xg_for_90!=null&&s.xg_against_90!=null)latest.set(Number(s.team_id),s);
  const matchIds=(fixtures||[]).map((f:any)=>Number(f.id));
  const {data:existing,error:ee}=await sb.from('fixture_prediction_snapshots').select('id,match_id,home_lambda,away_lambda,source_snapshot').in('match_id',matchIds).eq('gameweek',gw); if(ee)throw ee;
  const byMatch=new Map<number,any[]>(); for(const e of existing||[]){const k=Number(e.match_id);if(!byMatch.has(k))byMatch.set(k,[]);byMatch.get(k)!.push(e)}
  const rows:any[]=[]; const skipped:any[]=[];
  for(const f of fixtures||[]){
    const hs=latest.get(Number(f.home_team_id)),as=latest.get(Number(f.away_team_id));
    if(!hs||!as){skipped.push({match_id:f.id,reason:'missing_team_state'});continue}
    const hA=Number(hs.xg_for_90),hD=Number(hs.xg_against_90),aA=Number(as.xg_for_90),aD=Number(as.xg_against_90);
    const home=round(1.35*1.05*Math.pow(hA/1.35,.90)*Math.pow(aD/1.35,.70)*1.04,3);
    const away=round(1.35*1.05*Math.pow(aA/1.35,.90)*Math.pow(hD/1.35,.70)*.97,3);
    const duplicate=(byMatch.get(Number(f.id))||[]).some((e:any)=>e.source_snapshot?.generator==='forward_fixture_v0.1.3'&&Number(e.source_snapshot?.home_team_state?.id)===Number(hs.id)&&Number(e.source_snapshot?.away_team_state?.id)===Number(as.id)&&Number(e.home_lambda)===home&&Number(e.away_lambda)===away);
    if(duplicate){skipped.push({match_id:f.id,reason:'unchanged'});continue}
    const b=bundle(home,away); const forecastHash=await sha256(`forward_fixture_v0.1.3|${f.id}|${hs.id}|${as.id}|${home}|${away}`);
    rows.push({match_id:f.id,gameweek:gw,model_version_id:mv.id,captured_at:observedAt,kickoff_time:f.kickoff_time,is_pre_kickoff:true,frozen:false,home_lambda:home,away_lambda:away,score_matrix:b.score_matrix,top_scorelines:b.top_scorelines,markets:b.markets,confidence:null,change_reasons:[{type:'forward_structural_prior',generator:'forward_fixture_v0.1.3',note:'Structural fixture prior only; tactical, personnel, recent-form and market evidence remain separate layers'}],source_snapshot:{engine:'shared_scoreline_v0.1.3_role_prior',generator:'forward_fixture_v0.1.3',forecast_hash:forecastHash,model_version:'0.1.3',captured_at:observedAt,home_team_state:{id:hs.id,as_of:hs.as_of,sample_matches:hs.sample_matches,xg_for_90:hA,xg_against_90:hD,prior_source:hs.state?.prior_source??null},away_team_state:{id:as.id,as_of:as.as_of,sample_matches:as.sample_matches,xg_for_90:aA,xg_against_90:aD,prior_source:as.state?.prior_source??null},formula:{league_xg:1.35,goal_scale:1.05,attack_power:.90,defence_power:.70,home_multiplier:1.04,away_multiplier:.97},missing_is_not_zero:true}});
  }
  let inserted=0;if(rows.length){const {data,error}=await sb.from('fixture_prediction_snapshots').insert(rows).select('id');if(error)throw new Error(`forecast insert: ${emsg(error)}`);inserted=(data||[]).length}
  return new Response(JSON.stringify({ok:true,gameweek:gw,fixtures:fixtures.length,candidates:rows.length,inserted,skipped,observed_at:observedAt,generator:'forward_fixture_v0.1.3',model_version_id:mv.id,pre_kickoff_only:true}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:emsg(e)}),{status:500,headers:H})}});
