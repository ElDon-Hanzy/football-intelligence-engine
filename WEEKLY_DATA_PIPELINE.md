# Football Intelligence Engine — Weekly Data Pipeline

_Last reconciled: 2026-09-17 — C0278 whole-engine closeout_

## 1. Operating principle

The weekly system is a chronology-safe state machine. Projection readiness and decision readiness are separate. Completed-match evidence may update future Gameweeks only; target-fixture intelligence freezes according to its registered chronology contract; missing data remains unknown rather than zero.

Historical forecasts are append-only.

## 2. Continuous source/state refresh

Core live activity includes official/results synchronization, FPL player/price/manager state, availability/injury/suspension evidence, team/process evidence, realized tactical roles, prospective role/fixture state, and C0159/C0166 fixture forecast cycles.

Exact cron inventory is live runtime state and must be read from Supabase rather than hard-coded here. C0278 reconciliation found **29 active crons and zero duplicate active cron targets** after authority cleanup.

## 3. Prospective horizon and chronology

Decision evaluation supports exact 1–5 GW numerical horizons where approved inputs exist. C0241 exact-horizon lineage prevents shorter upstream evidence from being silently extrapolated into a longer decision horizon. Missing future evidence must reduce readiness/precision rather than be invented.

C0248 then models reachable weekly state transitions across that evidence: squad, bank, selling/acquisition economics, FT inventory, chip inventory and future information state.

## 4. Projection cadence and hard invalidation

C0217 remains the canonical projection-cadence controller; C0235 provides immutable PRE_FINAL semantics. Current-GW projections refresh through governed cadence, including final-information refresh behavior near the deadline.

Material post-snapshot state changes invalidate stale descendants. C0274 hard-event functions remain a safety primitive for confirmed severe availability changes; they are not an independent scheduled decision authority. Regeneration creates a new immutable projection snapshot rather than rewriting history.

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

Incomplete result/role state remains a readiness blocker rather than neutral evidence.

## 6. C0276 operational DAG

The bounded autonomous cycle is:

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

C0276 processes this chain with exact lineage checks, bounded retries and fail-closed recovery. Heavy asynchronous results are accepted only if their timestamp/request and required upstream lineage match the current cycle. A stale successful artifact cannot satisfy a newer dispatch.

## 7. Decision-control semantics

After optimizer generation:

- C0227 tests uncertainty/sensitivity;
- C0228 tests ensemble/equivalence;
- C0229 tests structural robustness;
- C0231 supplies forward-management evidence;
- C0232 supplies OR/rank utility;
- C0233 supplies red-team evidence;
- C0240 supplies adversarial benchmark evidence;
- captaincy/named-challenger consistency is evaluated;
- **C0248 selects the canonical sequential path**;
- C0234/C0276 apply fail-closed final authorization;
- C0237 publishes only after the authority chain allows it.

C0230 remains advisory/nonblocking and zero numeric effect. C0240 is not a second selected-path authority.

## 8. Sequential transfer planning

C0248 supersedes the old static-horizon limitation. It evaluates reachable weekly trajectories in which FT inventory changes, future transfers can be made, affordability is state-dependent and information evolves. ROLL/no transfer is always a candidate.

Normal-transfer evaluation accounts for transfer costs, bank/selling values, XI-first scoring, captaincy, bench leakage/resilience, club-slot cost, future transfer burden and model uncertainty. Reasonable-assumption sensitivity that destroys the edge results in `NO_MEANINGFUL_EDGE`.

## 9. Bench and captaincy semantics

Bench value is state-dependent rather than treated as four equal starters. Normal weeks account for autosub/resilience/option value; Bench Boost requires full legal bench scoring semantics.

Captaincy is optimized separately using expected points, xMins, ceiling/tail probabilities, matchup, penalties and rank/EO context. Captain and vice must remain consistent with the final selected path.

## 10. Chip timing / C0277

Chip actions can appear as C0248 roots, but a short-horizon chip edge is insufficient for season-level authorization. C0277 supplies first-half/season reservation-value and joint chip-calendar evidence.

Before WC/FH/BB/TC authorization, the engine must establish that the proposed timing survives uncertainty, Noise-Control, red-team evidence and future opportunity cost. If broader timing coverage is incomplete, the chip gate fails closed or reserves the chip for future use.

## 11. Price and manager state

Current prices, selling values, bank and FT inventory are feasibility constraints. Price forecasts may affect timing/flexibility but never directly alter player xPts. A material manager-state or projection change invalidates stale decision artifacts.

## 12. Final Gameweek decision

Before final authorization:

- manager state and economics must be current;
- price/availability/role/tactical/fixture evidence must be sufficiently fresh;
- exact upstream lineage must be valid;
- uncertainty, structural, forward, OR, red-team and adversarial evidence must be current;
- captaincy/named challengers must be consistent;
- C0248 sequential selected path must be current;
- final T−2/deadline governance must pass;
- any chip must pass C0277 opportunity-cost evidence.

C0276 is the single scheduled control plane for this final chain. C0272's final-promotion primitive may be invoked subordinately where required, but it no longer has an independent scheduled authority loop.

Publication does not authorize or perform external FPL transfers/chips.

## 13. Protected states

- C0265 xMins hard-anchor behavior remains deliberately unchanged pending separate authorization.
- C0270 prospective definitions remain frozen.
- C0240 concurrency remains unchanged unless separately validated/authorized.
- Historical forecasts are never rewritten.
- Actual submitted team, recommendation, decision snapshot and realized outcome remain distinct.

Canonical reconciliation: `project-management/C0278_FULL_ENGINE_STATE_AUDIT_RECONCILIATION_20260916.md`.
