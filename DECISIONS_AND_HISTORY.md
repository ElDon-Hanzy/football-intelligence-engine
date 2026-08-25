# Football Intelligence Engine — Decisions & History

_Last updated: 2026-08-25_

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

## 39. Tactical matchup intelligence uses family-specific score semantics

Do not compress all tactical context into one unexplained “matchup score.” Different signals mean different things.

Tactical Matchup v0.1.1 therefore stores explicit `score_type` values:
- `ADVANTAGE` for attack-vs-resistance comparisons;
- `OPPORTUNITY` for context that may create a mode of attack without asserting superiority;
- `DISRUPTION` for personnel/continuity risk.

This prevents a 0.60 transition-opportunity number from being read as the same concept as a 0.60 aerial advantage or 0.60 personnel disruption.

## 40. Tactical matchup components obey missing-is-not-zero

The scratch prototype exposed a tempting but invalid shortcut: `COALESCE(missing_metric, 0)` inside matchup scores.

That approach was rejected before production persistence.

Production Tactical Matchups use null-aware weighted means. Missing role/tactical components are excluded from the relevant calculation and separately reflected in data coverage/confidence. Absence of evidence is never converted into evidence of weakness.

## 41. Do not claim left/right flank mismatches without side/zone evidence

Current Role/Tactical data can support broad **wide-channel pressure** but not reliable left-vs-right assignment.

Until player-side/zone data exists, the engine may say a team has a wide-channel attacking lean, but it may not claim “Chelsea right side vs Fulham left side” or similar precision.

A future side-specific channel model must have independent evidence and validation.

## 42. Direct-transition opportunity is not high-line-vs-pace

The current transition signal uses directness, expected-XI shot/box threat and opponent control/block context.

It does **not** contain measured defensive line height or player speed. Therefore it must remain `direct_transition_opportunity`, not be relabelled as high-line-vs-pace.

True line-height-vs-pace intelligence is a future, separate feature family.

## 43. Research fixture intelligence gets an additive API contract

The existing `fpl-api` v8 contract is tied to frozen FPL prediction/actual semantics and had already caused frontend regressions during prior schema evolution.

Decision: do not mutate that contract just to add unvalidated tactical research.

Create a separate additive `fixture-intelligence-api` that exposes tactical profile, matchup signals, Expected XI/availability, player-role research, replacement research and explicit research-only limitations.

Historical fixtures with no genuine pre-kickoff research remain empty rather than being reconstructed after the fact in this genuine-fixture contract.

## 44. Tactical signal labels need lean states and provenance consistency

The first persisted direction bands labeled a score such as 0.581 as `BALANCED`, hiding a useful but non-strong lean.

Decision for ADVANTAGE signals:
- >=0.62 ATTACK_ADVANTAGE;
- >=0.55 ATTACK_LEAN;
- <=0.45 DEFENSIVE_LEAN;
- <=0.38 DEFENSIVE_RESISTANCE;
- otherwise BALANCED.

A later audit found the calibrated outer direction could differ from nested technical evidence inherited from v0.1. This was corrected append-only. Permanent rule: displayed direction and stored provenance must agree.

## 45. Personnel disruption is continuity research, not player ability

The Tactical Matchup personnel signal uses absence relevance, replacement role fit, candidate collision and availability uncertainty.

It does not prove that a replacement is equally good or worse in absolute football quality, and it does not model manager system changes.

Before personnel disruption may affect the active model: validate actual lineups/substitutions, validate role vectors forward, add ability separately, and test whole-team consequences out of sample.

## 46. Foundational-layer stop point reached

With Expected XI, role archetypes, team style, replacement-cover research and fixture-specific Tactical Matchups behind additive read contracts, the engine has enough foundational structure for the product interface.

Do not delay UI work waiting for every future family such as pressing, line height, weather or referees.

## 47. Three different chronology concepts must remain separate

There are now three distinct research modes and they must never be conflated:

1. **Genuine forward intelligence** — captured before the real kickoff and later validated. This is the strongest evidence.
2. **Blind retrospective context replay** — newer logic is reconstructed after the fact using only evidence semantically available before kickoff. Useful for debugging/calibration, but not what the model historically predicted.
3. **Enriched outcome shadow replay** — a retrospective research model uses the current intelligence stack to make a new shadow outcome forecast from pre-kickoff-safe inputs, freezes it separately, then evaluates it after generation.

Only category 1 can eventually be called true forward validation. Categories 2 and 3 must carry `forward_valid=false`.

## 48. Historical baseline reconstruction has a strict hierarchy

For Original-vs-Shadow comparison, use in order:
1. genuine saved pre-kickoff fixture snapshot;
2. exact reconstruction from a genuine pre-kickoff player-prediction batch using the original fixture generator;
3. otherwise no original comparison.

Hull–Man Utd qualifies for step 2: pre-kickoff team lambdas 1.035 / 2.037 were preserved in the player-prediction batch and can be passed through the original Poisson fixture function.

Arsenal–Coventry does not qualify. The earliest archived model/team state and current Elo/team metadata are post-kickoff. Those inputs are forbidden for reconstructing an “original” forecast.

For shadow-only research, Arsenal–Coventry may use a clearly marked safe prior/preseason baseline that excludes post-kickoff Elo, but it must never be scored as Original-vs-Shadow evidence.

## 49. Enriched Shadow v0.1 coefficients were frozen before evaluation

The purpose of the first enriched outcome rerun is to test whether plausible current layers improve the outcome forecast, not to fit GW1 after seeing results.

Therefore v0.1 fixed conservative bounded log-lambda coefficients before running the evaluator:
- wide 0.04 max;
- aerial/set piece 0.035;
- central creation/block 0.05;
- recent attack xG trend 0.05;
- opponent defensive xGA trend 0.04;
- positive transition opportunity 0.025;
- schedule/fatigue 0.03;
- personnel own attack 0.05;
- opponent personnel defence 0.04;
- total log-lambda adjustment capped ±0.12.

Transition is upside-only: a low counter-attacking score does not penalize a possession side for not being a transition team.

Personnel effects are position-aware but still role-continuity proxies, not ability effects.

Missing layers apply no shadow adjustment because their effect is unknown; this is a neutral mathematical operation, not an assertion that missing football evidence equals zero strength.

These coefficients must not be altered in run 2 after evaluation.

## 50. Enriched Shadow v0.1 produced a negative/neutral aggregate result and must be preserved

GW1 enriched shadow run 2 generated 10 fixtures with no actual-data use and no chronology violations, then separately evaluated 9 finished fixtures.

Eight finished matches had a defensible Original baseline.

Result:
- Original result-direction hits: 5/8;
- Shadow result-direction hits: 5/8;
- Original exact top-score hits: 1/8;
- Shadow exact top-score hits: 1/8;
- Original average 1X2 Brier: 0.617461;
- Shadow average Brier: 0.628945;
- average Shadow-minus-Original Brier: +0.011484, therefore worse;
- Original actual-score log loss: 3.013640;
- Shadow actual-score log loss: 3.042677, also worse;
- 1 fixture improved by more than 0.01 Brier, 3 were similar, 4 worsened.

This is not a failure to hide. It is evidence that the current explanatory layers are **not yet correctly integrated into outcome probabilities**.

Do not retune v0.1 to make GW1 look successful. Preserve run 2 as a fixed calibration result.

## 51. Current outcome integration is dominated by recent xG trend, not tactical matchups

Audit of run 2 shows the largest lambda movements are usually caused by recent attacking/defensive xG trends, while the tactical matchup axes are generally much smaller because they are confidence/coverage weighted and deliberately conservative.

Examples:
- Hull–Man Utd worsened because recent evidence pushed United materially higher and Hull lower;
- Forest–Leeds worsened because Forest received strong recent-attack and opponent-defence boosts;
- Brentford–Spurs worsened because the new layer narrowed Brentford's advantage despite the eventual 3-0 result;
- Everton–Palace improved because Palace's recent defensive trend shifted the model toward Everton, though not enough to flip the 1X2 leader;
- Newcastle–Liverpool was the only leader flip: Liverpool → Newcastle, while the actual result was a draw.

Before Enriched Shadow v0.2, run component ablations on a broader chronological sample: base + form, base + tactics, base + personnel, and combinations. Compare incremental Brier/log loss rather than tuning to result hit rate.

## 52. Shadow-model UI must show evidence, not imply promotion

Performance now exposes Original → Enriched Shadow → Actual so the product can visibly answer whether new intelligence changed the model's opinion.

The interface must show:
- original/safe baseline provenance;
- original and shadow lambdas/probabilities;
- actual result only after the forecast comparison;
- human-readable reasons for movement;
- calibration change where an original comparison is legitimate;
- research-only / no-model-effect wording.

A shadow model looking more sophisticated is not enough. Promotion depends on out-of-sample improvement.

## 53. Security hardening must follow dependency mapping, then actually close the exposure

C0045 first mapped live dependencies before touching legacy grants. The frontend was confirmed to use Edge Function APIs backed by service-role access rather than direct browser-table reads.

Only after that evidence existed did C0122 harden production:
- seven previously RLS-disabled tables were protected;
- legacy anon/auth direct table and sequence grants were removed;
- mutating research/replay RPCs were removed from anon/auth execution while service-role paths remained intact;
- FPL, Fixtures and Betting API smoke tests stayed HTTP 200.

Permanent lesson: **security work starts observationally, but once dependencies are understood the known exposure should be closed and verified rather than left indefinitely Deferred.**

## 54. Regularization may correctly choose zero

C0068/C0123 reconstructed the intended chronology-safe residual target and used an inner chronological selection window plus an untouched Feb–May holdout.

Non-zero ridge effects produced only tiny MAE gains and worse RMSE. The correct model-selection result was therefore to set currently supported learned residual coefficients to zero.

Permanent lesson: **zero is a valid learned coefficient. Do not force a signal into the model merely because the engineering item is called “learned effects.”** Unsupported tactical/personnel/quality families remain unlearned rather than imputed as zero.

## 55. Manual form effects survive only as small research comparators

C0072/C0124 compared all variants on the same untouched 210-row holdout.

Findings:
- combined small recent-form package improved both MAE and RMSE modestly;
- opponent-defence trend alone improved both metrics modestly;
- own-form alone improved MAE but worsened RMSE;
- schedule/fatigue had already worsened its historical holdout;
- regularized learned effects stayed zero.

Decision: retain the **small combined manual form package only as a research comparator**. Own-form alone and schedule/fatigue are not retained as active effects. No retrospective comparator is activated.

## 56. Effect-family promotion requires genuine validation and test evidence

C0073/C0125 makes the signal-family gate explicit.

A family cannot pass from retrospective evidence alone. Current policy requires at least:
- 50 genuine VALIDATION observations;
- 30 genuine TEST observations;
- at least 0.005 absolute Brier improvement in both windows;
- no log-loss regression;
- process MAE within 2% tolerance;
- zero integrity violations.

Automatic activation is impossible. A positive historical ablation result can at most justify continuing a forward comparator.

## 57. Nonlinear curves are rejected when regime stability fails

C0069/C0126 tested fixed linear-unclipped, clipped-linear, tanh and softsign responses across three chronology-separated historical windows.

Every curve had one pass window, one fail window and one mixed window. That is evidence of regime instability, not a reason to tune a fifth curve until one happens to fit.

Decision: **REJECT_NO_CROSS_WINDOW_STABILITY**. Do not activate nonlinear response curves without a new independently justified experiment.

## 58. Sparse L10 evidence is suppressed, not smoothly promoted

C0070/C0127 tested whether partial confidence scaling could rescue residual form effects when L10 history is incomplete.

It did not. In the 5–7 and 8–9 prior-match bins, zero effect beat linear/quadratic/cubic partial weighting on both MAE and RMSE. The 1–4 bin was too small to justify promotion.

Decision:
- missing `sample_l10` remains missing;
- 1–9 observations receive residual research weight 0;
- >=10 receives weight 1.

Permanent lesson: **a smooth confidence function is not automatically better than a hard evidence floor.**

## 59. Venue effects must survive multiple historical windows; GW1 cannot rescue them

The blanket global home uplift was already rejected. C0106/C0128 then tested context-specific venue blends at 25%, 50% and 100% across four chronology-separated historical windows.

No candidate improved both MAE and RMSE consistently.

A separate retrospective GW1 diagnostic favored venue weighting, but it covered only six team-sides and was not independent. It was explicitly prevented from overriding the historical decision.

Decision: no additional venue effect is activated.

## 60. A third Correct Score source remains a real external dependency

Pinnacle did not produce usable normalized Correct Score selections through the current route. William Hill, Betway and BetVictor were then tested genuinely pre-kickoff for GW2 through Odds-API.io: all 10 events matched, but zero normalized selections were written and responses included 403/429 behavior.

The current independent candidate is Sportmonks Premium Odds powered by TXODDS, but the project does not yet have the required paid/API access.

Decision: keep C0034 **Blocked** until an actual third provider produces normalized pre-kickoff Correct Score selections. Do not mark source research as implementation success.

## 61. The second forward cohort was precommitted before the first cohort produced results

C0121 created E0008/W0002 for GW4/GW5 before GW2 outcomes existed.

This was deliberate. It prevents the project from seeing GW2 validation results and then defining the next cohort around what looked successful.

W0002 is separate from W0001/A0005:
- GW4 VALIDATION;
- GW5 TEST;
- full pre-kickoff intelligence chain already frozen;
- dedicated capture/evaluator automation;
- no A0005 mutation.

Permanent lesson: **future cohorts should be defined before prior validation outcomes whenever practical.**

## 62. Mean-vs-mode discrepancy is not automatically a betting edge

The xG-minus-modal-score idea produced a useful statistical question but failed as a simple O/U betting rule.

Historical chronology-safe test at gap >=1.2 gave closing-average Over 2.5 ROI of -7.92%, with clear chronological instability. Model-vs-market disagreement filters worsened rather than rescued the result.

Decision: do not call the raw xG-modal gap a validated O/U edge.

The narrower Correct Score hypothesis remains frozen prospectively as E0007 and must be judged only under its precommitted GW2 VALIDATION / GW3 TEST rule.

## 63. Supabase execution truth outranks stale documentation filenames

Overnight autonomous execution moved production materially ahead of the local Excel tracker and `PROJECT_STATE.md`. C0129 exists to reconcile that drift.

Permanent reconciliation order:
1. query Supabase working ledger and integrity/status functions;
2. verify GitHub implementation artifacts/commits;
3. update operational handover and decision ledger;
4. rebuild the fuller local Excel register from the latest valid register plus verified production changes;
5. run formula/governance/integrity checks;
6. never assume a file named `CURRENT` is actually current.

Documentation must reflect production truth, but documentation drift must never be “fixed” by changing production to match an old document.
