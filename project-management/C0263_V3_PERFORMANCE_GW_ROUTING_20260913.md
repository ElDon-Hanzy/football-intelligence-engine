# C0263 — V3 Performance & Gameweek Routing

Status: In Progress

## Problem
- V3 page navigation is materially slower than a consumer product should be.
- The app shell currently boots full workspace and forward-intelligence contracts on every initial page load.
- Matches and Markets wait for the workspace contract before requesting their own Gameweek data.
- Match cards wait for optional explanatory fixture facts.
- Current FPL waits for workspace and then actual-live sequentially.
- History receives `gw=0` when the current Gameweek is selected, allowing `fpl-api` to resolve to the latest frozen forward run instead of the visible current Gameweek.

## Guardrails
No model or optimizer changes. No historical forecast rewrite. No actual-team inference. V2 remains untouched. Optional facts may load after primary predictions but are not removed.
