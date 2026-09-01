# C0168 — UI v2 Clean Rebuild Program

## Objective
Rebuild the Football Intelligence Engine frontend from scratch as a parallel modern application while keeping the current production UI live and rollback-capable until explicit cutover.

The rebuild is frontend-only unless a separately tracked API/backend change is required. Models, frozen forecasts, prediction history and production probabilities are out of scope.

## Core architecture
- React + TypeScript + Vite, using latest stable compatible versions at implementation time.
- Strict TypeScript; no `any` without explicit documented exception.
- Runtime API schema validation (Zod or equivalent) so UI failures are explicit rather than silently rendering wrong data.
- TanStack Query or equivalent for request caching, dedupe, retries and stale-state control.
- CSS custom-property design tokens + component-scoped styles. No cascading version-stack overrides.
- Accessible primitives for dialog, tabs, disclosure and menus; WCAG 2.2 AA target.
- Mobile-first layouts with deliberate breakpoints at 390, 430, 768 and 1366 reference widths.
- Safe-area support and minimum 44px interactive hit targets.
- Atomic modal rendering: payload/skeleton -> one render owner -> open. No post-open DOM injection.
- Error boundaries, deterministic loading states and no content-to-content flicker.
- Existing production APIs remain authoritative; the frontend does not recreate model decisions unless a documented presentation rule requires it.

## Test strategy
Every batch must include tests relevant to its scope before it can be Verified:
- Vitest + Testing Library for component/unit behavior.
- Playwright for end-to-end interactions.
- Automated accessibility checks using axe-core or equivalent.
- API contract fixtures/mocks via MSW or equivalent.
- Visual regression screenshots at 390x844, 430x932, 768-class tablet and 1366x768.
- Console-error and horizontal-overflow checks.
- Interaction checks for touch targets, modal background lock, focus trapping, Escape/backdrop/close, bottom safe area and responsive navigation.
- Current-production-data parity checks against authoritative APIs.

## World-class UX principles
1. Decision first, diagnostics second.
2. Progressive disclosure: scan -> expand -> deep modal -> engineering diagnostics.
3. Strong call / lean / no meaningful edge are first-class states.
4. Facts shown near a decision must explain or materially challenge that decision.
5. No duplicate evidence family/text within a decision surface.
6. Model thesis is visually distinct from observed football evidence.
7. Missing is never rendered as zero.
8. Research-only signals cannot look production-active.
9. No hidden horizontal scroll on primary mobile flows.
10. One source of truth per interaction.

## Batch execution discipline
To avoid timeouts and half-applied work:
- Work on exactly one Change ID/batch at a time.
- A batch should normally touch one architectural layer or one primary user surface.
- Register tracker state before code changes.
- Commit small coherent increments; never wait for a giant end-of-batch commit.
- After each implementation increment run only the focused tests for that increment.
- At batch end run the batch acceptance suite, then update tracker + changelog.
- If a batch exposes an API/backend gap, stop and create a separate Change ID; do not expand scope silently.
- Never mark a visual/interaction change Verified solely because deployment succeeded.
- Current root site remains rollback target until C0176 is complete.

## Batch roadmap

### C0169 — Foundation, design system, parallel deployment
Scope: project scaffold, strict TS, tokens/primitives, API client/schema layer, test harness, isolated `/v2/` deployment.
Exit: `/v2/` loads independently; legacy root behavior unchanged; build/type/test pipeline passes.

### C0170 — App shell, navigation, command-center Home
Scope: responsive shell/nav, safe areas, loading/error architecture, decision-first Home.
Exit: 390/430/768/1366 layouts pass; 44px targets; no horizontal overflow; Home surfaces only actionable intelligence.

### C0171 — Fixtures scan surface
Scope: compact fixture cards, 1X2 semantics, score call, last-five form, expandable 1–3 facts.
Exit: current GW renders from authoritative API; strong/lean/no-edge states correct; facts deduped and signed.

### C0172 — Matchup modal
Scope: match story, supports/counters/context, progressive technical details, modal lifecycle.
Exit: atomic open, stable skeleton when needed, focus/scroll/fallback states correct, story does not repeat evidence verbatim.

### C0173 — FPL decision-first workspace
Scope: authoritative manager action, XI, bench, C/VC, transfer alternatives, distribution metrics and full-pool detail.
Exit: top viewport answers the weekly decision; raw optimizer is clearly secondary; genuine distribution terminology used.

### C0174 — Markets, Performance, Engine/Research
Scope: betting/market view, performance metrics, research/governance diagnostics.
Exit: decision, validation and engineering information are visually separated; empty diagnostics collapse cleanly.

### C0175 — Pre-cutover QA gate
Scope: accessibility, API contract, responsive visual regression, interaction, performance budgets and legacy-v2 parity.
Exit: zero known P0/P1 defects; core WCAG 2.2 AA automated checks pass; target viewport screenshots approved; parity checks pass.

### C0176 — Controlled cutover and rollback window
Scope: promote v2 to root, preserve legacy rollback snapshot, post-deploy smoke/monitoring.
Exit: explicit user approval, verified root deployment, rollback proven, stabilization complete before legacy retirement.

## Performance budgets
Initial target budgets; adjust only with evidence:
- No route-level JS chunk should become unnecessarily monolithic; use route/lazy loading for heavy diagnostics.
- No layout shift caused by async card/modal hydration.
- Core mobile interaction should remain responsive under typical Android hardware.
- Avoid decorative libraries/components that materially inflate bundle cost without UX value.

## Security/data rules
- No secrets in client bundle.
- Public endpoints only from browser.
- Runtime schemas reject malformed/ambiguous payloads.
- Historical and frozen forecast semantics remain unchanged.
- UI never writes model state unless an explicitly authorized future workflow exists.

## Changelog policy
`frontend-v2/CHANGELOG.md` is append-only during the rebuild. Every completed implementation increment records:
- Change ID / batch
- date/time
- commit/deployment reference
- what changed
- tests executed
- known limitations
- rollback note

Tracker remains the formal governance ledger; the changelog is the implementation narrative.

## Cutover rule
There is no automatic cutover. C0176 requires explicit user approval after C0175 passes and after the user has inspected the parallel v2 experience.