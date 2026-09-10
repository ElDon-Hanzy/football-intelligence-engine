import { createClient } from 'jsr:@supabase/supabase-js@2';

const N = (x: any, d = 0) => Number.isFinite(Number(x)) ? Number(x) : d;
const POS = ['GKP', 'DEF', 'MID', 'FWD'];
const NEED: any = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };
const CAPS: any = { GKP: 18, DEF: 50, MID: 60, FWD: 35 };
const FORM = [[3,4,3],[3,5,2],[4,3,3],[4,4,2],[4,5,1],[5,2,3],[5,3,2],[5,4,1]];
const ATTACK = new Set(['CREATOR_10','WIDE_ATTACKER','WIDE_FORWARD','LINK_FORWARD','TARGET_FORWARD','CENTRAL_STRIKER','WING_BACK']);
const CONTROL = new Set(['HOLDING_MIDFIELDER','CENTRE_BACK','HYBRID_DEFENDER','WIDE_BACK','GOALKEEPER']);
const OPTIMIZER_VERSION = 'C0228_DISTRIBUTED_ENSEMBLE_OPTIMIZER_V02';
const CONSTRAINT_VERSION = 'C0240_CONSTRAINED_EVALUATION_V01';

function sellPrice(now: number, buy: number) { return now <= buy ? now : buy + Math.floor((now - buy) / 2); }
function roleFamily(r: any) { const x = String(r || ''); return ATTACK.has(x) ? 'ATTACKING' : CONTROL.has(x) ? 'CONTROL_DEFENSIVE' : x === 'BOX_TO_BOX' ? 'BALANCED' : 'UNKNOWN'; }
function roleRisk(p: any, gws: number[]) { if (!['MID','FWD'].includes(p.position) || p.penaltyOrder === 1) return 0; let seen=0,risky=0; for (const g of gws) { const r=p.roles?.get(g); if (!r) continue; seen++; if (roleFamily(r.primary_role)==='CONTROL_DEFENSIVE' && N(r.confidence)>=.7) risky++; } return seen && risky/seen>=.5 ? 1 : 0; }
function roleUnknown(p: any, gws: number[]) { let seen=0; for (const g of gws) if (p.roles?.get(g)?.primary_role) seen++; return seen===0 ? 1 : 0; }
function uniqNums(x: any): number[] { return [...new Set((Array.isArray(x)?x:[]).map((v:any)=>N(v,NaN)).filter((v:number)=>Number.isInteger(v)&&v>0))]; }

function bestXI(sq: any[], gw: number) {
  let best: any = null;
  for (const [d,m,f] of FORM) {
    const pick = (p: string, n: number) => sq.filter(x=>x.position===p).sort((a,b)=>N(b.preds.get(gw)?.expected_points)-N(a.preds.get(gw)?.expected_points)).slice(0,n);
    const xi = [...pick('GKP',1), ...pick('DEF',d), ...pick('MID',m), ...pick('FWD',f)];
    if (xi.length!==11) continue;
    const xp=xi.reduce((s,p)=>s+N(p.preds.get(gw)?.expected_points),0);
    const tot=sq.reduce((s,p)=>s+N(p.preds.get(gw)?.expected_points),0);
    const cs=(p:any)=>{const x=p.preds.get(gw);return N(x.expected_points)+N(x.p_5_plus)+2.5*N(x.p_10_plus)+4*N(x.p_15_plus)+6*N(x.p_20_plus)-.5*N(x.p_blank)};
    const cp=[...xi].sort((a,b)=>cs(b)-cs(a)||N(b.preds.get(gw)?.expected_points)-N(a.preds.get(gw)?.expected_points));
    const z={formation:`${d}-${m}-${f}`,xi,xiPts:xp,benchPts:tot-xp,captain:cp[0],vice:cp[1],captainScore:cs(cp[0])};
    if(!best||xp>best.xiPts) best=z;
  }
  return best;
}

Deno.serve(async (req: Request) => {
  const body = await req.json().catch(()=>({}));
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const key = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key) return Response.json({ok:false,error:'service credential missing'},{status:500});
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const {data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});
  if(ae||!tok||req.headers.get('x-engine-token')!==tok) return Response.json({ok:false,error:'unauthorized'},{status:401});

  try {
    const gw=Number(body.gameweek||0);
    const h=Math.max(1,Math.min(5,Number(body.horizon||3)));
    const benchW=Math.max(0,Math.min(.5,N(body.bench_weight,.12)));
    const ft=Math.max(0,Math.min(5,Number(body.free_transfers??1)));
    const tc=Math.max(0,Math.min(8,N(body.transfer_cost_points,4)));
    const err=Math.max(.25,Math.min(5,N(body.model_error_margin_points,1)));
    const weights=(Array.isArray(body.weights)?body.weights:[1,.82,.68,.56,.46]).slice(0,h).map((x:any)=>Math.max(0,N(x)));
    if(!gw||weights.length!==h||weights.every((x:number)=>x===0)) return Response.json({ok:false,error:'gameweek/weights invalid'},{status:400});
    const gws=Array.from({length:h},(_,i)=>gw+i);

    const requiredIds=uniqNums(body.required_player_ids);
    const excludedIds=uniqNums(body.excluded_player_ids);
    const overlap=requiredIds.filter(id=>excludedIds.includes(id));
    if(overlap.length) return Response.json({ok:false,status:'CONSTRAINT_CONFLICT',conflicting_player_ids:overlap,decisioning:false},{status:400});
    if(requiredIds.length>15||excludedIds.length>100) return Response.json({ok:false,status:'CONSTRAINT_LIMIT_EXCEEDED',decisioning:false},{status:400});
    const constrained = requiredIds.length>0 || excludedIds.length>0 || body.max_transfer_count!=null || body.adversarial_context!=null;
    const maxTransferCount=body.max_transfer_count==null?99:Math.max(0,Math.min(15,N(body.max_transfer_count,99)));

    const {data:mv,error:mve}=await sb.from('model_versions').select('id,version').eq('is_active',true).order('created_at',{ascending:false}).limit(1).single();
    if(mve||!mv) throw mve||new Error('active model missing');
    const {data:runs,error:re}=await sb.from('gameweek_prediction_runs').select('id,gameweek,generated_at').eq('model_version_id',mv.id).in('gameweek',gws).order('generated_at',{ascending:false});
    if(re) throw re;
    const latest=new Map<number,any>(); for(const r of runs||[]) if(!latest.has(Number(r.gameweek))) latest.set(Number(r.gameweek),r);
    const miss=gws.filter(g=>!latest.has(g)); if(miss.length) return Response.json({ok:false,status:'HORIZON_PROJECTION_MISSING',missing_gameweeks:miss,decisioning:false},{status:409});
    const runIds=gws.map(g=>Number(latest.get(g).id));

    const preds:any[]=[];
    for(const rid of runIds){const {data,error}=await sb.from('model_predictions').select('player_id,gameweek,expected_points,expected_minutes,p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_start').eq('prediction_run_id',rid).range(0,999);if(error)throw error;if((data||[]).length<500)return Response.json({ok:false,status:'PROJECTION_PAGE_INCOMPLETE',run_id:rid,rows:(data||[]).length,decisioning:false},{status:409});preds.push(...(data||[]))}

    const roleRows:any[]=[];
    for(const g of gws){const {data,error}=await sb.from('current_player_fixture_roles').select('player_id,gameweek,primary_role,confidence,expected_xi,evidence').eq('gameweek',g).range(0,999);if(error)throw error;if((data||[]).length<500)return Response.json({ok:false,status:'HORIZON_ROLE_STATE_MISSING',gameweek:g,rows:(data||[]).length,decisioning:false},{status:409});roleRows.push(...(data||[]))}

    const [{data:players,error:ple},{data:squad,error:se},{data:teams,error:te},{data:ms,error:mse}] = await Promise.all([
      sb.from('players').select('id,team_id,web_name,position,status,now_cost,selected_by_percent,chance_of_playing_next_round,penalties_order'),
      sb.from('squad_members').select('player_id').eq('active',true),
      sb.from('teams').select('id,name,short_name'),
      sb.from('fpl_manager_state_snapshots').select('id,gameweek,free_transfers,bank_tenths,squad_liquidation_value_tenths,evidence').eq('gameweek',gw).order('captured_at',{ascending:false}).limit(1).single()
    ]);
    if(ple||se||te||mse) throw ple||se||te||mse;

    const tn=new Map((teams||[]).map((t:any)=>[Number(t.id),t.short_name||t.name]));
    const cur=new Set((squad||[]).map((x:any)=>Number(x.player_id)));
    const assetRows=Array.isArray(ms?.evidence?.squad)?ms.evidence.squad:[];
    const assetMap:any=new Map(assetRows.map((x:any)=>[Number(x.player_id),x]));
    if(cur.size!==15||assetMap.size!==15) return Response.json({ok:false,status:'CURRENT_SQUAD_OR_ASSET_EVIDENCE_INVALID',decisioning:false},{status:409});

    const pm=new Map<number,Map<number,any>>();
    for(const q of preds){const id=Number(q.player_id),g=Number(q.gameweek);if(!pm.has(id))pm.set(id,new Map());pm.get(id)!.set(g,{expected_points:N(q.expected_points),expected_minutes:N(q.expected_minutes),p_blank:N(q.p_blank),p_5_plus:N(q.p_5_plus),p_10_plus:N(q.p_10_plus),p_15_plus:N(q.p_15_plus),p_20_plus:N(q.p_20_plus),p_start:N(q.p_start)})}
    const rm=new Map<number,Map<number,any>>();
    for(const r of roleRows){const id=Number(r.player_id),g=Number(r.gameweek);if(!rm.has(id))rm.set(id,new Map());rm.get(id)!.set(g,r)}

    const pool:any[]=[];
    for(const p of players||[]){
      const pos=String(p.position||''); if(!POS.includes(pos)||!p.team_id||p.now_cost==null) continue;
      const m=pm.get(Number(p.id)),roles=rm.get(Number(p.id)); if(!m||!roles||gws.some(g=>!m.has(g)||!roles.has(g))) continue;
      const isCur=cur.has(Number(p.id)); let sp:number|null=null,buy:number|null=null;
      if(isCur){const a=assetMap.get(Number(p.id));buy=N(a?.purchase_price_tenths,NaN);if(!Number.isFinite(buy))continue;sp=sellPrice(Number(p.now_cost),buy)}
      const hs=gws.reduce((s,g,i)=>s+weights[i]*N(m.get(g)?.expected_points),0),c=m.get(gw);
      const tail=N(c.expected_points)+N(c.p_5_plus)+2.5*N(c.p_10_plus)+4*N(c.p_15_plus)+6*N(c.p_20_plus)-.5*N(c.p_blank);
      const obj:any={id:Number(p.id),team_id:Number(p.team_id),name:String(p.web_name),position:pos,nowPrice:Number(p.now_cost),sellPrice:sp,buyPrice:buy,budgetPrice:isCur?sp:Number(p.now_cost),ownership:p.selected_by_percent==null?null:N(p.selected_by_percent),penaltyOrder:p.penalties_order==null?null:N(p.penalties_order),preds:m,roles,horizonScore:hs,currentMinutes:N(c.expected_minutes),tailScore:tail,inCurrent:isCur};
      obj.roleRisk=roleRisk(obj,gws); obj.roleUnknown=roleUnknown(obj,gws); pool.push(obj);
    }

    const byId=new Map(pool.map(p=>[p.id,p]));
    const missingRequired=requiredIds.filter(id=>!byId.has(id));
    if(missingRequired.length) return Response.json({ok:false,status:'REQUIRED_PLAYER_NOT_IN_COMPLETE_POOL',player_ids:missingRequired,decisioning:false},{status:409});
    const requiredPositionCounts:any={}; const requiredTeamCounts:any={};
    for(const id of requiredIds){const p=byId.get(id)!;requiredPositionCounts[p.position]=(requiredPositionCounts[p.position]||0)+1;requiredTeamCounts[p.team_id]=(requiredTeamCounts[p.team_id]||0)+1;}
    if(Object.entries(requiredPositionCounts).some(([p,n]:any)=>N(n)>NEED[p])) return Response.json({ok:false,status:'REQUIRED_POSITION_OVERFLOW',counts:requiredPositionCounts,decisioning:false},{status:400});
    if(Object.values(requiredTeamCounts).some((n:any)=>N(n)>3)) return Response.json({ok:false,status:'REQUIRED_CLUB_OVERFLOW',counts:requiredTeamCounts,decisioning:false},{status:400});

    const currentSquad=[...cur].map(id=>pool.find(p=>p.id===id)).filter(Boolean);
    if(currentSquad.length!==15) return Response.json({ok:false,status:'CURRENT_SQUAD_PROJECTION_OR_ROLE_INCOMPLETE',decisioning:false},{status:409});
    const derivedLiq=currentSquad.reduce((s,p)=>s+N(p.sellPrice),0), budget=derivedLiq+N(ms.bank_tenths);

    const top=new Set([...pool].sort((a,b)=>b.currentMinutes-a.currentMinutes||b.horizonScore-a.horizonScore).slice(0,300).map(p=>p.id));
    const ex=[...pool].filter(p=>{const q=p.preds.get(gw),p90=q.expected_minutes>10?q.expected_points*90/q.expected_minutes:0;return q.p_10_plus>=.12||q.p_15_plus>=.045||q.p_20_plus>=.015||(q.p_start>=.35&&p90>=5.2)}).sort((a,b)=>b.tailScore-a.tailScore).slice(0,100);
    const exs=new Set(ex.map(p=>p.id)); const reqSet=new Set(requiredIds), exSet=new Set(excludedIds);
    const vi=pool.filter(p=>!exSet.has(p.id)&&(p.inCurrent||top.has(p.id)||exs.has(p.id)||reqSet.has(p.id)));
    const bp:any={};
    for(const pos of POS){
      const arr=vi.filter(p=>p.position===pos).sort((a,b)=>(b.horizonScore+.10*b.tailScore+.002*b.currentMinutes)-(a.horizonScore+.10*a.tailScore+.002*a.currentMinutes));
      const requiredAtPos=requiredIds.map(id=>byId.get(id)).filter((p:any)=>p?.position===pos);
      const merged=[...requiredAtPos,...arr]; const seen=new Set<number>(); bp[pos]=merged.filter((p:any)=>!seen.has(p.id)&&(seen.add(p.id),true)).slice(0,CAPS[pos]);
    }

    const validCore=(sq:any[])=>{
      if(sq.length!==15)return false; let cost=0; const pc:any={},tcnt:any={},ids=new Set<number>();
      for(const p of sq){if(ids.has(p.id))return false;ids.add(p.id);cost+=p.budgetPrice;pc[p.position]=(pc[p.position]||0)+1;tcnt[p.team_id]=(tcnt[p.team_id]||0)+1;if(tcnt[p.team_id]>3)return false}
      return cost<=budget&&POS.every(p=>pc[p]===NEED[p]);
    };
    const valid=(sq:any[])=>{
      if(!validCore(sq)) return false; const ids=new Set(sq.map(p=>p.id));
      if(requiredIds.some(id=>!ids.has(id))) return false;
      if(excludedIds.some(id=>ids.has(id))) return false;
      return true;
    };

    const evalSq=(sq:any[],cap=99,chargeHits=true,enforceConstraints=true)=>{
      if(!(enforceConstraints?valid(sq):validCore(sq)))return null;
      const ti=sq.filter(p=>!p.inCurrent).length; if(ti>cap)return null;
      let obj=0,capTail=0; const plans:any[]=[];
      for(let i=0;i<gws.length;i++){
        const g=gws[i],z=bestXI(sq,g); if(!z)return null; const cx=N(z.captain.preds.get(g)?.expected_points);
        obj+=weights[i]*(z.xiPts+cx+benchW*z.benchPts); capTail+=weights[i]*z.captainScore;
        plans.push({gameweek:g,weight:weights[i],formation:z.formation,xi_expected_points:+z.xiPts.toFixed(3),captain_extra_expected_points:+cx.toFixed(3),bench_expected_points:+z.benchPts.toFixed(3),captain_player_id:z.captain.id,vice_player_id:z.vice.id,starting_xi:z.xi.map((p:any)=>p.id)});
      }
      const hits=chargeHits?Math.max(0,ti-ft)*tc:0; obj-=hits;
      const ids=new Set(sq.map(p=>p.id)),outs=currentSquad.filter(p=>!ids.has(p.id)),ins=sq.filter(p=>!p.inCurrent),mins=sq.map(p=>Math.min(...gws.map(g=>N(p.preds.get(g)?.expected_minutes))));
      return {objective:obj,cost:sq.reduce((s,p)=>s+p.budgetPrice,0),transfersIn:ti,hits,squad:sq,outs,ins,gwPlans:plans,strategic:{mean_min_xmins:+(mins.reduce((a,b)=>a+b,0)/15).toFixed(2),weak_slots_under_55_xmins:mins.filter(x=>x<55).length,role_risk_slots:sq.reduce((s,p)=>s+p.roleRisk,0),role_unknown_slots:sq.reduce((s,p)=>s+p.roleUnknown,0),premium_slots_9m_plus:sq.filter(p=>p.nowPrice>=90).length,captaincy_tail_coverage:+capTail.toFixed(3),itb_tenths:budget-sq.reduce((s,p)=>s+p.budgetPrice,0)}};
    };

    const improve=(start:any[],cap:number,chargeHits=true,pairSearch=true,maxIter=7)=>{
      let sq=[...start],curE=evalSq(sq,cap,chargeHits,true); if(!curE)return null;
      for(let iter=0;iter<maxIter;iter++){
        let be=curE,bs=sq; const sel=new Set(sq.map(p=>p.id));
        for(let i=0;i<sq.length;i++)for(const c of bp[sq[i].position]){if(sel.has(c.id))continue;const ns=[...sq];ns[i]=c;const e=evalSq(ns,cap,chargeHits,true);if(e&&e.objective>be.objective+1e-8){be=e;bs=ns}}
        if(bs===sq)break; sq=bs;curE=be;
      }
      if(pairSearch&&cap>=2){
        let be=curE,bs=sq;const sel=new Set(sq.map(p=>p.id));
        for(let i=0;i<sq.length;i++)for(let j=i+1;j<sq.length;j++){
          const ai=bp[sq[i].position].filter((p:any)=>!sel.has(p.id)).slice(0,8),aj=bp[sq[j].position].filter((p:any)=>!sel.has(p.id)).slice(0,8);
          for(const a of ai)for(const b of aj){if(a.id===b.id)continue;const ns=[...sq];ns[i]=a;ns[j]=b;const e=evalSq(ns,cap,chargeHits,true);if(e&&e.objective>be.objective+1e-8){be=e;bs=ns}}
        }
        if(bs!==sq){sq=bs;curE=be;}
      }
      return curE;
    };

    const premiumRank=(p:any)=>p.horizonScore+.16*p.tailScore+.004*p.currentMinutes;
    const freshSeedProfile=(profile:any)=>{
      const sq:any[]=[],team:any={},pc:any={},ids=new Set<number>();
      const add=(c:any)=>{if(!c||exSet.has(c.id)||ids.has(c.id)||(team[c.team_id]||0)>=3||(pc[c.position]||0)>=NEED[c.position])return false;sq.push(c);ids.add(c.id);pc[c.position]=(pc[c.position]||0)+1;team[c.team_id]=(team[c.team_id]||0)+1;return true};
      for(const id of requiredIds) if(!add(byId.get(id))) return null;
      const mids=[...bp.MID].filter((p:any)=>p.nowPrice>=90).sort((a:any,b:any)=>premiumRank(b)-premiumRank(a));
      const fwds=[...bp.FWD].filter((p:any)=>p.nowPrice>=90).sort((a:any,b:any)=>premiumRank(b)-premiumRank(a));
      if(profile.anchorPremiumFwd&&!sq.some(p=>p.position==='FWD'&&p.nowPrice>=90)) add(fwds[0]);
      if(profile.anchorPremiumMids){const have=sq.filter(p=>p.position==='MID'&&p.nowPrice>=90).length;for(const p of mids.slice(0,Math.max(0,profile.anchorPremiumMids-have)))add(p)}
      for(const pos of profile.order){
        let cand=[...bp[pos]].filter((p:any)=>!ids.has(p.id));
        if(profile.noPremiumFwd&&pos==='FWD')cand=cand.filter((p:any)=>p.nowPrice<90);
        if(profile.maxDefPrice&&pos==='DEF')cand=cand.filter((p:any)=>p.nowPrice<=profile.maxDefPrice);
        if(profile.minDefPrice&&pos==='DEF')cand=cand.filter((p:any)=>p.nowPrice>=profile.minDefPrice);
        cand.sort((a:any,b:any)=>{const sa=a.horizonScore+.12*a.tailScore+profile.minutesWeight*a.currentMinutes-profile.lambda*a.budgetPrice,sb=b.horizonScore+.12*b.tailScore+profile.minutesWeight*b.currentMinutes-profile.lambda*b.budgetPrice;return sb-sa||a.budgetPrice-b.budgetPrice});
        for(const c of cand){if((pc[pos]||0)>=NEED[pos])break;add(c)}
      }
      return valid(sq)?sq:null;
    };

    const profileCatalog:any[]=[
      {name:'BALANCED_VALUE',lambda:.16,minutesWeight:.003,order:['MID','DEF','FWD','GKP']},
      {name:'PREMIUM_FORWARD',lambda:.18,minutesWeight:.003,order:['FWD','MID','DEF','GKP'],anchorPremiumFwd:true},
      {name:'DUAL_PREMIUM_MID_VALUE',lambda:.23,minutesWeight:.003,order:['MID','FWD','DEF','GKP'],anchorPremiumMids:2,noPremiumFwd:true},
      {name:'DUAL_PREMIUM_MID_LOW_DEF',lambda:.22,minutesWeight:.004,order:['MID','FWD','DEF','GKP'],anchorPremiumMids:2,noPremiumFwd:true,maxDefPrice:65},
      {name:'HIGH_MINUTES_DURABLE',lambda:.16,minutesWeight:.012,order:['MID','DEF','FWD','GKP']},
      {name:'CHEAP_DEF_REINVEST',lambda:.20,minutesWeight:.004,order:['MID','FWD','DEF','GKP'],maxDefPrice:55},
      {name:'PREMIUM_DEFENDER',lambda:.14,minutesWeight:.004,order:['DEF','MID','FWD','GKP'],minDefPrice:60},
      {name:'ATTACK_HEAVY',lambda:.12,minutesWeight:.003,order:['MID','FWD','DEF','GKP']},
      {name:'VALUE_FLEX_ITB',lambda:.28,minutesWeight:.004,order:['MID','FWD','DEF','GKP']},
      {name:'BENCH_DURABILITY',lambda:.17,minutesWeight:.016,order:['GKP','DEF','MID','FWD']}
    ];

    const requestedProfile=body.ensemble_profile?String(body.ensemble_profile):null;
    const profileOnly=body.profile_only===true;
    const profiles=requestedProfile?profileCatalog.filter(p=>p.name===requestedProfile):profileCatalog.filter(p=>constrained||['BALANCED_VALUE','PREMIUM_FORWARD'].includes(p.name));
    if(requestedProfile&&!profiles.length)return Response.json({ok:false,status:'UNKNOWN_ENSEMBLE_PROFILE',ensemble_profile:requestedProfile},{status:400});

    const roll=evalSq(currentSquad,0,true,false); if(!roll)return Response.json({ok:false,status:'ROLL_BASELINE_ILLEGAL'},{status:409});

    const pairTransfers=(x:any)=>{const qs=new Map<string,any[]>();for(const o of x.outs){if(!qs.has(o.position))qs.set(o.position,[]);qs.get(o.position)!.push(o)}return x.ins.map((p:any)=>{const q=qs.get(p.position)||[],o=q.shift();return{out_player_id:o?.id??null,out_name:o?.name??null,out_role:o?.roles?.get(gw)?.primary_role??null,in_player_id:p.id,in_name:p.name,in_role:p.roles?.get(gw)?.primary_role??null,position:p.position,in_price_tenths:p.nowPrice,out_sell_price_tenths:o?.sellPrice??null}})};
    const ser=(x:any)=>({scenario:`MAX_${x.maxTransfers}FT`,objective:+x.objective.toFixed(3),objective_gain_vs_roll:+(x.objective-roll.objective).toFixed(3),cost_tenths:x.cost,itb_tenths:budget-x.cost,transfers_in:x.transfersIn,transfer_cost_points:x.hits,transfers:pairTransfers(x),strategic:x.strategic,squad:x.squad.map((p:any)=>({player_id:p.id,name:p.name,team:tn.get(p.team_id)||p.team_id,position:p.position,now_price_tenths:p.nowPrice,budget_price_tenths:p.budgetPrice,horizon_score:+p.horizonScore.toFixed(3),current_xmins:+p.currentMinutes.toFixed(2),current_tail_score:+p.tailScore.toFixed(3),penalty_order:p.penaltyOrder,current_role:p.roles?.get(gw)?.primary_role??null,current_role_confidence:p.roles?.get(gw)?.confidence??null,role_family:roleFamily(p.roles?.get(gw)?.primary_role),role_risk:p.roleRisk===1,retained:p.inCurrent})),gameweeks:x.gwPlans});
    const familySig=(x:any)=>{const pf=x.squad.filter((p:any)=>p.position==='FWD'&&p.nowPrice>=90).length,pm=x.squad.filter((p:any)=>p.position==='MID'&&p.nowPrice>=90).length,pd=x.squad.filter((p:any)=>p.position==='DEF'&&p.nowPrice>=70).length;return `PF${pf}_PM${pm}_PD${pd}`};

    if(constrained){
      const attempts:any[]=[];
      for(const profile of profiles){const seed=freshSeedProfile(profile);if(!seed)continue;const e=improve(seed,maxTransferCount,true,true,5);if(e)attempts.push({...e,profile:profile.name})}
      if(!attempts.length)return Response.json({ok:false,status:'CONSTRAINED_SEARCH_FAILED',required_player_ids:requiredIds,excluded_player_ids:excludedIds,max_transfer_count:maxTransferCount,decisioning:false},{status:409});
      const dedup=new Map<string,any>();for(const x of attempts){const k=x.squad.map((p:any)=>p.id).sort((a:number,b:number)=>a-b).join('-');const old=dedup.get(k);if(!old||x.objective>old.objective)dedup.set(k,x)}
      const xs=[...dedup.values()].sort((a,b)=>b.objective-a.objective);const best=xs[0],top=N(best.objective);
      const candidates=xs.map((x:any)=>({profile:x.profile,family_signature:familySig(x),gap_to_best:+(top-N(x.objective)).toFixed(3),equivalent_to_best:top-N(x.objective)<=err,...ser({...x,maxTransfers:x.transfersIn})}));
      return Response.json({ok:true,status:'CONSTRAINED_OPTIMIZED_READ_ONLY',optimizer_version:OPTIMIZER_VERSION,constraint_version:CONSTRAINT_VERSION,decisioning:false,writes_manager_plan:false,gameweek:gw,horizon:h,gws,weights,manager_state_id:ms.id,budget_tenths:budget,free_transfers:ft,model_error_margin_points:err,prediction_runs:gws.map(g=>({gameweek:g,run_id:latest.get(g).id,generated_at:latest.get(g).generated_at})),constraints:{required_player_ids:requiredIds,excluded_player_ids:excludedIds,max_transfer_count:maxTransferCount,adversarial_context:body.adversarial_context??null,positions:NEED,max_per_club:3,missing_data_is_not_zero:true,exact_target_gw_role_state_required:true},roll:ser({...roll,maxTransfers:0}),constrained_best:candidates[0],constrained_candidates:candidates,search:{profiles:profiles.map(p=>p.name),attempts:attempts.length,unique_squads:xs.length,full_squad_reoptimization:true,hard_coded_player_names:false},historical_forecasts_rewritten:false});
    }

    const scenarios:any[]=[];
    if(profileOnly){scenarios.push({...roll,maxTransfers:0})}
    else{for(const cap of Array.from({length:ft+1},(_,i)=>i)){const e=cap===0?roll:(()=>{
      let sq=[...currentSquad]; let curE=evalSq(sq,cap,true,false); if(!curE)return null;
      for(let iter=0;iter<7;iter++){let be=curE,bs=sq;const sel=new Set(sq.map(p=>p.id));for(let ii=0;ii<sq.length;ii++)for(const c of bp[sq[ii].position]){if(sel.has(c.id))continue;const ns=[...sq];ns[ii]=c;const ee=evalSq(ns,cap,true,false);if(ee&&ee.objective>be.objective+1e-8){be=ee;bs=ns}}if(bs===sq)break;sq=bs;curE=be}if(cap>=2){let be=curE,bs=sq;const sel=new Set(sq.map(p=>p.id));for(let i=0;i<sq.length;i++)for(let j=i+1;j<sq.length;j++){const ai=bp[sq[i].position].filter((p:any)=>!sel.has(p.id)).slice(0,8),aj=bp[sq[j].position].filter((p:any)=>!sel.has(p.id)).slice(0,8);for(const a of ai)for(const b of aj){if(a.id===b.id)continue;const ns=[...sq];ns[i]=a;ns[j]=b;const ee=evalSq(ns,cap,true,false);if(ee&&ee.objective>be.objective+1e-8){be=ee;bs=ns}}}if(bs!==sq){sq=bs;curE=be}}return curE;
    })();if(e)scenarios.push({...e,maxTransfers:cap})}}
    scenarios.sort((a,b)=>b.objective-a.objective||a.transfersIn-b.transfersIn);const best=scenarios[0],gap=best.objective-roll.objective;
    const nearBest=scenarios.filter(x=>best.objective-x.objective<=err&&x.objective-roll.objective>=err);
    nearBest.sort((a,b)=>a.strategic.role_risk_slots-b.strategic.role_risk_slots||a.strategic.role_unknown_slots-b.strategic.role_unknown_slots||a.strategic.weak_slots_under_55_xmins-b.strategic.weak_slots_under_55_xmins||b.strategic.mean_min_xmins-a.strategic.mean_min_xmins||a.transfersIn-b.transfersIn||b.objective-a.objective);
    const roleControlled=nearBest[0]||best,recommended=gap>=err?roleControlled:roll;

    const freshAttempts:any[]=[];
    for(const profile of profiles){const seed=freshSeedProfile(profile);if(seed){const e=improve(seed,99,false,false,3);if(e)freshAttempts.push({...e,profile:profile.name})}}
    if(!freshAttempts.length)return Response.json({ok:false,status:'FRESH_WILDCARD_SEARCH_FAILED'},{status:409});
    const dedup=new Map<string,any>();for(const x of freshAttempts){const k=x.squad.map((p:any)=>p.id).sort((a:number,b:number)=>a-b).join('-');const old=dedup.get(k);if(!old||x.objective>old.objective)dedup.set(k,x)}
    const ensemble=[...dedup.values()].sort((a,b)=>b.objective-a.objective);const rawWcBest=Math.max(...ensemble.map(x=>x.objective));
    ensemble.sort((a,b)=>{const da=rawWcBest-a.objective,db=rawWcBest-b.objective;if(da<=err&&db<=err)return a.strategic.role_risk_slots-b.strategic.role_risk_slots||a.strategic.role_unknown_slots-b.strategic.role_unknown_slots||a.strategic.weak_slots_under_55_xmins-b.strategic.weak_slots_under_55_xmins||b.strategic.mean_min_xmins-a.strategic.mean_min_xmins||b.strategic.itb_tenths-a.strategic.itb_tenths||b.objective-a.objective;return b.objective-a.objective});
    const wildcard=ensemble[0],wcGainBest=wildcard.objective-recommended.objective,wcGainRoll=wildcard.objective-roll.objective,wcClass=wcGainBest<err?'NO_MEANINGFUL_EDGE_VS_BEST_NO_CHIP':wildcard.transfersIn<=ft+1?'REACHABLE_WITH_NORMAL_TRANSFERS':(wcGainBest>=Math.max(4,2*err)&&wildcard.transfersIn>=4?'STRUCTURAL_WILDCARD_CANDIDATE':'DEFER_WILDCARD_EDGE_INSUFFICIENT');
    const bestIds=new Set(wildcard.squad.map((p:any)=>p.id));
    const ensembleSer:any[]=ensemble.map((x:any)=>{const s=ser({...x,maxTransfers:x.transfersIn}),overlap=x.squad.filter((p:any)=>bestIds.has(p.id)).length,fam=familySig(x);return{profile:x.profile,family_signature:fam,objective:s.objective,gap_to_raw_best:+(rawWcBest-x.objective).toFixed(3),equivalent_to_raw_best:(rawWcBest-x.objective)<=err,core_overlap_with_raw_best:overlap,...s}});
    const familyBest:any={};for(const x of ensembleSer){const f=x.family_signature;if(!familyBest[f]||x.objective>familyBest[f].objective)familyBest[f]={objective:x.objective,profile:x.profile}}for(const x of ensembleSer){x.gap_to_family_best=+(familyBest[x.family_signature].objective-x.objective).toFixed(3);x.equivalent_within_family=x.gap_to_family_best<=err}
    const wcSer={...ser({...wildcard,maxTransfers:wildcard.transfersIn}),scenario:'WILDCARD_IDEAL_FRESH',transfer_cost_points:0,objective_gain_vs_best_no_chip:+wcGainBest.toFixed(3),changes_required:wildcard.transfersIn,classification:wcClass,search_independent_of_current_squad:true,profile:wildcard.profile,family_signature:familySig(wildcard)};

    return Response.json({ok:true,status:'OPTIMIZED_READ_ONLY',optimizer_version:OPTIMIZER_VERSION,constraint_version:CONSTRAINT_VERSION,decisioning:false,writes_manager_plan:false,model_version:mv.version,gameweek:gw,horizon:h,gws,weights,manager_state_id:ms.id,bank_tenths:N(ms.bank_tenths),squad_liquidation_value_tenths:derivedLiq,budget_tenths:budget,bench_weight:benchW,free_transfers:ft,source_pool_count:pool.length,xmins_top_n:300,explosive_exception_count:ex.length,candidate_counts:Object.fromEntries(POS.map(p=>[p,bp[p].length])),prediction_rows_loaded:preds.length,role_rows_loaded:roleRows.length,prediction_runs:gws.map(g=>({gameweek:g,run_id:latest.get(g).id,generated_at:latest.get(g).generated_at})),roll:ser({...roll,maxTransfers:0}),transfer_scenarios:scenarios.map(ser),best_uncontrolled:ser(best),role_controlled_best:ser(roleControlled),recommended_by_noise_gate:ser(recommended),wildcard_benchmark:wcSer,wildcard_incremental_edge_vs_best_no_chip:+wcGainBest.toFixed(3),wildcard_classification:wcClass,objective_gap_best_vs_roll:+gap.toFixed(3),model_error_margin_points:err,edge_classification:gap>=err?'ROBUST_VS_ROLL_WITHIN_SEARCH':'NO_MEANINGFUL_EDGE_VS_ROLL',fresh_ensemble:ensembleSer,ensemble_policy:{requested_profile:requestedProfile,profile_only:profileOnly,profiles:profiles.map(p=>p.name),generic_anchor_rules:true,hard_coded_player_names:false,deduplicated_squads:ensemble.length,equivalence_band_points:err,family_signature:'premium FWD count >=9m / premium MID count >=9m / premium DEF count >=7m',false_precision_prohibited:true},constraints:{positions:NEED,max_per_club:3,budget_tenths:budget,missing_data_is_not_zero:true,exact_target_gw_role_state_required:true},role_control_policy:{numeric_role_points_adjustment:false,role_is_decision_control_not_projection_multiplier:true,near_equal_band_points:err,control_role_risk_definition:'FPL MID/FWD, non-primary-penalty taker, CONTROL_DEFENSIVE role in >=50% of exact-GW role snapshots with confidence >=0.70',near_equal_tiebreak:['fewer role-risk slots','fewer unknown-role slots','fewer weak xMins slots','higher minimum-minutes durability','fewer transfers','higher objective']},chip_policy:{wildcard_search_always_run:true,wildcard_search_seeded_independently_of_current_squad:true,wildcard_does_not_consume_banked_free_transfers:true,wildcard_is_scarce_asset_and_not_auto_recommended_from_raw_gain:true,first_half_wildcard_expiry:'GW19 deadline',only_one_chip_per_gameweek:true},strategic_policy:{primary_numeric_horizon_gameweeks:h,near_equal_fresh_squads_tiebreak:['fewer role-risk slots','fewer unknown-role slots','fewer weak xMins slots','higher minimum-minutes durability','more ITB flexibility'],captaincy_and_bench_in_objective:true,future_transfer_burden_exposed_as_changes_required:true},notes:['Exact target-GW role snapshots are required for every optimized GW; cross-GW role fallback is not accepted.','Role awareness does not alter expected points. It only resolves structures already inside the model-error band.','Fresh ensemble uses generic structural profiles, not hard-coded player identities.','Read-only: cannot save or authorize an FPL decision.']});
  } catch(e) {
    return Response.json({ok:false,error:e instanceof Error?e.message:String(e),decisioning:false},{status:500});
  }
});