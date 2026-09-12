import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const apiSource = await readFile(resolve(here, '../src/api/fplWorkspace.ts'), 'utf8');
const endpoint = apiSource.match(/V3_WORKSPACE_ENDPOINT\s*=\s*\n?\s*'([^']+)'/)?.[1];
const anonJwt = apiSource.match(/PUBLIC_SUPABASE_ANON_JWT\s*=\s*\n?\s*'([^']+)'/)?.[1];

if (!endpoint || !anonJwt) {
  throw new Error('Could not resolve the public V3 endpoint/auth configuration from fplWorkspace.ts');
}

const response = await fetch(endpoint, {
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${anonJwt}`,
    apikey: anonJwt,
  },
  cache: 'no-store',
  signal: AbortSignal.timeout(15000),
});

if (!response.ok) {
  throw new Error(`Live V3 workspace returned HTTP ${response.status}`);
}

const payload = await response.json();
const failures = [];

if (payload?.ok !== true) failures.push('payload.ok is not true');
if (payload?.contract_version !== 'fpl_v3_workspace_v02_player_evidence') {
  failures.push(`unexpected contract_version=${payload?.contract_version ?? 'missing'}`);
}
if (!['PRE_DEADLINE', 'POST_DEADLINE_ACTIVE', 'GW_COMPLETE'].includes(payload?.lifecycle)) {
  failures.push(`unexpected lifecycle=${payload?.lifecycle ?? 'missing'}`);
}
if (!['VERIFIED', 'NOT_VERIFIED'].includes(payload?.actual?.verification_status)) {
  failures.push(`unexpected actual verification=${payload?.actual?.verification_status ?? 'missing'}`);
}
if (payload?.recommendation && typeof payload.recommendation.execution_authorized !== 'boolean') {
  failures.push('recommendation.execution_authorized is not boolean');
}
if (
  payload?.recommendation?.publication_status === 'FINAL' &&
  payload?.recommendation?.execution_authorized === false &&
  payload?.recommendation?.authorization_label !== 'FINAL_FROZEN_NOT_AUTHORIZED'
) {
  failures.push('FINAL non-authorized recommendation has the wrong authorization label');
}
if (payload?.semantics?.historical_forecasts_rewritten !== false) {
  failures.push('historical_forecasts_rewritten is not explicitly false');
}
const evidence = payload?.decision_snapshot?.player_evidence;
if (!Array.isArray(evidence) || evidence.length !== 15) {
  failures.push(`expected 15 frozen player evidence rows, got ${Array.isArray(evidence) ? evidence.length : 'missing'}`);
}
const fixtures = payload?.realized?.fixtures;
if (!Array.isArray(fixtures) || fixtures.length !== 10) {
  failures.push(`expected 10 current-GW fixtures, got ${Array.isArray(fixtures) ? fixtures.length : 'missing'}`);
}
if (Array.isArray(fixtures) && fixtures.some((fixture) => !['FUTURE', 'LIVE', 'FINISHED'].includes(fixture?.phase))) {
  failures.push('one or more fixtures has an invalid explicit phase');
}

if (failures.length) {
  console.error('C0255 live public-client workspace smoke: BLOCKED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const phaseCounts = Object.fromEntries(
  ['FUTURE', 'LIVE', 'FINISHED'].map((phase) => [phase, fixtures.filter((fixture) => fixture.phase === phase).length]),
);
console.log('C0255 live public-client workspace smoke: PASS');
console.log(JSON.stringify({
  gameweek: payload.gameweek,
  lifecycle: payload.lifecycle,
  actual: payload.actual.verification_status,
  execution_authorized: payload.recommendation?.execution_authorized ?? null,
  authorization_label: payload.recommendation?.authorization_label ?? null,
  player_evidence_count: evidence.length,
  fixture_phases: phaseCounts,
  historical_forecasts_rewritten: payload.semantics.historical_forecasts_rewritten,
}));
