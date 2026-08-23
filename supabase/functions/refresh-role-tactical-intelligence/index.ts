import { createClient } from 'supabase';
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const errText=(e:any)=>e instanceof Error?e.message:e?.message?String(e.message):JSON.stringify(e);
Deno.serve(async(req)=>{try{
  if(req.method!=='POST')return new Response(JSON.stringify({ok:false,error:'POST required'}),{status:405,headers:H});
  const ks=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');const key=ks.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Missing service credential');
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false}});
  const {data:tok,error:ae}=await sb.rpc('get_backend_secret',{secret_name:'FOOTBALL_ENGINE_ADMIN_TOKEN'});if(ae||!tok||req.headers.get('x-engine-token')!==tok)return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:H});
  const body=await req.json().catch(()=>({}));const gw=body.gameweek==null?null:Number(body.gameweek);
  const call=async(name:string,args?:Record<string,unknown>)=>{const {data,error}=await sb.rpc(name,args);if(error)throw new Error(`${name}: ${error.message}`);return data};
  const playerProfiles=await call('refresh_player_role_profiles');
  const teamProfiles=await call('refresh_team_tactical_profiles_v011');
  const playerFixtures=await call('refresh_player_fixture_role_snapshots',{p_gameweek:gw});
  const teamFixtures=await call('refresh_team_fixture_tactical_snapshots',{p_gameweek:gw});
  return new Response(JSON.stringify({ok:true,gameweek:gw,player_profiles:playerProfiles,team_profiles:teamProfiles,player_fixture_roles:playerFixtures,team_fixture_tactics:teamFixtures,model_effect_enabled:false,note:'Automated player roles are event-profile archetypes; team styles are multi-axis heuristics. Exact formations, defensive pressing intensity and replacement-quality effects are not asserted by this layer.'}),{headers:H});
}catch(e){return new Response(JSON.stringify({ok:false,error:errText(e)}),{status:500,headers:H})}});
