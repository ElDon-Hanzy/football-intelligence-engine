import { createClient } from 'jsr:@supabase/supabase-js@2';
const BASE='https://fantasy.premierleague.com/api';
const ua={'User-Agent':'FootballIntelligence/0.4'};
async function getJson(url:string){const r=await fetch(url,{headers:ua});let data:any=null;try{data=await r.json()}catch{}return{status:r.status,ok:r.ok,data}}
Deno.serve(async(req:Request)=>{try{
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'),key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)return Response.json({ok:false,error:'service credential missing'},{status:500});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const {data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
  if(ae||!tok||req.headers.get('x-engine-token')!==tok)return Response.json({ok:false,error:'unauthorized'},{status:401});
  const body=await req.json().catch(()=>({}));
  const entryId=Number(body.entry_id||3559923),requestedGw=Number(body.gameweek||0),persist=body.persist===true,syncSquad=body.sync_squad===true;
  const [bootR,entryR,histR,transR,latestR,myTeamR]=await Promise.all([
    getJson(`${BASE}/bootstrap-static/`),getJson(`${BASE}/entry/${entryId}/`),getJson(`${BASE}/entry/${entryId}/history/`),getJson(`${BASE}/entry/${entryId}/transfers/`),getJson(`${BASE}/entry/${entryId}/transfers-latest/`),getJson(`${BASE}/my-team/${entryId}/`)
  ]);
  if(!bootR.ok||!entryR.ok||!histR.ok||!transR.ok)throw new Error(`public FPL fetch failed bootstrap=${bootR.status} entry=${entryR.status} history=${histR.status} transfers=${transR.status}`);
  const now=Date.now(),events=bootR.data?.events||[];
  const targetGw=requestedGw||Number(events.find((e:any)=>new Date(e.deadline_time).getTime()>now)?.id||0);
  if(!targetGw)throw new Error('no future target gameweek');
  const currentHist=[...(histR.data?.current||[])].sort((a:any,b:any)=>Number(a.event)-Number(b.event));
  const latestLocked=[...currentHist].filter((x:any)=>Number(x.event)<targetGw).sort((a:any,b:any)=>Number(b.event)-Number(a.event))[0]||null;
  const lockedGw=Number(latestLocked?.event||targetGw-1);
  const picksR=await getJson(`${BASE}/entry/${entryId}/event/${lockedGw}/picks/`);
  if(!picksR.ok)throw new Error(`locked picks GW${lockedGw} ${picksR.status}`);
  const allTransfers=[...(transR.data||[])].sort((a:any,b:any)=>new Date(a.time).getTime()-new Date(b.time).getTime());
  const targetTransfers=allTransfers.filter((t:any)=>Number(t.event)===targetGw);
  const latestTransfers=latestR.ok&&Array.isArray(latestR.data)?latestR.data:[];
  const currentVisibilityProven=latestR.ok || targetTransfers.length>0;
  const currentTransfers=(latestR.ok?latestTransfers:targetTransfers).filter((t:any)=>Number(t.event||targetGw)===targetGw);
  const chips=new Map<number,string>();for(const c of histR.data?.chips||[])chips.set(Number(c.event),String(c.name||'').toLowerCase());
  const started=Number(entryR.data?.started_event||1);
  let ftEnd=0,ftStartTarget: number|null=null;
  for(let e=Math.max(2,started+1);e<=targetGw;e++){
    const start=Math.min(5,ftEnd+1);
    if(e===targetGw){ftStartTarget=start;break}
    const h=currentHist.find((x:any)=>Number(x.event)===e);const n=Number(h?.event_transfers||0);const chip=chips.get(e)||'';
    ftEnd=(chip.includes('wildcard')||chip.includes('freehit')||chip.includes('free_hit'))?Math.max(0,start-1):Math.max(0,start-n);
  }
  if(targetGw===1)ftStartTarget=0;
  const targetChip=chips.get(targetGw)||'';
  const remainingFt=currentVisibilityProven&&ftStartTarget!=null?((targetChip.includes('wildcard')||targetChip.includes('freehit')||targetChip.includes('free_hit'))?Math.max(0,ftStartTarget-1):Math.max(0,ftStartTarget-currentTransfers.length)):null;
  const lockedBank=latestLocked?.bank==null?null:Number(latestLocked.bank);
  const currentBank=currentVisibilityProven&&lockedBank!=null?currentTransfers.reduce((b:number,t:any)=>b+Number(t.element_out_cost||0)-Number(t.element_in_cost||0),lockedBank):null;
  const lockedIds=(picksR.data?.picks||[]).map((p:any)=>Number(p.element));
  const currentIds=[...lockedIds];
  if(currentVisibilityProven){for(const t of currentTransfers){const oi=currentIds.indexOf(Number(t.element_out));if(oi>=0)currentIds[oi]=Number(t.element_in)}}
  const elems=new Map((bootR.data?.elements||[]).map((p:any)=>[Number(p.id),p]));
  const {data:internal,error:ie}=await sb.from('players').select('id,fpl_player_id,web_name,position,team_id').in('fpl_player_id',currentIds);if(ie)throw ie;
  const im=new Map((internal||[]).map((p:any)=>[Number(p.fpl_player_id),p]));
  const internalIds=(internal||[]).map((p:any)=>Number(p.id));
  const {data:priceRows,error:pre}=internalIds.length?await sb.from('fpl_prices').select('player_id,captured_at,price').in('player_id',internalIds).order('captured_at',{ascending:true}):{data:[],error:null};if(pre)throw pre;
  const firstPrice=new Map<number,any>();for(const p of priceRows||[])if(!firstPrice.has(Number(p.player_id)))firstPrice.set(Number(p.player_id),p);
  const latestIn=new Map<number,any>();for(const t of allTransfers.filter((t:any)=>Number(t.event)<=targetGw))latestIn.set(Number(t.element_in),t);
  const gw1Deadline=new Date(events.find((e:any)=>Number(e.id)===1)?.deadline_time||0).getTime();
  let acq=0,acqExact=true;const squad:any[]=[];
  for(const fid of currentIds){const ip=im.get(fid),el=elems.get(fid),tin=latestIn.get(fid);let purchase:number|null=null,source:string|null=null,evidenceTime:string|null=null;
    if(tin){purchase=Number(tin.element_in_cost);source='PUBLIC_TRANSFER_IN_COST';evidenceTime=tin.time||null}
    else if(ip){const fp=firstPrice.get(Number(ip.id));if(fp&&new Date(fp.captured_at).getTime()<=gw1Deadline+4*3600e3){purchase=Number(fp.price);source='PRE_FIRST_PRICE_CHANGE_INTERNAL_CAPTURE';evidenceTime=fp.captured_at}else acqExact=false}
    else acqExact=false;
    if(purchase==null||!Number.isFinite(purchase))acqExact=false;else acq+=purchase;
    squad.push({fpl_player_id:fid,player_id:ip?.id??null,name:ip?.web_name||el?.web_name||null,position:ip?.position||null,current_price_tenths:el?.now_cost??null,purchase_price_tenths:purchase,purchase_price_source:source,purchase_evidence_at:evidenceTime});
  }
  const mapped=squad.filter(x=>x.player_id!=null).length;
  const stateProven=currentVisibilityProven&&currentIds.length===15&&mapped===15&&currentBank!=null&&remainingFt!=null&&acqExact;
  const signature=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({entryId,targetGw,currentIds:[...currentIds].sort((a,b)=>a-b),currentBank,remainingFt,acq:acqExact?acq:null,currentTransfers})));
  const sig=[...new Uint8Array(signature)].map(b=>b.toString(16).padStart(2,'0')).join('');
  let stateId:number|null=null,stateInserted=false,squadSynced=false;
  if(persist&&stateProven){
    const {data:last}=await sb.from('fpl_manager_state_snapshots').select('id,evidence').eq('gameweek',targetGw).order('captured_at',{ascending:false}).limit(1).maybeSingle();
    if(last?.evidence?.signature===sig)stateId=Number(last.id);else{const {data:ins,error:se}=await sb.from('fpl_manager_state_snapshots').insert({gameweek:targetGw,captured_at:new Date().toISOString(),free_transfers:remainingFt,bank_tenths:currentBank,acquisition_squad_cost_tenths:acq,source:`public_fpl_api_entry_${entryId}_c0217`,evidence:{change_id:'C0217',entry_id:entryId,locked_gameweek:lockedGw,current_state_visibility:'PROVEN',current_transfer_source:latestR.ok?'transfers-latest':'public-transfers-current-event',current_transfers:currentTransfers,signature:sig,acquisition_cost_exact:true,squad:squad.map(x=>({fpl_player_id:x.fpl_player_id,player_id:x.player_id,purchase_price_tenths:x.purchase_price_tenths,purchase_price_source:x.purchase_price_source}))}}).select('id').single();if(se)throw se;stateId=Number(ins.id);stateInserted=true}
    if(syncSquad&&!targetChip.includes('freehit')&&!targetChip.includes('free_hit')){const curSet=new Set(squad.map(x=>Number(x.player_id)));const {data:active,error:aae}=await sb.from('squad_members').select('id,player_id').eq('active',true);if(aae)throw aae;for(const a of active||[]){if(!curSet.has(Number(a.player_id))){const {error}=await sb.from('squad_members').update({active:false,sold_at:new Date().toISOString(),notes:`C0217 synced from FPL entry ${entryId}`}).eq('id',a.id);if(error)throw error}}const activeSet=new Set((active||[]).filter((a:any)=>curSet.has(Number(a.player_id))).map((a:any)=>Number(a.player_id)));for(const x of squad){if(!activeSet.has(Number(x.player_id))){const {error}=await sb.from('squad_members').insert({player_id:x.player_id,active:true,acquired_at:new Date().toISOString(),notes:`C0217 synced from FPL entry ${entryId}; purchase ${x.purchase_price_tenths}`});if(error)throw error}}squadSynced=true}
  }
  return Response.json({ok:true,change_id:'C0217',entry_id:entryId,target_gameweek:targetGw,locked_gameweek:lockedGw,entry:{name:entryR.data?.name,player_first_name:entryR.data?.player_first_name,player_last_name:entryR.data?.player_last_name,started_event:entryR.data?.started_event,last_deadline_bank:entryR.data?.last_deadline_bank,last_deadline_value:entryR.data?.last_deadline_value,summary_overall_points:entryR.data?.summary_overall_points,summary_overall_rank:entryR.data?.summary_overall_rank},endpoint_status:{public_entry:entryR.status,history:histR.status,transfers:transR.status,transfers_latest:latestR.status,my_team:myTeamR.status},current_state_visibility:currentVisibilityProven?'PROVEN':'HIDDEN_PRE_DEADLINE',target_transfers_visible:targetTransfers.length,current_transfers_used:currentTransfers,free_transfers_at_gw_opening:ftStartTarget,free_transfers_current:remainingFt,bank_at_last_locked_deadline:lockedBank,bank_current:currentBank,acquisition_squad_cost_tenths:acqExact?acq:null,acquisition_cost_exact:acqExact,current_squad_proven:stateProven,squad,mapped_players:mapped,state_persist_requested:persist,state_inserted:stateInserted,state_id:stateId,squad_sync_requested:syncSquad,squad_synced:squadSynced,signature:sig,semantics:{missing_current_private_state_is_not_zero:true,public_locked_picks_are_not_assumed_current_when_current_transfer_visibility_is_hidden:true}})
}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500})}});