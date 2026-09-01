# C0162 — Persistent pre-match fact engine

## Objective
Build a chronology-safe fact layer that refreshes after each final EPL gameweek and supplies concise human-language evidence to fixture cards and full evidence to the matchup modal.

## Production architecture

### Canonical match layer
`private.c0162_canonical_team_epl_matches_v01`

Source hierarchy:
1. official result / Understat result consistency is checked; official FPL remains authoritative for current result audit,
2. Understat supplies xG when available,
3. FPL core / football-data supply shots only as supplemental fields,
4. missing values remain null and are never coerced to zero.

### Append-only snapshot tables
- `public.team_fact_snapshot_runs`
- `public.team_fact_snapshots`
- `public.team_recent_epl_result_snapshots`
- `public.fixture_fact_candidates`
- `public.fact_templates`
- `public.c0162_fact_refresh_events`

Every refresh creates a new immutable snapshot run. Historical fact runs are not rewritten.

### Refresh functions
- `private.refresh_c0162_team_fact_layer_v01(gw)` — builds raw facts/candidates.
- `private.c0162_apply_candidate_alignment_v01(run_id)` — marks `SUPPORTS`, `CONTRADICTS`, `NEUTRAL` and ranks card facts.
- `private.refresh_c0162_team_fact_layer_v02(gw)` — production wrapper.
- `private.c0162_fact_layer_status_v01()` — audit/status.

### Automatic post-GW ingestion
`trg_c0162_final_result_refresh` fires when a `gameweek_result_runs` row becomes final. It calls the v02 refresh. Failures are caught and written to `c0162_fact_refresh_events`; the fact layer cannot block core result ingestion.

## Fact families
Implemented rolling L5/L10 and home/away facts for goals, xG, shots, clean sheets, scoring blanks and W/D/L rates. Implemented streaks for unbeaten, winning, winless, losing, scoring, failing to score, conceding and clean sheets.

Possession-based fact generation is explicitly excluded.

Fixture candidate rules prioritize:
1. combined attack-vs-defence xG contrast,
2. opponent scoring weakness vs favourite clean-sheet strength,
3. meaningful streaks,
4. two-sided home/away form when sample thresholds are met.

Supporting and contradictory facts are separated. Expanded cards only consume `SUPPORTS`; counter-evidence stays available in the modal.

## UI
`fixture-facts-api` exposes the exact stored fact snapshot for the selected GW.

`ui-v15.js` / `ui-v15.css`:
- fixture collapsed by default,
- last five EPL W/D/L dots shown under each club,
- tapping a result dot shows score/opponent/date,
- expansion shows at most three ranked one-line supporting facts,
- clicking the fixture still opens the matchup modal,
- modal prepends a short evidence-based match story and lists supporting/counter/neutral evidence.

## Initial backfill / QA
- GW2 snapshot run 2 is current for GW3.
- 1,148 team facts across all 20 teams.
- 91 available last-five result rows (promoted sides legitimately have fewer recent PL observations in the available history).
- 33 GW3 candidate facts across all 10 fixtures.
- 20 candidates align with the current prediction; 13 are retained as counterpoints.
- 15 card rows across 9 fixtures; no weak fact is forced merely to fill three slots.
- 0 possession facts.
- 0 target-fixture leakage rows.
- 0 card rows with contradictory alignment.
- 40/40 current-season canonical result rows match official FPL scores.

Example Arsenal–Chelsea card facts:
1. Chelsea failed to score in 4/10; Arsenal kept 7 clean sheets in 10.
2. Arsenal 1.99 xG per match vs Chelsea 1.31 xGA.
3. Arsenal won their last 7 PL matches.

Example Liverpool–Ipswich red-team behavior:
- Liverpool's 19-match scoring streak supports the call and may appear on the card.
- Liverpool's winless streak is classified as a counterpoint and remains in the modal rather than being presented as a reason to back Liverpool.
