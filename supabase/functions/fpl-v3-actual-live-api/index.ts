import { createClient } from 'supabase';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const asNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const ts = (value: unknown): number => value ? new Date(String(value)).getTime() : Number.NaN;

function phase(nowMs: number, kickoff: string, finished: boolean): 'FUTURE' | 'LIVE' | 'FINISHED' {
  if (finished) return 'FINISHED';
  return nowMs >= ts(kickoff) ? 'LIVE' : 'FUTURE';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return new Response(JSON.stringify({ ok: false, error: 'GET required' }), { status: 405, headers: cors });

  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('Missing Supabase service credential');
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });

    const url = new URL(req.url);
    const requestedGw = Number(url.searchParams.get('gw') || 0);
    const { data: latestPlan, error: planError } = await sb
      .from('current_fpl_live_plan_v01')
      .select('gameweek')
      .order('gameweek', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    const gameweek = requestedGw >= 1 && requestedGw <= 38 ? requestedGw : asNumber(latestPlan?.gameweek);
    if (!gameweek) throw new Error('No active Gameweek available');

    const [actualResult, matchesResult, resultRunResult] = await Promise.all([
      sb.from('fpl_actual_manager_decisions')
        .select('id,gameweek,captured_at,captain_player_id,vice_player_id,starting_xi,bench_order,chip,source,notes')
        .eq('gameweek', gameweek)
        .order('captured_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb.from('matches')
        .select('id,fpl_fixture_id,home_team_id,away_team_id,kickoff_time,home_score,away_score,finished,updated_at')
        .eq('source', 'fpl')
        .eq('gameweek', gameweek)
        .order('kickoff_time'),
      sb.from('gameweek_result_runs')
        .select('id,observed_at,is_final,metadata')
        .eq('gameweek', gameweek)
        .order('observed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (actualResult.error) throw actualResult.error;
    if (matchesResult.error) throw matchesResult.error;
    if (resultRunResult.error) throw resultRunResult.error;

    const actual = actualResult.data as any;
    const startingXi = Array.isArray(actual?.starting_xi) ? actual.starting_xi.map(Number).filter(Number.isFinite) : [];
    const benchOrder = Array.isArray(actual?.bench_order) ? actual.bench_order.map(Number).filter(Number.isFinite) : [];
    const squad = [...startingXi, ...benchOrder];
    const fullActual = startingXi.length === 11 && benchOrder.length === 4 && new Set(squad).size === 15;

    if (!actual || !fullActual) {
      return new Response(JSON.stringify({
        ok: true,
        contract_version: 'fpl_v3_actual_live_v01',
        gameweek,
        generated_at: new Date().toISOString(),
        actual: {
          verification_status: 'NOT_VERIFIED',
          reason: 'Actual submitted team not verified',
        },
        result_snapshot: null,
        players: [],
        player_actuals: [],
        semantics: {
          engine_recommendation_is_never_used_as_actual: true,
          provisional_live_points_are_not_final: true,
          scoring_scope: 'RAW_FPL_PLAYER_POINTS_NO_AUTO_SUBS_OR_CAPTAIN_MULTIPLIER',
        },
      }), { headers: cors });
    }

    const matches = (matchesResult.data || []) as any[];
    const resultRun = resultRunResult.data as any;
    const [playersResult, teamsResult, actualsResult] = await Promise.all([
      sb.from('players').select('id,web_name,position,team_id').in('id', squad),
      sb.from('teams').select('id,name,short_name'),
      resultRun?.id
        ? sb.from('player_gameweek_actuals')
            .select('player_id,fixture_ids,minutes,total_points,goals,assists,bonus,bps,defensive_contribution,xg,xa,xgi,xgc,clean_sheets')
            .eq('result_run_id', resultRun.id)
            .in('player_id', squad)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (playersResult.error) throw playersResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (actualsResult.error) throw actualsResult.error;

    const nowMs = Date.now();
    const teamById = new Map((teamsResult.data || []).map((team: any) => [Number(team.id), team]));
    const actualByPlayer = new Map((actualsResult.data || []).map((row: any) => [Number(row.player_id), row]));

    const players = (playersResult.data || []).map((player: any) => {
      const teamId = Number(player.team_id);
      const fixtures = matches
        .filter((match) => Number(match.home_team_id) === teamId || Number(match.away_team_id) === teamId)
        .map((match) => {
          const home = Number(match.home_team_id) === teamId;
          const opponentId = home ? Number(match.away_team_id) : Number(match.home_team_id);
          return {
            match_id: Number(match.id),
            fpl_fixture_id: asNumber(match.fpl_fixture_id),
            venue: home ? 'H' : 'A',
            opponent_team_id: opponentId,
            opponent: teamById.get(opponentId)?.name ?? null,
            opponent_short: teamById.get(opponentId)?.short_name ?? null,
            kickoff_at: match.kickoff_time,
            phase: phase(nowMs, match.kickoff_time, Boolean(match.finished)),
            finished: Boolean(match.finished),
          };
        });
      return {
        player_id: Number(player.id),
        name: player.web_name,
        position: player.position,
        team_id: teamId,
        team: teamById.get(teamId)?.name ?? null,
        team_short: teamById.get(teamId)?.short_name ?? null,
        fixtures,
      };
    });

    const playerById = new Map(players.map((player: any) => [Number(player.player_id), player]));
    const playerActuals = squad.map((playerId) => {
      const metadata: any = playerById.get(Number(playerId));
      const fixturePhases = Array.isArray(metadata?.fixtures) ? metadata.fixtures.map((fixture: any) => fixture.phase) : [];
      const allFinished = fixturePhases.length > 0 && fixturePhases.every((value: string) => value === 'FINISHED');
      const anyLive = fixturePhases.some((value: string) => value === 'LIVE');
      const anyFinished = fixturePhases.some((value: string) => value === 'FINISHED');
      const status = allFinished ? 'FINAL' : anyLive ? 'LIVE' : anyFinished ? 'PARTIAL' : 'PENDING';
      const row: any = actualByPlayer.get(Number(playerId));
      const visible = row && status !== 'PENDING';
      return {
        player_id: Number(playerId),
        fixture_ids: Array.isArray(row?.fixture_ids) ? row.fixture_ids.map(Number).filter(Number.isFinite) : [],
        status,
        points_are_final: status === 'FINAL',
        minutes: visible ? asNumber(row.minutes) : null,
        total_points: visible ? asNumber(row.total_points) : null,
        goals: visible ? asNumber(row.goals) : null,
        assists: visible ? asNumber(row.assists) : null,
        bonus: visible ? asNumber(row.bonus) : null,
        bps: visible ? asNumber(row.bps) : null,
        defensive_contribution: visible ? asNumber(row.defensive_contribution) : null,
        xg: visible ? asNumber(row.xg) : null,
        xa: visible ? asNumber(row.xa) : null,
        xgi: visible ? asNumber(row.xgi) : null,
        xgc: visible ? asNumber(row.xgc) : null,
        clean_sheets: visible ? asNumber(row.clean_sheets) : null,
      };
    });

    return new Response(JSON.stringify({
      ok: true,
      contract_version: 'fpl_v3_actual_live_v01',
      gameweek,
      generated_at: new Date(nowMs).toISOString(),
      actual: {
        verification_status: 'VERIFIED',
        decision_id: Number(actual.id),
        captured_at: actual.captured_at,
        source: actual.source,
        starting_xi: startingXi,
        bench_order: benchOrder,
        squad,
        captain_player_id: asNumber(actual.captain_player_id),
        vice_player_id: asNumber(actual.vice_player_id),
        chip: actual.chip ?? null,
      },
      result_snapshot: {
        result_run_id: asNumber(resultRun?.id),
        observed_at: resultRun?.observed_at ?? null,
        is_final: resultRun?.is_final === true,
      },
      players,
      player_actuals: playerActuals,
      semantics: {
        engine_recommendation_is_never_used_as_actual: true,
        provisional_live_points_are_not_final: true,
        only_full_11_plus_4_actual_is_verified: true,
        scoring_scope: 'RAW_FPL_PLAYER_POINTS_NO_AUTO_SUBS_OR_CAPTAIN_MULTIPLIER',
      },
    }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
