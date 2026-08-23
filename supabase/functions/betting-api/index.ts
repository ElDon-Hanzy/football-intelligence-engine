import { createClient } from 'jsr:@supabase/supabase-js@2';

const H={'Access-Control-Allow-Origin':'*','Content-Type':'application/json','Cache-Control':'no-store'};

Deno.serve(async req=>{
  try{
    const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||1);
    const [mr,tr,sr,rr,or,ir]=await Promise.all([
      sb.from('matches').select('*').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('teams').select('id,name,short_name'),
      sb.from('fixture_prediction_snapshots').select('*').eq('gameweek',gw).eq('is_pre_kickoff',true).order('captured_at',{ascending:false}),
      sb.from('odds_raw_snapshots').select('id,match_id,bookmaker,captured_at,event_kickoff,pre_kickoff').eq('gameweek',gw).eq('pre_kickoff',true).order('captured_at',{ascending:false}),
      sb.from('odds_market_selections').select('raw_snapshot_id,match_id,bookmaker,market_key,market_name,selection_key,selection_name,line,decimal_odds,implied_probability,source_timestamp,captured_at').eq('gameweek',gw).order('captured_at',{ascending:false}),
      sb.from('odds_ingestion_runs').select('*').eq('gameweek',gw).order('started_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    for(const [name,res] of [['matches',mr],['teams',tr],['predictions',sr],['raw_odds',rr],['normalized_odds',or],['ingestion_run',ir]] as any){if(res.error)throw Error(`${name}: ${res.error.message}`)}
    const tm=new Map((tr.data||[]).map((x:any)=>[x.id,x]));
    const predictionByMatch=new Map();for(const x of sr.data||[])if(!predictionByMatch.has(x.match_id))predictionByMatch.set(x.match_id,x);
    const validRaw=new Map<number,any>();for(const r of rr.data||[])if(r.pre_kickoff&&+new Date(r.captured_at)<+new Date(r.event_kickoff))validRaw.set(Number(r.id),r);
    const latest=new Map<string,any>();
    for(const x of or.data||[]){
      const r=validRaw.get(Number(x.raw_snapshot_id));if(!r)continue;
      if(x.source_timestamp&&+new Date(x.source_timestamp)>=+new Date(r.event_kickoff))continue;
      const key=`${x.match_id}|${x.bookmaker}|${x.market_key}|${x.selection_key}|${x.line??''}`;
      if(!latest.has(key))latest.set(key,{...x,selection:x.selection_name,provider_updated_at:x.source_timestamp,event_kickoff:r.event_kickoff,pre_kickoff:true});
    }
    const allOdds=[...latest.values()];
    const fixtures=(mr.data||[]).map((x:any)=>{
      const p=predictionByMatch.get(x.id),home=tm.get(x.home_team_id),away=tm.get(x.away_team_id);
      const odds=allOdds.filter((z:any)=>z.match_id===x.id);
      const cs=odds.filter((z:any)=>z.market_key==='correct_score').sort((a:any,b:any)=>Number(a.decimal_odds)-Number(b.decimal_odds));
      const bookmakers=[...new Set(odds.map((z:any)=>z.bookmaker))];
      const markets=[...new Set(odds.map((z:any)=>z.market_key))];
      return {
        match_id:x.id,kickoff_time:x.kickoff_time,home_team:home?.name,away_team:away?.name,home_short:home?.short_name,away_short:away?.short_name,
        prediction:p?{home_lambda:p.home_lambda,away_lambda:p.away_lambda,confidence:p.confidence,top_scorelines:p.top_scorelines,markets:p.markets,captured_at:p.captured_at}:null,
        bookmaker_odds:odds,correct_score_odds:cs,
        odds_count:odds.length||null,correct_score_count:cs.length||null,
        bookmaker_count:bookmakers.length||null,market_count:markets.length||null,
        bookmakers,market_keys:markets,
        frozen:+new Date(x.kickoff_time)<=Date.now()
      };
    });
    return new Response(JSON.stringify({ok:true,gameweek:gw,odds_status:allOdds.length?'connected':'no_data',value_edge_available:false,last_ingestion:ir.data||null,fixtures}),{headers:H});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}
});