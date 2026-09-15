# C0273 — Checkpoint 37: Non-SQL Availability & Realized-Role Semantic Boundary

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoint 36 by tracing non-SQL availability consumption and the realized-role path far enough to define the correct semantic boundary. This checkpoint is read-only architecture analysis. It changes no schema, function, model, projection, planner, scheduler, API/UI, publication, promotion or retirement behavior.

## 1. Continuity

Checkpoint 36 remains binding: availability requires separate domain-semantic and production-authority-trigger consumer coverage. Provenance identity remains distinct from semantic identity. Research/shadow consumption must not silently become a production invalidator.

C0273 remains `Open / Planned / P0 / Pre-VPS Stabilization Planning` with zero runtime/model effect.

## 2. Live runtime outranks repository snapshot

A material source-of-truth contradiction was found during this trace.

The deployed `refresh-current-player-state` is live version 8 and contains the `0.4_xmins_regime_symmetric` logic. The repository `main` and the C0273 planning branch still expose an older implementation without that regime logic. Likewise, deployed `fpl-sequential-planner` is version 6 while repository `main` currently exposes an older version 4 implementation.

This does **not** authorize any repository repair in this checkpoint. It does mean that consumer classification must use deployed runtime evidence where repository code disagrees.

New stabilization issue:

> GitHub cannot yet be assumed to be a complete source-recovery representation of the currently deployed Supabase Edge runtime.

Before VPS migration or any source-controlled rebuild, deployed-runtime/source parity must be proven and reconciled without rewriting history.

## 3. Non-SQL availability trace

### 3.1 Source generation

Deployed/repository `refresh-availability-intelligence` fetches official FPL bootstrap state and writes both:

- player-level source fields into `players`, including `status`, `chance_of_playing_next_round`, and `news`;
- fixture/player availability observations containing `fpl_status_code`, normalized `availability_status`, `chance_of_playing`, `news`, base start probability/xMins, expected-XI state/formation/rank and confidence.

Its source observation hash includes status, chance, news, player-state timestamp/start/xMins, expected-XI, formation and rank. Therefore the hash remains provenance/version-sensitive and is not an authority semantic identity.

### 3.2 Direct numeric source-level consumer

Live `refresh-current-player-state` v8 directly reads `players.status` and `players.chance_of_playing_next_round` and computes `currentAvailability()`.

That value multiplies latent start/appearance probabilities and therefore changes future start probability and expected minutes. These fields are therefore **E1 numeric production inputs**, even though their authority effect does not require the `current_player_fixture_availability` view itself.

This closes an important Checkpoint 36 ambiguity:

- FPL status is production-semantic.
- chance of playing is production-semantic.
- their production effect exists through the player-state path as well as fixture-availability derivatives.

### 3.3 `news`

`news` is ingested and included in the availability observation hash, but the bounded live Edge/API/optimizer trace did not identify a current authoritative numerical, selection, blocking or publication consumer of the text itself.

Decision: `news` remains domain/provenance semantic evidence but is **not yet proven authority-trigger semantic state**.

This is not an irrelevance declaration. A future press/team-news normalizer or promoted qualitative consumer could change its classification and must version semantic policy.

### 3.4 `expected_xi_formation`

The formation label participates in the availability source hash and can be carried as evidence, but the bounded authority trace did not prove direct production decision consumption of the formation string itself.

The authoritative effect currently comes from `expected_xi`, confidence and downstream role/player-state behavior. `expected_xi_formation` therefore remains unresolved/supporting rather than authorized as an independent production invalidator.

## 4. Realized-role source and derived semantic state

`ingest-realized-player-roles` derives tactical role from FotMob starter layout coordinates, tactical band, width band and formation. Its observation hash contains the exact derived payload, including source player identity, mapping state, formation, layout coordinates/bands and realized role.

`current_realized_player_roles` does not simply expose the latest raw row. It:

1. resolves canonical player identity;
2. restricts to mapped starting rows with a realized role and `production_role_enabled`;
3. takes the latest role;
4. aggregates the last three role samples;
5. exposes `recent_role_samples`, `latest_role_matches_l3`, and `role_stability`.

Therefore the production-semantic unit is not the raw FotMob observation hash. It is the **resolved derived player-role state plus stability context**.

## 5. Realized role is now a genuine production effect

The live v8 player-state consumer materially supersedes older documentation/source snapshots that described realized role as role-fact-only with no numeric uplift.

Live `refresh-current-player-state` v8 consumes:

- current realized role;
- tactical band / width band;
- formation;
- role confidence;
- role stability;
- recent role sample count;
- latest-role matches within L3;
- predicted-XI state and confidence.

A positive xMins regime requires repeated starts **plus stable realized role plus predicted-XI inclusion**. The regime changes the effective historical prior and can raise latent start probability; the function then writes new start probability and expected minutes. A negative regime uses repeated non-starts plus predicted-XI exclusion.

Thus realized-role state can now affect xMins numerically through the symmetric regime logic. This is an **E1 production effect**, not merely an advisory role label.

Separately, `current_player_role_profiles` overlays the current realized role onto the behavioral archetype profile, and `refresh_player_fixture_role_snapshots` propagates primary role/confidence into `current_player_fixture_roles`.

Both deployed `fpl-full-pool-optimizer` and C0248 `fpl-sequential-planner` consume `current_player_fixture_roles.primary_role/confidence` and apply control-role risk gates to MID/FWD selection. Realized role therefore also has an **E2 selection effect**.

## 6. Target realized-role semantic boundary

A future `realized_role_semantic_policy_v1` should not hash every raw coordinate/timestamp. The candidate authority-relevant derived state is:

- resolved canonical player identity;
- current/realized role;
- role confidence;
- role stability;
- recent role sample count;
- latest-role matches within L3;
- tactical band;
- width band;
- formation where still consumed downstream;
- mapping/identity validity class;
- relevant chronology/evidence frontier identity.

Exact source URL, capture timestamp and raw observation ID remain provenance.

Raw layout coordinates should not independently advance production semantic generation when they change without changing any registered derived authoritative state. This remains conditional on completing any remaining consumer trace that might directly use coordinates.

## 7. Identity changes are hard-integrity events

A realized-role observation can be semantically identical in tactical role but mapped to a different canonical FPL player after identity reconciliation. That is not a harmless provenance change.

Target rule:

> canonical player-identity change is a hard semantic/integrity change even if the role label is unchanged.

This is necessary because a wrong-player role can alter xMins and optimizer eligibility for the wrong asset.

## 8. Availability/role dependency chain

The current authority-relevant chain is now clearer:

`official FPL status/chance + player-state history + predicted XI + realized-role stability -> current player state/xMins -> fixture role state -> projections and role gates -> C0213/C0248 decision paths`

This means availability and role generations cannot be designed independently as unrelated clocks. Their dependency vector must preserve which availability/role/predicted-XI generation produced the consumed player-state generation.

Do not collapse them into one global generation.

## 9. Red-team

### Failure A — semantic hash raw FotMob coordinates

Minor coordinate jitter could create constant replanning even when derived role/stability is unchanged.

**Reject by default.** Preserve coordinates in provenance; authority generation follows registered derived semantics.

### Failure B — semantic hash only the latest role label

`WIDE_ATTACKER -> WIDE_ATTACKER` can still change stability/confidence enough to cross the v8 xMins-regime threshold.

**Reject.** Stability/confidence/sample context is authority-relevant.

### Failure C — treat role as non-numeric because older C0212/C0214 text says so

Live v8 uses role stability in an xMins regime and current optimizers use role gates.

**Reject.** Live runtime semantics supersede the historical statement; preserve the old statement as historical truth for its era.

### Failure D — treat `news` text changes as automatic production invalidation

Would create churn without a proven authoritative text consumer.

**Reject for now.** Preserve evidence; reclassify if a promoted consumer uses it.

### Failure E — omit FPL status/chance because they bypass fixture-availability view

Would miss a direct numeric player-state dependency.

**Reject.** Consumer registry must include source-level and transitive consumers, not only table/view readers.

### Failure F — ignore repository/runtime drift

A VPS/source-controlled rebuild could silently deploy older logic than production.

**Hard blocker for migration/rebuild.** Source parity requires a separate approval-gated reconciliation package.

## 10. Planned repair packages — NOT AUTHORIZED

### S2-R36B closure candidate — Non-SQL availability registry

Record direct source-level consumers (`players.status`, `chance_of_playing_next_round`) and classify `news` / expected-XI formation according to proven effect boundaries.

### S2-R41 — Realized-role semantic policy v1

Define derived player-role semantic identity around resolved identity, role/stability/confidence/sample context and registered downstream consumption.

### S2-R42 — Cross-domain consumed-generation vector

Bind availability, predicted-XI, realized-role and player-state generations so current xMins can be reconciled causally.

### S2-R43 — Deployed-runtime / GitHub source parity audit

Inventory deployed Edge versions/hashes against repository source, identify runtime-only versions, recover source history where possible, and establish release/source provenance before VPS migration.

No code sync, deployment or rollback is authorized by this checkpoint.

## 11. Acceptance scenarios

Future implementation should prove:

- status/chance changes that alter player-state availability advance the numeric semantic dependency;
- `news` text-only change does not invalidate production authority absent a registered authoritative text consumer;
- raw coordinate jitter with unchanged derived role/stability does not independently force decision reconciliation;
- role-stability/confidence changes crossing the xMins regime boundary do reconcile player state/projections;
- a role-family change affecting MID/FWD control-role gating reconciles C0248/optimizer authority;
- canonical identity remap hard-invalidates affected derived role state;
- historical realized-role observations/hashes remain immutable;
- deployed runtime can be reconstructed exactly from source-controlled artifacts before VPS migration.

## 12. Contradictions / open questions preserved

1. `news` is not proven authority-triggering today, but qualitative-source autonomy remains incomplete and a future normalized team-news consumer may change this.
2. `expected_xi_formation` is not proven as an independent authority trigger; its exact downstream role remains open.
3. Exact numeric equivalence/tolerance for status/chance/xMins/confidence remains counterfactual-test driven and unresolved.
4. Exact raw-coordinate consumers outside the bounded inspected authority path remain to be ruled out before coordinates can be formally excluded from authority semantics.
5. Role stability uses the latest three realized-role samples; the optimal semantic representation/versioning of this rolling state remains open.
6. Older repository/main `refresh-current-player-state` source says numeric role uplift disabled, while deployed v8 explicitly enables a role-dependent xMins regime. This is preserved as a live source/runtime contradiction, not silently rewritten.
7. Repository/main `fpl-sequential-planner` is older than deployed v6. Broader deployed-runtime/source parity is therefore not proven.
8. Manager-state authority remains unresolved under Checkpoint 29.
9. Official deadline authority remains unresolved under S1-R1.
10. Canonical publication authority remains unresolved under S1-R3.
11. C0213 full-pool optimizer remains a live hard dependency pending Checkpoint 26 closure evidence.
12. No FPL account execution is authorized.

## 13. Decision

C0273 records that non-SQL tracing materially changes the semantic picture. FPL status/chance are direct numeric player-state inputs; `news` is currently evidence-only absent a proven authority consumer; and realized-role state is a genuine E1/E2 production dependency through live xMins-regime and optimizer role-gate paths. The correct role semantic unit is derived resolved role/stability state, not raw source observation identity.

A new P0 pre-VPS loose end is also recorded: deployed Supabase Edge runtime is ahead of repository source for at least `refresh-current-player-state` and `fpl-sequential-planner`. GitHub source-recovery parity must be proven before migration/rebuild.

No production behavior changed.

**All implementation, deployment, schema, scheduler, cadence, source, projection, model, planner, gate, publication, API/UI, promotion/retirement, source-reconciliation and account-execution changes remain explicitly approval-gated.**