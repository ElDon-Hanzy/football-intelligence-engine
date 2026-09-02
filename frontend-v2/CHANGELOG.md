# Football Intelligence Engine — UI v2 Changelog

Append-only implementation narrative for C0168 and child batches.

## 2026-09-02 — C0168 Program initialized
- Registered umbrella program C0168 and child batches C0169–C0176 in the production change tracker.
- Added the master rebuild plan and batch acceptance gates.
- Architecture direction: React + TypeScript + Vite, strict runtime API validation, component-scoped design system, Playwright/Vitest/accessibility/visual-regression QA.
- Production legacy UI remains the active rollback target.
- No model, API or historical forecast changes.
- Implementation has not started; next batch is C0169.

## 2026-09-02 — C0169 Foundation completed
- Created the isolated `frontend-v2/` React 19 + TypeScript 7 + Vite 8 application.
- Added strict TypeScript, Zod production-API contracts, TanStack Query configuration, design tokens and accessible primitive foundations.
- Added Vitest + Testing Library unit tests and Playwright + axe browser/accessibility smoke tests at 390×844, 430×932 and 1366×768.
- CI failures were treated as gates, not bypassed: fixed exact-optional Playwright config/CSS typings, then isolated Vitest and Playwright discovery before deployment.
- First full green parallel deployment: workflow run `33566039232`.
- Committed deterministic `package-lock.json` as `ca5d76e8dce349b5793f6c643a9246401c61ad33`.
- Permanent Pages pipeline now uses Node 24, npm cache, `npm ci`, strict typecheck, unit tests, build, Chromium E2E/axe smoke and read-only repository permissions.
- Final deterministic deployment: workflow run `33566483888`, commit `b518dd0b90d6761540642448678ad96d2fadd0b2`.
- Pages artifact verified: legacy root `index.html` Git blob `09745c497dfd824cdc0c3306535aad3737558844` exactly matches the release commit; `/v2/` contains compiled `index.html` plus hashed JS/CSS assets; `frontend-v2/` source is excluded from the public artifact.
- No model, API, database or historical forecast changes.
- Rollback remains the unchanged legacy root site. Next batch: C0170 app shell/navigation/Home.

## 2026-09-02 — C0170 App shell and Command Center completed
- Replaced the v2 scaffold with a responsive application shell, desktop rail, mobile bottom navigation, gameweek routing, deterministic loading/error states and a decision-first Home surface.
- Home reads the saved manager-plan truth rather than reconstructing transfer/chip/risk decisions from projection data; stale saved plans are labelled instead of being presented as fresh recommendations.
- Added 390×844, 430×932, 768×1024 and 1366×768 browser coverage, visible 44px navigation-target checks, horizontal-overflow checks and axe WCAG A/AA checks.
- Accessibility QA found a real 3.78:1 primary-action contrast defect; the action token was darkened to `#216fcf` and the unchanged axe gate then passed at approximately 4.95:1.
- Full green implementation/deployment gate: workflow run `33570349729`, final runtime commit `08221ac87a934aaf4818d721545b0ee7f27f63d5`.
- Known limitation: Fixtures, FPL detail, Performance and Engine remain bounded placeholders until their dedicated batches.
- Rollback remains the unchanged legacy root site; v2 remains isolated under `/v2/`.

## 2026-09-02 — C0177 Authoritative manager-plan read contract completed
- C0170 exposed that `fpl-api` does not carry transfers, chip, risk or current manager-plan status; the frontend was prevented from defaulting missing fields into a false HOLD decision.
- Added read-only `fpl-manager-plan-api` v1 over `fpl_manager_plans`, returning the latest stored plan for a requested GW or explicit null when absent.
- The endpoint is JWT-protected at the Supabase gateway; the browser uses only the public anon credential while service-role access remains server-side.
- Added runtime Zod validation and a production live-contract smoke test for GW3 manager-plan id 3.
- Endpoint source/config commits: `0cef65ff15f07e1242ce8f7534d6c6f25d62c00a` and `4d1c523839161f0ec5b6ca6550d86fa6976fddcf`; live smoke introduced in `6404e713ea983e72f4d68c863ce0bcaec654cb34` and passed in C0170 workflow `33570349729`.
- No manager-plan, model, forecast or historical rows were mutated.
- Rollback: Home fails closed to an unavailable/stale decision state if this read contract is unavailable.

## 2026-09-02 — C0178 Deterministic production fixture selector completed
- C0171 contract audit found equal-time C0159 parent and C0166 child fixture snapshots could produce contradictory prediction and evidence contracts. Fulham–Crystal Palace was the concrete failure case.
- Added `current_production_fixture_prediction_v01`, selecting exactly one pre-kickoff snapshot per match by `captured_at DESC, id DESC`; no forecast row is rewritten or deleted.
- Rewired live evidence alignment to the same selector, upgraded `fpl-api` to v10 and `fixture-facts-api` to v3, and exposed snapshot ID/source Change ID on both read contracts.
- Added a fail-closed live parity gate comparing snapshot ID, source Change ID and all three 1X2 probabilities for every GW3 fixture. It explicitly verifies Fulham–Palace resolves to the C0166 near-tie rather than the C0159 parent.
- The first parity run correctly exposed nullable historical `opponent_team_id` values in form history; the contract was fixed to preserve null rather than manufacture an ID.
- C0167 post-change audit remained clean: 10/10 GW3 fixtures, 0 hard violations; Fulham–Palace remains non-categorical at a 0.74pp gap.
- Full green implementation/deployment gate: workflow run `33571479835`; contract fix commit `c293914c5b7a0d4e6a924c10e3ac5efbf851b083`.
- Known limitation: C0178 only establishes deterministic read truth; the new scan-card UX itself remains C0171 work.
- Rollback: the underlying append-only prediction snapshots are unchanged; consumers can revert to the previous read path without data migration.

## 2026-09-02 — C0171 Fixtures scan surface completed
- Replaced the Fixtures placeholder with a compact decision-first scan across all authoritative fixtures for the selected Gameweek.
- Presentation semantics are explicit and non-model-changing: `Strong` at an 8pp-or-greater lead over the second-most-likely 1X2 outcome, `Lean` at 4–8pp, and `No clear edge` below 4pp.
- Cards show 1X2 state, selected score call/probability, all three 1X2 probabilities, last-five league form, and finished-match 1X2/exact-score audit without exposing the C0172 deep modal yet.
- Last-five form controls are keyboard/touch accessible with minimum 44px targets and disclose the selected historical result instead of relying on hover-only tooltips.
- Expanded evidence is capped at three distinct families/texts and is rendered only when `fixture-facts-api.alignment_basis.snapshot_id` matches the prediction snapshot from `fpl-api`; mismatch fails closed and hides supporting evidence.
- Fulham–Crystal Palace and Newcastle–Bournemouth naturally exercise the no-edge state; Forest–Spurs exercises the lean state while stronger favourites remain strong calls.
- Initial CI correctly failed strict TypeScript because chained array sorting widened outcome literals to `string`; the helper was fixed without changing thresholds or semantics in commit `8fe5ef58379eba1c7a09c1cd711d6af495d06ee2`.
- Full green release gate: strict TypeScript, unit tests, production build, Chromium interaction tests, 390×844 / 430×932 / 768×1024 / 1366×768 responsive coverage, no-horizontal-overflow checks, axe WCAG A/AA/2.1 AA/2.2 AA checks, and existing live API parity/contracts all passed in workflow `33572072004`.
- Deployed under the parallel `/v2/` route; legacy root remains the rollback target and no model/forecast/history rows were changed.
- Known limitation: detailed matchup story/support/counter-evidence modal remains intentionally out of scope until C0172.

## 2026-09-02 — C0172 Matchup modal and evidence narrative completed
- Added an atomic portal-owned matchup dialog that opens only when the prediction and evidence payloads are already aligned to the same canonical fixture snapshot; stale/mismatched evidence keeps the action disabled.
- The modal presents the 1X2 thesis and score call first, then a deterministic match story derived from probability separation and counts of distinct signed supporting/counter inputs. The story intentionally does not copy evidence one-liners verbatim.
- Supporting inputs and counterpoints are independently deduplicated and capped at three per group so a large support set cannot crowd out a valid risk signal; neutral context is shown separately when available.
- Raw score-mode and selector audit details are kept behind a keyboard-accessible `Technical details` disclosure rather than dominating the football decision surface.
- The dialog uses one React render-ownership path with body scroll lock/restore, previous-focus restore, Escape/backdrop/close-button dismissal, focus trapping and keyboard-reachable `<summary>` disclosure.
- Mobile renders as a bounded bottom sheet; desktop/tablet render as a centered dialog. All layouts prevent horizontal overflow and respect safe-area padding.
- Full green release gate: strict TypeScript, unit tests, build, 390×844 / 430×932 / 768×1024 / 1366×768 browser interaction tests, focus/scroll lifecycle, all three close paths, modal and page axe WCAG A/AA/2.1 AA/2.2 AA checks, existing live API contracts and Pages deployment passed in workflow `33572813192` for commit `17e3c2e5f3f328cc3c5889c3d90945be06e461f8`.
- No model, probability, manager-plan or historical rows were changed; legacy root remains the rollback target.
- Next batch: C0173 FPL decision-first workspace.

## 2026-09-02 — C0179 FPL manager-state and direct distribution read contract completed
- C0173 contract audit found that free transfers and bank were not stored as structured manager state, while C0160 q90/q95 lived only inside nested `features.point_distribution` JSON. The frontend was not allowed to reconstruct either silently.
- Added append-only `fpl_manager_state_snapshots`. The GW3 seed is provenance-bearing: free transfers are `2` only because the latest saved manager-plan decision explicitly says to preserve both free transfers; bank is `£0.0m` only because all 15 active squad members remain tagged as the GW1 initial squad, all 15 have GW1 acquisition prices, and those prices sum exactly to the £100.0m initial budget. If those evidence gates fail, values remain null.
- Upgraded `fpl-manager-plan-api` to v2 so a requested GW returns `manager_state` beside the immutable saved plan. No plan row is modified.
- Upgraded `fpl-api` to v11. Squad, full-pool and top-tail rows now expose current FPL price/ownership/status plus direct `q90`, `q95`, distribution version and tail semantics derived from C0160 `features.point_distribution`; the API does not reinterpret legacy `ceiling_score` as a percentile.
- Runtime Zod contracts now type manager state and direct distribution fields. Live tests require non-null q90/q95 for every GW3 squad member, q95 ≥ q90, `tail_semantics=direct_current_fixture_event_distribution`, current price/ownership, and manager state `2 FT / £0.0m / £100.0m acquisition cost` with source `C0179_DERIVED_AUDITED_MANAGER_STATE_V1`.
- Database migration is recorded at `supabase/migrations/20260901235700_c0179_fpl_manager_state_snapshots.sql`; edge source commits are `257145b0f8bbb9f69a4974906b13c0415e441e45` and `86e33b18504a3d2a8fccf6016b8fb7b288b46160`; runtime contract/live-gate commits are `5b3309cb3843928bf0f44becb1c0c6ff2e630a8f` and `9693d019e941ac015e1f2700b3b5b0a33cdfc8d0`.
- Full green release gate including live production contracts and Pages deployment passed in workflow `33573571580`.
- No FPL projection, probability, historical result or saved manager-plan row was recalculated or rewritten. Missing manager state remains null rather than zero.
- C0173 can now remain frontend-only.

## 2026-09-02 — C0173 FPL decision-first workspace completed
- Replaced the FPL placeholder with a decision-first workspace whose top surface is the authoritative saved manager plan: HOLD/TRANSFER state, free transfers, bank, chip, risk, saved captain/vice-captain and the complete saved XI/bench.
- The latest projection run is visibly separated from the manager decision with its own run ID/timestamp and explicit wording that it is analysis only; a newer model snapshot never silently supersedes the saved plan.
- Saved XI and bench retain manager-selection truth while current player cards layer in latest xPts, xMin and price. Unknown saved player IDs are retained visibly rather than dropped if projection data is incomplete.
- Captaincy cards expose xPts/xMin plus P10+, P15+, q90 and q95 only when `tail_semantics=direct_current_fixture_event_distribution`; no legacy `ceiling_score` fallback or ceiling terminology is used.
- Full-pool projection leaders are deliberately secondary behind a disclosure and are labelled as model rankings, not transfer recommendations.
- Missing manager state fails closed: null FT/bank render as unavailable and are never coerced to `0 FT` or `£0.0m`.
- CI caught two stale tests left from the old placeholder route and then a real 390px horizontal-overflow defect. The test assertions were updated without weakening the gate; the narrow FPL intro/status composition was stacked at ≤430px rather than clipping or hiding overflow.
- Full green release gate passed in workflow `33575126830`: strict TypeScript, 17 unit tests, production build, 32 Playwright cases across 390×844 / 430×932 / 768×1024 / 1366×768, zero horizontal overflow, axe WCAG A/AA/2.1 AA/2.2 AA checks, fail-closed manager-state test, existing Fixtures/modal/Home regressions, live C0178 fixture parity, live C0179 manager-state/direct-tail contracts, and GitHub Pages deployment.
- Runtime implementation began at `49e1a83941fdf5e753c7cb91f29fbd9b62a81cb0`; test-harness corrections are `ff0f1f02bde611afabdbf0d3ba7d5ee39fc62c31`, `c56c24329b2e343f1e3b997aac722634102b2538` and `68df689a7364a1d5f0e9abe4b338a4d4cef72e0c`; the narrow-mobile composition release is `b1f753e8ac44c1a5fb42fda18301da907fef04b5`.
- No model, projection, historical forecast or saved manager-plan row was changed. Legacy root remains the rollback target and v2 remains isolated under `/v2/`.
- Next batch: C0174 Performance and Engine surfaces.

## 2026-09-02 — C0180 Engine diagnostics read contract completed
- Added read-only `engine-diagnostics-api` for UI v2, exposing active model identity, current production fixture layer, tracker governance, C0167 decision/evidence audits, A0005/W0002 validation state, C0139 source/FotMob status and C0140 physical-load status.
- Private status functions remain private. A public read-only SECURITY DEFINER wrapper is the only database bridge used by the Edge Function, avoiding unsupported direct private-schema RPC assumptions.
- Research-only states remain explicitly labelled and missing metrics remain null.
- Source commits include `7194051de00778a50f5aed4c6ddafa9654954995` and hardened wrapper consumption in `83f583e69db7969846dd51af603efa16f369885e`.
- Live C0180 contract checks passed in the C0174 release workflow `33595103796`. No model or historical data was mutated.

## 2026-09-02 — C0181 Betting API canonical fixture alignment completed
- Rewired `betting-api` to `current_production_fixture_prediction_v01`, the same canonical selector used by Fixtures and evidence, preventing equal-timestamp parent/child prediction drift in Markets.
- The betting contract now exposes the canonical snapshot ID and source Change ID used for every fixture comparison.
- Endpoint implementation commit: `7790b3fab522d72d6d81969cc63b12de7f6b8bee`; live parity gate commit: `d6d51f0acf59897db77ba9f8585d409d8a4feb57`.
- Live C0181 tests verify betting predictions match the canonical production selector and continue to fail closed on validated value. No odds, model or historical rows were recalculated.

## 2026-09-02 — C0174 Markets, Performance and Engine/Research completed
- Replaced the remaining analysis placeholders with three deliberately separated surfaces: Markets for model-vs-price context, Performance for sample-first validation, and Engine/Research for technical diagnostics.
- Markets keeps the action layer fail-closed as `NO VALIDATED BET EDGE`; unvalidated positive-EV research is disclosed as research only and never styled as a production betting recommendation.
- Performance prioritizes evaluated sample size, direction/Brier/log-loss and pending TEST status. Missing or unevaluated metrics stay blank/pending rather than being converted to zero.
- Engine/Research houses model identity, current production layer, source health, governance and frozen experiments away from the core decision flow; research states are visibly distinct from production effects.
- Contract audit discovered and split C0180/C0181 rather than hiding backend gaps inside the frontend batch.
- QA caught three classes of release blockers and all were fixed without weakening gates: duplicate Playwright locators, a duplicated validation-variant assertion, and a genuine WCAG keyboard-access defect on the horizontally scrollable Performance table.
- The Performance table is now an explicitly labelled focusable region with a visible focus ring, and browser tests verify it receives keyboard focus before axe runs.
- Final release commit: `de7e6f4286b78781a68636c142a7c5aa1188a4bf`. Full green release/deployment workflow: `33595103796` across 390×844 / 430×932 / 768×1024 / 1366×768, strict TypeScript, unit tests, build, live contracts, no-horizontal-overflow checks and axe WCAG A/AA/2.1 AA/2.2 AA.
- No model, probability, FPL manager decision or historical forecast was changed. Legacy root remains the rollback target; v2 remains isolated under `/v2/`.
- Next batch: C0175 full-system QA and parity gate.

## 2026-09-02 — C0175 expanded regression gate increment
- Existing C0175 work already on `main` added fail-closed malformed-contract coverage, enforced JS/CSS bundle budgets, and 24 deterministic full-page visual baselines covering Home, Fixtures, FPL, Markets, Performance and Engine at 390×844 / 430×932 / 768×1024 / 1366×768.
- Expanded the QA-only browser gate to exercise every shell navigation path, browser back/forward transitions, deterministic loading-to-error behavior on all six surfaces, safe-area CSS presence, route-by-route horizontal-overflow resilience and 44px touch targets.
- CI correctly rejected two bad desktop assumptions in the new test harness; the selectors were fixed to distinguish the desktop `Engine` nav item from the mobile/tablet `Engine and research` shortcut without changing product code.
- Verified QA implementation commit: `9294b1239047553a9a40a4c934e4f66f2623e5c5`. Workflow `33598221851` completed and deployed successfully; typecheck, 17/17 unit tests, build, bundle budgets, all new navigation/loading/safe-area checks, all locked visual hashes, existing axe gates and Pages deployment passed.
- Detailed Playwright output was `82 passed / 21 skipped / 1 flaky`: the live GW3 FPL contract endpoint returned non-OK on its first request and passed on retry. This is not accepted as the final C0175 release condition; a later full-system run must clear the live-runtime gate without flakes before C0175 can become Verified.
- No UI feature, model output, probability, manager decision or historical forecast was changed. C0175 remains `In Progress / Executing`; legacy root remains the rollback target.

## 2026-09-02 — C0175 Pages recovery and rerun-safety
- A user-visible 404 was reported after the artifact-integrity batch even though workflow `33598656864` attempt 1 had completed with `83 passed / 21 skipped / 0 flaky`, artifact integrity and successful live probes for the legacy root, `/v2/`, and the compiled JavaScript asset.
- A forced recovery rerun reproduced a deployment-layer defect: GitHub retained the attempt-1 `github-pages` artifact, the rerun uploaded another artifact with the same name, and `actions/deploy-pages@v4` failed because two matching artifacts existed.
- Fixed Pages artifact naming to include `github.run_attempt` for both upload and deployment in commit `e3c08368fa98f4a39b8886948de36822dc8f4854`, making reruns unambiguous without changing application code.
- Fresh workflow `33599269782` passed strict TypeScript, 17 unit tests, production build, bundle budgets, the full Playwright/axe/visual/live-contract gate with `83 passed / 21 intentionally skipped / 0 flaky`, artifact integrity, Pages deployment, and post-deploy live HTTP verification for the unchanged legacy root, `/v2/`, and compiled JavaScript asset.
- Legacy root remains Git blob `09745c497dfd824cdc0c3306535aad3737558844`. No model output, probability, forecast, manager plan, fixture history or validation lineage changed. C0175 remains `In Progress / Executing` pending final closure review.

## 2026-09-02 — C0175 final closure review passed
- Re-ran the formal production closure audits immediately before closure. `private.c0166_production_evidence_audit_v01(3)` and `private.c0167_decision_evidence_audit_v01(3)` both returned `ok=true`; GW3 remained 10/10 fixtures with zero hard violations, zero target/actual leakage and zero research mutation.
- `private.audit_change_tracker_governance_v01()` returned `ok=true` with 108 tracker rows and zero bad IDs, zero completed-but-unverified rows, zero completed rows without references and zero decision rows without references.
- A0005 remained integrity-clean with GW2 validation complete and GW3 TEST untouched; W0002 remained integrity-clean and observational with no evaluations yet. No tuning or historical mutation was performed.
- Detailed logs for current-main workflow `33599777475` confirmed the strict full-system gate at `83 passed / 21 intentionally skipped / 0 flaky`, plus 17/17 unit tests, strict TypeScript, production build, locked responsive visual hashes, bundle budgets, live API contracts, accessibility checks, artifact verification and successful Pages deployment.
- The post-deploy HTTP integrity probe verified the live legacy root byte-equals repository `index.html`, live `/v2/` byte-equals the built `dist/index.html`, the emitted JavaScript asset is non-empty, and frontend source is not publicly deployed.
- Legacy rollback remains hard-locked to Git blob `09745c497dfd824cdc0c3306535aad3737558844`. C0175 satisfies the C0168 exit criteria: zero known P0/P1 defects, automated WCAG gate green, target viewports approved by deterministic regression hashes, and authoritative parity checks green.
- No model output, probability, manager decision, forecast history, validation cohort or fixture history was changed. C0176 root cutover remains a separate explicitly approved action.