# C0273 — Checkpoint 17: Public API Freshness, Cache Coherency & Authority-Revision Contract

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Define the public-read/cache contract for the dedicated Hostinger VPS + Supabase + GitHub target architecture so that the FIE website cannot continue presenting a superseded, hard-invalidated, blocked, or deadline-closed recommendation as a trustworthy current decision because of API, reverse-proxy, CDN, service-worker, browser, or application-memory cache lag.

This checkpoint changes no runtime, schema, frontend, CDN, cache header, cron, model, worker, publication function, control plane, or deployment behavior.

---

## 1. Live architecture re-verification

Read-only production inspection confirms that the current view `public.current_fpl_live_plan_v01` is still defined as:

```sql
SELECT DISTINCT ON (gameweek) ...
FROM fpl_live_plan_publications
ORDER BY gameweek, captured_at DESC, id DESC;
```

Therefore current production semantics are:

> latest inserted publication row per Gameweek

and not:

> latest generation-valid canonical publication authority.

GW4 also contains multiple distinct publication artifacts with identical `captured_at` timestamps and differing IDs/sources/statuses. The latest GW4 row is a post-deadline closure with `execution_authorized=false`, while immediately preceding rows at the same timestamp represent other publication layers.

This reinforces Checkpoint 08:

`latest row != canonical current authority`.

It also creates a direct cache-safety implication:

> a cache cannot repair an ambiguous origin contract. Canonical semantic authority must be resolved before caching policy is applied.

---

## 2. Core public-read invariant

For any authority-sensitive FPL surface:

> The browser may present a recommendation as `CURRENT` only when the loaded decision payload and the latest independently observed authority revision refer to the same still-valid semantic authority.

If the browser cannot prove that equality, the UI must degrade to a non-actionable state such as:

- `REFRESHING_AUTHORITY`;
- `STALE_CHECK_REQUIRED`;
- `NO_TRUSTWORTHY_CURRENT_DECISION`;
- `DEADLINE_CLOSED_AUDIT`;
- explicit degraded/read-only historical state.

It must not silently continue showing the prior decision as fresh.

---

## 3. Separate five freshness dimensions

Do not use one generic `fresh=true` flag.

### A. Origin freshness

Whether the VPS/API has observed the current durable Supabase authority state.

### B. Semantic validity

Whether the publication/decision remains valid against its bound deadline, source, manager-state, projection and decision generations.

### C. Transport freshness

Whether a response was served from origin, reverse proxy, CDN, service worker, browser memory/disk or application state, and whether revalidation occurred.

### D. Representation freshness

Whether the rendered payload is the latest representation of the same semantic authority.

### E. Data-family freshness

Whether subordinate facts such as prices, injuries, fixture data or result observations meet their own lifecycle freshness budget.

A transport-fresh response can still contain semantically invalid authority. A semantically valid decision may also have an older but representation-equivalent payload. These states must remain distinct.

---

## 4. Authority revision: the cache-coherency anchor

C0273 should introduce a conceptual monotonically changing **authority revision** for each Gameweek/public authority surface.

The revision is not merely `publication_id`.

It must change whenever the public meaning of current authority changes, including at minimum:

- new canonical publication;
- hard invalidation of the current publication;
- explicit supersession;
- integrity revocation;
- deadline closure affecting actionability;
- generation change that invalidates current authority even before a replacement exists;
- canonical pointer change;
- transition to `NO_TRUSTWORTHY_CURRENT_DECISION`;
- restoration/revalidation after a prior block;
- settlement/correction authority changes on result surfaces where applicable.

Conceptually:

```text
authority_revision = monotonic revision scoped to (surface, gameweek)
```

The exact physical representation is not authorized yet. Candidate implementations include an integer CAS revision, immutable authority event ID plus materialized revision number, or another monotonic database-native token.

Important:

> content-identical decisions may still require a new authority revision when lineage, deadline generation, validity or authorization semantics change.

Therefore a hash of rendered JSON alone is insufficient.

---

## 5. Public API envelope contract

Every authority-sensitive response should eventually carry enough metadata for independent coherency checks.

Conceptual fields:

```text
contract_version
gameweek
server_observed_at
authority_revision
canonical_authority_id
publication_id
publication_semantic_identity
validity_state
execution_authorized
deadline_at
deadline_generation
finalization_generation
manager_state_generation
projection_generation
decision_generation
source_readiness_revision
lineage_hash
payload_representation_version
etag
cache_policy_class
last_valid_at
blockers
advisories
```

Not every field must be public-facing text, but the contract must preserve the distinction.

The exact generation vector exposed to public clients may be compacted into a stable hash plus selected human-readable fields.

---

## 6. Proposed cache-policy classes

Do not apply one cache policy to all FIE endpoints.

### Class A — authority-critical current decision

Examples:

- current FPL recommendation;
- captain/vice;
- transfer/chip plan;
- execution-authorized state;
- current blocker/finalization state.

Planning default:

- bypass shared CDN caching initially;
- no stale-while-revalidate for actionable authority;
- browser must not reuse an unvalidated actionable payload;
- conditional revalidation may be allowed if it proves the current authority revision;
- a hard-invalidated origin state must become non-actionable at the next authority check, not after an arbitrary long TTL.

Initial safest implementation candidate is `no-store` or equivalently strict revalidation semantics for these endpoints until measured traffic justifies a more complex coherent cache.

No final HTTP header values are approved by this checkpoint.

### Class B — control/status head

Examples:

- current authority revision;
- lifecycle state;
- health dimensions;
- incident/blocker status;
- release identity.

Requirements:

- tiny/fast payload;
- strong revalidation;
- suitable for frequent polling or future push invalidation;
- must never depend on heavy computation;
- should be independently fetchable from the full decision payload.

This endpoint becomes the browser's coherency reference.

### Class C — bounded-freshness football facts

Examples:

- player/team stats;
- fixtures outside deadline authority;
- ownership summaries;
- non-actionable model diagnostics.

May use explicit bounded TTL/revalidation according to source contract. Staleness must be visible where material.

### Class D — immutable historical evidence

Examples:

- frozen historical forecasts;
- immutable publication evidence by ID;
- settled/revision-addressed historical artifacts.

Can be aggressively cached when addressed by immutable identity. A correction creates a new immutable revision, not an in-place mutation of historical evidence.

### Class E — static versioned assets

Hashed JS/CSS/images may use long-lived immutable caching. HTML shell must not trap clients on an obsolete application contract indefinitely.

---

## 7. Browser coherency protocol

The browser must not trust only the decision payload it loaded earlier.

Conceptual protocol:

1. fetch/observe current `authority_revision` for the Gameweek;
2. load the corresponding current-decision payload;
3. verify payload authority revision equals the observed revision;
4. render actionable/current state only after equality;
5. periodically or event-driven re-check the head revision while the page remains open;
6. if revision changes, immediately mark the old actionable display non-current while fetching the replacement;
7. if replacement fetch fails, show degraded/no-current semantics rather than restoring actionability to the superseded payload.

Race handling:

- head R1 -> payload R2 is safe if the client rechecks and converges to R2;
- payload R1 -> head R2 means R1 must not be presented as current;
- origin temporarily unavailable after head changes means fail closed for actionable state.

The browser should never infer current authority from wall-clock age alone.

---

## 8. Hard invalidation path

A hard invalidation is the highest-risk cache event.

Required semantic sequence:

```text
material P0 change
  -> durable generation/invalidation commit
  -> current authority loses validity
  -> authority_revision advances
  -> public head exposes new revision/state
  -> old decision becomes non-actionable
  -> recompute/replacement may proceed separately
```

Critical rule:

> replacement availability is not required before invalidating prior actionability.

If a replacement cannot yet be produced, the canonical public state is the explicit blocker/no-current state defined in Checkpoint 08.

This prevents the dangerous anti-pattern:

`keep serving old recommendation as current until replacement exists`.

A last-valid decision may remain available as labelled audit/context, but not as current actionable authority after hard invalidation.

---

## 9. Soft-stale path remains unresolved by policy

Checkpoint 08 intentionally left soft-stale actionability unresolved.

Cache policy cannot decide that business rule.

If a future approved policy permits `SOFT_STALE_CURRENT`, the API must still expose:

- stale reason;
- stale-since timestamp;
- affected source/generation;
- whether execution remains authorized;
- authority revision;
- expiry/escalation rule.

The browser must not convert a soft-stale state into generic green/current presentation.

---

## 10. Reverse proxy / CDN contract

A reverse proxy or CDN is an optimization layer, never an authority layer.

Future configuration must guarantee:

- Class A authority endpoints cannot remain stale through an invalidation window;
- cache keys include every representation dimension that can change semantics, or such responses bypass shared cache;
- authentication/private operator responses are never cached publicly;
- `Vary` semantics are explicit where relevant;
- cache purge is not the sole correctness mechanism;
- stale-on-origin-error is prohibited for current actionable authority unless the semantic policy explicitly permits that exact stale state;
- proxy health and cache age are observable.

Do not make correctness depend solely on best-effort CDN purge propagation.

---

## 11. Service worker / PWA red-team

A future PWA/service worker can silently reintroduce stale authority even if server/CDN behavior is correct.

Rules:

- never cache Class A authority responses using cache-first behavior;
- version service-worker code/contracts;
- static shell offline support must clearly distinguish `OFFLINE` from `CURRENT`;
- an offline client cannot claim current FPL decision authority;
- old service workers must not trap users on an obsolete API contract;
- service-worker update/activation strategy must be part of production QA.

Offline history is acceptable. Offline current authority is not.

---

## 12. ETag / conditional request semantics

ETag can reduce bandwidth but cannot be defined only as a hash of visible decision content.

For authority-sensitive resources, validator identity must include or bind to:

- authority revision;
- semantic identity/current validity;
- representation version.

If the same XI/transfer text is revalidated under a new official deadline generation or manager-state lineage, the validator should change even if visible football content is identical.

This ensures `304 Not Modified` cannot accidentally assert semantic equivalence where only representation content is equal.

---

## 13. API failure semantics

Avoid turning infrastructure errors into stale semantic claims.

Conceptual responses/states:

- canonical authority exists and current -> return current payload;
- hard-invalidated, replacement pending -> explicit no-current/blocker payload;
- authority cannot be determined safely -> explicit authority-unavailable/fail-closed payload;
- Supabase/VPS outage with only cached prior Class A payload -> UI may show historical/last-known context but not `CURRENT`;
- after deadline -> audit/frozen semantics, not executable/current-predeadline authority;
- contract version mismatch -> client must not guess field meaning.

HTTP status mapping remains an implementation decision; semantic state must be explicit regardless of status code.

---

## 14. Separation of publication evidence and canonical-public authority

The future public architecture should expose distinct retrieval modes:

### Immutable evidence

`publication by immutable ID`

Purpose: audit/history/debugging. Cacheable by immutable identity.

### Current canonical authority

`current authority for gameweek`

Purpose: live product/actionable surface. Resolves through generation-valid canonical authority, not latest insertion ordering.

### Authority head

`current revision/validity for gameweek`

Purpose: cheap cache/browser coherency and status monitoring.

These are different resources even if they sometimes point to the same publication row.

---

## 15. Deadline boundary cache rules

The official deadline is a semantic transition, not merely a timestamp shown in the UI.

At/after deadline:

- no stale predeadline payload may continue to imply executable authorization;
- current actionable state must transition to deadline-closed semantics;
- browser clock is display-only and not the authority for transition;
- server/controller official-deadline state drives authority revision;
- a browser that was open across deadline must revalidate authority;
- postdeadline closure publications are audit artifacts and must not be rendered as retroactive predeadline authority.

The deadline transition itself therefore advances or materially changes public authority state even if recommendation content is unchanged.

---

## 16. Result/settlement cache coherency

The same principles apply to live results but with different freshness classes.

Result states must distinguish:

- live/partial observation;
- fixture-complete provisional;
- settlement wait;
- settled generation;
- correction after settlement.

A settled historical result may be immutable for a specific `settlement_generation`, while the logical `current settled result` pointer may later advance after an official correction.

Do not permanently cache a logical `latest result` resource as if it were immutable.

---

## 17. Observability requirements introduced by cache coherency

Future telemetry should include:

- origin authority revision;
- API-served authority revision;
- browser/client observed revision where measurable;
- cache layer that served the response;
- response age;
- ETag/validator identity;
- revalidation result;
- authority mismatch count;
- time from hard invalidation commit to public-head visibility;
- time from authority revision change to browser convergence in synthetic tests;
- stale Class A serve count (target: zero unless explicitly policy-authorized);
- CDN/proxy cache-hit/miss by policy class;
- service-worker version distribution if PWA is used.

A website can be HTTP-healthy while semantically stale; health dashboards must show both.

---

## 18. Failure-injection / acceptance tests

Before C0273 authority cutover, the digital twin and non-production application should prove at least:

1. canonical publication R1 is displayed;
2. R1 hard-invalidates with no replacement yet -> UI removes current/actionable claim;
3. R2 appears later -> UI converges to R2;
4. R1/R2 visible football content identical but lineage differs -> revision changes;
5. CDN/reverse-proxy contains R1 during invalidation -> cannot continue presenting R1 as current;
6. browser left open across revision change -> detects and converges;
7. browser left open across official deadline -> loses predeadline actionability;
8. service worker/cache contains R1 -> cannot restore it as current;
9. origin unavailable after hard invalidation -> old R1 remains labelled last-known/audit only;
10. concurrent publication writes at same timestamp -> canonical authority does not depend on browser sorting;
11. current-authority endpoint and immutable-publication endpoint disagree due to supersession -> UI follows authority endpoint;
12. postdeadline closure publication appears -> no retroactive execution authority;
13. settlement correction after previously settled result -> logical current result advances generation while old immutable evidence remains addressable;
14. application release rollback -> does not roll back semantic authority revision;
15. GitHub unavailable -> running API still serves current durable authority correctly;
16. VPS restart -> reconstructed authority revision matches Supabase durable state before accepting traffic.

---

## 19. Red-team findings

### Finding A — TTL alone is not a correctness mechanism

Even a short TTL creates a bounded interval in which a hard-invalidated decision can be falsely displayed as current.

**Contract:** authority-sensitive current state requires revision validation, not only age.

### Finding B — purge alone is not a correctness mechanism

Purge propagation can fail or race.

**Contract:** clients/proxies must be unable to treat an old authority revision as current after observing a newer revision.

### Finding C — content hash alone is unsafe

Same visible XI can carry different authority/lineage semantics.

**Contract:** validator identity binds semantic authority revision, not just rendered JSON.

### Finding D — latest-row view currently creates an upstream ambiguity

Caching a query that defines current as latest insertion only reproduces that ambiguity faster.

**Contract:** canonical authority selection must be fixed/introduced before claiming cache-safe current publication.

### Finding E — fallback availability can conflict with safety

Serving stale content during an origin outage improves apparent uptime but can violate decision safety.

**Contract:** for actionable authority, semantic correctness outranks stale availability.

### Finding F — static-site mental model is obsolete

The Hostinger runtime architecture separates code deployment from semantic data changes. GitHub deploy frequency must not govern FPL freshness.

---

## 20. Open questions preserved for review

1. Exact physical canonical-authority pointer/revision schema remains unapproved.
2. Exact HTTP cache headers for each class remain unapproved.
3. Whether initial Class A uses strict `no-store` versus mandatory `no-cache`/ETag revalidation remains to be selected during implementation design.
4. Whether a CDN is used at all for Class A remains unresolved; initial preference is bypass.
5. VPS gateway versus selective direct Supabase public reads remains unresolved from Checkpoint 16.
6. Exact browser polling cadence or future push/SSE/WebSocket mechanism is unresolved.
7. Soft-stale actionability remains a product/decision policy question, not a cache decision.
8. Exact API versioning/deprecation window remains unresolved.
9. Whether the product becomes a PWA/service-worker application remains unresolved.
10. Measured invalidation-to-browser convergence SLO has not been selected.
11. Public traffic/load envelope is not yet measured, so optimization decisions should not outrun evidence.
12. Canonical authority must eventually include current manager-state visibility limits; caching cannot solve unobservable private state.
13. Official settlement authority remains unresolved and therefore final result-cache semantics cannot yet be fully closed.

---

## 21. Planning decision

C0273 adopts these public-read principles:

```text
CACHE OPTIMIZATION NEVER DEFINES AUTHORITY

CURRENT ACTIONABLE DISPLAY
  = canonical semantic authority
  + current authority revision match
  + valid lifecycle/deadline state

HARD INVALIDATION
  -> authority revision advances immediately
  -> old payload loses actionable/current status
  -> replacement may arrive later
```

Static/versioned resources may be aggressively cached. Immutable evidence may be aggressively cached by immutable identity. Authority-sensitive current decision state must use strict revision-aware coherency and fail closed under ambiguity.

## Final status

**CHECKPOINT COMPLETE — PLANNING ONLY.**

No public API, proxy, CDN, browser, service-worker, database, publication, runtime or model behavior has been changed.

**PRODUCTION IMPLEMENTATION REMAINS EXPLICITLY APPROVAL-GATED.**

Next bounded C0273 batch: Hostinger VPS sizing/topology plus deployment, observability, backup/recovery and secrets-management design, using measured/current workload evidence rather than selecting a plan by familiarity alone.