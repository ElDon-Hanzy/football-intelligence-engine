# C0204 — Continuous Projection Coverage Reconciliation V02/V03

## Purpose

Close the production reliability gap discovered during C0213 P0: C0204 detected newly added FPL players with missing projection inputs, but the rolling wrapper only blocked and did not continuously create the governed exclusion required by the C0204 contract.

## Root cause

`private.generate_upcoming_fpl_snapshot_v01()` called `private.c0204_projection_coverage_summary_v01()`. When `ungoverned_missing_count > 0`, it wrote a failed coverage audit and returned `C0204_PROJECTION_COVERAGE_BLOCKED` immediately.

The original deployment had backfilled governed exclusions, but there was no recurring reconciliation path for players entering the FPL player pool later. Floyd Samba (`player_id=100695`) exposed the gap: he had no current player state and no active-model baseline, and therefore appeared as `UNGOVERNED_MISSING` rather than an explicit governed exclusion.

## Production fix

Migrations:

- `20260905231505_c0204_continuous_projection_coverage_reconciliation_v02.sql`
- `20260905231842_c0204_continuous_reconciliation_scope_guard_v03.sql`

Internal function:

- `private.c0204_reconcile_projection_coverage_v02(gameweek, as_of)`
- serializes reconciliation with a transaction advisory lock;
- automatically governs only never-seen players whose canonical reason is exactly `MISSING_STATE_AND_BASELINE` and who have no previous eligibility event;
- appends `EXCLUDED / PENDING_GOVERNED_PRIOR_C0206` eligibility events;
- never creates a player prior, state, prediction, or zero-valued fallback;
- records the original missing-input reason and explicit `validated_prior_created=false`;
- is idempotent once the governed exclusion becomes the latest eligibility event;
- refuses automatic reconciliation when more than 10 never-seen candidates appear at once, returning `ANOMALOUS_MASS_UNGOVERNED_COHORT` so production remains fail-closed.

The V03 scope guard was added after red-team review of V02. It prevents a broad active-model baseline failure, restoration regression, or other existing-player data problem from being silently converted into exclusions. Missing-state-only, missing-baseline-only, previously governed/restored, and other unexpected missing-input cases remain `UNGOVERNED_MISSING` and continue to block the production wrapper.

The production wrapper performs:

`coverage check -> narrowly govern eligible new missing players -> coverage recheck -> block if any ungoverned missing remains -> existing C0160 generator`

No projection/model formula was altered.

## Verification

Initial reconciliation for GW4:

- new governed exclusions: 1
- player: Floyd Samba (`100695`)
- original reason: `MISSING_STATE_AND_BASELINE`
- validated prior created: false
- historical forecasts rewritten: false

Post-reconciliation GW4 coverage:

- total FPL players: 653
- projectable: 604
- governed exclusions: 49
- ungoverned missing: 0

Idempotency:

- immediate second reconciliation inserted 0 events.
- post-V03 scope-guard check reported `candidate_count=0`, `new_governed_exclusions=0`, `max_auto_govern=10`.

Samba's eligibility state created by the initial reconciliation is:

- `eligibility_status=EXCLUDED`
- `reason_code=PENDING_GOVERNED_PRIOR_C0206`
- original coverage reason `MISSING_STATE_AND_BASELINE`
- `validated_prior_created=false`

Future automatic reconciliations now stamp `reconciliation_version=C0204_V03_SCOPE_GUARDED` and `auto_govern_scope=NEVER_SEEN_MISSING_STATE_AND_BASELINE_ONLY`.

## Integrity constraints preserved

- Missing data is not zero.
- No unvalidated new-player prior was manufactured.
- No frozen historical FPL prediction or forward cohort was rewritten.
- C0206 remains responsible for any future evidence-based restoration.
- Unexpected or broad projection-input failures remain fail-closed rather than being mass-excluded.
- The full GW4 FPL generator was not manually forced during this repair because GW3 is not fully complete and the separate GW4 decision-readiness evidence gate is still red. C0204 coverage readiness is not equivalent to decision readiness.

## Advisor check

Security and performance advisors were run after the migrations. They reported existing project-level advisory items, but no new warning was attributable to the C0204 reconciliation function or wrapper. The SECURITY DEFINER function is in the private schema, has an explicit fixed search path, and execute privilege is restricted to `service_role`.
