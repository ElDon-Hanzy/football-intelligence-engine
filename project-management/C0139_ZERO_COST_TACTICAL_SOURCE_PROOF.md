# C0139 — Zero-cost current-EPL tactical/physical source proof

Date: 2026-08-26
Status: In Progress / Executed
Parent: C0082

## Objective

Test whether zero-cost/public sources can materially reduce the remaining C0082 tactical/spatial data gap without relabelling proxies as true tracking evidence or contaminating frozen forward-validation cohorts.

This change is research-only. It does not change A0005, E0007 or W0002, does not rewrite any historical forecast, and keeps `model_effect_enabled=false`.

## Integrity rules

- Source capability and access evidence is append-only.
- Preserve exact source URL, payload hash, `captured_at` and `evidence_cutoff`.
- Missing values stay missing.
- Distinguish direct evidence, derived evidence and proxy evidence.
- Public/browser visibility does not imply a production-ready or licensed API.
- Post-match current-season metrics are outcome-known research evidence and cannot be inserted into frozen pre-kickoff cohorts.
- Final-third possession wins are a pressing-output proxy, not true pressure.
- Average positions/heatmaps are not continuous tracking.

## Runtime source proof

### FotMob public/consumer JSON — operational research path

Supabase Edge runtime successfully returned HTTP 200 for the current 2026/27 Premier League deep-stat endpoints and league surface.

Verified current-season coverage at the first normalized capture:

| Stat | Provider key | Rows | Internal team mapping | Provider format | Classification |
|---|---|---:|---:|---|---|
| Team distance covered | `phys_tdc_team` | 20 | 20 | meter | direct physical metric |
| Player distance covered | `phys_tdc` | 310 | 310 | meter | direct physical metric |
| Player distance / 90 | `phys_tdc_per_90` | 129 | 129 | meter | direct physical metric |
| Player sprints | `phys_sprints` | 283 | 283 | number | direct physical metric |
| Player top speed | `phys_ts` | 310 | 310 | kph | direct physical metric |
| Possession won in final third | `poss_won_att_3rd_team` | 17 | 17 | fraction | **proxy only** for pressing output |

The first correct normalized snapshot contains **1,069 usable metric rows**. An immediate exact rerun inserted **0** new rows, confirming the observation-hash idempotency guard.

### Normalization correction preserved as evidence

The first normalization attempt incorrectly treated FotMob's `statValue` and `substatValue` objects as scalar values. It therefore appended 1,069 rows with `stat_value=NULL`.

Those rows were not deleted or rewritten. C0139 v0.2 fixed extraction by reading provider-native `.value` plus `format`/`fractions`, and appended a new 1,069-row valid snapshot. The status function explicitly reports the earlier null-extraction rows separately from usable rows.

This is intentional append-only behavior: implementation mistakes are corrected by new evidence rather than silently rewriting history.

### SofaScore public/consumer JSON — not operational from production runtime

The public/community research surface suggested lineups, formations, average positions, shot maps, heatmaps and event coordinates may exist. However, direct production-runtime probes returned:

- season discovery: HTTP **403**;
- 2026/27 EPL round-event discovery: HTTP **403**.

Therefore SofaScore is **not an operational unattended server-side source for FIE at present**. Its latest capability state is Blocked for automated ingestion. Browser/community visibility is not enough to call the source usable.

### Driblab open tracking sample — algorithm research only

Driblab's open sample remains useful for genuine XY/velocity/acceleration algorithm prototyping and validation. It does not provide a current-season full-EPL production feed and therefore does not close the current-EPL continuous-tracking blocker.

## Production objects

- `public.research_source_capability_registry`
- `public.research_source_access_probes`
- `private.c0139_latest_source_capabilities_v01`
- `public.research_fotmob_metric_observations`
- `private.c0139_zero_cost_source_status_v01()`
- `private.c0139_fotmob_metric_status_v01()`
- Edge Function `probe-zero-cost-football-sources`

Applied migrations:

- `20260826013531_c0139_zero_cost_source_probe_v01`
- `20260826013849_c0139_fotmob_physical_observations_v01`
- `20260826014532_c0139_fotmob_metric_value_format_v02`
- `20260826014829_c0139_runtime_capability_reconciliation_v03`

Security:

- research tables have RLS enabled;
- direct `public` / `anon` / `authenticated` table grants are revoked;
- update/delete is blocked by append-only triggers;
- the Edge Function only permits the explicitly allow-listed FotMob/SofaScore hosts and requires the existing engine admin token;
- no third-party raw payload is stored, only selected normalized fields plus payload SHA-256 and probe metadata.

## Decision

1. **Use FotMob as the immediate zero-cost current-EPL physical research path.** It is working from the production runtime and gives direct physical workload evidence useful for C0079.
2. **Do not treat SofaScore as an operational ingestion source** unless a legitimate, reliable access route is demonstrated; current Supabase runtime access is HTTP 403.
3. **Do not close C0085 true pressing or C0086 defensive line height.** Current zero-cost evidence still lacks full-match current-EPL continuous XY / direct pressure evidence.
4. **Do not relabel final-third wins as true pressure.** It remains a pressing-output proxy.
5. Next source work should test FotMob match-detail / fixture-level surfaces for formation, shot-origin and side/zone evidence before deciding whether C0087, C0088 and C0089 can be implemented without a paid spatial provider.
6. No model effect is enabled by C0139. Any future use in forecasts requires a separate chronology-safe feature design and validation gate.

## Current status

C0139 is **In Progress / Executed**. The source/provenance layer and FotMob physical ingestion are live and tested. Remaining work is fixture-level tactical/spatial coverage proof and feature construction; the residual true-tracking blocker remains explicit.