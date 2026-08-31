import { createClient } from 'supabase';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};

const n=(v:any)=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const truthy=(v:any)=>v===true||v==='true';
const pctRank=(vals:number[],v:number|null,invert=false)=>{
  if(v==null||!vals.length)return null;
  const clean=vals.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!clean.length)return null;
  const rank=clean.filter(x=>x<=v).length/clean.length;
  return invert?1-rank:rank;
};
const band=(p:number|null)=>p==null?'UNRESOLVED':p>=.75?'STRONG':p<=.25?'WEAK':'AVERAGE';
const omitUnavailableTransfer=(x:any)=>{
  const s=String(x?.news||'').toLowerCase();
  return x?.availability_status==='UNAVAILABLE'&&(s.includes('joined ')||s.includes('departed')||s.includes('loan')||s.includes('free agent')||s.includes('returned to'));
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),requestedGw=Number(u.searchParams.get('gw')||0);
    const teamId=Number(u.searchParams.get('team_id')||0),playerId=Number(u.searchParams.get('player_id')||0),matchId=Number(u.searchParams.get('match_id')||0);
    if(!teamId&&!playerId&&!matchId)throw new Error('Provide team_id, player_id, or match_id');

    const {data:runs,error:re}=await sb.from('gameweek_prediction_runs')
      .select('id,gameweek,generated_at,model_version_id,frozen')
      .eq('frozen',true).order('gameweek',{ascending:true}).order('generated_at',{ascending:false});
    if(re)throw re;if(!runs?.length)throw new Error('No frozen prediction runs');
    const gw=requestedGw>=1&&requestedGw<=38?requestedGw:Math.max(...runs.map((r:any)=>Number(r.gameweek)));
    const run=(runs||[]).filter((r:any)=>Number(r.gameweek)===gw).sort((a:any,b:any)=>new Date(b.generated_at).getTime()-new Date(a.generated_at).getTime())[0];
    if(!run)throw new Error(`No frozen snapshot for GW${gw}`);
    const cutoff=run.generated_at;

    const [{data:teams},{data:players},{data:allPerf},{data:allTactics},{data:gwMatches},{data:preds}]=await Promise.all([
      sb.from('teams').select('id,name,short_name'),
      sb.from('players').select('id,web_name,position,team_id,now_cost,selected_by_percent,penalties_order,direct_freekicks_order,corners_and_indirect_freekicks_order,status,news'),
      sb.from('current_season_team_performance_states').select('*').lte('as_of',cutoff).order('as_of',{ascending:false}),
      sb.from('current_team_tactical_profiles').select('*').lte('observed_at',cutoff).order('observed_at',{ascending:false}),
      sb.from('matches').select('id,fpl_fixture_id,gameweek,home_team_id,away_team_id,kickoff_time,home_score,away_score,finished,home_xg,away_xg,home_big_chances,away_big_chances,home_possession,away_possession').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('model_predictions').select('player_id,expected_points,expected_minutes,p_start,p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_goal,p_assist,p_clean_sheet,p_dc,p_bonus,confidence,features').eq('prediction_run_id',run.id)
    ]);
    const tm=new Map((teams||[]).map((x:any)=>[Number(x.id),x]));
    const pm=new Map((players||[]).map((x:any)=>[Number(x.id),x]));
    const predBy=new Map((preds||[]).map((x:any)=>[Number(x.player_id),x]));
    const perfBy=new Map<number,any>();for(const x of allPerf||[]){if(!perfBy.has(Number(x.team_id)))perfBy.set(Number(x.team_id),x)}
    const tacticBy=new Map<number,any>();for(const x of allTactics||[]){if(!tacticBy.has(Number(x.team_id)))tacticBy.set(Number(x.team_id),x)}

    const perfVals={
      attack:[...perfBy.values()].map((x:any)=>n(x.blended_xg_for_90)).filter((x:any)=>x!=null),
      defence:[...perfBy.values()].map((x:any)=>n(x.blended_xg_against_90)).filter((x:any)=>x!=null),
      possession:[...perfBy.values()].map((x:any)=>n(x.current_possession)).filter((x:any)=>x!=null)
    };
    const tacticVals={
      setPiece:[...tacticBy.values()].map((x:any)=>n(x.set_piece_score)).filter((x:any)=>x!=null),
      control:[...tacticBy.values()].map((x:any)=>n(x.possession_control_score)).filter((x:any)=>x!=null),
      direct:[...tacticBy.values()].map((x:any)=>n(x.directness_score)).filter((x:any)=>x!=null),
      width:[...tacticBy.values()].map((x:any)=>n(x.width_score)).filter((x:any)=>x!=null),
      box:[...tacticBy.values()].map((x:any)=>n(x.box_pressure_score)).filter((x:any)=>x!=null)
    };

    async function priorForm(tid:number){
      const {data:ms}=await sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id,home_score,away_score,finished,home_xg,away_xg')
        .eq('source','fpl').eq('finished',true).lt('gameweek',gw).or(`home_team_id.eq.${tid},away_team_id.eq.${tid}`).order('kickoff_time',{ascending:false}).limit(5);
      const rows=(ms||[]).map((m:any)=>{
        const home=Number(m.home_team_id)===tid,opp=tm.get(Number(home?m.away_team_id:m.home_team_id));
        const gf=Number(home?m.home_score:m.away_score),ga=Number(home?m.away_score:m.home_score),xgf=n(home?m.home_xg:m.away_xg),xga=n(home?m.away_xg:m.home_xg);
        return {match_id:Number(m.id),gameweek:Number(m.gameweek),kickoff_time:m.kickoff_time,opponent:opp?.name||null,venue:home?'H':'A',goals_for:gf,goals_against:ga,result:gf>ga?'W':gf<ga?'L':'D',xg_for:xgf,xg_against:xga};
      });
      const totals=rows.reduce((z:any,x:any)=>({played:z.played+1,w:z.w+(x.result==='W'?1:0),d:z.d+(x.result==='D'?1:0),l:z.l+(x.result==='L'?1:0),gf:z.gf+x.goals_for,ga:z.ga+x.goals_against,cs:z.cs+(x.goals_against===0?1:0)}),{played:0,w:0,d:0,l:0,gf:0,ga:0,cs:0});
      return {matches:rows,totals};
    }

    function profile(tid:number){
      const perf=perfBy.get(tid)||null,tac=tacticBy.get(tid)||null;
      const ratings={
        attack:band(pctRank(perfVals.attack,n(perf?.blended_xg_for_90))),
        defence:band(pctRank(perfVals.defence,n(perf?.blended_xg_against_90),true)),
        possession:band(pctRank(perfVals.possession,n(perf?.current_possession))),
        set_piece:band(pctRank(tacticVals.setPiece,n(tac?.set_piece_score))),
        control:band(pctRank(tacticVals.control,n(tac?.possession_control_score))),
        directness:band(pctRank(tacticVals.direct,n(tac?.directness_score))),
        width:band(pctRank(tacticVals.width,n(tac?.width_score))),
        box_occupation:band(pctRank(tacticVals.box,n(tac?.box_pressure_score)))
      };
      const labelled=[
        ['Attack',ratings.attack],['Defence',ratings.defence],['Possession',ratings.possession],['Set pieces',ratings.set_piece],['Control',ratings.control],['Directness',ratings.directness],['Width / delivery',ratings.width],['Box occupation',ratings.box_occupation]
      ];
      return {performance:perf,tactical:tac,ratings,strengths:labelled.filter(x=>x[1]==='STRONG').map(x=>x[0]).slice(0,3),weaknesses:labelled.filter(x=>x[1]==='WEAK').map(x=>x[0]).slice(0,3)};
    }

    async function availabilityForMatch(mid:number,tid:number){
      const [{data:a},{data:r}]=await Promise.all([
        sb.from('current_player_fixture_availability').select('*').eq('match_id',mid).eq('team_id',tid),
        sb.from('current_player_fixture_roles').select('*').eq('match_id',mid).eq('team_id',tid)
      ]);
      const roleBy=new Map((r||[]).map((x:any)=>[Number(x.player_id),x]));
      return (a||[]).map((x:any)=>{
        const p=pm.get(Number(x.player_id)),role=roleBy.get(Number(x.player_id)),pr=predBy.get(Number(x.player_id));
        const setPiece=Number(p?.penalties_order)===1||Number(p?.direct_freekicks_order)===1||Number(p?.corners_and_indirect_freekicks_order)===1;
        const start=n(x.base_start_probability)??n(pr?.p_start)??0,mins=n(x.base_expected_minutes)??n(pr?.expected_minutes)??0;
        const importance=Math.min(1,.55*start+.35*Math.min(1,mins/90)+(setPiece?.10:0));
        return {player_id:Number(x.player_id),name:p?.web_name||null,position:p?.position||null,status:x.availability_status,chance_of_playing:n(x.chance_of_playing),news:x.news||null,expected_xi:truthy(x.expected_xi),base_start_probability:n(x.base_start_probability),base_expected_minutes:n(x.base_expected_minutes),primary_role:role?.primary_role||null,secondary_role:role?.secondary_role||null,role_confidence:n(role?.confidence),penalties_order:n(p?.penalties_order),direct_freekicks_order:n(p?.direct_freekicks_order),corners_order:n(p?.corners_and_indirect_freekicks_order),importance};
      });
    }

    async function matchModel(mid:number){
      const {data:x}=await sb.from('fixture_prediction_snapshots').select('match_id,captured_at,home_lambda,away_lambda,top_scorelines,markets,confidence').eq('match_id',mid).eq('is_pre_kickoff',true).order('captured_at',{ascending:false}).limit(1).maybeSingle();
      return x||null;
    }

    async function matchupSignals(mid:number){
      const {data:x}=await sb.from('current_fixture_tactical_matchups').select('team_id,opponent_team_id,signal_family,signal_key,score_type,score,direction,confidence,data_coverage,evidence,model_effect_enabled').eq('match_id',mid).order('score',{ascending:false});
      return x||[];
    }

    async function buildTeam(tid:number){
      const t=tm.get(tid);if(!t)throw new Error('Unknown team');
      const fixture=(gwMatches||[]).find((m:any)=>Number(m.home_team_id)===tid||Number(m.away_team_id)===tid)||null;
      const form=await priorForm(tid),prof=profile(tid);
      let availability:any[]=[],signals:any[]=[],model:any=null,opponent:any=null;
      if(fixture){
        availability=await availabilityForMatch(Number(fixture.id),tid);
        signals=(await matchupSignals(Number(fixture.id))).filter((x:any)=>Number(x.team_id)===tid);
        model=await matchModel(Number(fixture.id));
        const oid=Number(fixture.home_team_id)===tid?Number(fixture.away_team_id):Number(fixture.home_team_id);opponent=tm.get(oid)||null;
      }
      const absences=availability.filter((x:any)=>!['AVAILABLE'].includes(String(x.status||'').toUpperCase())&&!omitUnavailableTransfer(x)).sort((a:any,b:any)=>b.importance-a.importance);
      return {team:{id:tid,name:t.name,short_name:t.short_name},gameweek:gw,cutoff,form,profile:prof,fixture:fixture?{match_id:Number(fixture.id),kickoff_time:fixture.kickoff_time,venue:Number(fixture.home_team_id)===tid?'H':'A',opponent}:null,absences,availability,matchup_signals:signals,fixture_model:model};
    }

    if(teamId){
      const detail=await buildTeam(teamId);
      return new Response(JSON.stringify({ok:true,mode:'team',...detail}),{headers:cors});
    }

    if(playerId){
      const p=pm.get(playerId);if(!p)throw new Error('Unknown player');
      const team=tm.get(Number(p.team_id));
      const fixture=(gwMatches||[]).find((m:any)=>Number(m.home_team_id)===Number(p.team_id)||Number(m.away_team_id)===Number(p.team_id))||null;
      const [{data:states},{data:roles}]=await Promise.all([
        sb.from('player_state').select('*').eq('player_id',playerId).lte('as_of',cutoff).order('as_of',{ascending:false}).limit(1),
        sb.from('current_player_role_profiles').select('*').eq('player_id',playerId).lte('observed_at',cutoff).order('observed_at',{ascending:false}).limit(1)
      ]);
      const state=states?.[0]||null,roleProfile=roles?.[0]||null,projection=predBy.get(playerId)||null;
      let availability:any=null,fixtureRole:any=null,model:any=null,signals:any[]=[];
      if(fixture){
        const av=await availabilityForMatch(Number(fixture.id),Number(p.team_id));availability=av.find((x:any)=>x.player_id===playerId)||null;
        const {data:fr}=await sb.from('current_player_fixture_roles').select('*').eq('match_id',fixture.id).eq('player_id',playerId).maybeSingle();fixtureRole=fr||null;
        model=await matchModel(Number(fixture.id));signals=(await matchupSignals(Number(fixture.id))).filter((x:any)=>Number(x.team_id)===Number(p.team_id));
      }
      const {data:rr}=await sb.from('gameweek_result_runs').select('id,gameweek,observed_at,is_final').lt('gameweek',gw).eq('is_final',true).order('gameweek',{ascending:false}).order('observed_at',{ascending:false});
      const latestRunByGw=new Map<number,any>();for(const x of rr||[]){if(!latestRunByGw.has(Number(x.gameweek)))latestRunByGw.set(Number(x.gameweek),x)}
      const runIds=[...latestRunByGw.values()].slice(0,5).map((x:any)=>Number(x.id));
      let recent:any[]=[];
      if(runIds.length){const {data:a}=await sb.from('player_gameweek_actuals').select('result_run_id,gameweek,minutes,starts,total_points,goals,assists,clean_sheets,bonus,bps,defensive_contribution,xg,xa,xgi,xgc').eq('player_id',playerId).in('result_run_id',runIds).order('gameweek',{ascending:false});recent=a||[]}
      const season=recent.reduce((z:any,x:any)=>({minutes:z.minutes+Number(x.minutes||0),points:z.points+Number(x.total_points||0),goals:z.goals+Number(x.goals||0),assists:z.assists+Number(x.assists||0),xg:z.xg+Number(x.xg||0),xa:z.xa+Number(x.xa||0),bonus:z.bonus+Number(x.bonus||0),dc:z.dc+Number(x.defensive_contribution||0)}),{minutes:0,points:0,goals:0,assists:0,xg:0,xa:0,bonus:0,dc:0});
      const oid=fixture?(Number(fixture.home_team_id)===Number(p.team_id)?Number(fixture.away_team_id):Number(fixture.home_team_id)):null;
      return new Response(JSON.stringify({ok:true,mode:'player',gameweek:gw,cutoff,player:{id:playerId,name:p.web_name,position:p.position,team_id:Number(p.team_id),team:team?.name||null,price:n(p.now_cost)!=null?Number(p.now_cost)/10:null,ownership:n(p.selected_by_percent),status:p.status,news:p.news,penalties_order:n(p.penalties_order),direct_freekicks_order:n(p.direct_freekicks_order),corners_order:n(p.corners_and_indirect_freekicks_order)},projection,state,role_profile:roleProfile,availability,fixture_role:fixtureRole,recent,season,fixture:fixture?{match_id:Number(fixture.id),kickoff_time:fixture.kickoff_time,venue:Number(fixture.home_team_id)===Number(p.team_id)?'H':'A',opponent:oid?tm.get(oid)||null:null}:null,fixture_model:model,matchup_signals:signals,team_profile:profile(Number(p.team_id))}),{headers:cors});
    }

    if(matchId){
      const m=(gwMatches||[]).find((x:any)=>Number(x.id)===matchId);if(!m)throw new Error('Unknown match for selected gameweek');
      const homeId=Number(m.home_team_id),awayId=Number(m.away_team_id);
      const [home,away,model,signals,homeAv,awayAv]=await Promise.all([buildTeam(homeId),buildTeam(awayId),matchModel(matchId),matchupSignals(matchId),availabilityForMatch(matchId,homeId),availabilityForMatch(matchId,awayId)]);
      const topPlayers=(players||[]).filter((p:any)=>[homeId,awayId].includes(Number(p.team_id))).map((p:any)=>{const pr=predBy.get(Number(p.id));return pr?{id:Number(p.id),name:p.web_name,team:tm.get(Number(p.team_id))?.name||null,position:p.position,expected_points:n(pr.expected_points),expected_minutes:n(pr.expected_minutes),p_goal:n(pr.p_goal),p_assist:n(pr.p_assist),p_10_plus:n(pr.p_10_plus)}:null}).filter(Boolean).sort((a:any,b:any)=>(b.expected_points||0)-(a.expected_points||0)).slice(0,6);
      const cleanAbs=(xs:any[])=>xs.filter((x:any)=>!['AVAILABLE'].includes(String(x.status||'').toUpperCase())&&!omitUnavailableTransfer(x)).sort((a:any,b:any)=>b.importance-a.importance).slice(0,5);
      return new Response(JSON.stringify({ok:true,mode:'fixture',gameweek:gw,cutoff,match:{id:matchId,kickoff_time:m.kickoff_time,home:tm.get(homeId),away:tm.get(awayId)},model,signals,home:{profile:home.profile,form:home.form,absences:cleanAbs(homeAv)},away:{profile:away.profile,form:away.form,absences:cleanAbs(awayAv)},top_players:topPlayers}),{headers:cors});
    }

    throw new Error('Unsupported request');
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
