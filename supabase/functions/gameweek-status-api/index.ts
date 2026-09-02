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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('Missing Supabase service credential');

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const [{ data, error }, { data: teams, error: teamsError }] = await Promise.all([
      sb.from('matches').select('gameweek,kickoff_time,finished').eq('source', 'fpl').gte('gameweek', 1).lte('gameweek', 38).order('gameweek').order('kickoff_time'),
      sb.from('teams').select('id,fpl_team_id,name,short_name,team_code').not('fpl_team_id', 'is', null).order('fpl_team_id'),
    ]);
    if (error) throw error;
    if (teamsError) throw teamsError;

    const groups = new Map<number, FixtureRow[]>();
    for (const row of (data ?? []) as FixtureRow[]) {
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

    return new Response(JSON.stringify({
      ok: true,
      live_gameweek: resolved.gameweek,
      reason,
      as_of: new Date(now).toISOString(),
      schedule,
      teams: teams ?? [],
      semantics: {
        live_gameweek: 'earliest unfinished league gameweek whose fixture window has not elapsed; otherwise next scheduled gameweek',
        frozen_projection_runs_do_not_define_live_gameweek: true,
        team_badge_key: 'public.teams.team_code',
      },
    }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
