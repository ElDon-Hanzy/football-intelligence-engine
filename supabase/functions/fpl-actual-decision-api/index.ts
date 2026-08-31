import { createClient } from 'supabase';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    const serviceKey=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)throw new Error('Missing Supabase service credential');
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
    const u=new URL(req.url),gw=Number(u.searchParams.get('gw')||0);
    if(!(gw>=1&&gw<=38))return new Response(JSON.stringify({ok:false,error:'Valid gw required'}),{status:400,headers:cors});
    const {data,error}=await sb.from('fpl_actual_manager_decisions')
      .select('id,gameweek,captured_at,captain_player_id,vice_player_id,starting_xi,bench_order,chip,source,notes,correction_of_id')
      .eq('gameweek',gw).order('captured_at',{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;
    return new Response(JSON.stringify({ok:true,gameweek:gw,actual_decision:data||null}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors})}
});
