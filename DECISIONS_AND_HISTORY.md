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

Candidate shapes such as 4-5-1 are FPL-valid selection shapes only, not tactical formation predictions. Replacement quality was initially deferred rather than inferred from simple positional rank.

## 23. Current-season player-state lineage

v0.1.3 does not own a separate `player_state` dataset; it intentionally consumes the v0.1.2 state layer plus manual role intelligence. Current-season state evidence therefore appends under v0.1.2. Relabelling it as v0.1.3 would be false lineage.

Completed-match starts/minutes/xG/xA may influence future state only. Defensive-action priors are not replaced by non-equivalent official FPL fields.

## 24. Automated Role Intelligence is an archetype model, not positional tracking

Automated Role Intelligence classifies event-profile archetypes, not asserted exact tactical positions. The rich source provides detailed events but not reliable per-player x/y tracking or exact tactical labels. Calling an event signature an inverted FB, half-space 8, etc. would create false precision.

FPL position remains a broad family guardrail, not tactical truth.

## 25. `UNRESOLVED` is a correct output

The engine must prefer uncertainty to false certainty. A role remains `UNRESOLVED` when evidence, feature coverage or separation between plausible archetypes is insufficient.

Do not reduce thresholds simply because a familiar player's football role seems obvious to a human observer.

## 26. Competitive evidence outranks preseason evidence

Current competitive event evidence must progressively override preseason and historical priors. Partial upstream player data is skipped rather than converted into zeros.

This chronology allows future profiles to evolve without retroactively altering prior fixture snapshots.

## 27. Manual role research remains separate from automated role profiles

The manually researched Bruno/Isak `player_role_intelligence` rows are not silently merged into the automated training data. They can be used later as external validation evidence, but v0.1.3 active model inputs and automated observational research remain distinguishable.

## 28. Team tactics are modeled as orthogonal axes, not a guessed formation

Team style stores possession control, directness, width/delivery, attacking box occupation, set-piece emphasis and defensive-block tendency. A dominant label is an organizational summary, not a claimed formation or full tactical identity.

## 29. Box occupation is not pressing

The initial `HIGH_BOX_PRESSURE` wording was rejected because it could be misread as defensive pressing. Taxonomy `team_style_v0.1.1` uses `HIGH_BOX_OCCUPATION`; the legacy physical column name is retained only for compatibility.

True pressing-vs-buildup intelligence remains a separate future feature family.

## 30. Fixture Role/Tactical snapshots obey the same chronology law as odds

Learned profiles can update after completed matches, but fixture decision-state role/tactical snapshots may only use evidence known before that fixture's kickoff. Database-level guards enforce this.

A tactically correct inference built with hindsight is still invalid decision intelligence.

## 31. Replacement quality remains disabled as a model effect

Replacement quality must not alter xPts/lambdas merely because a plausible substitute can be identified. The current replacement layer is research-only and `model_effect_enabled=false`.

Promotion requires forward evidence that role fit, replacement ability and tactical consequence are predictive rather than narratively plausible.

## 32. Why Role v0.2 uses source-capped multi-source blending

v0.1 relied too heavily on sparse preseason/current event samples. The 2025/26 FPL-Core-Insights archive contains detailed player-match events across all 38 EPL gameweeks, so it is a useful prior for current players.

Decision:
- historical 2025/26 events provide a capped prior, not permanent truth;
- preseason is only a weak bridge;
- current 2026/27 competitive evidence gains weight quickly and can override both;
- missing event fields are excluded from the corresponding rate calculation, never converted to zero.

This avoids both cold-start instability and historical anchoring.

## 33. Absolute role scoring was rejected after taxonomy collapse

The first v0.2 behavioral axes were useful, but absolute archetype scoring collapsed too many defenders into CENTRE_BACK and too many midfielders into HOLDING_MIDFIELDER. That was a calibration failure, not evidence that the league contains almost no wide/creative roles.

Decision: retain raw v0.2 axes as evidence, then create v0.2.1 archetypes from **position-relative behavioral percentiles**. This asks whether a defender is unusually wide/creative/box-active relative to defenders, and whether a midfielder is unusually defensive/creative/wide relative to midfielders.

Do not tune taxonomy solely by absolute event volume when positional baselines differ structurally.

## 34. Familiar players are not forced into familiar labels

v0.2.1 deliberately leaves Haaland unresolved when CENTRAL_STRIKER and TARGET_FORWARD are effectively tied, and leaves Isak unresolved when the top candidate does not clear the separation threshold.

The manual Isak research agreeing with a number-9 interpretation is useful validation evidence but is not allowed to leak into training just to make the automated output look correct.

This is an anti-confirmation-bias rule.

## 35. Replacement Quality v0.1.1 is a role-cover proxy, not tactical truth

The first replacement prototype used unrestricted behavioral-vector similarity across outfield positions. Audit exposed implausible candidates: a defender could rank as cover for a forward or centre-back because normalized vectors happened to be close.

That approach was rejected.

v0.1.1 candidate compatibility is now:
- same FPL position by default;
- explicit role bridges only: WIDE_BACK <-> WING_BACK, WIDE_ATTACKER <-> WIDE_FORWARD, HOLDING_MIDFIELDER -> HYBRID_DEFENDER;
- goalkeeper only to goalkeeper.

A high replacement score means “behaviorally similar role-cover candidate under this proxy,” not “manager will start him” and not “equal football quality.”

## 36. Absence relevance must be sample-size aware

The first replacement pass could overstate the importance of a backup with a high starts/matches fraction in a tiny historical sample.

Fix: historical and preseason start shares are multiplied by minute-based evidence strength before deciding whether an injured/suspended/unavailable player is materially relevant.

A tiny sample may inform a prior but cannot by itself establish that an absence materially changes the expected XI.

## 37. Forward role validation must use genuinely pre-match snapshots

Role validation is only valid when the predicted role vector was captured before kickoff and the realized event vector comes from the subsequent completed match.

Do not backfill historical “predictions” from data already containing the match being evaluated. Current forward-validation storage can remain empty until the first legitimate sample arrives; zero rows is preferable to hindsight contamination.

## 38. Replacement proxy promotion gate

Before replacement quality can affect the active model:
1. validate role axes and confidence against forward realized roles;
2. validate replacement candidate ranks against actual lineup/substitution paths;
3. add player ability/quality separately from behavioral role fit;
4. quantify team tactical consequence, including formation/system changes;
5. test out of sample for incremental predictive value.

Until then all replacement outputs remain observational research only.
