# Football Intelligence Engine — Decisions & History

_Last updated: 2026-08-26_

This ledger preserves durable reasoning, rejected approaches and integrity rules. `PROJECT_STATE.md` is the operational handover; this file explains why the project reached that state.

## 1. Product objective
The engine has two linked objectives: maximize season-long FPL decision quality and find betting-market mispricing from context that may be incompletely priced. The betting goal is not to reproduce a bookmaker; it is scalable evidence-led value research.

## 2. FPL decision philosophy
Every serious weekly decision starts by projecting all 15 players. For all 15 estimate xMin, xPts and haul-tail probabilities. Captaincy uses the distribution, not mean xPts alone. Defensive Contributions remain a permanent component.

## 3. GW1 construction reasoning
GW1 was built for squad value rather than automatically buying the most expensive/high-owned players. Historical selection decisions remain frozen regardless of later model improvements.

## 4. Projection-model recalibration
The original fixture transform over-compressed elite/easy fixtures toward league average. Recalibration was structural rather than a blanket uplift to mimic external models. External projections are calibration references, not ground truth.

## 5. Frozen forecasts and append-only history
Preserve what was genuinely predicted at decision time. Never overwrite forecasts after kickoff/results. Later models may create clearly labelled shadow/research reruns. Fixture intelligence may update only before kickoff and hard-freezes at kickoff.

## 6. Prediction-vs-actual audit semantics
Unexpected upside is not model failure for the decision objective. Final downside tolerance is `max(1, round_half_up(0.20 * xPts))`; red requires an undershoot beyond that tolerance.

## 7. Dashboard lessons
Mobile tables must remain width-contained; modal lookup must search complete relevant datasets; API schema evolution must not produce undefined numeric rendering; missing values display as missing, never fake zero; backend health does not prove browser rendering.

## 8. Fixture / Correct Score architecture
Fixture forecasting maintains lambdas, scoreline matrix, ranked exact scores, 1X2, BTTS, totals, clean-sheet probabilities and confidence. A likely score is not automatically a value bet; value requires market comparison.

## 9. Bookmaker Layer 1
Odds-API.io became the primary Correct Score feed after live testing. Raw snapshots are append-only. Event mapping uses teams plus kickoff. Current reads use the latest valid pre-kickoff snapshot; old snapshots remain for movement/CLV.

## 10. Mispricing Intelligence concept
Candidate signal families include form, venue context, tactics, manager behavior, expected XI, injuries, replacement quality, congestion, priorities, travel, pressing/buildup, line height, channels, aerial/set pieces, goalkeeper performance and material weather/pitch effects. H2H is useful only when context persists.

## 11. First observational signal families
Recent Performance and Schedule/Fatigue were introduced observationally with model effect disabled. Plausibility is not evidence of incremental predictive value.

## 12. Historical-data source decisions
Football-Data supplies structured results/shots; Understat supplies xG. Different providers for the same real match remain separate raw records but are canonicalized for feature calculations so one match is not double-counted.

## 13. Betting edge roadmap
Layer-1 ingestion verification precedes de-vig/EV. Long-run quality is judged by calibration, EV and CLV rather than raw hit rate. Recommendation labels remain disabled until forward validation.

## 14. Rejected approaches
Do not uplift merely to resemble external models, treat external models as truth, rewrite forecasts, fabricate unavailable data, use recent W/D/L as sufficient form, use H2H without context, activate unvalidated intelligence, call a probability pick a value bet without prices, judge betting quality by hit rate alone, or double-count matches.

## 15. Supabase connector incident
A previous conversation had a corrupted connector runtime where discovery worked but execution failed. A fresh conversation later passed 5/5 sequential SQL calls. Operational lesson: isolate tool-runtime problems before changing the project, and distinguish planned/coded/committed/deployed/executed/verified.

## 16. Latest-snapshot bookmaker semantics
For live reads, the latest valid pre-kickoff snapshot per fixture/bookmaker source is authoritative. A disappeared current market must not be silently resurrected from an older snapshot.

## 17. Correct Score offered-set de-vig
Exact-score books can omit extreme outcomes. Fair probability is therefore conditional on the offered set for de-vig comparison, while wager EV remains `P_model_raw * decimal_odds - 1`.

## 18. Two de-vig methods
Proportional de-vig is retained as the transparent baseline and power de-vig as a second method for possible favorite/longshot bias. Do not average methods opaquely.

## 19. Research edge is not a recommendation
Statuses such as robust positive EV organize research evidence only. `value_edge_available=false` remains until sufficient genuine validation/calibration/CLV evidence exists.

## 20. Edge-generation timeout lesson
The first automatic edge hook timed out because a power exponent was solved repeatedly across a broad scope. Snapshot-scoped generation/materialized intermediate work fixed the computational issue without invalidating Layer 1.

## 21. Security findings remain separate from model work
New intelligence objects are hardened immediately. Legacy permissions are mapped before modification so security cleanup does not silently break application dependencies or obscure model work.

## 22. Expected XI / Availability design
Official availability/news plus latest P(start)/xMin can support an observational candidate-XI layer without pretending to know exact tactical lineups. FPL-valid candidate shapes are not tactical formation claims.

## 23. Current-season player-state lineage
v0.1.3 intentionally consumes the v0.1.2 player-state layer plus manual role intelligence. Completed-match evidence may update only future state. Defensive-action priors are not replaced by non-equivalent fields.

## 24. Automated Role Intelligence is an archetype model, not positional tracking
Event-profile archetypes must not be presented as exact tactical coordinates/positions. FPL position is a broad family guardrail, not tactical truth.

## 25. `UNRESOLVED` is a correct output
Prefer uncertainty to false certainty. Do not lower thresholds simply to force familiar players into familiar labels.

## 26. Competitive evidence outranks preseason evidence
Current competitive evidence progressively overrides preseason/historical priors, but only after matches are completed and only for future decisions. Partial upstream evidence is skipped rather than converted to zero.

## 27. Manual role research remains separate from automated role profiles
Manual Bruno/Isak role research is external validation evidence, not silently merged into automated training just to make labels look correct.

## 28. Team tactics are modeled as orthogonal axes, not a guessed formation
Possession control, directness, width/delivery, box occupation, set-piece emphasis and defensive block are separate axes. A dominant label is an organizational summary, not a claimed formation.

## 29. Box occupation is not pressing
`HIGH_BOX_PRESSURE` wording was rejected; `HIGH_BOX_OCCUPATION` is used. True pressing-vs-buildup remains a separate family requiring appropriate evidence.

## 30. Fixture Role/Tactical snapshots obey the same chronology law as odds
Learned profiles may update after completed matches, but fixture decision-state snapshots may only use evidence known before that fixture's kickoff. A tactically correct inference built with hindsight is still invalid decision intelligence.

## 31. Replacement quality remains disabled as a model effect
A plausible substitute does not prove equal quality or tactical consequence. Replacement outputs remain observational until forward role, lineup, ability and team-consequence validation exists.

## 32. Why Role v0.2 uses source-capped multi-source blending
Historical 2025/26 events provide a capped prior, preseason a weak bridge, and current 2026/27 competitive evidence gains weight quickly. Missing fields are excluded from corresponding rate calculations rather than zero-filled.

## 33. Absolute role scoring was rejected after taxonomy collapse
Absolute archetype scoring collapsed positional diversity. v0.2.1 therefore uses position-relative behavioral percentiles so wide/creative/defensive behavior is judged against positional baselines.

## 34. Familiar players are not forced into familiar labels
Familiarity cannot override separation/confidence thresholds. This is an explicit anti-confirmation-bias rule.

## 35. Replacement Quality v0.1.1 is a role-cover proxy, not tactical truth
Unrestricted behavioral similarity produced implausible cross-position substitutes and was rejected. Candidate compatibility now uses same-position defaults plus explicit role bridges. A high score is not a claim about manager selection or equal football quality.

## 36. Absence relevance must be sample-size aware
Tiny-sample start shares cannot establish material absence relevance. Start shares are discounted by minute/evidence strength.

## 37. Forward role validation must use genuinely pre-match snapshots
A predicted role vector must be captured before kickoff and compared only with subsequent realized match evidence. Zero valid rows is preferable to hindsight contamination.

## 38. Replacement proxy promotion gate
Before replacement quality can affect an active model: validate forward role axes, candidate ranks vs actual lineup paths, ability separately, system consequences, and incremental out-of-sample value.

## 39. Tactical matchup intelligence uses family-specific score semantics
Use `ADVANTAGE`, `OPPORTUNITY` and `DISRUPTION` semantics rather than one ambiguous matchup score.

## 40. Tactical matchup components obey missing-is-not-zero
Null-aware weighted means exclude missing components and reflect coverage/confidence separately. `COALESCE(missing_metric,0)` inside matchup scores is forbidden.

## 41. Do not claim left/right flank mismatches without side/zone evidence
Broad wide-channel pressure is allowed; left-vs-right claims require genuine side/zone evidence.

## 42. Direct-transition opportunity is not high-line-vs-pace
The current transition signal has no measured defensive line height or player speed. Do not relabel it as high-line-vs-pace.

## 43. Research fixture intelligence gets an additive API contract
Do not mutate the frozen FPL API contract to inject unvalidated tactical research. Use the additive `fixture-intelligence-api` and leave historical fixtures empty when genuine pre-kickoff research was not preserved.

## 44. Tactical signal labels need lean states and provenance consistency
ADVANTAGE signals use explicit lean bands. Displayed direction must agree with stored nested provenance; append-only corrections are required when they diverge.

## 45. Personnel disruption is continuity research, not player ability
The personnel signal describes continuity/replacement uncertainty. It does not prove absolute player quality or manager system changes.

## 46. Foundational-layer stop point reached
Expected XI, role archetypes, team style, replacement-cover research and tactical matchups are sufficient foundation for product work. Do not delay the product until every future spatial family exists.

## 47. Three different chronology concepts must remain separate
1. genuine forward intelligence;
2. blind retrospective context replay;
3. enriched outcome shadow replay.
Only the first can eventually be called true forward validation. Categories 2 and 3 must remain explicitly retrospective/non-forward.

## 48. Historical baseline reconstruction has a strict hierarchy
Use genuine saved pre-kickoff fixture snapshots first, exact reconstruction from genuine pre-kickoff player batches second, otherwise no Original baseline. Do not reconstruct an “original” from post-kickoff model state.

## 49. Enriched Shadow v0.1 coefficients were frozen before evaluation
Conservative bounded coefficients were fixed before scoring. They must not be altered after seeing the same GW1 results.

## 50. Enriched Shadow v0.1 produced a negative/neutral aggregate result and must be preserved
The GW1 enriched shadow failed to improve aggregate proper scores versus defensible Original baselines. Preserve the negative result rather than tuning it away.

## 51. Current outcome integration is dominated by recent xG trend, not tactical matchups
Run-2 audit showed recent xG trends drove most lambda movement while tactical axes were small. Future integration should use component ablations over broader chronological samples, not result-hit tuning.

## 52. Shadow-model UI must show evidence, not imply promotion
Performance may show Original → Shadow → Actual only with provenance, calibration context and research-only wording. A more sophisticated-looking shadow is not evidence for promotion.

## 53. Security hardening must follow dependency mapping, then actually close the exposure
C0045 mapped live dependencies first. C0122 then enabled RLS, removed broad anon/auth grants and restricted mutating research RPCs while live service APIs remained healthy. Known exposure should not remain Deferred after dependencies are understood.

## 54. Regularization may correctly choose zero
C0068/C0123 found non-zero residual fits with tiny MAE improvement but worse RMSE. The correct learned result was zero. Do not force a signal merely because an engineering item is called “learned effects.”

## 55. Manual form effects survive only as small research comparators
C0072/C0124 found modest dual-metric improvement from the combined small form package, while own-form alone and schedule/fatigue were not robust. Retain only a research comparator; do not activate from retrospective evidence.

## 56. Effect-family promotion requires genuine validation and test evidence
C0073/C0125 requires >=50 validation observations, >=30 test observations, >=0.005 Brier improvement in both, no log-loss regression, process MAE within 2%, and zero integrity violations. Automatic activation is impossible.

## 57. Nonlinear curves are rejected when regime stability fails
C0069/C0126 gave one pass, one fail and one mixed window for every tested response shape. Decision: `REJECT_NO_CROSS_WINDOW_STABILITY`.

## 58. Sparse L10 evidence is suppressed, not smoothly promoted
C0070/C0127 found partial weighting harmful in sparse bins. Missing remains missing; 1–9 prior matches receive residual research weight 0; >=10 receives weight 1.

## 59. Venue effects must survive multiple historical windows; GW1 cannot rescue them
C0106/C0128 rejected context-specific venue blends after cross-window instability. A favorable six-team-side GW1 diagnostic was too sparse/non-independent to override the historical decision.

## 60. A third Correct Score source remains a real external dependency
Pinnacle failed, and genuine pre-kickoff William Hill/Betway/BetVictor tests through Odds-API.io wrote no normalized selections. Keep C0034 Blocked until an independent third source actually captures normalized pre-kickoff Correct Score data.

## 61. The second forward cohort was precommitted before the first cohort produced results
C0121 froze E0008/W0002 for GW4/GW5 before GW2 outcomes. Defining future cohorts before prior validation results reduces adaptive bias.

## 62. Mean-vs-mode discrepancy is not automatically a betting edge
The historical xG-minus-modal O/U rule lost money and was chronologically unstable. Do not call it a validated edge. The narrower Correct Score version remains frozen prospectively as E0007.

## 63. Supabase execution truth outranks stale documentation filenames
When production, GitHub and Excel drift, reconcile in this order: Supabase working ledger/integrity, GitHub implementation artifacts, handover/history, fuller local Excel, final formula/governance/integrity checks. Never assume a file named CURRENT is current.

## 64. Multi-season player ability is a per-player evidence property — C0131
C0131 ingested genuine 2024/25 FPL-Core-Insights player evidence across 38/38 GWs. Identity uses stable player code, not display name. The v3 prior has 341 current outfield players: 216 genuinely blend two seasons and 125 remain one-season because older EPL evidence is insufficient.

Decision: C0092 is complete. Do not fabricate older history merely to make every player “multi-season.” Position-specific persistence, minute reliability, opponent-Elo context, missing-is-not-zero and append-only storage remain required. Model effect stays disabled.

## 65. Team-specific hierarchical residuals were tested and rejected — C0132
Fixed team partial-pooling K=5/10/20/40 improved the earliest window but failed later chronological stability: W2 worsened RMSE for every hierarchy and W3 produced regression or metric tradeoff.

Decision: `REJECT_NO_CROSS_WINDOW_STABILITY`. Small samples continue to borrow from the global/zero residual baseline. A materially different hierarchy requires a new Change ID and independent design.

## 66. Blind-to-result is not the same as deadline-valid — C0134
The GW1 dual proof-test intentionally remained retrospective. The betting track had genuine two-book pre-kickoff prices for only 3/10 fixtures and a fixed five-action rule lost -3.27u (-65.4% ROI); the strict Correct Score rule produced zero bets. Preserve this negative monetization result.

The FPL optimizer captured 59/67 = 88.1% of the same-squad hindsight ceiling, but its source projection batch had been generated after the GW1 deadline and was already excluded from backtest.

Decision: a replay can be blind to final results yet still fail the deadline-valid historical-backtest standard. Never collapse those concepts.

## 67. The upcoming FPL decision surface must exist before the deadline without serving mutable state — C0135
When GW2 returned “No frozen snapshot,” the correct fix was not to weaken `fpl-api`. The missing layer was an upstream scheduler that generates rolling immutable pre-deadline snapshots.

Decision: while a deadline is future, newer frozen snapshots may supersede older ones for display; generation is refused after deadline; the scheduler rolls to the next future GW. Historical snapshots remain immutable.

## 68. Current-season evidence may update future FPL decisions but must not contaminate frozen betting cohorts — C0136
The early season must not remain anchored almost entirely to 2025/26. Completed 2026/27 evidence now gains weight quickly in rolling FPL projections using multiple sources and a process-led, coverage-aware blend.

After one match, retained teams receive 25% base current-season weight and promoted/weak-baseline teams 33.3%, then coverage scaling. xG carries the largest process weight; goals are deliberately smaller components. Missing metrics are excluded, not zero-filled. Actual player goals/assists provide only capped positive confirmation.

Decision: C0136 is accepted for **future rolling FPL only**. W0001/A0005, E0007 and W0002 remain frozen and unchanged. Current-season FPL assimilation is not evidence for promoting the betting model.

## 69. Reconciliation is itself governed work — C0137
Material implementation moved production beyond the last consolidated handover. A new reconciliation therefore requires its own Change ID before documentation/tracker writes.

Decision: Supabase remains authoritative, GitHub handover/history must be brought forward to verified production, and the local Excel tracker is regenerated afterward. Reconciliation never changes model forecasts merely to match stale documentation.

## 70. A candidate that fails the training screen does not earn access to the holdout — C0133
C0133 tested a predeclared 3×3 grid of mean-preserving two-regime mismatch mixtures on 344 chronology-safe training fixtures. The equal 50/50 opposite-regime construction preserves each team’s unconditional lambda; thresholds were 0.50/0.75/1.00 and regime deltas 0.10/0.20/0.30.

Every non-control candidate worsened training exact-score likelihood. The least-bad candidate, gap >=1.00 / delta 0.10, was still +0.014895 NLL worse than Poisson and affected only one training fixture. The 105-fixture Feb–May holdout therefore remained untouched.

Decision: `REJECT_TRAINING_LIKELIHOOD`. Do not open a reserved holdout merely to rescue a candidate that already failed the predeclared training screen, and do not expand the grid after seeing failure. Independent Poisson remains retained; upstream lambda quality remains the higher-priority modeling problem.