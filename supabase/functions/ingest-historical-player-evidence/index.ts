import { createClient } from 'supabase';
import Papa from 'papaparse';

const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const n=(v:any)=>v===undefined||v===null||String(v).trim()===''?null:Number(v);
const i=(v:any)=>{const x=n(v);return x===null?null:Math.round(x)};
const chunks=<T>(a:T[],z=250)=>{const out:T[][]=[];for(let k=0;k<a.length;k+=z)out.push(a.slice(k,k+z));return out};

async function csv(url:string){
  const r=await fetch(url,{cache:'no-store',headers:{'user-agent':'FootballIntelligence/0.6'}});
  if(r.status===404)return null;
  if(!r.ok)throw new Error(`${url} ${r.status}`);
  return Papa.parse(await r.text(),{header:true,skipEmptyLines:true,transformHeader:(h:string)=>h.trim().replace(/^\uFEFF/,'')}).data as any[];
}

Deno.serve(async(req)=>{try{
  if(req.method!=='POST')return new Response(JSON.stringify({ok:false,error:'POST required'}),{status:405,headers:H});
  const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const key=ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)throw new Error('Missing service credential');
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const {data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
  if(ae||!tok||req.headers.get('x-engine-token')!==tok)return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:H});

  const body=await req.json().catch(()=>({}));
  const season=String(body.season||'2024-2025');
  if(season!=='2024-2025')throw new Error('v0.1 supports only 2024-2025');
  const base='https://raw.githubusercontent.com/olbauday/FPL-Core-Insights/main/data/2024-2025';
  const [oldPlayers,oldTeams]=await Promise.all([
    csv(`${base}/players/players.csv`),
    csv(`${base}/teams/teams.csv`)
  ]);
  if(!oldPlayers||!oldTeams)throw new Error('2024/25 player/team mapping files missing');

  const [{data:current,error:ce},{data:existing,error:ee}]=await Promise.all([
    sb.from('players').select('id,player_code').not('player_code','is',null),
    sb.from('historical_player_event_evidence').select('gameweek').eq('season',season).eq('source','fpl_core_insights_premier_league')
  ]);
  if(ce)throw ce;if(ee)throw ee;

  const currentByCode=new Map((current||[]).map((x:any)=>[Number(x.player_code),Number(x.id)]));
  const teamByCode=new Map<number,string>();
  for(const r of oldTeams){const code=i(r.code);if(code!==null)teamByCode.set(code,String(r.name||''));}
  const oldById=new Map<number,{code:number,teamCode:number|null,position:string|null}>();
  for(const r of oldPlayers){
    const pid=i(r.player_id),code=i(r.player_code),teamCode=i(r.team_code);
    if(pid!==null&&code!==null)oldById.set(pid,{code,teamCode,position:r.position?String(r.position):null});
  }

  const requested=Array.isArray(body.gameweeks)&&body.gameweeks.length?body.gameweeks.map(Number).filter((x:number)=>x>=1&&x<=38):Array.from({length:38},(_,k)=>k+1);
  const missing:number[]=[];let sourceRows=0,mappedRows=0,unmappedRows=0,inserted=0;const perGw:any[]=[];
  for(let off=0;off<requested.length;off+=6){
    const group=requested.slice(off,off+6);
    const fetched=await Promise.all(group.map(async(gw)=>({gw,rows:await csv(`${base}/playermatchstats/GW${gw}/playermatchstats.csv`)})));
    for(const f of fetched){
      if(!f.rows){missing.push(f.gw);perGw.push({gw:f.gw,status:'MISSING',source_rows:0,mapped:0,inserted:0});continue;}
      sourceRows+=f.rows.length;const out:any[]=[];let gm=0,gu=0;const capturedAt=new Date().toISOString();
      for(const r of f.rows){
        const spid=i(r.player_id);if(spid===null){gu++;continue;}
        const old=oldById.get(spid);const pid=old?currentByCode.get(old.code):undefined;
        if(!old||!pid){gu++;continue;}
        const mins=i(r.minutes_played);
        const raw={...r,_source_player_code:old.code,_source_team_code:old.teamCode,_source_team_name:old.teamCode===null?null:(teamByCode.get(old.teamCode)||null),_source_position:old.position,_ingest_change_id:'C0131'};
        out.push({player_id:pid,player_code:old.code,season,source:'fpl_core_insights_premier_league',source_player_id:spid,source_match_id:String(r.match_id),gameweek:f.gw,minutes:mins,started:mins!==null&&mins>0&&i(r.start_min)===0,raw,captured_at:capturedAt,model_effect_enabled:false});gm++;
      }
      mappedRows+=gm;unmappedRows+=gu;let gi=0;
      for(const c of chunks(out)){
        const {data,error}=await sb.from('historical_player_event_evidence').upsert(c,{onConflict:'source,season,source_match_id,player_id',ignoreDuplicates:true}).select('id');
        if(error)throw new Error(`GW${f.gw} insert: ${error.message}`);
        gi+=(data||[]).length;
      }
      inserted+=gi;perGw.push({gw:f.gw,status:'OK',source_rows:f.rows.length,mapped:gm,unmapped:gu,inserted:gi});
    }
  }
  return new Response(JSON.stringify({ok:true,change_id:'C0131',season,gameweeks_requested:requested.length,missing_gameweeks:missing,source_rows:sourceRows,mapped_rows:mappedRows,unmapped_rows:unmappedRows,inserted,existing_rows_before:(existing||[]).length,model_effect_enabled:false,note:'Historical player evidence only; current-player overlap via stable player_code; raw source preserved.'}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}});
