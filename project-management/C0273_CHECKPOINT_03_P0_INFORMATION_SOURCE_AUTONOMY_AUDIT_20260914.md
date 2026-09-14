# C0273 — Checkpoint 03: P0 Information-Source Autonomy Audit

Date: 2026-09-14  
Program: Autonomous Website / Engine Control Plane  
Status: PLANNING / AUDIT ONLY  
Runtime/model effect: NONE

## 1. Objective

Test whether the Football Intelligence Engine currently has sufficient machine-readable source coverage to make unattended FPL decisions without ChatGPT or a human analyst filling information gaps.

This checkpoint does **not** choose or integrate new providers. It classifies current evidence, gaps and required contracts before any implementation approval.

## 2. Executive judgment

The engine has strong automated numerical/state infrastructure, but it **does not yet satisfy the standard for fully unattended information autonomy**.

The largest gap is not model intelligence. It is source assurance around late qualitative information.

Current predeadline availability/expected-XI evidence is sourced primarily from:

1. official FPL bootstrap status/chance/news fields; and
2. the engine's own player-state start-probability / expected-minutes model.

That is useful but is not equivalent to an independent, provenance-safe manager press-conference / club team-news feed.

A second material gap is current-manager-state orchestration: manager snapshots exist, but no active cron directly invoking `sync-fpl-manager-state` was found. Existing snapshots are sparse and currently stop at GW4 in the inspected live state. A fully autonomous decision controller must prove current squad, free transfers, bank and purchase-price lineage before optimizing any target Gameweek.

Therefore C0273 must retain `DO NOT IMPLEMENT YET` until these information contracts are resolved.

## 3. Availability / injury / suspension coverage

### Live evidence

`refresh-availability-intelligence` v4 is active and runs every four hours through `football_intelligence_availability_refresh`.

Its live source is `https://fantasy.premierleague.com/api/bootstrap-static/`.

For each relevant player it consumes:

- official FPL `status`;
- `chance_of_playing_next_round`;
- FPL `news` text;
- current player-state `start_probability`;
- current player-state `expected_minutes`.

It persists chronology-safe fixture-specific observations with semantic hash uniqueness.

Observed availability rows are explicitly tagged `source=official_fpl_bootstrap`. Current evidence contains AVAILABLE, DOUBTFUL, INJURED, SUSPENDED and UNAVAILABLE states.

### Important limitation

The current availability evidence itself records:

- `source_item_timestamp_available=false`;
- fetch time, but no authoritative timestamp for when the FPL news item/status actually changed.

This means the controller can know **when we learned the fact**, but not necessarily when the provider first published the underlying item.

### Planning classification

`PARTIALLY_COVERED_P0`

Official FPL is a valuable authoritative game source, but it is not sufficient proof that late press-conference statements, training updates or manager quotes are always represented promptly before a deadline.

## 4. Predicted XI / expected-minutes coverage

### Live evidence

The current expected-XI field is not an external predicted-lineup feed.

`refresh-availability-intelligence` calculates a candidate XI by selecting the highest internal start probabilities under legal FPL formation constraints. Its own evidence explicitly labels the method:

`max_start_probability_under_valid_fpl_formation`

and warns:

`formation_is_candidate_shape_not_tactical_prediction=true`.

`player_state` supplies internal expected minutes / start probability. Current player states include a nested `predicted_xi` signal and current-season / historical / realized-role evidence.

### Consequence

The engine has a strong internal lineup probability system, but the term “predicted XI” must not be treated as independent external confirmation.

For full autonomy, the controller needs to distinguish at least:

- `MODEL_XI` — our internal inference;
- `OFFICIAL_AVAILABILITY` — official FPL status/news;
- `EXTERNAL_PREDICTED_XI` — independent predeadline lineup evidence, if approved;
- `CONFIRMED_XI` — official team sheet when timing makes it relevant.

These sources must not be silently collapsed into one confidence value.

### Planning classification

`MODEL_COVERED / EXTERNAL_CONFIRMATION_GAP`

This is adequate for normal rolling decisioning, but not yet sufficient evidence for the claim that late lineup uncertainty is fully autonomous.

## 5. Press conferences / manager team news

### Repository/database audit

No dedicated table, Edge Function, scheduled job or explicit current source contract was found for:

- manager press conferences;
- club press releases as structured availability evidence;
- trusted journalist/club training reports;
- late manager quotes with provenance and known-at timestamps.

FPL `news` text can reflect some of these facts indirectly, but the current system cannot prove its source coverage, original publication timestamp, completeness or latency.

### Planning classification

`P0_GAP`

### Required contract before implementation

A future source must define:

- provider / authority tier;
- player/team identity mapping;
- original published/effective timestamp when available;
- ingestion known-at timestamp;
- fact taxonomy: OUT / DOUBTFUL / AVAILABLE / TRAINING / MANAGER_QUOTE / MINUTES_LIMIT / ROTATION_RISK / RETURN_DATE etc.;
- evidence URL / source reference;
- contradiction handling against official FPL;
- materiality rules;
- freshness SLA in ordinary and final windows;
- outage/failure state;
- licensing/usage permission;
- no direct numeric xPts effect unless separately validated.

Until this is proven, the product must not claim “all late team news automatically covered.”

## 6. Set pieces

### Penalties

Penalty hierarchy is genuinely production-consumed.

`private.fpl_penalty_profile_v01` reads `players.penalties_order`, describes the hierarchy source as `current_official_fpl_order`, and applies minutes-based backup inheritance. The current `refresh-availability-intelligence` bootstrap refresh also writes FPL penalty, direct-free-kick and corner order fields into `players`.

### Free kicks / corners

The official FPL hierarchy fields are stored, but the audit found no general production function using `direct_freekicks_order` or `corners_and_indirect_freekicks_order`; the only database function reference found is a C0147 research capture.

### Planning classification

- penalties: `PRODUCTION_COVERED`, subject to final-window refresh cadence;
- direct free kicks/corners: `STATE_CAPTURED_BUT_PRODUCTION_CONSUMPTION_NOT_PROVEN`.

This distinction must remain explicit. Stored data is not automatically a consumed model feature.

## 7. Transfers / registrations

`public.player_transfer_events` exists with provenance fields (`source_key`, `source_url`, `source_published_at`, event/effective timing and evidence), but inspected events are a mixture of explicit researched transfer records and FPL-added detections. The rows currently have `model_effect_enabled=false`.

The live FPL player dimension will naturally reflect many registrations/additions, but C0273 has not proven an authoritative, continuously automated transfer/registration event source with completeness guarantees.

### Planning classification

`DIMENSIONALLY_COVERED / EVENT_CONTRACT_INCOMPLETE`

For decision autonomy this is usually less urgent once a player appears correctly in official FPL, but it matters for newcomer priors, team identity transitions and late registration state.

## 8. Fixture congestion / cup / Europe rotation context

The engine has a strong fixture calendar and tactical/history system, but this audit found no explicit P0 contract proving complete machine coverage of non-Premier-League congestion as a rotation/xMins input.

Premier League fixtures alone are insufficient for this purpose: Champions League, Europa League, Conference League and domestic cups can materially affect starts/minutes.

### Planning classification

`P0/P2 GAP AS EXPLICIT AUTONOMY CONTRACT`

The future controller needs a canonical schedule source that includes relevant non-league fixtures and a conservative materiality rule. The source may alter rotation/xMins evidence only through an approved existing consumer or separately validated future feature; C0273 must not invent a new numeric fatigue model merely to close the source gap.

## 9. Tactical role coverage

Current tactical role state is substantially automated:

- role/tactical refresh twice daily;
- realized-role ingest hourly;
- realized roles sourced from FotMob match details with chronology-safe `known_at` evidence;
- current player state can consume realized-role evidence for future projections.

This is strong state automation, but final-window freshness is weaker than the four-hour availability cycle and much weaker than a late-news/event-driven source.

### Planning classification

`AUTOMATED_P2; CONDITIONAL_P0_IF_LATE_ROLE_CHANGE`

## 10. Manager squad / economy coverage — newly identified orchestration gap

### Live evidence

`public.fpl_manager_state_snapshots` currently contains only four inspected snapshots:

- GW3: one snapshot;
- GW4: three snapshots;
- latest inspected snapshot: 2026-09-08 07:58:57 UTC.

No active cron command containing `sync-fpl-manager-state` was found.

The existing final-promotion watcher and optimizer consume manager-state snapshots, so a stale snapshot can become an autonomy blocker or, worse, an incorrect input if freshness is not enforced.

### Planning classification

`P0_ORCHESTRATION_GAP`

### Required contract

Before optimizer/decision work may run autonomously, manager state must have:

- target Gameweek;
- FPL entry ID;
- current 15-player squad;
- purchase prices / selling-price lineage;
- bank;
- free transfers;
- chip availability/history where relevant;
- source known-at;
- snapshot freshness budget;
- deterministic completeness invariant;
- single-writer/fenced capture contract;
- exact relationship to postdeadline actual-submission capture.

The controller must not infer current manager state from an old recommendation or from the previous actual team.

## 11. Revised P0 source matrix

| Fact family | Current judgment | Autonomy disposition |
|---|---|---|
| Official FPL deadline | Proven source exists in locked-picks path | COVERED once generalized as canonical clock |
| League fixtures | Automated | COVERED, anomaly contract still needed |
| Price/player metadata | Automated every 4h | COVERED with final-window cadence review |
| Availability/status | Official FPL automated every 4h | PARTIALLY COVERED P0 |
| FPL news text | Automated, no source-item timestamp | SUPPORTING ONLY |
| Internal xMins/start probability | Automated | MODEL COVERED |
| Internal expected XI | Automated internal inference | MODEL COVERED; not external confirmation |
| External predicted XI | No approved source proven | GAP |
| Press conference/team news | No dedicated source proven | P0 GAP |
| Penalty hierarchy | Official FPL state + production consumer | COVERED |
| Direct FK/corner hierarchy | Captured but production consumption not proven | STATE ONLY |
| Transfers/registration | FPL dimension + provenance table, no completeness contract | PARTIAL |
| Cup/Europe congestion | No explicit complete source contract proven | P0/P2 GAP |
| Tactical/realized roles | Automated | COVERED P2; conditional P0 |
| Manager squad/FT/bank | Snapshot system exists, recurring refresh not proven | P0 ORCHESTRATION GAP |
| Actual submitted team | Automated postdeadline | COVERED with single-writer hardening |
| Results/player actuals | Automated | COVERED with completion/settlement hardening |

## 12. External-senior-analyst challenge

A fully autonomous website must not confuse **automation density** with **information completeness**.

The current engine is highly automated numerically, but the remaining human value has often been precisely in noticing context the structured feeds did not express quickly enough: unexpected role usage, likely starts, manager comments, injuries, late rotation signals and schedule context.

Therefore the autonomy controller should not simply run the existing pipeline more frequently. It needs a **Source Readiness Gate** that can honestly say:

- `P0_INFORMATION_COMPLETE`;
- `P0_INFORMATION_DEGRADED`;
- `P0_QUALITATIVE_SOURCE_MISSING`;
- `MANAGER_STATE_STALE`;
- `EXTERNAL_XI_CONFIRMATION_UNAVAILABLE`.

A degraded state may still permit a labeled PRE-FINAL plan, but final autonomous authorization must follow an explicit approved policy rather than silently pretending all information is present.

## 13. Recommended plan changes

Add the following to C0273 before implementation:

1. **Source Readiness Registry** as a first-class controller input, separate from generic data freshness.
2. **Evidence independence tags** so internal model XI cannot count as independent confirmation of itself.
3. **Qualitative Team-News Adapter contract** with provenance, timestamps, contradictions and failure modes.
4. **Manager-State Capture contract** as a P0 prerequisite to optimizer/decision dispatch.
5. **Congestion Schedule contract** covering relevant non-PL fixtures.
6. **Set-piece consumption map** distinguishing stored hierarchy from production-used hierarchy.
7. **Final-window source freshness policy** by fact family rather than one global freshness threshold.
8. **Graceful degraded mode**: publish current provisional evidence with explicit blocker; never manufacture confidence.

## 14. Open decisions for user review

No implementation is proposed yet. Before implementation, the user should eventually approve:

- whether independent external predicted-XI evidence is mandatory for FINAL or merely a confidence enhancer;
- acceptable team-news provider class/cost/licensing constraints;
- whether missing press-conference coverage blocks FINAL universally or only when a monitored material player/team has unresolved availability/rotation state;
- the maximum acceptable final-window age for official FPL availability/news data;
- how much non-league congestion should affect xMins before requiring separate empirical validation.

## 15. Explicit non-changes

This audit changed no:

- schema;
- cron;
- Edge Function;
- source ingestion;
- model weight/numeric;
- C0248/C0234/C0237 behavior;
- shadow promotion/retirement state;
- website runtime;
- historical forecast;
- FPL action.

All production changes remain explicit-approval gated.
