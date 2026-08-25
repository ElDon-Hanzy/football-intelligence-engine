# C0135 — Always-available upcoming-GW FPL snapshot pipeline

Date: 2026-08-25
Status: Completed / Verified
Priority: Critical
Parent: C0049

## Incident

The production FPL page returned `FPL data unavailable — No frozen snapshot for GW2` even though GW2 fixture, player-state and fixture-intelligence data already existed.

Root cause: `fpl-api` intentionally serves only frozen rows from `gameweek_prediction_runs`, but production had no GW2 `gameweek_prediction_runs` row and no scheduled job that generated FPL player projections / decision snapshots. Existing cron jobs refreshed results, availability, current player state, fixture forecasts and enriched research intelligence, but none created the FPL decision-layer snapshot.

The API error was therefore correct for the existing schema; the missing component was the upstream FPL snapshot pipeline.

## Design decision

Do not weaken `fpl-api` to serve mutable or unfrozen state.

Instead, use **rolling immutable pre-deadline snapshots**:
- each generated snapshot is frozen immediately and cannot be mutated;
- while the deadline remains in the future, a newer immutable snapshot may supersede the older one for display;
- the latest frozen snapshot is what the existing API already selects;
- once the GW deadline passes, generation for that GW is refused;
- the scheduler automatically targets the next gameweek whose deadline is still in the future.

This preserves chronology while guaranteeing that at least the immediately upcoming GW is available.

For C0135 the deadline is derived as `first kickoff - 90 minutes`, with the derivation recorded in run metadata.

## Production implementation

Supabase migrations:
- `c0135_upcoming_fpl_snapshot_pipeline_v01`
- `c0135_fpl_projection_alias_fix`

Production functions:
- `private.generate_upcoming_fpl_snapshot_v01(integer, boolean)`
- `private.fpl_upcoming_snapshot_status_v01()`
- `private.logit_shift_v01(numeric, numeric)`
- `private.block_frozen_fpl_snapshot_mutation_v01()`

Scheduler:
- pg_cron job `football_intelligence_fpl_upcoming_snapshot`
- job id 13 at verification
- cadence `*/5 * * * *`
- generator itself suppresses redundant work when the latest snapshot is <4 hours old;
- in the final 30 minutes before the derived deadline it permits a final close-to-deadline refresh;
- immediately after a deadline, the target selector rolls to the next future-deadline GW.

## Projection lineage

The rolling layer does **not** activate unvalidated enriched research effects.

It uses:
- active FPL model lineage `0.1.3`;
- latest chronology-safe player state (expected minutes, start probability, xG90, xA90, DC probability);
- latest structural pre-kickoff fixture lambdas from `fixture_prediction_snapshots`;
- the player's previous active-model distribution as the player-specific baseline shape.

Goal/assist event intensities are re-expressed from the player-specific previous distribution and current state. Clean-sheet, DC and bonus components are updated conservatively from current fixture/player evidence. Expected points are moved by component deltas rather than replacing missing values with zero. Tail probabilities are shifted from the previous player-specific distribution and forced to remain monotonic (`P20 <= P15 <= P10 <= P5`).

Every prediction stores `state_as_of`, `fixture_cutoff`, baseline prediction id/time, target deadline and C0135 provenance in `features`.

## Decision layer

For the active 15-man squad the generator:
- requires exactly 2 GKP / 5 DEF / 5 MID / 3 FWD;
- enumerates all legal FPL formations;
- chooses the legal XI with maximum expected points;
- orders the remaining outfield bench by expected points;
- chooses captain/vice from the XI using the haul-aware score:
  `xPts + 2*P10 + 4*P15 + 6*P20 - 0.5*Pblank`.

## First verified production run — GW2

Run id: **5**
Generated: **2026-08-25 17:57:27.81555 UTC**
Derived deadline: **2026-08-28 17:30 UTC**
First kickoff: **2026-08-28 19:00 UTC**
Model version: **0.1.3**

Coverage:
- 600 player predictions
- 0 null core xPts/xMin rows
- 0 tail-order violations
- 0 chronology violations
- 15-player squad present
- 11-player XI present
- 4-player bench present

Decision snapshot:
- formation: **3-5-2**
- XI expected points: **49.428**
- captain: player 29 (Tzolis)
- vice-captain: player 471 (Mbeumo)

## API verification

A direct production request to `fpl-api?gw=2` returned **HTTP 200** with:
- `ok=true`
- GW2 in `available_gameweeks`
- `prediction_run_id=5`
- `run_type=pre_deadline`
- `excluded_from_backtest=false`
- model version `0.1.3`
- full decision payload.

The previous `No frozen snapshot for GW2` condition is therefore resolved in production.

## Immutability / integrity verification

Negative mutation tests were run against run 5:
- frozen `gameweek_prediction_runs` update: blocked;
- tied `model_predictions` update: blocked;
- frozen `decision_snapshots` update: blocked.

The scheduler was called again immediately after generation and correctly returned `SKIPPED_FRESH`, proving the freshness guard prevents redundant snapshots.

Post-change audits:
- change-tracker governance: 0 violations;
- A0005: 140 frozen predictions, 0 evaluations, 0 integrity violations;
- W0002: 20 fixtures, 0 evaluations, 0 integrity violations.

No historical forecast was rewritten. C0135 changes only the operational FPL upcoming-GW snapshot/decision pipeline.