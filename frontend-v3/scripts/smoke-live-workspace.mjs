import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceSource = await readFile(resolve(here, '../src/api/fplWorkspace.ts'), 'utf8');
const actualSource = await readFile(resolve(here, '../src/api/actualLive.ts'), 'utf8');
const workspaceEndpoint = workspaceSource.match(/V3_WORKSPACE_ENDPOINT\s*=\s*\n?\s*'([^']+)'/)?.[1];
const anonJwt = workspaceSource.match(/PUBLIC_SUPABASE_ANON_JWT\s*=\s*\n?\s*'([^']+)'/)?.[1];
const apiRoot = actualSource.match(/API_ROOT\s*=\s*'([^']+)'/)?.[1];

if (!workspaceEndpoint || !anonJwt || !apiRoot) {
  throw new Error('Could not resolve V3 public endpoint/auth configuration from shipped clients');
}

const headers = { Accept: 'application/json', Authorization: `Bearer ${anonJwt}`, apikey: anonJwt };
const [workspaceResponse, actualResponse] = await Promise.all([
  fetch(workspaceEndpoint, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) }),
  fetch(`${apiRoot}/fpl-v3-actual-live-api`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) }),
]);

if (!workspaceResponse.ok) throw new Error(`Live V3 workspace returned HTTP ${workspaceResponse.status}`);
if (!actualResponse.ok) throw new Error(`Live V3 actual endpoint returned HTTP ${actualResponse.status}`);

const [payload, actualPayload] = await Promise.all([workspaceResponse.json(), actualResponse.json()]);
const failures = [];

if (payload?.ok !== true) failures.push('workspace payload.ok is not true');
if (payload?.contract_version !== 'fpl_v3_workspace_v02_player_evidence') failures.push(`unexpected workspace contract_version=${payload?.contract_version ?? 'missing'}`);
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
if (Array.isArray(actualXi) && Array.isArray(actualBench) && new Set([...actualXi, ...actualBench].map(Number)).size !== 15) failures.push('actual submitted squad is not 15 unique players');
if (actualPayload?.semantics?.engine_recommendation_is_never_used_as_actual !== true) failures.push('actual-live endpoint does not explicitly forbid engine substitution');
if (actualPayload?.semantics?.provisional_live_points_are_not_final !== true) failures.push('actual-live endpoint does not distinguish provisional from final points');
const actualRows = actualPayload?.player_actuals;
if (!Array.isArray(actualRows) || actualRows.length !== 15) failures.push(`expected 15 actual result rows, got ${Array.isArray(actualRows) ? actualRows.length : 'missing'}`);
if (Array.isArray(actualRows) && actualRows.some((row) => !['FINAL', 'LIVE', 'PARTIAL', 'PENDING'].includes(row?.status))) failures.push('actual result row has invalid status');

if (failures.length) {
  console.error('C0257 live public-client truth smoke: BLOCKED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const phaseCounts = Object.fromEntries(['FUTURE', 'LIVE', 'FINISHED'].map((phase) => [phase, fixtures.filter((fixture) => fixture.phase === phase).length]));
const resultCounts = Object.fromEntries(['FINAL', 'LIVE', 'PARTIAL', 'PENDING'].map((status) => [status, actualRows.filter((row) => row.status === status).length]));
console.log('C0257 live public-client truth smoke: PASS');
console.log(JSON.stringify({
  gameweek: payload.gameweek,
  lifecycle: payload.lifecycle,
  workspace_actual: payload.actual.verification_status,
  actual_live_status: actualPayload.actual.verification_status,
  actual_source: actualPayload.actual.source,
  actual_xi: actualXi.length,
  actual_bench: actualBench.length,
  execution_authorized: payload.recommendation?.execution_authorized ?? null,
  recommendation_evidence_rows: evidence.length,
  fixture_phases: phaseCounts,
  actual_result_states: resultCounts,
  historical_forecasts_rewritten: payload.semantics.historical_forecasts_rewritten,
}));
