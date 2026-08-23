# Football Intelligence Engine — Decisions & History

_Last updated: 2026-08-23_

This file preserves the reasoning, rejected approaches, debugging lessons and implementation decisions that are easy to lose between conversations. `PROJECT_STATE.md` is the operational source of truth; this file explains why the project reached that state.

## 1. Product objective

The engine has two linked objectives:
1. maximize FPL decision quality across the season;
2. find betting-market mispricing by identifying contextual information and interactions that may not be fully priced.

The betting objective is not to build another bookmaker. The intended behavior is the scalable equivalent of strong manual value research: form, tactics, personnel, injuries, replacement quality, fatigue, schedule, competition priority, attack/defence channel mismatches and market comparison.

## 2. FPL decision philosophy

Every serious weekly decision starts by projecting all 15 players. Do not anchor to the previous XI or bench.

For all 15 estimate at minimum xMin, xPts, P(blank), P(5+), P(10+), P(15+) and P(20+). Captaincy uses the full haul distribution rather than mean xPts alone. Defensive Contributions remain a permanent component of both xPts and captaincy models.

## 3. GW1 construction reasoning

GW1 was built for value rather than automatically buying the most expensive/highly owned players. Important examples included retaining O'Reilly after correcting a misleading season-total interpretation, preferring Maguire over a more uncertain United RB route, Bruno over Mbeumo for captaincy because of penalties/return routes/minutes, and deliberately accepting no-Haaland structural risk to strengthen the wider squad.

These historical decisions remain frozen regardless of later model improvements.

## 4. Projection-model recalibration

The original fixture transform over-compressed elite/easy fixtures toward league average. The response was a structural recalibration, not a blanket uplift to mimic external models.

Model evolution:
- v0.1.1: over-compressed fixture strength;
- v0.1.2: normalized multiplicative matchup strength;
- v0.1.2b: starter minutes/P(start), penalties, latent BPS/bonus, opponent-adjusted DC;
- v0.1.3: uses v0.1.2 player state and overlays manually researched role intelligence.

External models are calibration references, not truth.

## 5. Frozen forecasts and append-only history

For FPL and betting:
- preserve what was genuinely predicted at decision time;
- never overwrite after kickoff/results;
- later model versions may create clearly labelled shadow/research reruns;
- fixture intelligence may evolve only before kickoff;
- hard-freeze at kickoff;
- evidence carries captured/known-at timestamps.

## 6. Prediction-vs-actual audit semantics

Unexpected upside is not model failure for the decision objective.

Final downside tolerance:
`max(1, round_half_up(0.20 * xPts))`.

Green if actual >= predicted or downside is within tolerance. Red only when actual undershoots by more than tolerance.

## 7. Dashboard lessons

Important regressions established permanent rules:
- mobile tables must remain width-contained;
- player-modal lookup must search all relevant datasets safely;
- API schema evolution must not cause undefined `.toFixed()` crashes;
- missing numerical data displays `—`/No data, never fake zero;
- backend health is not proof of browser rendering.

## 8. Fixture / Correct Score architecture

Fixture model maintains lambdas, scoreline matrix, ranked scores, 1X2, BTTS, totals, clean-sheet probabilities and confidence. Forecast history should eventually expose probability/lambda movement and evidence.

A likely score is not automatically a value bet; value requires bookmaker comparison.

## 9. Bookmaker Layer 1

Odds-API.io was selected as the primary Correct Score feed after live testing. Raw snapshots are append-only. Provider event mapping uses teams + kickoff, not weak fuzzy matching alone. Current reads use latest valid pre-kickoff snapshot per fixture/bookmaker source, while old snapshots remain for movement/CLV.

Missing current markets are not silently filled from stale snapshots.

## 10. Mispricing Intelligence concept

Candidate signal families include underlying form, home/away context, tactics, manager behavior, expected XI, injuries/suspensions, replacement quality, congestion, cup/European priorities, travel, pressing vs buildup, line height vs pace, wing/central channel mismatch, aerial/set pieces, goalkeeper performance and material weather/pitch effects.

H2H is useful only when the underlying personnel/tactical context persists.

## 11. First observational signal families

Recent Performance and Schedule/Fatigue were deliberately introduced as observational features with `model_effect_enabled=false`. Their predictive value must be validated before lambda/xPts effects are permitted.

## 12. Historical-data source decisions

Football-Data supplies free structured results/shots but no xG, so xG remains NULL. Understat supplies the xG layer. Different providers representing the same real match remain separate raw records but are canonicalized for feature calculations so one match is not counted twice.

## 13. Betting edge roadmap

Layer 1 verification precedes de-vig/EV. Long-run quality is judged by calibration, EV and CLV rather than raw hit rate. Recommendation labels remain disabled until forward validation.

## 14. Rejected approaches

Do not:
- uplift projections merely to resemble an external source;
- treat an external model as ground truth;
- rewrite forecasts after outcomes;
- show missing data as zero;
- fabricate unavailable xG;
- rely on recent W/D/L as sufficient form;
- use H2H without contextual justification;
- allow unvalidated intelligence to affect models;
- call a probability pick a value bet without market comparison;
- evaluate betting quality solely by win rate;
- double-count the same match across providers.

## 15. Supabase connector incident

A previous long conversation developed a corrupted connector runtime: discovery succeeded but execution disabled after the first call. Reconnects, VPN changes and browser/app variants did not fix that conversation state. A completely fresh conversation later executed 5/5 sequential SQL calls successfully.

Operational lesson: when connector behavior is suspect, isolate the runtime before changing the project. Distinguish planned, coded, committed, deployed, executed and verified.

## 16. Latest-snapshot bookmaker semantics

For live/current API reads, only the latest valid pre-kickoff raw snapshot per fixture + raw bookmaker source is authoritative. Historical snapshots remain available for movement/CLV. This prevents a disappeared market from being silently resurrected from older data.

## 17. Correct Score offered-set de-vig

Exact-score books can omit extreme outcomes. Therefore bookmaker fair probability is conditional on the offered set. The model stores both raw/unconditional probability and offered-set conditional probability.

`conditional_edge` compares conditional vs conditional.
Actual wager EV remains:
`EV = P_model_raw * decimal_odds - 1`.

## 18. Two de-vig methods

Proportional de-vig is retained as an interpretable baseline and power de-vig as a second method because high-margin many-outcome markets can exhibit favorite/longshot bias. Methods remain separate rather than averaged opaquely.

## 19. Research edge is not a recommendation

Statuses such as `ROBUST_POSITIVE_EV` organize research evidence only. `value_edge_available=false` remains in force until sufficient forward validation/calibration/CLV evidence exists.

## 20. Edge-generation timeout lesson

The first automatic edge hook timed out because the power exponent was repeatedly solved across a broad GW scope. Layer 1 odds ingestion remained valid and independent. Snapshot-scoped generation/materialized intermediate sets fixed the issue.

## 21. Security findings remain separate from model work

New intelligence objects are hardened immediately. Legacy public objects with broad grants/RLS issues are not blindly changed until direct client dependencies are mapped. Security cleanup must not be mixed with model experiments in a way that obscures regressions.

## 22. Expected XI / Availability design

Official FPL availability/status/news and the latest P(start)/xMin state are sufficient to create an observational candidate-XI layer without pretending to possess full tactical lineup knowledge.

Candidate shapes such as 4-5-1 are FPL-valid selection shapes only, not tactical formation predictions. Replacement quality was explicitly deferred rather than inferred from simple positional rank.

## 23. Current-season player-state lineage

v0.1.3 does not own a separate `player_state` dataset; it intentionally consumes the v0.1.2 state layer plus manual role intelligence. Current-season state evidence therefore appends under v0.1.2. Relabelling it as v0.1.3 would be false lineage.

Completed-match starts/minutes/xG/xA may influence future state only. Defensive-action priors are not replaced by non-equivalent official FPL fields.

## 24. Automated Role Intelligence is an archetype model, not positional tracking

The new automated Role Intelligence layer deliberately classifies **event-profile archetypes**, not asserted exact tactical positions.

Why: the current rich source provides detailed events but not reliable per-player x/y positional tracking or exact formation-role labels. Calling an event signature an exact inverted FB, half-space 8, etc. would create false precision.

Current broad taxonomy:
- DEF: CENTRE_BACK / WIDE_BACK / HYBRID_DEFENDER;
- MID: HOLDING_MIDFIELDER / BOX_TO_BOX / CREATOR_10 / WIDE_ATTACKER;
- FWD: CENTRAL_STRIKER / LINK_FORWARD / WIDE_FORWARD / TARGET_FORWARD.

FPL position is currently a guardrail only. This is a known limitation, especially for players whose FPL listing differs from their tactical function.

## 25. `UNRESOLVED` is a correct output

The engine must prefer uncertainty to false certainty.

Role profile rules therefore intentionally produce `UNRESOLVED` when weighted evidence is thin or no archetype separates meaningfully from alternatives. Confidence rises with weighted minutes, competitive evidence and separation between the top two archetype scores.

The first production audit had 406 profiles but 371 UNRESOLVED and zero >=0.75 confidence. This was accepted as healthy conservative behavior, not a reason to lower thresholds artificially.

## 26. Competitive evidence outranks preseason evidence

Role profiles blend rich current-season competitive events with preseason/friendly evidence, but at different weights:
- Premier League = 1.0;
- friendlies = 0.3.

The competitive importer also requires `player_stats_processed=true` before accepting player-event rows. Partial upstream data is skipped rather than converted into zeros.

As more competitive matches become fully processed, the same append-only profile engine can evolve without retroactively altering prior fixture snapshots.

## 27. Manual role research remains separate from automated role profiles

The existing manually researched Bruno/Isak `player_role_intelligence` rows were not overwritten or merged silently with the new automated profile table. v0.1.3 continues to consume the existing manual layer exactly as before.

Reason: the automated archetypes are not yet validated enough to become model effects. Research evidence and active model inputs must remain distinguishable.

## 28. Team tactics are modeled as orthogonal axes, not a guessed formation

The team layer stores multiple style dimensions:
- possession control;
- directness;
- width/delivery;
- attacking box occupation;
- set-piece emphasis;
- defensive-block tendency.

A dominant style label is an organizational summary of those axes, not an asserted formation, manager instruction or full tactical identity.

This avoids compressing a team into one simplistic label and allows future interaction modeling to use the individual axes directly.

## 29. Box occupation is not pressing

The first taxonomy called the attacking-box axis `HIGH_BOX_PRESSURE`. That wording was rejected because it could be misread as defensive pressing intensity.

The correction is append-only:
- taxonomy `team_style_v0.1.1`;
- dominant label `HIGH_BOX_OCCUPATION`;
- evidence explicitly states the existing `box_pressure_score` column measures attacking box occupation/pressure, **not defensive pressing**.

True pressing-vs-buildup intelligence remains a future, separate feature family.

## 30. Fixture Role/Tactical snapshots obey the same chronology law as odds

Learned player/team profiles can update after completed matches, but a fixture decision-state role/tactical snapshot may only use evidence whose cutoff is before that fixture's kickoff. Fixture snapshot tables have database-level kickoff guards.

Validated invariants:
- zero post-kickoff player-role snapshots;
- zero post-kickoff team-tactical snapshots;
- zero fixture snapshots using profile evidence with cutoff at/after kickoff;
- deliberate post-kickoff guard test persisted zero rows.

This is essential because a correct tactical model built with hindsight would still be invalid decision intelligence.

## 31. Replacement quality remains gated by role calibration

The new role layer is useful enough for research but not reliable enough to determine every true replacement path. Cross-listed roles remain the main weakness.

Replacement quality stays disabled until:
1. stronger historical/positional-zone role priors exist;
2. automated roles are validated against actual lineups/functions over forward fixtures;
3. role-distance between absent player and likely replacement is defined;
4. only then is replacement player quality/tactical consequence estimated.

Do not shortcut this by comparing FPL positions or simple rank.

## 32. Role/Tactical debugging lessons

Three implementation failures produced useful architecture rules:

1. Null preseason team IDs were accidentally coerced to numeric 0 in the first JS generator and hit an FK. Fix: require canonical team joins and never coerce missing IDs to zero.
2. A SQL refresh joined on nullable feature columns and silently produced zero refreshed profiles. Fix: join role aggregates by stable player identity, not nullable metric equality.
3. An ambiguous `kickoff_time` reference caused the first decomposed fixture-role call to fail. Fix: name fixture chronology fields explicitly (`fixture_kickoff`) at boundaries.

No corrupted historical forecast was written by any of these failures.

## 33. Current Role/Tactical orchestration decision

The Edge Function is intentionally thin. The production v3 orchestrator authenticates, then calls four database RPCs in order:
1. refresh player role profiles;
2. refresh team tactical profiles;
3. snapshot player fixture roles;
4. snapshot team fixture tactics.

This is preferred to embedding the full heuristic model in Edge code because SQL-side computation gives clearer idempotency, easier chronology enforcement and better failure diagnosis.

The rich source is ingested twice daily, then Role/Tactical profiles refresh twenty minutes later. All outputs remain `model_effect_enabled=false`.
