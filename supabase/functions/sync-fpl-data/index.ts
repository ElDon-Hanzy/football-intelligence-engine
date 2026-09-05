import { createClient } from 'supabase';

const SOURCE='official_fpl_current_price_history';
const numOrNull=(v:any)=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const chunks=<T,>(a:T[],n=200)=>{const out:T[][]=[];for(let i=0;i<a.length;i+=n)out.push(a.slice(i,i+n));return out};

Deno.serve(async()=>{
 const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
 const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)return Response.json({ok:false,error:'Missing service credential'},{status:500});
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
 let runId:number|null=null;
 try{
  const run=await sb.from('source_sync_runs').insert({source:SOURCE,status:'running',metadata:{change_id:'C0152',trigger:'sync-fpl-data-v3'}}).select('id').single();
  if(!run.error)runId=run.data?.id??null;

  const r=await fetch('https://fantasy.premierleague.com/api/bootstrap-static/',{headers:{'user-agent':'Football-Intelligence-v0.1'}});
  if(!r.ok)throw new Error(`bootstrap ${r.status}`);
  const b=await r.json();
  const elements=b.elements||[],teams=b.teams||[],types=b.element_types||[];
  const currentEvent=b.events?.find((e:any)=>e.is_current)?.id??b.events?.find((e:any)=>e.is_next)?.id??null;
  const now=new Date().toISOString();

  const teamRows=teams.map((t:any)=>({fpl_team_id:t.id,team_code:t.code,name:t.name,short_name:t.short_name,strength:t.strength,updated_at:now}));
  for(const c of chunks(teamRows,100)){
   const q=await sb.from('teams').upsert(c,{onConflict:'fpl_team_id'});
   if(q.error)throw q.error;
  }
  const tm=await sb.from('teams').select('id,fpl_team_id');
  if(tm.error)throw tm.error;
  const teamMap=new Map((tm.data||[]).map((t:any)=>[t.fpl_team_id,t.id]));
  const posMap=new Map(types.map((p:any)=>[p.id,p.singular_name_short]));

  const playerRows=elements.map((p:any)=>({
    fpl_player_id:p.id,
    player_code:p.code,
    team_id:teamMap.get(p.team)??null,
    first_name:p.first_name,
    second_name:p.second_name,
    web_name:p.web_name,
    position:posMap.get(p.element_type)??null,
    status:p.status,
    now_cost:p.now_cost,
    selected_by_percent:numOrNull(p.selected_by_percent),
    chance_of_playing_next_round:p.chance_of_playing_next_round==null?null:Number(p.chance_of_playing_next_round)/100,
    news:p.news||null,
    penalties_order:numOrNull(p.penalties_order),
    direct_freekicks_order:numOrNull(p.direct_freekicks_order),
    corners_and_indirect_freekicks_order:numOrNull(p.corners_and_indirect_freekicks_order),
    updated_at:now
  })).filter((p:any)=>p.team_id&&p.position);
  for(const c of chunks(playerRows,200)){
    const q=await sb.from('players').upsert(c,{onConflict:'fpl_player_id'});
    if(q.error)throw q.error;
  }

  const pm=await sb.from('players').select('id,fpl_player_id');
  if(pm.error)throw pm.error;
  const playerMap=new Map((pm.data||[]).map((p:any)=>[p.fpl_player_id,p.id]));
  const priceRows=elements.map((p:any)=>({
    player_id:playerMap.get(p.id),
    captured_at:now,
    gameweek:currentEvent,
    price:p.now_cost,
    ownership:numOrNull(p.selected_by_percent),
    transfers_in:numOrNull(p.transfers_in_event),
    transfers_out:numOrNull(p.transfers_out_event)
  })).filter((x:any)=>x.player_id&&x.price!==null&&x.price!==undefined);
  for(const c of chunks(priceRows,500)){
    const q=await sb.from('fpl_prices').insert(c);
    if(q.error)throw q.error;
  }

  const metadata={change_id:'C0152',gameweek:currentEvent,bootstrap_players:elements.length,players_upserted:playerRows.length,prices_inserted:priceRows.length,unmapped_players:elements.length-priceRows.length,missing_data_is_not_zero:true};
  if(runId!==null)await sb.from('source_sync_runs').update({finished_at:new Date().toISOString(),status:'success',rows_inserted:priceRows.length,rows_updated:playerRows.length,metadata}).eq('id',runId);
  return Response.json({ok:true,...metadata});
 }catch(e){
  const message=e instanceof Error?e.message:String(e);
  if(runId!==null)await sb.from('source_sync_runs').update({finished_at:new Date().toISOString(),status:'failed',error:message,metadata:{change_id:'C0152'}}).eq('id',runId);
  return Response.json({ok:false,error:message},{status:500});
 }
});