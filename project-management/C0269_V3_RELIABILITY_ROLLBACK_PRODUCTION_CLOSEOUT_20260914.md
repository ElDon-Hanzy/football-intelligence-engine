# C0269 — V3 Reliability Rollback Production Closeout

Date: 2026-09-14 (Dubai)
Status: **Completed / Verified**

## Purpose

C0269 supersedes the C0268 current-page three-way cold-start schedule after post-closeout revalidation demonstrated that its latency gain was not robust enough for production.

C0268 had started three Supabase Edge requests together at page start: Gameweek catalog, default V3 workspace, and default actual/live. Controlled same-run latency testing had shown about a 15% median schedule improvement, but later unchanged production revalidation produced HTTP 500 failures on different members of that simultaneous cold burst from different GitHub runner regions.

The failures moved between endpoints while the underlying GW4 database dependencies remained healthy. Under the project Noise-Control and Decision-Control rules, a small latency gain cannot be retained when reliability is not robust.

## Production decision

C0269 establishes the production request-scheduling rule:

- maximum two cold Edge requests concurrently on the current V3 FPL page;
- Gameweek catalog and default workspace may start together;
- actual/live is requested explicitly only after the workspace/catalog Gameweek identity is established;
- cross-Gameweek actual/workspace truth remains fail-closed;
- no retry masking was added;
- no auth gate was weakened;
- C0268 credential parity/decoded-claims protection remains active;
- V2 remains untouched and available as rollback/fallback.

This is a serving/reliability change only. It has no model, optimizer, historical forecast, or FPL decision-semantic effect.

## Evidence

C0269 branch: `c0269-v3-reliability-rollback`

PR #25: `C0269: rollback unsafe V3 cold-start concurrency`

PR head: `9fb9abdb124f9a70081ffaa1dde9f3c6861c6bee`

PR CI run: `34777906940` — **PASS**

Merged production commit: `1a7fffa39bb600173bd83f7d45c5e12b167546bb`

Production Pages run: `34778026055` — **SUCCESS**

The production run passed every gate:

- V2 typecheck, unit tests, build and bundle budget;
- V3 semantic contract;
- V3 typecheck/build;
- serving-parity gate;
- live public-client smoke with credential parity/claims protection;
- V2 E2E/accessibility;
- V3 responsive semantic E2E/accessibility;
- Pages artifact verification and V2 rollback isolation;
- GitHub Pages deployment;
- deployed legacy root, `/v2/` and `/v3/` entrypoint verification.

The bounded-concurrency live smoke also passed on PR #25 before merge. It confirmed GW4 `POST_DEADLINE_ACTIVE`, actual submission `VERIFIED`, 11 XI + 4 bench, `execution_authorized=false`, 20 recommendation evidence rows, 9 finished + 1 future fixture, 15 finalized actual rows, and `historical_forecasts_rewritten=false`.

## Governance

`public.change_tracker_working` now records C0269 as `Completed / Verified` with production run `34778026055` attached.

After closeout:

- tracker governance: `ok=true`;
- bad change IDs: 0;
- completed-not-verified: 0;
- completed-without-refs: 0;
- decision rows without refs: 0;
- consumption-contract violations: 0;
- cached GW4 diagnostics governance: `ok=true`.

C0268 remains historically `Completed / Verified` because it genuinely shipped and passed its original acceptance gate, but its three-way request-scheduling behavior is **superseded** by C0269 and is no longer the production baseline.

## Permanent lesson

A performance change is not production-worthy merely because a controlled latency A/B is positive. For networked serving paths, robustness must include repeated availability behavior under realistic cold/concurrent conditions. If a latency improvement introduces material reliability uncertainty, reliability wins and the optimization must be rejected or rolled back.

Future V3 latency work must begin from the C0269 bounded-concurrency baseline, use a new change ID, compare against ROLL/no-change, preserve all semantic/auth/history gates, and demonstrate a robust edge across plausible runtime conditions before promotion.
