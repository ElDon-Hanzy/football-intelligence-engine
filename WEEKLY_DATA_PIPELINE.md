# Football Intelligence Engine — Weekly Data Pipeline

_Last reconciled: 2026-09-19 — C0281/C0282 and tracker reconciliation D_

## 1. Operating principle
The weekly system is a chronology-safe state machine. Projection readiness and decision readiness are separate. Completed-match evidence may update future Gameweeks only; target-fixture intelligence freezes according to its registered chronology contract; missing data remains unknown rather than zero. Historical forecasts are append-only.

## 2. Continuous source/state refresh
Core live activity includes official/results synchronization, FPL player/price/manager state, availability/injury/suspension evidence, team/process evidence, realized tactical roles, prospective role/fixture state and C0159/C0166 fixture forecast cycles.

Exact cron inventory is live runtime state and must be read from Supabase rather than hard-coded as a permanent count. C0281 restored duplicate-safe projection-horizon and optimizer orchestration cadence alongside the C0276 autonomous tick.

## 3. Prospective horizon and chronology
Decision evaluation supports exact 1–5 GW numerical horizons where approved inputs exist. C0241 prevents shorter upstream evidence from being silently extrapolated into a longer decision horizon. Missing future evidence reduces readiness/precision rather than being invented. C0248 models reachable weekly state transitions across that evidence.

## 4. Projection cadence, invalidation and deadline stabilization
C0217 remains the canonical projection-cadence controller; C0235 provides immutable PRE_FINAL semantics. Material post-snapshot state changes invalidate stale descendants and regeneration creates a new immutable snapshot.

C0281 deadline control is now first-class:

`NORMAL → T4_BASELINE → T4_BASELINE_CONVERGED → T2_DELTA → CLOSED`.

T-4 targets coherent baseline convergence. T-2 processes material deltas rather than starting from scratch. Authoritative player-state changes remain immediately material; fixture-signature churn inside T-4 is debounced until repeated twice or persistent for five minutes. Once remaining time breaches the empirical runtime reservation, no new heavy dispatch begins; freeze a coherent checkpoint only if existing governance permits it, otherwise fail closed.

Existing C0243/C0248 price timing is reused. Price never creates a football transfer and may accelerate only an already robust action when affordability is materially threatened.

## 5. End-of-Gameweek sequence
After a Gameweek completes:
1. results/finality become authoritative;
2. player/team actuals append;
3. realized tactical roles update;
4. current player/team state incorporates completed evidence;
5. future role/tactical state rebuilds;
6. fixture forecasts refresh;
7. future player projections/event distributions refresh;
8. downstream decision layers regenerate only on valid fresh lineage.

Incomplete result/role state remains a readiness blocker rather than neutral evidence. Live observations before fixture finality may be served as live state but cannot be falsely promoted to final realized values.

## 6. C0276 operational DAG
```text
FIXTURE_STATE + PLAYER_STATE
→ PLAYER_PROJECTION
→ UNCERTAINTY
→ OPTIMIZER
→ ENSEMBLE
→ STRUCTURAL
→ FORWARD
→ OR_UTILITY
→ RED_TEAM
→ ADVERSARIAL
→ CAPTAINCY
→ SEQUENTIAL
→ FINAL_GATE
→ PUBLICATION
```

C0276 processes this chain with exact lineage checks, bounded retries and fail-closed recovery. Heavy asynchronous results are accepted only when request/timestamp and required upstream lineage match the current cycle. C0281 adds HTTP/TTL terminal reconciliation so stale RUNNING state cannot livelock indefinitely.

## 7. Decision-control semantics
After optimizer generation C0227 tests uncertainty; C0228 equivalence; C0229 structural robustness; C0231 forward management; C0232 OR/rank utility; C0233 red-team; C0240 adversarial evidence; captaincy/named challengers are checked; **C0248 selects the sole canonical sequential path**; C0277 supplies chip opportunity-cost evidence; C0234/C0276 apply final authorization; C0237 publishes only after the chain allows it.

C0230 remains advisory/nonblocking and zero numeric effect. C0240 is not a second selected-path authority.

## 8. Sequential transfer planning
C0248 evaluates reachable weekly trajectories in which FT inventory changes, future transfers can be made, affordability is state-dependent and information evolves. ROLL/no transfer is always a candidate. Normal-transfer evaluation accounts for transfer costs, bank/selling values, XI-first scoring, captaincy, bench leakage/resilience, club-slot cost, future transfer burden and model uncertainty.

## 9. Bench and captaincy semantics
Bench value is state-dependent rather than four equal starters. Normal weeks account for autosub/resilience/option value; Bench Boost requires full legal bench scoring semantics. Captaincy is optimized separately using expected points, xMins, ceiling/tail probabilities, matchup, penalties and rank/EO context. Captain and vice must remain consistent with the final selected path.

## 10. Chip timing / C0277
C0277 is **Completed / Verified** as a supporting seasonal option-value control. Short-horizon chip edge is insufficient for season-level authorization. If broader timing evidence is incomplete, reserve the chip or fail closed. Unknown future option value is not zero.

## 11. Research cadence and expiry
Research/shadow evidence cannot silently enter production. Current bounded observation windows include C0197, C0224 and C0230 through GW6. C0279 remains promotion blocked; C0280 predictive P2-P8 effects remain held. After registered expiry, experiments must be adjudicated rather than left indefinitely Monitoring.

C0265 remains deliberately unchanged. C0270 remains a prospective shadow anomaly watch.

## 12. Final Gameweek decision
Before final authorization:
- manager state/economics current;
- price/availability/role/tactical/fixture evidence sufficiently fresh;
- exact upstream lineage valid;
- uncertainty/structural/forward/OR/red-team/adversarial evidence current;
- captaincy/named challengers consistent;
- C0248 selected path current;
- C0277 passed for any chip;
- C0281 deadline phase/reservation/checkpoint governance satisfied.

Publication does not authorize or perform external FPL transfers/chips.

## 13. Product/result serving
C0282 verified V3 post-deadline semantics. Actual submitted picks are independently captured and immutable; recommendation is separate; live observations can update during matches; realized player values require finished-fixture evidence. V3 is current consumer surface, V2 fallback.

## 14. Protected states
- C0265 xMins hard-anchor behavior deliberately unchanged pending separate authorization.
- C0270 prospective definitions frozen.
- C0240 concurrency unchanged unless separately validated/authorized.
- Historical forecasts never rewritten.
- Actual submitted team, recommendation, decision snapshot and realized outcome remain distinct.
