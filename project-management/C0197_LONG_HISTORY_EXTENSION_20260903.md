# C0197 Long-History Extension — 2026-09-03

Status: implemented in production as research-only. `model_effect_enabled=false` throughout.

## Objective

Extend the C0197 historical foundation beyond the two rich FPL-Core seasons before building the Football Chaos / high-score-tail model.

The implemented baseline uses one homogeneous free source (Football-Data.co.uk EPL CSVs) for six complete Premier League seasons:

- 2020/21
- 2021/22
- 2022/23
- 2023/24
- 2024/25
- 2025/26

Total: **2,280 completed EPL matches**.

Football-Data is used for long-history outcomes, shots, SOT and market-reference fields only. It is not a replacement for rich xG/xGOT/BC/BCM/player evidence.

## Source captures

| Season | Capture | Rows | Header fields | SHA-256 | Regime |
|---|---:|---:|---:|---|---|
| 2020/21 | 1 | 380 | 106 | `5afe63f69401457b8354eaacee24f9a3e520b3c3af6329564a9783e20d789c62` | `COVID_ERA_2020_21` |
| 2021/22 | 2 | 380 | 106 | `335afcbabeb2939fa10ab39ba3e8215072d0b577cb8d0705c1e44c56e934e703` | `STANDARD` |
| 2022/23 | 3 | 380 | 106 | `8442792d3b614c94ea3cf381bd2736805889cc1713169035368fff19c3d02380` | `STANDARD` |
| 2023/24 | 4 | 380 | 106 | `b2e057b0ed959f198b0f63d2391c01239f3608e6de5db68edab3f88e04d07ff3` | `STANDARD` |
| 2024/25 | 5 | 380 | 120 | `d0c8ce4a96d886cf60cf101f570f4a3893844226f91c7bd769eb568c49edbfa4` | `STANDARD` |
| 2025/26 | 6 | 380 | 132 | `3e3a8352f9ada6789c508d6ca184424421fed56a30400904a4a327c583407e62` | `STANDARD` |

The parser resolves columns by header name rather than fixed position because Football-Data expanded its schema in 2024/25 and 2025/26.

Each match retains the full source row as JSONB. Capture metadata records source URL, row count, byte size, field count, capture time and SHA-256. Evidence is append-only and inaccessible to anon/authenticated roles.

## Coverage

Every season has:

- 380/380 full-time score rows
- 380/380 total-shot rows
- 380/380 SOT rows

Tail counts:

| Season | 4+ | 5+ | 6+ | 7+ |
|---|---:|---:|---:|---:|
| 2020/21 | 102 | 55 | 28 | 15 |
| 2021/22 | 124 | 64 | 21 | 4 |
| 2022/23 | 121 | 64 | 33 | 15 |
| 2023/24 | 166 | 86 | 36 | 13 |
| 2024/25 | 130 | 59 | 24 | 10 |
| 2025/26 | 108 | 49 | 16 | 7 |

2020/21 is intentionally regime-tagged because it was largely played behind closed doors. It must not be blended blindly into ordinary home-advantage calibration.

Descriptive regime check at capture time:

- 2020/21: home-win rate 37.89%, away-win rate 40.26%, average goals 2.6947.
- Standard seasons 2021/22–2025/26 combined: home-win rate 44.16%, away-win rate 31.95%, average goals 2.9268.

These are diagnostics, not model coefficients.

## Cross-source audit against FPL-Core

Football-Data and FPL-Core were aligned for every overlapping EPL match:

- 2024/25: 380/380 identities matched.
- 2025/26: 380/380 identities matched.

A persistent append-only cross-source audit (`C0197_XSRC_V01`) classifies score and stat consistency separately.

### 2024/25

- Exact scores: 375/380
- Half-time-score contamination: 5
- Exact shots+SOT: 364/380
- Minor provider variance: 10
- Severe stat conflicts: 6
- Overall rich-feature eligible: 374/380

### 2025/26

- Exact scores: 379/380
- Half-time-score contamination: 1
- Exact shots+SOT: 370/380
- Minor provider variance: 8
- Severe stat conflicts: 2
- Overall rich-feature eligible: 377/380

All six score conflicts have the FPL-Core `home_score/away_score` equal to Football-Data's half-time score rather than the full-time score. This confirms a source-snapshot contamination pattern, not ordinary provider disagreement.

Example: Newcastle United 4–1 Manchester United on 2025-04-13 is represented in the FPL-Core GW32 match file as 1–1 with partial-looking 8–5 shots; 1–1 was the half-time score. The cross-source audit quarantines this row for goal-residual and process-feature training as appropriate.

Quarantine is field-aware:

- `goal_residual_eligible=false` when score is contaminated/conflicted.
- `process_feature_eligible=false` for severe shot/SOT conflicts (`shot_abs_delta >= 5 OR sot_abs_delta >= 3`).
- Small provider-definition differences remain usable.
- `overall_rich_feature_eligible` requires both gates.

No historical source row was rewritten.

## Production objects

Migration `20260903123251_c0197_six_season_long_history_v01.sql` creates:

- `public.research_c0197_long_history_captures`
- `public.research_c0197_long_history_matches`
- `private.c0197_ingest_football_data_csv_v01(...)`
- `private.c0197_long_history_latest_matches_v01`
- `private.c0197_long_history_status_v01()`

Migration `20260903123713_c0197_cross_source_quarantine_v01.sql` creates:

- `public.research_c0197_cross_source_match_audits`
- `private.c0197_fd_team_slug_v01(...)`
- `private.c0197_cross_source_overlap_v01`
- `private.c0197_cross_source_audit_status_v01()`

All research tables are RLS-protected, revoked from anon/authenticated, append-only, and constrained to `model_effect_enabled=false`.

## Modelling consequence

The historical foundation is no longer limited to 760 rich-era matches.

The intended hierarchy is now:

1. **Long-history Chaos/tail baseline:** 2,280 homogeneous Football-Data EPL matches (2020/21–2025/26), with 2020/21 regime-aware handling.
2. **Rich team/player layer:** 2024/25–2025/26 FPL-Core xG/xGOT/BC/BCM/player evidence, gated by the cross-source quarantine.
3. **Shot-event eSOT layer:** 2025/26 shot-event history plus current-season observations, subject to existing shot-reconciliation gates.

Do not fabricate xG/xGOT/BCM for 2020/21–2023/24. Their absence remains NULL and those seasons contribute only to features genuinely observed there.

## Promotion state

No C0197 model has been promoted. No production score/FPL forecast has changed. This extension only strengthens the chronology/provenance/coverage foundation for the next shadow-model stage.
