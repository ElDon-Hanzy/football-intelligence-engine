# C0277 — Seasonal Chip Option-Value Optimizer — Plan — 2026-09-16

## Why this program exists
GW5 PRE-FINAL exposed a real decision gap. C0248 can compare current-GW chip roots inside its exact sequential horizon, but the production control cannot yet prove that using a chip now dominates preserving that chip for its best later first-half opportunity. Current C0248/C0276 chip controls correctly fail closed when future decision-grade coverage is absent.

This is a demonstrated decision failure, not a request for another overlapping model. C0277 must extend the existing C0248 sequential authority and C0276 control plane rather than create a competing selector.

## Objective
For every remaining chip, continuously estimate the value of PLAY NOW versus PRESERVE FOR FUTURE USE, jointly across legal chip calendars, and authorize a chip only when its current use has a robust edge after uncertainty, future option value, one-chip-per-GW competition, squad-path effects and Noise-Control.

The engine must refuse to name a single best Gameweek when evidence does not support that precision.

## Non-goals / immutable constraints
- Do not fabricate exact future player xPts/xMins where decision-grade projections do not exist.
- Do not mechanically extrapolate current player projections through GW19.
- Do not create a second production selected-path authority beside C0248.
- Do not bypass C0234/C0276 final authorization.
- Do not execute transfers or chips.
- Do not rewrite historical forecasts.
- Do not alter C0265 production behavior.
- Do not increase C0240 concurrency as part of this program.
- Preserve ROLL/no-action comparison and model-error `NO_MEANINGFUL_EDGE` semantics.

## Architecture
C0277 is a supporting option-value layer consumed by C0248/C0276.

### Layer A — exact numerical horizon
For Gameweeks with decision-grade player projections, evaluate legal branches under the same utility function and manager-state lineage:
- NONE
- WILDCARD
- FREE_HIT
- BENCH_BOOST
- TRIPLE_CAPTAIN

Each branch must carry the complete sequential state: XV, XI, captain/vice, bank, selling values, FT inventory/accrual, hits, bench/autosub value, expected minutes, roles, price feasibility, future transfer burden and downstream squad state.

### Layer B — probabilistic forecast horizon
For later weeks where exact player forecasts are not decision-grade, model distributions rather than fake point estimates. Inputs may include:
- fixture-strength distributions by player profile/position;
- expected captaincy ceiling distributions;
- squad-reset pressure / likely transfer demand;
- rotation and congestion risk;
- likely bench strength;
- fixture-rearrangement/BGW/DGW probability;
- price/flexibility stress;
- information uncertainty and value of waiting.

All such evidence must be chronology-safe and explicitly tagged as probabilistic/structural, never exact player projection.

### Layer C — structural horizon
Across the remaining chip-validity window, track:
- confirmed/probable blank and double structures;
- cup/calendar dependencies;
- international breaks;
- congestion clusters;
- transfer-window information events;
- chip expiry;
- one-chip-per-GW collision risk;
- information value of delaying commitment.

Structural evidence may reserve option value without pretending to know exact future player points.

## Joint chip-calendar optimization
Do not optimize each chip independently. Solve the legal chip calendar jointly because chips compete for Gameweeks and Wildcard changes later squad states.

Target quantity:
`max expected season/rank utility over legal {chip, gameweek} schedules`

Current-use value must be measured as:
`optimal utility with chip used now - optimal utility with chip preserved`

not merely:
`current chip branch - current no-chip branch`.

The joint optimizer must model chip expiry and one-chip-per-GW constraints explicitly.

## Chip-specific option-value contracts
### Wildcard
Immediate squad improvement + avoided future transfers + FT preservation/accrual + captaincy access + structural flexibility - value of a later reset - information value lost by acting now - price/flexibility fragility.

### Free Hit
One-week optimized squad advantage - best plausible later asymmetric-week value - collision value with other chips.

### Bench Boost
Incremental legal bench score - normal autosub/resilience value - transfers/funds required to create the bench - post-chip bench leakage - better future multi-fixture opportunity value.

### Triple Captain
Incremental captain distribution, emphasizing expected minutes, penalties/set pieces, P(10+), P(15+), P(20+), haul tail and blank risk, versus the best plausible retained future captaincy opportunity.

## Noise-Control and authorization classes
Every current chip recommendation must survive reasonable perturbations to projections, xMins, role assumptions, fixture weights, FT value, price movement, future option value and structural-window assumptions.

Allowed decision classes:
- `ROBUST_PLAY` — current use wins across plausible scenarios by more than model error.
- `LEAN_PLAY` — usually wins but depends on material assumptions; wait for later information/final refresh.
- `NO_MEANINGFUL_EDGE` — current use and preserve distributions overlap within model error.
- `PRESERVE` — future option value consistently dominates current use.
- `UNRESOLVED_FAIL_CLOSED` — evidence insufficient to authorize use.

Only `ROBUST_PLAY`, after all existing final gates, may authorize a production chip recommendation. `LEAN_PLAY` is PRE-FINAL evidence only.

## Implementation stages
### C0277-P0 — audit and integration repair
1. Reproduce current `V06_PLANNER_RUN_MISSING` / `BOUNDED_OPTION_INPUT_NOT_READY` state.
2. Determine whether the cause is stale production-selected-run lookup, candidate/production lineage semantics, or a genuine missing input.
3. Repair same-lineage integration without weakening promotion rules.
4. Prove C0248 current chip/terminal/price controls bind to one canonical run.

Exit: exact-horizon chip inputs are healthy or a documented fail-closed blocker remains.

### C0277-P1 — reservation-value evidence contract
1. Define exact vs probabilistic vs structural evidence tiers.
2. Build chronology-safe future opportunity features.
3. Define uncertainty distributions and calibration provenance.
4. Add information-value-of-waiting and chip-expiry semantics.

Exit: future reservation value can be estimated without fabricated player precision.

### C0277-P2 — joint chip-calendar optimizer
1. Enumerate legal chip schedules within bounded beam/dynamic-programming search.
2. Include one-chip-per-GW competition and chip expiry.
3. Propagate Wildcard squad state into later BB/TC/FH opportunities.
4. Compare PLAY NOW against optimal PRESERVE branch.
5. Keep computation bounded and deterministic/reproducible for identical inputs.

Exit: each chip has a current-use distribution, retained-option distribution and joint-calendar opportunity cost.

### C0277-P3 — Noise-Control / sensitivity / red team
1. Perturb xPts/xMins/roles/fixtures/FT value/prices/future option assumptions.
2. Require multiple independent signals including a structural signal.
3. Detect recommendation instability.
4. Classify into ROBUST_PLAY / LEAN_PLAY / NO_MEANINGFUL_EDGE / PRESERVE / UNRESOLVED_FAIL_CLOSED.

Exit: no chip can be promoted from a single model output or narrow assumption set.

### C0277-P4 — chronology-safe backtest and calibration
Replay prior seasons/weeks using only information available before each historical deadline. Measure:
- incremental points/utility versus preserve;
- calibration of option-value intervals;
- false-positive chip plays;
- chip-expiry waste;
- sensitivity stability;
- rank-utility impact where available.

No hindsight fixture/player leakage.

Exit: predefined acceptance thresholds met or model remains shadow-only.

### C0277-P5 — C0248/C0276 integration
1. C0248 remains selected-path authority.
2. C0277 supplies governed chip option-value evidence and authorization class.
3. C0276 treats unresolved/lean chip state as governance wait, not retryable failure.
4. C0234/final publication require identical lineage and `ROBUST_PLAY` for chip activation.
5. PRE-FINAL UI may display ranges/windows/confidence without implying final authorization.

Exit: end-to-end fault/retry/invalidation tests pass and no external execution path exists.

## Required outputs
For each remaining chip expose:
- current exact-horizon incremental value;
- retained future option-value distribution;
- break-even future value;
- current best window or window set;
- confidence/uncertainty;
- collision with other chips;
- sensitivity stability;
- authorization class;
- evidence tier and projection/fixture lineage.

A single `best_gameweek` is nullable and must remain null when uncertainty does not justify it.

## Acceptance criteria
- No fabricated GW9+ player precision.
- Same-lineage chip inputs verified.
- Joint, not independent, chip schedule optimization.
- Current use compared against optimal preserve branch.
- Wildcard downstream squad-state effects modeled.
- One-chip-per-GW and expiry modeled.
- Noise-Control perturbation required before `ROBUST_PLAY`.
- Chronology-safe backtest passes predefined thresholds.
- Historical forecasts remain append-only.
- C0248 remains sole selected-path authority.
- C0276/C0234 remain fail closed.
- No transfers/chips externally executed.
- C0265 untouched.

## Current baseline discovered before implementation
On 2026-09-16 the live structural chip control reports:
- exact numerical projection coverage: GW5-GW8;
- structural-only coverage: GW9-GW19;
- no confirmed nonstandard BGW/DGW window;
- `season_best_chip_weeks_resolved=false`;
- current chip timing input: `V06_PLANNER_RUN_MISSING`;
- C0276 bounded option value: `BOUNDED_OPTION_INPUT_NOT_READY`.

Therefore GW5 Wildcard may have a strong raw exact-horizon edge, but its season-level opportunity-cost gate is not currently authorized. Until C0277 proves otherwise, chip use remains fail closed.

## First action in the next conversation
Start with P0. Inspect live Supabase and current GitHub implementation independently. Reproduce the missing-input condition, trace exact candidate/production run lineage, and repair only the demonstrated integration defect. Do not begin P1 until P0 is verified.