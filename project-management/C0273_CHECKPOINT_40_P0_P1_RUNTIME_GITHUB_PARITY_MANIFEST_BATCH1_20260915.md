# C0273 — Checkpoint 40: P0/P1 Runtime↔GitHub Parity Manifest — Batch 1

Date: 2026-09-15
Program: C0273 Pre-VPS Engine/App Stabilization
Status: PLANNING / READ-ONLY FORENSIC AUDIT
Production runtime/model effect: NONE

## Authorization boundary
User approved starting the P0/P1 parity audit. This checkpoint performs read-only production inspection and documentation only. It does not authorize deployment/redeployment, model/schema/cron/API/UI behavior change, promotion/retirement, planner execution, publication, or FPL account execution.

## 1. Live inventory freeze
Supabase currently exposes 51 active Edge Functions. P0/P1 audit scope is the authority/decision/data/publication chain rather than all research-only functions.

Initial P0/P1 manifest includes at minimum:
- sync-fpl-data v3
- refresh-availability-intelligence v4
- refresh-current-player-state v8
- sync-gw-results v5
- sync-fpl-manager-state v1
- sync-fpl-actual-decision v2
- fpl-full-pool-optimizer v15
- fpl-sequential-planner v6
- fpl-autonomous-gate v7
- fpl-manager-plan-api v8
- gameweek-status-api v8
- fpl-v3-workspace-api v3
- fpl-v3-actual-live-api v2
- refresh-forward-fixture-forecasts v1
- refresh-forward-enriched-predictions v2
and additional direct authority dependencies discovered during tracing.

## 2. Batch-1 exact/source-level findings

### A. fpl-autonomous-gate — MATCH OBSERVED
Live v7 starts with `VERSION='C0234_AUTONOMOUS_FINAL_GATE_V07_C0230_ADVISORY'`; GitHub main exposes the same marker and source opening. No divergence was observed in this bounded comparison. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

Important semantic defect remains independent of source parity: live v7 derives deadline as first kickoff minus 90 minutes. Source parity does not make that authority rule correct. CP23 official-deadline repair remains open.

### B. sync-gw-results — MATCH OBSERVED
Live v5 source and GitHub main opening are aligned in the inspected source. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

Existing semantic defect remains: `is_final` is based on fixtures being finished/finished_provisional and therefore is not official FPL scoring settlement finality. Source parity does not close CP06/CP23 result-settlement work.

### C. sync-fpl-actual-decision — MATCH OBSERVED
Live v2 and GitHub main expose the same implementation opening and official FPL API source contract. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

This remains one of the strongest truth implementations: official FPL deadline, exact 11+4, captain/vice integrity, immutable first complete locked capture.

### D. sync-fpl-data — MATCH OBSERVED
Live v3 and GitHub main expose the same `official_fpl_current_price_history` source marker and implementation opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### E. refresh-availability-intelligence — MATCH OBSERVED
Live v4 and GitHub main expose the same typed source opening. Live inspection reconfirms observation hashes include refresh-sensitive/provenance fields such as state_as_of/news plus decision-semantic fields. This supports CP34–36 separation of provenance identity from semantic generation identity. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

### F. sync-fpl-manager-state — MATCH OBSERVED
Live v1 and GitHub main expose the same public-FPL implementation opening. Disposition: `MATCH_OBSERVED_PENDING_NORMALIZED_HASH_MANIFEST`.

Semantic limitation remains: it can only mark current state PROVEN when public current-transfer visibility is available. It explicitly refuses to treat hidden pre-deadline locked picks as current private state. Parity therefore does not solve the manager-state authority gap.

### G. refresh-current-player-state — RECOVERED IN CP39
Live v8 / `0.4_xmins_regime_symmetric` was runtime-ahead and was recovered into GitHub main in CP39. Disposition remains `RECOVERED_SOURCE_PENDING_FULL_RELEASE_EQUIVALENCE`.

### H. fpl-sequential-planner — RECOVERED IN CP39
Live v6 / `C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE` was runtime-ahead and was recovered into GitHub main in CP39. Disposition remains `RECOVERED_SOURCE_PENDING_FULL_RELEASE_EQUIVALENCE`.

### I. fpl-full-pool-optimizer — CONFIRMED DIVERGENT / RUNTIME AHEAD
This is the first additional material mismatch found in P0/P1 Batch 1.

Live v15 is a role-safe adapter, beginning with:
- `ADAPTER_VERSION='C0240_ROLE_SAFE_OPTIMIZER_ADAPTER_V03_MANAGER_FT'`
- `CORE='fpl-full-pool-optimizer-core-v02'`
- it obtains effective free transfers from the latest manager-state snapshot unless explicitly supplied;
- it calls the separate core Edge function;
- it applies role-risk exclusions and recomputes safe outputs.

GitHub main at the canonical path still contains the older monolithic optimizer beginning with:
- `OPTIMIZER_VERSION = 'C0228_DISTRIBUTED_ENSEMBLE_OPTIMIZER_V02'`

Disposition: `RUNTIME_AHEAD_RECOVERABLE`, P0 source-recovery candidate.

This mismatch is particularly important because C0248 calls `fpl-full-pool-optimizer` to generate fresh wildcard/free-hit benchmark squads. Disaster recovery from current GitHub main would therefore not recreate the live decision chain.

No source recovery is performed in this checkpoint; this is documentation/read-only audit only.

## 3. Red-team conclusion
The parity program has already found a third material runtime-ahead component after the two CP39 recoveries. Therefore the previous concern was correct: fixing only the known player-state and planner mismatches was insufficient.

Do not infer correctness from parity. Three independent questions must remain separate:
1. Is GitHub source equal to deployed runtime?
2. Is that runtime semantically correct under current governance?
3. Is that runtime the canonical authority or only a supporting/challenger component?

Examples from this batch:
- autonomous gate may match source while still using the wrong deadline authority;
- result sync may match source while still overstating settlement finality;
- manager sync may match source while still being unable to observe hidden private pre-deadline state.

## 4. Next P0/P1 batch
Continue source comparison for:
- fpl-manager-plan-api
- gameweek-status-api
- fpl-v3-workspace-api
- fpl-v3-actual-live-api
- refresh-forward-fixture-forecasts
- refresh-forward-enriched-predictions
- fpl-full-pool-optimizer-core-v02
- direct C0248/C0234 dependencies (ensemble, structural, forward-management, OR utility, red-team, transfer-path evaluator) as needed.

Then produce a consolidated disposition matrix and identify all remaining `RUNTIME_AHEAD_RECOVERABLE`, `REPOSITORY_AHEAD`, `DIVERGENT`, or `RUNTIME_ONLY` artifacts before any VPS migration.

## Decision
P0/P1 parity audit has started. Batch 1 confirms several observed matches, preserves CP39 recoveries, and identifies `fpl-full-pool-optimizer` v15 as a new material runtime-ahead mismatch. No production change was made.

**Production deployment/redeployment, runtime/model/schema/cron/API/UI changes, promotion/retirement and FPL account execution remain explicitly approval-gated.**