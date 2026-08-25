# C0120 — xG–modal-score market edge test

_Date frozen: 2026-08-25_

## Hypothesis

User hypothesis: when total expected goals and the modal Correct Score imply materially different total-goal pictures, the difference may expose market mispricing.

The modal exact score is generated from the same independent-Poisson lambdas as xG, so `total xG > modal-score total` is structurally common and cannot by itself be treated as independent information. The test therefore focuses on the **size of the mean-vs-mode gap** and whether bookmakers underprice the higher-total tail.

## Historical retrospective O/U test — exploratory only

Data:
- chronology-safe 2025/26 Premier League pre-match reconstruction;
- 271 clean fixtures for the xG/modal analysis;
- historical Football-Data closing O/U 2.5 prices where matched;
- no claim that these reconstructed model outputs were genuinely live forecasts at the time;
- no historical bookmaker Correct Score prices are available in production for 2025/26.

Key distribution result:
- total xG exceeded the top-1 modal score total in 271/271 clean fixtures;
- actual goals finished above the modal-score total 56.8% of the time;
- correlation between gap size and actual-minus-modal total was only about 0.14;
- xG total MAE vs actual total = 1.284;
- modal-score total MAE = 1.384;
- probability-weighted Top-3 total MAE = 1.329.

Gap quartiles showed a monotonic but weak pattern:
- lowest quartile, average gap ~0.64: actual above modal total 50.0%;
- Q2, ~0.94: 51.5%;
- Q3, ~1.12: 61.8%;
- highest quartile, ~1.43: 64.2%.

This was not enough to establish a betting edge.

### O/U 2.5 ROI test

Primary pricing reference: historical closing average O/U 2.5 odds.

At gap >= 1.2:
- n = 71;
- Over 2.5 hit rate = 56.34%;
- average de-vigged market Over probability = 57.47%;
- model Over probability = 63.19%;
- closing average odds ~1.654;
- closing-average ROI = -7.92%;
- Bet365 closing ROI = -6.89%.

Chronological split:
- Aug–Dec: n=27, hit 62.96%, closing ROI +2.07%;
- Jan–May: n=44, hit 52.27%, closing ROI -14.05%.

Adding model-vs-market disagreement filters made results worse rather than better. For example, gap >=1.2 plus model Over probability at least 5 percentage points above market produced roughly -9.8% full-sample ROI. Larger disagreement filters also failed.

**Decision:** reject the historical O/U interpretation of the raw xG-modal gap as a validated betting edge. The bookmaker totals market appears to absorb most of the high-total information, and the model's apparent disagreement often reflected model error rather than bookmaker error.

## Correct Score version — forward hypothesis only

Historical Correct Score bookmaker prices for 2025/26 are unavailable in production, so they are not fabricated or reconstructed.

The direct Correct Score hypothesis is instead frozen prospectively as **E0007** on W0001/A0005.

Frozen E0007 rule:
- gap threshold: `total xG - modal-score total >= 1.2`;
- required frozen variants: `BASE_V03_ELO` and `FULL_V04_ELO_NO_SCHEDULE`;
- required bookmakers: Bet365 and Unibet;
- candidate score must have total goals greater than the modal score total;
- minimum model exact-score probability: 1%;
- same scoreline must have raw EV > 0 under both frozen variants at both bookmakers;
- prefer genuine 5–20 minute near-close Correct Score snapshots; otherwise latest `captured_at < kickoff` fallback is allowed but explicitly marked lower quality;
- GW2 = VALIDATION with no retuning;
- GW3 = TEST with thresholds frozen before GW2 results;
- `actual_data_allowed_in_generation=false`;
- `model_effect_enabled=false`.

Primary evaluation:
- one unit per qualifying fixture;
- stake split equally across qualifying exact-score selections;
- use the best eligible captured odds among required bookmakers for each candidate selection;
- report fixture-basket ROI, selection-level ROI, exact hits and whether actual total finished above the modal total.

## Current pre-GW2 observational state

At the 2026-08-25 early-price snapshot, all robust scoreline candidates are on Aston Villa vs Arsenal (GW2). They are **EARLY_FALLBACK**, not near-close, and can change before kickoff under the frozen snapshot rule.

Current qualifying scorelines:
- 2-1 — best captured odds 21.0;
- 3-0 — 81.0;
- 3-1 — 51.0;
- 3-2 — 51.0;
- 4-2 — 151.0.

The strongest structural observation is that the frozen models assign more probability mass to scores above the 1-1 modal total than the current Bet365/Unibet Correct Score grids. This is **not yet evidence of profitability**.

Production functions:
- `private.c0120_forward_candidates_v01()`;
- `private.c0120_forward_evaluation_v01()`.

Supabase migration:
- `20260825021022_c0120_xg_modal_correct_score_forward_test_v01`.

GitHub migration commit:
- `a3510bd6bb8451e9c4ff5fd570593d309546bc57`.

## Integrity rule

Do not reinterpret early candidates as recommendations. Do not alter the 1.2 threshold, probability floor, required variants/bookmakers or basket rule after GW2 results. Any materially changed version requires a new Change ID and experiment key.
