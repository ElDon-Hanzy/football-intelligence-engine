# Football Intelligence Engine — Decisions & History

_Last reconciled: 2026-09-17 (Dubai) — C0277/C0278 closeout_

This file preserves durable decisions governing the current engine. Runtime evidence outranks stale historical descriptions; history is not rewritten.

## Permanent engine decisions
- Historical forecasts are append-only; missing data is unknown, never silently zero.
- Actual submitted team, engine recommendation, frozen decision snapshot and realized outcome are distinct.
- Unpromoted research has zero numeric production effect.
- Every meaningful FPL action compares with ROLL/no action.
- xMins, tactical role and fixture quality are structural gates.
- Statistically indistinguishable options are `NO_MEANINGFUL_EDGE`.
- C0213 requires definition-hash-bound behavioral proof and explicit consumption governance for production-effect work.
- `private.generate_upcoming_fpl_projection_core_v01` remains the canonical player projection core; cadence/hard-event refresh creates new immutable snapshots and never rewrites history.
- Realized tactical role is factual state; unvalidated generic role/flank numeric uplifts remain disabled/rejected.
- C0248 is the **sole canonical sequential selected-path authority**. ROLL is explicit; bank, selling value, FT accrual, chips, flexibility and future information belong to the sequential state problem.
- C0240 is supporting adversarial evidence, not a second selector. C0230 is advisory/nonblocking.
- C0276 is the bounded autonomous control plane: exact lineage, bounded retry, one governed final-control loop, fail closed on unresolved mandatory evidence. Publication is not external execution.

## C0277 — seasonal chip option value: Completed / Verified
A strong short-horizon chip branch does not prove that spending the chip now dominates preserving it.

Permanent C0277 contract:
- exact numerical decision horizon and seasonal chip opportunity window are separate dimensions;
- exact player-level chip value is used only where decision-grade projections exist;
- structural future fixture evidence may reserve optionality but cannot authorize spending;
- unknown future option value is not zero and must not be replaced by invented points or probabilities;
- WC/FH/BB/TC compete for scarce Gameweeks; shared future windows are not additive/double-counted;
- Wildcard retains information/squad-reset option value and must include downstream squad/FT/flexibility consequences;
- chip spending requires robust `PLAY_NOW` evidence after whole-squad reoptimization, xMins/role gates, opportunity cost, red-team, Noise-Control and existing final timing gates;
- unresolved future opportunity or assumption-sensitive superiority causes `RESERVE_FOR_FUTURE`, `NO_MEANINGFUL_EDGE`, or fail-closed behavior;
- a single best future chip week remains unresolved/null until evidence justifies that precision;
- C0277 is a supporting gate only. C0248 remains selected-path authority; C0276/C0234 remain authorization controls; no external execution.

C0277 implementation chain: dual-horizon contract → reservation-value evidence → future opportunity scenarios → robust cross-chip selector → C0276 chip-opportunity gate. At P5 verification GW5 remained `NONE / RESERVE_FOR_FUTURE / PLAY_NOW=false`; season-best chip weeks were unresolved. Invalid long exact numerical horizons fail closed.

## C0278 — whole-engine reconciliation
Permanent source-of-truth order: live Supabase → tracker/C0213 → current GitHub source/migrations → canonical docs → historical handovers.

Current P5 proof after C0277: C0213 14/14 behavioral PASS, 19/19 required capabilities, 99/99 tracker governance, zero duplicate active cron targets, zero active retired external deployments. C0265 remains deliberately unchanged; C0240 concurrency unchanged; no historical rewrite or external FPL execution.

## Protected live states
- C0265: Open / Planned / Critical; predicted-XI xMins defect deliberately unchanged until separately authorized.
- C0270: prospective shadow monitoring; numerical coincidence is not causal evidence.
- C0240 concurrency: do not change without separate validation.
- Intentional blocked/deferred/monitoring research remains open until governed acceptance/expiry evidence exists.

## Anti-over-engineering rule
A new production component must fix a demonstrated material failure, add unique information, have a falsifiable contract, possess one explicit consumer, and justify maintenance complexity. Prefer consolidation into an existing state/planner/gate over parallel authorities.

## Canonical references
`PROJECT_STATE.md`; `PROJECT_DESCRIPTION.md`; `SYSTEM_ARCHITECTURE.md`; `MODEL_REGISTRY.md`; `WEEKLY_DATA_PIPELINE.md`; `MODEL_CONSUMPTION_AUDIT.md`; `skills/fie/SKILL.md`; `project-management/C0278_FULL_ENGINE_STATE_AUDIT_RECONCILIATION_20260916.md`; `project-management/C0277_SEASONAL_CHIP_OPTION_VALUE_OPTIMIZER_CLOSEOUT_20260917.md`.
