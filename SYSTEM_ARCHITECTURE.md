# Football Intelligence Engine — System Architecture

_Last reconciled: 2026-09-19 — tracker/architecture reconciliation D_

## 1. Purpose and invariants
The engine has two linked products: FPL decision intelligence and chronology-safe football research. Historical forecasts are append-only; missing data is unknown rather than zero; research acquires no production numeric effect merely by existing; actual submission, recommendation, frozen forecast and realized outcome remain separate.

## 2. Source-of-truth order
1. live Supabase runtime/data and architecture registry;
2. `public.change_tracker_working` and C0213 governance;
3. current GitHub source/migrations;
4. canonical documentation;
5. historical handovers and summaries.

## 3. Lifecycle and production-effect contract
Components are classified independently by lifecycle (PRODUCTION, SHADOW, RESEARCH, UI_ONLY, INFRASTRUCTURE, RETIRED), canonical status and production effect. A production-effect component requires definition-hash-bound behavioral proof. Unpromoted research/shadow families have zero numeric production effect. Runtime counts are resolved live rather than treated as permanent documentation constants.

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

## 5. C0279/C0280 forecast-to-player research
C0279 is shadow-first and remains promotion blocked / zero numeric production effect. Its chain is season-weighted team state → orthogonal fixture modifiers → fixture distribution → LOW/NORMAL/HIGH environment → score-family/script → team goal states → conditional player-return distributions → existing captaincy/C0277/C0248/C0276 authorities.

Previous-season performance decays to zero from nine current-season matches. L20 cannot return as an input. Shootout and demolition are HIGH_SCORING subtypes. Raw modal score remains diagnostic rather than automatic headline.

C0280 tested fixture-first context/player-discovery layers. Only its P9 calculation-faithful explanation/modal contract was promoted for GW5; P2-P8 predictive effects remain held pending settled prospective evidence. No captaincy, transfer, chip or selected-path authority moved to C0280.

## 6. Canonical downstream FPL decision chain
```text
FULL-POOL OPTIMIZER
→ C0227 uncertainty / sensitivity
→ C0228 ensemble / equivalence
→ C0229 structural robustness
→ C0231 forward-management evidence
→ C0232 OR / rank utility
→ C0233 red-team evidence
→ C0240 adversarial benchmark
→ captaincy + named-challenger consistency
→ C0248 CANONICAL SEQUENTIAL SELECTED-PATH AUTHORITY
→ C0277 chip opportunity-cost supporting gate
→ C0234 / C0276 FAIL-CLOSED FINAL AUTHORIZATION
→ C0237 PUBLICATION
→ external FPL execution only if separately authorized
```

C0248 is sole selected-path authority. C0240 is supporting evidence. C0230 is advisory/nonblocking and zero numeric effect. C0276 is the bounded operational control plane, not another optimizer. Publication never implies external execution.

## 7. C0276 + C0281 bounded autonomy/deadline control
C0276 is **Completed / Verified** as the bounded control-plane program and remains operational. It runs the lineage-aware DAG from fixture/player state through projection, uncertainty, optimizer, ensemble, structural, forward, OR utility, red team, adversarial, captaincy, sequential, final gate and publication.

C0281 is **Completed / Verified** and adds deadline convergence: `NORMAL → T4_BASELINE → T4_BASELINE_CONVERGED → T2_DELTA → CLOSED`. T-4 establishes a coherent baseline; T-2 handles material deltas. Authoritative player-state changes remain immediately material. Fixture-signature churn inside T-4 is conservatively debounced. Heavy work stops inside the empirical runtime reservation; a coherent checkpoint may be frozen subject to existing governance, otherwise the chain fails closed.

Async RUNNING work is terminalized under governed HTTP/TTL reconciliation rather than allowed to livelock indefinitely. Historical artifacts remain immutable.

## 8. Sequential squad-management semantics
C0248 models reachable multi-Gameweek squad states: squad, bank, purchase/selling economics, FT inventory, chip inventory and information. Actions include ROLL, legal transfers/hits and chip roots where evidence exists. XI/captaincy value, bench leakage, marginal £ value, club-slot cost, future transfer burden, affordability and uncertainty are part of the problem.

## 9. Chip option value
C0277 is **Completed / Verified** as a supporting seasonal option-value control. A high short-horizon chip-root score cannot authorize a chip by itself. Structural future evidence can reserve a chip but cannot authorize spending. C0277 feeds the canonical C0248/C0276 path and is not a parallel selector.

## 10. Research architecture
```text
SOURCE → FEATURE/MODEL → SHADOW OUTPUT → EVALUATOR/ABLATION → PROMOTION OR REJECTION
```

Negative evidence is preserved. Indefinite passive monitoring is prohibited: bounded research reaches an adjudication point. Current bounded observations include C0197 through GW6, C0224 through GW6, C0230 advisory through GW6, C0270 prospective anomaly watch, C0279 prospective promotion evidence and C0280 prospective predictive adjudication.

C0265 remains deliberately unfixed pending separate authorization.

## 11. Transfer-window disposition
C0203/C0205/C0206 are **Completed / Verified**. The summer-window integration, transfer ledger and governed newcomer/bootstrap questions are closed. C0207-C0211 are closed/superseded; ordinary in-season roles, minutes, set pieces and team state now belong to current-season evidence rather than transfer-specific permanent monitoring.

## 12. Product/runtime state
C0278 whole-engine reconciliation is **Completed / Verified**. C0273 planning is **Completed / Verified**; future VPS/runtime migration is a separate implementation decision. C0282 V3 GW5 post-deadline population/QA is **Completed / Verified**. V3 is the current consumer surface and V2 remains fallback until explicitly retired.

Permanent safety constraints:
- no historical forecast rewrite;
- no hidden second selected-path authority;
- no production effect without current proof;
- no external FPL execution without separate authorization;
- C0265 unchanged unless separately authorized;
- C0240 concurrency unchanged unless separately validated/authorized.

## 13. Canonical references
- `PROJECT_DESCRIPTION.md`
- `PROJECT_STATE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `DECISIONS_AND_HISTORY.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- C0278 reconciliation
- C0279 canonical plan
- C0280 closeouts
- C0281 deadline closeout
- C0282 V3 GW5 closeout evidence
