# C0134 — GW1 dual blind proof-test: FPL squad + betting market

Date: 2026-08-25
Status: retrospective research only
Model effect: disabled

## Integrity classification

This work is a **RETROSPECTIVE_BLIND_REPLAY**, not genuine forward validation. It does not alter W0001/A0005, E0007 or W0002.

The market track uses genuine bookmaker prices captured before the relevant GW1 kickoffs and blind-current fixture probabilities with `actual_data_used=false`.

The FPL track uses the existing full 15-player GW1 prediction batch (`prediction_run_id=1`) and freezes the optimizer decision before joining the final official GW1 result run. Important limitation: that prediction batch was generated after the GW1 deadline and is already marked `excluded_from_backtest`; therefore this track is blind to the final result but **is not a deadline-valid historical backtest**. It is useful as a retrospective decision-quality diagnostic only.

## Underlying GW1 fixture replay

Source: blind-current run 2, `blind_current_v0.4_elo_strength`.

10 fixtures:
- result direction accuracy: 8/10 = 80%
- 1X2 Brier: 0.495188451
- score log loss: 2.928976098
- process MAE: 0.677928083
- xG-gap error: 0.996323167

This remains retrospective follow-up, not independent validation, because the Elo hypothesis was investigated after earlier GW1 diagnostics.

## Betting-market blind actions

### Price coverage

Usable two-book pre-kickoff data existed only for three GW1 fixtures:
- Brighton–Aston Villa: prices around 1,309 minutes before kickoff
- Newcastle–Liverpool: genuine near-close prices around 6.9 minutes before kickoff
- Fulham–Chelsea: prices around 1,657 minutes before kickoff

No odds are reconstructed for the other seven fixtures.

### Fixed selection rule before scoring

For 1X2 and O/U 2.5:
- latest genuine pre-kickoff Bet365 + Unibet prices;
- blind-current run-2 model probability;
- raw EV > 0 at both books;
- proportional de-vig fair-probability edge > 0 at both books;
- one selection per fixture/market, maximizing the weaker raw EV;
- execution evaluation uses the better of the two actually captured prices.

For Correct Score, the stricter analogous rule additionally required the same scoreline to be offered by both books, model p >= 1%, raw EV > 0 at both books, and offered-set conditional edge > 0 at both books. **No Correct Score selection passed this rule.** Zero bets is preserved as the blind output.

### Frozen betting actions and settlement

1. Brighton–Aston Villa — Aston Villa win @ 3.10 — model 37.01% — LOST (4-0)
2. Brighton–Aston Villa — Over 2.5 @ 1.73 — model 58.29% — WON (4 goals)
3. Newcastle–Liverpool — Newcastle win @ 3.90 — model 36.53% — LOST (2-2)
4. Newcastle–Liverpool — Under 2.5 @ 2.70 — model 37.85% — LOST (4 goals)
5. Fulham–Chelsea — Fulham win @ 4.10 — model 36.24% — LOST (2-3)

Equal one-unit staking:
- 5 bets
- 1 win
- net = -3.27 units
- ROI = -65.4%

By market:
- 1X2: 0/3, -3.00 units, -100% ROI
- O/U 2.5: 1/2, -0.27 units, -13.5% ROI
- Correct Score: 0 bets under the robust rule

Interpretation: the fixture model's 8/10 direction accuracy did **not** translate into profitable market disagreement. In this sparse GW1 market sample, the largest claimed value was specifically wrong: away/favorite market pricing was often better calibrated than the replay model's contrarian 1X2 view.

Do not tune thresholds to rescue GW1. Preserve the negative monetization result.

## FPL full-15 blind decision

Source projection batch: `prediction_run_id=1`.

Projected optimizer XI (maximum xPts under legal formation constraints): **4-5-1**

- GK: Verbruggen
- DEF: O'Reilly, N. Williams, Dalot, Mosquera
- MID: Tzolis, Bruno Fernandes, Mbeumo, Semenyo, Palmer
- FWD: João Pedro
- Captain: Tzolis
- Vice-captain: Bruno Fernandes
- Bench: Forster (GK); 1 Isak; 2 van Ewijk; 3 Kusi-Asare

Projected XI xPts before captain: 42.919
Projected total including captain duplication: 48.118

Final official result source: `player_gameweek_actuals`, `result_run_id=37`, official FPL, final=true.

Actual selected-XI points before captain: 53
Captain Tzolis: 6 points
Blind optimizer total: **59 points**

No autosub applied because every selected outfielder registered minutes; Dalot played 10 minutes.

Hindsight-perfect legal XI + captain from the same 15: **67 points**.
The blind optimizer captured 59/67 = **88.1%** of the hindsight ceiling.

The 8-point gap breaks down approximately as:
- 7 points from captaincy: Palmer scored 13 vs Tzolis 6;
- 1 point from XI selection: Isak 2 vs Dalot 1 in the hindsight-maximizing legal combination.

### Full-15 calibration

- projected squad points sum: 49.933
- actual squad points sum: 56
- player xPts MAE: 2.6927
- player xPts RMSE: 3.5694
- largest underestimates: Palmer (3.773 -> 13), João Pedro (3.701 -> 11)

Tail calibration across 15 players:
- expected players with 5+: 4.27; actual: 5
- expected players with 10+: 0.78; actual: 2
- expected players with 15+: 0.20; actual: 0
- expected players with 20+: 0.03; actual: 0

Interpretation: XI construction was strong despite imperfect player-point calibration. Captaincy was the main decision miss. Palmer and João Pedro's joint haul was materially underweighted by the pre-result distributions.

## Decision

1. Do not promote betting-market edges from GW1; the small genuine-price sample lost heavily.
2. Preserve the distinction between good fixture direction prediction and profitable pricing edge.
3. Preserve the FPL optimizer structure; it captured 88.1% of the same-squad hindsight ceiling.
4. Investigate captaincy/tail calibration in future genuine forward samples rather than retuning to Palmer's GW1 haul.
5. Do not call the FPL track a clean deadline-valid backtest because its only complete projection batch was generated post-deadline.
6. W0001/A0005, E0007 and W0002 remain untouched; genuine GW2/GW3 forward evidence remains the promotion evidence.

## Production objects created for reproducibility

- `public.c0134_gw1_market_blind_candidates`
- `public.c0134_gw1_market_blind_actions`
- `public.c0134_gw1_fpl_blind_decisions`

Supabase migrations:
- `20260825170109_c0134_gw1_dual_blind_market_candidates_v01`
- `20260825170426_c0134_gw1_market_blind_actions_v01`
- `20260825170537_c0134_gw1_fpl_blind_decisions_v01`

All three decision/candidate stores are RLS-protected and append-only. `model_effect_enabled=false` throughout.