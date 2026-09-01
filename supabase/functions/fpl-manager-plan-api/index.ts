import { createClient } from 'supabase';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers: cors });
  }

  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('Missing Supabase service credential');

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const url = new URL(req.url);
    const requested = Number(url.searchParams.get('gw') || 0);

    const { data: plans, error } = await sb
      .from('fpl_manager_plans')
      .select('id,gameweek,captured_at,status,horizon,transfers,captain_player_id,vice_player_id,starting_xi,bench_order,chip,gw_expected_xi_points,expected_gain_current_gw,expected_gain_horizon,risk_level,rationale,source,supersedes_id')
      .order('gameweek', { ascending: true })
      .order('captured_at', { ascending: false });
    if (error) throw error;

    const availableGameweeks = [...new Set((plans || [])
      .map((row: any) => Number(row.gameweek))
      .filter((gw: number) => Number.isInteger(gw) && gw >= 1 && gw <= 38))]
      .sort((a, b) => a - b);

    const gameweek = requested >= 1 && requested <= 38
      ? requested
      : availableGameweeks.length
        ? availableGameweeks[availableGameweeks.length - 1]
        : null;

    const plan = gameweek == null
      ? null
      : (plans || [])
          .filter((row: any) => Number(row.gameweek) === gameweek)
          .sort((a: any, b: any) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())[0] || null;

    return new Response(JSON.stringify({ ok: true, gameweek, available_gameweeks: availableGameweeks, plan }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
