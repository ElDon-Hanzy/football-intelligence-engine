# C0240 — Final Adversarial Optimization Layer

_Date: 2026-09-11 (Dubai)_

## Purpose

Add a mandatory final adversarial optimization layer between the existing autonomous decision stack and C0234 final authorization. The layer exists to prevent the first optimizer/ensemble winner from being treated as the final answer before its individual slots, alternative squad structures, and disputed tactical/price allocations have been attacked.

This change is motivated by the GW4 review, where repeated manual attacks materially improved the proposed squad after the existing optimizer, structural-control and C0233 red-team layers had already produced a preferred plan. The failure mode is architectural, not a one-player exception: C0233 currently attacks one raw family with one structural challenger and therefore cannot prove local slot stability or broad structural stability.

## Permanent decision rule

The canonical path becomes:

`... FULL-POOL OPTIMIZER → C0227 UNCERTAINTY → C0228 STRUCTURAL ENSEMBLE → C0229 STRUCTURAL CONTROL → C0230 SHADOW REGIME → C0231 FORWARD MANAGEMENT → C0232 OR UTILITY → C0233 FIRST-PASS RED TEAM → C0240 FINAL ADVERSARIAL OPTIMIZATION LOOP → C0234 FINAL AUTHORIZATION → C0237 PUBLICATION`

C0234 may not return `FINAL_AUTONOMOUS_DECISION` unless the latest C0240 run is complete, lineage-consistent, and `STABLE_NO_MEANINGFUL_EDGE`.

C0240 is a Decision-Control layer. It must not rewrite player xPts or historical forecasts.

## Scope

### Stage A — Attack proposed XV

For every player in the provisional 15-man preferred squad:

1. select at least one and at most three same-position challengers from the canonical viable pool;
2. include price-compatible challengers first;
3. permit more-expensive structural challengers only when the funding consequence is explicit;
4. compare expected minutes, start probability, role family, horizon xPts, current-GW xPts, blank/haul tails, penalties/set pieces where relevant, defensive contribution where relevant, ownership/EO only as downstream leverage evidence, and price;
5. evaluate the challenger at squad level, not by isolated player delta;
6. label the incumbent `SURVIVES`, `CONTESTED`, or `DEFEATED`.

A player may not be protected because it appears in the optimizer winner, is highly owned, plays for a strong club, or scored recently.

### Stage B — Attack materially different squad structures

Generate and evaluate 8–12 legal structures spanning materially different capital allocations rather than cosmetic player swaps. At minimum test:

- balanced value;
- premium-forward allocation;
- dual-premium-mid allocation;
- high-minutes/durable allocation;
- cheap-defence/reinvest allocation;
- premium-defender/no-premium-defender alternatives;
- three-playing-forward versus one/two-forward-heavy XI structures;
- strong-bench versus minimal-bench structures;
- cash-in-bank / premium-access structure;
- concentrated versus diversified club exposure where legal.

Every structure uses identical projection runs, horizon weights, bench weight, transfer-cost assumptions and manager budget. ROLL/no-action remains mandatory.

### Stage C — Attack specific roles / allocations

For every contested or defeated slot, create explicit head-to-head allocation tests. Examples include premium-vs-value players, penalty-taker premium versus cheaper open-play creator, high-xMins lower-ceiling player versus lower-xMins explosive player, and attacking defender versus centre-back floor.

The test must include the opportunity cost of the price difference. A head-to-head result is invalid if it compares player xPts without re-spending or preserving the released cash in the full squad.

### Stage D — Attack transfer pathway

For the best resulting structures compare legal reachability through:

- ROLL;
- 1 FT;
- 2 FT;
- 3 FT or current available FT count;
- hits only when explicitly net-positive after cost and uncertainty;
- staged future moves;
- Wildcard only when chip availability and season-level opportunity cost are green.

A theoretical best XV is not preferred if its path destroys the edge through hits, future burden or loss of flexibility.

### Stage E — Sensitivity / assumption attack

Stress the winner and strongest challenger under reasonable uncertainty. At minimum perturb:

- expected minutes / start probability;
- tactical-role confidence;
- attacking/defensive involvement inputs where current sample is small;
- penalty/set-piece assumptions when uncertain;
- fixture/team-strength assumptions within the existing model-error framework.

C0240 does not manufacture arbitrary numerical adjustments to xPts. Sensitivity is a decision-validity test using C0227 uncertainty and explicit scenario attenuation around the fixed projections.

### Stage F — Re-optimize and iterate

Any robustly winning challenger becomes the new provisional squad and forces a complete re-optimization of all 15 slots. Then Stages A–E repeat.

The loop terminates only when:

- all 15 current slots have been attacked;
- required structure families were evaluated;
- every material contested allocation was head-to-head tested;
- transfer-pathway comparison was completed;
- sensitivity testing was completed;
- a full repeated cycle finds no new robust squad-level improvement greater than the model-error threshold.

Maximum cycle count must be bounded to prevent runaway execution. If convergence is not reached within the bound, C0240 returns `UNSTABLE_ADVERSARIAL_LOOP` and C0234 must refuse final authorization.

## Outputs

Persist append-only `public.fpl_final_adversarial_runs` with at minimum:

- gameweek / horizon;
- upstream lineage IDs and signatures;
- manager-state ID and projection-run IDs;
- provisional input squad;
- per-slot challenger audit for all 15 players;
- structure-attack candidates and family signatures;
- role/allocation head-to-heads;
- transfer-path audit;
- sensitivity scenarios;
- cycle history;
- survivor squad;
- stability status;
- model-error margin;
- blockers;
- `historical_forecasts_rewritten=false`.

Canonical statuses:

- `STABLE_NO_MEANINGFUL_EDGE`
- `IMPROVED_AND_STABLE`
- `CONTESTED_WITHIN_MODEL_ERROR`
- `UNSTABLE_ADVERSARIAL_LOOP`
- `INCOMPLETE_REQUIRED_ATTACK`

For final authorization, `IMPROVED_AND_STABLE` is normalized to the stable survivor and counts as stable only after the improvement has been re-run through a complete no-new-edge cycle. In persisted final-gate evidence, the required status is therefore `STABLE_NO_MEANINGFUL_EDGE` for the final survivor.

## Implementation design

### 1. Canonical optimizer constrained-evaluation support

Extend `fpl-full-pool-optimizer` with fail-closed optional constraints used only by C0240:

- `required_player_ids`
- `excluded_player_ids`
- `max_transfer_count`
- `adversarial_context`

Constraints must validate position, club, budget, pool presence and projection/role completeness. Existing calls without these options must remain behaviorally identical.

The optimizer remains the single source of legal squad evaluation; C0240 must not build a second scoring formula.

### 2. New C0240 orchestrator

Add `fpl-final-adversarial-optimizer` to:

- consume latest lineage-consistent C0227–C0233 state;
- call the canonical optimizer repeatedly with controlled constraints/structure seeds;
- build per-slot challenger sets automatically from xMins, horizon score, role, tail, price and uncertainty;
- run material structure families;
- run role/allocation head-to-heads;
- compare transfer pathways;
- perform C0227-driven sensitivity adjudication;
- iterate until stable or bounded-cycle failure;
- persist append-only C0240 result.

### 3. C0234 integration

Add mandatory gate `FINAL_ADVERSARIAL_OPTIMIZATION` to C0234. It passes only if:

- a C0240 row exists for the same gameweek/horizon;
- upstream lineage/signatures match the latest evaluated stack;
- all 15 slots were attacked;
- mandatory structure families were attacked;
- required role/allocation tests are complete;
- ROLL and transfer-path comparison are complete;
- sensitivity test is complete;
- convergence is stable;
- final survivor has no challenger outside the model-error band after a full repeated cycle.

C0234 remains read-only and fail-closed.

### 4. C0237 / UI serving

Expose C0240 lineage/status/blockers in C0237 publication metadata. PRE_FINAL publication remains allowed when C0240 is contested or incomplete, but `execution_authorized` must remain false. FINAL requires C0240 stability.

No UI redesign is required for C0240 unless contract tests show a missing status field is user-relevant; serving should expose the status first.

## Noise-Control rules

1. No challenger wins from recent FPL points alone.
2. A winning move requires multiple independent signals, including at least one structural signal: xMins/start security, tactical role, fixture quality, penalties/set pieces, or squad flexibility.
3. A player-level advantage that disappears after full-squad reallocation is not an edge.
4. If reasonable sensitivity reverses the decision or the squad-level gap is within normal model error, classify `NO MEANINGFUL EDGE` / contested and do not force the move.
5. Ownership cannot create xPts and cannot force a differential.
6. Missing data is not zero.
7. Historical projections remain immutable.

## Regression cases to encode

C0240 tests must include deterministic fixtures reproducing the classes of mistakes found in GW4:

- expensive defender appears optimal locally but loses after reinvestment;
- low-minute attacking midfielder protected by team/fixture prior loses to a higher-minutes challenger after squad reoptimization;
- more expensive premium midfielder loses on squad allocation despite stronger penalty role because cheaper creator plus reinvestment wins;
- forward with higher historical/realized finishing loses to a value forward only if the value edge survives explicit uncertainty/regression sensitivity;
- player-level challenger wins individually but loses after funding cost, proving no squad-level edge;
- near-equivalent structures remain equivalent and do not get falsely ranked;
- ROLL remains a valid winner;
- no final authorization when one of 15 slot audits is missing;
- no final authorization when convergence bound is hit.

GW4 names used during discovery (Tzolis/Schade/Rogers/Palmer, Gabriel/Guéhi, Isak/Thiago, Dalot/Van Hecke) are regression evidence only and must not be hard-coded into production selection logic.

## Governance and acceptance criteria

C0240 can be marked Completed / Verified only when all are true:

1. Plan is committed before behavior implementation.
2. New append-only DB relation and status/readiness functions are migrated.
3. Canonical optimizer supports fail-closed constrained evaluation without changing default behavior.
4. C0240 orchestrator exists and is deployed.
5. C0234 requires C0240 stability before FINAL.
6. C0237 exposes C0240 lineage/status while retaining provisional publication semantics.
7. Deterministic regression tests cover all cases above.
8. Existing C0213 behavioral contracts remain green.
9. Change-tracker governance reports zero violations.
10. Historical forecasts are unchanged.
11. No shadow/research model is promoted numerically.
12. Strict CI / typecheck / tests / build pass for changed repository surfaces.
13. Current GW can be run through C0240 in PRE_FINAL mode without external FPL execution.

## Rollback / safety

- New C0240 tables are append-only decision evidence.
- C0234 integration is fail-closed: if C0240 fails, FINAL is refused but C0237 may still publish the best evaluated PRE_FINAL plan.
- Existing optimizer behavior must remain unchanged when constrained-evaluation inputs are absent.
- No external FPL transfer or chip execution is added.
- No secret/token material is committed.

## Decision

Implement C0240 as a permanent mandatory final adversarial optimization layer. The engine's initial optimized squad is henceforth a provisional hypothesis. A squad becomes eligible for FINAL only after a repeated adversarial cycle can no longer find a robust squad-level improvement outside normal model error.