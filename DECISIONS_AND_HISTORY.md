# Football Intelligence Engine — Decisions & History

_Last updated: 2026-09-09 (Dubai) — through C0237/C0238 always-live publication closeout_

This file preserves the durable decisions that govern the current engine. Detailed pre-C0213 reasoning and the former long-form ledger remain permanently available in Git history; this live file is intentionally concise so it can remain operationally current.

## 1. Product objective

The engine has two linked objectives:

1. maximize future FPL decision quality and season-long rank;
2. find football-context market mispricing that survives chronology-safe validation.

The betting objective is not to imitate bookmakers. The FPL objective is not to maximize last week’s points or follow ownership. Both products optimize future decision quality under uncertainty.

## 2. Immutable chronology and data rules

- Historical FPL and betting forecasts are append-only.
- Fixture/model intelligence may change only before kickoff and freezes at kickoff.
- Completed-match evidence may update future decisions only.
- Retrospective replay/shadow evidence must be labelled retrospective.
- Missing data is not zero.
- Source/capture/evidence-cutoff provenance is mandatory where material.
- Negative experiments are preserved; they are not retuned until they look successful.
- A model is never promoted from one GW, one statistic, one favorable scoreline or one model output.

## 3. FPL Decision-Control doctrine

Every meaningful FPL decision must:

- evaluate the full available player pool, not just the current 15;
- begin from expected minutes/start probability and tactical role;
- use projected points plus haul/blank distributions, Defensive Contributions, bonus and clean-sheet probabilities;
- optimize the legal £100m squad, including marginal value per £1m, club-slot cost, bench leakage, future transfer burden and structural flexibility;
- keep an explosive-exception bucket outside the top-xMins filter;
- compare every proposed transfer against ROLL/no action;
- optimize captaincy separately;
- apply ownership/EO only as game-theory context, not as proof of quality;
- classify statistically indistinguishable options as `NO_MEANINGFUL_EDGE` rather than rank noise.

Captaincy and transfer recommendations require multiple independent supporting signals, including at least one structural signal such as expected minutes, tactical role or fixture quality.

## 4. Frozen manager decisions are not rewritten

Historical automated snapshots and actual manager actions are separate records. Later model improvements do not rewrite what was recommended or actually done at the time.

The saved manager plan is authoritative only when it exists and was allowed by the current decision-readiness contract.

## 5. Projection readiness is not decision readiness — C0213

A projection can be numerically valid while a final decision must remain blocked.

C0213 formalized the decision lineage:

`RESULTS → FPL_CURRENT_DATA → REALIZED_ROLES → PLAYER_STATE → TEAM_STATE → TACTICAL_FIXTURE_STATE → FIXTURE_PROJECTION → PLAYER_PROJECTION → POINT_DISTRIBUTION → MANAGER_STATE → FULL_POOL_OPTIMIZER → DECISION_READINESS → SAVED_MANAGER_PLAN`

Fail-closed guards protect automated decision snapshots and future manager-plan writes. Numerical projections may continue refreshing while decision output is red.

## 6. Two selector systems are intentionally distinct

The engine contains:

1. an automated current-15 selector inside the projection core;
2. a full-pool £100m optimizer feeding an externally adjudicated manager plan.

These are not duplicate implementations of the same problem.

The full-pool optimizer is canonical but read-only. It cannot save `fpl_manager_plans` and cannot bypass manager state, Noise-Control or Decision-Control.

## 7. C0212 realized role is factual state, not a new coefficient

The realized-role layer exists because nominal FPL position can differ materially from actual tactical deployment.

C0212/C0213 decision:

- realized tactical role is production factual state;
- it changes categorical role semantics;
- the existing quantitative base profile remains the numerical profile;
- `numeric_role_uplift_enabled=false`;
- no ad-hoc “attacking role” multiplier is added merely because one player was observed higher up the pitch.

A future numerical realized-role effect requires a separate chronology-safe model and promotion gate.

## 8. Static dependency proof is insufficient — C0213 P4

C0213 found that code/reference graphs alone cannot prove that a factor materially affects production.

Permanent decision:

Every component with `production_effect_enabled=true` requires current behavioral proof using the correct effect class:

- numeric perturbation;
- state selection;
- output lineage; or
- runtime probe.

PASS evidence is bound to the current component definition hash. A production definition/runtime change invalidates the old PASS until deliberately reproven.

Current proof suite: `private.run_c0213_behavioral_consumption_tests_v01(gw)`.

## 9. Implemented intelligence requires a consumer or evaluator — C0213 P4

“We built it” is not equivalent to “the engine uses it.”

Any implemented model-effect tracker item must resolve to an explicit pathway:

- production consumer;
- research evaluator/promotion gate;
- research infrastructure;
- blocked external source;
- program umbrella; or
- reconciled legacy evidence.

The global tracker governance audit now fails when governed implemented intelligence has no such contract.

## 10. Production-effect provenance must be inspectable

A current FPL prediction should expose why it differs from baseline rather than simply return xPts.

C0213 P4 therefore records/exposes:

- baseline prediction lineage;
- team/opponent lambdas;
- player goal/assist lambdas;
- DC/bonus probabilities;
- point-distribution version;
- fixture generator and C0159/C0166 lineage;
- signed C0166 adjustments;
- explicit realized-role numeric-effect policy.

This is an audit surface, not permission to rewrite historical forecasts.

## 11. Canonical production FPL core

The active production core was previously misleadingly named `generate_upcoming_fpl_snapshot_c0160_legacy_v01`.

C0213 renamed the same function object in-place to:

`private.generate_upcoming_fpl_projection_core_v01`

The OID and behavior were preserved. `private.generate_upcoming_fpl_snapshot_v01` remains the coverage/orchestration wrapper rather than a competing model core.

## 12. Continuous projection coverage is fail-closed

C0204 learned from a newly added FPL player that a one-time “all players covered” proof is insufficient.

Permanent decision:

- genuinely new players may be narrowly governed into pending exclusion when both state and baseline are absent and there is no prior eligibility history;
- restored/existing players, missing-state-only, missing-baseline-only and mass regressions are not auto-excluded;
- unresolved projection gaps block generation.

## 13. Tactical calibrated-selector bug and fix

The v0.1.1 tactical wrapper called v0.1 first, creating a timestamp race that could cause raw v0.1 rows to win a latest-row selector.

Permanent decision:

For the same match/team/signal, current tactical state explicitly prefers v0.1.1. “Latest timestamp” alone is not a valid version selector when wrappers intentionally generate parent rows first.

## 14. C0147 is shadow; its bounded derivative is production

C0147 tactical matchup predictive intelligence remains SHADOW/research.

C0159 consumes a bounded derivative of that evidence. C0166 then adds bounded symmetric season-aware evidence.

Therefore:

- raw C0147 is not production merely because production code reads its results;
- C0159/C0166 are the production-effect layers;
- C0166 evidence adjustment remains capped at `|0.04|` log-lambda per team;
- target-fixture actual leakage is prohibited.

## 15. Full-pool optimizer decision

C0213 closed the absence of a canonical full-player-pool optimizer by deploying `fpl-full-pool-optimizer`.

Permanent design:

- top ~300 by xMins plus explosive exceptions;
- position-specific candidate pools;
- legal 2/5/5/3 squad, max three per club, ≤£100m;
- weighted 3–5 GW horizon;
- bench leakage;
- transfer cost/opportunity cost;
- manager-state-aware inputs;
- deterministic search with explicit `search_exact=false` when approximate;
- model-error margin before declaring an edge;
- read-only, no direct manager-plan writes.

The optimizer’s first engineering proof itself returned `NO_MEANINGFUL_EDGE_WITHIN_MODEL_ERROR`, which is an acceptable and desirable output.

## 16. Retired runtimes must actually be retired

C0213 found 19 lifecycle-RETIRED external components still physically active.

Permanent decision:

- a component is not considered consolidated simply because the registry labels it RETIRED;
- retirement requires consumer proof, rollback/source evidence and physical runtime reconciliation;
- broad destructive pruning is not acceptable for targeted retirement.

All 19 were reconciled to inactive/deleted; active retired external deployment count is now zero.

## 17. Research promotion discipline

### Effect-family gate — C0125

Registered effect-family promotion requires, at minimum:

- ≥50 genuine VALIDATION observations;
- ≥30 genuine TEST observations;
- ≥0.005 absolute Brier improvement in both;
- no log-loss regression;
- process MAE within 2%;
- zero integrity violations;
- manual review;
- no automatic activation.

Historical evidence alone cannot pass.

### A0005

GW2 VALIDATION and GW3 TEST are now complete. The cohort is eligible for a formal review, but per-variant sample is only 10 fixtures in each split and test-set improvements are small. The correct next action is formal no-retuning adjudication, not coefficient hunting.

### W0002

W0002 was precommitted before A0005 outcomes and remains independent:

- GW4 VALIDATION;
- GW5 TEST;
- model effect disabled.

It must not be altered to fit A0005 results.

## 18. Preserved negative/rejected model evidence

The project intentionally retains negative findings, including:

- regularized residual effects where non-zero fits failed the dual-metric gate → shrink to zero;
- nonlinear response curves without cross-window stability → reject;
- hierarchical team residual shrinkage without cross-window stability → reject;
- context-specific venue blends without robust stability → reject;
- generic schedule/fatigue heuristic → reject;
- mean-preserving mismatch mixture → reject on training likelihood without opening the holdout to rescue it;
- generic Chaos-only high-score dispersion → no meaningful edge;
- eSOT chaos activation → no robust high-tail edge;
- generic flank xPts adjustment → off after holdout collapse.

Do not retune rejected models merely because later anecdotal examples look favorable.

## 19. Correct Score / market edge discipline

A likely score is not automatically a value bet. Value requires current market comparison, de-vig awareness, raw model probability and chronology-safe pricing.

C0034 remains blocked until a genuine third Correct Score source produces normalized pre-kickoff selections.

C0120/E0007 remains research-only. The current sample is too sparse for a value claim.

## 20. Spatial/tactical truth must match evidence quality

Do not call event/proxy data “true pressing,” “line height,” “high line vs pace” or exact left/right geometry without evidence capable of supporting those claims.

C0082 remains blocked on genuine spatial/tracking access. C0202 exact-side inference may be used as a shadow label where validated, but generic flank-weakness xPts effects remain off until the registered forward gate passes.

## 21. UI/presentation cannot imply model promotion

Presentation may summarize research, but:

- research diagnostics must not masquerade as production semantics;
- missing values must display as missing, never fake zero;
- historical prediction and actual manager action must remain visually distinct;
- weak/no-edge fixtures must not be forced into categorical calls;
- UI success does not prove model correctness, and backend health does not prove browser rendering.

`frontend-v2` is the preferred interface. Primary-route legacy retirement remains a separate C0176 decision with rollback protection.

## 22. Security/performance cleanup is separate from model tuning

New objects are hardened at creation. Existing advisor debt is tracked separately so architecture/model work does not silently mutate legacy access paths or drop indexes without evidence.

Current known backlog includes older mutable-search-path functions, `pg_net` in public, many service-path RLS/no-policy INFOs, unindexed FKs and unused-index candidates.

“Unused” is not sufficient evidence to remove an index.

## 23. C0213 closure decision

C0213 is considered structurally complete only when all of the following are true:

- architecture registry integrity green;
- no required capability missing/contradictory;
- no active duplicate cron target;
- no active retired external runtime;
- all production-effect components have current definition-bound behavioral PASS;
- implemented governed model-effect tracker work has a consumer/evaluator contract;
- prediction-level effect provenance is available;
- canonical architecture/model/pipeline/consumption docs are current;
- strict repository CI and live Pages integrity pass;
- tracker is marked Completed/Verified only after those proofs.

## 24. Immediate post-C0213 sequence

After formal C0213 verification:

1. clear remaining GW4 readiness blockers — realized-role mapping, C0167 evidence consistency, current 3-GW projections, manager state and exact-signature full-pool optimizer;
2. adjudicate completed A0005 without retuning;
3. only when GW4 decision readiness is green, execute the full FPL Decision-Control process;
4. save a GW4 manager plan only if a robust edge exists; otherwise ROLL/no-action remains a valid outcome.

This sequence prevents architecture cleanup, research evaluation and live FPL decisioning from contaminating each other.

## 25. C0219 — bounded projection cadence outranks live timestamp parity

C0217 changed the projection system from “regenerate whenever an upstream timestamp is newer” to a deliberate storage cadence: one current-GW snapshot per 24 hours, one final T−2h refresh, and frozen GW+1/GW+2 baselines until promotion.

A 2026-09-08 production audit found an architectural contradiction: the older C0213 optimizer readiness/orchestration path still required projection timestamps to be newer than frequently refreshed C0166/player-state timestamps and directly called the raw projection generator when that condition failed. This bypassed C0217 and produced a second immutable projection run for each of GW4/GW5/GW6.

Permanent decision:

- **C0217 is the sole controller of projection-write cadence.**
- Optimizer readiness must distinguish upstream completeness, snapshot completeness, cadence validity and upstream drift.
- Upstream completeness remains fail-closed; missing evidence is never treated as zero.
- A complete current-GW frozen snapshot is optimizer-valid while it satisfies the 24-hour cadence, and inside the final window it must come from the T−2h window.
- A complete GW+1/GW+2 frozen baseline remains optimizer-valid until that GW is promoted.
- Newer upstream state is exposed as `upstream_drifted_since_snapshot`; it is evidence for the next permitted refresh, not an independent permission to write.
- The optimizer orchestrator may invoke the C0217 cadence controller, but it may not bypass it by calling the raw FPL snapshot generator directly.
- Accidentally duplicated frozen forecasts are preserved as immutable evidence; do not delete or rewrite them merely to restore storage neatness.
- This contract repair is reliability-only and does not justify changing a manager plan.

C0219 verification reused projection runs 1334/1335/1336 and optimizer run 5 without changing the optimizer input signature. A repeated orchestration check left GW4/GW5/GW6 projection-run counts at 2/2/2, proving the direct duplicate-writer path was removed. Plan 10 remained unchanged.

## 26. C0237 — “not final” must not mean “publish no plan”

The C0226–C0234 stack originally coupled final authorization with current-plan serving too tightly. C0234 could correctly refuse final authorization, while the serving layer then exposed no newer plan even though the optimizer, structural ensemble, uncertainty, forward-management, rank-control and red-team layers had already produced enough evidence to identify the best current option.

Permanent decision:

- **The active Gameweek always publishes the best current fully evaluated plan whenever every required layer has run.**
- Publication timing and authorization are separate dimensions: `PRE_FINAL`/`FINAL` is the stage; `PROVISIONAL`/`CONTESTED`/`FINAL` is the status.
- A negative layer may make a plan `CONTESTED`; it must not make the plan disappear.
- A skipped required layer blocks publication. Negative results are allowed; skipped mandatory evaluation is not.
- The mandatory C0237 chain is the canonical full-pool optimizer plus C0227, C0228, C0229, C0230, C0231, C0232, C0233 and C0234.
- C0230 and other shadow/research evidence may be surfaced publicly as research input, but `numeric_production_effect=false` unless separately promoted under its own chronology-safe gate.
- `public.fpl_manager_plans` remains the separate final/execution ledger. A live C0237 publication does not become execution authority merely because it is visible.
- Only a C0234-backed final publication may set `execution_authorized=true`.
- Current publications are append-only and may be superseded by later fully evaluated evidence without rewriting earlier publications.

The persisted publication invariant is:

`ALL_REQUIRED_LAYERS_EVALUATED_NEGATIVE_RESULTS_ALLOWED_SKIPPED_LAYERS_FORBIDDEN`

The first strict C0237 GW4 publication is `PRE_FINAL / CONTESTED / execution_authorized=false`, proving the engine can expose its best current answer without pretending the final gate is green.

## 27. C0238 — deployment reliability fixes must preserve strict product gates

The C0237 UI release exposed a GitHub-hosted-runner infrastructure failure: Playwright’s `--with-deps` apt refresh was contaminated by a stale Google Chrome repository carried by the Ubuntu image. The first mitigation removed only legacy `.list` files; a later runner image used deb822 `.sources`, so the failure correctly recurred.

Permanent decision:

- Hosted-runner package-source defects may be isolated narrowly when they are unrelated to the application under test.
- The fix must target the offending source by repository content, not by assuming one filename format.
- The workflow must fail closed if the offending source is still present.
- Chromium/Playwright E2E, accessibility, deterministic visual review, artifact verification, Pages deployment and live integrity checks must remain enabled; infrastructure trouble is not permission to bypass them.
- Intentional UI contract changes require the semantic E2E contract and reviewed visual baselines to change together. Old tests must not force obsolete product semantics, but coverage must not be weakened merely to obtain a green build.

C0238 therefore removes only apt-source entries that actually reference `dl.google.com/linux/chrome`, regardless of `.list`/`.sources` format, then verifies none remain before Playwright installs Chromium. Product HEAD `98956d091d768dee640fb4c869f654ad49a2f24c` subsequently passed the complete strict Pages pipeline in workflow `34387458458`, including live root and `/v2/` integrity.