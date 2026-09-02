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

    const { data: latestRunRows, error: latestRunError } = await sb
      .from('gameweek_prediction_runs')
      .select('id,model_version_id,gameweek,generated_at,deadline_at,run_type,frozen,excluded_from_backtest,metadata')
      .order('gameweek', { ascending: false })
      .order('generated_at', { ascending: false })
      .limit(20);
    if (latestRunError) throw latestRunError;
    const defaultGw = latestRunRows?.[0]?.gameweek ? Number(latestRunRows[0].gameweek) : 1;
    const gameweek = requested >= 1 && requested <= 38 ? requested : defaultGw;

    const p = sb.schema('private');
    const [activeRes, runRes, fixtureRes, governanceRes, c0167Res, c0166Res, a0005Res, w0002Res, sourceRes, fotmobRes, physicalRes] = await Promise.all([
      sb.from('model_versions').select('id,version,description,config,is_active,created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('gameweek_prediction_runs').select('id,model_version_id,gameweek,generated_at,deadline_at,run_type,frozen,excluded_from_backtest,metadata').eq('gameweek', gameweek).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('current_production_fixture_prediction_v01').select('id,match_id,gameweek,model_version_id,captured_at,source_snapshot').eq('gameweek', gameweek).order('captured_at', { ascending: false }).order('id', { ascending: false }),
      p.rpc('audit_change_tracker_governance_v01'),
      p.rpc('c0167_decision_evidence_audit_v01', { p_gameweek: gameweek }),
      p.rpc('c0166_production_evidence_audit_v01', { p_gameweek: gameweek }),
      p.rpc('a0005_forward_validation_status_v01'),
      p.rpc('w0002_forward_validation_status_v01'),
      p.rpc('c0139_zero_cost_source_status_v01'),
      p.rpc('c0139_fotmob_metric_status_v01'),
      p.rpc('c0140_team_physical_load_status_v01'),
    ]);

    const required = [activeRes, runRes, fixtureRes, governanceRes, c0167Res, c0166Res, a0005Res, w0002Res, sourceRes, fotmobRes, physicalRes];
    for (const result of required) if (result.error) throw result.error;

    const fixtureRows = fixtureRes.data || [];
    const fixtureLayers = [...new Set(fixtureRows.map((row: any) => row?.source_snapshot?.change_id).filter(Boolean))];
    const latestFixture = fixtureRows[0] || null;

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
      governance: governanceRes.data || null,
      decision_evidence_audit: c0167Res.data || null,
      production_evidence_audit: c0166Res.data || null,
      experiments: {
        A0005: a0005Res.data || null,
        W0002: w0002Res.data || null,
      },
      source_health: {
        zero_cost: sourceRes.data || null,
        fotmob_metrics: fotmobRes.data || null,
        physical_load: physicalRes.data || null,
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
