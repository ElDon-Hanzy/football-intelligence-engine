# C0273 — Checkpoint 06: Result Settlement & Correction Finality

Date: 2026-09-14  
Program: Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE

## 1. Purpose

Define when a Gameweek result is merely observed, when fixtures are provisionally complete, when FPL scoring is settled enough for downstream model updates, and how later corrections must supersede prior settled evidence without rewriting history.

This checkpoint connects result ingestion to the future canonical Gameweek lifecycle. It does **not** change `sync-gw-results`, schemas, crons, models, publications, or research behavior.

## 2. Live production evidence audited

### Current result scheduler

`football_intelligence_result_sync` is active every 15 minutes and invokes `sync-gw-results`.

### Current `sync-gw-results` v5 semantics

The live function:

1. fetches official FPL `/event/{gw}/live/` and `/fixtures/?event={gw}`;
2. updates match scores and marks a match finished when either `finished=true` **or `finished_provisional=true`**;
3. computes a payload hash over live player elements + fixtures;
4. inserts a new `gameweek_result_runs` parent whenever the payload hash changes;
5. sets `gameweek_result_runs.is_final=true` as soon as every fixture has `finished=true OR finished_provisional=true`;
6. inserts player actual rows after the parent;
7. short-circuits when the latest parent has the same payload hash.

Checkpoint 02 already established that steps 4–7 create a partial-write/retry hazard. This checkpoint adds a separate semantic issue: current `is_final` means **all fixtures provisionally/actually finished**, not necessarily **FPL scoring settled**.

## 3. Evidence that fixture completion != scoring finality

Official Premier League/FPL guidance states that player points can continue to change during a Gameweek and become final only after the last day of the Gameweek has been marked final. The mechanism exists because Opta event statistics, goals, BPS and other scoring inputs can be corrected after final whistles.

The 2026 GW38 guidance further confirmed that scoring may remain provisional while post-match Opta review is completed, with the final data arriving later than the last final whistle.

Therefore a fully autonomous system must not equate:

`all fixtures finished` → `FPL scoring immutable`.

## 4. Live database evidence of post-finish revisions

Current append-only result history already demonstrates that payloads can change after every fixture is marked finished.

Examples:

- GW1 contains multiple `is_final=true` result runs with different payload hashes between 2026-08-24 21:00 UTC and 2026-08-25 08:15 UTC.
- GW2 contains multiple distinct `is_final=true` payloads through 2026-09-01 08:30 UTC.
- GW3 contains multiple distinct `is_final=true` payloads between 2026-09-06 17:45 UTC and 2026-09-07 08:15 UTC.

This is direct evidence that the current boolean `is_final` is too coarse to serve as the future control-plane settlement authority.

Historical pruning means only selected protected result runs retain full player-child rows, but parent payload hashes preserve proof that revised official payloads were observed.

## 5. Downstream consequence in current architecture

`private.c0162_on_final_result_run_v01()` triggers future team-fact refresh whenever a newly inserted result run has `is_final=true` and that result run has not already produced a team-fact snapshot.

Because several distinct `is_final=true` payloads can arrive, downstream future-state facts may be refreshed repeatedly as official corrections arrive. Append-only lineage makes that recoverable/auditable, but the semantic label `final` is misleading.

The future controller must distinguish **provisional complete**, **settlement candidate**, **settled**, and **corrected after prior settlement** rather than relying on one boolean.

## 6. Proposed result lifecycle contract

### 6.1 States

`NOT_STARTED`
- no target fixture has started.

`LIVE_PARTIAL`
- one or more fixtures active or completed, at least one target fixture not complete.

`FIXTURES_COMPLETE_PROVISIONAL`
- all target fixtures report `finished=true` or `finished_provisional=true`;
- FPL player totals/BPS may still change;
- allowed for live UI and provisional performance views;
- **not sufficient** for irreversible post-GW model evaluation or shadow promotion/kill evidence.

`SETTLEMENT_WAIT`
- fixtures are complete;
- official FPL Gameweek-level finality signal has not yet been proven;
- controller continues bounded polling/reconciliation.

`SETTLED`
- official FPL Gameweek-level finality has been observed under a documented authority rule;
- result payload is complete under the result-run completeness invariant;
- canonical settlement generation is recorded;
- downstream realized-evidence evaluation may proceed.

`CORRECTED_AFTER_SETTLEMENT`
- a later official payload differs from the previously canonical settled payload while still accepted by FPL as a scoring correction/revision;
- old settled run remains immutable;
- a new settlement generation supersedes it;
- affected future-derived facts/evaluations are recomputed forward from the corrected evidence;
- frozen predeadline forecasts and historical decision snapshots remain untouched.

`SETTLEMENT_CONTRADICTED`
- official Gameweek finality, fixtures, or live player payload disagree materially;
- fail closed for model evaluation that assumes final realized points;
- public UI may continue to show last known result as explicitly provisional/degraded.

## 7. Settlement authority hierarchy — planning proposal

### Authority A — official FPL Gameweek finality

The final implementation must consume a documented official event-level finality signal from the FPL event state. Current FPL guidance describes the Gameweek being “marked as final”; this must be mapped to the exact API field(s) and regression-tested before implementation.

**Open technical item:** prove whether the canonical machine field should be `events[].finished`, `data_checked`, a combination, or another current official field. Do not infer this from fixture `finished_provisional`.

### Authority B — fixture completeness

All target fixtures complete is a prerequisite, not settlement authority.

### Authority C — payload stability guard

A short stability observation may be used as a safety guard after official finality, but **must not replace official authority**. Stability-only heuristics such as “no payload change for N minutes” are insufficient on their own.

## 8. Result-run completeness invariant

A canonical result observation cannot be accepted merely because the parent `gameweek_result_runs` row exists.

Required invariant for a future settlement-capable result run:

- parent exists;
- official fixture set identity/hash recorded;
- fixture count equals official target fixture count;
- player result ingestion completed for every mappable current player returned by the official live payload;
- child row count equals the declared mapped-player count;
- every child references the same result-run ID;
- no duplicate `(result_run_id,player_id)` rows;
- payload hash recomputes to the recorded parent hash;
- completion marker is committed only after children are durable;
- source finality evidence/version is attached;
- current fencing token/generation owns canonicalization.

Existing unique `(result_run_id, player_id)` is useful but does not prove batch completeness.

## 9. Settlement generation and supersession

Introduce conceptually (planning only):

`result_observation_id` — immutable raw official payload observation.

`settlement_generation` — monotonically increasing canonical settlement version for one Gameweek.

`canonical_settlement_pointer` — points to the currently trusted settled result observation.

A later correction must:

1. create a new immutable observation;
2. reconcile completeness;
3. compare semantic result delta against current settled observation;
4. if authoritative, create next settlement generation;
5. move canonical pointer atomically under fencing/state-version guard;
6. emit invalidation events only for forward-derived realized-evidence consumers.

Never overwrite old result/player rows.

## 10. Invalidation rules

A new provisional payload:
- updates live UI/current match facts;
- may update explicitly provisional analytics;
- must not settle a Gameweek.

Initial `SETTLED` generation:
- enables post-GW calibration/evaluation;
- realized role/result processing may consume it;
- shadow experiments may score against it under their own frozen contracts;
- future team/player states may assimilate it.

`CORRECTED_AFTER_SETTLEMENT`:
- invalidates downstream realized/calibration outputs derived from the superseded settlement generation;
- reruns those consumers with new lineage;
- does **not** alter frozen predictions, recommendations, actual submitted team, or prior public decision records.

## 11. Website semantics

V3/public APIs should expose result maturity explicitly:

- `LIVE`
- `PROVISIONAL`
- `SETTLEMENT_WAIT`
- `SETTLED`
- `CORRECTED`
- `DEGRADED`

The UI must not label points “final” solely because the last fixture ended.

Engine-vs-actual realized comparison may be shown provisionally before settlement, but must carry the same maturity label and update if official points are corrected.

## 12. Research/shadow safety

Autonomous research evaluation must bind to a `settlement_generation`.

A promotion/kill evidence row based on provisional points is invalid.

If an already-scored settled Gameweek is corrected:

- recompute experiment outcome using the new settlement generation;
- preserve the old evaluation as superseded evidence;
- promotion logic must consume only the canonical settlement generation;
- multiplicity/sample counters must not double-count superseded generations.

No shadow family is changed by this planning checkpoint.

## 13. Gameweek lifecycle integration

The future canonical lifecycle should separate predeadline decision finalization from postdeadline scoring finality:

`PRE_DEADLINE → FINALIZATION_WINDOW → DEADLINE_LOCKED → LIVE_PARTIAL → FIXTURES_COMPLETE_PROVISIONAL → SETTLEMENT_WAIT → SETTLED → POSTMORTEM_READY`

Material corrections can transition:

`SETTLED → CORRECTED_AFTER_SETTLEMENT → SETTLED(new generation)`.

A new Gameweek may begin operational planning while the previous Gameweek is still awaiting settlement; the controller must therefore support overlapping Gameweek state machines rather than one global linear state.

## 14. Digital-twin tests added

Required cases:

1. final fixture ends, player payload changes 20 minutes later;
2. all fixtures `finished_provisional=true` but event-level Gameweek not final;
3. official finality appears, but result parent has zero/partial children;
4. official finality appears while one fixture record is contradictory;
5. settled payload changes after first settlement;
6. correction changes captain/bench realized scenario totals;
7. correction changes BPS/defensive-contribution points only;
8. downstream team-fact refresh ran on superseded settlement and must regenerate with new lineage;
9. research outcome already scored against settlement generation 1, then generation 2 supersedes it;
10. two reconcilers race to canonicalize the same settled payload;
11. old worker attempts to canonicalize generation 1 after generation 2 exists;
12. historical pruner preserves the currently canonical settlement and any provenance-required superseded generations.

## 15. Open questions for user review / later technical proof

1. Exact official FPL API field(s) representing “Gameweek marked final” in the current 2026/27 API must be proven before implementation.
2. Whether a short post-authority stability delay should be mandatory in addition to the official finality field.
3. Retention policy for superseded settled player rows versus compact digests once downstream lineage is immutable.
4. Which post-GW consumers may operate on `FIXTURES_COMPLETE_PROVISIONAL` for low-risk UI only versus which must wait for `SETTLED`.
5. Alert severity if official points are corrected after an engine postmortem has already been published.

## 16. Senior-analyst conclusion

The engine currently has strong append-only result lineage, but its result-state vocabulary is semantically insufficient for unattended operation. `is_final=true` currently means fixture completion, while official FPL scoring can still change afterward.

C0273 should treat **scoring settlement as a separate authoritative event**, not as a property inferred from match completion. This is a P0 correctness contract because autonomous postmortems, model calibration, research scoring and future-state assimilation all depend on realized evidence being genuinely settled.

## 17. Explicit non-changes

This checkpoint did not:

- alter `sync-gw-results`;
- alter `gameweek_result_runs` or `player_gameweek_actuals`;
- alter any cron;
- alter C0162/C0167 facts;
- alter any model or optimizer;
- alter research/shadow behavior;
- alter V2/V3;
- deploy anything;
- rewrite historical evidence;
- execute any FPL action.
