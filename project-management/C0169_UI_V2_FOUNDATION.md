# C0169 — UI v2 Foundation, Design System and Parallel Deployment

## Purpose
Create a clean modern frontend foundation without altering the live legacy application, football models, APIs, databases, frozen forecasts or historical results.

## Delivered architecture
- React 19.2.8 + React DOM 19.2.8.
- TypeScript 7.0.2 with strict mode, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Vite 8.2.2 with relative asset base for isolated `/v2/` deployment.
- Zod 4.5.4 runtime contracts for production API payloads.
- TanStack React Query 5.102.8 request/cache foundation.
- CSS custom-property token layer for color, typography, spacing, radius, elevation and 44px minimum interaction targets.
- Safe-area-aware mobile baseline and reduced-motion handling.
- Reusable Button and Surface primitive foundations.

## Test harness
- Vitest 4.1.11 + Testing Library for unit/component behavior.
- Playwright 1.62.1 for browser interaction.
- `@axe-core/playwright` automated WCAG smoke checks.
- Browser projects: 390×844, 430×932, 1366×768.
- Foundation smoke asserts no horizontal overflow, 44px primary control target, no browser console errors and no axe WCAG A/AA findings.

## CI progression
### Initial scaffold — `04bcd39d448a37c78c5f7df1ca16c52b676148d6`
CI stopped before deployment on two strict TypeScript failures: optional Playwright worker typing and missing Vite CSS side-effect declarations. No v2 artifact was deployed.

### Strict-type repair — `78444c0574cf3f3d73d5d313d34aea915e76e945`
Typecheck passed. Vitest then correctly exposed overlapping test discovery with Playwright specs. Deployment remained blocked.

### Test-runner isolation — `a714601747a4687a94b761642bb05b89d714e2c9`
Vitest was restricted to `src/**/*.test.*`; Playwright owns `tests/`. Workflow run `33566039232` passed install, typecheck, unit tests, build, Chromium installation, three-viewport Playwright/axe smoke, staging and Pages deployment.

### Deterministic dependency lock
One-time CI bootstrap committed `frontend-v2/package-lock.json` as `ca5d76e8dce349b5793f6c643a9246401c61ad33`.

### Permanent deterministic pipeline — `b518dd0b90d6761540642448678ad96d2fadd0b2`
Temporary write permission and bootstrap step were removed. Permanent workflow uses `contents: read`, Node 24, npm cache keyed to `frontend-v2/package-lock.json`, and `npm ci --no-audit --no-fund`.

Final workflow run `33566483888` passed every stage and deployed successfully.

## Parallel Pages packaging
The Pages workflow stages the existing repository-root site unchanged and copies only `frontend-v2/dist/` into `_site/v2/`.

Final artifact `9823318167` was downloaded and inspected:
- legacy `index.html` artifact Git hash: `09745c497dfd824cdc0c3306535aad3737558844`;
- repository root `index.html` Git blob at release commit: `09745c497dfd824cdc0c3306535aad3737558844`;
- exact parity confirmed;
- `/v2/index.html` exists;
- `/v2/assets/` contains hashed JS/CSS outputs;
- no public `frontend-v2/` source directory exists in the deployed artifact.

## Rollback
No root cutover occurred. The legacy root remains both the production interface and rollback target. Removing `/v2/` from the staged Pages artifact would fully remove this batch without touching model/backend state.

## Scope integrity
Model effect: none.
Database effect: none.
API behavior change: none.
Historical/frozen forecast mutation: none.

## Exit gate result
PASS. C0169 can be marked Completed / Verified. C0170 may start from this foundation.
