# Football Intelligence Engine — Decisions & History

_Last reconciled: 2026-09-17 (Dubai) — C0278 whole-engine closeout_

This file preserves durable decisions governing the current engine. Detailed historical reasoning remains in Git history and project-management closeouts. Current runtime evidence outranks stale historical descriptions; historical decisions are preserved rather than rewritten.

## 1. Product objective and immutable rules

The engine has two linked objectives: maximize future FPL decision quality/season-long rank, and identify football-context market mispricing that survives chronology-safe validation.

Permanent rules:

- Historical FPL/betting forecasts are append-only.
- Completed evidence changes future decisions only.
- Missing data is unknown, never silently zero.
- Actual submitted team, engine recommendation, frozen decision snapshot and realized outcome are separate records.
- Research/shadow output has zero numeric production effect until promoted through its registered chronology-safe gate.
- No model is promoted from one GW, one statistic, one favorable scoreline or one model output.
- Every meaningful FPL action compares with ROLL/no action.
- Expected minutes, tactical role and fixture quality are structural gates.
- Statistically indistinguishable options are `NO_MEANINGFUL_EDGE` rather than ranked noise.

## 2. C0213 — architecture and behavioral governance

C0213 established the machine-readable component inventory, dependency graph, lifecycle/effect separation, tracker consumption contracts and definition-hash-bound behavioral proof.

Permanent decisions:

- Static code/reference dependency is insufficient proof of production effect.
- Every `production_effect_enabled=true` component requires current behavioral evidence using its appropriate effect class.
- A production definition/runtime change invalidates its old proof until reproven.
- Implemented model-effect work requires an explicit production consumer, evaluator/promotion gate, research-infrastructure pathway, blocked-source pathway or reconciled program contract.
- Prediction-level effect provenance must expose baseline and adjusted lineage without rewriting history.
- Lifecycle RETIRED is not enough: active external runtime must actually be reconciled/removed with rollback evidence.

C0278 current proof: 14 production-effect components, 14/14 PASS, 19/19 required capabilities, 99/99 tracker consumption coverage, zero duplicate active cron targets and zero active retired external deployments.

## 3. Projection and chronology decisions

`private.generate_upcoming_fpl_projection_core_v01` is the canonical production player-projection core. Coverage/orchestration wrappers are not competing model cores.

C0217/C0219 established bounded projection cadence: upstream drift alone is not permission to write a new immutable snapshot. Current-GW cadence and final-window refresh rules govern writes; future baselines remain frozen according to their cadence contract. Accidental historical duplicate forecasts are preserved rather than deleted.

C0274 hard-event invalidation is a subordinate safety primitive for severe confirmed availability changes. It may trigger a new immutable projection snapshot; it is not an independent decision authority and never rewrites historical forecasts.

## 4. Tactical / role decisions

Realized tactical role is factual production state, not an ad-hoc attacking multiplier. Numeric role uplift remains disabled unless separately validated and promoted.

Raw C0147 tactical matchup research remains shadow. Bounded C0159/C0166 derivatives are the promoted fixture-consumption path. C0202 generic numeric flank xPts was rejected; only validated HIGH-confidence categorical attack-side metadata may enter factual role/fixture state, with zero numeric xPts effect.

Spatial/proxy evidence must never be described as true tracking geometry when the source cannot support that claim.

## 5. Full-pool optimizer and Noise-Control

The full-pool optimizer evaluates the legal squad problem using the available player pool, xMins/explosive candidate controls, legal formation/club/budget constraints, XI/captaincy value, bench leakage, transfer cost, manager economics, horizon value and model-error margins.

It is a squad optimizer, not final authorization. A proposed action must survive uncertainty, structural-role gates and multiple independent signals. If reasonable assumptions flip the action, plausible scenarios do not consistently favor it, or its edge sits within normal model error, the engine must not force the move.

## 6. C0248 — sole sequential selected-path authority

The earlier downstream architecture accumulated overlapping decision layers and static-horizon limitations. C0248 consolidated the state-transition problem.

Permanent decision:

- C0248 is the **sole canonical sequential selected-path authority**.
- It evaluates reachable multi-GW states including squad, bank, purchase/selling economics, FT inventory, chip inventory and evolving information.
- ROLL is always an explicit action.
- Future FTs, affordability, future transfer burden, flexibility and state-dependent bench value are part of path evaluation.
- C0240 remains supporting adversarial benchmark evidence and is **not** a second normal-transfer selector.
- C0230 remains advisory/nonblocking with zero numeric production effect.
- Captaincy and serious named challengers must be consistent with the selected path.

## 7. C0276 — bounded autonomous control plane

C0276 operationalizes the canonical chain without creating another optimizer:

`FIXTURE_STATE + PLAYER_STATE → PLAYER_PROJECTION → UNCERTAINTY → OPTIMIZER → ENSEMBLE → STRUCTURAL → FORWARD → OR_UTILITY → RED_TEAM → ADVERSARIAL → CAPTAINCY → SEQUENTIAL → FINAL_GATE → PUBLICATION`.

Permanent decisions:

- Exact upstream lineage is mandatory.
- Heavy asynchronous results are accepted only when newer than their request and aligned to exact required lineage.
- An old successful artifact cannot satisfy a newer dispatch.
- Retries are bounded; exhausted or governance-blocked states fail closed.
- `RETRY_WAIT` is governed backoff, not an unknown-health failure.
- C0276 is the single scheduled control plane for final decision convergence.
- C0272's final-promotion primitive may be invoked subordinately but no longer owns an independent scheduler.
- C0237 publication never means external FPL execution.

At C0278 reconciliation, GW5 had reconverged through projection 1401 and C0248 sequential candidate run 38; FINAL_GATE remained correctly held by T−2 governance.

## 8. C0277 — seasonal chip option value

A strong short-horizon chip root is not sufficient evidence that the chip should be spent now. C0277 therefore evaluates reservation value and broader first-half/season chip timing as a sub-control feeding C0248/C0276.

Permanent decision:

- WC/FH/BB/TC timing must account for future opportunity cost.
- Chip timing must survive uncertainty, Noise-Control and red-team analysis.
- Incomplete broader timing evidence causes fail-closed/reserve behavior rather than forced chip use.
- C0277 is not a parallel selected-path authority.

## 9. C0234/C0237 — authorization and publication are distinct

The active Gameweek may expose a current fully evaluated recommendation before final authorization, but final/execution semantics remain separate.

Permanent distinctions:

- publication stage/status is not external execution authority;
- skipped mandatory evaluation blocks decision-grade publication; negative evaluated evidence is allowed;
- current publications are append-only and may be superseded by fresher fully evaluated evidence;
- external FPL transfers/chips are never executed unless separately authorized outside this decision-publication contract.

## 10. Research promotion and negative evidence

Negative/rejected findings are durable evidence. They are not retuned because later anecdotes look favorable. This includes rejected residual/nonlinear/hierarchical/context blends, generic fatigue heuristics, unsupported mismatch mixtures, chaos-only/eSOT tail ideas and generic flank xPts effects.

Research architecture remains:

`SOURCE → FEATURE/MODEL → SHADOW OUTPUT → EVALUATOR/ABLATION → PROMOTION OR REJECTION`.

## 11. Protected live states

These states must not be casually normalized during cleanup:

- **C0265:** Open / Planned / Critical. The predicted-XI hard-anchor xMins defect is deliberately registered but unchanged until separately authorized.
- **C0270:** prospective xMins-cliff/coincidence definitions remain frozen; numerical coincidence is not causal evidence.
- **C0240 concurrency:** do not increase/change without separate validation/authorization.
- **C0230:** advisory/nonblocking.
- Intentional blocked/deferred/monitoring research programs remain open until their actual acceptance/expiry evidence exists.

## 12. C0278 — whole-engine reconciliation decision

C0278 audited live runtime, architecture registry, active crons, tracker states, decision authority, production-effect proof and canonical documentation.

Permanent source-of-truth order:

1. live Supabase runtime/data/architecture registry;
2. tracker and C0213 governance;
3. current GitHub source/migrations;
4. canonical documentation;
5. historical handovers/summaries.

C0278 repaired the C0272/C0276 scheduler overlap so C0276 is the single scheduled final-control loop, reconciled C0274 as a subordinate safety primitive, preserved intentional tracker states, and updated canonical documents without rewriting historical closeouts.

Closeout invariants:

- no undocumented competing decision authority;
- no duplicate active cron target;
- no production effect without current behavioral proof;
- no false mass-closing of research/monitoring work;
- no historical forecast rewrite;
- no external FPL execution;
- C0265 unchanged;
- C0240 concurrency unchanged unless separately authorized.

## 13. Anti-over-engineering decision

A new production component must fix a demonstrated material failure, add unique information, have a falsifiable output/regression test, possess one explicit consumption contract and justify maintenance complexity. Prefer consolidation into an existing state/planner/gate over parallel models and authorities.

## 14. Canonical references

- `PROJECT_STATE.md`
- `PROJECT_DESCRIPTION.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md` (historical audit evidence; do not rewrite as current state)
- `skills/fie/SKILL.md`
- `project-management/C0278_FULL_ENGINE_STATE_AUDIT_RECONCILIATION_20260916.md`
- `project-management/C0277_SEASONAL_CHIP_OPTION_VALUE_OPTIMIZER_PLAN_20260916.md`
