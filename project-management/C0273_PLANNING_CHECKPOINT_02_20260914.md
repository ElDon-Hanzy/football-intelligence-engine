# C0273 — Planning Checkpoint 02

Date: 2026-09-14  
Status: Open / Planned  
Implementation authorization: NONE  
Runtime/model effect: NONE

This checkpoint is additive to `C0273_PLANNING_CHECKPOINT_20260914.md` and exists to make the unattended planning work recoverable even if a chat/tool session fails.

## Batch 8 — Manager-state autonomy contract

Durable artifact:

- `C0273_CHECKPOINT_05_MANAGER_STATE_AUTONOMY_CONTRACT_20260914.md`

Main findings:

- no active scheduler for `sync-fpl-manager-state` was proven;
- current durable manager-state evidence is not sufficient to assume fresh GW5+ private account state;
- the current public-data reconstruction can establish a strong opening/last-locked baseline but cannot generally observe manual current-GW transfers before deadline without authenticated private access;
- an observed manager snapshot can be structurally complete yet materially stale relative to the eventual locked submitted team;
- current decision readiness checks field presence more strongly than manager-state visibility/freshness/generation.

Required state separation:

`OPENING_LOCKED_BASELINE != CURRENT_PRIVATE_STATE != ENGINE_HYPOTHETICAL_STATE != ACTUAL_SUBMITTED_STATE`.

Additional planning requirements:

- exact 15/15 purchase-price/selling-value provenance;
- `manager_state_generation` invalidation;
- Free Hit permanent-squad and temporary-squad dual lanes;
- fail-closed `CURRENT_PRIVATE_UNOBSERVABLE` state;
- autonomous recommendation website and autonomous account operator remain separate product maturity levels;
- authenticated account mutation/execution remains unresolved and explicit-approval-gated.

## Batch 9 — Result settlement and correction finality

Durable artifact:

- `C0273_CHECKPOINT_06_RESULT_SETTLEMENT_FINALITY_20260914.md`

### Live evidence

- `football_intelligence_result_sync` runs every 15 minutes.
- live `sync-gw-results` v5 sets `gameweek_result_runs.is_final=true` when every fixture is `finished=true OR finished_provisional=true`.
- official FPL guidance allows point/BPS/stat corrections after individual final whistles and only treats points as final when the Gameweek is marked final.
- live database history independently proves multiple distinct payload hashes after `is_final=true` for GW1, GW2 and GW3.

Therefore current `is_final` is semantically closer to `FIXTURES_COMPLETE_PROVISIONAL` than true FPL scoring settlement.

### Proposed postdeadline state machine

`DEADLINE_LOCKED`
→ `LIVE_PARTIAL`
→ `FIXTURES_COMPLETE_PROVISIONAL`
→ `SETTLEMENT_WAIT`
→ `SETTLED`
→ `POSTMORTEM_READY`

Correction branch:

`SETTLED → CORRECTED_AFTER_SETTLEMENT → SETTLED(new settlement_generation)`.

### New P0 contracts

- official Gameweek-level finality must be proven from the current FPL event API before implementation;
- fixture `finished_provisional` may never be final settlement authority;
- result parent existence/payload hash is not completion proof;
- a canonical result run needs a queryable child-row/completeness invariant;
- post-GW evaluators bind to `settlement_generation`;
- later official corrections create immutable superseding settlement generations;
- frozen predeadline projections/recommendations/actual-submission records are never rewritten;
- shadow experiment sample counters must not double-count superseded settlements;
- V3/public APIs expose result maturity explicitly rather than labeling points final at the last whistle.

### Open proof item

The exact current official FPL machine field corresponding to the Gameweek being “marked final” must be proven before implementation. Candidate event-level fields must be verified against actual 2026/27 transitions; no field is authorized by assumption.

## Updated combined lifecycle concept

C0273 now requires multiple independent generation axes rather than one global status:

- `deadline_evidence_version` + `finalization_generation`;
- `manager_state_generation`;
- source-readiness/evidence generations;
- `settlement_generation` postdeadline;
- monotonic control-plane state version/fencing epoch.

Canonical work must declare which generation axes it consumes. Mixed or superseded generations fail closed.

A future controller must also support **overlapping Gameweeks**: planning for GW N+1 can begin while GW N remains in `SETTLEMENT_WAIT`. Therefore one global sequential Gameweek state machine is insufficient; each Gameweek needs its own lifecycle aggregate plus cross-GW dependency rules.

## Revised P0 planning queue

Before implementation approval, resolve:

1. prove/choose automated manager press-conference and late team-news coverage;
2. decide whether independent predicted XI is mandatory or confidence-enhancing;
3. finish manager-state source/visibility strategy for recommendation autonomy;
4. define complete cup/Europe congestion coverage;
5. prove exact official FPL Gameweek settlement field(s) and correction behavior;
6. finish retry/completeness contracts for remaining dispatchable workers;
7. finalize generation/fencing/state-version mechanics across deadline, manager state, source readiness and settlement;
8. define canonical public publication/status supersession semantics;
9. measure safe server-side work/concurrency budgets;
10. define deployment-freeze final duration and emergency policy;
11. choose SEV0/SEV1 alert channel;
12. build the read-only digital-twin/replay acceptance matrix before any controller dispatch exists.

## Senior-analyst assessment

The plan is becoming materially safer by distinguishing **observed**, **complete**, **canonical**, and **settled** states. The recurring architectural mistake to avoid is collapsing these into a single boolean such as `ready`, `final`, or `success`.

The current engine can plausibly become an autonomous recommendation/intelligence website without account credentials, provided it fails closed when current private manager state is unobservable. A fully autonomous account operator is a later, higher-risk capability and should not be coupled to C0273 initial implementation.

## Explicit non-changes

No schema, cron, Edge Function, source adapter, runtime code, model, optimizer, C0248/C0234/C0237 behavior, website behavior, shadow lifecycle, historical forecast, or FPL account state was changed.

## Recovery order from this checkpoint

1. this file;
2. `C0273_CHECKPOINT_06_RESULT_SETTLEMENT_FINALITY_20260914.md`;
3. `C0273_CHECKPOINT_05_MANAGER_STATE_AUTONOMY_CONTRACT_20260914.md`;
4. `C0273_PLANNING_CHECKPOINT_20260914.md`;
5. `C0273_CHECKPOINT_04_DEADLINE_AUTHORITY_AUDIT_20260914.md`;
6. `C0273_CHECKPOINT_03_P0_INFORMATION_SOURCE_AUTONOMY_AUDIT_20260914.md`;
7. `C0273_CHECKPOINT_02_RETRY_IDEMPOTENCY_AUDIT_20260914.md`;
8. `C0273_CHECKPOINT_01_DISTRIBUTED_CONTROL_SAFETY_20260914.md`;
9. master plan V0.2 / SOP V0.2 / P0 contract package;
10. live `public.change_tracker_working` row C0273;
11. live runtime state before any future implementation.

Production changes remain explicitly approval-gated.
