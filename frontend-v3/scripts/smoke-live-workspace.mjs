import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceSource = await readFile(resolve(here, '../src/api/fplWorkspace.ts'), 'utf8');
const actualSource = await readFile(resolve(here, '../src/api/actualLive.ts'), 'utf8');
const workspaceEndpoint = workspaceSource.match(/V3_WORKSPACE_ENDPOINT\s*=\s*\n?\s*'([^']+)'/)?.[1];
const anonJwt = workspaceSource.match(/PUBLIC_SUPABASE_ANON_JWT\s*=\s*\n?\s*'([^']+)'/)?.[1];
const actualAnonJwt = actualSource.match(/PUBLIC_SUPABASE_ANON_JWT\s*=\s*\n?\s*'([^']+)'/)?.[1];
const apiRoot = actualSource.match(/API_ROOT\s*=\s*'([^']+)'/)?.[1];

if (!workspaceEndpoint || !anonJwt || !actualAnonJwt || !apiRoot) {
  throw new Error('Could not resolve V3 public endpoint/auth configuration from shipped clients');
}
if (actualAnonJwt !== anonJwt) {
  throw new Error('V3 public auth drift: workspace and actual-live clients do not ship the same anon credential');
}
const authPayload = JSON.parse(Buffer.from(anonJwt.split('.')[1] ?? '', 'base64url').toString('utf8'));
const projectRef = new URL(apiRoot).hostname.split('.')[0];
if (authPayload?.iss !== 'supabase' || authPayload?.ref !== projectRef || authPayload?.role !== 'anon') {
  throw new Error(`V3 public auth claims invalid: iss=${authPayload?.iss ?? 'missing'} ref=${authPayload?.ref ?? 'missing'} role=${authPayload?.role ?? 'missing'}`);
}

const headers = { Accept: 'application/json', Authorization: `Bearer ${anonJwt}`, apikey: anonJwt };
const timedFetch = async (url) => {
  const started = performance.now();
  // Cold Edge Function starts can exceed 15 seconds while still satisfying the
  // page's bounded two-request concurrency policy. Keep semantic validation
  // strict, but allow the production smoke enough time to receive headers.
  const response = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(30000) });
  const headersMs = performance.now() - started;
  const payload = await response.json();
  return { response, payload, headersMs, totalMs: performance.now() - started };
};

// C0269 reliability contract: never cold-start catalog, workspace and actual-live all at t0.
// The current page starts catalog + workspace together, proves their Gameweek identity,
// then requests actual/live explicitly for that resolved Gameweek.
const currentPageStarted = performance.now();
const initialStarted = performance.now();
const [catalogCall, workspaceCall] = await Promise.all([
  timedFetch(`${apiRoot}/gameweek-status-api`),
  timedFetch(workspaceEndpoint),
]);
const initialParallelMs = performance.now() - initialStarted;

if (!catalogCall.response.ok) throw new Error(`Live Gameweek catalog returned HTTP ${catalogCall.response.status}`);
if (!workspaceCall.response.ok) throw new Error(`Default-page V3 workspace returned HTTP ${workspaceCall.response.status}`);

const currentGameweek = Number(catalogCall.payload?.live_gameweek);
if (!Number.isInteger(currentGameweek) || currentGameweek < 1 || currentGameweek > 38) {
  throw new Error(`Live Gameweek catalog returned invalid live_gameweek=${catalogCall.payload?.live_gameweek ?? 'missing'}`);
}
if (workspaceCall.payload?.gameweek !== currentGameweek) {
  throw new Error(`Default workspace GW ${workspaceCall.payload?.gameweek ?? 'missing'} does not match live catalog GW ${currentGameweek}`);
}

const actualCall = await timedFetch(`${apiRoot}/fpl-v3-actual-live-api?gw=${currentGameweek}`);
const currentPageTotalMs = performance.now() - currentPageStarted;
if (!actualCall.response.ok) throw new Error(`Live V3 actual endpoint returned HTTP ${actualCall.response.status}`);

const payload = workspaceCall.payload;
const actualPayload = actualCall.payload;
const failures = [];

if (payload?.ok !== true) failures.push('workspace payload.ok is not true');
if (payload?.contract_version !== 'fpl_v3_workspace_v02_player_evidence') failures.push(`unexpected workspace contract_version=${payload?.contract_version ?? 'missing'}`);
if (payload?.gameweek !== currentGameweek) failures.push(`workspace GW ${payload?.gameweek ?? 'missing'} does not match catalog GW ${currentGameweek}`);
if (!['PRE_DEADLINE', 'POST_DEADLINE_ACTIVE', 'GW_COMPLETE'].includes(payload?.lifecycle)) failures.push(`unexpected lifecycle=${payload?.lifecycle ?? 'missing'}`);
if (!['VERIFIED', 'NOT_VERIFIED'].includes(payload?.actual?.verification_status)) failures.push(`unexpected workspace actual verification=${payload?.actual?.verification_status ?? 'missing'}`);
if (payload?.recommendation && typeof payload.recommendation.execution_authorized !== 'boolean') failures.push('recommendation.execution_authorized is not boolean');
if (payload?.recommendation?.publication_status === 'FINAL' && payload?.recommendation?.execution_authorized === false && payload?.recommendation?.authorization_label !== 'FINAL_FROZEN_NOT_AUTHORIZED') failures.push('FINAL non-authorized recommendation has the wrong authorization label');
if (payload?.semantics?.historical_forecasts_rewritten !== false) failures.push('historical_forecasts_rewritten is not explicitly false');

const evidence = payload?.decision_snapshot?.player_evidence;
const recommendationSquad = payload?.recommendation?.squad;
if (!Array.isArray(evidence) || evidence.length < 15) failures.push(`expected at least 15 frozen/missing-evidence rows across current lanes, got ${Array.isArray(evidence) ? evidence.length : 'missing'}`);
if (!Array.isArray(recommendationSquad) || recommendationSquad.length !== 15) failures.push(`expected 15 recommendation squad players, got ${Array.isArray(recommendationSquad) ? recommendationSquad.length : 'missing'}`);
if (Array.isArray(evidence) && Array.isArray(recommendationSquad)) {
  const evidenceIds = new Set(evidence.map((row) => Number(row?.player_id)));
  if (recommendationSquad.some((player) => !evidenceIds.has(Number(player?.player_id)))) failures.push('frozen evidence does not cover every recommendation player');
}

const fixtures = payload?.realized?.fixtures;
if (!Array.isArray(fixtures) || fixtures.length !== 10) failures.push(`expected 10 current-GW fixtures, got ${Array.isArray(fixtures) ? fixtures.length : 'missing'}`);
if (Array.isArray(fixtures) && fixtures.some((fixture) => !['FUTURE', 'LIVE', 'FINISHED'].includes(fixture?.phase))) failures.push('one or more fixtures has an invalid explicit phase');

if (actualPayload?.ok !== true) failures.push('actual-live payload.ok is not true');
if (actualPayload?.contract_version !== 'fpl_v3_actual_live_v01') failures.push(`unexpected actual-live contract_version=${actualPayload?.contract_version ?? 'missing'}`);
if (actualPayload?.gameweek !== payload?.gameweek) failures.push(`actual-live GW ${actualPayload?.gameweek ?? 'missing'} does not match workspace GW ${payload?.gameweek ?? 'missing'}`);
if (actualPayload?.actual?.verification_status !== 'VERIFIED') failures.push(`expected post-lock actual VERIFIED, got ${actualPayload?.actual?.verification_status ?? 'missing'}`);
const actualXi = actualPayload?.actual?.starting_xi;
const actualBench = actualPayload?.actual?.bench_order;
if (!Array.isArray(actualXi) || actualXi.length !== 11) failures.push(`expected actual XI=11, got ${Array.isArray(actualXi) ? actualXi.length : 'missing'}`);
if (!Array.isArray(actualBench) || actualBench.length !== 4) failures.push(`expected actual bench=4, got ${Array.isArray(actualBench) ? actualBench.length : 'missing'}`);
const actualSquad = Array.isArray(actualXi) && Array.isArray(actualBench) ? [...actualXi, ...actualBench].map(Number) : [];
if (actualSquad.length === 15 && new Set(actualSquad).size !== 15) failures.push('actual submitted squad is not 15 unique players');
if (actualPayload?.semantics?.engine_recommendation_is_never_used_as_actual !== true) failures.push('actual-live endpoint does not explicitly forbid engine substitution');
if (actualPayload?.semantics?.provisional_live_points_are_not_final !== true) failures.push('actual-live endpoint does not distinguish provisional from final points');
if (actualPayload?.semantics?.scoring_scope !== 'RAW_FPL_PLAYER_POINTS_FOR_ENGINE_AND_ACTUAL_SCENARIO_SCORING') failures.push(`unexpected scoring_scope=${actualPayload?.semantics?.scoring_scope ?? 'missing'}`);
if (actualPayload?.semantics?.player_scope !== 'ACTUAL_PRIMARY_PLUS_ENGINE_ACTUAL_SCENARIO_UNION') failures.push(`unexpected player_scope=${actualPayload?.semantics?.player_scope ?? 'missing'}`);

const actualPlayers = actualPayload?.players;
const actualRows = actualPayload?.player_actuals;
if (!Array.isArray(actualPlayers) || actualPlayers.length !== 15) failures.push(`expected 15 primary actual players, got ${Array.isArray(actualPlayers) ? actualPlayers.length : 'missing'}`);
if (!Array.isArray(actualRows) || actualRows.length !== 15) failures.push(`expected 15 primary actual result rows, got ${Array.isArray(actualRows) ? actualRows.length : 'missing'}`);
if (Array.isArray(actualPlayers) && actualSquad.length === 15) {
  const primaryIds = new Set(actualPlayers.map((row) => Number(row?.player_id)));
  if (actualSquad.some((id) => !primaryIds.has(id)) || primaryIds.size !== 15) failures.push('primary players are not exactly the verified submitted squad');
}
if (Array.isArray(actualRows) && actualRows.some((row) => !['FINAL', 'LIVE', 'PARTIAL', 'PENDING'].includes(row?.status))) failures.push('primary actual result row has invalid status');

const scenarioPlayers = actualPayload?.scenario_players;
const scenarioRows = actualPayload?.scenario_player_actuals;
if (!Array.isArray(scenarioPlayers) || scenarioPlayers.length < 15) failures.push(`expected scenario player union >=15, got ${Array.isArray(scenarioPlayers) ? scenarioPlayers.length : 'missing'}`);
if (!Array.isArray(scenarioRows) || scenarioRows.length < 15) failures.push(`expected scenario actual union >=15, got ${Array.isArray(scenarioRows) ? scenarioRows.length : 'missing'}`);
if (Array.isArray(scenarioRows) && scenarioRows.some((row) => !['FINAL', 'LIVE', 'PARTIAL', 'PENDING'].includes(row?.status))) failures.push('scenario result row has invalid status');
if (Array.isArray(scenarioPlayers) && Array.isArray(recommendationSquad) && actualSquad.length === 15) {
  const scenarioIds = new Set(scenarioPlayers.map((row) => Number(row?.player_id)));
  const engineIds = recommendationSquad.map((player) => Number(player?.player_id));
  if (actualSquad.some((id) => !scenarioIds.has(id))) failures.push('scenario union does not cover every actual submitted player');
  if (engineIds.some((id) => !scenarioIds.has(id))) failures.push('scenario union does not cover every engine recommendation player');
  const expectedUnionSize = new Set([...actualSquad, ...engineIds]).size;
  if (scenarioIds.size !== expectedUnionSize) failures.push(`scenario union size ${scenarioIds.size} does not match expected engine+actual union ${expectedUnionSize}`);
}
if (Array.isArray(scenarioPlayers) && Array.isArray(scenarioRows)) {
  const scenarioPlayerIds = new Set(scenarioPlayers.map((row) => Number(row?.player_id)));
  const scenarioRowIds = new Set(scenarioRows.map((row) => Number(row?.player_id)));
  if (scenarioPlayerIds.size !== scenarioRowIds.size || [...scenarioPlayerIds].some((id) => !scenarioRowIds.has(id))) failures.push('scenario player metadata/result unions do not match');
}

if (failures.length) {
  console.error('C0271 live public-client scenario smoke: BLOCKED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const phaseCounts = Object.fromEntries(['FUTURE', 'LIVE', 'FINISHED'].map((phase) => [phase, fixtures.filter((fixture) => fixture.phase === phase).length]));
const resultCounts = Object.fromEntries(['FINAL', 'LIVE', 'PARTIAL', 'PENDING'].map((status) => [status, actualRows.filter((row) => row.status === status).length]));
const scenarioResultCounts = Object.fromEntries(['FINAL', 'LIVE', 'PARTIAL', 'PENDING'].map((status) => [status, scenarioRows.filter((row) => row.status === status).length]));
console.log('C0271 live public-client scenario smoke: PASS');
console.log(JSON.stringify({
  gameweek: payload.gameweek,
  lifecycle: payload.lifecycle,
  workspace_actual: payload.actual.verification_status,
  actual_live_status: actualPayload.actual.verification_status,
  actual_source: actualPayload.actual.source,
  actual_xi: actualXi.length,
  actual_bench: actualBench.length,
  primary_actual_players: actualPlayers.length,
  scenario_union_players: scenarioPlayers.length,
  execution_authorized: payload.recommendation?.execution_authorized ?? null,
  recommendation_evidence_rows: evidence.length,
  fixture_phases: phaseCounts,
  actual_result_states: resultCounts,
  scenario_result_states: scenarioResultCounts,
  latency_ms: {
    catalog_total: Math.round(catalogCall.totalMs),
    workspace_total: Math.round(workspaceCall.totalMs),
    initial_parallel_total: Math.round(initialParallelMs),
    actual_total: Math.round(actualCall.totalMs),
    current_page_total: Math.round(currentPageTotalMs),
  },
  concurrency_policy: 'MAX_TWO_COLD_EDGE_REQUESTS',
  historical_forecasts_rewritten: payload.semantics.historical_forecasts_rewritten,
}));
