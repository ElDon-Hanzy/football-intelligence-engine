# C0153 — Matchup, mobile table and fixture score presentation fix

_Date: 2026-08-31_

## Problem

The matchup modal rendered tactical/personnel signals without showing which team the signal belonged to. In fixture view this could mix home- and away-team rows, so text such as `personnel continuity / material disruption / 61% conf.` was not decision-readable.

The Performance table also retained a desktop minimum width and horizontal scrolling on mobile.

Finished fixture cards replaced the frozen predicted score with the actual score, preventing a direct predicted-vs-actual audit.

## Fix

Presentation-only layer `ui-v10.js` / `ui-v10.css`:

- matchup signals now identify the affected team and translate direction into explicit impact text such as `Negative: Man City · Relative benefit: Crystal Palace`;
- duplicated fixture-level `BALANCED` tactical signals are collapsed into a single neutral interpretation;
- confidence is labelled `evidence confidence` so it cannot be mistaken for effect size or match probability;
- fixture cards show both the frozen predicted correct score and the factual actual score;
- exact score hits receive a green tick;
- the predicted score probability is shown when available and a `tight top-score race` warning appears when top-1 and top-2 exact-score probabilities are within 2 percentage points;
- fixture tactical chips now include the team perspective;
- mobile tables use fixed-layout responsive cells and no horizontal scrolling.

## Integrity

No model probability, historical forecast, result row, tactical score, or FPL decision is changed. C0147 remains observational with `model_effect_enabled=false`.
