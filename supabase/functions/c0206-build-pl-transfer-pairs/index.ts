import { createClient } from 'supabase';
import Papa from 'papaparse';

const REPO='vaastav/Fantasy-Premier-League';
const COMMIT='9779cdbc0c07f6c900c2d0c181ddf6bb9c800f88';
const ROOT=`https://raw.githubusercontent.com/${REPO}/${COMMIT}/data`;
const pos=(v:any)=>Number(v)===2?'DEF':Number(v)===3?'MID':Number(v)===4?'FWD':null;
const clean=(v:any)=>v===undefined||v===null?null:String(v).trim();
const num=(v:any)=>{const s=clean(v);if(s===null||s==='')return null;const n=Number(s);return Number.isFinite(n)?n:null};
const err=(e:any)=>e instanceof Error?e.message:String(e);
async function csv(path:string){const r=await fetch(`${ROOT}/${path}`);if(!r.ok)throw new Error(`${r.status} ${path}`);return Papa.parse(await r.text(),{header:true,skipEmptyLines:true}).data as any[];}
async function season(season:string){
  const players=await csv(`${season}/players_raw.csv`);
  const byId=new Map<number,any>();
  for(const p of players){const id=Number(p.id),code=Number(p.code);if(id&&code)byId.set(id,p)}
  const teams=new Map<number,Set<string>>();
  for(let start=1;start<=38;start+=8){
    const jobs=[] as Promise<any[]>[];
    for(let gw=start;gw<start+8&&gw<=38;gw++)jobs.push(csv(`${season}/gws/gw${gw}.csv`));
    for(const rows of await Promise.all(jobs))for(const r of rows){const id=Number(r.element);const team=clean(r.team);if(!id||!team)continue;let s=teams.get(id);if(!s){s=new Set<string>();teams.set(id,s)}s.add(team)}
  }
  const out=new Map<number,any>();
  for(const [id,p] of byId){
    const code=Number(p.code),position=pos(p.element_type),minutes=num(p.minutes),xg=num(p.expected_goals),xa=num(p.expected_assists),teamCode=num(p.team_code);const set=teams.get(id)||new Set<string>();
    if(!position||minutes===null||minutes<450||xg===null||xa===null||teamCode===null||set.size!==1)continue;
    out.set(code,{code,id,player_name:[clean(p.first_name),clean(p.second_name)].filter(Boolean).join(' '),web_name:clean(p.web_name),position,minutes,xg,xa,team_code:Number(teamCode),team_name:[...set][0],team_count:set.size});
  }
  return {season,players_total:players.length,eligible_single_club:out.size,byCode:out};
}
function chunks<T>(a:T[],n=200){const z:T[][]=[];for(let i=0;i<a.length;i+=n)z.push(a.slice(i,i+n));return z}
Deno.serve(async(req)=>{try{
  if(req.method!=='POST')return Response.json({ok:false,error:'POST required'},{status:405});
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Missing service credential');
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const {data:adminToken,error:authError}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});if(authError||!adminToken||req.headers.get('x-engine-token')!==adminToken)return Response.json({ok:false,error:'unauthorized'},{status:401});
  const body=await req.json().catch(()=>({}));const cohort=String(body.cohort||'');
  const cfg=cohort==='VALIDATION'?{source:'2023-24',dest:'2024-25',sourceLabel:'2023-2024',destLabel:'2024-2025',split:'VALIDATION'}:cohort==='TRAIN'?{source:'2022-23',dest:'2023-24',sourceLabel:'2022-2023',destLabel:'2023-2024',split:'TRAIN'}:null;
  if(!cfg)return Response.json({ok:false,error:'cohort must be VALIDATION or TRAIN'},{status:400});
  const [s,d]=await Promise.all([season(cfg.source),season(cfg.dest)]);const rows:any[]=[];let shared=0,sameClub=0;
  for(const [code,a] of s.byCode){const b=d.byCode.get(code);if(!b)continue;shared++;if(a.team_code===b.team_code){sameClub++;continue}rows.push({
    pair_key:`C0206_${cfg.split}_${cfg.source.replace('-','_')}_${cfg.dest.replace('-','_')}_PLPL_${code}`,
    player_name:b.player_name||a.player_name,player_identity_key:`fpl_player_code:${code}`,
    source_season:cfg.sourceLabel,destination_season:cfg.destLabel,source_competition:'Premier League',destination_competition:'Premier League',
    source_club:a.team_name,destination_club:b.team_name,position_group:b.position||a.position,
    source_minutes:a.minutes,destination_minutes:b.minutes,source_xg:a.xg,source_xa:a.xa,destination_xg:b.xg,destination_xa:b.xa,
    source_provenance:{metric_source:'Official FPL archive via vaastav/Fantasy-Premier-League',repository:REPO,repository_commit:COMMIT,path:`data/${cfg.source}/players_raw.csv`,identity_method:'stable FPL player code',team_validation:`data/${cfg.source}/gws/gw1..gw38.csv`,source_element_id:a.id,source_team_code:a.team_code,team_count:a.team_count,minutes_field:'minutes',xg_field:'expected_goals',xa_field:'expected_assists'},
    destination_provenance:{metric_source:'Official FPL archive via vaastav/Fantasy-Premier-League',repository:REPO,repository_commit:COMMIT,path:`data/${cfg.dest}/players_raw.csv`,identity_method:'stable FPL player code',team_validation:`data/${cfg.dest}/gws/gw1..gw38.csv`,destination_element_id:b.id,destination_team_code:b.team_code,team_count:b.team_count,minutes_field:'minutes',xg_field:'expected_goals',xa_field:'expected_assists'},
    cohort_split:cfg.split,pair_quality_status:'ELIGIBLE',
    evidence:{change_id:'C0206',cohort:`${cfg.sourceLabel}_to_${cfg.destLabel}`,cohort_role:cfg.split==='VALIDATION'?'pre-test validation PL-to-PL control':'historical training PL-to-PL control',used_for_fitting:cfg.split==='TRAIN',used_for_transform_scale:cfg.split==='TRAIN',source_minute_gate:450,destination_minute_gate:450,source_preferred_900:a.minutes>=900,destination_preferred_900:b.minutes>=900,single_club_each_season_required:true,club_changed_between_seasons:true,goalkeepers_excluded:true,missing_data_is_not_zero:true,current_2026_27_target_outcomes_used:false,historical_forecasts_rewritten:false},
    research_only:true,model_effect_enabled:false
  })}
  let inserted=0;for(const c of chunks(rows)){const {data,error}=await sb.from('research_c0206_foreign_translation_pairs').upsert(c,{onConflict:'pair_key',ignoreDuplicates:true}).select('pair_key');if(error)throw error;inserted+=(data||[]).length}
  return Response.json({ok:true,change_id:'C0206',cohort:cfg.split,source_season:cfg.sourceLabel,destination_season:cfg.destLabel,source_players_total:s.players_total,destination_players_total:d.players_total,source_eligible_single_club:s.eligible_single_club,destination_eligible_single_club:d.eligible_single_club,shared_eligible_codes:shared,same_club_excluded:sameClub,candidate_pairs:rows.length,inserted_or_returned:inserted,repository:REPO,repository_commit:COMMIT,model_effect_enabled:false,historical_forecasts_rewritten:false});
}catch(e){return Response.json({ok:false,error:err(e)},{status:500})}});