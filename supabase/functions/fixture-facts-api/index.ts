import { createClient } from 'supabase';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||0);
    if(!Number.isInteger(gw)||gw<1||gw>38)throw new Error('Valid gw required');
    const asOf=gw-1;
    if(asOf<1)return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:false,reason:'No prior completed gameweek fact snapshot'}),{headers:cors});

    const {data:run,error:re}=await sb.from('team_fact_snapshot_runs')
      .select('id,as_of_gameweek,evidence_cutoff,source_match_cutoff,created_at,canonical_version')
      .eq('as_of_gameweek',asOf).order('id',{ascending:false}).limit(1).maybeSingle();
    if(re)throw re;
    if(!run)return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:false,reason:`No C0162 snapshot after GW${asOf}`}),{headers:cors});

    const [{data:matches,error:me},{data:teams,error:te},{data:card,error:ce},{data:modal,error:moe},{data:recent,error:rre}]=await Promise.all([
      sb.from('matches').select('id,gameweek,kickoff_time,home_team_id,away_team_id').eq('source','fpl').eq('gameweek',gw).order('kickoff_time'),
      sb.from('teams').select('id,name,short_name'),
      sb.from('current_fixture_card_facts_v01').select('id,snapshot_run_id,match_id,team_id,opponent_team_id,fact_type,usefulness_score,card_rank,alignment,one_liner,payload,evidence_cutoff').eq('snapshot_run_id',run.id).eq('gameweek',gw).order('match_id').order('card_rank'),
      sb.from('current_fixture_modal_facts_v01').select('id,snapshot_run_id,match_id,team_id,opponent_team_id,fact_type,usefulness_score,candidate_rank,card_rank,alignment,one_liner,payload,evidence_cutoff').eq('snapshot_run_id',run.id).eq('gameweek',gw).order('match_id').order('usefulness_score',{ascending:false}),
      sb.from('team_recent_epl_result_snapshots').select('team_id,sequence_no,opponent_team_id,fixture_kickoff,venue,goals_for,goals_against,result').eq('snapshot_run_id',run.id).order('team_id').order('sequence_no')
    ]);
    if(me)throw me;if(te)throw te;if(ce)throw ce;if(moe)throw moe;if(rre)throw rre;
    const tm=new Map((teams||[]).map((x:any)=>[Number(x.id),x]));
    const cardBy=new Map<number,any[]>(),modalBy=new Map<number,any[]>(),recentBy=new Map<number,any[]>();
    for(const x of card||[]){const k=Number(x.match_id);if(!cardBy.has(k))cardBy.set(k,[]);cardBy.get(k)!.push(x)}
    for(const x of modal||[]){const k=Number(x.match_id);if(!modalBy.has(k))modalBy.set(k,[]);modalBy.get(k)!.push(x)}
    for(const x of recent||[]){const k=Number(x.team_id);if(!recentBy.has(k))recentBy.set(k,[]);recentBy.get(k)!.push({...x,opponent_name:tm.get(Number(x.opponent_team_id))?.name||null,opponent_short:tm.get(Number(x.opponent_team_id))?.short_name||null})}
    const fixtures=(matches||[]).map((m:any)=>({
      match_id:Number(m.id),gameweek:Number(m.gameweek),kickoff_time:m.kickoff_time,
      home:{id:Number(m.home_team_id),name:tm.get(Number(m.home_team_id))?.name||null,short_name:tm.get(Number(m.home_team_id))?.short_name||null,recent:recentBy.get(Number(m.home_team_id))||[]},
      away:{id:Number(m.away_team_id),name:tm.get(Number(m.away_team_id))?.name||null,short_name:tm.get(Number(m.away_team_id))?.short_name||null,recent:recentBy.get(Number(m.away_team_id))||[]},
      card_facts:cardBy.get(Number(m.id))||[],modal_facts:modalBy.get(Number(m.id))||[]
    }));
    return new Response(JSON.stringify({ok:true,gameweek:gw,facts_available:true,evidence_source:'dynamic_c0166_views',snapshot_run:run,fixtures}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
