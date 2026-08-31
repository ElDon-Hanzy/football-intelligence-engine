import { createClient } from 'supabase';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};
const num=(v:any)=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const band=(x:number|null)=>x==null?'UNRESOLVED':x>=.75?'STRONG':x<=.25?'WEAK':'AVERAGE';
const percentile=(vals:number[],value:number|null,invert=false)=>{
  if(value==null||!vals.length)return null;
  const v=vals.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return null;
  const p=v.filter(x=>x<=value).length/v.length;return invert?1-p:p;
};
const transferExit=(x:any)=>{
  const s=String(x?.news||'').toLowerCase();
  return String(x?.availability_status||'').toUpperCase()==='UNAVAILABLE'&&(s.includes('joined ')||s.includes('loan')||s.includes('departed')||s.includes('free agent')||s.includes('returned to'));
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

    const {data:runs,error:runErr}=await sb.from('gameweek_prediction_runs').select('id,gameweek,generated_at').eq('frozen',true).order('gameweek',{ascending:true}).order('generated_at',{ascending:false});
    if(runErr)throw runErr;if(!runs?.length)throw new Error('No frozen prediction runs');
    const gw=requestedGw>=1&&requestedGw<=38?requestedGw:Math.max(...runs.map((x:any)=>Number(x.gameweek)));
    const run=(runs||[]).filter((x:any)=>Number(x.gameweek)===gw).sort((a:any,b:any)=>new Date(b.generated_at).getTime()-new Date(a.generated_at).getTime())[0];
    if(!run)throw new Error(`No frozen snapshot for GW${gw}`);
    const cutoff=run.generated_at;

    const [{data:teams},{data:players},{data:preds},{data:perfRows},{data:tacticRows},{data:gwMatches}]=await Promise.all([
      sb.from('teams').select('id,name,short_name'),
      sb.from('players').select('id,web_name,position,team_id,now_cost,selected_by_percent,penalties_order,direct_freekicks_order,corners_and_indirect_freekicks_order,status,news'),
      sb.from('model_predictions').select('player_id,expected_points,expected_minutes,p_start,p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_goal,p_assist,p_clean_sheet,p_dc,p_bonus,confidence').eq('prediction_run_id',run.id),
      sb.from('current_season_team_performance_states').select('*').lte('as_of',cutoff).order('as_of',{ascending:false}),
      sb.from('current_team_tactical_profiles').select('*').lte('observed_at',cutoff).order('observed_at',{ascending:false}),
      sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id,home_score,away_score,finished,home_xg,away_xg').eq('source','fpl').eq('gameweek',gw).order('kickoff_time')
    ]);
    const teamMap=new Map((teams||[]).map((x:any)=>[Number(x.id),x]));
    const playerMap=new Map((players||[]).map((x:any)=>[Number(x.id),x]));
    const predMap=new Map((preds||[]).map((x:any)=>[Number(x.player_id),x]));
    const perfMap=new Map<number,any>();for(const x of perfRows||[]){if(!perfMap.has(Number(x.team_id)))perfMap.set(Number(x.team_id),x)}
    const tacticMap=new Map<number,any>();for(const x of tacticRows||[]){if(!tacticMap.has(Number(x.team_id)))tacticMap.set(Number(x.team_id),x)}
    const attackVals=[...perfMap.values()].map((x:any)=>num(x.blended_xg_for_90)).filter((x:any)=>x!=null);
    const defenceVals=[...perfMap.values()].map((x:any)=>num(x.blended_xg_against_90)).filter((x:any)=>x!=null);
    const possessionVals=[...perfMap.values()].map((x:any)=>num(x.current_possession)).filter((x:any)=>x!=null);
    const setPieceVals=[...tacticMap.values()].map((x:any)=>num(x.set_piece_score)).filter((x:any)=>x!=null);
    const controlVals=[...tacticMap.values()].map((x:any)=>num(x.possession_control_score)).filter((x:any)=>x!=null);
    const widthVals=[...tacticMap.values()].map((x:any)=>num(x.width_score)).filter((x:any)=>x!=null);
    const boxVals=[...tacticMap.values()].map((x:any)=>num(x.box_pressure_score)).filter((x:any)=>x!=null);

    const fixtureForTeam=(tid:number)=>(gwMatches||[]).find((m:any)=>Number(m.home_team_id)===tid||Number(m.away_team_id)===tid)||null;
    const teamProfile=(tid:number)=>{
      const perf=perfMap.get(tid)||null,tactical=tacticMap.get(tid)||null;
      const ratings={
        attack:band(percentile(attackVals,num(perf?.blended_xg_for_90))),
        defence:band(percentile(defenceVals,num(perf?.blended_xg_against_90),true)),
        possession:band(percentile(possessionVals,num(perf?.current_possession))),
        set_piece:band(percentile(setPieceVals,num(tactical?.set_piece_score))),
        control:band(percentile(controlVals,num(tactical?.possession_control_score))),
        width:band(percentile(widthVals,num(tactical?.width_score))),
        box_occupation:band(percentile(boxVals,num(tactical?.box_pressure_score)))
      };
      const items=[['Attack',ratings.attack],['Defence',ratings.defence],['Possession',ratings.possession],['Set pieces',ratings.set_piece],['Control',ratings.control],['Width / delivery',ratings.width],['Box occupation',ratings.box_occupation]];
      return {performance:perf,tactical,ratings,strengths:items.filter(x=>x[1]==='STRONG').map(x=>x[0]).slice(0,3),weaknesses:items.filter(x=>x[1]==='WEAK').map(x=>x[0]).slice(0,3)};
    };

    async function form(tid:number){
      const {data:rows}=await sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id,home_score,away_score,home_xg,away_xg').eq('source','fpl').eq('finished',true).lt('gameweek',gw).or(`home_team_id.eq.${tid},away_team_id.eq.${tid}`).order('kickoff_time',{ascending:false}).limit(5);
      const matches=(rows||[]).map((m:any)=>{
        const home=Number(m.home_team_id)===tid,opp=teamMap.get(Number(home?m.away_team_id:m.home_team_id));
        const gf=Number(home?m.home_score:m.away_score),ga=Number(home?m.away_score:m.home_score);
        return {match_id:Number(m.id),gameweek:Number(m.gameweek),kickoff_time:m.kickoff_time,opponent:opp?.name||null,venue:home?'H':'A',goals_for:gf,goals_against:ga,result:gf>ga?'W':gf<ga?'L':'D',xg_for:num(home?m.home_xg:m.away_xg),xg_against:num(home?m.away_xg:m.home_xg)};
      });
      const totals=matches.reduce((z:any,x:any)=>({played:z.played+1,w:z.w+(x.result==='W'?1:0),d:z.d+(x.result==='D'?1:0),l:z.l+(x.result==='L'?1:0),gf:z.gf+x.goals_for,ga:z.ga+x.goals_against,cs:z.cs+(x.goals_against===0?1:0)}),{played:0,w:0,d:0,l:0,gf:0,ga:0,cs:0});
      return {matches,totals};
    }

    async function availability(mid:number,tid:number){
      const [{data:a},{data:r}]=await Promise.all([
        sb.from('current_player_fixture_availability').select('*').eq('match_id',mid).eq('team_id',tid),
        sb.from('current_player_fixture_roles').select('*').eq('match_id',mid).eq('team_id',tid)
      ]);
      const roleMap=new Map((r||[]).map((x:any)=>[Number(x.player_id),x]));
      return (a||[]).map((x:any)=>{
        const p=playerMap.get(Number(x.player_id)),pr=predMap.get(Number(x.player_id)),role=roleMap.get(Number(x.player_id));
        const start=num(x.base_start_probability)??num(pr?.p_start)??0,mins=num(x.base_expected_minutes)??num(pr?.expected_minutes)??0;
        const setPiece=Number(p?.penalties_order)===1||Number(p?.direct_freekicks_order)===1||Number(p?.corners_and_indirect_freekicks_order)===1;
        const importance=Math.min(1,0.55*start+0.35*Math.min(1,mins/90)+(setPiece?0.10:0));
        return {player_id:Number(x.player_id),name:p?.web_name||null,position:p?.position||null,availability_status:x.availability_status,chance_of_playing:num(x.chance_of_playing),news:x.news||null,expected_xi:x.expected_xi===true,base_start_probability:num(x.base_start_probability),base_expected_minutes:num(x.base_expected_minutes),primary_role:role?.primary_role||null,secondary_role:role?.secondary_role||null,role_confidence:num(role?.confidence),penalties_order:num(p?.penalties_order),direct_freekicks_order:num(p?.direct_freekicks_order),corners_order:num(p?.corners_and_indirect_freekicks_order),importance};
      });
    }

    async function model(mid:number){
      const {data:x}=await sb.from('fixture_prediction_snapshots').select('captured_at,home_lambda,away_lambda,top_scorelines,markets,confidence').eq('match_id',mid).eq('is_pre_kickoff',true).order('captured_at',{ascending:false}).limit(1).maybeSingle();return x||null;
    }
    async function signals(mid:number){
      const {data:x}=await sb.from('current_fixture_tactical_matchups').select('team_id,opponent_team_id,signal_family,signal_key,score_type,score,direction,confidence,data_coverage,evidence,model_effect_enabled').eq('match_id',mid).order('score',{ascending:false});return x||[];
    }
    const meaningfulAbsences=(rows:any[])=>rows.filter((x:any)=>String(x.availability_status||'').toUpperCase()!=='AVAILABLE'&&!transferExit(x)).sort((a:any,b:any)=>b.importance-a.importance);

    async function teamDetail(tid:number){
      const team=teamMap.get(tid);if(!team)throw new Error('Unknown team');
      const fixture=fixtureForTeam(tid),recent=await form(tid),profile=teamProfile(tid);
      if(!fixture)return {team,gameweek:gw,cutoff,form:recent,profile,fixture:null,absences:[],matchup_signals:[],fixture_model:null};
      const oid=Number(fixture.home_team_id)===tid?Number(fixture.away_team_id):Number(fixture.home_team_id);
      const [av,sg,fx]=await Promise.all([availability(Number(fixture.id),tid),signals(Number(fixture.id)),model(Number(fixture.id))]);
      return {team,gameweek:gw,cutoff,form:recent,profile,fixture:{match_id:Number(fixture.id),kickoff_time:fixture.kickoff_time,venue:Number(fixture.home_team_id)===tid?'H':'A',opponent:teamMap.get(oid)||null},absences:meaningfulAbsences(av),matchup_signals:sg.filter((x:any)=>Number(x.team_id)===tid),fixture_model:fx};
    }

    if(teamId){return new Response(JSON.stringify({ok:true,mode:'team',...(await teamDetail(teamId))}),{headers:cors});}

    if(playerId){
      const p=playerMap.get(playerId);if(!p)throw new Error('Unknown player');
      const tid=Number(p.team_id),team=teamMap.get(tid),fixture=fixtureForTeam(tid),projection=predMap.get(playerId)||null;
      const [{data:stateRows},{data:roleRows}]=await Promise.all([
        sb.from('player_state').select('*').eq('player_id',playerId).lte('as_of',cutoff).order('as_of',{ascending:false}).limit(1),
        sb.from('current_player_role_profiles').select('*').eq('player_id',playerId).lte('observed_at',cutoff).order('observed_at',{ascending:false}).limit(1)
      ]);
      let av:any=null,fixtureRole:any=null,fxModel:any=null,sg:any[]=[];
      if(fixture){
        const all=await availability(Number(fixture.id),tid);av=all.find((x:any)=>x.player_id===playerId)||null;
        const {data:fr}=await sb.from('current_player_fixture_roles').select('*').eq('match_id',fixture.id).eq('player_id',playerId).maybeSingle();fixtureRole=fr||null;
        [fxModel,sg]=await Promise.all([model(Number(fixture.id)),signals(Number(fixture.id))]);sg=sg.filter((x:any)=>Number(x.team_id)===tid);
      }
      const {data:rr}=await sb.from('gameweek_result_runs').select('id,gameweek,observed_at,is_final').lt('gameweek',gw).eq('is_final',true).order('gameweek',{ascending:false}).order('observed_at',{ascending:false});
      const latest=new Map<number,any>();for(const x of rr||[]){if(!latest.has(Number(x.gameweek)))latest.set(Number(x.gameweek),x)}
      const ids=[...latest.values()].slice(0,5).map((x:any)=>Number(x.id));let recent:any[]=[];
      if(ids.length){const {data:a}=await sb.from('player_gameweek_actuals').select('gameweek,minutes,starts,total_points,goals,assists,clean_sheets,bonus,bps,defensive_contribution,xg,xa,xgi,xgc').eq('player_id',playerId).in('result_run_id',ids).order('gameweek',{ascending:false});recent=a||[]}
      const season=recent.reduce((z:any,x:any)=>({minutes:z.minutes+Number(x.minutes||0),points:z.points+Number(x.total_points||0),goals:z.goals+Number(x.goals||0),assists:z.assists+Number(x.assists||0),xg:z.xg+Number(x.xg||0),xa:z.xa+Number(x.xa||0),bonus:z.bonus+Number(x.bonus||0),dc:z.dc+Number(x.defensive_contribution||0)}),{minutes:0,points:0,goals:0,assists:0,xg:0,xa:0,bonus:0,dc:0});
      const oid=fixture?(Number(fixture.home_team_id)===tid?Number(fixture.away_team_id):Number(fixture.home_team_id)):null;
      const payload={ok:true,mode:'player',gameweek:gw,cutoff,player:{id:playerId,name:p.web_name,position:p.position,team_id:tid,team:team?.name||null,price:num(p.now_cost)!=null?Number(p.now_cost)/10:null,ownership:num(p.selected_by_percent),status:p.status,news:p.news,penalties_order:num(p.penalties_order),direct_freekicks_order:num(p.direct_freekicks_order),corners_order:num(p.corners_and_indirect_freekicks_order)},projection,state:stateRows?.[0]||null,role_profile:roleRows?.[0]||null,availability:av,fixture_role:fixtureRole,recent,season,fixture:fixture?{match_id:Number(fixture.id),kickoff_time:fixture.kickoff_time,venue:Number(fixture.home_team_id)===tid?'H':'A',opponent:oid?teamMap.get(oid)||null:null}:null,fixture_model:fxModel,matchup_signals:sg,team_profile:teamProfile(tid)};
      return new Response(JSON.stringify(payload),{headers:cors});
    }

    if(matchId){
      const m=(gwMatches||[]).find((x:any)=>Number(x.id)===matchId);if(!m)throw new Error('Unknown match for selected gameweek');
      const hid=Number(m.home_team_id),aid=Number(m.away_team_id);
      const [home,away,fxModel,sg,hav,aav]=await Promise.all([teamDetail(hid),teamDetail(aid),model(matchId),signals(matchId),availability(matchId,hid),availability(matchId,aid)]);
      const top=(players||[]).filter((p:any)=>[hid,aid].includes(Number(p.team_id))).map((p:any)=>{const pr=predMap.get(Number(p.id));return pr?{id:Number(p.id),name:p.web_name,team:teamMap.get(Number(p.team_id))?.name||null,position:p.position,expected_points:num(pr.expected_points),expected_minutes:num(pr.expected_minutes),p_goal:num(pr.p_goal),p_assist:num(pr.p_assist),p_10_plus:num(pr.p_10_plus)}:null}).filter(Boolean).sort((a:any,b:any)=>(b.expected_points||0)-(a.expected_points||0)).slice(0,6);
      const payload={ok:true,mode:'fixture',gameweek:gw,cutoff,match:{id:matchId,kickoff_time:m.kickoff_time,home:teamMap.get(hid),away:teamMap.get(aid)},model:fxModel,signals:sg,home:{profile:home.profile,form:home.form,absences:meaningfulAbsences(hav).slice(0,5)},away:{profile:away.profile,form:away.form,absences:meaningfulAbsences(aav).slice(0,5)},top_players:top};
      return new Response(JSON.stringify(payload),{headers:cors});
    }
    throw new Error('Unsupported request');
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
