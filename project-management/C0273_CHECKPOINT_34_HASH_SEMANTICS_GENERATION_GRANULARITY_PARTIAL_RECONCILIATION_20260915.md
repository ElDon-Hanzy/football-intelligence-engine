# C0273 — Checkpoint 34: Hash Semantics, Generation Granularity & Partial Reconciliation

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoint 33 by inspecting the two live upstream families that already expose `observation_hash`, determine whether those hashes are safe semantic-generation primitives, and bound the target generation granularity/partial-horizon reconciliation contract. No schema, function, cron, projection, planner, model, API/UI, publication, promotion or retirement behavior is changed.

## 1. Baseline and tracker continuity

Checkpoint 33 remains binding: the target autonomy architecture needs observation identity, normalized semantic identity, domain generation and consumed-generation vectors. Timestamp drift alone cannot safely decide material staleness.

C0273 remains `Open / Planned / P0 / Pre-VPS Stabilization Planning`, model effect `None. Planning/documentation only; zero runtime/model effect.`

## 2. Live hash-surface inspection

### Availability observations

`player_fixture_availability_observations` contains both decision-relevant state and refresh/derived state in the same row, including:

- FPL status / availability status / chance of playing / news;
- base start probability and expected minutes;
- XI score, expected-XI flag, candidate formation and rank;
- confidence;
- captured/source timestamps;
- JSON evidence including fetch time/state age;
- `observation_hash`.

A latest GW5 row inspected at 2026-09-15 04:10 UTC shows `evidence.fetch_time` and `state_age_hours` alongside football-state fields. The database surface does not expose the hash-normalization definition itself.

Empirical check: across 11,735 successive same-player/same-match GW5 observation comparisons, **0 retained the same observation hash and 11,735 changed hash**.

That is strong evidence that the current availability `observation_hash` is an **observation/version identity**, not a safe decision-semantic identity. It may include timestamp/derived refresh-sensitive content, or other fields that routinely change even when football meaning is equivalent. We must not use hash inequality as automatic material invalidation.

### Realized-role observations

`realized_player_role_observations` contains rich source payload plus normalized role fields:

- formation/start/position/layout;
- tactical and width bands;
- realized role / confidence / mapping status;
- production/model-effect flags;
- source payload and identity evidence;
- `observation_hash`.

Across 228 successive same-player/same-match comparisons in the inspected GW1-GW4 data, **0 retained the same hash and all 228 changed**.

Again, the current hash behaves as an observation identity rather than proven normalized role-semantic identity. The source payload contains many non-role fields (for example performance/ranking/market-value metadata), so hashing broad payload state would be too sensitive for role-generation authority.

This does not make either hash useless. Both remain valuable immutable provenance/evidence identities. It means they should sit at I1, not be promoted to I2/I3 without a separately defined normalization contract.

## 3. Granularity decision

The target should use **hybrid granularity**, not one generation per whole domain and not one generation per every raw row.

Recommended planning contract:

### Availability semantic identity

Base unit: `(player_id, fixture_id/gameweek context)` normalized decision state.

Aggregate generation: per-GW availability generation derived from the ordered set of current player-fixture semantic identities, while preserving changed-player membership for targeted invalidation.

Why: player-level changes are common and targeted; C0248/projections ultimately consume a GW player universe. A pure global generation over-invalidates; pure row-level lineage is too expensive to carry everywhere.

### Realized-role semantic identity

Base unit: `(player_id, realized evidence horizon)` canonical role state, not every raw match observation.

Aggregate generation: role-policy generation plus per-player canonical role-state identity; optionally per-GW aggregate for projection snapshot binding.

Why: historical match observations should not invalidate future projections merely because new source metadata arrives. Only a canonical role-state change that crosses the consumed role policy matters.

### Fixture/schedule identity

Base unit: fixture identity including opponent/home-away/kickoff/status and canonical fixture-forecast generation.

Aggregate: per-GW fixture generation with changed-fixture membership.

### Player universe/state

Base unit: player identity/state relevant to legality/projection (team, FPL position, price/status/eligibility as consumed).

Aggregate: per-GW/current player-universe generation plus changed-player membership.

### Deadline

Base unit and generation: per-GW official deadline authority. No global deadline generation is needed.

### Model definition

Base unit: immutable production model/consumer definition identity. Aggregate only where a canonical capability family requires it.

## 4. Partial-horizon reconciliation contract

A material change should invalidate the **smallest safe dependency closure**, not automatically the full GW5-GW7 horizon.

Target sequence:

1. detect normalized semantic change at the base unit;
2. map changed unit to affected projection GW(s)/fixtures/players;
3. advance affected domain/GW generation;
4. compare each projection artifact's consumed vector;
5. refresh only invalidated projection snapshots where the current engine can safely do so;
6. because C0248 is sequential across the horizon, rerun the planner if any horizon input it consumes materially changes;
7. do not require unchanged projection snapshots to be regenerated merely to obtain matching timestamps;
8. propagate exact old/new generation evidence into the new planner/publication artifact.

Important distinction: **partial projection refresh does not imply partial planner refresh.** A GW7 input change may leave GW5 projection rows untouched but can still change GW5 transfer strategy through multi-GW optionality, so the sequential planner must reconcile the whole decision path it consumes.

## 5. Coalescing and work identity

The PRE-FINAL controller should not dispatch once per changed player.

Recommended work identity:

`target_gameweek + manager_state_identity + ordered consumed domain-generation vector + planner_policy_identity`

Multiple upstream changes arriving inside a bounded coalescing interval may advance the same pending target vector. Reconcile-before-dispatch should suppress work if the current authoritative PRE-FINAL artifact already covers an equivalent vector.

Exact debounce duration remains telemetry-driven and is not chosen here.

## 6. Red-team

### Failure A — reuse current observation_hash as semantic generation

Live evidence shows virtually every successive observation changes hash. This would turn normal refresh into constant hard invalidation.

**Reject.** Preserve it as provenance identity unless its exact definition is later proven narrower than observed behavior suggests.

### Failure B — normalize too aggressively

Ignoring a field that affects xMins/role/legality can leave materially stale projections current.

**Guard:** semantic definitions must be consumer-bound and behaviorally tested.

### Failure C — one per-GW aggregate only

A single changed player would prove the GW changed but not identify the minimal invalidation set.

**Guard:** retain changed-member evidence beneath aggregate generation.

### Failure D — carry every row hash through C0248/C0237

Lineage becomes huge and brittle.

**Guard:** artifacts carry aggregate/domain generation identities plus immutable references to member-level evidence.

### Failure E — refresh only the directly changed GW and keep the old sequential planner

A GW6/GW7 change can alter current transfer value.

**Guard:** projection refresh can be partial; planner reconciliation follows the full consumed horizon.

### Failure F — role observation payload changes because performance/ranking metadata changed

Could falsely imply role change if raw payload is hashed.

**Guard:** role semantic identity uses normalized canonical role-policy inputs/output, not broad provider payload.

### Failure G — candidate formation churn becomes availability semantic drift

`expected_xi_formation` is explicitly a candidate valid-FPL shape, not necessarily tactical prediction. Treating every shape rerank as material availability change could over-trigger.

**Guard:** define whether formation/rank are consumed materially by the exact projection consumer before including them in semantic identity.

## 7. Planned repair packages — NOT AUTHORIZED

### S2-R31 — Availability semantic-normalization definition

Specify/version the exact availability/xMins fields that constitute decision-semantic identity. Keep current `observation_hash` as provenance unless proven suitable.

### S2-R32 — Canonical realized-role semantic-normalization definition

Define semantic identity from canonical role-policy state rather than raw match/source payload.

### S2-R33 — Hybrid generation aggregation

Expose per-unit change membership plus compact per-GW/domain generations.

### S2-R34 — Dependency-closure mapper

Map changed semantic units to affected projection snapshots and decision horizons.

### S2-R35 — Partial projection / full planner reconciliation

Allow unchanged horizons to retain valid projection identity while requiring C0248 to reconcile whenever any consumed horizon materially changes.

## 8. Acceptance scenarios

Future implementation should prove:

- identical FPL availability state fetched at two times produces equal semantic identity despite different observation hashes/fetch times;
- meaningful chance-of-playing/xMins state change produces a new semantic identity;
- provider news wording change with unchanged consumed state is classified according to explicit consumer policy rather than automatically hard-invalidated;
- source payload performance/ranking change with unchanged canonical realized role does not advance role semantic generation;
- canonical role change does advance the affected player's role identity;
- one GW6 player's material change can invalidate only necessary GW6 projection work while still causing sequential planner reconciliation;
- unchanged GW7 projection remains valid after unrelated GW6 change;
- aggregate generation exposes changed-member evidence for audit;
- repeated controller ticks do not duplicate equivalent work;
- stale worker cannot commit after required generation advances;
- historical observation hashes remain untouched.

## 9. Contradictions / open questions preserved

1. Exact SQL/application code that computes the existing two observation hashes was not located in the inspected GitHub/default searchable surface; live empirical behavior is sufficient to reject them as *proven* semantic identities, but their exact field sets remain unresolved.
2. Availability fields such as `news`, candidate `expected_xi_formation`, XI rank and confidence may or may not belong in semantic identity depending on their exact downstream consumption; consumer tracing is still required.
3. `base_expected_minutes` and `base_start_probability` are clearly decision-relevant in principle, but exact materiality/rounding thresholds must be derived from behavior/replay, not guessed.
4. Realized-role `model_effect_enabled=false` on inspected rows coexists with `production_role_enabled=true`; the exact current bounded numeric-consumption path remains governed by earlier C0212/C0220 adjudication and should not be reinterpreted from these flags alone.
5. Exact storage primitive for aggregate generations and member evidence remains unresolved.
6. Partial projection refresh capability and cost are still unverified at implementation level.
7. Manager state remains an independent PRE-FINAL authority issue under Checkpoint 29.
8. Official deadline authority remains unresolved under S1-R1.
9. Canonical publication authority remains unresolved under S1-R3.
10. C0213 full-pool optimizer remains a live hard dependency pending Checkpoint 26 closure evidence.
11. No FPL account execution is authorized.

## 10. Decision

C0273 records that the existing availability and realized-role `observation_hash` values should be treated as **I1 provenance/observation identities, not assumed I2 semantic identities or I3 generations**. Live repeated-observation behavior shows hash churn on every inspected successive same-entity observation, making direct use for material-drift invalidation unsafe.

Target generation granularity is hybrid: member-level normalized semantic identity plus compact per-GW/domain generations and changed-member evidence. Projection refresh should invalidate the smallest safe dependency closure, while C0248 must reconcile the full sequential horizon whenever any consumed horizon materially changes.

No production behavior changed.

**All implementation, deployment, schema, scheduler, cadence, source, projection, model, planner, gate, publication, API/UI, promotion/retirement and account-execution changes remain explicitly approval-gated.**
