# C0166 — Season-aware symmetric evidence-to-decision layer

Date: 2026-09-01
Status: Executed prospectively for GW3; UI awaiting device visual confirmation.

## Failure mode
The pre-match fact layer could condition evidence generation on the model's existing favorite. This created cases such as Fulham–Crystal Palace where most human-readable evidence favored Fulham while the raw model still presented Palace as the numerical leader. Cross-season rolling windows were also not labelled clearly, exemplified by Everton's 2.09 xGA L5 value.

## Production change
- Canonical result priority is now official FPL result > Understat xG > supplemental shots.
- Evidence is computed symmetrically for both teams before winner attribution.
- Inputs include a shrunk last-five xG matchup, current-season process, venue form, streak profile, and a small result-vs-xG residual.
- Outcome/streak evidence is deliberately heavily shrunk.
- New C0166 evidence is capped at |0.04| log-lambda per team.
- C0159 remains the parent production snapshot; C0166 appends a new immutable production snapshot and does not mutate frozen C0147/C0154 research artifacts.
- Current fixture facts dynamically align to the latest C0166 decision; team fact snapshots remain immutable.
- Card facts must be material signed model inputs. Fewer than three facts are allowed.
- Cross-season L5 evidence is explicitly labelled `(spanning seasons)`.
- Sparse/promoted-team fixtures may use the final expected-goals gap as a lower-priority fallback.

## GW3 sensitivity result
Before promotion, FUL–CRY was approximately Fulham 36.1% / Draw 24.3% / Palace 39.5%.
After C0166, it is approximately Fulham 38.2% / Draw 24.3% / Palace 37.5%. This remains a NO CLEAR EDGE call under the 5pp decision gate, but the numerical lean now follows the robust evidence toward Fulham.

Strong GW3 calls remained directionally stable in the pre-promotion sensitivity test: Liverpool, Brentford, Brighton, Manchester City, Aston Villa, Manchester United and Arsenal retained the same winner direction.

## Everton provenance example
The old 2.09 Everton xGA sentence was a last-five EPL average spanning the season boundary, not a current-season figure. The new layer labels that explicitly and separately records the current-season fact: Everton have conceded 1 goal in two league matches despite allowing about 2.24 xGA per match. The latter is retained as a signed counter-input to the Manchester United call.

## Propagation
- `private.refresh_c0166_production_fixture_forecasts_v01(gameweek)` creates immutable C0166 fixture snapshots.
- `private.refresh_c0166_fixture_cycle_v01(gameweek)` runs C0159 then C0166.
- Cron job 20 now runs the C0166 cycle.
- `private.refresh_c0162_team_fact_layer_v04(as_of_gameweek)` refreshes season-aware fact snapshots after a final gameweek result run.
- GW3 FPL run 1255 was generated after C0166; all 10 fixture cutoffs consumed by that run were `production_fixture_v0.3_c0166`.

## Integrity QA
At execution:
- 10/10 GW3 C0166 fixture snapshots present.
- Maximum C0166 evidence adjustment = 0.040 log-lambda.
- Target-fixture actual-data leaks = 0.
- Frozen research mutations = 0.
- Non-input facts in current card surface = 0.
- Unlabelled Everton-style cross-season 2.09 card facts = 0.
- Everton current-season canonical official-result rows = 2/2.

Historical forecasts remain append-only and unchanged.
