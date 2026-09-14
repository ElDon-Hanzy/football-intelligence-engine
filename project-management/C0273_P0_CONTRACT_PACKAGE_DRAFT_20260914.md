# C0273 — P0 Autonomy Contract Package Draft

Date: 2026-09-14  
Status: DESIGN DRAFT — NO IMPLEMENTATION AUTHORIZED

Purpose: convert the revised master plan into concrete contracts that can later be audited and implemented. Any item marked `UNVERIFIED` or `GAP` must be resolved before claiming full operational autonomy over that fact family.

## 1. Source Coverage Registry — initial draft

Current evidence is based on the live 2026-09-14 scheduler/architecture inventory. “Automated” means a current automated pipeline exists; it does not guarantee the source fully satisfies the final information-quality requirement.

| Fact family | Current automation evidence | Current planning status | Final-window criticality | Required follow-up |
|---|---|---|---|---|
| Official FPL fixtures/events | FPL/result sync + fixture tables | AUTOMATED, authority semantics need tightening | P0 | Make official FPL `deadline_time` canonical |
| FPL prices/player metadata | `sync-fpl-data` every 4h + FPL pipeline | AUTOMATED | P0 feasibility | Verify final-window refresh cadence / source timestamp |
| Ownership | FPL player data | AUTOMATED | P2 rank context | Confirm freshness semantics; no xPts effect |
| Actual submitted team after deadline | `sync-fpl-actual-decision` every 15m | AUTOMATED | P1 | Preserve fail-closed unverified state |
| Match results | `sync-gw-results` every 15m | AUTOMATED | P1 | Define provisional vs settled scoring |
| Live player result facts | result pipeline / V3 actual-live | AUTOMATED for current product | P1 | Formal settlement/correction contract |
| Availability/injury/suspension state | `refresh-availability-intelligence` every 4h | AUTOMATED pipeline exists | P0 | Audit exact providers, latency and injury/suspension coverage |
| Current player state | `refresh-current-player-state` every 4h | AUTOMATED | P0/P2 | Audit source dependencies and materiality |
| Predicted XI / expected minutes evidence | availability + role/xMins systems exist | UNVERIFIED AS COMPLETE P0 SOURCE | P0 | Prove current source coverage, update cadence, known-at and failure behavior |
| Confirmed XI | match/FPL/source dependent | UNVERIFIED for general pre-deadline use | Context-specific | Define where confirmed XI can exist before target decision deadline |
| Manager press conference/team news | no explicit dedicated source proven in C0273 audit | GAP / UNVERIFIED | P0 when material | Choose provenance-safe automated source or declare manual coverage gap |
| Transfers/registrations | player/FPL state may reflect changes | UNVERIFIED AS EXPLICIT CONTRACT | P0/P2 | Define authoritative detection and effective-at time |
| Penalties/set pieces | production engine has penalty hierarchy | AUTOMATED STATE EXISTS | P2/P0 if changed | Audit refresh source/cadence and late-change handling |
| European/cup congestion | fixture/tactical context may encode some schedule | UNVERIFIED AS EXPLICIT CONTRACT | P0/P2 | Define source and materiality to xMins/rotation |
| Tactical roles | role/tactical refresh twice daily + realized roles hourly | AUTOMATED | P2, possibly P0 if material late change | Define final-window freshness requirement |
| Realized roles | `ingest-realized-player-roles` hourly | AUTOMATED | Post-match | Keep future-only effect chronology |
| Team history/current performance | hourly team/source jobs | AUTOMATED | P3/P2 | Source freshness budget |
| Underlying xG/xA/team stats | Understat/competitive-core hourly | AUTOMATED | P3/P2 | Provider failure policy |
| Bookmaker odds | current-GW conditional ingest every 15m | AUTOMATED | Supporting | Must not become hidden direct FPL model authority |
| Fixture forecasts | production cycle every 15m | AUTOMATED | P2/P0 lineage | Idempotency/invalidation audit |
| Forward enriched predictions | every 4h | AUTOMATED | Research/supporting depending contract | Confirm no rejected research leak |
| Manager squad/economy | manager-state snapshots | AUTOMATED pipeline exists | P0 | Verify latest current-state trigger/freshness |
| Overall rank/rank utility | decision stack | AUTOMATED | P2 | Confirm public FPL rank freshness |

### Source-coverage acceptance rule

A fact family cannot be marked `COVERED` until the exact provider, authority tier, known-at field, freshness budget, fallback and failure effect are documented and tested.

## 2. Deadline Authority Contract — draft

### Inputs

- target FPL Gameweek ID;
- official FPL event row / `deadline_time`;
- current fixture calendar for cross-check;
- database/server current UTC timestamp.

### Output

```json
{
  "ok": true,
  "gameweek": 5,
  "official_deadline_at": "...Z",
  "crosscheck_first_kickoff_at": "...Z",
  "crosscheck_expected_deadline_at": "...Z",
  "crosscheck_delta_seconds": 0,
  "authority": "OFFICIAL_FPL_EVENT",
  "state": "VERIFIED",
  "blockers": []
}
```

### States

- `VERIFIED` — official deadline present and calendar cross-check plausible.
- `OFFICIAL_ONLY` — official deadline present but fixture cross-check unavailable; may be acceptable depending fixture state.
- `CONTRADICTED` — official deadline materially conflicts with calendar expectation.
- `MISSING` — official deadline unavailable.

### Policy

- only `VERIFIED`/approved `OFFICIAL_ONLY` may enter autonomous final-window progression;
- `CONTRADICTED` or `MISSING` blocks final authorization;
- no fallback to inferred `first kickoff - 90m` as final authority.

Current positive evidence: live `sync-fpl-actual-decision` v2 already fetches the official FPL event and enforces `deadline_time` before reading locked picks. C0273 should generalize this authority; it should not invent a separate deadline clock.

## 3. Health-state contract

Health dimensions are independent.

| Dimension | GREEN | AMBER | RED |
|---|---|---|---|
| DATA_HEALTH | required sources fresh | noncritical stale / final source approaching budget | required decision source stale/missing/contradicted |
| MODEL_HEALTH | production quality within monitored band | drift warning | approved safety threshold breached / model integrity failure |
| DECISION_HEALTH | current exact lineage and controls ready | contested/no-meaningful-edge/degraded nonblocking | required lineage/control blocker |
| PUBLICATION_HEALTH | current valid publication | last-valid publication stale but usable as labeled | no trustworthy publication for current state |
| WEBSITE_API_HEALTH | public contract available/within latency budget | partial slow/degraded endpoint | read surface unavailable |
| RESEARCH_HEALTH | expected shadows healthy | delayed/expired research | research integrity problem; does not automatically imply decision RED |

## 4. Work priority contract

| Priority | Work | Preemption rule |
|---|---|---|
| P0 | final source refresh, final projection, C0248 validation, C0234, C0237 | reserved capacity; may pause P4 and defer P3 |
| P1 | live results, actual submission, settlement | may defer P4 |
| P2 | rolling projections/decisioning | normal priority |
| P3 | core background history/team/tactical refresh | defer under P0 load |
| P4 | research/shadow capture/evaluation | first to pause/throttle |

### Planning concurrency principles

- preserve C0269 public max-two cold-request rule;
- controller heavy-work concurrency must be separately bounded server-side;
- one provider outage cannot launch parallel retries across multiple jobs;
- P0 capacity cannot be consumed by research.

Exact numeric server-side budgets remain to be measured before implementation.

## 5. Idempotency / retry work catalog — evidence-backed P0 subset

Detailed evidence: `C0273_CHECKPOINT_02_RETRY_IDEMPOTENCY_AUDIT_20260914.md`.

| Work family | Evidence-backed class | Current planning disposition |
|---|---|---|
| FPL result sync `sync-gw-results` v5 | **RECONCILE_BEFORE_RETRY — P0** | Parent result run can exist before all player rows; matching latest payload can then short-circuit a repair. Do not blind retry. |
| FPL data sync `sync-fpl-data` v3 | **OBSERVATION_APPEND** | Current player/team dimensions upsert safely, but price history and source-sync runs intentionally append with new timestamps. Retry only when a new observation is still required. |
| availability refresh v4 | **RETRY_SAFE_BY_KEY / RECOVERABLE_APPEND** | Semantic availability rows are keyed by `(match_id,player_id,observation_hash)`. Strong candidate for bounded controller retry. |
| current player state v8 | **RECONCILE_BEFORE_RETRY — P0** | Latest-evidence check plus timestamped append is race/partial-batch sensitive; no semantic evidence-hash uniqueness. |
| actual submission sync v2 | **SINGLE_WRITER_REQUIRED — P0** | Official deadline semantics are strong, but table lacks unique Gameweek/entry/signature first-write constraint; concurrent first writers can race. |
| C0248 sequential planner v6 | **RETRY_SAFE_BY_KEY with unique-conflict reconciliation** | `UNIQUE(input_signature)` is strong; simultaneous identical inserts may still surface one duplicate-key error to the losing worker. Reconcile winner. |
| C0248 verified promotion | **RETRY_SAFE_BY_KEY candidate** | Keep deterministic promotion contract; wrap with generation/fencing. |
| C0234 autonomous gate | **RETRY_SAFE_BY_KEY** | `UNIQUE(input_signature)` plus existing lookup/insert dedupe. |
| C0237 publication | **RETRY_SAFE_BY_KEY** | `UNIQUE(input_signature)` plus conflict-safe lookup/insert. Canonical supersession remains separate. |
| team history ingest | append/upsert | AUDIT_REQUIRED |
| Understat ingest | append/upsert | AUDIT_REQUIRED |
| competitive core | append/upsert | AUDIT_REQUIRED |
| team state refresh | deterministic current-state | AUDIT_REQUIRED |
| fixture forecast refresh | deterministic/snapshot | AUDIT_REQUIRED |
| projection horizon cycle | append runs/signatures | AUDIT_REQUIRED |
| full-pool optimizer | append run/signature expected | AUDIT_REQUIRED |
| realized role ingest | append observations | AUDIT_REQUIRED |
| shadow evaluator | experiment-specific | must be declared per experiment |

### Autonomous work contract

No work family may be dispatchable until it declares:

- stable `work_key`;
- immutable `input_lineage`;
- `generation_id` where decision/finalization relevant;
- fencing token/lease epoch for mutating completion;
- queryable `completion_invariant`;
- retry classification;
- deterministic reconcile procedure after timeout/ambiguous failure;
- canonicalization rule;
- deadline commit guard where relevant;
- supersession rule.

A run row, matching input hash or HTTP success alone is not proof of complete work unless the work-family contract explicitly defines it as such.

### Required retry algorithm

`failure/timeout → reconcile durable state → prove COMPLETE / INCOMPLETE / CONTRADICTED → retry only if policy permits → accept completion only under current generation + fencing token`.

There must be no generic blind “retry failed job” primitive in the future control plane.

## 6. Materiality / invalidation map — draft

| Event | Materiality | Invalidate / rerun | Must not invalidate |
|---|---|---|---|
| official deadline change | CRITICAL | lifecycle, final-window schedule, current decision timing | frozen prior historical publication |
| fixture postponement/reschedule | CRITICAL | affected fixture state, horizon projections, decision | unrelated finished-GW evidence |
| player ruled out/suspended | HIGH | availability/xMins, affected projections, decision | unrelated research |
| predicted-XI material change | HIGH | xMins/role, affected projections, decision | immutable past forecasts |
| current price change | MEDIUM/HIGH when affordability affected | manager economy, C0248 feasibility | player xPts directly |
| manager squad/FT/bank change | HIGH | decision state | model forecast core |
| tactical-role material change | MEDIUM/HIGH | role state, affected projections if production-consumed | actual submitted team |
| new team statistical evidence | MEDIUM | future team/fixture/projection chain if signature changes | already-started fixture state |
| new actual match result | HIGH post-match | actuals, realized roles, future states, settlement | pre-deadline frozen xPts |
| bookmaker update | SUPPORTING | approved fixture/supporting state only if contract says material | direct hidden ownership/xPts multiplier |
| shadow experiment result | RESEARCH | experiment evaluator/status | production projections/decision unless separately promoted |
| UI metadata change | LOW | public display/cache only | engine decision chain |

## 7. Deployment freeze contract — draft

- Proposed ordinary change freeze: T−6h to official deadline.
- Applies to: production code, schema, model, critical control configuration.
- Does not apply to: documentation-only branch work, zero-runtime research documentation.
- Emergency exception requires incident record + explicit approval.
- Emergency deploy requires immediate targeted smoke + C0213/governance verification.
- Exact T−6 duration remains a planning parameter until approved.

## 8. Public/internal API boundary — draft

### Public

Allowed:
- current lifecycle/health read;
- canonical recommendation/publication read;
- actual/live read;
- fixture/match/market intelligence read;
- historical read.

Forbidden:
- trigger projection;
- trigger optimizer/planner;
- trigger gate/publication mutation;
- administrative pause/resume;
- secret access.

### Internal

Allowed only with server-side authorization:
- enqueue bounded approved work;
- inspect detailed readiness;
- pause/resume controller;
- incident operations.

Internal orchestration role must not have normal GitHub code-write/deploy authority.

## 9. Digital-twin acceptance test plan — draft

A read-only reconciler must be able to consume recorded/current state and emit expected intended actions without dispatch.

### Golden normal cases

- ordinary rolling refresh;
- unchanged inputs => no rerun;
- projection changed => decision rerun;
- final T−2 progression;
- valid final publication;
- post-deadline actual capture;
- clean settlement.

### Golden failure cases

- duplicate event;
- result-sync parent created but zero child player rows;
- result-sync partial player batches then worker crash;
- equal-payload concurrent result-sync workers;
- player-state partial batch failure then retry;
- concurrent identical player-state refreshes;
- actual-decision concurrent first writers;
- sequential-planner same-signature concurrent inserts;
- worker crash after external work succeeded but before completion record;
- upstream payload changes between observation retries;
- 429 + Retry-After;
- provider timeout;
- stale P0 injury/XI source;
- manager state mismatch;
- mixed prediction lineage;
- deadline missing;
- deadline/calendar contradiction;
- final cross-beam disagreement;
- fixture postponement;
- DGW/BGW;
- result partial/missing player rows;
- post-match points correction;
- public API failure while engine healthy;
- GitHub Actions outage while data APIs healthy;
- research workload spike during final window;
- actual submitted team unavailable;
- stale worker completes after finalization-generation invalidation.

### Pass criteria

- deterministic intended transition/work set;
- no forbidden dispatch;
- correct health dimension;
- last-valid behavior correct;
- no historical rewrite;
- no mixed-lineage decision;
- no research-to-production leak;
- incomplete parent/run markers cannot masquerade as completed work;
- stale/fenced workers cannot make canonical state current.

## 10. Scope decision

C0273 Phase 1 targets **one canonical FPL manager/entry**. Public football intelligence can remain broadly viewable, but personalized multi-tenant manager optimization is deferred to a separate future architecture program.

## 11. Current unresolved P0 planning items

1. Independently audit exact providers/coverage inside availability, expected-XI and late team-news pipelines.
2. Identify a provenance-safe automated manager press-conference/team-news source or formally declare the gap.
3. Audit current manager-state refresh cadence/source.
4. Complete retry/idempotency audit for remaining controller-dispatched families and define exact completeness invariants for the three P0 unsafe families found in Checkpoint 02.
5. Measure safe server-side concurrency/resource budgets.
6. Define FPL points settlement/correction criterion.
7. Map every current consumer that still infers deadline from kickoff; official FPL deadline is already proven in the locked-picks path.
8. Choose public health contract versioning strategy.
9. Define external alert channel for SEV0/SEV1 once implementation is authorized.
10. Finalize publication canonical-pointer/supersession semantics.

## 12. Planning-only notice

This contract package changes no runtime behavior. It exists so implementation cannot begin from ambiguous operational assumptions.
