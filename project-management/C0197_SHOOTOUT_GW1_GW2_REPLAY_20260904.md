# C0197 Shootout GW1/GW2 Retrospective Replay — 2026-09-04

Status: research-only retrospective as-of replay. No production model effect. No retuning.

Run key: `C0197_SHOOTOUT_REPLAY_GW1_GW2_20260904_V01`

## Purpose

Apply the already-frozen shootout model to GW1/GW2 using only information available before each Gameweek's first kickoff. This is not called blind because the model was developed after these results were known.

The replay deliberately uses a single Gameweek cutoff before the first kickoff, so no later fixture in the same GW can consume earlier same-GW results.

- GW1 cutoff: `2026-08-21 18:59:59 UTC`
- GW2 cutoff: `2026-08-28 18:59:59 UTC`

## Frozen model

No coefficients were changed.

V01 Base uses equal-weight standardized:
- minimum rolling SOT
- minimum rolling goals scored
- rolling BTTS rate
- inverse favorite probability from H2H market

V02 adds:
- minimum number of SOT-producing players
- minimum xG breadth outside the top two xG players

All base history uses the last 10 EPL matches with missing slots shrunk to frozen league priors. Breadth uses C0197 shot-reconciliation-eligible evidence only.

## GW1 limitation

An exact replay is impossible from stored engine data because the H2H market archive begins on `2026-08-22 15:10 UTC`, after GW1 had already started.

We therefore do **not** reconstruct or substitute later market odds.

A structural-only diagnostic was run without the missing inverse-favorite component. GW1 had no 6+ shootout.

Structural V02 top:
1. Newcastle-Liverpool — actual 2-2 (4 goals)
2. Hull-Man Utd — 2-0
3. Man City-Bournemouth — 2-1
4. Brighton-Aston Villa — 4-0

The highest-goal GW1 match, Fulham-Chelsea 2-3 (5 goals), ranked 10th structurally. This is not strong supporting evidence.

## GW2 exact replay

GW2 had complete pre-first-kickoff H2H, BTTS, and O2.5 market coverage.

Actual 6+ shootouts:
- Chelsea-Brighton 4-3
- Man Utd-Ipswich 5-2

### V02 ranking

| Rank | Fixture | Result | Shootout? |
|---:|---|---:|---|
| 1 | Liverpool-Forest | 2-2 | No |
| 2 | Bournemouth-Everton | 1-1 | No |
| 3 | Man Utd-Ipswich | 5-2 | **Yes** |
| 4 | Aston Villa-Arsenal | 0-1 | No |
| 5 | Coventry-Hull | 0-1 | No |
| 6 | Spurs-Newcastle | 0-2 | No |
| 7 | Sunderland-Fulham | 1-0 | No |
| 8 | Palace-Man City | 1-4 | No |
| 9 | Leeds-Brentford | 1-1 | No |
| 10 | Chelsea-Brighton | 4-3 | **Yes** |

V01 ranked Man Utd-Ipswich 6th and Chelsea-Brighton 10th.

### Comparator ranks for the two actual shootouts

| Fixture | V01 | V02 | BTTS market | O2.5 market |
|---|---:|---:|---:|---:|
| Man Utd-Ipswich 5-2 | 6 | **3** | 9 | **2** |
| Chelsea-Brighton 4-3 | 10 | 10 | **2** | 5 |

Summary:
- V02 top 3: 1/2 shootouts captured
- V02 top 5: 1/2
- V01 top 5: 0/2
- BTTS top 5: 1/2
- O2.5 top 5: **2/2**
- average rank of actual shootouts: V02 6.5, V01 8.0, BTTS 5.5, O2.5 3.5

On this tiny exact replay, O2.5 market ranking outperformed the frozen shootout model.

## Chelsea-Brighton miss

The miss is informative.

Before GW2, using only GW1 outcomes/process:

Brighton GW1:
- 4 goals
- 6 SOT
- 3.77 xG
- 3.59 xGOT
- 6 Big Chances

Chelsea GW1:
- 3 goals
- 6 SOT
- 2.24 xG
- 2.02 xGOT
- 4 Big Chances

Yet the rigid last-10 history still produced a weak two-sided floor because nine prior-season matches dominated one strong current-regime performance.

This suggests a plausible **early-season regime-assimilation gap**. It does not justify changing the frozen GW3 model after seeing GW2. Treat faster current-season assimilation only as a future preregistered hypothesis.

## Decision

**MIXED / NO PROMOTION.**

The replay does not invalidate the shootout idea, because V02 materially elevated one 7-goal match that BTTS ranked poorly. But it also missed the other 7-goal match completely, and O2.5 market ranking captured both within its top five.

Therefore:
1. keep GW3 V01/V02 frozen;
2. do not retrospectively retune recency weights;
3. preserve early-season regime assimilation as a future shadow hypothesis only;
4. judge the model on genuine forward 2026/27 evidence.