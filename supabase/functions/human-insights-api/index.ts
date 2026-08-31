import { createClient } from 'supabase';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};

const n=(v:any)=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const pct=(v:any)=>n(v)==null?null:Number(v);

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),requested=Number(u.searchParams.get('gw')||0);

    const {data:runs,error:re}=await sb.from('gameweek_prediction_runs')
      .select('id,gameweek,generated_at,model_version_id,frozen')
      .eq('frozen',true)
      .order('gameweek',{ascending:true})
      .order('generated_at',{ascending:false});
    if(re)throw re;if(!runs?.length)throw new Error('No frozen prediction runs');
    const gw=requested>=1&&requested<=38?requested:Math.max(...runs.map((r:any)=>Number(r.gameweek)));
    const run=(runs||[]).filter((r:any)=>Number(r.gameweek)===gw).sort((a:any,b:any)=>new Date(b.generated_at).getTime()-new Date(a.generated_at).getTime())[0];
    if(!run)throw new Error(`No frozen snapshot for GW${gw}`);

    const [{data:mv},{data:preds},{data:players},{data:teams},{data:matches},{data:fxPreds},{data:plan}]=await Promise.all([
      sb.from('model_versions').select('version').eq('id',run.model_version_id).maybeSingle(),
      sb.from('model_predictions').select('player_id,expected_points,expected_minutes,p_start,p_goal,p_assist,p_blank,p_10_plus,p_15_plus,p_20_plus,p_dc,p_bonus').eq('prediction_run_id',run.id),
      sb.from('players').select('id,web_name,position,team_id,now_cost,selected_by_percent,penalties_order,direct_freekicks_order,corners_and_indirect_freekicks_order'),
      sb.from('teams').select('id,name,short_name'),
      sb.from('matches').select('id,gameweek,home_team_id,away_team_id,kickoff_time,home_score,away_score,finished').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('fixture_prediction_snapshots').select('match_id,captured_at,home_lambda,away_lambda,top_scorelines,markets,confidence').eq('gameweek',gw).eq('is_pre_kickoff',true).order('captured_at',{ascending:false}),
      sb.from('fpl_manager_plans').select('*').eq('gameweek',gw).order('captured_at',{ascending:false}).limit(1).maybeSingle()
    ]);

    const tm=new Map((teams||[]).map((x:any)=>[Number(x.id),x]));
    const pm=new Map((players||[]).map((x:any)=>[Number(x.id),x]));
    const rows=(preds||[]).map((pr:any)=>{
      const p=pm.get(Number(pr.player_id)),t=p?tm.get(Number(p.team_id)):null;
      if(!p)return null;
      return {
        id:Number(p.id),name:p.web_name,position:p.position,team:t?.name||null,team_short:t?.short_name||null,
        price:n(p.now_cost)!=null?Number(p.now_cost)/10:null,ownership:n(p.selected_by_percent),
        penalties_order:n(p.penalties_order),direct_freekicks_order:n(p.direct_freekicks_order),corners_order:n(p.corners_and_indirect_freekicks_order),
        expected_points:n(pr.expected_points),expected_minutes:n(pr.expected_minutes),p_start:pct(pr.p_start),p_goal:pct(pr.p_goal),p_assist:pct(pr.p_assist),p_blank:pct(pr.p_blank),p_10_plus:pct(pr.p_10_plus),p_15_plus:pct(pr.p_15_plus),p_20_plus:pct(pr.p_20_plus),p_dc:pct(pr.p_dc),p_bonus:pct(pr.p_bonus)
      };
    }).filter(Boolean);

    const captainBase=rows.filter((x:any)=>['MID','FWD'].includes(String(x.position))&&(x.expected_minutes||0)>=60&&(x.p_start==null||x.p_start>=0.55))
      .sort((a:any,b:any)=>(b.expected_points||0)-(a.expected_points||0)||(b.p_10_plus||0)-(a.p_10_plus||0)).slice(0,12);
    const capIds=captainBase.map((x:any)=>x.id);
    const {data:states}=capIds.length?await sb.from('player_state')
      .select('player_id,as_of,xg90,xa90,xgi90,role,start_probability,expected_minutes')
      .in('player_id',capIds).lte('as_of',run.generated_at).order('as_of',{ascending:false}):{data:[]};
    const stateBy=new Map<number,any>();for(const s of states||[]){if(!stateBy.has(Number(s.player_id)))stateBy.set(Number(s.player_id),s)}
    const captain_candidates=captainBase.slice(0,4).map((x:any)=>{
      const s=stateBy.get(x.id),mins=x.expected_minutes||0;
      const xg90=n(s?.xg90),xa90=n(s?.xa90);
      return {...x,role:s?.role||null,xg:xg90==null?null:xg90*mins/90,xa:xa90==null?null:xa90*mins/90};
    });
    const top_players=[...rows].sort((a:any,b:any)=>(b.expected_points||0)-(a.expected_points||0)).slice(0,10);

    const latestFx=new Map<number,any>();for(const f of fxPreds||[]){if(!latestFx.has(Number(f.match_id)))latestFx.set(Number(f.match_id),f)}
    const fixture_models=(matches||[]).map((m:any)=>{
      const f=latestFx.get(Number(m.id));if(!f)return null;
      const home=tm.get(Number(m.home_team_id)),away=tm.get(Number(m.away_team_id));
      return {match_id:Number(m.id),home:home?.name||null,away:away?.name||null,kickoff_time:m.kickoff_time,home_lambda:n(f.home_lambda),away_lambda:n(f.away_lambda),top_scorelines:f.top_scorelines||[],markets:f.markets||{},confidence:n(f.confidence)};
    }).filter(Boolean);

    const favoriteRows:any[]=[];
    for(const f of fixture_models){
      const mk=f.markets||{};
      favoriteRows.push({match_id:f.match_id,team:f.home,opponent:f.away,venue:'home',prob:n(mk.home_win),team_lambda:f.home_lambda,opp_lambda:f.away_lambda});
      favoriteRows.push({match_id:f.match_id,team:f.away,opponent:f.home,venue:'away',prob:n(mk.away_win),team_lambda:f.away_lambda,opp_lambda:f.home_lambda});
    }
    const top_favorites=favoriteRows.filter(x=>x.prob!=null).sort((a,b)=>b.prob-a.prob).slice(0,3);
    const highest_total=[...fixture_models].sort((a:any,b:any)=>((b.home_lambda||0)+(b.away_lambda||0))-((a.home_lambda||0)+(a.away_lambda||0)))[0]||null;

    const exactOptions=fixture_models.map((f:any)=>{const x=Array.isArray(f.top_scorelines)?f.top_scorelines[0]:null;return x?{type:'Correct score',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:x.score,probability:n(x.prob??x.probability),home_lambda:f.home_lambda,away_lambda:f.away_lambda}:null}).filter(Boolean).sort((a:any,b:any)=>(b.probability||0)-(a.probability||0));
    const oneXtwo=fixture_models.flatMap((f:any)=>{
      const mk=f.markets||{};return [
        {type:'1X2',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:`${f.home} win`,probability:n(mk.home_win),home_lambda:f.home_lambda,away_lambda:f.away_lambda},
        {type:'1X2',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:'Draw',probability:n(mk.draw),home_lambda:f.home_lambda,away_lambda:f.away_lambda},
        {type:'1X2',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:`${f.away} win`,probability:n(mk.away_win),home_lambda:f.home_lambda,away_lambda:f.away_lambda}
      ];
    }).filter((x:any)=>x.probability!=null).sort((a:any,b:any)=>b.probability-a.probability);
    const totals=fixture_models.flatMap((f:any)=>{const mk=f.markets||{};return [
      {type:'O/U 2.5',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:'Over 2.5',probability:n(mk.over_2_5),home_lambda:f.home_lambda,away_lambda:f.away_lambda},
      {type:'O/U 2.5',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:'Under 2.5',probability:n(mk.under_2_5),home_lambda:f.home_lambda,away_lambda:f.away_lambda}
    ];}).filter((x:any)=>x.probability!=null).sort((a:any,b:any)=>b.probability-a.probability);
    const btts=fixture_models.flatMap((f:any)=>{const mk=f.markets||{};return [
      {type:'BTTS',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:'BTTS Yes',probability:n(mk.btts_yes),home_lambda:f.home_lambda,away_lambda:f.away_lambda},
      {type:'BTTS',match_id:f.match_id,fixture:`${f.home} vs ${f.away}`,selection:'BTTS No',probability:n(mk.btts_no),home_lambda:f.home_lambda,away_lambda:f.away_lambda}
    ];}).filter((x:any)=>x.probability!=null).sort((a:any,b:any)=>b.probability-a.probability);
    const betting_recommendations=[exactOptions[0],oneXtwo[0],totals[0],btts[0]].filter(Boolean);

    let previous_highlight:any=null;
    if(gw>1){
      const prevGw=gw-1;
      const {data:rr}=await sb.from('gameweek_result_runs').select('id,observed_at,is_final').eq('gameweek',prevGw).order('is_final',{ascending:false}).order('observed_at',{ascending:false}).limit(1).maybeSingle();
      if(rr){
        const {data:acts}=await sb.from('player_gameweek_actuals').select('player_id,minutes,total_points,goals,assists,bonus,clean_sheets,xg,xa,xgi').eq('result_run_id',rr.id).order('total_points',{ascending:false}).limit(5);
        const top=acts?.[0];
        if(top){
          const p=pm.get(Number(top.player_id));
          let prevPlayer=p;
          if(!prevPlayer){const {data:pp}=await sb.from('players').select('id,web_name,team_id').eq('id',top.player_id).maybeSingle();prevPlayer=pp||null}
          let team=prevPlayer?tm.get(Number(prevPlayer.team_id)):null;
          if(!team&&prevPlayer){const {data:tt}=await sb.from('teams').select('id,name,short_name').eq('id',prevPlayer.team_id).maybeSingle();team=tt||null}
          const {data:prevMatches}=await sb.from('matches').select('id,home_team_id,away_team_id,home_score,away_score,finished,kickoff_time').eq('source','fpl').eq('gameweek',prevGw).order('kickoff_time');
          const match=(prevMatches||[]).find((m:any)=>Number(m.home_team_id)===Number(prevPlayer?.team_id)||Number(m.away_team_id)===Number(prevPlayer?.team_id))||null;
          let fixture:any=null;
          if(match){
            let home=tm.get(Number(match.home_team_id)),away=tm.get(Number(match.away_team_id));
            if(!home||!away){const {data:pair}=await sb.from('teams').select('id,name,short_name').in('id',[match.home_team_id,match.away_team_id]);const mm=new Map((pair||[]).map((x:any)=>[Number(x.id),x]));home=home||mm.get(Number(match.home_team_id));away=away||mm.get(Number(match.away_team_id))}
            fixture={home:home?.name||null,away:away?.name||null,home_score:match.home_score,away_score:match.away_score};
          }
          previous_highlight={gameweek:prevGw,player:{id:Number(top.player_id),name:prevPlayer?.web_name||null,team:team?.name||null,total_points:Number(top.total_points||0),goals:Number(top.goals||0),assists:Number(top.assists||0),bonus:Number(top.bonus||0),minutes:Number(top.minutes||0),xg:n(top.xg),xa:n(top.xa),xgi:n(top.xgi)},fixture};
        }
      }
    }

    return new Response(JSON.stringify({ok:true,gameweek:gw,prediction_run_id:run.id,model_version:mv?.version||null,generated_at:run.generated_at,previous_highlight,next_expectation:{top_favorites,highest_total},captain_candidates,top_players,manager_plan:plan||null,betting_recommendations,fixture_models}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
