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
