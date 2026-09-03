# C0197 — Zero-Cost Data Source Plan

Date: 2026-09-03
Status: Research plan for review — no model implementation
Parent: C0197
Constraint: **Zero subscription / zero paid data providers**

## Decision

Per user direction on 2026-09-03, C0197 must be designed to work with free sources only. The prior paid-provider procurement recommendation in `C0197_DATA_SOURCE_RESEARCH_20260903.md` is superseded for C0197 planning purposes, but that research record is preserved unchanged.

No Sportmonks, Opta, Hudl/StatsBomb commercial feed, Sportradar, API-Football paid tier, or other subscription data source is required by the revised plan.

C0197 remains research-only with `model_effect_enabled=false`. Historical forecasts remain immutable. C0198 remains deferred. C0176 root cutover is unrelated and must not be touched.

## Core principle

The free-only solution will not pretend that every desirable field has a contracted live API. It will use a layered architecture:

1. **Automatable free core** for deterministic ingestion and chronology-safe feature construction.
2. **Derived features** built internally from free raw data instead of buying precomputed metrics.
3. **Public/manual validation sources** only where automated access is not legitimate or stable.
4. **Coverage-aware fallbacks**: missing data is NULL, never zero; a model variant falls back to a lower-dimensional feature block when a required current observation is unavailable.

## Live production-state findings

Independent Supabase inspection on 2026-09-03 found that the existing zero-cost stack already contains more C0197 coverage than the earlier source matrix assumed.

### Current team match data

`public.team_match_intelligence`, source `fpl_core_insights_premier_league`, already carries current EPL match fields including:

- xG and non-penalty xG;
- xGOT;
- total shots and shots on target;
- shots inside/outside box, blocked/off-target shots;
- Big Chances;
- **Big Chances Missed**;
- keeper saves;
- open-play and set-play xG;
- possession and box touches;
- provider match identity / FotMob ID in raw provenance.

### Current player match schema

`public.player_matches` already supports:

- minutes and starter flag;
- xG / xA / xGI / xGOT;
- shots / shots in box / SOT;
- Big Chances / Big Chances Created / **Big Chances Missed**;
- goals / assists;
- goalkeeper post-shot fields in raw data (`xgot_faced`, `goals_prevented`).

Current live coverage is incomplete for some advanced player fields, so the free-only plan must preserve a coverage gate rather than convert blanks to zero.

### Historical player feature prior

`public.historical_player_seasons` currently has 565 EPL player rows for 2025/26 with complete non-null coverage for every stored row on:

- starts and minutes;
- xG;
- xGOT;
- SOT;
- Big Chances;
- **Big Chances Missed**;
- penalties scored and missed.

This gives C0197 a genuine free historical player finishing/concentration prior immediately.

## Free-source matrix

| Source | Cost | Access / refresh | Useful C0197 fields | Identity / provenance | Role in C0197 | Limitations |
|---|---:|---|---|---|---|---|
| **Official FPL data** | Free | Current public FPL endpoints; already ingested by FIE | player identity, club, price/status/news, minutes, starts, xG/xA/xGI, set-piece/penalty order fields exposed by FPL | strongest player identity anchor; stable FPL IDs | **Automated core** for identities, availability, minutes/start history, penalty/set-piece priors | no direct BCM/xGOT/SOT event feed; public API is not a contractual SLA |
| **olbauday/FPL-Core-Insights** | Free | Public GitHub CSV; README states twice-daily refresh and explicitly permits reuse | current/historical team xG/xGA, shots/SOT, xGOT, BC/BCM; player match xG/xA/xGOT/SOT/BCM, minutes, penalties; shot-level outcome/situation/body part/xG/xGOT/coordinates; cup/Europe minutes | FPL-linked IDs plus match IDs; pin repository commit SHA per capture | **Primary free advanced-stat research feed** and raw material for internal eSOT/scorer features | no formal commercial SLA; upstream provenance is non-contractual; promotion must preserve provenance/risk flag |
| **football-data.co.uk** | Free | Downloadable CSV; current 2026/27 + deep archive | results, team shots/SOT, cards/corners, market odds; long-run total-goal distribution | team/date identity; FIE already ingests it | **Stable team baseline / long-history tail prior / independent SOT check** | no player stats, xGOT or BCM; identity requires deterministic team/date map |
| **Understat (existing FIE integration)** | Free/unofficial | post-match; already stored | match/team xG/xGA and player xG histories | source match/team mapping already exists in FIE | **Independent xG cross-check and historical process layer** | unofficial access; no BCM/xGOT/contracted SLA |
| **PremierLeague.com public Stats Centre** | Free public viewing | official site; player stats documented back to 2006/07 for shots, SOT and BCM | player/team shots, SOT, Big Chances Missed, penalties and other official stats | official league names/season filters | **Manual/reconciliation validation** and selected historical spot checks | no approved unattended ingestion contract established; do not make it a required automated dependency |
| **FotMob direct public/consumer surfaces** | Free viewing | near-live, but current terms prohibit systematic automated use | rich xG/xGOT/BC/BCM and physical/tactical fields | provider IDs and URLs; existing C0139 research observations preserve hashes/timestamps | **Preserve existing research observations / manual validation only** | **do not expand automated collection** under current terms |
| **SofaScore public surface** | Free viewing | production runtime probe returned HTTP 403 | potentially useful lineups/events | — | **Excluded from operational plan** | blocked from unattended Supabase runtime |
| **Existing FIE odds observations** | already operational | frequent pre-match captures | team/player SOT markets, GK saves, anytime scorer, totals/exact score | source_timestamp + captured_at already stored | **Research cross-signal / calibration check only** | market-derived information is not observed football performance and cannot replace missing actual stats |

## Why FPL-Core-Insights materially changes the free-only feasibility

The public 2026/27 repository now exposes tournament/gameweek-specific files including `matches.csv`, `playermatchstats.csv`, `shots.csv`, `xg_by_minute.csv`, and player snapshots.

The current EPL `matches.csv` schema includes directly:

- team xG;
- shots / SOT;
- Big Chances;
- **Big Chances Missed**;
- non-penalty xG;
- open-play / set-play xG;
- xGOT;
- keeper saves.

The current EPL `playermatchstats.csv` schema includes:

- minutes;
- total shots;
- xG / xA;
- SOT;
- **Big Chances Missed**;
- xGOT;
- xGOT faced;
- goals prevented;
- penalties scored / missed;
- physical load fields where published.

The current EPL `shots.csv` is even more important for C0197 because each shot exposes:

- minute;
- player ID;
- outcome;
- situation;
- body part;
- xG;
- xGOT where applicable;
- start coordinates;
- goal-mouth coordinates.

Therefore C0197 does not need to purchase an “expected SOT” metric: we can estimate it ourselves from shot-level data.

## Revised feature architecture

### 1. Football Chaos Model

Build chronology-safe pre-match rolling features from finished matches only.

Core team features:

- rolling xG for / xGA;
- rolling goals-minus-xG residual and residual variance;
- shots / SOT for and against;
- xG per shot;
- SOT per shot;
- xGOT minus xG;
- Big Chances created / conceded;
- **Big Chances Missed**;
- high-quality-shot share;
- box-shot share / touches in box;
- goalkeeper xGOT-faced versus goals conceded where available;
- recent total-goal dispersion and high-tail frequency;
- venue/opponent-strength controls already available in FIE.

The model should estimate a **chaos / overdispersion regime probability**, not simply add a positive goal adjustment whenever recent scores were high.

Do not use the target fixture's post-match data. Every rolling statistic must use source matches with kickoff strictly before the target evidence cutoff.

### 2. Expected SOT vs xG Divergence

Instead of buying expected-SOT data, train an internal shot-on-target probability model from free shot events.

For each historical shot estimate:

`P(SOT | xG, situation, body part, shot location, player/team shrinkage)`

Then define:

- `eSOT_team = sum(P(SOT) over eligible prior shots)`;
- `SOT_residual_team = observed_SOT - eSOT_team`;
- equivalent opponent defensive residuals;
- player `eSOT`, observed SOT and residuals where sample is sufficient.

Use cross-validation and hierarchical shrinkage. A high observed SOT rate from a tiny sample must not be treated as a permanent finishing skill.

xGOT provides a second independent post-shot quality signal where available:

- `post_shot_lift = xGOT - xG`;
- goalkeeper post-shot residual = `xGOT_faced - goals_conceded` or the provider's goals-prevented field after semantic reconciliation.

### 3. Scorer Concentration Model

Allocate the team scoring intensity across likely players using a coverage-aware concentration prior.

Candidate player features:

- share of team xG;
- share of team eSOT and observed SOT;
- share of team xGOT;
- share of Big Chances where available;
- **Big Chances Missed** historical/current rate;
- goals-minus-xG and xGOT-minus-xG finishing residuals;
- penalty probability;
- minutes/start probability;
- role and position;
- opponent defensive profile.

Outputs required by C0197:

- anytime scorer probability;
- 2+ goals / brace probability;
- 3+ goals / hat-trick probability;
- concentration / entropy of team scoring probability;
- downstream FPL haul probabilities after independent validation.

### 4. Big Chances Missed — required feature contract

BCM stays mandatory at **team and player level**, but “required” does not mean “invent a fresh value for every row.”

**Team BCM**
- current primary: FPL-Core-Insights match data already exposes home/away BCM;
- historical: ingest/reconcile free historical FPL-Core-Insights seasons where available;
- validation: official Premier League Stats Centre.

**Player BCM**
- historical prior: `historical_player_seasons` already has full 2025/26 coverage;
- current source: FPL-Core-Insights player-match BCM when genuinely populated;
- if the source field is blank/unavailable, preserve NULL and use the last chronology-safe historical/rolling prior with an explicit age/coverage flag;
- do **not** convert a blank provider field to zero until source semantics prove blank means zero;
- official Premier League public BCM rankings can be used for periodic reconciliation/validation, not as a hidden automated dependency.

Required diagnostics:

- player BCM sum vs team BCM per match where both are present;
- missing-vs-zero semantic audit;
- penalty inclusion/exclusion audit;
- whether saved/off-target/blocked big chances are counted consistently.

### 5. Predicted XI / expected minutes without a paid provider

C0197 does not need a purchased “predicted XI” feed. FIE should predict start probability internally.

Free pre-match inputs:

- official FPL current status/news/chance-of-playing fields;
- official FPL starts/minutes history;
- recent EPL starts/minutes from FPL-Core-Insights;
- cup/European/friendly minutes from FPL-Core-Insights;
- rest days and congestion from the existing fixture schedule;
- existing `player_role_intelligence` / set-piece / penalty evidence;
- chronology-safe manager/club press-conference and official injury evidence when manually curated.

Suggested internal outputs:

- `p_start`;
- `xmins_if_start`;
- `xmins_if_bench`;
- total `xMins`;
- predicted XI = top feasible role-consistent starters, with uncertainty retained rather than forced certainty.

The model must be trained only on information that would have been available before the historical target deadline. Actual historical lineups cannot be backfilled as if they were prior predictions.

### 6. Penalties / finishing indicators

Free penalty hierarchy:

- official FPL penalty-order field where present;
- historical/current penalties scored and missed from free player data;
- existing `player_role_intelligence.penalty_rank` when chronology-safe;
- manual official manager/club evidence where needed.

Derived finishing indicators:

- goals minus xG;
- non-penalty goals minus npxG;
- xGOT minus xG;
- goals / SOT;
- SOT residual vs internally modeled eSOT;
- BCM per Big Chance / per xG opportunity;
- penalty-adjusted finishing residual;
- shrink all player rates by minutes/shots/opportunities.

## Historical-depth strategy

A free-only build has enough history for research, but the rich fields have less depth than scores/results.

Use two horizons rather than pretending all features go back equally far:

### Long-tail prior

Use football-data.co.uk's deep free results archive to estimate unconditional and context-adjusted frequencies for:

- 4+ goals;
- 5+ goals;
- 6+ goals;
- 7+ goals;
- scoreline/tail dispersion by era and team-strength mismatch.

This provides statistical support for rare tails without fabricating old xG/BCM fields.

### Rich-feature era

Use chronology-safe FPL-Core-Insights / Understat / existing FIE data for the period where xG, shots/SOT, xGOT, BC/BCM and player detail genuinely exist.

Never backfill missing advanced fields from final results.

## Source hierarchy by required field

| Required field | Primary free source | Secondary / check | Fallback behavior |
|---|---|---|---|
| Team xG/xGA | FPL-Core-Insights | existing Understat | base FIE xG process if absent |
| Team shots/SOT | FPL-Core-Insights | football-data.co.uk | omit SOT block if unavailable |
| Team xGOT | FPL-Core-Insights | shot-level xGOT aggregation | NULL if unavailable |
| Team BC/BCM | FPL-Core-Insights | PremierLeague.com manual check | feature block unavailable, never zero-filled |
| Player xG | official FPL + FPL-Core-Insights | existing historical player data | shrunk historical prior |
| Player shots/SOT | FPL-Core-Insights | PremierLeague.com manual check | player concentration uses xG/minutes only if unavailable |
| Player xGOT | FPL-Core-Insights | shot-level xGOT aggregation | NULL / historical prior |
| Player BCM | FPL-Core-Insights + stored 2025/26 prior | PremierLeague.com manual check | chronology-safe prior with age flag; never zero-filled |
| Minutes/starts | official FPL | FPL-Core-Insights | unavailable player excluded from concentration allocation |
| Predicted XI | **internal FIE p_start/xMins model** | manual official team news / manager press | retain uncertainty; no forced XI |
| Penalties | official FPL order + actual free history | player_role_intelligence / official news | shrink to team prior |
| GK post-shot quality | FPL-Core-Insights xGOT faced/goals prevented | shot-level xGOT | NULL if insufficient |
| Deep score/tail history | football-data.co.uk | FIE results archive | current Poisson baseline |

## Chronology and provenance contract

Every C0197 input snapshot must record:

- target fixture and kickoff;
- evidence cutoff;
- source key;
- source match/player ID;
- source URL/path;
- source file commit SHA where GitHub-backed;
- captured_at;
- raw/file hash where practical;
- missingness state;
- whether the field is direct, derived or prior-carried;
- `actual_data_used`;
- `model_effect_enabled=false` during research.

For mutable GitHub data, pin the exact commit SHA used in each research snapshot so a future repository update cannot silently rewrite the training evidence.

## Coverage-aware model variants

The free-only implementation must not demand that every fixture has every feature.

Run and compare:

1. **Baseline** — current independent Poisson / current selector.
2. **Chaos-only** — team feature block.
3. **Chaos + eSOT** — only when the SOT/shot feature block is chronology-safe.
4. **Chaos + eSOT + Scorer** — only when the player concentration block has adequate coverage.

Evaluation must include:

- all-eligible fixtures for each model;
- **common-coverage subset** across variants to avoid winning by sample selection;
- missingness/coverage by source and season;
- sensitivity to player-BCM removal;
- sensitivity to xGOT removal;
- sensitivity to predicted-start uncertainty.

If the recommendation changes under reasonable missingness assumptions, classify it as no meaningful edge.

## Promotion gates under the free-only constraint

No C0197 feature reaches production merely because the source is free and the backtest is positive.

Promotion requires:

1. chronology-safe walk-forward improvement over the current model;
2. robust multi-GW / multi-fold gains beyond normal model error;
3. tail calibration improvement for P(4+), P(5+), P(6+), P(7+);
4. exact-score log-loss/RPS/top-k improvement;
5. scorer/brace/hat-trick calibration improvement for the scorer model;
6. coverage/missingness stability;
7. source provenance that is acceptable for ongoing FIE use;
8. no dependence on direct systematic FotMob automation under current FotMob terms;
9. no historical forecast rewrites.

If the free data cannot satisfy those gates, C0197 remains research-only rather than introducing a paid provider by stealth.

## Immediate next implementation sequence — only after user approves this revised plan

1. Audit `FPL-Core-Insights` 2024/25, 2025/26 and current 2026/27 file coverage by field and match; pin commit hashes.
2. Repair/extend FIE ingestion so current free player-match BCM/xGOT/SOT and shot-event rows are captured with explicit missingness semantics.
3. Add the zero-cost feature snapshot schema with append-only provenance.
4. Build the internally derived eSOT model from free shot events.
5. Build Chaos-only shadow model.
6. Build Chaos+eSOT shadow model.
7. Build internal p_start/xMins feature and scorer-concentration shadow model.
8. Run chronology-safe walk-forward ablations and tail/scorer calibration.
9. Return results for review before any production promotion.

## Final recommendation

**Proceed with C0197 using only the zero-cost stack.**

The free architecture is technically sufficient to test all three approved C0197 components. The biggest remaining constraints are not missing paid APIs; they are:

- current player-level advanced-stat completeness;
- upstream provenance/access stability;
- predicted-start uncertainty;
- limited rich-feature history for rare extreme tails.

Those constraints should be handled with explicit coverage flags, hierarchical shrinkage, common-coverage evaluation and delayed promotion — not by buying a provider or inventing data.
