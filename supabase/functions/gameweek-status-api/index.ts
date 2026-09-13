import { createClient } from 'supabase';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

type FixtureRow = { gameweek: number; kickoff_time: string; finished: boolean };

type GameweekSummary = {
  gameweek: number;
  fixtures: number;
  finished: number;
  unfinished: number;
  first_kickoff: string;
  last_kickoff: string;
};

function hasPublicClientAuth(req: Request): boolean {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) return false;
  const authorization = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const apiKey = req.headers.get('apikey') ?? '';
  return authorization === anonKey && apiKey === anonKey;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!hasPublicClientAuth(req)) return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: cors });
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('Missing Supabase service credential');

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const [scheduleResult, teamsResult, intelligenceResult] = await Promise.all([
      sb.from('matches').select('gameweek,kickoff_time,finished').eq('source', 'fpl').gte('gameweek', 1).lte('gameweek', 38).order('gameweek').order('kickoff_time'),
      sb.from('teams').select('id,fpl_team_id,name,short_name,team_code').not('fpl_team_id', 'is', null).order('fpl_team_id'),
      sb.from('gameweek_prediction_runs').select('gameweek').eq('frozen', true).gte('gameweek', 1).lte('gameweek', 38),
    ]);
    if (scheduleResult.error) throw scheduleResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (intelligenceResult.error) throw intelligenceResult.error;

    const groups = new Map<number, FixtureRow[]>();
    for (const row of (scheduleResult.data ?? []) as FixtureRow[]) {
      const rows = groups.get(row.gameweek) ?? [];
      rows.push(row);
      groups.set(row.gameweek, rows);
    }

    const schedule: GameweekSummary[] = [...groups.entries()].map(([gameweek, rows]) => {
      const kickoffs = rows.map((row) => row.kickoff_time).sort();
      const finished = rows.filter((row) => row.finished).length;
      return {
        gameweek,
        fixtures: rows.length,
        finished,
        unfinished: rows.length - finished,
        first_kickoff: kickoffs[0]!,
        last_kickoff: kickoffs[kickoffs.length - 1]!,
      };
    }).sort((a, b) => a.gameweek - b.gameweek);

    if (!schedule.length) throw new Error('No league fixture schedule available');

    const now = Date.now();
    const graceMs = 6 * 60 * 60 * 1000;
    const activeOrNext = schedule.find((gw) => gw.unfinished > 0 && new Date(gw.last_kickoff).getTime() + graceMs >= now);
    const nextFuture = schedule.find((gw) => new Date(gw.first_kickoff).getTime() > now);
    const fallback = [...schedule].reverse().find((gw) => new Date(gw.last_kickoff).getTime() <= now) ?? schedule[0];
    const resolved = activeOrNext ?? nextFuture ?? fallback;
    const reason = activeOrNext
      ? (new Date(activeOrNext.first_kickoff).getTime() > now ? 'NEXT_UNFINISHED_GAMEWEEK' : 'ACTIVE_UNFINISHED_GAMEWEEK')
      : nextFuture ? 'NEXT_SCHEDULED_GAMEWEEK' : 'LATEST_SCHEDULED_GAMEWEEK';

    const frozenGameweeks = new Set((intelligenceResult.data ?? []).map((row: any) => Number(row.gameweek)).filter((gw: number) => Number.isInteger(gw)));
    const immediateUpcoming = resolved.gameweek + 1;
    const latestIntelligenceGameweek = frozenGameweeks.has(immediateUpcoming) ? immediateUpcoming : resolved.gameweek;
    const planningHorizonGameweek = frozenGameweeks.size ? Math.max(...frozenGameweeks) : resolved.gameweek;

    return new Response(JSON.stringify({
      ok: true,
      live_gameweek: resolved.gameweek,
      latest_intelligence_gameweek: latestIntelligenceGameweek,
      planning_horizon_gameweek: planningHorizonGameweek,
      reason,
      as_of: new Date(now).toISOString(),
      schedule,
      teams: teamsResult.data ?? [],
      semantics: {
        live_gameweek: 'earliest unfinished league gameweek whose fixture window has not elapsed; otherwise next scheduled gameweek',
        latest_intelligence_gameweek: 'current Gameweek plus the immediately upcoming Gameweek only when frozen intelligence exists; deeper planning-horizon runs are not consumer-ready navigation',
        planning_horizon_gameweek: 'highest frozen projection Gameweek used internally for multi-Gameweek planning',
        frozen_projection_runs_do_not_define_live_gameweek: true,
        team_badge_key: 'public.teams.team_code',
      },
    }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
