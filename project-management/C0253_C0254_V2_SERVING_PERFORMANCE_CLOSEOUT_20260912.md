# C0253 / C0254 — v2 Serving Performance Closeout

Date: 2026-09-12
Status: Completed / Verified
Model effect: None — serving and browser-cache behavior only

## Problem

The v2 website felt slow because identical API reads were repeatedly fetched across routes and hard reloads, while the largest current-GW endpoint (`fpl-api`) serialized internal model feature blobs that the public UI did not consume.

## C0253 — Browser/API cache reuse

Implemented one canonical React Query key per API/GW, shared across Home and FPL, plus bounded persisted cache hydration in localStorage.

Production behavior:
- successful API data remains fresh for 60 seconds;
- stale data renders immediately and revalidates in the background;
- persisted API snapshots are reusable for up to 15 minutes across hard reloads;
- Home → FPL reuses the same `fpl-api` and manager-plan query instead of requesting duplicates;
- browser fetch no longer forces `cache: no-store`;
- focus does not force refetch; reconnect may revalidate;
- persistence is acceleration only and fails open to live API loading if browser storage is unavailable.

Verification:
- Pages run 803 / `34662743093`: SUCCESS;
- functional E2E proves Home → FPL navigation and a hard reload reuse the same FPL and manager-plan responses;
- change tracker and C0213 consumption governance are green.

## C0254 — Cold-load projection payload compaction

### Root cause

For projection run 1362, the 604 `model_predictions` rows contained approximately:
- 2,225,152 bytes of internal `features` JSON;
- 2,661,456 bytes total serialized prediction-row JSON;
- only ~427,568 bytes when the raw `features` field is excluded.

The v2 UI needs explicit public fields such as xPts, expected minutes, haul probabilities, q90/q95 and distribution semantics, not the full feature manifest.

### Fix

Created `public.fpl_public_projection_payload_v01`, a serving-only view exposing only the UI-required projection fields. q90/q95, distribution version and tail semantics are extracted from the immutable stored feature JSON inside Postgres, while the raw feature blob never crosses PostgREST into the Edge function.

`fpl-api` v16 now reads that compact view. Its response explicitly states `internal_feature_blobs_serialized:false`.

The browser cache buster advanced to `c0254-v1`, causing clients to discard the older oversized persisted response once and then resume normal bounded reuse.

### Integrity proof

Run 1362 parity across 604 players:
- core projection mismatch: 0;
- q90 mismatch: 0;
- q95 mismatch: 0;
- distribution-version mismatch: 0;
- tail-semantics mismatch: 0.

Payload measurements:
- compact projection view: 558,708 bytes;
- live `fpl-api` response: 666,942 bytes;
- prior live response: approximately 2.52 MB;
- live response reduction: approximately 73.5%;
- prediction DB → Edge payload reduction: approximately 79% versus the former full rows.

A production E2E guard (`c0254-fpl-payload.spec.ts`) requires:
- no player `features` objects in public squad/full-pool payloads;
- 15-man squad and >=500 full-pool projections still populated;
- serving semantics declare internal feature blobs absent;
- live response body remains below 1.5 MB.

## Final verification

GitHub Pages run 812 / `34708539616`: SUCCESS.
- 114 E2E/accessibility tests passed;
- 42 skipped;
- 0 failed;
- typecheck, unit tests, build and bundle budget green;
- artifact integrity green;
- Pages deployment green;
- live legacy root and `/v2/` integrity green.

C0213 behavioral consumption remains 14/14 green. Change-tracker governance and consumption governance both report zero violations.

## Production references

- `public.fpl_public_projection_payload_v01`
- `fpl-api` v16
- migration commit `e7d305734fe5ae842924d8d0a4493e285c160267`
- Edge-function commit `a168222a7e5d0e84d81bd6c16ca813243bd0609c`
- cache-buster commit `5fc89c20ce5d0f43068ded581f8aef519b9de123`
- Pages run `34708539616`

## Integrity statement

C0253/C0254 do not change model calculations, forecasts, expected points, tail probabilities, tactical inputs, manager decisions, transfer recommendations, captaincy, chips or historical snapshots. They change only how already-computed data is served and reused by the website.
