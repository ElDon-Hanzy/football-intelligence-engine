# C0164 — Human matchup evidence curation and support-depth repair

## Problem
The first C0162 matchup modal exposed raw tactical signal scores and replacement-research scores that were not useful to a human reader. Ipswich–Liverpool also repeated the same scoring-streak sentence in the story and evidence, while showing only one supporting fact and two counterpoints.

## Root cause
C0162 preferred combined matchup facts and correctly sample-gated those facts when the opponent lacked enough Premier League history. For Ipswich–Liverpool, Ipswich had only a two-match EPL sample, so the preferred xG contrast was rejected. The generator had no robust one-sided fallback even though Liverpool had sufficient historical EPL data.

## Production fix
C0164 preserves the combined-fact priority, but when the opponent side is sample-gated it can add:
- MODEL_SCORING_EDGE from the current production fixture forecast when the lambda gap is material.
- FAV_ATTACK_XG using the favourite's own L5 xG with sample >= 5.
- FAV_GOAL_OUTPUT using L10 goals with sample >= 5.
- FAV_SHOT_VOLUME using L5 shots with sample >= 5 and a meaningful threshold.
- OPP_GOALS_CONCEDED only when the opponent itself has sample >= 5.

No short opponent sample is promoted into a robust fact.

Supporting facts are diversified by evidence family before assigning the three expanded-card slots. Raw C0147 tactical tables and replacement-research scores remain stored for research/audit but are removed from the primary human matchup modal.

The modal story is deterministic synthesis from structured facts rather than concatenated one-liners. Supporting evidence is de-duplicated by semantic family, and displayed risks cannot outnumber displayed supports.

When the top-two 1X2 outcomes are separated by less than 5 percentage points, the modal explicitly says there is no clear 1X2 edge / only a slight lean rather than manufacturing a confident narrative.

## Ipswich–Liverpool QA example
Latest prospective GW3 fact snapshot run 5:
- MODEL_SCORING_EDGE: Liverpool 1.96 vs Ipswich 1.15 expected goals.
- FAV_ATTACK_XG: Liverpool 1.92 xG per match over last 5 league games.
- SCORING_STREAK: Liverpool scored in 19 consecutive PL matches.
- FAV_GOAL_OUTPUT: Liverpool 1.80 goals per match over last 10.
- FAV_SHOT_VOLUME: Liverpool 17.6 shots per match over last 5.
- Risks: winless in 6; conceded in 8 straight.

The expanded card uses the first three distinct high-value support families. The modal may show additional distinct support plus at most two material risks.

## Integrity
- Historical fact snapshots are immutable.
- GW3 uses a new prospective snapshot; prior snapshots remain auditable.
- No target-GW actual result is used.
- Missing / short samples are not zero and are not padded.
- C0164 changes evidence/presentation only; fixture probabilities remain unchanged.

## Verification state
Backend/data logic executed and QA'd. UI deployment succeeded, but mobile visual interaction remains user-confirmation-gated before marking the change fully Verified.