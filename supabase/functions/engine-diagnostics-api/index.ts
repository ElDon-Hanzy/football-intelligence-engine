import { createClient } from 'supabase';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return new Response(JSON.stringify({ ok: false, error: 'GET required' }), { status: 405, headers: cors });
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('Missing Supabase service credential');
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const u = new URL(req.url);
    const requested = Number(u.searchParams.get('gw') || 0);

    const { data: latestRunRows, error: latestRunError } = await sb.from('gameweek_prediction_runs')
      .select('id,model_version_id,gameweek,generated_at,deadline_at,run_type,frozen,excluded_from_backtest,metadata')
      .order('gameweek', { ascending: false }).order('generated_at', { ascending: false }).limit(20);
    if (latestRunError) throw latestRunError;
    const defaultGw = latestRunRows?.[0]?.gameweek ? Number(latestRunRows[0].gameweek) : 1;
    const gameweek = requested >= 1 && requested <= 38 ? requested : defaultGw;

    const [activeRes, runRes, fixtureRes, statusRes] = await Promise.all([
      sb.from('model_versions').select('id,version,description,config,is_active,created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('gameweek_prediction_runs').select('id,model_version_id,gameweek,generated_at,deadline_at,run_type,frozen,excluded_from_backtest,metadata').eq('gameweek', gameweek).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('current_production_fixture_prediction_v01').select('id,match_id,gameweek,model_version_id,captured_at,source_snapshot').eq('gameweek', gameweek).order('captured_at', { ascending: false }).order('id', { ascending: false }),
      sb.rpc('engine_diagnostics_status_v01', { p_gameweek: gameweek }),
    ]);
    for (const result of [activeRes, runRes, fixtureRes, statusRes]) if (result.error) throw result.error;

    const fixtureRows = fixtureRes.data || [];
    const fixtureLayers = [...new Set(fixtureRows.map((row: any) => row?.source_snapshot?.change_id).filter(Boolean))];
    const latestFixture = fixtureRows[0] || null;
    const status: any = statusRes.data || {};

    return new Response(JSON.stringify({
      ok: true,
      gameweek,
      generated_at: new Date().toISOString(),
      active_model: activeRes.data || null,
      latest_prediction_run: runRes.data || null,
      production_fixture_layer: {
        fixtures: fixtureRows.length,
        latest_snapshot_id: latestFixture?.id ?? null,
        latest_captured_at: latestFixture?.captured_at ?? null,
        change_ids: fixtureLayers,
      },
      governance: status.governance || null,
      decision_evidence_audit: status.decision_evidence_audit || null,
      production_evidence_audit: status.production_evidence_audit || null,
      experiments: { A0005: status.a0005 || null, W0002: status.w0002 || null },
      source_health: {
        zero_cost: status.zero_cost || null,
        fotmob_metrics: status.fotmob_metrics || null,
        physical_load: status.physical_load || null,
      },
      semantics: {
        research_statuses_are_not_production_effects: true,
        missing_is_not_zero: true,
        immutable_historical_forecasts_preserved: true,
      },
    }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
