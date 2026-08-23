import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const H={'Access-Control-Allow-Origin':'*','Content-Type':'application/json','Cache-Control':'no-store'};
const canonicalBookmaker=(name:string)=>String(name||'').replace(/\s*\(no latency\)\s*$/i,'').trim();

Deno.serve(async req=>{
  try{
    const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||1);

    const [mr,tr,sr,ir,psr,clvr]=await Promise.all([
      sb.from('matches').select('*').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('teams').select('id,name,short_name'),
      sb.from('fixture_prediction_snapshots').select('*').eq('gameweek',gw).eq('is_pre_kickoff',true).order('captured_at',{ascending:false}),
      sb.from('odds_ingestion_runs').select('*').eq('gameweek',gw).order('started_at',{ascending:false}).limit(1).maybeSingle(),
      sb.from('correct_score_price_summary').select('gameweek,match_id,provider,bookmaker,bookmaker_family,selection_key,selection_name,kickoff_time,snapshot_count,first_observed_raw_snapshot_id,first_observed_decimal_odds,first_observed_implied_probability,first_observed_captured_at,first_observed_seconds_before_kickoff,latest_raw_snapshot_id,latest_decimal_odds,latest_implied_probability,latest_captured_at,latest_seconds_before_kickoff,first_observed_to_latest_odds_return,first_observed_to_latest_implied_probability_move,frozen,closing_proxy_decimal_odds,closing_proxy_implied_probability,closing_proxy_captured_at,closing_proxy_seconds_before_kickoff,closing_proxy_recency_band').eq('gameweek',gw),
      sb.from('correct_score_clv_research').select('gameweek,match_id,bookmaker,selection_key,selection_name,devig_method,entry_raw_snapshot_id,entry_captured_at,entry_seconds_before_kickoff,entry_decimal_odds,entry_implied_probability,entry_fair_probability,entry_model_probability,entry_expected_value,entry_conditional_edge,closing_proxy_raw_snapshot_id,closing_proxy_decimal_odds,closing_proxy_implied_probability,closing_proxy_fair_probability,closing_proxy_captured_at,closing_proxy_seconds_before_kickoff,closing_proxy_recency_band,price_clv,implied_probability_clv,fair_probability_clv,is_closing_proxy_observation,model_effect_enabled').eq('gameweek',gw).eq('is_closing_proxy_observation',false)
    ]);
    for(const [name,res] of [['matches',mr],['teams',tr],['predictions',sr],['ingestion_run',ir],['price_summary',psr],['clv_research',clvr]] as any){if(res.error)throw Error(`${name}: ${res.error.message}`)}

    const rawRows:any[]=[];
    for(let from=0;;from+=1000){
      const r=await sb.from('odds_raw_snapshots')
        .select('id,match_id,bookmaker,captured_at,event_kickoff,pre_kickoff')
        .eq('gameweek',gw).eq('pre_kickoff',true)
        .order('captured_at',{ascending:false}).range(from,from+999);
      if(r.error)throw Error(`raw_odds: ${r.error.message}`);
      rawRows.push(...(r.data||[]));
      if((r.data||[]).length<1000)break;
    }

    const latestRawBySource=new Map<string,any>();
    for(const r of rawRows){
      if(!r.pre_kickoff||+new Date(r.captured_at)>=+new Date(r.event_kickoff))continue;
      const key=`${r.match_id}|${r.bookmaker}`;
      if(!latestRawBySource.has(key))latestRawBySource.set(key,r);
    }
    const latestRaw=[...latestRawBySource.values()];
    const validRaw=new Map<number,any>(latestRaw.map((r:any)=>[Number(r.id),r]));
    const rawIds=latestRaw.map((r:any)=>Number(r.id));

    const oddsRows:any[]=[];
    let edgeRows:any[]=[];
    if(rawIds.length){
      for(let from=0;;from+=1000){
        const r=await sb.from('odds_market_selections')
          .select('raw_snapshot_id,match_id,bookmaker,market_key,market_name,selection_key,selection_name,line,decimal_odds,implied_probability,source_timestamp,captured_at')
          .eq('gameweek',gw).in('raw_snapshot_id',rawIds)
          .order('captured_at',{ascending:false}).range(from,from+999);
        if(r.error)throw Error(`normalized_odds: ${r.error.message}`);
        oddsRows.push(...(r.data||[]));
        if((r.data||[]).length<1000)break;
      }
      const er=await sb.from('correct_score_edge_consensus')
        .select('raw_snapshot_id,match_id,bookmaker,selection_key,selection_name,decimal_odds,model_probability,expected_value,min_edge_across_methods,max_edge_across_methods,market_overround,model_offered_mass,devig_method_count,research_status,evidence_quality,odds_captured_at,model_captured_at,kickoff_time,chronology_valid,model_effect_enabled')
        .eq('gameweek',gw).in('raw_snapshot_id',rawIds).order('expected_value',{ascending:false});
      if(er.error)throw Error(`edge_research: ${er.error.message}`);
      edgeRows=er.data||[];
    }

    const tm=new Map((tr.data||[]).map((x:any)=>[x.id,x]));
    const predictionByMatch=new Map();for(const x of sr.data||[])if(!predictionByMatch.has(x.match_id))predictionByMatch.set(x.match_id,x);
    const allOdds:any[]=[];
    for(const x of oddsRows){
      const r=validRaw.get(Number(x.raw_snapshot_id));if(!r)continue;
      if(x.source_timestamp&&+new Date(x.source_timestamp)>=+new Date(r.event_kickoff))continue;
      allOdds.push({...x,selection:x.selection_name,provider_updated_at:x.source_timestamp,event_kickoff:r.event_kickoff,pre_kickoff:true,bookmaker_family:canonicalBookmaker(x.bookmaker)});
    }

    const fixtures=(mr.data||[]).map((x:any)=>{
      const p=predictionByMatch.get(x.id),home=tm.get(x.home_team_id),away=tm.get(x.away_team_id);
      const odds=allOdds.filter((z:any)=>z.match_id===x.id);
      const cs=odds.filter((z:any)=>z.market_key==='correct_score').sort((a:any,b:any)=>Number(a.decimal_odds)-Number(b.decimal_odds));
      const bookmakerSources=[...new Set(odds.map((z:any)=>z.bookmaker))];
      const bookmakers=[...new Set(odds.map((z:any)=>z.bookmaker_family))];
      const markets=[...new Set(odds.map((z:any)=>z.market_key))];
      const research=edgeRows.filter((z:any)=>z.match_id===x.id&&z.chronology_valid===true&&z.model_effect_enabled===false);
      const robust=research.filter((z:any)=>z.research_status==='ROBUST_POSITIVE_EV').sort((a:any,b:any)=>Number(b.expected_value)-Number(a.expected_value));

      const priceRows=(psr.data||[]).filter((z:any)=>z.match_id===x.id);
      const sourceSummary=new Map<string,any>();
      for(const z of priceRows){
        const cur=sourceSummary.get(z.bookmaker)||{bookmaker:z.bookmaker,bookmaker_family:z.bookmaker_family,selection_count:0,max_snapshot_count:0,latest_captured_at:null,latest_seconds_before_kickoff:null,closing_proxy_captured_at:null,closing_proxy_seconds_before_kickoff:null,closing_proxy_recency_band:null};
        cur.selection_count++;
        cur.max_snapshot_count=Math.max(cur.max_snapshot_count,Number(z.snapshot_count||0));
        if(!cur.latest_captured_at||+new Date(z.latest_captured_at)>+new Date(cur.latest_captured_at)){
          cur.latest_captured_at=z.latest_captured_at;cur.latest_seconds_before_kickoff=z.latest_seconds_before_kickoff;
        }
        if(z.closing_proxy_captured_at){cur.closing_proxy_captured_at=z.closing_proxy_captured_at;cur.closing_proxy_seconds_before_kickoff=z.closing_proxy_seconds_before_kickoff;cur.closing_proxy_recency_band=z.closing_proxy_recency_band;}
        sourceSummary.set(z.bookmaker,cur);
      }
      const topMoves=[...priceRows].sort((a:any,b:any)=>Math.abs(Number(b.first_observed_to_latest_odds_return||0))-Math.abs(Number(a.first_observed_to_latest_odds_return||0))).slice(0,5).map((z:any)=>({bookmaker:z.bookmaker,selection_name:z.selection_name,first_observed_decimal_odds:z.first_observed_decimal_odds,latest_decimal_odds:z.latest_decimal_odds,odds_return:z.first_observed_to_latest_odds_return,implied_probability_move:z.first_observed_to_latest_implied_probability_move,latest_seconds_before_kickoff:z.latest_seconds_before_kickoff}));

      const clvRows=(clvr.data||[]).filter((z:any)=>z.match_id===x.id&&z.model_effect_enabled===false);
      const clvGroups=new Map<string,any>();
      for(const z of clvRows){
        const key=`${z.entry_raw_snapshot_id}|${z.bookmaker}|${z.selection_key}`;
        const g=clvGroups.get(key)||{match_id:z.match_id,bookmaker:z.bookmaker,selection_key:z.selection_key,selection_name:z.selection_name,entry_raw_snapshot_id:z.entry_raw_snapshot_id,entry_captured_at:z.entry_captured_at,entry_seconds_before_kickoff:z.entry_seconds_before_kickoff,entry_decimal_odds:z.entry_decimal_odds,entry_model_probability:z.entry_model_probability,entry_expected_value:z.entry_expected_value,closing_proxy_raw_snapshot_id:z.closing_proxy_raw_snapshot_id,closing_proxy_decimal_odds:z.closing_proxy_decimal_odds,closing_proxy_captured_at:z.closing_proxy_captured_at,closing_proxy_seconds_before_kickoff:z.closing_proxy_seconds_before_kickoff,closing_proxy_recency_band:z.closing_proxy_recency_band,price_clv:z.price_clv,methods:0,min_entry_edge:null,min_fair_probability_clv:null,max_fair_probability_clv:null};
        g.methods++;
        const ee=Number(z.entry_conditional_edge),fc=Number(z.fair_probability_clv);
        g.min_entry_edge=g.min_entry_edge==null?ee:Math.min(g.min_entry_edge,ee);
        g.min_fair_probability_clv=g.min_fair_probability_clv==null?fc:Math.min(g.min_fair_probability_clv,fc);
        g.max_fair_probability_clv=g.max_fair_probability_clv==null?fc:Math.max(g.max_fair_probability_clv,fc);
        clvGroups.set(key,g);
      }
      const clvConsensus=[...clvGroups.values()].filter((z:any)=>z.methods>=2&&Number(z.entry_expected_value)>0&&Number(z.min_entry_edge)>0).sort((a:any,b:any)=>Number(b.price_clv)-Number(a.price_clv));

      return {
        match_id:x.id,kickoff_time:x.kickoff_time,home_team:home?.name,away_team:away?.name,home_short:home?.short_name,away_short:away?.short_name,
        prediction:p?{home_lambda:p.home_lambda,away_lambda:p.away_lambda,confidence:p.confidence,top_scorelines:p.top_scorelines,markets:p.markets,captured_at:p.captured_at}:null,
        bookmaker_odds:odds,correct_score_odds:cs,
        odds_count:odds.length||null,correct_score_count:cs.length||null,
        bookmaker_count:bookmakers.length||null,bookmaker_source_count:bookmakerSources.length||null,market_count:markets.length||null,
        bookmakers,bookmaker_sources:bookmakerSources,market_keys:markets,
        edge_research:research.length?{status:'UNVALIDATED',model_effect_enabled:false,observation_count:research.length,robust_positive_ev_count:robust.length,top_robust_positive_ev:robust.slice(0,5)}:null,
        price_tracking:priceRows.length?{first_observed_not_true_open:true,closing_is_proxy:true,source_summary:[...sourceSummary.values()],top_moves:topMoves}:null,
        clv_research:clvConsensus.length?{status:'UNVALIDATED',model_effect_enabled:false,observation_count:clvConsensus.length,positive_price_clv_count:clvConsensus.filter((z:any)=>Number(z.price_clv)>0).length,positive_fair_probability_clv_count:clvConsensus.filter((z:any)=>Number(z.min_fair_probability_clv)>0).length,top_price_clv:clvConsensus.slice(0,5)}:null,
        frozen:+new Date(x.kickoff_time)<=Date.now()
      };
    });
    return new Response(JSON.stringify({ok:true,gameweek:gw,odds_status:allOdds.length?'connected':'no_data',value_edge_available:false,research_edge_available:edgeRows.length>0,price_tracking_available:(psr.data||[]).length>0,clv_research_available:(clvr.data||[]).length>0,last_ingestion:ir.data||null,fixtures}),{headers:H});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:H})}
});