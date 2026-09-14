# C0273 — Checkpoint 07: Unified Generation & Dependency Model

Date: 2026-09-14  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE

## Purpose

Define the canonical generation, dependency, invalidation and supersession model for an autonomous FIE website/controller. This checkpoint connects the prior C0273 deadline, source-readiness, manager-state, distributed-control and result-settlement findings into one coherent contract.

The design goal is to prevent two opposite failure modes:

1. **under-invalidation** — stale work remains canonical after an upstream fact changes;
2. **over-invalidation** — unrelated evidence changes unnecessarily rerun or invalidate the whole Gameweek.

The future controller must therefore reason over a **generation vector**, not one global generation number and not one coarse `ready=true` flag.

---

## 1. Core principle: independent monotonic generation axes

For each target Gameweek, maintain independent monotonic generations for materially distinct state families.

Minimum P0 axes:

- `deadline_generation`
- `source_readiness_generation`
- `manager_state_generation`
- `fixture_generation`
- `availability_generation`
- `role_xmins_generation`
- `projection_generation`
- `decision_generation`
- `publication_generation`
- `actual_submission_generation`
- `result_observation_generation`
- `settlement_generation`
- `control_epoch` / fencing epoch

Not every generation must correspond to a dedicated database table. The contract is semantic: every canonical artifact must expose which upstream generations it consumed.

Generation numbers are monotonic within their own identity scope. They do not imply chronological comparability across different axes.

### Rule

`generation_id` means **version of a fact family or derived artifact**, not “number of times a job happened to run.”

A retry that reproduces the same semantic state must not create a new semantic generation unless the fact family’s contract explicitly treats observations as distinct evidence.

---

## 2. Identity scope

Every generation must be scoped by the smallest stable domain needed to avoid false invalidation.

Examples:

- deadline: `(season, gameweek)`;
- fixture state: `(season, gameweek)` plus per-fixture child versions;
- player availability: `(season, target_gameweek, player_id)` with an aggregate GW generation derived from materially consumed rows;
- manager state: `(entry_id, season, target_gameweek, state_lane)` where state lane is one of `OPENING_LOCKED_BASELINE`, `CURRENT_PRIVATE_STATE`, `ENGINE_HYPOTHETICAL_STATE`, `ACTUAL_SUBMITTED_STATE`;
- projection: `(season, target_gameweek, model/config lineage)`;
- decision: `(entry_id, season, target_gameweek, decision policy lineage)`;
- settlement: `(season, gameweek)`.

The controller must never compare two generation numbers unless they share the same axis and identity scope.

---

## 3. Canonical generation vector

Every canonical projection/decision/publication should be auditable through a normalized vector equivalent to:

```json
{
  "season": "2026/27",
  "gameweek": 5,
  "deadline_generation": 3,
  "source_readiness_generation": 11,
  "fixture_generation": 7,
  "manager_state_generation": 4,
  "availability_generation": 19,
  "role_xmins_generation": 15,
  "projection_generation": 8,
  "decision_generation": 5,
  "control_epoch": 42,
  "lineage_hash": "..."
}
```

For a postdeadline artifact, add the relevant actual/result/settlement axes.

The vector is immutable once attached to a frozen artifact.

---

## 4. Derived-artifact dependency DAG

The future control plane should model dependencies as a DAG, not a procedural script.

### Predeadline

`official deadline evidence`
→ deadline generation

`fixtures + registration/transfers + availability/team news + role/xMins evidence + production statistical inputs`
→ source-readiness aggregate

`manager opening/private state`
→ manager-state generation

`source-ready generation + deadline generation + manager-state generation + model/config lineage`
→ projection generation

`projection generation + manager-state generation + deadline generation + decision policy lineage`
→ decision generation

`decision generation + independent verification/gate evidence + deadline generation`
→ publication generation

### Postdeadline

`locked submitted team`
→ actual-submission generation

`fixture/result observations`
→ result-observation generation

`official GW finality + complete canonical result observation`
→ settlement generation

`frozen forecast/decision lineage + actual-submission generation + settlement generation`
→ postmortem/evaluation generation

The controller may materialize this graph in tables later, but C0273 does not authorize schema work.

---

## 5. Invalidation taxonomy

Every upstream event must declare one of four effects.

### A. `NO_EFFECT`
Evidence changed but is not consumed by the target artifact.

Example: research-only shadow output changes while production lineage is frozen.

### B. `SOFT_STALE`
Artifact remains displayable but is no longer preferred for new decisions.

Example: noncritical supporting provider exceeds freshness budget while all P0 authorities remain valid.

Website must label degraded freshness; controller may schedule replacement.

### C. `HARD_INVALIDATE`
Artifact cannot remain canonical for new decision/publication state.

Examples:

- official deadline changes;
- current manager squad/bank/FT changes;
- materially changed availability/xMins used by the projection;
- fixture reschedule materially changes horizon;
- production configuration lineage changes.

### D. `SUPERSEDE_ONLY`
Prior artifact remains historically valid but a newer canonical artifact replaces it for current/public use.

Examples:

- newer rolling projection under same decision window;
- later publication generation;
- later official result settlement generation after correction.

No historical row is rewritten.

---

## 6. Materiality boundary

Not every new observation increments an aggregate generation or invalidates downstream work.

Each fact family must define a deterministic materiality function.

Examples:

### Availability / xMins
Material if at least one production-consumed player changes beyond configured thresholds in:

- eligibility/status;
- start probability;
- expected minutes;
- role category;
- suspension/injury confidence;
- predicted lineup evidence tier.

### Price
Material to decision state only when it changes feasibility, budget, selling value or optimizer candidate economics. It must not invalidate player forecast xPts merely because price changed.

### Ownership
Normally contextual/rank utility only. It invalidates only consumers that explicitly use ownership.

### Supporting odds
No direct production invalidation unless the consuming contract explicitly names that feed.

Materiality policy itself is versioned configuration and must be included in lineage.

---

## 7. Generation increment rules

A generation increments only when the semantic canonical state for that axis changes materially.

Required sequence:

`observe → normalize → validate → compare with current canonical semantic state → classify materiality → allocate next generation atomically → persist immutable evidence → notify dependants`.

A failed/partial observation cannot increment the canonical generation.

A worker retry cannot independently choose a generation number. Generation allocation belongs to the authoritative state transition transaction or equivalent serialized mechanism.

---

## 8. Stale-worker protection

Generation vectors complement, but do not replace, fencing tokens.

Every mutating worker must carry:

- stable `work_key`;
- target generation vector/hash;
- `control_epoch` / fencing token;
- immutable input lineage hash.

At canonical commit time the worker must prove:

1. lease/fencing epoch is current;
2. every hard-bound generation still equals the generation it consumed;
3. deadline commit guard still passes if deadline-sensitive;
4. no higher canonical generation already supersedes this work;
5. completion invariant is satisfied.

If any check fails, the result may be retained as diagnostic evidence but cannot become canonical.

This prevents a slow worker from overwriting a newer decision after its lease expires or upstream facts change.

---

## 9. In-flight invalidation behavior

When a hard upstream generation changes while downstream work is running:

1. mark affected work `STALE_IN_FLIGHT` logically;
2. do not require force-killing the process if that increases operational risk;
3. let it finish if safe;
4. reject canonical commit under generation mismatch;
5. schedule a replacement only after dedupe/reconcile rules prove one is needed.

This avoids cancellation races while still guaranteeing canonical freshness.

---

## 10. Exact invalidation matrix — P0 draft

| Changed axis/event | Projection | Decision | Publication | Actual submission | Settlement/postmortem |
|---|---|---|---|---|---|
| deadline generation | HARD if target timing/window affected | HARD | HARD | no rewrite; actual capture uses current official deadline authority | no rewrite |
| fixture generation | HARD if target fixture/horizon material | HARD via projection | HARD via decision | no | future-state/postmortem only if relevant |
| source-readiness generation | HARD only if changed required evidence affects consumed lineage; otherwise SOFT | inherit | inherit | no | no |
| availability generation | HARD if production-consumed material change | HARD via projection | HARD via decision | no | future-state evaluation may supersede |
| role/xMins generation | HARD if material production-consumed change | HARD via projection | HARD via decision | no | future-state evaluation only |
| manager-state generation | projection core usually NO_EFFECT except manager-specific affordability filters | HARD | HARD | independent actual lane | postmortem manager economics may depend |
| projection generation | n/a | HARD | HARD | no | frozen generation preserved |
| decision generation | no | n/a | HARD | no | frozen generation preserved |
| new publication generation | no | no | SUPERSEDE_ONLY | no | no |
| actual submission generation | no retroactive projection/decision | no | public live layer may update | n/a | HARD for manager-specific evaluation |
| result observation generation | no historical rewrite | no | live result surface updates | no | provisional evaluation refresh |
| settlement generation | no historical rewrite | no | historical result label supersedes | no | HARD/SUPERSEDE evaluation generation |
| control epoch | no semantic model change | no semantic change | stale writers blocked | stale writers blocked | stale writers blocked |

Important: `source_readiness_generation` is an aggregate health/evidence version, not a blanket invalidator. It must carry changed fact-family references so downstream consumers can test whether the changed evidence intersects their declared lineage.

---

## 11. Source-readiness generation must be decomposable

A single aggregate `source_readiness_generation` is useful for auditing and UI, but dangerous if used as a simple equality gate.

Example:

- Understat refresh changes team history;
- injury evidence is unchanged;
- manager state is unchanged;
- current projection consumes a frozen team-history snapshot.

Blindly treating any readiness-generation change as `HARD_INVALIDATE` would cause excessive reruns.

Therefore the source-readiness artifact must expose a component manifest, conceptually:

```json
{
  "generation": 11,
  "components": {
    "official_fpl": "hash-a",
    "availability": "hash-b",
    "team_news": "hash-c",
    "roles": "hash-d",
    "team_stats": "hash-e"
  },
  "changed_components": ["team_stats"],
  "critical_blockers": []
}
```

Consumers bind to the component hashes they actually use.

---

## 12. Overlapping Gameweek rule

Each Gameweek has its own lifecycle aggregate.

The system must support:

- GW N in `SETTLEMENT_WAIT`;
- GW N+1 already in rolling planning;
- GW N+2 fixture/horizon evidence already refreshing.

Cross-GW dependencies must be explicit.

Examples:

- a newly realized player role in GW N may create a new role/xMins generation for GW N+1;
- provisional GW N points must not be treated as settled calibration evidence if the consuming model contract requires settlement;
- a corrected GW N settlement may supersede postmortem/calibration outputs without invalidating already-frozen historical GW N+1 recommendations unless those recommendations explicitly consumed provisional GW N data in their frozen lineage.

There must be no global `current_gameweek_status` that blocks unrelated work across all GWs.

---

## 13. Calibration chronology rule

Autonomy increases look-ahead risk if postmatch evidence leaks into a forecast rerun.

Any training/calibration/model-refresh artifact must bind to an `as_known_at` boundary and settlement policy.

For a frozen GW N+1 predeadline forecast:

- inputs may include only evidence known before its own freeze/decision timestamp;
- later GW N corrections may alter future model generations, but never rewrite the frozen GW N+1 forecast;
- historical replay must reconstruct the generation vector that was actually available then.

---

## 14. Public publication supersession contract

The website must distinguish:

- `CURRENT_CANONICAL` — newest valid publication for current generation vector;
- `STALE_LAST_VALID` — older publication retained because replacement is blocked/degraded;
- `SUPERSEDED` — historically valid but no longer current;
- `REVOKED_INVALID` — artifact found invalid due to integrity error; preserved for audit but must not be presented as valid historical recommendation without warning.

A newer generation does not delete older publications.

If no current canonical publication exists after invalidation, the public surface must fail closed to `STALE_LAST_VALID` or `NO_TRUSTWORTHY_CURRENT_DECISION` according to policy. It must never silently relabel an old recommendation as current.

---

## 15. Senior external-analyst red-team of this model

### Finding 1 — generation explosion risk

Too many independent counters can become operationally unreadable.

**Improvement:** generation axes are semantic contracts, but public/operator tooling should render a compact lineage fingerprint plus only the generations that differ from the previous canonical artifact.

### Finding 2 — aggregate source readiness can over-invalidate

A single changed aggregate generation would cause rerun storms.

**Improvement:** keep aggregate generation for audit/UI, but downstream validity is determined by component lineage intersection.

### Finding 3 — materiality functions can hide model changes

If thresholds are mutable but excluded from lineage, identical evidence can produce different invalidation decisions.

**Improvement:** version materiality policy/config and include it in generation-transition evidence.

### Finding 4 — cyclic dependencies are possible

Example: optimizer/decision output influencing a source candidate set which then changes projection coverage.

**Improvement:** the production dependency graph must be statically validated as acyclic for canonical decision lineage. Research feedback loops stay outside the same canonical cycle and only enter through explicit promoted configuration versions.

### Finding 5 — correction storms after settlement

Official corrections could repeatedly supersede settlement/evaluation outputs.

**Improvement:** every corrected settlement creates a new immutable generation, but expensive downstream calibration may use a bounded debounce/stability window if the model policy permits. Public result correction should remain prompt; training recomputation can be deferred safely.

### Finding 6 — manager-state visibility remains the hardest autonomous boundary

Perfect generation logic cannot compensate for an unobservable private transfer.

**Improvement:** manager-state readiness remains a distinct hard authority. When current private state is unobservable, the system may publish a recommendation against the last verified/opening baseline only if explicitly labeled and policy-approved; it cannot claim account-state certainty.

### Finding 7 — epoch and semantic generation must not be conflated

A controller restart/failover may increment a fencing epoch without changing football evidence.

**Improvement:** `control_epoch` is operational safety metadata, never a semantic model/decision generation.

### Finding 8 — publication invalidation can create dangerous empty states near deadline

A late injury update could invalidate the current recommendation while the replacement pipeline cannot complete before deadline.

**Improvement:** define a deadline-aware fallback ladder in a later C0273 batch: replace if safely recomputable; otherwise retain last-valid recommendation explicitly labeled with the new blocker and prohibit automated account execution. The controller must never fabricate freshness.

---

## 16. Acceptance tests for the future digital twin

The read-only digital twin must prove at minimum:

1. irrelevant source observation does not invalidate projection;
2. material injury change invalidates only affected downstream lineage;
3. deadline change invalidates all deadline-bound in-flight work;
4. stale worker completion cannot commit after a generation change;
5. controller failover increments fencing epoch without spuriously changing semantic generations;
6. manager-state change reruns decision without unnecessarily rerunning model forecast core when forecast is manager-agnostic;
7. settlement correction supersedes evaluation but does not rewrite frozen forecasts;
8. GW N settlement wait does not block GW N+1 planning;
9. duplicate identical observations do not create semantic generation churn;
10. materiality-policy version change is itself lineage-visible;
11. source-readiness aggregate changes in an unused component do not create a rerun storm;
12. publication falls to explicit stale/degraded state when current canonical work is invalidated and cannot be replaced.

---

## 17. Updated P0 open questions

Still unresolved before implementation approval:

1. exact official FPL Gameweek settlement authority field/transition;
2. manager press-conference/late team-news automated source strategy;
3. whether independent predicted-XI evidence is mandatory vs confidence-enhancing;
4. complete cup/Europe congestion authority;
5. current-private-manager-state visibility strategy;
6. numeric materiality thresholds and who owns/version-controls them;
7. exact canonical generation persistence design and atomic allocation mechanism;
8. exact component-level source-readiness manifest schema;
9. deadline-aware fallback ladder when replacement cannot finish before deadline;
10. safe concurrency/rate budgets;
11. deployment-freeze duration/emergency procedure;
12. SEV0/SEV1 alert channel;
13. replay/digital-twin data retention needed to reconstruct past generation vectors exactly.

---

## 18. Recommendation after this batch

**DO NOT IMPLEMENT YET.**

The generation/dependency architecture is now coherent enough to become the backbone of the controller design, but the remaining source-authority and manager-state visibility gaps still prevent a safe claim of full autonomy.

Next planning batch should define **canonical publication/status supersession and the deadline-aware fallback ladder**, because that is where generation invalidation becomes visible to users and where a late predeadline update can otherwise turn a technically correct fail-closed controller into a poor product experience.

---

## Explicit non-changes

No schema, migration, cron, Edge Function, source adapter, controller, model, optimizer, decision gate, publication runtime, website runtime, shadow status, historical forecast or FPL account state was changed.

All production implementation remains explicitly approval-gated.
