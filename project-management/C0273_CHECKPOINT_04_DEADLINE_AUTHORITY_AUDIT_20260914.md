# C0273 — Checkpoint 04: Deadline Authority Audit

Date: 2026-09-14  
Status: PLANNING / AUDIT ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE

## Purpose

Audit every material current FPL decision path that establishes or consumes the Gameweek deadline, then convert the finding into an implementation-ready authority contract without changing production behavior.

## Executive finding

The current engine has **two deadline authorities**:

1. `sync-fpl-actual-decision` v2 correctly reads official FPL `events[].deadline_time` and refuses to read locked picks before that timestamp.
2. Core projection/finalization logic still derives the deadline as `first FPL kickoff - 90 minutes`.

This is an architectural contradiction. The derived clock happens to match the stored GW4–GW8 deadlines currently observed, but equality today does not make it authoritative. FPL may change an event deadline independently of the fixture calendar, and autonomous finalization must follow the official event clock.

## Live evidence

### Official clock already exists in one production path

`sync-fpl-actual-decision` v2:

- fetches `bootstrap-static`;
- selects the target FPL event;
- reads `deadline_time`;
- returns `PRE_DEADLINE_HIDDEN` before the official deadline;
- reads locked picks only after that deadline.

This is the reference authority behavior for C0273.

### Current derived-deadline producers/consumers

#### `private.generate_upcoming_fpl_projection_core_v01`

Directly computes:

`deadline = min(matches.kickoff_time) - interval '90 minutes'`

and persists that value into `gameweek_prediction_runs.deadline_at` with metadata:

`deadline_source = derived_first_kickoff_minus_90m`.

This function therefore creates the derived clock that propagates downstream.

#### `private.c0217_projection_horizon_cycle_v01`

Directly computes the same derived deadline to:

- choose future Gameweeks;
- determine primary/forward horizon slots;
- schedule daily prefinal capture;
- enter the T-2 final refresh window.

#### `private.c0235_capture_prefinal_snapshot_v01`

Directly computes the same derived deadline and refuses prefinal capture after T-2 relative to that derived timestamp.

#### `fpl-autonomous-gate` v7 / C0234

Directly loads the first FPL fixture kickoff and computes:

`deadline = first kickoff - 90 minutes`

then uses that to evaluate `FINAL_T_MINUS_2H_REFRESH`.

This is especially important because C0234 is the fail-closed authorization boundary.

#### `private.c0272_final_promotion_watch_v01`

Does not independently derive from fixtures, but reads `gameweek_prediction_runs.deadline_at`. Because that field is currently written by `generate_upcoming_fpl_projection_core_v01`, C0272 inherits the derived authority indirectly.

#### `private.c0237_publish_current_fpl_plan_core_v01`

Does not establish the clock itself. It consumes the frozen prediction run and gate state. Therefore it inherits deadline semantics from upstream rather than being an independent deadline authority.

### Active schedulers affected

At audit time:

- `football_intelligence_fpl_upcoming_snapshot` runs `private.c0217_projection_horizon_cycle_v01()` every 15 minutes;
- `c0272_fpl_final_promotion_watch` runs `private.c0272_final_promotion_watch_v01()` every 5 minutes.

No scheduler was modified in this planning batch.

## Current stored evidence

Latest GW4–GW8 prediction runs all record:

`metadata.deadline_source = derived_first_kickoff_minus_90m`.

Observed stored values:

| GW | First kickoff UTC | Derived/stored deadline UTC |
|---|---|---|
| 4 | 2026-09-12 14:00 | 2026-09-12 12:30 |
| 5 | 2026-09-18 19:00 | 2026-09-18 17:30 |
| 6 | 2026-10-10 11:30 | 2026-10-10 10:00 |
| 7 | 2026-10-17 11:30 | 2026-10-17 10:00 |
| 8 | 2026-10-23 19:00 | 2026-10-23 17:30 |

These rows prove propagation of the derived clock. They do **not** prove the official event deadline will always equal that derivation.

## Planning severity

Classification: **P0 correctness / control-plane authority**.

Reason: a wrong finalization clock can make the engine:

- stop accepting legitimate evidence too early;
- enter T-2 too early or too late;
- fail to produce a final same-lineage candidate in time;
- authorize against the wrong freshness threshold;
- freeze a recommendation after the true FPL deadline;
- misclassify actual-team visibility.

The correct fail-safe is not to infer the deadline when official authority is unavailable.

## Revised Deadline Authority Contract

### Canonical fact

For each FPL Gameweek there must be one versioned canonical deadline fact:

```text
(gameweek,
 official_deadline_at,
 source=FPL_BOOTSTRAP_EVENT,
 observed_at,
 source_revision/evidence_hash,
 state,
 first_kickoff_at,
 crosscheck_delta_seconds)
```

This is a planning contract only; no schema is authorized yet.

### Authority order

1. **Official FPL event `deadline_time`** — sole final authority.
2. Fixture calendar / first kickoff — diagnostic cross-check only.
3. Derived `first kickoff - 90m` — diagnostic expectation only; never autonomous final authority.

### Required states

- `VERIFIED`: official deadline present; fixture cross-check plausible.
- `OFFICIAL_ONLY`: official deadline present; fixture cross-check unavailable or incomplete.
- `CONTRADICTED`: official deadline present but materially differs from the fixture-derived expectation.
- `MISSING`: official deadline unavailable.
- `CHANGED`: authoritative official deadline changed from the previously observed value; requires generation invalidation and rescheduling.

### Autonomous policy

- `VERIFIED` may progress normally.
- `OFFICIAL_ONLY` may progress only under an explicitly approved policy because the authoritative clock is still known.
- `CONTRADICTED` must preserve the official deadline as authority but enter degraded/incident state until fixture/calendar implications are reconciled; the derived clock may never override it.
- `MISSING` blocks final-window authorization and deadline-sensitive mutation.
- `CHANGED` increments `finalization_generation`, invalidates pending deadline-bound work, and re-plans final-window timing.

## Commit-time rule

Every deadline-sensitive canonical mutation must validate the **current official deadline at commit time**, not only when work was enqueued.

This includes at minimum:

- final projection acceptance;
- C0248 production promotion;
- C0234 final authorization;
- C0237 canonical final publication;
- any future external execution adapter.

A worker that began before deadline but finishes after deadline cannot become a new executable/canonical predeadline decision.

## Deadline lineage rule

All final-window lineage should include an immutable deadline identity such as:

`deadline_fact_version / evidence_hash + official_deadline_at + finalization_generation`.

That identity must participate in final work keys/signatures so a deadline change cannot silently reuse an earlier finalization cycle.

## Historical compatibility

Existing historical prediction rows remain append-only and must **not** be rewritten merely because their stored deadline source was derived.

For audit semantics:

- old rows retain their original `deadline_at` and `deadline_source`;
- future canonical runs should record official authority once implemented;
- if historical analysis needs the official event deadline, it should join separate authoritative event evidence rather than mutate frozen forecast rows.

## Required implementation migration map — NOT AUTHORIZED YET

Future implementation should replace deadline authority in this order:

1. establish/persist canonical official FPL event deadline evidence;
2. make projection scheduling (`C0217`) consume it;
3. make projection generation/prefinal capture (`generate_upcoming...`, `C0235`) consume it;
4. make C0234 consume the same deadline fact, removing direct kickoff-minus-90 authority;
5. make C0272 consume the same fact directly rather than inheriting deadline semantics from a prediction row;
6. bind C0248/C0234/C0237 final lineage to deadline identity/generation;
7. expose deadline authority/state in the public status API;
8. retain first-kickoff-minus-90 only as cross-check telemetry.

No item above is approved for implementation by this checkpoint.

## Digital-twin scenarios added

The C0273 replay suite must include:

1. official deadline equals derived expectation;
2. official deadline moves later after an earlier observation;
3. official deadline moves earlier;
4. official deadline exists but fixtures are incomplete;
5. official deadline contradicts first-kickoff expectation;
6. official deadline temporarily unavailable;
7. worker starts before old deadline, official deadline changes during work;
8. worker starts before deadline and completes after deadline;
9. stale generation attempts C0248 promotion after a deadline change;
10. C0234 sees a different deadline version from the planner and fails closed;
11. actual-team capture and recommendation finalization share the same authoritative event clock.

## Open questions preserved for user review

1. Should `OFFICIAL_ONLY` be allowed to finalize automatically when fixture cross-check is unavailable, or require degraded/manual approval?
2. What contradiction threshold should raise `CONTRADICTED`? Recommendation: any non-zero delta should be surfaced; operational blocking threshold can distinguish expected FPL rule changes from corrupted fixture data.
3. How long before deadline should the production change freeze begin? Current draft remains T-6h pending approval.
4. Should a deadline change inside T-2 force an immediate full fresh projection/decision cycle regardless of ordinary freshness budgets? Senior-analyst recommendation: yes.

## Non-changes

This audit changed no production function, Edge Function, cron, table, model, source, website behavior, historical forecast, shadow status, or FPL action.

Production changes remain explicitly approval-gated.
