import { createClient } from 'supabase';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const ts = (value: unknown): number => value ? new Date(String(value)).getTime() : Number.NaN;
const asNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function lifecycle(nowMs: number, deadlineAt: string | null, matches: any[]) {
  const deadlineMs = ts(deadlineAt);
  if (!Number.isFinite(deadlineMs)) return 'UNKNOWN';
  if (nowMs < deadlineMs) return 'PRE_DEADLINE';
  return matches.length > 0 && matches.every((match) => match.finished === true)
    ? 'GW_COMPLETE'
    : 'POST_DEADLINE_ACTIVE';
}

function fixturePhase(nowMs: number, kickoffAt: string, finished: boolean) {
  if (finished) return 'FINISHED';
  return nowMs >= ts(kickoffAt) ? 'LIVE' : 'FUTURE';
}

function authorizationLabel(publicationStatus: string | null, executionAuthorized: boolean) {
  if (publicationStatus === 'FINAL' && executionAuthorized) return 'AUTHORIZED_FINAL_RECOMMENDATION';
  if (publicationStatus === 'FINAL') return 'FINAL_FROZEN_NOT_AUTHORIZED';
  return 'PROVISIONAL_NOT_AUTHORIZED';
}

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

    const { data: latestPublication, error: latestPublicationError } = await sb
      .from('current_fpl_live_plan_v01')
      .select('gameweek')
      .order('gameweek', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestPublicationError) throw latestPublicationError;

    const gameweek = requested >= 1 && requested <= 38
      ? requested
      : asNumber(latestPublication?.gameweek);
    if (!gameweek) throw new Error('No V3 Gameweek is available');

    const [liveResult, actualResult, matchesResult, resultRunResult] = await Promise.all([
      sb.from('current_fpl_live_plan_v01')
        .select('id,gameweek,captured_at,publication_stage,publication_status,final_status,execution_authorized,prediction_run_id,manager_state_id,optimizer_run_id,autonomous_gate_run_id,plan,layer_lineage,source,historical_forecasts_rewritten')
        .eq('gameweek', gameweek)
        .maybeSingle(),
      sb.from('fpl_actual_manager_decisions')
        .select('id,gameweek,captured_at,captain_player_id,vice_player_id,starting_xi,bench_order,chip,source,notes,correction_of_id')
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
        .order('is_final', { ascending: false })
        .order('observed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (liveResult.error) throw liveResult.error;
    if (actualResult.error) throw actualResult.error;
    if (matchesResult.error) throw matchesResult.error;
    if (resultRunResult.error) throw resultRunResult.error;

    const live = liveResult.data as any;
    const actualDecision = actualResult.data as any;
    const matches = (matchesResult.data || []) as any[];
    const resultRun = resultRunResult.data as any;
    const predictionRunId = asNumber(live?.prediction_run_id);

    const predictionRunResult = predictionRunId
      ? await sb.from('gameweek_prediction_runs')
          .select('id,gameweek,generated_at,deadline_at,run_type,frozen,excluded_from_backtest,model_version_id,metadata')
          .eq('id', predictionRunId)
          .maybeSingle()
      : { data: null, error: null };
    if (predictionRunResult.error) throw predictionRunResult.error;

    const predictionRun = predictionRunResult.data as any;
    const firstKickoff = matches.map((match) => ts(match.kickoff_time)).filter(Number.isFinite).sort((a, b) => a - b)[0];
    const derivedDeadline = Number.isFinite(firstKickoff) ? new Date(firstKickoff - 90 * 60 * 1000).toISOString() : null;
    const deadlineAt = predictionRun?.deadline_at || derivedDeadline;
    const nowMs = Date.now();
    const gameweekLifecycle = lifecycle(nowMs, deadlineAt, matches);

    const priceEvidenceResult = predictionRun?.generated_at
      ? await sb.from('fpl_prices')
          .select('captured_at,gameweek')
          .eq('gameweek', gameweek)
          .lte('captured_at', predictionRun.generated_at)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };
    if (priceEvidenceResult.error) throw priceEvidenceResult.error;

    const rawPlan = (live?.plan || {}) as any;
    const selectedPath = rawPlan?.c0248_selected_path || null;
    const firstAction = selectedPath?.first_action || null;
    const recommendationEconomy = firstAction && Number(firstAction.gameweek) === gameweek
      ? {
          free_transfers: asNumber(firstAction.free_transfers_after),
          bank_tenths: asNumber(firstAction.bank_after),
          captured_at: live.captured_at,
          source: 'C0248_SELECTED_PATH_FIRST_ACTION',
          basis: 'RECOMMENDATION_POST_ACTION',
        }
      : null;

    const recommendedSquad = Array.isArray(rawPlan.squad)
      ? rawPlan.squad.map((player: any) => ({
          player_id: asNumber(player.player_id),
          name: player.name ?? null,
          team: player.team ?? null,
          position: player.position ?? null,
          price_tenths: asNumber(player.now_price_tenths),
          role: player.current_role ?? null,
          expected_minutes: asNumber(player.current_xmins),
        })).filter((player: any) => player.player_id != null)
      : [];

    const actualXi = Array.isArray(actualDecision?.starting_xi) ? actualDecision.starting_xi.map(Number).filter(Number.isFinite) : [];
    const actualBench = Array.isArray(actualDecision?.bench_order) ? actualDecision.bench_order.map(Number).filter(Number.isFinite) : [];
    const actualSquadIds = [...new Set([...actualXi, ...actualBench])];
    const playerIds = [...new Set([
      ...recommendedSquad.map((player: any) => player.player_id),
      ...actualSquadIds,
    ])];

    const [playersResult, teamsResult, projectionResult, actualsResult] = await Promise.all([
      playerIds.length
        ? sb.from('players').select('id,web_name,position,team_id').in('id', playerIds)
        : Promise.resolve({ data: [], error: null }),
      sb.from('teams').select('id,name,short_name'),
      predictionRunId && playerIds.length
        ? sb.from('fpl_public_projection_payload_v01')
            .select('player_id,expected_points,expected_minutes,p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_start,p_goal,p_assist,p_clean_sheet,p_dc,p_bonus,confidence,q90,q95,distribution_version,tail_semantics')
            .eq('prediction_run_id', predictionRunId)
            .in('player_id', playerIds)
        : Promise.resolve({ data: [], error: null }),
      resultRun?.id && playerIds.length
        ? sb.from('player_gameweek_actuals')
            .select('player_id,fixture_ids,minutes,total_points,goals,assists,bonus,bps,defensive_contribution,xg,xa,xgi,xgc,clean_sheets')
            .eq('result_run_id', resultRun.id)
            .in('player_id', playerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (playersResult.error) throw playersResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (projectionResult.error) throw projectionResult.error;
    if (actualsResult.error) throw actualsResult.error;

    const teamById = new Map((teamsResult.data || []).map((team: any) => [Number(team.id), team]));
    const projectionByPlayer = new Map((projectionResult.data || []).map((row: any) => [Number(row.player_id), row]));
    const snapshotFinishedIds = new Set(
      Array.isArray(resultRun?.metadata?.finished_fixture_ids)
        ? resultRun.metadata.finished_fixture_ids.map(Number).filter(Number.isFinite)
        : matches.filter((match) => match.finished === true).map((match) => Number(match.fpl_fixture_id)).filter(Number.isFinite),
    );

    const playerActuals = (actualsResult.data || []).map((row: any) => {
      const fixtureIds = Array.isArray(row.fixture_ids) ? row.fixture_ids.map(Number).filter(Number.isFinite) : [];
      const finalized = fixtureIds.length > 0 && fixtureIds.every((id: number) => snapshotFinishedIds.has(id));
      return {
        player_id: Number(row.player_id),
        fixture_ids: fixtureIds,
        status: finalized ? 'FINAL' : 'PENDING',
        minutes: finalized ? asNumber(row.minutes) : null,
        total_points: finalized ? asNumber(row.total_points) : null,
        goals: finalized ? asNumber(row.goals) : null,
        assists: finalized ? asNumber(row.assists) : null,
        bonus: finalized ? asNumber(row.bonus) : null,
        bps: finalized ? asNumber(row.bps) : null,
        defensive_contribution: finalized ? asNumber(row.defensive_contribution) : null,
        xg: finalized ? asNumber(row.xg) : null,
        xa: finalized ? asNumber(row.xa) : null,
        xgi: finalized ? asNumber(row.xgi) : null,
        xgc: finalized ? asNumber(row.xgc) : null,
        clean_sheets: finalized ? asNumber(row.clean_sheets) : null,
      };
    });

    const players = (playersResult.data || []).map((player: any) => {
      const teamId = Number(player.team_id);
      const fixtureContexts = matches
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
            phase: fixturePhase(nowMs, match.kickoff_time, Boolean(match.finished)),
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
        fixtures: fixtureContexts,
      };
    });

    const playerEvidence = playerIds.map((playerId) => {
      const row = projectionByPlayer.get(Number(playerId)) as any;
      if (!row) {
        return {
          player_id: Number(playerId),
          status: 'NOT_CAPTURED',
          captured_at: predictionRun?.generated_at ?? null,
        };
      }
      return {
        player_id: Number(playerId),
        status: 'CAPTURED',
        captured_at: predictionRun?.generated_at ?? null,
        expected_points: asNumber(row.expected_points),
        expected_minutes: asNumber(row.expected_minutes),
        p_blank: asNumber(row.p_blank),
        p_5_plus: asNumber(row.p_5_plus),
        p_10_plus: asNumber(row.p_10_plus),
        p_15_plus: asNumber(row.p_15_plus),
        p_20_plus: asNumber(row.p_20_plus),
        p_start: asNumber(row.p_start),
        p_goal: asNumber(row.p_goal),
        p_assist: asNumber(row.p_assist),
        p_clean_sheet: asNumber(row.p_clean_sheet),
        p_dc: asNumber(row.p_dc),
        p_bonus: asNumber(row.p_bonus),
        confidence: asNumber(row.confidence),
        q90: asNumber(row.q90),
        q95: asNumber(row.q95),
        distribution_version: row.distribution_version ?? null,
        tail_semantics: row.tail_semantics ?? null,
      };
    });

    const actual = actualDecision
      ? {
          verification_status: 'VERIFIED',
          decision_id: Number(actualDecision.id),
          captured_at: actualDecision.captured_at,
          source: actualDecision.source,
          squad: actualSquadIds,
          starting_xi: actualXi,
          bench_order: actualBench,
          captain_player_id: asNumber(actualDecision.captain_player_id),
          vice_player_id: asNumber(actualDecision.vice_player_id),
          chip: actualDecision.chip ?? null,
          manager_economy: null,
          manager_economy_reason: 'No same-state verified FT/bank record is linked to the actual decision.',
        }
      : {
          verification_status: 'NOT_VERIFIED',
          reason: 'Actual submitted team not verified',
          squad: null,
          starting_xi: null,
          bench_order: null,
          captain_player_id: null,
          vice_player_id: null,
          chip: null,
          manager_economy: null,
        };

    const recommendation = live
      ? {
          publication_id: Number(live.id),
          captured_at: live.captured_at,
          publication_stage: live.publication_stage,
          publication_status: live.publication_status,
          final_status: live.final_status,
          execution_authorized: Boolean(live.execution_authorized),
          authorization_label: authorizationLabel(live.publication_status, Boolean(live.execution_authorized)),
          frozen_after_deadline: gameweekLifecycle !== 'PRE_DEADLINE',
          prediction_run_id: predictionRunId,
          optimizer_run_id: asNumber(live.optimizer_run_id),
          autonomous_gate_run_id: asNumber(live.autonomous_gate_run_id),
          source: live.source,
          squad: recommendedSquad,
          starting_xi: Array.isArray(rawPlan.starting_xi) ? rawPlan.starting_xi.map(Number).filter(Number.isFinite) : [],
          bench_order: Array.isArray(rawPlan.bench_order) ? rawPlan.bench_order.map(Number).filter(Number.isFinite) : [],
          captain_player_id: asNumber(rawPlan.captain_player_id),
          vice_player_id: asNumber(rawPlan.vice_player_id),
          chip: rawPlan.chip ?? null,
          transfers: Array.isArray(rawPlan.transfers) ? rawPlan.transfers : [],
          manager_economy: recommendationEconomy,
          layer_lineage: live.layer_lineage ?? null,
        }
      : null;

    const fixtures = matches.map((match) => ({
      match_id: Number(match.id),
      fpl_fixture_id: asNumber(match.fpl_fixture_id),
      kickoff_at: match.kickoff_time,
      phase: fixturePhase(nowMs, match.kickoff_time, Boolean(match.finished)),
      finished: Boolean(match.finished),
      home_team_id: Number(match.home_team_id),
      away_team_id: Number(match.away_team_id),
      home_team: teamById.get(Number(match.home_team_id))?.name ?? null,
      away_team: teamById.get(Number(match.away_team_id))?.name ?? null,
      home_score: asNumber(match.home_score),
      away_score: asNumber(match.away_score),
      result_source: 'DB_MATCHES',
      updated_at: match.updated_at,
    }));

    return new Response(JSON.stringify({
      ok: true,
      contract_version: 'fpl_v3_workspace_v02_player_evidence',
      gameweek,
      lifecycle: gameweekLifecycle,
      generated_at: new Date(nowMs).toISOString(),
      actual,
      recommendation,
      decision_snapshot: predictionRun
        ? {
            prediction_run_id: Number(predictionRun.id),
            generated_at: predictionRun.generated_at,
            deadline_at: deadlineAt,
            run_type: predictionRun.run_type,
            frozen: Boolean(predictionRun.frozen),
            excluded_from_backtest: Boolean(predictionRun.excluded_from_backtest),
            model_version_id: asNumber(predictionRun.model_version_id),
            player_evidence: playerEvidence,
            price_ownership_evidence: priceEvidenceResult.data
              ? { status: 'CAPTURED', captured_at: (priceEvidenceResult.data as any).captured_at, source: 'fpl_prices' }
              : { status: 'NOT_CAPTURED', captured_at: null, source: null },
          }
        : null,
      realized: {
        result_run_id: asNumber(resultRun?.id),
        observed_at: resultRun?.observed_at ?? null,
        is_final: resultRun?.is_final === true,
        fixtures,
        player_actuals: playerActuals,
      },
      players,
      semantics: {
        final_does_not_imply_execution_authorized: true,
        actual_is_never_inferred_from_recommendation: true,
        actual_manager_economy_is_not_inferred: true,
        recommendation_economy_is_same_path_post_action_only: true,
        decision_time_evidence_is_timestamp_scoped: true,
        player_projection_evidence_is_frozen_to_prediction_run: true,
        realized_player_values_require_finished_fixture_evidence: true,
        fixture_phase_is_explicit: true,
        historical_forecasts_rewritten: Boolean(live?.historical_forecasts_rewritten),
      },
    }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: cors,
    });
  }
});
