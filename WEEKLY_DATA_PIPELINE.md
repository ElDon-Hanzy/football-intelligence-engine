# Football Intelligence Engine — Weekly Data Pipeline

_Last updated: 2026-09-11 — C0247 audit_

## 1. Operating principle

The weekly system is a chronology-safe state machine. Projection readiness and decision readiness are separate. Completed-match evidence may update future Gameweeks only; target-fixture intelligence freezes at kickoff; missing data is not zero.

## 2. Continuous source/state refresh

Core live jobs include:

- official/results synchronization;
- FPL price/player-state ingestion;
- availability/injury/suspension refresh;
- current-season team/process evidence;
- realized tactical-role refresh after completed matches;
- prospective role/tactical fixture state;
- C0159/C0166 fixture forecast cycles.

Exact cron inventory is live architecture state and should be read from Supabase rather than copied permanently into this document. C0247 live registry shows 29 active crons and zero duplicate active cron targets.

## 3. Prospective horizon

The FPL decision architecture supports an exact **1–5 Gameweek horizon**.

C0241 repaired the horizon contract so a horizon-5 optimizer/adversarial decision must be based on horizon-5 upstream lineage. Missing GW7/GW8 feature state cannot be silently replaced by a shorter optimizer result and then extrapolated.

Forward numerical precision must not be invented where approved data are unavailable.

## 4. Projection cadence

C0217 is the canonical projection-cadence controller. C0235 adds immutable PRE_FINAL publication semantics. Do not bypass cadence with raw projection writes.

Current-GW projections refresh under the canonical cadence, with a separate forced final-information refresh at T−2h before the deadline.

Historical forecasts remain append-only.

## 5. End-of-Gameweek sequence

After a Gameweek completes:

1. results finalize;
2. player/team actuals are appended;
3. realized tactical roles update from completed matches;
4. current player/team state incorporates completed evidence;
5. future role/tactical state rebuilds;
6. C0159/C0166 fixture forecasts refresh;
7. future player projections/event distributions refresh;
8. decision layers re-evaluate only on valid fresh lineage.

Incomplete result/role state remains a readiness blocker rather than neutral evidence.

## 6. Full-pool optimizer

The canonical optimizer is read-only and consumes:

- exact target GW/horizon;
- exact prediction-run lineage;
- manager state and current acquisition/selling values;
- FT inventory;
- budget;
- transfer-cost points;
- horizon weights;
- bench weight;
- model-error margin;
- current tactical roles/xMins.

A later material projection/manager-state change invalidates stale optimizer output for decision-grade use.

## 7. Current decision-control sequence

After optimizer generation, the current production stack evaluates:

- C0227 uncertainty/sensitivity;
- C0228 ensemble/equivalence;
- C0229 structural robustness;
- C0230 shadow regime diagnostics;
- C0231 approximate forward management;
- C0232 rank/leverage context;
- C0233 red team;
- C0240 deeper adversarial current-transfer search;
- C0234 final authorization;
- C0237 live publication.

C0241 enforces exact-horizon lineage. C0242 named-challenger/captaincy consistency is implemented but still awaiting full C0234/C0237 integration.

## 8. Critical C0247 limitation

The current horizon calculation is **not yet a sequential weekly transfer planner**.

A candidate XV is evaluated across future GWs, while C0240 tests immediate current-FT / +1-hit / +2-hit transfer counts. The engine does not yet model:

`remaining FTs after GW t action + one new FT at GW t+1 + changed prices/information + re-optimization`.

Therefore a static five-GW objective cannot be treated as the final strategic value of “move now versus wait one week.”

## 9. Bench semantics

Normal-GW optimization currently discounts bench output (default optimizer weight 0.12); it does not equal-weight XI and bench.

C0247 identifies the remaining gap: bench value must become state-dependent. Normal weeks should reflect expected autosub/resilience/option value; a Bench Boost week should count the full scoring contribution of all four bench players.

Do not use a fixed bench weight as a substitute for chip-state logic.

## 10. Chip timing

Current C0234 chip handling is incomplete. It verifies Wildcard availability and can fail closed when long-horizon Wildcard opportunity cost is unavailable, but no unified BB/TC/FH timing optimizer exists.

Chip actions should ultimately be modeled as alternatives inside the same multi-GW state transition, not as disconnected recommendation layers.

## 11. Price state

FPL prices/selling values are current-state constraints. C0242 rechecks named-challenger feasibility after price changes.

Pending C0243 requirements would add predictive execution-timing risk. Price prediction must affect timing/feasibility, not xPts.

## 12. Final Gameweek decision

Before final authorization:

- current manager state must be known;
- current price/availability/role/tactical/fixture inputs must be fresh;
- exact-horizon lineage must be valid;
- required uncertainty/structural/adversarial controls must have evaluated;
- serious named challengers must be resolved once C0242 is integrated;
- captaincy equivalence must be communicated honestly;
- final T−2h refresh must be current;
- chip opportunity cost must be sufficient for any proposed chip.

Only an authorized final decision may enter the execution ledger. The engine does not externally execute FPL transfers/chips.

## 13. Pending architecture

C0243-C0246 remain design-only. Per C0247, consolidate them into one minimum multi-GW state-transition planner when explicitly authorized rather than adding four independent runtime layers.

Canonical audit: `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`.