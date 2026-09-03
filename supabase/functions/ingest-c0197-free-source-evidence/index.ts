import { createClient } from 'supabase';
import Papa from 'papaparse';

const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const REPO='olbauday/FPL-Core-Insights';
const SOURCE='fpl_core_insights_github';
const n=(v:any)=>v===undefined||v===null||String(v).trim()===''?null:Number(v);
const i=(v:any)=>{const x=n(v);return x===null||!Number.isFinite(x)?null:Math.round(x)};
const b=(v:any)=>String(v).toLowerCase()==='true';
const chunks=<T>(a:T[],z=200)=>{const out:T[][]=[];for(let k=0;k<a.length;k+=z)out.push(a.slice(k,k+z));return out};
const enc=new TextEncoder();
async function sha256(s:string){const d=await crypto.subtle.digest('SHA-256',enc.encode(s));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function fetchText(url:string){const r=await fetch(url,{cache:'no-store',headers:{'user-agent':'FootballIntelligence/0.5','accept':'text/plain'}});if(!r.ok)throw new Error(`${url} ${r.status}`);return await r.text()}
async function csv(url:string){const text=await fetchText(url);const rows=Papa.parse(text,{header:true,skipEmptyLines:true,transformHeader:(h:string)=>h.trim().replace(/^\uFEFF/,'')}).data as any[];return {text,rows}}
async function resolveCommit(asOf:string){
 const url=`https://api.github.com/repos/${REPO}/commits?sha=main&until=${encodeURIComponent(asOf)}&per_page=1`;
 const r=await fetch(url,{cache:'no-store',headers:{'user-agent':'FootballIntelligence/0.5','accept':'application/vnd.github+json'}});
 if(!r.ok)throw new Error(`GitHub commit resolution ${r.status}`);
 const a=await r.json();if(!Array.isArray(a)||!a[0]?.sha)throw new Error(`No source commit at/before ${asOf}`);
 return {sha:String(a[0].sha),at:String(a[0]?.commit?.committer?.date||a[0]?.commit?.author?.date||'')};
}
Deno.serve(async(req)=>{try{
 if(req.method!=='POST')return new Response(JSON.stringify({ok:false,error:'POST required'}),{status:405,headers:H});
 const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'),key=ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Missing service credential');
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
 const {data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});if(ae||!tok||req.headers.get('x-engine-token')!==tok)return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:H});
 const body=await req.json().catch(()=>({}));const season=String(body.season||'2026-2027');let gw=Number(body.gameweek||0);const sourceAsOf=new Date(body.as_of||new Date().toISOString()).toISOString();
 if(!gw){const {data:m,error}=await sb.from('matches').select('gameweek').eq('source','fpl').eq('finished',true).lte('kickoff_time',sourceAsOf).not('gameweek','is',null).order('gameweek',{ascending:false}).limit(1).maybeSingle();if(error)throw error;gw=Number(m?.gameweek||0)}
 if(!gw&&gw!==0)throw new Error('No gameweek resolved');
 const commit=await resolveCommit(sourceAsOf);if(!commit.at)throw new Error('Source commit timestamp missing');
 const basePath=`data/${season}/By Tournament/Premier League/GW${gw}`;
 const rawBase=`https://raw.githubusercontent.com/${REPO}/${commit.sha}/${basePath.replaceAll(' ','%20')}`;
 const kinds=['matches','playermatchstats','shots'] as const;const files:any={};
 for(const kind of kinds){const path=`${basePath}/${kind}.csv`,url=`${rawBase}/${kind}.csv`;const x=await csv(url);files[kind]={...x,path,url,payload_sha256:await sha256(x.text)}}
 const [{data:teams,error:te},{data:players,error:pe},{data:fx,error:fe}]=await Promise.all([
   sb.from('teams').select('id,team_code'),
   sb.from('players').select('id,fpl_player_id'),
   sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id,finished').eq('source','fpl').eq('gameweek',gw)
 ]);if(te)throw te;if(pe)throw pe;if(fe)throw fe;
 const tm=new Map((teams||[]).map((x:any)=>[Number(x.team_code),Number(x.id)]));
 const pm=new Map((players||[]).map((x:any)=>[Number(x.fpl_player_id),Number(x.id)]));
 const fxMap=new Map((fx||[]).map((x:any)=>[`${x.home_team_id}|${x.away_team_id}`,x]));
 async function ensureCapture(kind:string){const f=files[kind];const oh=await sha256([SOURCE,season,gw,kind,commit.sha,f.payload_sha256].join('|'));const row={source_key:SOURCE,season,gameweek:gw,file_kind:kind,source_repo:REPO,source_path:f.path,source_url:f.url,source_commit_sha:commit.sha,source_commit_at:commit.at,source_as_of:sourceAsOf,payload_sha256:f.payload_sha256,row_count:f.rows.length,observation_hash:oh,notes:'C0197 free-source capture pinned to repository commit; no model effect.'};
   const {data,error}=await sb.from('research_c0197_source_file_captures').upsert(row,{onConflict:'observation_hash',ignoreDuplicates:true}).select('id').limit(1);if(error)throw new Error(`capture ${kind}: ${error.message}`);if(data?.[0]?.id)return Number(data[0].id);const {data:existing,error:ee}=await sb.from('research_c0197_source_file_captures').select('id').eq('observation_hash',oh).single();if(ee)throw ee;return Number(existing.id)}
 const capMatches=await ensureCapture('matches'),capPlayers=await ensureCapture('playermatchstats'),capShots=await ensureCapture('shots');
 const matchMap=new Map<string,any>();let unmappedMatches=0;const teamRows:any[]=[];
 for(const r of files.matches.rows){const ht=tm.get(Number(r.home_team)),at=tm.get(Number(r.away_team));const f=ht&&at?fxMap.get(`${ht}|${at}`):null;if(!f){unmappedMatches++;matchMap.set(String(r.match_id),null);continue}matchMap.set(String(r.match_id),f);if(!b(r.finished)&&!f.finished)continue;
  const side=(home:boolean)=>({source_key:SOURCE,source_file_capture_id:capMatches,source_commit_sha:commit.sha,season,gameweek:gw,source_match_id:String(r.match_id),match_id:f.id,team_id:home?ht:at,venue:home?'home':'away',fixture_kickoff:f.kickoff_time,goals_for:n(home?r.home_score:r.away_score),goals_against:n(home?r.away_score:r.home_score),xg_for:n(home?r.home_expected_goals_xg:r.away_expected_goals_xg),xg_against:n(home?r.away_expected_goals_xg:r.home_expected_goals_xg),shots_for:n(home?r.home_total_shots:r.away_total_shots),shots_against:n(home?r.away_total_shots:r.home_total_shots),shots_on_target_for:n(home?r.home_shots_on_target:r.away_shots_on_target),shots_on_target_against:n(home?r.away_shots_on_target:r.home_shots_on_target),xgot_for:n(home?r.home_xg_on_target_xgot:r.away_xg_on_target_xgot),xgot_against:n(home?r.away_xg_on_target_xgot:r.home_xg_on_target_xgot),big_chances_for:n(home?r.home_big_chances:r.away_big_chances),big_chances_against:n(home?r.away_big_chances:r.home_big_chances),big_chances_missed_for:n(home?r.home_big_chances_missed:r.away_big_chances_missed),big_chances_missed_against:n(home?r.away_big_chances_missed:r.home_big_chances_missed),keeper_saves_for:n(home?r.home_keeper_saves:r.away_keeper_saves),keeper_saves_against:n(home?r.away_keeper_saves:r.home_keeper_saves),source_row:r});teamRows.push(side(true),side(false));
 }
 let teamInserted=0;for(const c of chunks(teamRows)){const {data,error}=await sb.from('research_c0197_team_match_evidence').upsert(c,{onConflict:'source_file_capture_id,source_match_id,team_id',ignoreDuplicates:true}).select('id');if(error)throw new Error(`team evidence: ${error.message}`);teamInserted+=(data||[]).length}
 const playerRows:any[]=[];let mappedPlayers=0;
 for(const r of files.playermatchstats.rows){const f=matchMap.get(String(r.match_id));const sp=i(r.player_id),pid=sp===null?null:pm.get(sp)||null;const ms=!!f,ps=!!pid;const mapping=ms&&ps?'mapped':ms?'unmapped_player':ps?'unmapped_match':'unmapped_match_and_player';if(mapping==='mapped')mappedPlayers++;const mins=i(r.minutes_played);playerRows.push({source_key:SOURCE,source_file_capture_id:capPlayers,source_commit_sha:commit.sha,season,gameweek:gw,source_match_id:String(r.match_id),match_id:f?.id||null,source_player_id:sp,player_id:pid,minutes:mins,started:mins!==null&&mins>0&&i(r.start_min)===0,goals:i(r.goals),assists:i(r.assists),xg:n(r.xg),xa:n(r.xa),xgot:n(r.xgot),shots:i(r.total_shots),shots_on_target:i(r.shots_on_target),big_chances_missed:i(r.big_chances_missed),touches_opposition_box:i(r.touches_opposition_box),xgot_faced:n(r.xgot_faced),goals_prevented:n(r.goals_prevented),penalties_scored:i(r.penalties_scored),penalties_missed:i(r.penalties_missed),mapping_status:mapping,source_row:r})}
 let playerInserted=0;for(const c of chunks(playerRows)){const {data,error}=await sb.from('research_c0197_player_match_evidence').upsert(c,{onConflict:'source_file_capture_id,source_match_id,source_player_id',ignoreDuplicates:true}).select('id');if(error)throw new Error(`player evidence: ${error.message}`);playerInserted+=(data||[]).length}
 const shotRows:any[]=[];let mappedShots=0;
 for(const r of files.shots.rows){const f=matchMap.get(String(r.match_id));const sp=i(r.player_id),pid=sp===null?null:pm.get(sp)||null;let mapping='no_player';if(sp!==null){mapping=f&&pid?'mapped':f?'unmapped_player':pid?'unmapped_match':'unmapped_match_and_player'}else if(!f)mapping='unmapped_match';if(mapping==='mapped')mappedShots++;shotRows.push({source_key:SOURCE,source_file_capture_id:capShots,source_commit_sha:commit.sha,season,gameweek:gw,source_match_id:String(r.match_id),match_id:f?.id||null,shot_index:i(r.shot_index),minute:i(r.minute),added_time:i(r.added_time),is_home:r.is_home===undefined||r.is_home===null||String(r.is_home).trim()===''?null:b(r.is_home),source_player_id:sp,player_id:pid,outcome:String(r.outcome||'')||null,situation:String(r.situation||'')||null,body_part:String(r.body_part||'')||null,xg:n(r.xg),xgot:n(r.xgot),start_x:n(r.start_x),start_y:n(r.start_y),goal_mouth_y:n(r.goal_mouth_y),goal_mouth_z:n(r.goal_mouth_z),goal_mouth_location:String(r.goal_mouth_location||'')||null,mapping_status:mapping,source_row:r})}
 let shotInserted=0;for(const c of chunks(shotRows)){const {data,error}=await sb.from('research_c0197_shot_events').upsert(c,{onConflict:'source_file_capture_id,source_match_id,shot_index',ignoreDuplicates:true}).select('id');if(error)throw new Error(`shot evidence: ${error.message}`);shotInserted+=(data||[]).length}
 return new Response(JSON.stringify({ok:true,change_id:'C0197',season,gameweek:gw,source_as_of:sourceAsOf,source_commit_sha:commit.sha,source_commit_at:commit.at,source_rows:{matches:files.matches.rows.length,players:files.playermatchstats.rows.length,shots:files.shots.rows.length},inserted:{team:teamInserted,player:playerInserted,shots:shotInserted},mapping:{unmapped_matches:unmappedMatches,mapped_player_rows:mappedPlayers,mapped_shot_rows:mappedShots},model_effect_enabled:false,research_only:true}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}});
