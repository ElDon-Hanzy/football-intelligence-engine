# Football Intelligence Engine — Decisions & History

_Last updated: 2026-08-23_

This file preserves the reasoning, rejected approaches, debugging lessons, and implementation decisions that are easy to lose when moving between ChatGPT conversations. `PROJECT_STATE.md` is the operational source of truth; this file explains why the project reached that state.

## 1. Product objective

The project evolved from an FPL optimization engine into a broader football intelligence platform with two linked objectives:

1. Maximize FPL decision quality across the full season.
2. Find betting-market mispricing, especially Correct Score, by identifying information, interactions and contextual factors that bookmakers may not yet have fully priced.

The betting objective is explicitly NOT to build another bookmaker. The desired behavior is the scalable equivalent of a strong human value bettor: inspect underlying statistics, recent form, H2H only when contextually relevant, tactics, formation, manager behavior, injuries/absences, replacement quality, fatigue, schedule congestion, European/cup priorities, home/away effects, and attack-vs-defence channel mismatches; then compare our resulting fair probabilities against market prices.

## 2. FPL decision philosophy

### Full-squad optimization
Every serious weekly decision must start by projecting all 15 players. Do not anchor to the previous XI or assume bench players remain benched.

For all 15, estimate at minimum:
- expected minutes
- expected points
- P(blank)
- P(5+)
- P(10+)
- P(15+)
- P(20+)

Then choose XI, bench order, captain and vice.

### Captaincy Haul Model
Captaincy is not chosen on mean xPts alone. A permanent Captaincy Haul Model evaluates the full return distribution, including blank and haul probabilities. This is especially important because doubling a captain makes tail outcomes materially important.

### Defensive Contributions
Defensive Contributions (DC) are permanently part of both normal xPts and Captaincy Haul modelling. Estimate the position-specific probability of earning the +2 DC points from historical defensive-action rates, expected minutes, role/position, opponent possession/pressure, defensive workload, game state, and interactions with clean-sheet and bonus probabilities.

### Anti-anchoring
Prior recommendations are not protected. Re-run from fresh evidence and change XI/captain/bench when the evidence changes.

## 3. GW1 squad construction reasoning

The squad was deliberately built for value rather than simply buying the most expensive/highly owned players. Several premium prices were considered potentially overvalued, so the process emphasized marginal points per budget, role, minutes, fixture, upside and captaincy alternatives.

Important debated examples:
- O'Reilly was initially at risk of being underestimated when evaluating season-long contribution totals rather than contribution per minute/match in his actual role. The decision was to retain his attacking upside despite some xMins risk.
- Dalot was eventually replaced by Maguire at equal price because Manchester United right-back selection had unnecessary three-way uncertainty, while Maguire's central starting route was stronger given defensive availability.
- Bruno remained the preferred captain over Mbeumo because of penalties, broader scoring routes and expected minutes, while Mbeumo remained vice.
- No-Haaland exposure was deliberate rather than accidental. It increased structural risk but released budget for a stronger overall squad.

Historical GW1 decisions must remain frozen even when later model versions imply a better XI or different xPts.

## 4. Why the projection model was recalibrated

An early dashboard value around 43 squad/XI xPts triggered a review because it was inconsistent with the strength of the constructed team and external projection references.

The investigation found that the model's fixture-strength transform compressed elite/easy fixtures too aggressively toward league average. The solution was NOT a blanket uplift. The fixture-strength treatment was recalibrated and then benchmarked player-by-player against external models.

Model evolution:
- v0.1.1: over-compressed fixture strength.
- v0.1.2: normalized multiplicative matchup strength.
- v0.1.2b: conditional starter minutes, player-specific P(start), explicit penalty-event treatment, latent BPS-style bonus simulation, opponent-adjusted DC workload.
- v0.1.3: Player Role Intelligence so strong current-role evidence can override stale/injury-distorted historical priors.

Examples motivating Player Role Intelligence included Bruno and Isak, where historical samples were not fully representative of current role/availability.

External models are calibration references, not truth. Never move our projection merely because one external source disagrees. Source disagreement itself is information.

## 5. Frozen forecasts and append-only history

This became a non-negotiable architecture rule after building GW-level audit views.

For FPL and betting:
- preserve what the model genuinely predicted at decision time;
- never overwrite a historical forecast after kickoff/results;
- newer model versions may produce shadow/research reruns, clearly labelled as such;
- fixture forecasts may evolve before kickoff as new evidence arrives;
- hard-freeze at kickoff;
- evidence must carry captured/known-at timestamps to prevent hindsight contamination.

The dashboard must retain every GW independently rather than replacing prior GW data.

## 6. Prediction-vs-actual audit semantics

A major semantic correction was made: unexpected upside is not a model failure for the decision objective.

Example: if Saka was predicted at 4.88 and scored 9, that is a positive error and must be green, not red simply because absolute error is large.

Final intended downside rule:

`acceptable_downside_tolerance = max(1, round(0.20 * xPts))`

Use whole FPL points; `.5` rounds upward.

Green:
- actual >= predicted; OR
- actual is below predicted but within allowed downside tolerance.

Red:
- actual is below prediction by more than the allowed tolerance.

The previous `max(2, 30%)` rule is superseded.

The All Predictions vs Actuals tab should show 20 records per page. Search filters the complete GW prediction set first, then pagination applies. Changing search resets to page 1. `Allowed`, xMins and Actual Mins were removed from this audit table.

## 7. Dashboard debugging history

Important regressions/lessons:

### Responsive tables
A dashboard update caused Overview tables to exceed screen width. Table wrappers/mobile CSS were corrected. Future changes must be tested for mobile width containment.

### Player modal regression
At one point clicking player names from Top 10 stopped returning stats. Player lookup must search squad, top-double-digit and all-predictions datasets safely.

### `toFixed` crash
After the Betting API response became nested under `prediction`, the dashboard still accessed flattened fields such as `f.home_lambda.toFixed(...)`. Undefined values crashed the entire page with:

`Dashboard error: Cannot read properties of undefined (reading 'toFixed')`

Fix: normalize old/new API response structures and use safe numeric formatting. Missing data must never crash the dashboard.

### Missing data shown as zero
Betting fixture tables displayed `0` / `0.00` where no prediction/odds existed. This is misleading. Missing numerical data must display `—` or `No data`. Zero is reserved for a genuine modeled/measured zero.

## 8. Fixture and Correct Score architecture

The fixture model should maintain:
- home/away lambda
- correct-score probability matrix
- ranked scorelines
- 1X2
- BTTS
- totals such as O/U 2.5
- clean-sheet probabilities
- confidence

The fixture result should update pre-kickoff as probabilities/evidence change. Clicking it should eventually show forecast history: old probability, new probability, lambda movement, timestamp and causal evidence. Freeze at kickoff.

Two Correct Score recommendation cards belong on the homepage. A dedicated Betting tab should eventually recommend the strongest opportunities across major markets.

A high-probability scoreline is not automatically a bet. The recommendation requires value versus bookmaker fair probability.

## 9. Bookmaker Layer 1 reasoning

Before edge calculations, the project prioritized reliable bookmaker ingestion. Odds-API.io was selected as the primary direct Correct Score provider after live testing returned real Correct Score selections from bookmakers including Bet365 and Unibet.

Layer 1 requirements:
- map provider events to internal fixtures deterministically;
- normalize team aliases;
- use teams + kickoff rather than weak fuzzy-name matching alone;
- preserve raw append-only snapshots;
- normalize bookmaker, market, selection, decimal odds and timestamps;
- reject post-kickoff contamination;
- expose ingestion health/unmatched fixtures.

A third Correct Score source remains desirable for robustness/validation.

Do not implement/promote de-vig, EV or edge recommendations until Layer 1 data is verified.

## 10. Mispricing Intelligence concept

The user's target behavior is the scalable equivalent of manual value-bet research. Candidate signal families discussed include:
- recent underlying form rather than simple W/D/L
- home/away splits
- tactics and formation
- manager strategy
- expected XI
- injuries/suspensions
- replacement quality
- fatigue/rest
- schedule congestion
- Champions League/cup match before/after
- competition priority
- travel
- pressing vs buildup
- high defensive line vs pace
- wing attack vs opponent wing vulnerability
- central progression mismatch
- aerial/set-piece mismatch
- goalkeeper performance
- weather/pitch where material

H2H is not automatically useful. It should matter only when the relevant tactical/personnel/contextual structure persists.

## 11. First approved Mispricing Intelligence families

The first two families were deliberately built together:

### Recent Performance
Focus on underlying performance over last 5/10, including xG/xGA, goals, shots and eventually richer event metrics. Last-5 versus last-10 differences provide interpretable trend signals with sample-size confidence.

### Schedule / Fatigue
Rest days, matches in previous 7/14 days, congestion band, and later European/cup scheduling and travel.

Critical rule: both begin observationally with `model_effect_enabled=false`. We inspect distributions and predictive value before they are permitted to alter lambda/xPts.

## 12. Historical-data source decisions

### Football-Data.co.uk
Chosen as the first free structured adapter for historical EPL results, fixture dates, home/away context, goals and shots. It does not provide xG, so xG must remain null rather than being fabricated.

### xG adapter
An Understat-style adapter was added as the primary free xG route, with fallback handling. Team aliases, schema validation, impossible-xG rejection, invalid-date rejection, unmatched-team reporting and provenance are required.

### Duplicate-source problem
Football-Data and xG providers can represent the same real match. Naively inserting both and then calculating last-5/10 would double-count matches and distort fatigue.

Resolution:
- preserve raw source records separately;
- enforce source/match/team idempotency;
- canonicalize overlapping records by team + match date for feature calculations;
- combine complementary fields without counting the real match twice.

## 13. Betting edge roadmap

Once Layer 1 is verified:
1. De-vig bookmaker prices.
2. Compute market fair probabilities.
3. Compare model fair probability with market fair probability.
4. Calculate edge and expected value.
5. Classify NO BET / WATCH / EDGE / STRONG EDGE.
6. Track opening/current/closing prices.
7. Evaluate Closing Line Value as a core long-run metric.
8. Validate each intelligence signal family out of sample.
9. Only validated signals may adjust lambdas/score distributions.

The goal is not raw hit rate. A bet can lose and still have been a good decision if it consistently beats the closing market and had positive expected value at placement.

## 14. Rejected approaches

Do not:
- blanket-uplift projections to resemble Opta/external models;
- treat any one external model as ground truth;
- rewrite historical predictions after seeing outcomes;
- treat positive FPL error as failure;
- display missing values as zero;
- fabricate unavailable xG;
- use simple recent W/D/L as sufficient form;
- use H2H without contextual justification;
- allow unvalidated intelligence signals to change model outputs;
- call a probability pick a value bet without bookmaker comparison;
- evaluate betting quality solely on win rate;
- silently double-count the same historical match from multiple providers.

## 15. Supabase connector debugging history

A long ChatGPT development conversation developed a repeatable Supabase tool failure:
- tool discovery succeeded and exposed `execute_sql`;
- the first invocation then disabled the Supabase tool for that conversation.

Diagnostics attempted:
- refresh/reconnect;
- branched conversation;
- clean/fresh conversation;
- plugin uninstall/reinstall investigation;
- different VPN;
- native Android app vs Samsung Browser desktop mode.

Important observations:
- plugin-management layers at one point contradicted each other: directory reported Supabase installed/enabled while another resolver reported `not_installed`;
- reinstall did not cure affected conversation state;
- changing VPN did not cure affected conversation state;
- Samsung Browser desktop mode failed identically in the affected conversation;
- a completely fresh, non-branched conversation successfully executed **5/5 sequential `execute_sql` calls** without the connector disabling.

Current conclusion: the Supabase project and connector are fundamentally healthy; the failure is strongly associated with stale/corrupted conversation/tool runtime state. For Supabase-heavy development, use a fresh non-branched conversation and verify repeated execution before beginning work. If failure recurs, preserve the exact reproduction sequence for OpenAI support rather than modifying the database/project.

## 16. Implementation discipline learned from connector incident

Do not say work is being implemented when only a plan has been described. Distinguish clearly among:
- planned
- coded in GitHub
- committed
- deployed
- executed
- verified against production data

When an execution connector fails, continue independent coding where useful, but never represent repository code as deployed database state.

For connector diagnosis, isolate variables systematically rather than repeatedly retrying the same environment. A fresh-conversation sequential-call diagnostic should be used early when discovery succeeds but invocation fails.

## 17. Current handover relationship

Read these files together:

- `PROJECT_STATE.md` — current operational truth, architecture and next-action queue.
- `DECISIONS_AND_HISTORY.md` — rationale, historical decisions, rejected approaches, regressions and lessons.

A future conversation must inspect GitHub and Supabase directly before execution because repository/database state may have advanced beyond these documents.
