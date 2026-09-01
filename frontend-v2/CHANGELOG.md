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
