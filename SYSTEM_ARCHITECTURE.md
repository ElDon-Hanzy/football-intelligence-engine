# Football Intelligence Engine — System Architecture

_Last reconciled: 2026-09-17 — C0278 whole-engine closeout_

## 1. Purpose and invariants

The engine has two linked products: FPL decision intelligence and chronology-safe football research. Historical forecasts are append-only; missing data is unknown rather than zero; research acquires no production numeric effect merely by existing; actual submission, recommendation, frozen forecast and realized outcome remain separate.

## 2. Source-of-truth order

1. live Supabase runtime/data and architecture registry;
2. `public.change_tracker_working` and C0213 governance;
3. current GitHub source/migrations;
4. canonical documentation;
5. historical handovers and summaries.

## 3. Lifecycle and production-effect contract

Components are classified independently by lifecycle (PRODUCTION, SHADOW, RESEARCH, UI_ONLY, INFRASTRUCTURE, RETIRED), canonical status and production effect. A production-effect component requires definition-hash-bound behavioral proof. Unpromoted research/shadow families have zero numeric production effect.

Latest C0278 reconciliation evidence: 820 registered components, 14 production-effect components, 14/14 current behavioral PASS, 19/19 required capabilities, 99/99 tracker consumption contracts covered, zero active duplicate cron targets and zero active retired external deployments.

## 4. Forecast path

```text
RESULTS / FPL / FOOTBALL SOURCES
→ ingestion + chronology/provenance
→ canonical player/team/role/fixture state
→ bounded fixture derivative / production fixture forecast
→ team lambda adjustment
→ player goal/assist lambdas
→ event point distribution
→ player projection core
→ full-pool optimizer
```

Core production surfaces include current team performance, adjusted team lambda, goal/assist lambda, event distribution, projection core, C0159/C0166 fixture forecasts, realized/current role profiles and the full-pool optimizer. Realized roles are factual categorical state; shadow research cannot silently alter xPts.

## 5. Canonical downstream FPL decision chain

```text
FULL-POOL OPTIMIZER
  ↓
C0227 uncertainty / sensitivity
  ↓
C0228 ensemble / equivalence
  ↓
C0229 structural robustness
  ↓
C0231 forward-management evidence
  ↓
C0232 OR / rank utility
  ↓
C0233 red-team evidence
  ↓
C0240 adversarial benchmark
  ↓
captaincy + named-challenger consistency
  ↓
C0248 CANONICAL SEQUENTIAL SELECTED-PATH AUTHORITY
  ↓
C0234 / C0276 FAIL-CLOSED FINAL AUTHORIZATION
  ↓
C0237 PUBLICATION
  ↓
external FPL execution only if separately authorized
```

Authority rules:

- C0248 is the sole selected-path authority.
- C0240 is supporting adversarial evidence, not a second selector.
- C0230 is advisory/nonblocking with zero numeric production effect.
- C0276 is the bounded autonomy/control plane around the chain, not another optimizer or decision authority.
- Publication never implies external execution.

## 6. C0276 bounded autonomy

C0276 represents the operational DAG from fixture/player state through projection, uncertainty, optimizer, ensemble, structural, forward, OR utility, red team, adversarial, captaincy, sequential, final gate and publication. It is lineage-aware and fail-closed.

Heavy asynchronous stages are reconciled only when the returned artifact is newer than its request and matches exact required upstream lineage. Stale or mismatched artifacts cannot satisfy a new request. Retries are bounded; `RETRY_WAIT` is a governed backoff state rather than an unknown-health failure.

Current GW5 evidence at reconciliation has reconverged through projection 1401 and C0248 sequential candidate run 38. FINAL_GATE is held by the governed T−2 timing/authorization contract.

## 7. Sequential squad-management semantics

C0248 models reachable multi-Gameweek squad states rather than treating a horizon as one static XV. State includes squad, bank, purchase/selling economics, FT inventory, chip inventory and information. Actions include roll, legal transfers/hits and chip roots where evidence is available. Each transition adds future FT/information state and preserves affordability/flexibility constraints.

Every meaningful action is compared with ROLL. XI/captaincy value, bench leakage, marginal £ value, club-slot cost, future transfer burden and model uncertainty are part of the decision-control problem.

## 8. Chip option value

A high short-horizon chip-root score is not sufficient to authorize a chip. C0277 extends the architecture with season/first-half reservation-value evidence and joint chip-calendar evaluation. Chip decisions remain fail-closed when broader timing coverage or robust option-value evidence is incomplete. C0277 is a sub-control feeding the canonical C0248/C0276 decision path, not a parallel selector.

## 9. Final authorization principle

There is one fail-closed authorization boundary after C0248. It consumes current-lineage diagnostics and must not duplicate optimization internally. Noise-Control requires multiple independent signals including structural evidence; recommendations inside normal model error, unstable under reasonable assumptions, or inconsistent across plausible scenarios are `NO_MEANINGFUL_EDGE`.

## 10. Research architecture

```text
SOURCE → FEATURE/MODEL → SHADOW OUTPUT → EVALUATOR/ABLATION → PROMOTION OR REJECTION
```

Negative evidence is preserved. C0265 remains deliberately unfixed pending separate authorization. C0270 prospective definitions remain frozen. C0230 and other unpromoted families remain non-numeric.

## 11. Runtime/governance state

C0278 whole-engine reconciliation is Completed / Verified. It reconciled runtime/source ownership, active cron ownership, decision authority, tracker state and canonical documentation. Intentional open, blocked, deferred and monitoring programs are not mass-closed.

Permanent safety constraints:

- no historical forecast rewrite;
- no hidden second selected-path authority;
- no production effect without current proof;
- no external FPL execution without separate authorization;
- C0265 unchanged unless separately authorized;
- C0240 concurrency unchanged unless separately validated/authorized.

## 12. Canonical references

- `PROJECT_DESCRIPTION.md`
- `PROJECT_STATE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `DECISIONS_AND_HISTORY.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0278_FULL_ENGINE_STATE_AUDIT_RECONCILIATION_20260916.md`
