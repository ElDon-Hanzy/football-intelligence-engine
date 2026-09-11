# C0248 — Sequential Multi-GW Decision Planner Consolidation Program

Date: 2026-09-11
Status: IN PROGRESS
Parent: C0247

## Objective

Replace the current static multi-Gameweek squad objective with one canonical read-only planner that models week-by-week FPL decisions under current information.

The planner does **not** rewrite player xPts. It consumes the existing chronology-safe production projections and converts them into a sequential decision policy.

C0243–C0246 are absorbed into this program and must not become independent production layers.

## Why this is required

The current optimizer can evaluate a squad across GW4–GW8 and C0240 can test 3FT/4FT/5FT paths **now**, but it does not model the alternative:

`GW4 action → FT carry/accrual → GW5 action → FT carry/accrual → GW6 action → ...`

Therefore it can overvalue paying a hit today for a player that could be reached for free next week, undervalue ROLL, and underprice future information/flexibility.

## Canonical planner state

For each Gameweek state `S_t`:

- gameweek
- exact 15-player squad
- purchase prices for owned players
- current market prices
- bank
- stored free transfers, capped by official FPL rules
- chip availability and chip half
- exact projection-run lineage for each horizon GW
- tactical/role state lineage
- uncertainty state
- price-risk evidence when available
- decision provenance / known-at timestamp

No missing value is silently treated as zero.

## Action space

A weekly action `A_t` can contain:

- ROLL / zero transfers
- legal normal transfers
- paid transfers with explicit hit cost
- Wildcard
- Free Hit
- Bench Boost
- Triple Captain
- starting XI
- captain / vice-captain
- bench order
- execution timing recommendation when price risk exists

Only one chip may be active in a Gameweek.

The first production implementation may introduce these action families incrementally, but they remain fields of one planner rather than separate decision layers.

## State transition

Normal transfer state transition:

1. calculate exact FPL selling value from purchase price + current market price;
2. apply transfers and bank change;
3. charge `4 points × transfers beyond available FT`;
4. preserve acquisition prices of retained players and set buy price for incoming players;
5. play the Gameweek under the chosen XI/captain/bench/chip action;
6. advance to next Gameweek;
7. accrue one FT up to the official storage cap;
8. refresh state with the next horizon projection/price/information scenario.

Wildcard / Free Hit / Bench Boost / Triple Captain transitions must follow current official FPL rules and remain explicit rather than approximated as generic transfer paths.

## No-clairvoyance rule

The planner searches **policies under current information**, not realized future events.

Future projections available today may be used to compare paths, but future transfers are contingent policy intentions and are re-optimized when the next Gameweek arrives. Actual future injuries, lineups, prices and results cannot be assumed known.

Historical forecasts remain immutable.

## Objective

The planner maximizes a weighted sequential utility:

`Σ GW_weight × (starting-XI expected points + captain utility + expected bench/autosub utility - hit cost + bounded structural/flexibility utility)`

subject to model uncertainty and the existing Noise-Control / Decision-Control doctrine.

### XI priority

Starting XI points are primary. Bench players must not receive a universal flat value merely because they exist in the XV.

### Normal bench utility

Normal-GW bench value should approximate expected autosub contribution plus bounded resilience/flexibility value. It must depend on:

- starter appearance/minutes risk;
- bench player appearance probability;
- legal substitution formation constraints;
- bench ordering;
- uncertainty/injury resilience.

It must not be a constant 12% of all bench xPts.

### Bench Boost

Bench Boost uses the full expected FPL points of all 15 players for that Gameweek, not normal autosub utility.

### Captaincy

Captaincy remains a separate sub-decision. Mean xPts cannot be presented as a meaningful edge when candidates lie inside the captaincy model-error band. Distribution/tail evidence remains exposed.

## Transfer timing / price control

Price movement is a feasibility/execution-timing input, never a direct xPts multiplier.

For a football move that already passes Noise-Control, the planner may recommend earlier execution only when the expected affordability/value loss from waiting outweighs information risk from injuries, press conferences, European/cup matches or lineup uncertainty.

The planner must use actual selling-value thresholds, not only market-price changes.

## Chip opportunity cost

Chip decisions belong inside the sequential planner because a chip changes the state transition and future optionality.

Wildcard, Free Hit, Bench Boost and Triple Captain must be compared against saving the chip for later eligible windows. A chip cannot be authorized merely because it improves the current 3–5 GW static objective.

## Search architecture

Exact exhaustive search over every possible 15-player squad path is impractical. The canonical implementation will use bounded beam/receding-horizon search:

1. generate a diverse legal action set from the canonical full-pool player universe;
2. always include ROLL;
3. retain structurally diverse near-optimal states, not only the highest mean;
4. deduplicate equivalent squad/bank/FT/chip states;
5. prune states dominated on both objective and flexibility;
6. preserve serious named challengers as forced states;
7. re-optimize at each next simulated GW;
8. apply model-error equivalence rather than false ranking precision.

Search width/depth are explicit configuration and must be reported in each run.

## Production objects — maximum intended footprint

Primary objects:

1. `public.fpl_sequential_planner_runs` — append-only run/result/lineage storage.
2. Edge Function `fpl-sequential-planner` — read-only solver.
3. `private.c0248_planner_status_v01()` + service-role bridge — compact gate/publication status.

Supporting price-predictor snapshot storage is allowed only if the official source fields are independently verified and historical snapshots are required for calibration.

Do not create separate production decision stacks for C0243/C0244/C0245/C0246.

## Cutover policy

C0248 starts as **shadow/read-only** relative to the current C0240 survivor.

It must not replace the active production decision until it passes:

- deterministic FT-transition tests;
- ROLL tests;
- hit-cost tests;
- purchase/selling-value tests;
- no-clairvoyance/lineage tests;
- bench utility tests;
- named-challenger tests;
- comparison against current C0240 paths;
- chip/price tests when those capabilities are activated;
- C0213 consumption/governance requirements.

After verified cutover:

- C0234 final authorization consumes C0248 planner readiness and selected path;
- C0237 publishes the sequential path and next-step policy;
- overlapping legacy downstream layers may be reclassified SUPPORTING/RETIRED only after evidence proves they are no longer required.

## Initial implementation sequence

### Checkpoint A — contract and storage
- freeze this contract;
- create one planner-run table;
- create status bridge;
- no decision cutover.

### Checkpoint B — sequential FT core
- implement normal transfer/ROLL transitions;
- FT carry/accrual;
- exact selling/buy prices;
- explicit hit cost;
- 3–5 GW beam search;
- dynamic XI/captain selection;
- normal bench autosub utility v1;
- no chips or price-predictor effect yet.

### Checkpoint C — compare GW4 paths
- legacy C0240 4FT/-4;
- ROLL;
- 2FT and 3FT legal paths;
- named challenger where legal;
- delayed-transfer paths across GW5/GW6.

### Checkpoint D — price timing
- independently verify official live predictor fields/source;
- preserve predictor snapshots;
- add affordability-risk scenarios;
- no direct xPts effect.

### Checkpoint E — chips
- chip state / half availability;
- WC/FH/BB/TC transition semantics;
- opportunity-cost policy.

### Checkpoint F — production cutover
- planner-vs-legacy shadow adjudication;
- regressions;
- C0234/C0237 integration;
- governance;
- retire/simplify overlapping legacy decision components only after verified cutover.

## Integrity

- No underlying player xPts rewrite.
- No historical forecast rewrite.
- No ownership multiplier on xPts.
- No external FPL execution.
- No manager-plan mutation before final authorization.
- Live Supabase/runtime evidence outranks this document if they disagree.
