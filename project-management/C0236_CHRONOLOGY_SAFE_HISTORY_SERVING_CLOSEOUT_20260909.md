# C0236 — Chronology-Safe Historical UI and Market Serving Closeout

Date: 2026-09-09
Status: **Completed / Verified**
Scope: UI v2 / serving reliability only — **no numeric forecast or model-family effect**

## Objective

Repair historical FPL/fixture presentation and historical correct-score market serving without rewriting forecasts, backfilling later information into history, or promoting research layers.

C0236 closes four linked reliability gaps:

1. historical FPL chronology had to be determined from the frozen forecast contract, not from whether a saved manager plan happened to exist;
2. historical price/ownership metadata that was not captured at the time had to remain unavailable rather than being filled with current values;
3. historical tactical evidence needed explicit coverage semantics so genuinely missing pre-kickoff evidence did not look like a product failure or get reconstructed with hindsight;
4. correct-score history serving needed a bounded cache/index path so UI market-history requests did not repeatedly aggregate the full raw chronology.

## Chronology audit

Independent production SQL audit compared role, availability, replacement, tactical-profile and matchup-signal capture timestamps with each fixture kickoff for GW1-GW4.

Result: **zero currently served post-kickoff rows** in those historical fixture-intelligence families.

Therefore no hindsight-contaminated tactical rows had to be deleted or rewritten.

The audit did reveal genuine historical coverage limitations. Most importantly, GW1 contains only **2/20 tactical team-side profiles**. That is now treated as historical evidence that was never captured, not as a reason to backfill a later tactical model state.

Permanent serving rule:

> Missing historical evidence is `unavailable`; later information is never substituted into the historical record.

## FPL API chronology contract

Production `fpl-api` now serves contract `fpl_api_v12_chronology_safe` and exposes explicit snapshot chronology semantics, including:

- `snapshot_stage`
- `historical_projection_valid`
- `historical_unavailable_reason`
- PRE-FINAL metadata
- historical price/ownership availability provenance
- per-player metadata source

Verified live matrix:

| GW | Stage | Historical forecast validity | Player predictions | Metadata semantics |
|---|---|---:|---:|---|
| 1 | `HISTORICAL_FROZEN` | false | 600 | preserved historical snapshot where available; invalid forecast fails closed |
| 2 | `HISTORICAL_FROZEN` | true | 600 | price/ownership unavailable historically; current values not backfilled |
| 3 | `HISTORICAL_FROZEN` | true | 600 | price/ownership unavailable historically; current values not backfilled |
| 4 | `PRE_FINAL` | true | 604 | current production metadata |

GW1 is deliberately not presented as genuine pre-deadline model truth because the surviving run does not satisfy the chronology requirement.

## UI v2 behavior

### FPL

`FplPage` now uses `snapshot_stage === HISTORICAL_FROZEN` to classify history. A saved manager plan can no longer make a completed Gameweek render as if it were current.

Historical invalid forecasts fail closed with an explicit chronology-protected state.

For GW2/GW3, missing historical price and ownership are labelled as not captured. Current FPL metadata is not inserted into those historical records.

GW4 explicitly shows **PRE-FINAL** and identifies the current immutable daily production snapshot. The separate final T−2h generation remains a different stage.

### Fixtures

The fixture scan now includes an explicit `Unavailable` count alongside Strong / Lean / No clear edge.

For historical Gameweeks the UI calculates evidence coverage over the expected 20 team-sides and reports tactical-profile, matchup-signal and expected-XI coverage. Partial evidence is visible and explanatory rather than silently reconstructed.

## Historical correct-score serving repair

Production now uses:

- `public.correct_score_price_summary_cache`
- `public.correct_score_price_summary` backed by that cache
- `private.refresh_correct_score_price_summary_cache_v01(gameweek)`
- `private.refresh_upcoming_correct_score_price_cache_v01()`
- cron `c0236_correct_score_price_cache` on `7,22,37,52 * * * *`
- serving indexes on chronology-valid correct-score observation/selection paths

Latest verification:

| GW | Cache rows | Matches with captured correct-score history | Bookmakers |
|---|---:|---:|---:|
| 1 | 211 | 3 | 2 |
| 2 | 676 | 10 | 2 |
| 3 | 692 | 10 | 2 |
| 4 | 686 | 10 | 2 |

The GW1 cache coverage reflects what was actually captured historically; it is not padded with invented data.

Live `betting-api` regression for GW1-GW4 returns all 10 fixtures per Gameweek, price tracking is available, and the verified runs returned **zero warnings/timeouts**.

## Public Engine Diagnostics authentication repair

The strict release gate exposed a separate browser reliability defect: the public gateway JWT embedded in UI v2 had an incorrect issuer payload and was rejected by the authenticated `engine-diagnostics-api` path.

The UI now uses the active public project anon credential, and the Playwright live contract follows the same authenticated request path as the real Engine page.

Independent verification for `engine-diagnostics-api?gw=3` returned HTTP 200, `ok=true`, `gameweek=3`.

No service-role or secret credential is committed to the browser.

## CI history

The release gate was not bypassed.

First C0236 run exposed three expected contract-test drifts after the chronology-safe product changes:

- historical FPL mocks did not yet provide the new chronology fields;
- the old live test incorrectly required current price/ownership in GW3 history;
- deterministic visual hashes had not yet been reviewed for the intentional Fixtures/FPL UI changes.

Those contracts were corrected and the stable reviewed visual changes were accepted.

A subsequent run reached 100 passing browser tests except for Engine Diagnostics, which exposed the public-auth mismatch described above. The auth path was fixed rather than weakening the test.

Final release workflow: **GitHub Actions 34329236699**.

Verified successful stages:

- TypeScript typecheck
- 21 unit tests
- production build
- bundle budget
- full Playwright E2E/accessibility gate
- Pages artifact verification
- legacy rollback artifact integrity
- GitHub Pages deployment
- deployed legacy root verification
- deployed `/v2/` entrypoint and JavaScript asset verification

## Governance / architecture proof

After production closeout:

- `private.audit_change_tracker_governance_v01()` → `ok=true`
- bad Change IDs: 0
- Completed-not-Verified: 0
- Completed-without-refs: 0
- consumption-contract violations: 0
- `private.c0213_behavioral_consumption_status_v01()` → **14/14 production-effect components passing**

C0236 consumption contract:

`EDGE_FUNCTION:fpl-api + EDGE_FUNCTION:betting-api + VIEW:public.correct_score_price_summary + UI_V2:FplPage/FixturesPage`

Contract version: `C0236_CHRONOLOGY_SAFE_SERVING_V01`.

## Integrity conclusion

- Historical forecasts rewritten: **false**
- Current metadata backfilled into history: **false**
- Served historical tactical rows captured after kickoff: **0**
- New production model family promoted: **none**
- Numeric xPts behavior changed by C0236: **no**

C0236 is **Completed / Verified**. The separate GW4 final T−2h decision refresh remains intentionally pending and is not altered by this closeout.

## Key implementation commits

- `19ac9ba111263f295fb1945d0fc033fe1ef8edd9` — chronology-safe FPL contract fields
- `9c4a5dd25956fafbde2db0cc5aeb17939640c54c` — historical fixture coverage / unavailable UI
- `a96c3cd9f8b6f8094bdc98ebeac457524ef05520` — chronology-safe FPL UI + PRE-FINAL
- `62b15bdfd4e24296a1c13582981f7a34f047ce5d` — production FPL API source mirror
- `df00666a0291489ee7259549b4d700ed452daed8` — chronology-safe historical serving-cache mirror
- `a9dcfe6040da73715910b515300cb771c0c6cc83` — historical metadata non-backfill contract
- `ebd1b5d8fbe83f04f29d87e8ba4d6e9e6f7b25d0` — reviewed visual changes
- `c8c148bab8dc44fd9c41d0b5317a9dd42c3549c9` — public gateway credential repair
- `c0f2b508623623b1aed0ccc4aadeb17dd757e682` — authenticated diagnostics live-smoke alignment
