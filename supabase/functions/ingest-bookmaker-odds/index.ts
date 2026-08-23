import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const H={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, content-type, x-engine-token',
  'Content-Type':'application/json',
  'Cache-Control':'no-store'
};
const clean=(s:string)=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').replace(/\b(fc|afc)\b/g,'').replace(/\s+/g,' ').trim();
const aliases:Record<string,string>={
  'man utd':'manchester united','man united':'manchester united','man city':'manchester city',
  'nott m forest':'nottingham forest','nottingham':'nottingham forest','spurs':'tottenham hotspur',
  'tottenham':'tottenham hotspur','wolves':'wolverhampton wanderers','wolverhampton':'wolverhampton wanderers',
  'brighton':'brighton hove albion','brighton and hove albion':'brighton hove albion',
  'newcastle':'newcastle united','west ham':'west ham united','bournemouth':'bournemouth'
};
const canon=(s:string)=>aliases[clean(s)]||clean(s);
const slug=(s:string)=>clean(s).replace(/ /g,'_')||'unknown';
const marketKey=(name:string)=>{
  const x=clean(name);
  if(x==='ml')return 'h2h';
  if(x==='correct score')return 'correct_score';
  if(x==='both teams to score')return 'btts';
  if(x==='totals'||x==='goals over under')return 'totals';
  if(x==='spread')return 'spread';
  return slug(name);
};
const getSelections=(market:any)=>{
  const out:any[]=[];
  for(const o of Array.isArray(market?.odds)?market.odds:[]){
    const line=o?.hdp==null?null:Number(o.hdp);
    if(o?.label && Number(o?.odds)>1){
      out.push({key:slug(String(o.label)),name:String(o.label),line:Number.isFinite(line)?line:null,odds:Number(o.odds),kind:'label'});
    }
    for(const [k,v] of Object.entries(o||{})){
      if(['hdp','label','odds','name'].includes(k))continue;
      const price=Number(v);
      if(Number.isFinite(price)&&price>1){
        out.push({key:slug(k),name:k,line:Number.isFinite(line)?line:null,odds:price,kind:'field'});
      }
    }
  }
  return out;
};
const normalizeSnapshot=async(sb:any,r:any)=>{
  if(!r.pre_kickoff || +new Date(r.captured_at)>=+new Date(r.event_kickoff)) throw Error(`Refusing post-kickoff raw snapshot ${r.id}`);
  const rows:any[]=[];
  const markets=Array.isArray(r.payload?.markets)?r.payload.markets:[];
  for(const m of markets){
    const mk=marketKey(String(m?.name||'Unknown'));
    const sourceTs=m?.updatedAt||r.captured_at;
    if(+new Date(sourceTs)>=+new Date(r.event_kickoff)) continue;
    for(const s of getSelections(m)) rows.push({
      raw_snapshot_id:r.id,provider:r.provider,match_id:r.match_id,gameweek:r.gameweek,
      bookmaker:r.bookmaker,market_key:mk,market_name:String(m?.name||'Unknown'),
      selection_key:s.key,selection_name:s.name,line:s.line,decimal_odds:s.odds,
      implied_probability:1/s.odds,source_timestamp:sourceTs,captured_at:r.captured_at,
      metadata:{selection_kind:s.kind,event_kickoff:r.event_kickoff,pre_kickoff:true}
    });
  }
  let inserted=0;
  for(let i=0;i<rows.length;i+=500){
    const {data,error}=await sb.from('odds_market_selections').upsert(rows.slice(i,i+500),{
      onConflict:'raw_snapshot_id,market_key,selection_key,line',ignoreDuplicates:true
    }).select('id');
    if(error) throw Error(`normalize snapshot ${r.id}: ${error.message}`);
    inserted+=(data||[]).length;
  }
  return {snapshot_id:r.id,bookmaker:r.bookmaker,markets:markets.length,selection_rows:rows.length,new_rows:inserted,correct_score_rows:rows.filter(x=>x.market_key==='correct_score').length};
};
function extractBookmakerPayloads(od:any,requested:string){
  const out:any[]=[];
  if(od?.bookmakers && typeof od.bookmakers==='object'){
    for(const [name,markets] of Object.entries(od.bookmakers)) if(Array.isArray(markets)) out.push({bookmaker:name,markets});
  } else if(Array.isArray(od?.markets)) out.push({bookmaker:od.bookmaker||requested,markets:od.markets});
  else if(Array.isArray(od?.data)) out.push({bookmaker:od.bookmaker||requested,markets:od.data});
  return out;
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  try{
    const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data:adminToken,error:authError}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
    if(authError||!adminToken||req.headers.get('x-engine-token')!==adminToken) return new Response(JSON.stringify({ok:false,error:'Unauthorized'}),{status:401,headers:H});
    const b=await req.json().catch(()=>({}));
    const gw=Number(b.gameweek||1);

    if(b.normalize_existing===true){
      const {data:raw,error}=await sb.from('odds_raw_snapshots').select('*').eq('gameweek',gw).eq('pre_kickoff',true).order('captured_at');
      if(error)throw error;
      const details=[];
      for(const r of raw||[]) details.push(await normalizeSnapshot(sb,r));
      return new Response(JSON.stringify({ok:true,mode:'normalize_existing',gameweek:gw,raw_snapshots:(raw||[]).length,new_rows:details.reduce((a,x)=>a+x.new_rows,0),details}),{headers:H});
    }

    const books=String(b.bookmakers||'Bet365,Unibet').split(',').map((x:string)=>x.trim()).filter(Boolean).slice(0,3);
    const {data:key,error:keyError}=await sb.rpc('get_backend_secret',{secret_name:'ODDS_API_IO_KEY'});
    if(keyError||!key)throw Error('Missing Odds API key');
    const {data:fx,error:fe}=await sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id').eq('source','fpl').eq('gameweek',gw).order('kickoff_time');
    if(fe)throw fe;if(!fx?.length)throw Error(`No FPL fixtures for GW${gw}`);
    const ids=[...new Set(fx.flatMap((x:any)=>[x.home_team_id,x.away_team_id]))];
    const {data:teams,error:te}=await sb.from('teams').select('id,name,short_name').in('id',ids);if(te)throw te;
    const tm=new Map((teams||[]).map((x:any)=>[x.id,x]));
    const first=new Date(fx[0].kickoff_time),last=new Date(fx[fx.length-1].kickoff_time);
    const from=new Date(first.getTime()-12*3600e3).toISOString(),to=new Date(last.getTime()+12*3600e3).toISOString();
    const {data:run,error:re}=await sb.from('odds_ingestion_runs').insert({provider:'odds-api.io',gameweek:gw,bookmaker_names:books,metadata:{phase:'normalized_layer1_v3',from,to}}).select('id').single();
    if(re)throw re;
    const er=await fetch(`https://api.odds-api.io/v3/events?apiKey=${key}&sport=football&league=england-premier-league&status=pending&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const events=await er.json();if(!er.ok||!Array.isArray(events))throw Error(`events fetch failed: ${JSON.stringify(events)}`);
    let matched=0,rawCount=0,normalized=0;const details:any[]=[];
    for(const ev of events){
      const eh=canon(ev.home),ea=canon(ev.away),ek=+new Date(ev.date);let best:any=null;
      for(const f of fx){
        const h=canon(tm.get(f.home_team_id)?.name||''),a=canon(tm.get(f.away_team_id)?.name||''),dt=Math.abs(+new Date(f.kickoff_time)-ek);
        if(dt<=6*3600e3&&h===eh&&a===ea){best=f;break}
      }
      if(!best){details.push({event:`${ev.home} vs ${ev.away}`,status:'UNMATCHED',home:eh,away:ea});continue}
      matched++;
      const frozen=+new Date(best.kickoff_time)<=Date.now();
      const {error:ee}=await sb.from('odds_provider_events').upsert({provider:'odds-api.io',provider_event_id:String(ev.id),match_id:best.id,gameweek:gw,home_name:ev.home,away_name:ev.away,kickoff_time:ev.date,league_slug:ev.league?.slug,status:frozen?'FROZEN':ev.status,matched_at:new Date().toISOString(),match_confidence:1,raw:ev,updated_at:new Date().toISOString()},{onConflict:'provider,provider_event_id'});
      if(ee)throw Error(`provider event upsert: ${ee.message}`);
      if(frozen){details.push({event:`${ev.home} vs ${ev.away}`,match_id:best.id,status:'FROZEN'});continue}
      const ed:any={event:`${ev.home} vs ${ev.away}`,match_id:best.id,status:'OK',bookmakers:[]};
      for(const requested of books){
        const or=await fetch(`https://api.odds-api.io/v3/odds?apiKey=${key}&eventId=${ev.id}&bookmakers=${encodeURIComponent(requested)}`);
        const od=await or.json();
        if(!or.ok){ed.bookmakers.push({requested,status:'ODDS_ERROR',http:or.status});continue}
        const payloads=extractBookmakerPayloads(od,requested);
        if(!payloads.length){ed.bookmakers.push({requested,status:'NO_DATA'});continue}
        for(const p of payloads){
          const captured=new Date().toISOString();
          if(+new Date(captured)>=+new Date(best.kickoff_time)){ed.bookmakers.push({bookmaker:p.bookmaker,status:'FROZEN_BEFORE_WRITE'});continue}
          const {data:rs,error:rse}=await sb.from('odds_raw_snapshots').insert({ingestion_run_id:run.id,provider:'odds-api.io',provider_event_id:String(ev.id),match_id:best.id,gameweek:gw,bookmaker:p.bookmaker,captured_at:captured,event_kickoff:best.kickoff_time,pre_kickoff:true,payload:{event:{id:ev.id,home:ev.home,away:ev.away,date:ev.date},bookmaker:p.bookmaker,markets:p.markets}}).select('*').single();
          if(rse)throw Error(`raw snapshot insert: ${rse.message}`);
          rawCount++;
          const nd=await normalizeSnapshot(sb,rs);normalized+=nd.new_rows;
          ed.bookmakers.push({bookmaker:p.bookmaker,status:'OK',markets:nd.markets,selections:nd.selection_rows,correct_score:nd.correct_score_rows});
        }
      }
      details.push(ed);
    }
    const metadata={phase:'normalized_layer1_v3',from,to,normalized_selections:normalized,details};
    const {error:ue}=await sb.from('odds_ingestion_runs').update({finished_at:new Date().toISOString(),status:'success',events_found:events.length,events_matched:matched,odds_payloads:rawCount,metadata}).eq('id',run.id);if(ue)throw ue;
    return new Response(JSON.stringify({ok:true,mode:'live',gameweek:gw,events_found:events.length,events_matched:matched,raw_payloads:rawCount,normalized_selections:normalized,details}),{headers:H});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}
});