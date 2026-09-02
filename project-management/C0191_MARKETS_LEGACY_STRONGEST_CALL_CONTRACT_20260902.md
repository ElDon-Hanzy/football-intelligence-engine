# C0191 — Markets legacy strongest-call contract correction

Date: 2026-09-02
Status: Verified product/architecture decision

## Problem

The first UI v2 implementation of the Markets Top-4 surface interpreted “Top 4 Bets” as the four highest robust-positive model-vs-bookmaker EV observations. That was the wrong product semantics.

The legacy Markets surface did not rank bookmaker value. Its `ui-v7.js` contract rendered **Four strongest model views** from the existing `human-insights-api.betting_recommendations` object.

## Existing decision object

`human-insights-api.betting_recommendations` already produces exactly one highest-probability call in each of four core markets from the selected Gameweek’s frozen pre-kickoff fixture-prediction snapshots:

1. Correct score — highest-probability top exact score across fixtures.
2. 1X2 — highest-probability home/draw/away outcome across fixtures.
3. O/U 2.5 — highest-probability Over/Under 2.5 outcome across fixtures.
4. BTTS — highest-probability Yes/No outcome across fixtures.

For GW3 at the time of verification the existing source returned:

- Nott'm Forest vs Spurs — Correct score 1-1 — 12.328%.
- Man City vs Coventry City — Man City win — 69.46%.
- Man City vs Coventry City — Over 2.5 — 68.97%.
- Newcastle vs Bournemouth — BTTS Yes — 66.23%.

These are **model-confidence calls**, not claims of bookmaker value.

## Decision

UI v2 must consume the existing `human-insights-api.betting_recommendations` contract directly for its four primary Markets cards.

Do **not** rebuild, reproduce, or re-rank those four calls from lower-level bookmaker snapshots, edge-research rows, EV, CLV, or other diagnostics unless a separately governed decision explicitly supersedes the legacy contract.

Bookmaker prices, model-vs-market gaps, EV research and CLV remain useful, but only as **secondary diagnostics**. They may not determine which four primary calls appear.

If the existing model-call source is unavailable or empty, the UI must fail closed. It must not silently substitute an EV shortlist.

## Architecture rule learned

When a human-facing decision object already exists upstream and is still the intended product truth, a new UI should **reuse that decision contract rather than reconstruct the decision from lower-level data**.

Reimplementation is justified only when:

- the existing decision contract is genuinely unavailable or technically unsuitable; or
- a separately governed product/model decision explicitly replaces it.

A cleaner UI is not itself justification for creating a second decision pipeline.

## Separation from C0192

C0192 automatic bookmaker ingestion remains valid as a separate market-diagnostics pipeline. It refreshes prices and research observations for secondary comparison/validation surfaces. It does not generate or rank the four primary model calls.

## Verification

Primary correction commits include:

- `a58ac5d0ee1a0f05cce9bd50561ed93bae448b23`
- `f0dab47fefd89b1cb94113928f21cae6c9e4a17b`
- `113d539cad748eaaed246a2f2a669b85c3859c97`
- `07e31b6db2b9e4634dea729b674fb9622b8c920c`
- `870793f58a4d745c4bd38b43ff5291cc72f4633b`
- `adc575b2e686ebfb53bc775f4ab31015b4293562`
- `d497f25ea123dd417246876d475a72a8c4bd35e4`
- `30848f605ee2cd6c9898ad1067c925ca1ddee6c2`

Strict GitHub Pages workflow `33640409942` passed typecheck, unit tests, build, bundle budget, E2E/accessibility, deterministic visual regression, artifact verification, deployment, and post-deploy legacy-root plus `/v2/` checks.

This correction changes presentation/data-contract reuse only. It does not alter frozen fixture forecasts, historical predictions, A0005, E0007, W0002, or model-effect status.
