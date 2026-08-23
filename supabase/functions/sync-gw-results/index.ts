import { createClient } from 'supabase';

const n=(v:any)=>v===undefined||v===null||v===''?null:Number(v);
const i=(v:any)=>{const x=n(v);return x===null?null:Math.round(x)};
async function hashText(s:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}

Deno.serve(async(req)=>{try{
  const u=new URL(req.url);let gw=Number(u.searchParams.get('gw')||0);
  if(!gw){
    const br=await fetch('https://fantasy.premierleague.com/api/bootstrap-static/',{headers:{'User-Agent':'FootballIntelligence/0.2'}});
    if(!br.ok)throw new Error(`FPL bootstrap ${br.status}`);
    const b=await br.json(),now=Date.now();
    const current=(b.events||[]).find((e:any)=>e.is_current)||[...(b.events||[])].filter((e:any)=>new Date(e.deadline_time).getTime()<=now&&!e.finished).sort((a:any,b:any)=>new Date(b.deadline_time).getTime()-new Date(a.deadline_time).getTime())[0]||[...(b.events||[])].filter((e:any)=>new Date(e.deadline_time).getTime()<=now).sort((a:any,b:any)=>b.id-a.id)[0];
    gw=Number(current?.id||1)
  }
  gw=Math.max(1,Math.min(38,gw));

  const [lr,fr]=await Promise.all([
    fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`,{headers:{'User-Agent':'FootballIntelligence/0.2'}}),
    fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`,{headers:{'User-Agent':'FootballIntelligence/0.2'}})
  ]);
  if(!lr.ok)throw new Error(`FPL live ${lr.status}`);
  if(!fr.ok)throw new Error(`FPL fixtures ${fr.status}`);
  const live=await lr.json(),fixtures=await fr.json();
  const payloadHash=await hashText(JSON.stringify({elements:live.elements,fixtures}));
  const finishedFixtureIds=(fixtures||[]).filter((f:any)=>f.finished===true||f.finished_provisional===true).map((f:any)=>Number(f.id));

  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)throw new Error('Missing Supabase service credential');
  const base=Deno.env.get('SUPABASE_URL')!,sb=createClient(base,key,{auth:{persistSession:false}});

  const {data:dbMatches,error:me}=await sb.from('matches').select('id,fpl_fixture_id').eq('source','fpl').eq('gameweek',gw);
  if(me)throw me;
  const matchByFixture=new Map((dbMatches||[]).map((m:any)=>[Number(m.fpl_fixture_id),Number(m.id)]));
  const updatedAt=new Date().toISOString();
  for(const f of fixtures||[]){
    const matchId=matchByFixture.get(Number(f.id));
    if(!matchId)continue;
    const {error}=await sb.from('matches').update({
      home_score:i(f.team_h_score),away_score:i(f.team_a_score),
      finished:Boolean(f.finished===true||f.finished_provisional===true),raw:f,updated_at:updatedAt
    }).eq('id',matchId);
    if(error)throw error;
  }

  const {data:last,error:le}=await sb.from('gameweek_result_runs').select('id,metadata').eq('gameweek',gw).eq('source','official_fpl').order('observed_at',{ascending:false}).limit(1).maybeSingle();
  if(le)throw le;
  if(last?.metadata?.payload_hash===payloadHash&&Array.isArray(last?.metadata?.finished_fixture_ids)){
    return Response.json({ok:true,gameweek:gw,unchanged:true,result_run_id:last.id,finished_fixture_ids:finishedFixtureIds,matches_reconciled:(dbMatches||[]).length});
  }

  const isFinal=fixtures.length>0&&fixtures.every((f:any)=>f.finished===true||f.finished_provisional===true);
  const {data:run,error:re}=await sb.from('gameweek_result_runs').insert({gameweek:gw,source:'official_fpl',is_final:isFinal,metadata:{payload_hash:payloadHash,fixture_count:fixtures.length,finished_fixtures:finishedFixtureIds.length,finished_fixture_ids:finishedFixtureIds}}).select('id').single();
  if(re)throw re;
  const {data:players,error:pe}=await sb.from('players').select('id,fpl_player_id');
  if(pe)throw pe;
  const pm=new Map((players||[]).map((p:any)=>[Number(p.fpl_player_id),p.id])),rows:any[]=[];
  for(const e of(live.elements||[])){
    const pid=pm.get(Number(e.id));if(!pid)continue;
    const s=e.stats||{},ex=e.explain||[],fixtureIds=ex.map((x:any)=>Number(x.fixture)).filter((x:number)=>Number.isFinite(x));
    rows.push({result_run_id:run.id,gameweek:gw,player_id:pid,fixture_ids:fixtureIds,minutes:i(s.minutes),starts:i(s.starts),total_points:i(s.total_points),goals:i(s.goals_scored),assists:i(s.assists),clean_sheets:i(s.clean_sheets),goals_conceded:i(s.goals_conceded),saves:i(s.saves),bonus:i(s.bonus),bps:i(s.bps),defensive_contribution:i(s.defensive_contribution),xg:n(s.expected_goals),xa:n(s.expected_assists),xgi:n(s.expected_goal_involvements),xgc:n(s.expected_goals_conceded),yellow_cards:i(s.yellow_cards),red_cards:i(s.red_cards),own_goals:i(s.own_goals),penalties_missed:i(s.penalties_missed),penalties_saved:i(s.penalties_saved),raw:{stats:s,explain:ex}})
  }
  for(let k=0;k<rows.length;k+=200){const {error}=await sb.from('player_gameweek_actuals').insert(rows.slice(k,k+200));if(error)throw error}
  try{await fetch(`${base}/functions/v1/audit-gw?gw=${gw}`,{headers:{'User-Agent':'FootballIntelligence/0.2'}})}catch(_){/* audit can retry later */}
  return Response.json({ok:true,gameweek:gw,result_run_id:run.id,is_final:isFinal,players:rows.length,fixture_count:fixtures.length,finished_fixture_ids:finishedFixtureIds,matches_reconciled:(dbMatches||[]).length});
}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500})}});
