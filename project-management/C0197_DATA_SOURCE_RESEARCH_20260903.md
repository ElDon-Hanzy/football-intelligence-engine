# C0197 — Data Source Research and Procurement Plan

Date: 2026-09-03
Status: Research complete for user review; implementation not started
Change: C0197 — High-score chaos + SOT divergence + scorer concentration model

## Scope guardrails

This document covers source research only for the already-approved C0197 research stack:

1. Football Chaos Model.
2. Expected SOT vs xG divergence.
3. Scorer Concentration Model.
4. Big Chances Missed (BCM) is mandatory at both team and player level.

C0198 remains deferred. This research does **not** authorize or implement a game-state simulator or full bookmaker market-tail model. C0176 root cutover is out of scope. Historical forecasts remain immutable.

## Production-state reconciliation before source research

Live Supabase was inspected independently rather than trusting the handover.

- `public.change_tracker_working`: C0196 = In Progress / Executing; C0197 = Open / Planned; C0198 = Open / Planned; C0176 = Open / Planned.
- `private.audit_change_tracker_governance_v01()` returned `ok=true`, with no malformed IDs, no completed rows lacking verification, no completed rows lacking refs, and no decision rows lacking refs.
- Current FotMob research observations contain physical/recovery metrics only; they do not currently contain the xG/SOT/xGOT/BC/BCM feature family required by C0197.
- Existing production/research stores already contain useful partial coverage from Understat, football-data.co.uk, FPL/core-insights and the odds layer, but no existing source closes the full required C0197 field set.

## Required feature set

### Team / fixture
- xG / xGA
- shots / shots on target
- xGOT / post-shot quality
- big chances created
- big chances conceded (can be derived from opponent big chances created when fixture identity is reliable)
- big chances missed
- goalkeeper post-shot quality / expected goals prevented or equivalent

### Player
- xG
- shots / shots on target
- big chances created
- big chances missed
- minutes
- starts / lineup history
- predicted XI before kickoff
- penalties / penalty involvement
- finishing indicators derived from goals, xG, xGOT, SOT, BCM and conversion

### Identity / provenance
Every accepted production source must provide, or be wrapped with:
- stable provider fixture/team/player IDs;
- deterministic internal identity mapping;
- source timestamp where available;
- `captured_at` in FIE;
- source URL / endpoint and request manifest;
- raw payload hash;
- explicit chronology cutoff;
- append-only snapshot semantics for pre-match predictions such as predicted XI.

## Existing FIE inventory

### Team-match observed data

`public.team_match_intelligence` currently includes:
- football-data.co.uk: 2,554 team rows, strong basic shot/results depth from 2022-07-30 through 2026-08-31, no xG or big-chance coverage in the current normalized table;
- Understat: 1,250 team rows with xG coverage from 2024-08-16 through 2026-08-31, no normalized SOT / big-chance fields in the current table;
- official FPL / core-insights: small current-season samples only.

`public.matches` currently has sparse advanced current-season enrichment:
- FPL schedule rows do not carry xG/xGOT/BC;
- `fpl_core_insights` contains some xG, xGOT and big-chance values, but current coverage is too sparse to be the C0197 primary source.

### Research FotMob observations

Current `public.research_fotmob_metric_observations` keys are physical/recovery metrics such as sprints, total distance and possession won in the attacking third. There are currently no xG, xGOT, SOT, BC or BCM research observations.

### Existing odds layer

`public.odds_market_selections` already contains rich forward-market coverage, including:
- match totals / alternate totals / exact totals / correct score;
- total SOT and home/away SOT;
- player shots and player SOT;
- goalkeeper saves;
- anytime goalscorer and related player markets.

These are useful as **market cross-signals and validation targets only** under the current C0197 integrity rule. They are not a substitute for observed performance data and must not silently become production features.

## Source matrix

| Source | Cost | Historical depth | Update latency | Required-field coverage | Identity / provenance | Access stability / maintenance | Suitability |
|---|---|---|---|---|---|---|---|
| **Sportmonks Football API + xG + Expected Lineups** | Published self-serve pricing. Starter from ~€24/mo annual; Growth ~€79/mo annual. xG Basic €15/mo annual; Expected Lineups €159/mo annual and requires Growth/Pro. Minimum all-in route with Expected Lineups is therefore roughly €253+/mo on annual billing before VAT. | Core historical depth varies by competition. xG explicitly available from 2024 onward. Paid historical backfill available. | Core/live API supports frequent incremental updates; xG Advanced updates within ~5 minutes live. Expected XI updates as team news evolves. | **Very strong.** Team shots/SOT, BC created, BCM; player shots/SOT, BC created, BCM, minutes; team + player xG and xGOT; xGA; shooting performance; expected goals prevented; lineups; explicit predicted XI. Big chances conceded can be derived from opponent creation. | Same IDs connect expected lineups to fixture/team/player resources. Versioned REST/JSON API; caching/local storage is explicitly documented. Need to confirm exact source timestamps and commercial storage/derived-feature rights in subscription terms. | Self-serve, documented, versioned, published rate limits and production guidance. Lowest maintenance among affordable candidates. | **Rank 1 practical candidate** for C0197 trial/proof. Best field-to-cost fit found. |
| **Stats Perform / Opta Data Feeds** | Quote only / enterprise. | Deep proprietary historical database; exact EPL seasons and backfill price must be quoted. | Real-time structured feed; enterprise support. | **Very strong semantic fit.** Opta has globally consistent SOT and Big Chance definitions, xG and xGOT; xGOT explicitly supports shooter finishing and GK evaluation. Event feed should support team/player aggregation. Exact BCM aggregation and predicted-XI product must be confirmed in sample/contract. | Enterprise-grade event IDs, real-time capture, historical store, strong provenance. | Very high stability, documentation/support; lowest source-risk but likely highest cost and procurement burden. | **Rank 1 quality / Rank 2 practical**. Preferred upgrade if Sportmonks history, rights or quality fail validation. |
| **Hudl StatsBomb** | Quote only / commercial license. | Current + historical commercial data; 3,400+ events per match across 300+ competitions; exact EPL historical entitlement must be quoted. | APIs plus new live feed; live xG and shot freeze frames available. | Excellent event/xG layer and player-location context. Strong for shots and chance quality. Exact C0197 xGOT/BCM/GK-post-shot/predicted-XI schema match was not proven in this audit and requires a sample. | Strong event-level identity, timestamps and API versioning; quality controlled by AI + expert correction. | Strong commercial stability; integration heavier than Sportmonks but robust. | **Enterprise alternative / deeper event research**, not first choice until exact BCM+xGOT fields are verified. |
| **Sportradar Soccer Extended** | Paid / quote or trial; no useful public EPL package price confirmed in this audit. | Broad professional coverage; exact EPL season depth is package-dependent. | Real-time feed; confirmed lineup endpoints support very low TTLs. | Strong shot/xG detail; extended schema includes xG involvement, shot locations and GK shots faced/saved. Exact BCM, xGOT-equivalent and pre-match predicted XI must be proven before selection. | Commercial provider IDs and structured endpoints; good operational provenance. | High stability, moderate integration burden. | **Procurement fallback** if Opta/Sportmonks fail specific requirements. |
| **API-Football / API-Sports** | $0 free 100 requests/day; $19/mo Pro 7,500/day; $29 Ultra 75k/day; $39 Mega 150k/day. | Historical access varies by competition/plan; free tier season-limited. | Fixtures/events ~15s; match/player stats ~1 min; official lineups generally 20–40 min pre-kickoff. | Good low-cost supplement: confirmed lineups, injuries, player minutes, shots/SOT, goals/assists, penalties and match statistics. **No evidence in this audit for xG/xGOT/BC/BCM**, so cannot be C0197 primary source. | Stable provider fixture/team/player IDs and timestamps; documented API. | Low cost and easy maintenance. | **Supplement only** for confirmed lineups, availability, player SOT/minutes/penalties if needed. |
| **Official FPL public endpoints** | Free. | Current season plus player history endpoints; field consistency across seasons is not contractually guaranteed. | Frequently updated during gameweeks; no formal SLA. | Useful current-EPL supplement for player identity, minutes, availability/FPL status and some Opta-derived fantasy metrics. Does not provide the full C0197 feature set or predicted XI. | Public but undocumented endpoints; FPL player IDs require cross-season mapping discipline. Capture time must be FIE-owned. | Historically popular and stable but unsupported/undocumented; schemas can change between seasons. | **Supplement / identity / FPL bridge**, not C0197 primary source. |
| **Understat** | Free public website; commonly accessed via unofficial scrapers/wrappers. | EPL xG/shot history available from 2014 onward in public community tooling; FIE already ingests xG. | Post-match; no contractual SLA. | Strong free historical xG, npxG and shot-level research. Does not close xGOT, BCM, predicted XI or stable production-feed requirements. | Understat IDs exist, but integration is unofficial; timestamps/provenance must be captured by FIE. | Fragile relative to a documented API; scraper maintenance risk. | **Historical research/backfill only**, especially for xG baselines and long-horizon ablations. |
| **football-data.co.uk** | Free CSV; optional partner API exists separately. | Season files back to 1993/94; opening/closing odds history also deep. FIE has basic team-match data from 2022 onward. | Batch/post-match; no live SLA. | Excellent cheap results/basic match-stat/odds backfill. No xG/xGOT/BC/BCM/player/predicted-XI layer. | Date/team-name oriented, so identity mapping burden is higher; row-level source timestamps are weak. | Very stable historically, but manual/file-oriented ingestion. | **Historical baseline / results / basic shots / odds support**, not primary advanced source. |
| **FotMob public web** | Free to view. | Multi-season pages exist, but field-by-field backfill completeness is not contractually specified. | Near-live public product behavior, but no feed contract. | Public pages prove **team and player Big Chances Missed**, xG, SOT and GK/finishing metrics exist in the product. | Provider IDs can be mapped, and FIE already has research capture/hash plumbing. However public pages do not provide a production data contract. | **Not acceptable for automated production ingestion under current public terms:** FotMob explicitly prohibits robots/crawlers and other systematic or regular automated use. | **Manual/research-only evidence. Do not build C0197 production collection on FotMob scraping.** |
| **Existing FIE odds feed** | Existing project dependency / cost already incurred. | Current forward collection; historical depth depends on FIE archive. | Frequent pre-match refresh with provider source timestamps. | Rich SOT/saves/scorer/total-tail market information. It reflects market prices, not observed performance. | Strong internal provenance: provider, bookmaker, market, selection, line, source timestamp, capture timestamp. | Already operational. | **Research-only cross-signal / calibration benchmark** under C0197 integrity rules. |

## Feature-to-source assignment if Sportmonks passes the trial

| C0197 feature | Primary | Secondary / validation |
|---|---|---|
| Team xG / xGA | Sportmonks xG | Understat historical baseline; Opta if procured |
| Team shots / SOT | Sportmonks core fixture stats | football-data basic backfill; odds SOT only as market comparison |
| Team xGOT | Sportmonks xG | Opta xGOT benchmark if sample available |
| Big Chances Created | Sportmonks core stats | Opta event definition/sample |
| Big Chances Conceded | Opponent Sportmonks BC Created, same fixture | Cross-check aggregate consistency |
| **Big Chances Missed — team** | **Sportmonks BIG_CHANCES_MISSED** | FotMob manual research check only; Opta sample if available |
| GK post-shot quality | Sportmonks expected goals prevented + xGOT context | Opta xGOT faced / goals-vs-xGOT benchmark |
| Player xG | Sportmonks xG lineup/player stats | Understat historical; official FPL current supplement |
| Player SOT | Sportmonks core player stats | API-Football / odds player SOT comparison |
| Player Big Chances | Sportmonks player BC Created | Opta sample |
| **Big Chances Missed — player** | **Sportmonks BIG_CHANCES_MISSED** | FotMob manual research check only |
| Minutes / starts | Sportmonks lineups/player stats | Official FPL and API-Football reconciliation |
| Predicted XI | **Sportmonks Expected Lineups** | No retrospective substitution with actual XI |
| Penalty events / finishing | Sportmonks player stats + xG penalty metrics | API-Football event/penalty stats; FPL set-piece notes where appropriate |
| Finishing indicators | Derived in FIE from goals, xG, xGOT, SOT, BCM, shooting performance | Opta xGOT semantics benchmark |

## Why Sportmonks moves to the front of the practical shortlist

The key change from the earlier handover assumption is explicit field verification. Current Sportmonks documentation exposes:

- `BIG_CHANCES_CREATED` and **`BIG_CHANCES_MISSED`** for fixture/team statistics;
- **`BIG_CHANCES_MISSED`** for player statistics;
- team/player shots and SOT;
- player minutes;
- team and player xG;
- team and player xGOT;
- xGA, shooting performance and expected goals prevented;
- predicted starting XI, formation and bench candidates through Expected Lineups;
- one shared identity model across fixtures, teams and players.

That is the closest self-serve schema match to C0197 found in this audit.

The main drawback is historical advanced-metric depth: the provider states xG data is available from 2024 onward. This is enough for a meaningful recent-era walk-forward sample but is not deep enough to estimate rare 7+ tails in isolation with high confidence. The correct response is **not** to fabricate older BCM/xGOT values; use longer Understat/football-data baselines for lower-feature ablations and evaluate the full C0197 feature stack only where all required chronology-safe fields genuinely exist.

## Chronology-safe predicted-XI rule

Predicted XI is uniquely leakage-prone.

1. FIE must start capturing provider predicted-XI snapshots **prospectively** with provider update/capture timestamps and hard-freeze the usable snapshot at the model evidence cutoff.
2. Historical actual starting XIs must **not** be relabelled as historical predicted XIs.
3. If the provider cannot supply genuine historical prediction snapshots with original timestamps, predicted XI cannot be used in retrospective folds before FIE began capturing it.
4. Historical scorer-concentration folds can still use chronology-safe rolling minutes, starts, availability and prior player shares. Predicted XI becomes an incremental forward-era feature whose value must be validated separately.

## BCM semantic gate

BCM is mandatory and must not be reduced to a loose proxy.

Before implementation, the selected provider must demonstrate in an EPL sample:
- team BCM;
- player BCM;
- stable fixture/player IDs;
- whether BCM means a big chance not converted and how saved/off-target/blocked/no-shot events are treated;
- reconciliation between team BCM and player BCM totals;
- treatment of penalties;
- revision behavior after match correction.

This matters because providers can use different event semantics. For example, Opta separately defines a `Chance Missed` event as a big-chance opportunity where no shot is taken; that is not automatically identical to the consumer aggregate usually labelled `Big Chances Missed`. The production feature must use one documented semantic contract end to end.

## Recommended procurement / proof sequence

### Route A — recommended first

Run a **Sportmonks 14-day trial / schema proof** before writing any C0197 model code.

Proof dataset: current EPL plus at least a representative historical sample from 2024/25 and 2025/26.

Required proof:
1. Verify actual EPL coverage for every required team/player field.
2. Verify team and player BCM reconciliation.
3. Verify team/player xG and xGOT, xGA and expected-goals-prevented semantics.
4. Verify player minutes/starts and stable IDs across seasons.
5. Verify Expected Lineups availability for every upcoming EPL fixture and inspect update timestamps/revision behavior.
6. Verify historical advanced-stat completeness and missingness patterns; missing is never zero.
7. Confirm in writing the right to store raw responses/snapshots in Supabase and create proprietary derived model features.
8. Record rate limits, API version/change policy and any SLA/support commitment.

If all pass, this becomes the C0197 primary feed.

### Route B — quality/depth escalation

Request an **Opta EPL-only sample + quote** if any Sportmonks gate fails, especially:
- advanced-metric historical depth;
- BCM consistency;
- GK post-shot quality;
- timestamp/provenance needs;
- licensing/storage rights;
- data-quality reconciliation.

Ask Opta specifically for xG, xGOT, shots/SOT, Big Chance flags/aggregates, player/team BCM semantics, goalkeeper xGOT faced / goals prevented, lineups, and whether a predicted-XI product is available. If not, Sportmonks Expected Lineups can remain a separate pre-match source.

### Route C — alternative commercial benchmark

Use Hudl StatsBomb and/or Sportradar as competitive quotes/samples if Route A or B does not meet cost/coverage requirements. Neither should be selected without proving the exact BCM + xGOT/GK + predicted-XI contract required by C0197.

## Low-cost supplements retained regardless of primary source

- Understat: long-history xG / npxG research and ablation baselines.
- football-data.co.uk: deep results/basic-stat/odds backfill.
- official FPL: EPL player identity/current fantasy metrics/availability bridge.
- API-Football: low-cost confirmed lineup, injury, player SOT/minutes/penalty reconciliation if useful.
- existing odds feed: market cross-signal and calibration benchmark only.
- FotMob public web: manual/research verification only; no systematic automated ingestion.

## Source-plan decision proposed for user review

**Proposed C0197 source architecture:**

1. **Primary practical feed:** Sportmonks Football API + xG Basic initially; Growth + Expected Lineups if predicted-XI feed passes coverage checks.
2. **Enterprise benchmark / escalation:** Opta sample and quote, not an immediate purchase requirement.
3. **Historical low-feature backfill:** existing Understat + football-data.co.uk.
4. **Current EPL/FPL supplement:** official FPL.
5. **Optional cheap reconciliation:** API-Football.
6. **Market-only research:** existing FIE odds layer.
7. **No automated FotMob production scraping.**

No C0197 model implementation should begin until the user reviews this source plan and approves a procurement/trial route.

## Public evidence reviewed

Sportmonks:
- https://www.sportmonks.com/football-api/football-stats-api/
- https://www.sportmonks.com/football-api/xg-data/
- https://www.sportmonks.com/football-api/expected-lineups-api/
- https://www.sportmonks.com/football-api/plans-pricing/
- https://docs.sportmonks.com/v3/definitions/types/statistics/player-statistics
- https://docs.sportmonks.com/v3/definitions/types/statistics/fixture-statistics
- https://docs.sportmonks.com/v3/welcome/best-practices

Stats Perform / Opta:
- https://www.statsperform.com/products/opta-data-feeds/
- https://www.statsperform.com/insights/introducing-expected-goals-on-target-xgot/
- https://www.statsperform.com/opta-event-definitions/
- https://www.statsperform.com/products/opta-vision/

Hudl StatsBomb:
- https://www.hudl.com/products/statsbomb
- https://www.hudl.com/products/statsbomb/faq
- https://www.hudl.com/blog/introducing-live-football-data-by-hudl

Sportradar:
- https://developer.sportradar.com/soccer/page/soccer-extended-api-upcoming-stats

API-Football:
- https://www.api-football.com/pricing
- https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide

football-data.co.uk:
- https://www.football-data.co.uk/englandm.php
- https://www.football-data.co.uk/downloadm.php

FotMob:
- https://www.fotmob.com/leagues/47/stats/season/36781/teams/big_chance_missed_team/premier-league
- https://www.fotmob.com/leagues/47/stats/season/36781/players/big_chance_missed/premier-league
- FotMob Terms of Use as exposed on fotmob.com: automatic services (robots/crawlers/indexing) and other systematic or regular automated use are not permitted.

Understat historical-access evidence:
- https://github.com/ktconnolly/understat-xg
- https://github.com/ewenme/understatr

## No production changes in this research step

- No historical forecast was edited.
- No selector or tail behavior was changed.
- No C0197 model code was implemented.
- No C0198 work was started.
- C0176 was not touched.
