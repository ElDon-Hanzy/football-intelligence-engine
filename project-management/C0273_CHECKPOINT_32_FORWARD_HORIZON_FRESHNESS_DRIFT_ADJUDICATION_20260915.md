# C0273 — Checkpoint 32: Forward-Horizon Freshness & Upstream-Drift Adjudication

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoint 31 by adjudicating the open freshness contradiction in C0218/C0213 horizon readiness: GW5–GW7 can be declared projection-ready and cadence-valid while also reporting `upstream_drifted_since_snapshot=true`. Determine the target PRE-FINAL semantics without refreshing projections, changing cadence, running C0248, or altering any production behavior.

## 1. Live re-verification

Read-only `private.c0213_p2_horizon_readiness_v02(5,3)` at 2026-09-15 04:16 UTC reports:

- horizon contract: `C0218_HORIZON_V03`;
- cadence contract: `C0217_PROJECTION_CADENCE_V01`;
- explicit policy: `CADENCE_VALID_SNAPSHOT_NOT_LIVE_UPSTREAM_TIMESTAMP_PARITY`;
- `upstream_horizon_ready=true`;
- `projection_horizon_ready=true`;
- `ready_for_optimizer=false` because manager state is absent;
- all GW5–GW7 snapshots are `projection_ready=true` and `cadence_valid=true`;
- all GW5–GW7 snapshots simultaneously report `upstream_drifted_since_snapshot=true`.

Current inspected timestamps:

| GW | cadence | prediction run | generated | latest C0166 fixture upstream | current player state | drift flag |
|---|---|---:|---|---|---|---|
| 5 | PRIMARY_DAILY_24H | 1368 | 2026-09-14 18:15 UTC | 2026-09-15 01:03 UTC | 2026-09-15 00:37 UTC | true |
| 6 | FORWARD_BASELINE | 1359 | 2026-09-11 18:01 UTC | 2026-09-15 01:03 UTC | 2026-09-15 00:37 UTC | true |
| 7 | FORWARD_BASELINE | 1360 | 2026-09-11 18:03 UTC | 2026-09-15 01:03 UTC | 2026-09-15 00:37 UTC | true |

The live function definition confirms this is intentional current policy, not a display bug:

- primary GW before T-2 is cadence-valid when prediction age is <24h;
- forward GWs are cadence-valid if any qualifying frozen pre-deadline prediction run exists;
- `upstream_drifted_since_snapshot` is informational and becomes true whenever the prediction run predates the latest production fixture snapshot or current player-state timestamp;
- drift does not currently invalidate `projection_ready`.

## 2. Main finding

`upstream_drifted_since_snapshot=true` is currently too coarse to be a PRE-FINAL blocker, but too important to remain merely informational for a sequential multi-GW planner.

The flag proves **chronological drift**, not **material semantic drift**.

A timestamp changed upstream may represent:

- a material injury/availability/xMins change;
- a fixture or tactical forecast change;
- a newly transferred or newly eligible player;
- a role/set-piece change;
- or an observational refresh whose effective values are decision-equivalent to the frozen snapshot.

Therefore neither extreme is safe:

1. `drift=true => always block/recompute` would create needless churn and workload;
2. `cadence_valid=true => ignore all drift` could let C0248 optimize multi-GW paths against materially obsolete forward assumptions.

## 3. Target freshness model

PRE-FINAL should distinguish three independent concepts.

### F1 — CADENCE_FRESHNESS

Is the snapshot within the planned refresh cadence for its horizon position?

Current policy examples:
- primary: daily before T-2;
- forward baseline: retained until its governed refresh event/cadence.

Cadence freshness is necessary operational information but is not sufficient semantic freshness.

### F2 — UPSTREAM_CHRONOLOGICAL_DRIFT

Did any dependency receive a newer observation after the prediction snapshot?

This is what the current boolean approximates. It should trigger comparison/reconciliation, not automatically imply invalidity.

### F3 — MATERIAL_SEMANTIC_DRIFT

Did newer upstream evidence change a value or authority dimension enough that the frozen projection can no longer safely represent the planner's current assumptions?

Examples that should normally be material:
- player availability/status transition affecting expected minutes;
- material xMins/start-probability movement;
- fixture reschedule/opponent change;
- material fixture forecast/tactical state change;
- squad registration/transfer affecting candidate eligibility;
- role/set-piece hierarchy change affecting projected returns;
- official deadline generation change;
- canonical model/version change.

Materiality must be evidence/version driven, not inferred solely from timestamp age.

## 4. Horizon-position policy

### Primary GW

PRE-FINAL recommendation should use a current primary projection generation under the governed daily/event-driven freshness contract. Material upstream drift should hard-invalidate or trigger reconciliation/reprojection before new PRE-FINAL authority is granted.

A still-valid prior PRE-FINAL publication may remain visible as explicitly stale/degraded only under the canonical-publication fallback policy; it must not silently claim currentness.

### Forward GWs

Forward baselines may intentionally be older than the primary GW because C0248 values future optionality rather than claiming a final forecast for GW+1/GW+2.

However, `FORWARD_BASELINE` cannot mean `ANY HISTORICAL SNAPSHOT FOREVER`.

Target contract should define:

- maximum governed baseline age or refresh event;
- material-drift invalidators;
- whether drift requires full reprojection or a bounded horizon refresh;
- whether planner can continue in degraded mode when a forward baseline is stale;
- increasing tolerance with horizon distance only where behaviorally validated.

The current implementation has no age bound for forward baseline beyond existence of a qualifying frozen pre-deadline run. That is acceptable as historical current behavior but insufficient as the future autonomous PRE-FINAL contract.

## 5. Generation-vector recommendation

Each prediction snapshot should ultimately expose the semantic generations it consumed, for example:

- player-state generation;
- fixture-forecast generation;
- availability/xMins generation;
- role generation;
- tactical generation;
- player-universe generation;
- model generation;
- official deadline generation.

When upstream changes, the controller compares consumed vs current generation identities and classifies each change as:

- `NO_EFFECT`;
- `SOFT_STALE`;
- `HARD_INVALIDATE`;
- `SUPERSEDE_ONLY`;

consistent with Checkpoint 07.

This is stronger than timestamp parity and avoids refreshing 604-player horizons merely because an unrelated observation timestamp advanced.

## 6. Sequential-planner implications

C0248 should not receive one undifferentiated `projection_horizon_ready=true` when horizon members have different freshness confidence.

Target planner-facing evidence should expose per-GW:

- prediction run identity;
- cadence state;
- consumed/current generation delta;
- material-drift state;
- freshness class;
- age;
- allowed planner use (`PRIMARY_CURRENT`, `FORWARD_CURRENT`, `FORWARD_DEGRADED`, `BLOCKED`).

The planner's horizon weights already decay (current 3-GW policy 1.00 / 0.82 / 0.68). Freshness degradation should not be silently double-counted by arbitrarily reducing weights. Any future freshness penalty requires behavioral validation; the safer first contract is eligibility/classification, not ad-hoc score modification.

## 7. Red-team

### Failure A — block on every upstream timestamp

Frequent source refreshes cause continuous reprojection and planner churn even when values are unchanged.

Guard: compare semantic generation/content, not timestamp alone.

### Failure B — accept any forward baseline forever

A GW+2 projection can survive major injuries/transfers/tactical changes simply because `run_id is not null`.

Guard: governed age/material-drift policy.

### Failure C — refresh only primary GW

C0248 can choose transfers based on obsolete GW+1/GW+2 optionality and incorrectly value rolling FT or multi-week structure.

Guard: forward horizon invalidators and bounded refresh policy.

### Failure D — require forward snapshots to be as fresh as primary

This may waste compute and overreact to low-value noise.

Guard: horizon-position-specific cadence plus materiality.

### Failure E — apply arbitrary freshness penalty to xPts

Would create a new unvalidated model effect under an architecture repair.

Reject. Freshness is authority/eligibility metadata unless separately researched and approved as a model effect.

### Failure F — drift discovered after C0248 but before publication

A stale candidate could become current PRE-FINAL authority.

Guard: commit-time generation comparison and authority CAS; stale worker may finish but cannot canonical-commit.

## 8. Planned repair packages — NOT AUTHORIZED

### S2-R22 — Semantic horizon-freshness adapter

Translate cadence, consumed generations and current upstream generations into typed per-GW freshness classes without rewriting historical C0218 evidence.

### S2-R23 — Forward-baseline bounded-validity policy

Define evidence-based maximum age/refresh events and hard invalidators for GW+1..GW+N baselines. Do not guess thresholds before replay/telemetry.

### S2-R24 — Material-drift reconciler

On upstream generation change, classify whether the existing projection remains semantically valid, requires soft-stale labeling, or must be invalidated/recomputed.

### S2-R25 — Commit-time horizon generation check

Before PRE-FINAL/FINAL publication authority, verify the selected C0248 plan still references allowed current horizon generations.

## 9. Acceptance scenarios

Future implementation should prove:

- newer upstream timestamp with identical semantic content does not force unnecessary reprojection;
- material availability/xMins change invalidates affected current projection authority;
- fixture reschedule invalidates affected horizon snapshot;
- material GW6 change is not ignored merely because GW6 is `FORWARD_BASELINE`;
- unchanged GW7 can remain valid while GW6 alone refreshes if lineage permits;
- old forward baseline eventually becomes ineligible under governed bounded-validity policy;
- stale worker cannot publish after a material generation changes;
- freshness classification does not modify xPts unless a separately approved model experiment exists;
- historical snapshots retain their original evidence/labels.

## 10. Contradictions / open questions preserved

1. Current `projection_readiness_policy=CADENCE_VALID_SNAPSHOT_NOT_LIVE_UPSTREAM_TIMESTAMP_PARITY` explicitly permits chronological upstream drift; this is historical truth and must not be rewritten.
2. Current forward baseline cadence has no explicit age ceiling beyond qualifying snapshot existence; target ceiling is unresolved.
3. Exact materiality thresholds for xMins, fixture probabilities and tactical changes require replay/telemetry; do not guess them.
4. It remains unresolved which upstream domains have stable semantic generation IDs today versus only timestamps/content hashes.
5. Partial per-GW horizon refresh capability and cost need verification before implementation design is finalized.
6. Manager state remains absent for GW5 and independently keeps `ready_for_optimizer=false`.
7. Official deadline authority remains unresolved under S1-R1; the horizon function still derives deadline from first kickoff minus 90 minutes.
8. Canonical publication authority remains unresolved under S1-R3.
9. C0213 full-pool optimizer remains a live hard dependency pending Checkpoint 26 closure evidence.
10. No FPL account execution is authorized.

## 11. Decision

C0273 classifies current `upstream_drifted_since_snapshot` as **chronological drift evidence, not sufficient proof of semantic staleness**.

The future PRE-FINAL controller must add semantic generation comparison and per-horizon freshness classes. Forward baselines may be older than the primary GW, but cannot remain valid indefinitely or through material upstream changes merely because a historical frozen run exists.

No projection was refreshed, no C0248 run was created, no readiness/blocker was relaxed, and no publication was produced.

**All implementation, deployment, scheduler, cadence, projection, model, planner, gate, publication, API/UI and account-execution changes remain explicitly approval-gated.**
