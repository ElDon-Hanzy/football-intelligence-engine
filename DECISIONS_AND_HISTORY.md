# Football Intelligence Engine — Decisions & History

_Last reconciled: 2026-09-18 (Dubai) — through C0281 closeout_

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

## C0281 durable deadline-control decisions — 2026-09-18
GW5 demonstrated that a nominal T-2 final window is insufficient when tail latency, asynchronous request state and changing lineages interact. Deadline control is therefore a convergence problem, not merely a scheduler priority.

The governed phase model is `NORMAL → T4_BASELINE → T4_BASELINE_CONVERGED → T2_DELTA → CLOSED`. T-4 is the target for a coherent baseline. T-2 processes material deltas rather than starting the entire decision chain from scratch.

Inside T-4, authoritative player-state changes are immediately material. Raw fixture-lineage refresh churn is debounced until repeated twice or persistent for five minutes. This is deliberately conservative stabilization and does not claim semantic selected-path/xPts materiality.

Existing C0248/C0243 price timing remains authoritative. Price information cannot create a football transfer. It may only accelerate an already robust transfer if affordability is materially threatened; otherwise information optionality is preserved.

Deadline runtime reservation is empirical and tail-aware. Current policy uses `max(300 seconds, 2 × E2E P99 + 60 seconds)`. Timeout observations count as failures, not acceptable latency targets. When remaining time breaches the reservation, new heavy dispatch is prohibited. If a coherent checkpoint exists, it may be frozen for existing governance; if none exists, the system fails closed. A fallback cannot bypass chip, final-gate or publication governance and never implies external execution.

Async RUNNING nodes are no longer allowed to livelock indefinitely: non-2xx HTTP responses fail immediately into governed recovery; absent responses older than 300 seconds fail; successful HTTP responses still uncaptured after 300 seconds also fail.

The GW5 incident also established a process lesson: inspect existing architecture before proposing new capabilities. C0243/C0248 already contained price-timing logic; C0281 integrates it rather than duplicating it.

A prior P5 tracker sentence claiming the live phase was CLOSED was incorrect. Recorded runtime evidence shows the live phase call at 17:20:58 UTC was `T2_DELTA`, around nine minutes before the 17:30 UTC deadline.

C0281 completed fault injection and a full deadline rehearsal successfully. No historical forecasts were rewritten and no external FPL transfer/chip execution occurred.