import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION='C0240_TRANSFER_PATH_EVALUATOR_V01';
const N=(x:any,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const POS=['GKP','DEF','MID','FWD'];
const NEED:any={GKP:2,DEF:5,MID:5,FWD:3};
const CAPS:any={GKP:18,DEF:50,MID:60,FWD:35};
const FORM=[[3,4,3],[3,5,2],[4,3,3],[4,4,2],[4,5,1],[5,2,3],[5,3,2],[5,4,1]];
const ATTACK=new Set(['CREATOR_10','WIDE_ATTACKER','WIDE_FORWARD','LINK_FORWARD','TARGET_FORWARD','CENTRAL_STRIKER','WING_BACK']);
const CONTROL=new Set(['HOLDING_MIDFIELDER','CENTRE_BACK','HYBRID_DEFENDER','WIDE_BACK','GOALKEEPER']);

function sellPrice(now:number,buy:number){return now<=buy?now:buy+Math.floor((now-buy)/2)}
function roleFamily(r:any){const x=String(r||'');return ATTACK.has(x)?'ATTACKING':CONTROL.has(x)?'CONTROL_DEFENSIVE':x==='BOX_TO_BOX'?'BALANCED':'UNKNOWN'}
function roleRisk(p:any,gws:number[]){
  if(!['MID','FWD'].includes(p.position))return 0;
  let seen=0,risky=0;
  for(const g of gws){const r=p.roles?.get(g);if(!r)continue;seen++;if(roleFamily(r.primary_role)==='CONTROL_DEFENSIVE'&&N(r.confidence)>=.70)risky++;}
  return seen&&risky/seen>=.5?1:0;
}
function roleUnknown(p:any,gws:number[]){let seen=0;for(const g of gws)if(p.roles?.get(g)?.primary_role)seen++;return seen===0?1:0}
function bestXI(sq:any[],gw:number){
  let best:any=null;
  for(const[d,m,f]of FORM){
    const pick=(pos:string,n:number)=>sq.filter(x=>x.position===pos).sort((a,b)=>N(b.preds.get(gw)?.expected_points)-N(a.preds.get(gw)?.expected_points)).slice(0,n);
    const xi=[...pick('GKP',1),...pick('DEF',d),...pick('MID',m),...pick('FWD',f)];
    if(xi.length!==11)continue;
    const xp=xi.reduce((s,p)=>s+N(p.preds.get(gw)?.expected_points),0),tot=sq.reduce((s,p)=>s+N(p.preds.get(gw)?.expected_points),0);
    const cs=(p:any)=>{const x=p.preds.get(gw);return N(x.expected_points)+N(x.p_5_plus)+2.5*N(x.p_10_plus)+4*N(x.p_15_plus)+6*N(x.p_20_plus)-.5*N(x.p_blank)};
    const cp=[...xi].sort((a,b)=>cs(b)-cs(a)||N(b.preds.get(gw)?.expected_points)-N(a.preds.get(gw)?.expected_points));
    const z={formation:`${d}-${m}-${f}`,xi,xiPts:xp,benchPts:tot-xp,captain:cp[0],vice:cp[1],captainScore:cs(cp[0])};
    if(!best||xp>best.xiPts)best=z;
  }
  return best;
}

Deno.serve(async(req:Request)=>{try{
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}'),key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)return Response.json({ok:false,error:'service credential missing'},{status:500});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const{data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
  if(ae||!tok||req.headers.get('x-engine-token')!==tok)return Response.json({ok:false,error:'unauthorized'},{status:401});
  const body=await req.json().catch(()=>({}));
  const gw=N(body.gameweek),h=Math.max(1,Math.min(5,N(body.horizon,5))),actualFT=Math.max(0,Math.min(5,N(body.free_transfers,1))),maxTransfers=Math.max(0,Math.min(7,N(body.max_transfers,actualFT))),benchW=Math.max(0,Math.min(.5,N(body.bench_weight,.12))),tc=Math.max(0,Math.min(8,N(body.transfer_cost_points,4))),err=Math.max(.25,Math.min(5,N(body.model_error_margin_points,1))),weights=(Array.isArray(body.weights)?body.weights:[1,.82,.68,.56,.46]).slice(0,h).map((x:any)=>Math.max(0,N(x)));
  if(!gw||weights.length!==h||weights.every((x:number)=>x===0)||maxTransfers<actualFT)return Response.json({ok:false,status:'INVALID_PATH_REQUEST'},{status:400});
  const gws=Array.from({length:h},(_,i)=>gw+i);

  const{data:mv,error:mve}=await sb.from('model_versions').select('id,version').eq('is_active',true).order('created_at',{ascending:false}).limit(1).single();if(mve||!mv)throw mve||new Error('active model missing');
  const{data:runs,error:re}=await sb.from('gameweek_prediction_runs').select('id,gameweek,generated_at').eq('model_version_id',mv.id).in('gameweek',gws).order('generated_at',{ascending:false});if(re)throw re;
  const latest=new Map<number,any>();for(const r of runs||[])if(!latest.has(Number(r.gameweek)))latest.set(Number(r.gameweek),r);const miss=gws.filter(g=>!latest.has(g));if(miss.length)return Response.json({ok:false,status:'HORIZON_PROJECTION_MISSING',missing_gameweeks:miss},{status:409});
  const runIds=gws.map(g=>N(latest.get(g).id));
  const preds:any[]=[];for(const rid of runIds){const{data,error}=await sb.from('model_predictions').select('player_id,gameweek,expected_points,expected_minutes,p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_start').eq('prediction_run_id',rid).range(0,999);if(error)throw error;if((data||[]).length<500)return Response.json({ok:false,status:'PROJECTION_PAGE_INCOMPLETE',run_id:rid,rows:(data||[]).length},{status:409});preds.push(...(data||[]));}
  const roleRows:any[]=[];for(const g of gws){const{data,error}=await sb.from('current_player_fixture_roles').select('player_id,gameweek,primary_role,confidence,expected_xi,evidence').eq('gameweek',g).range(0,999);if(error)throw error;if((data||[]).length<500)return Response.json({ok:false,status:'HORIZON_ROLE_STATE_MISSING',gameweek:g,rows:(data||[]).length},{status:409});roleRows.push(...(data||[]));}
  const[{data:players,error:ple},{data:squad,error:se},{data:teams,error:te},{data:ms,error:mse}]=await Promise.all([
    sb.from('players').select('id,team_id,web_name,position,status,now_cost,selected_by_percent,penalties_order'),
    sb.from('squad_members').select('player_id').eq('active',true),
    sb.from('teams').select('id,name,short_name'),
    sb.from('fpl_manager_state_snapshots').select('id,free_transfers,bank_tenths,evidence').eq('gameweek',gw).order('captured_at',{ascending:false}).limit(1).single()
  ]);if(ple||se||te||mse)throw ple||se||te||mse;

  const tn=new Map((teams||[]).map((t:any)=>[N(t.id),t.short_name||t.name])),cur=new Set((squad||[]).map((x:any)=>N(x.player_id))),assetRows=Array.isArray(ms?.evidence?.squad)?ms.evidence.squad:[],assetMap:any=new Map(assetRows.map((x:any)=>[N(x.player_id),x]));
  if(cur.size!==15||assetMap.size!==15)return Response.json({ok:false,status:'CURRENT_SQUAD_OR_ASSET_EVIDENCE_INVALID'},{status:409});
  const pm=new Map<number,Map<number,any>>();for(const q of preds){const id=N(q.player_id),g=N(q.gameweek);if(!pm.has(id))pm.set(id,new Map());pm.get(id)!.set(g,{expected_points:N(q.expected_points),expected_minutes:N(q.expected_minutes),p_blank:N(q.p_blank),p_5_plus:N(q.p_5_plus),p_10_plus:N(q.p_10_plus),p_15_plus:N(q.p_15_plus),p_20_plus:N(q.p_20_plus),p_start:N(q.p_start)});}
  const rm=new Map<number,Map<number,any>>();for(const r of roleRows){const id=N(r.player_id),g=N(r.gameweek);if(!rm.has(id))rm.set(id,new Map());rm.get(id)!.set(g,r);}
  const pool:any[]=[];for(const p of players||[]){const pos=String(p.position||'');if(!POS.includes(pos)||!p.team_id||p.now_cost==null)continue;const m=pm.get(N(p.id)),roles=rm.get(N(p.id));if(!m||!roles||gws.some(g=>!m.has(g)||!roles.has(g)))continue;const isCur=cur.has(N(p.id));let sp:number|null=null,buy:number|null=null;if(isCur){const a=assetMap.get(N(p.id));buy=N(a?.purchase_price_tenths,NaN);if(!Number.isFinite(buy))continue;sp=sellPrice(N(p.now_cost),buy);}const hs=gws.reduce((s,g,i)=>s+weights[i]*N(m.get(g)?.expected_points),0),c=m.get(gw),tail=N(c.expected_points)+N(c.p_5_plus)+2.5*N(c.p_10_plus)+4*N(c.p_15_plus)+6*N(c.p_20_plus)-.5*N(c.p_blank);const o:any={id:N(p.id),team_id:N(p.team_id),name:String(p.web_name),position:pos,nowPrice:N(p.now_cost),sellPrice:sp,buyPrice:buy,budgetPrice:isCur?sp:N(p.now_cost),penaltyOrder:p.penalties_order==null?null:N(p.penalties_order),preds:m,roles,horizonScore:hs,currentMinutes:N(c.expected_minutes),tailScore:tail,inCurrent:isCur};o.roleRisk=roleRisk(o,gws);o.roleUnknown=roleUnknown(o,gws);pool.push(o);}
  const currentSquad=[...cur].map(id=>pool.find(p=>p.id===id)).filter(Boolean);if(currentSquad.length!==15)return Response.json({ok:false,status:'CURRENT_SQUAD_PROJECTION_OR_ROLE_INCOMPLETE'},{status:409});
  const budget=currentSquad.reduce((s,p)=>s+N(p.sellPrice),0)+N(ms.bank_tenths);
  const top=new Set([...pool].sort((a,b)=>b.currentMinutes-a.currentMinutes||b.horizonScore-a.horizonScore).slice(0,300).map(p=>p.id));
  const ex=[...pool].filter(p=>{const q=p.preds.get(gw),p90=q.expected_minutes>10?q.expected_points*90/q.expected_minutes:0;return q.p_10_plus>=.12||q.p_15_plus>=.045||q.p_20_plus>=.015||(q.p_start>=.35&&p90>=5.2)}).sort((a,b)=>b.tailScore-a.tailScore).slice(0,100),exs=new Set(ex.map(p=>p.id));
  const vi=pool.filter(p=>p.inCurrent||((top.has(p.id)||exs.has(p.id))&&p.roleRisk===0));
  const bp:any={};for(const pos of POS)bp[pos]=vi.filter(p=>p.position===pos).sort((a,b)=>(b.horizonScore+.10*b.tailScore+.002*b.currentMinutes)-(a.horizonScore+.10*a.tailScore+.002*a.currentMinutes)).slice(0,CAPS[pos]);
  const valid=(sq:any[])=>{if(sq.length!==15)return false;let cost=0;const pc:any={},tcnt:any={},ids=new Set<number>();for(const p of sq){if(ids.has(p.id))return false;ids.add(p.id);cost+=N(p.budgetPrice);pc[p.position]=(pc[p.position]||0)+1;tcnt[p.team_id]=(tcnt[p.team_id]||0)+1;if(tcnt[p.team_id]>3)return false;}return cost<=budget&&POS.every(p=>pc[p]===NEED[p]);};
  const evalSq=(sq:any[])=>{if(!valid(sq))return null;const ti=sq.filter(p=>!p.inCurrent).length;if(ti>maxTransfers)return null;let obj=0,capTail=0;const plans:any[]=[];for(let i=0;i<gws.length;i++){const g=gws[i],z=bestXI(sq,g);if(!z)return null;const cx=N(z.captain.preds.get(g)?.expected_points);obj+=weights[i]*(z.xiPts+cx+benchW*z.benchPts);capTail+=weights[i]*z.captainScore;plans.push({gameweek:g,weight:weights[i],formation:z.formation,xi_expected_points:+z.xiPts.toFixed(3),captain_extra_expected_points:+cx.toFixed(3),bench_expected_points:+z.benchPts.toFixed(3),captain_player_id:z.captain.id,vice_player_id:z.vice.id,starting_xi:z.xi.map((p:any)=>p.id)});}const hits=Math.max(0,ti-actualFT)*tc;obj-=hits;const ids=new Set(sq.map(p=>p.id)),outs=currentSquad.filter(p=>!ids.has(p.id)),ins=sq.filter(p=>!p.inCurrent),mins=sq.map(p=>Math.min(...gws.map(g=>N(p.preds.get(g)?.expected_minutes))));return{objective:obj,transfersIn:ti,hits,cost:sq.reduce((s,p)=>s+N(p.budgetPrice),0),squad:sq,outs,ins,plans,strategic:{mean_min_xmins:+(mins.reduce((a,b)=>a+b,0)/15).toFixed(2),weak_slots_under_55_xmins:mins.filter(x=>x<55).length,role_risk_slots:sq.reduce((s,p)=>s+p.roleRisk,0),role_unknown_slots:sq.reduce((s,p)=>s+p.roleUnknown,0),itb_tenths:budget-sq.reduce((s,p)=>s+N(p.budgetPrice),0),captaincy_tail_coverage:+capTail.toFixed(3)}};};
  let sq=[...currentSquad],best=evalSq(sq)!;
  for(let iter=0;iter<8;iter++){let be=best,bs=sq;const sel=new Set(sq.map(p=>p.id));for(let i=0;i<sq.length;i++){for(const c of bp[sq[i].position]){if(sel.has(c.id))continue;const ns=[...sq];ns[i]=c;const e=evalSq(ns);if(e&&e.objective>be.objective+1e-8){be=e;bs=ns;}}}if(bs===sq)break;sq=bs;best=be;}
  if(maxTransfers>=2){let be=best,bs=sq;const sel=new Set(sq.map(p=>p.id));for(let i=0;i<sq.length;i++)for(let j=i+1;j<sq.length;j++){const ai=bp[sq[i].position].filter((p:any)=>!sel.has(p.id)).slice(0,4),aj=bp[sq[j].position].filter((p:any)=>!sel.has(p.id)).slice(0,4);for(const a of ai)for(const b of aj){if(a.id===b.id)continue;const ns=[...sq];ns[i]=a;ns[j]=b;const e=evalSq(ns);if(e&&e.objective>be.objective+1e-8){be=e;bs=ns;}}}if(bs!==sq){sq=bs;best=be;}}
  const roll=evalSq(currentSquad)!;
  const pairTransfers=(x:any)=>{const qs=new Map<string,any[]>();for(const o of x.outs){if(!qs.has(o.position))qs.set(o.position,[]);qs.get(o.position)!.push(o);}return x.ins.map((p:any)=>{const q=qs.get(p.position)||[],o=q.shift();return{out_player_id:o?.id??null,out_name:o?.name??null,in_player_id:p.id,in_name:p.name,position:p.position,in_price_tenths:p.nowPrice,out_sell_price_tenths:o?.sellPrice??null};});};
  const ser=(x:any)=>({scenario:`PATH_MAX_${maxTransfers}`,objective:+x.objective.toFixed(3),objective_gain_vs_roll:+(x.objective-roll.objective).toFixed(3),transfers_in:x.transfersIn,transfer_cost_points:x.hits,cost_tenths:x.cost,itb_tenths:budget-x.cost,transfers:pairTransfers(x),strategic:x.strategic,squad:x.squad.map((p:any)=>({player_id:p.id,name:p.name,team:tn.get(p.team_id)||p.team_id,position:p.position,now_price_tenths:p.nowPrice,budget_price_tenths:p.budgetPrice,horizon_score:+p.horizonScore.toFixed(3),current_xmins:+p.currentMinutes.toFixed(2),current_tail_score:+p.tailScore.toFixed(3),penalty_order:p.penaltyOrder,current_role:p.roles?.get(gw)?.primary_role??null,current_role_confidence:p.roles?.get(gw)?.confidence??null,role_family:roleFamily(p.roles?.get(gw)?.primary_role),role_risk:p.roleRisk===1,retained:p.inCurrent})),gameweeks:x.plans});
  const rec=best.objective-roll.objective>=err?best:roll;
  return Response.json({ok:true,status:'PATH_EVALUATED_READ_ONLY',version:VERSION,decisioning:false,writes_manager_plan:false,gameweek:gw,horizon:h,actual_free_transfers:actualFT,max_transfers:maxTransfers,model_error_margin_points:err,manager_state_id:ms.id,budget_tenths:budget,source_pool_count:pool.length,xmins_top_n:300,explosive_exception_count:ex.length,prediction_runs:gws.map(g=>({gameweek:g,run_id:latest.get(g).id,generated_at:latest.get(g).generated_at})),roll:ser(roll),recommended_by_noise_gate:ser(rec),edge_classification:rec===roll?'NO_MEANINGFUL_EDGE_VS_ROLL':'ROBUST_VS_ROLL_WITHIN_PATH_SEARCH',role_policy:{new_control_defensive_mid_fwd_excluded:true,penalty_taker_exemption:false},historical_forecasts_rewritten:false});
}catch(e){return Response.json({ok:false,status:'PATH_EVALUATOR_ERROR',error:e instanceof Error?e.message:String(e),decisioning:false},{status:500})}});