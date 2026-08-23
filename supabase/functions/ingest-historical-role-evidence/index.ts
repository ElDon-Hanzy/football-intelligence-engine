import { createClient } from 'supabase';
import Papa from 'papaparse';
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const n=(v:any)=>v===undefined||v===null||String(v).trim()===''?null:Number(v);
const i=(v:any)=>{const x=n(v);return x===null?null:Math.round(x)};
const chunks=<T>(a:T[],z=250)=>{const out:T[][]=[];for(let k=0;k<a.length;k+=z)out.push(a.slice(k,k+z));return out};
async function csv(url:string){const r=await fetch(url,{cache:'no-store',headers:{'user-agent':'FootballIntelligence/0.5'}});if(r.status===404)return null;if(!r.ok)throw new Error(`${url} ${r.status}`);return Papa.parse(await r.text(),{header:true,skipEmptyLines:true,transformHeader:(h:string)=>h.trim().replace(/^\uFEFF/,'')}).data as any[]}
Deno.serve(async(req)=>{try{
 if(req.method!=='POST')return new Response(JSON.stringify({ok:false,error:'POST required'}),{status:405,headers:H});
 const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');const key=ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Missing service credential');
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
 const {data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});if(ae||!tok||req.headers.get('x-engine-token')!==tok)return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:H});
 const body=await req.json().catch(()=>({}));const season=String(body.season||'2025-2026');if(season!=='2025-2026')throw new Error('Only 2025-2026 is supported by v0.1 historical role adapter');
 const base='https://raw.githubusercontent.com/olbauday/FPL-Core-Insights/main/data/2025-2026';
 const oldPlayers=await csv(`${base}/players.csv`);if(!oldPlayers)throw new Error('historical players.csv missing');
 const [{data:current,error:ce},{data:existing,error:ee}]=await Promise.all([
   sb.from('players').select('id,player_code').not('player_code','is',null),
   sb.from('historical_player_event_evidence').select('gameweek').eq('season',season).eq('source','fpl_core_insights_premier_league')
 ]);if(ce)throw ce;if(ee)throw ee;
 const currentByCode=new Map((current||[]).map((x:any)=>[Number(x.player_code),Number(x.id)]));
 const oldIdToCode=new Map<number,number>();for(const r of oldPlayers){const pid=i(r.player_id),code=i(r.player_code);if(pid!==null&&code!==null)oldIdToCode.set(pid,code)}
 const requested=Array.isArray(body.gameweeks)&&body.gameweeks.length?body.gameweeks.map(Number).filter((x:number)=>x>=1&&x<=38):Array.from({length:38},(_,k)=>k+1);
 const missing:number[]=[];let sourceRows=0,mappedRows=0,unmappedRows=0,inserted=0;
 for(let off=0;off<requested.length;off+=6){const group=requested.slice(off,off+6);const fetched=await Promise.all(group.map(async(gw)=>({gw,rows:await csv(`${base}/By%20Tournament/Premier%20League/GW${gw}/playermatchstats.csv`)})));
   for(const f of fetched){if(!f.rows){missing.push(f.gw);continue}sourceRows+=f.rows.length;const out:any[]=[];let gm=0,gu=0;const capturedAt=new Date().toISOString();
     for(const r of f.rows){const spid=i(r.player_id);if(spid===null){gu++;continue}const code=oldIdToCode.get(spid);const pid=code===undefined?undefined:currentByCode.get(code);if(!pid||code===undefined){gu++;continue}const mins=i(r.minutes_played);out.push({player_id:pid,player_code:code,season,source:'fpl_core_insights_premier_league',source_player_id:spid,source_match_id:String(r.match_id),gameweek:f.gw,minutes:mins,started:mins!==null&&mins>0&&i(r.start_min)===0,raw:r,captured_at:capturedAt,model_effect_enabled:false});gm++}
     mappedRows+=gm;unmappedRows+=gu;for(const c of chunks(out)){const {data,error}=await sb.from('historical_player_event_evidence').upsert(c,{onConflict:'source,season,source_match_id,player_id',ignoreDuplicates:true}).select('id');if(error)throw new Error(`GW${f.gw} insert: ${error.message}`);inserted+=(data||[]).length}
   }
 }
 return new Response(JSON.stringify({ok:true,season,gameweeks_requested:requested.length,missing_gameweeks:missing,source_rows:sourceRows,mapped_rows:mappedRows,unmapped_rows:unmappedRows,inserted,model_effect_enabled:false,note:'Historical EPL match events are role-learning priors only. They never rewrite historical forecasts.'}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}});
