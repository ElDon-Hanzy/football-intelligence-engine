# C0273 — Checkpoint 08: Canonical Publication Supersession & Deadline-Aware Fallback

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Define how an autonomous FIE website should decide which recommendation is currently trustworthy when publications are append-only, upstream facts can invalidate a previously published decision, and a replacement may not be safely recomputable before the official FPL deadline.

This checkpoint is deliberately limited to publication/current-state semantics, supersession, invalidation, deadline fallback, and public display safety. It does **not** authorize schema changes, function changes, cron changes, website changes, deployment, model changes, shadow promotion/kill, or FPL-account execution.

---

## 1. Live architecture re-verification

Read-only production inspection on 2026-09-14 proves the following current behavior.

### 1.1 Publication evidence is already append-only

`public.fpl_live_plan_publications` has:

- immutable publication rows;
- a unique `input_signature` index;
- a `(gameweek, captured_at desc, id desc)` latest-row index;
- a trigger blocking `UPDATE` and `DELETE`;
- C0237 publication functions using `INSERT ... ON CONFLICT(input_signature) DO NOTHING`.

This is a strong historical-evidence property and should be preserved.

### 1.2 C0237 is lineage-aware but has no explicit canonical/supersession relation

The inspected C0237 chain writes new rows for new evaluated states and preserves prior rows. Current columns include publication stage/status, execution authorization, prediction/manager/optimizer/gate lineage, freshness, blockers, layer lineage, signature and source.

However, the publication table currently has no explicit semantic fields equivalent to:

- `publication_generation`;
- `supersedes_publication_id`;
- `invalidated_at` / `invalidation_reason`;
- `canonical_from` / `canonical_until`;
- canonical-pointer generation;
- dependency-generation vector/fingerprint;
- fencing epoch at canonical commit.

These are planning requirements only; this checkpoint does not authorize adding them.

### 1.3 Current public selection is insertion-order based

`public.current_fpl_live_plan_v01` currently selects:

`DISTINCT ON (gameweek) ... ORDER BY gameweek, captured_at DESC, id DESC`.

Therefore the current canonical/public row is effectively **the latest inserted publication row for the Gameweek**, not the latest row proven valid against the current generation/dependency state.

This is the principal P0 publication-control gap found in this batch.

### 1.4 The risk is architectural, not merely theoretical

Current GW4 evidence contains many immutable publications from different C0237 versions/statuses, including contested pre-final rows, user-strategic-override-era rows, later fail-closed rows, and post-deadline closure rows. Multiple layers can share the same `captured_at` and differ by `id`.

The current view intentionally resolves this by newest `(captured_at,id)`. That worked as an operational convention, but it is not sufficient for autonomous supersession because insertion order does not prove that a candidate:

- consumed the current hard-bound generations;
- survived a subsequent hard invalidation;
- committed under the current fencing epoch;
- still refers to the current official deadline generation;
- is appropriate to expose as actionable rather than audit-only.

### 1.5 Current positive property to preserve

C0237 already distinguishes recommendation/publication from execution authorization. Post-deadline closure is append-only and is explicitly not retroactive execution authorization. C0273 must preserve this separation.

---

## 2. Core design rule: publication evidence != canonical authority

A publication row is immutable evidence that a plan was published/evaluated under a particular lineage at a particular time.

It is **not automatically canonical merely because it is the newest row**.

Future conceptual model:

`immutable publication artifact` + `current dependency validity` + `canonical selection decision` = `current public authority`

The canonical selector must therefore operate over semantic validity, not insertion chronology alone.

No historical publication is rewritten when canonical authority changes.

---

## 3. Separate four concepts that are currently easy to conflate

The future controller/product contract must distinguish:

1. **Artifact existence** — a publication row was durably created.
2. **Artifact historical validity** — it correctly represented the evidence available at its own publication time.
3. **Current canonical validity** — its hard-bound dependencies still match current authoritative generations.
4. **Execution authority** — a separate authorization contract currently rooted in C0234/C0237 gates and, for any future account execution, additional private-state/deadline checks.

A publication may be historically valid but no longer current.

A current publication may be displayable but not executable.

A former execution-authorized publication must never remain executable after a hard invalidation merely because its immutable row still says `execution_authorized=true`.

Future execution must re-resolve current authority rather than trust a historical boolean in isolation.

---

## 4. Canonical publication identity contract

Every future canonical publication candidate should conceptually bind to:

- `season`;
- `gameweek`;
- `publication_generation`;
- `decision_generation`;
- current `deadline_generation`;
- hard-bound source/component generations or component hashes;
- manager-state generation/lane when personalized;
- projection generation;
- decision/gate lineage;
- model/config/materiality-policy lineage;
- immutable content/output hash;
- canonicalization attempt identity;
- controller `control_epoch` / fencing token;
- monotonic canonical state/version used for compare-and-swap;
- official `deadline_at` evidence identity;
- `as_known_at` / commit timestamp.

`publication_generation` is semantic evidence versioning. `control_epoch` is operational fencing. They must remain distinct.

---

## 5. Immutable supersession chain

The future logical relationship should be equivalent to:

- publication A remains immutable;
- publication B may declare that it supersedes A for current public authority;
- the canonical selector atomically moves authority from A to B only after B passes all commit guards;
- A remains queryable as historical evidence;
- B may itself later be superseded or invalidated.

Conceptual fields/relations, not authorized schema:

- `supersedes_publication_id`;
- `supersession_reason`;
- `superseded_at`;
- `canonicalization_version`;
- `dependency_fingerprint`;
- `canonical_state`.

A supersession chain must never be inferred solely from monotonically increasing publication IDs.

---

## 6. Proposed logical publication states

These are semantic states for planning; exact enum/table design remains future implementation work.

### `CURRENT_VERIFIED`
Newest canonical publication whose hard-bound dependency vector matches current authoritative state and whose deadline/commit guards passed.

### `SOFT_STALE_CURRENT`
Previously verified publication whose non-hard freshness evidence degraded. It may remain visible with an explicit freshness warning if policy permits. Actionability/execution is evaluated separately.

### `HARD_INVALIDATED`
A hard dependency changed. The publication immediately loses current actionable authority. It remains in immutable history.

### `SUPERSEDED`
Historically valid publication replaced by a newer canonical publication. No implication that the older publication was wrong when issued.

### `REVOKED_INTEGRITY`
Artifact later proven structurally/integrity-invalid. Preserved for audit, never presented as a valid historical recommendation without a warning.

### `DEADLINE_CLOSED_AUDIT`
Post-deadline frozen decision-era evidence. Display/history only; no retroactive execution authority.

### Aggregate state: `NO_TRUSTWORTHY_CURRENT_DECISION`
This is preferably a current-state/controller condition, not a mutation of old publication rows. It applies when no publication satisfies the current canonical contract.

---

## 7. Invalidation-to-publication policy

C0273 Checkpoint 07 defined `NO_EFFECT`, `SOFT_STALE`, `HARD_INVALIDATE`, and `SUPERSEDE_ONLY`. Publication behavior is now refined as follows.

### `NO_EFFECT`

- retain canonical publication;
- no visible warning required;
- no rerun solely for the irrelevant change;
- record causal evidence if useful for audit.

### `SOFT_STALE`

- retain the last verified publication only if its hard dependencies remain valid;
- expose explicit stale/degraded freshness state;
- optionally enqueue bounded replacement work;
- do not fabricate a fresh timestamp merely because the page/API was refreshed;
- execution/actionability policy remains independently gated.

### `HARD_INVALIDATE`

Immediate semantic effect:

- strip current actionable/canonical authority from the affected publication;
- preserve it in history;
- attempt replacement only if all required source/readiness and deadline-budget rules pass;
- stale in-flight workers cannot restore authority unless their dependency vector is current at commit;
- if no replacement safely completes, public state becomes `NO_TRUSTWORTHY_CURRENT_DECISION` rather than silently retaining the old recommendation as current.

### `SUPERSEDE_ONLY`

- previous artifact stays historically valid;
- newer artifact may become canonical after normal commit guards;
- no “invalid” label on prior artifact unless a distinct invalidation exists.

---

## 8. Deadline-aware fallback ladder

The exact time budgets are intentionally **not invented** in C0273. They must be measured and approved later.

Future policy parameters should include at minimum:

- `minimum_recompute_budget`;
- `minimum_verification_budget`;
- `minimum_publication_commit_budget`;
- `cache_propagation_budget`;
- `execution_safety_margin` if account execution is ever separately authorized.

All are versioned policy/config lineage.

### Level 0 — current verified

Conditions:

- canonical publication valid against current hard dependencies;
- official deadline authority healthy;
- no hard invalidator pending.

Public behavior: render current recommendation normally with provenance/freshness metadata.

### Level 1 — soft stale, hard-valid

Conditions:

- only soft/noncritical freshness degradation;
- hard-bound generations unchanged.

Public behavior:

- keep recommendation visible;
- mark degraded freshness prominently enough that it cannot be mistaken for freshly revalidated advice;
- replacement/revalidation may run if budget allows;
- automated execution, if ever authorized in a later program, must have its own stricter policy and cannot inherit website display permission automatically.

### Level 2 — hard invalidation, replacement safely possible

Conditions:

- a hard-bound generation changed;
- enough measured deadline budget remains for source reconciliation + affected recomputation + full verification + publication commit + required propagation/safety margin.

Public behavior:

- old recommendation immediately loses actionable-current status;
- show “revalidating / current recommendation temporarily unavailable” rather than leave stale advice looking current;
- run the minimal dependency-intersection recomputation, not a blind full-engine rerun;
- publish replacement only after current-generation commit guards pass.

### Level 3 — hard invalidation, insufficient safe recompute budget

Conditions:

- hard invalidator exists;
- safe end-to-end replacement cannot be proven before official deadline.

Public behavior:

- fail closed to `NO_TRUSTWORTHY_CURRENT_DECISION` / explicit blocked state;
- optionally show prior recommendation in a visually separated **audit / previous recommendation** section;
- explicitly state why it lost authority and when;
- do not label it current;
- prohibit autonomous account execution.

The system must prefer a truthful blocked state over a stale recommendation falsely presented as fresh.

### Level 4 — official deadline closed

Public behavior:

- freeze the last predeadline decision-era publication as historical evidence;
- expose actual submitted state independently when verified;
- post-deadline correction/result settlement must never trigger a new predeadline decision publication;
- C0237-style post-deadline closure remains audit-only and must not create retroactive authorization.

---

## 9. Commit-time canonicalization guard

A publication candidate may be created as immutable evidence, but it becomes canonical only if a commit-time guard proves all of the following atomically/equivalently:

1. candidate belongs to the intended season/GW/horizon/manager lane;
2. controller fencing epoch is current;
3. canonical state/version has not advanced unexpectedly;
4. official deadline evidence/generation still matches the candidate;
5. commit occurs before deadline when predeadline authority is required;
6. every hard-bound semantic generation/component hash still matches;
7. manager-state lane/freshness is sufficient for the claimed personalization level;
8. upstream decision/gate artifact is complete and canonical;
9. no higher/current canonical publication already dominates this candidate;
10. publication completion invariant is satisfied;
11. execution authorization, if claimed, passes a **separate current** authorization check.

If any check fails, candidate may remain immutable diagnostic/history evidence but cannot become current.

---

## 10. Identical content under newer evidence

A subtle case: the recommendation payload may be byte-for-byte identical after an upstream evidence refresh/revalidation.

C0273 should **not** assume content identity means authority identity.

Provisional planning rule:

- preserve one content hash for deduplication/UX;
- create or record a new **validation/canonicalization evidence generation** when hard-bound evidence changed and the plan was actually revalidated;
- public UI may render identical recommendation text without visually pretending nothing changed;
- audit lineage must show that it was revalidated against newer evidence.

Open question: whether this requires a new publication artifact or a separate immutable validation-envelope artifact. Do not settle this via ad-hoc schema during implementation.

---

## 11. Public API / website safety contract

The V3 website should never derive “current” merely from latest timestamp/ID.

Conceptually, the current endpoint should expose:

- canonical publication ID;
- semantic publication/validation generation;
- status (`CURRENT_VERIFIED`, `SOFT_STALE_CURRENT`, blocked, etc.);
- `verified_at`;
- official `deadline_at` and deadline-evidence version;
- dependency fingerprint / compact lineage summary;
- freshness/degradation state;
- hard invalidation reason/time when applicable;
- superseded-by reference when historical;
- execution-authority state separately;
- personalization/manager-state confidence lane;
- response/version fingerprint suitable for cache validation.

The page must visually separate:

- **Current verified recommendation**;
- **Temporarily unavailable / revalidating**;
- **Previous recommendation — audit only**;
- **Post-deadline historical decision**;
- **Actual submitted team**, when independently verified.

These must not collapse into a single generic “latest plan” card.

---

## 12. Cache/CDN/browser safety

Current live caching behavior was not proven in this bounded batch; therefore no implementation-specific cache mechanism is assumed.

Future contract requirements regardless of hosting stack:

- canonical response carries a monotonically changing canonical/version fingerprint;
- cache keys/revalidation semantics cannot let a superseded publication masquerade as current;
- a hard invalidation must be representable independently of waiting for a new recommendation payload;
- website rendering must treat authority/status as live control metadata, not something baked irreversibly into an old static artifact;
- a decision payload cache and authority/status cache may require different TTL/refresh semantics;
- stale-while-revalidate must never mean stale-while-actionable after `HARD_INVALIDATE`.

Exact CDN/browser strategy remains an implementation-phase proof item.

---

## 13. Red-team scenarios / digital-twin acceptance cases

The future read-only digital twin must reproduce and pass at least these scenarios.

### Case A — injury update two minutes before deadline

A production-consumed player receives a hard availability/xMins invalidation. Safe full replacement cannot finish within measured budget.

Expected: old publication instantly loses actionable-current authority; public status becomes blocked/audit-only; no execution; no fabricated freshness.

### Case B — stale worker finishes after replacement

Worker A starts under generation N. Generation N+1 invalidates it; Worker B publishes the valid replacement. Worker A finishes later.

Expected: A may retain diagnostic output but canonical commit is rejected by generation/fencing/version guards.

### Case C — official deadline moves earlier during computation

Expected: deadline generation increments; affected candidate cannot commit under old deadline evidence; public state blocks or recomputes only under the new safe budget.

### Case D — official deadline moves later

Expected: prior invalidation/deadline evidence is preserved; scheduler may regain recompute budget under the new generation, but no old candidate is silently resurrected without revalidation.

### Case E — canonical authority changes while client/CDN holds old payload

Expected: old payload cannot be represented as current once authority status is refreshed; version/fingerprint mismatch forces safe revalidation/rendering.

### Case F — publication completes then hard source invalidates before page refresh

Expected: execution authority fails independently; website status can invalidate current authority even before a replacement payload exists.

### Case G — two concurrent valid replacement candidates

Expected: deterministic single canonical winner under monotonic version/fencing semantics; loser remains immutable noncanonical evidence.

### Case H — content-identical recomputation

Expected: content may dedupe, but new evidence/revalidation lineage is visible and authority binds to the newer validation generation.

### Case I — irrelevant research/shadow source changes

Expected: `NO_EFFECT`; no publication invalidation or rerun storm.

### Case J — manager private state unobservable

Expected: product may show a recommendation against an explicitly named verified/opening baseline if policy later approves it, but it must not claim current private-account certainty and cannot authorize autonomous account execution.

### Case K — postdeadline result correction

Expected: result/settlement/evaluation generations may supersede, but no new decision/publication authority for the closed GW is created.

### Case L — controller PAUSE / DRAIN / EMERGENCY_BLOCKED

Expected: public state truthfully reflects service/control status; historical plan remains accessible but not falsely promoted to current actionable authority.

---

## 14. Contradictions and unresolved questions preserved for user review

These are intentionally **not resolved by assumption**.

1. **Soft-stale actionability:** should `SOFT_STALE_CURRENT` ever remain actionable, or only displayable? Likely policy should vary by changed fact family; user approval required.
2. **Fallback wording/product UX:** exact wording and prominence for blocked/revalidating/previous recommendation need V3 product design review.
3. **Deadline timing budgets:** no safe minute thresholds are yet measured. Do not invent “T-2”, “five minutes”, etc. as controller safety margins without runtime evidence.
4. **Canonical storage design:** explicit canonical pointer table vs append-only canonicalization ledger vs validity-aware view is not yet chosen.
5. **Content-identical revalidation:** new publication row vs separate immutable validation envelope remains open.
6. **Copy/presentation-only revisions:** whether presentation revisions should increment publication generation or use a separate presentation revision axis remains open.
7. **Cache architecture:** exact CDN/static/API/browser behavior for V3 has not been proven in this batch.
8. **Private manager state:** fully personalized autonomous execution remains blocked by the CURRENT_PRIVATE_STATE observability problem documented in Checkpoint 05.
9. **Current deadline divergence:** production paths that still derive kickoff-minus-90 remain untouched; this batch does not authorize fixing them.
10. **Official settlement authority:** exact FPL scoring-finality criterion remains open from Checkpoint 06.
11. **Emergency UI policy:** whether PAUSE/DRAIN shows last verified recommendation with a service warning or hides actionable content entirely remains to be approved.
12. **Historical “user strategic override” rows:** their presence proves publication history can contain policy eras/overrides; C0273 must define how historical policy lineage is displayed without treating it as current engine authority.

---

## 15. Planning conclusions

### P0 conclusion 1

The current append-only publication store is a good foundation and should not be replaced with mutable recommendation rows.

### P0 conclusion 2

The current `current_fpl_live_plan_v01` latest-row rule is **not sufficient for autonomous current authority**. Currentness must be generation/validity/fencing-aware.

### P0 conclusion 3

Hard invalidation needs an immediate authority/status transition independent of replacement publication creation. Otherwise the system cannot safely represent the interval between “old advice became invalid” and “new advice is ready.”

### P0 conclusion 4

Near deadline, fail-closed blocked state is preferable to silently retaining invalid advice. The previous recommendation may remain available as clearly separated audit evidence.

### P0 conclusion 5

Website displayability and FPL-account executability must remain separate policies. C0273 does not authorize account execution.

### P0 conclusion 6

No implementation should begin until the canonical current-state representation and measured deadline budgets are approved and proven in the digital twin.

---

## 16. Recommended next bounded C0273 batch

**Controller/Gameweek lifecycle aggregate + state-transition contract.**

Connect the now-defined:

- deadline generation;
- source-readiness components;
- manager-state lanes;
- projection/decision/publication generations;
- canonical publication authority;
- actual-submission generation;
- result observation/settlement generation;
- PAUSE/DRAIN/EMERGENCY control modes;

into one explicit per-Gameweek state-transition table with legal transitions, guards, ownership, reconciliation behavior and cross-GW dependencies.

This should remain planning/digital-twin design only. No schema/controller implementation until separate user approval.

---

## Explicit non-changes in this batch

This checkpoint did **not**:

- alter `public.current_fpl_live_plan_v01`;
- alter `public.fpl_live_plan_publications`;
- alter C0237/C0234/C0248;
- add canonical-pointer schema;
- change official-deadline behavior;
- change manager-state ingestion;
- change any cron/scheduler;
- change any Edge Function;
- change V2/V3 code;
- deploy anything;
- modify projection/model numerics;
- promote/kill a model or shadow experiment;
- rewrite historical forecasts/publications;
- execute an FPL-account action.

All production changes remain explicitly approval-gated.