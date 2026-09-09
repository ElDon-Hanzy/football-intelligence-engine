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

    const [
      { data: plans, error: planError },
      { data: states, error: stateError },
      { data: actualDecisions, error: actualError },
      { data: livePublications, error: liveError },
    ] = await Promise.all([
      sb
        .from('fpl_manager_plans')
        .select('id,gameweek,captured_at,status,horizon,transfers,captain_player_id,vice_player_id,starting_xi,bench_order,chip,gw_expected_xi_points,expected_gain_current_gw,expected_gain_horizon,risk_level,rationale,source,supersedes_id')
        .order('gameweek', { ascending: true })
        .order('captured_at', { ascending: false })
        .order('id', { ascending: false }),
      sb
        .from('fpl_manager_state_snapshots')
        .select('id,gameweek,captured_at,free_transfers,bank_tenths,acquisition_squad_cost_tenths,source,evidence')
        .order('gameweek', { ascending: true })
        .order('captured_at', { ascending: false })
        .order('id', { ascending: false }),
      sb
        .from('fpl_actual_manager_decisions')
        .select('id,gameweek,captured_at,captain_player_id,vice_player_id,starting_xi,bench_order,chip,source,notes,correction_of_id')
        .order('gameweek', { ascending: true })
        .order('captured_at', { ascending: false })
        .order('id', { ascending: false }),
      sb
        .from('current_fpl_live_plan_v01')
        .select('id,gameweek,horizon,captured_at,publication_stage,publication_status,final_status,execution_authorized,prediction_run_id,manager_state_id,optimizer_run_id,autonomous_gate_run_id,plan,alternatives,research_inputs,blockers,freshness,layer_lineage,source,historical_forecasts_rewritten')
        .order('gameweek', { ascending: true }),
    ]);
    if (planError) throw planError;
    if (stateError) throw stateError;
    if (actualError) throw actualError;
    if (liveError) throw liveError;

    const availableGameweeks = [...new Set([...(plans || []), ...(states || []), ...(actualDecisions || []), ...(livePublications || [])]
      .map((row: any) => Number(row.gameweek))
      .filter((gw: number) => Number.isInteger(gw) && gw >= 1 && gw <= 38))]
      .sort((a, b) => a - b);

    const gameweek = requested >= 1 && requested <= 38
      ? requested
      : availableGameweeks.length
        ? availableGameweeks[availableGameweeks.length - 1]
        : null;

    const latestForGameweek = (rows: any[], gw: number | null) => gw == null
      ? null
      : rows
          .filter((row: any) => Number(row.gameweek) === gw)
          .sort((a: any, b: any) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime() || Number(b.id) - Number(a.id))[0] || null;

    const savedPlan = latestForGameweek(plans || [], gameweek);
    const managerState = latestForGameweek(states || [], gameweek);
    const actualManagerDecision = latestForGameweek(actualDecisions || [], gameweek);
    const liveRow = latestForGameweek(livePublications || [], gameweek);
    const livePlan = liveRow ? {
      ...liveRow,
      plan: {
        id: Number(liveRow.id),
        captured_at: liveRow.captured_at,
        risk_level: liveRow.publication_status === 'CONTESTED' ? 'HIGH' : liveRow.publication_status === 'FINAL' ? 'LOCKED' : 'MEDIUM',
        rationale: {
          publication_status: liveRow.publication_status,
          final_status: liveRow.final_status,
          freshness: liveRow.freshness,
          blockers: liveRow.blockers,
          layer_lineage: liveRow.layer_lineage,
        },
        ...(liveRow.plan || {}),
      },
    } : null;

    let readiness: any = null;
    let optimizerOrchestration: any = null;
    if (gameweek != null) {
      const statusRes = await sb.rpc('engine_diagnostics_status_v01', { p_gameweek: gameweek });
      if (statusRes.error) throw statusRes.error;
      readiness = statusRes.data?.p2_lineage ?? null;
      optimizerOrchestration = statusRes.data?.optimizer_orchestration ?? null;
    }

    return new Response(JSON.stringify({
      ok: true,
      gameweek,
      available_gameweeks: availableGameweeks,
      plan: savedPlan,
      saved_plan: savedPlan,
      live_plan: livePlan,
      research_only: livePlan?.research_inputs ?? null,
      manager_state: managerState,
      actual_manager_decision: actualManagerDecision,
      readiness,
      optimizer_orchestration: optimizerOrchestration,
      semantics: {
        live_plan_is_best_current_fully_evaluated_plan: true,
        live_plan_may_be_provisional_or_contested: true,
        live_plan_is_not_execution_authority_unless_execution_authorized_true: true,
        saved_plan_remains_final_execution_ledger: true,
        shadow_research_is_public_evidence_only: true,
        shadow_research_has_zero_numeric_production_effect: true,
        projection_readiness_is_not_decision_readiness: true,
        missing_manager_state_is_not_zero: true,
      },
    }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
