# C0141 — Logic / Effect / Accuracy / Gaps Review Handover

Date: 2026-08-26
Parent: C0140
Purpose: durable memory and fresh-conversation handover for the next audit of the zero-cost physical/tactical source work before any model activation.

## 1. Immutable project rules

- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Genuine fixture intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Retrospective/shadow/research work must remain separate from genuine forward predictions.
- Missing data is not zero.
- Preserve provenance and `known_at` / `captured_at` / `evidence_cutoff` semantics.
- Do not commit secrets/API keys.
- Unvalidated intelligence remains `model_effect_enabled=false` until genuine forward validation passes.
- A0005, E0007 and W0002 are frozen and must not be mutated by this review.

## 2. Live source work entering the review

### C0139 — Zero-cost current-EPL tactical/physical source proof

Status: In Progress / Executed.

Implemented evidence:
- `public.research_source_capability_registry`
- `public.research_source_access_probes`
- `public.research_fotmob_metric_observations`
- `private.c0139_zero_cost_source_status_v01()`
- `private.c0139_fotmob_metric_status_v01()`
- Edge Function `probe-zero-cost-football-sources`

Verified current-EPL FotMob ingestion from the Supabase runtime:
- team distance: 20 rows / 20 teams
- player distance: 310 rows
- player distance per 90: 129 rows
- player sprints: 283 rows
- player top speed: 310 rows
- possession won in attacking third: 17 rows / 17 teams
- total normalized research rows: 1,069
- immediate rerun inserted 0 duplicates

Important access/source limits:
- SofaScore consumer API returned HTTP 403 from the Supabase runtime. Do not treat SofaScore as operational production evidence yet.
- FotMob consumer/public access terms and long-run automation reliability are not yet verified for production polling.
- Driblab/open tracking samples are useful for algorithm research but do not provide a current full-EPL continuous-XY feed.
- Free current-EPL continuous player XY and true tracking-derived pressure remain unavailable.

### C0140 — Current-EPL physical load research state

Status: Completed / Verified.

Implemented evidence:
- `public.research_team_physical_load_states`
- `private.refresh_c0140_team_physical_load_state_v01()`
- `private.c0140_team_physical_load_status_v01()`
- append-only guard `private.block_c0140_physical_load_mutation_v01()`

Verified integrity state:
- 20/20 teams have full direct physical source coverage under the current four-component completeness definition.
- final-third-wins proxy available for 17/20 teams and remains separately labelled as a proxy.
- maximum absolute team-distance vs summed-player-distance reconciliation error: 0.5m.
- missing proxy values remain null.
- `research_only=true`, `model_effect_enabled=false`.
- A0005/E0007/W0002 untouched.

## 3. Critical logic issues the next conversation MUST audit

These are not conclusions to blindly accept; independently verify them against production definitions and source payloads.

1. **Season aggregate vs per-match load.** FotMob deep-stat league surfaces appear to be season-to-date aggregates at capture time. After GW1 this is numerically equivalent to one-match totals, but once more matches are played raw totals cannot be interpreted as per-match intensity or fatigue without dividing/rolling by match/minute exposure.

2. **Duplicated distance evidence.** `team_distance_m` and `player_distance_sum_m` are the same underlying team workload viewed through team and player aggregation. Their close reconciliation is an excellent ingestion-quality check, but they are not independent predictive features. The current C0140 coverage score counts both for completeness; that must not be mistaken for four independent physical signals.

3. **Top speed is not fatigue load.** Maximum player top speed is more naturally a capability/style/athleticism signal than accumulated physical burden. It should not be given a direct fatigue weight without evidence.

4. **Sprint count needs normalization.** Sprint totals should be normalized by team match exposure and, at player level, minutes. High-speed-running distance would be preferable if a defensible source becomes available.

5. **Final-third wins is not pressure.** Possession won in the attacking third is a pressing-output/counterpressing proxy. It is not direct pressure-event frequency, PPDA or continuous tracking pressure. Keep it outside the physical-load composite and label it explicitly as a proxy.

6. **Team fatigue vs player fatigue.** FPL decisions need player-level recent load tied to actual minutes, substitution patterns, expected XI probability and rotation risk. Team-level totals alone cannot tell whether a specific player is fatigued.

7. **Missing causal context.** A fatigue effect should consider rest days, congestion, cup/European matches, extra time, travel, rotation, opponent tempo/pressing demand, score state and expected minutes. Physical output by itself can reflect tactical intent or game state rather than fatigue.

8. **Chronology.** Current C0139/C0140 evidence is post-match/current-season research evidence. It may update future research states only. It cannot be attached retrospectively to a pre-kickoff forecast as if it had been known then.

9. **Access/legal/reliability risk.** The public/consumer source route may be technically accessible but still unsuitable for automated production use if terms or endpoint stability do not support it. Treat production readiness separately from technical availability.

10. **Residual spatial blocker.** True defensive-line height, continuous pressure, compactness and side-specific geometry still require defensible event/tracking evidence. Do not fake these with heatmaps or broad box-occupation proxies.

## 4. Effect pathways to review

The next audit should evaluate each signal separately for plausible effect and leakage risk.

### FPL
- Expected minutes / rotation probability.
- Attacking-event rate degradation under short rest/high load.
- Defensive contribution and clean-sheet process under high team load.
- Captaincy tail probabilities only after validated xMin/xPts effects exist.

### Fixture / betting research
- Small bounded lambda/process adjustment only if the feature adds genuine out-of-sample value.
- Interaction candidates: recent physical burden × rest days; burden × opponent intensity; burden × expected XI continuity.
- Do not directly activate any of these from GW1/GW2 hindsight.

## 5. Accuracy semantics

The present evidence supports **data-ingestion accuracy**, not predictive accuracy.

What is strong now:
- deterministic source mapping to all 20 current teams for the direct physical metrics;
- team distance and player-distance sum reconcile to within 0.5m;
- provider units/formats are preserved;
- duplicate ingestion is suppressed;
- missing values stay null;
- model effect remains off.

What is NOT established:
- that distance or sprints improve goals/xG/FPL prediction;
- that the effect is monotonic;
- that one-match physical output measures fatigue rather than style/game state;
- that the source remains stable across later GWs;
- that any fatigue × style interaction survives chronological validation.

## 6. Recommended review sequence

1. Independently inspect C0139/C0140 production objects and the exact source payload shape.
2. Classify every C0140 field as direct measurement, reconciliation field, capability trait, proxy or derived feature.
3. Redesign the physical-load state so raw source facts are separate from modeling features.
4. Add exposure normalization: matches/minutes and rolling windows once GW2+ data exists.
5. Join schedule/rest/congestion context without activating model effects.
6. Design player-level load states for expected-XI/FPL use.
7. Define a pre-registered chronology-safe fatigue experiment with fixed feature definitions and no same-cohort retuning.
8. Only then consider C0079 fatigue × style/intensity as Monitoring/validation rather than merely implemented plumbing.
9. Keep C0085/C0086 true pressure/line height blocked until real evidence exists.

## 7. Fresh-conversation starting prompt

Copy the following into a new conversation:

> Continue development of the Football Intelligence Engine, focusing first on a critical audit of the new zero-cost physical/tactical data layer. This is a review conversation before any new model activation.
>
> Repository: `ElDon-Hanzy/football-intelligence-engine`
> Supabase project: `knooiwezzsxcwhtjtdap`
>
> Before analysis, read:
> - `PROJECT_STATE.md`
> - `DECISIONS_AND_HISTORY.md`
> - `project-management/C0139_ZERO_COST_SOURCE_PROOF.md`
> - `project-management/C0141_LOGIC_EFFECT_ACCURACY_GAPS_HANDOVER.md`
>
> Then independently inspect live Supabase state. Do not blindly trust the handover. At minimum query:
> - `public.change_tracker_working` for C0079, C0082, C0139, C0140, C0141
> - `private.c0139_zero_cost_source_status_v01()`
> - `private.c0139_fotmob_metric_status_v01()`
> - `private.c0140_team_physical_load_status_v01()`
> - definitions of `private.refresh_c0140_team_physical_load_state_v01()` and the latest-metric views
> - sample/latest rows from `public.research_fotmob_metric_observations` and `public.research_team_physical_load_states`
> - `private.audit_change_tracker_governance_v01()`
> - A0005 and W0002 status functions to confirm frozen-cohort integrity
>
> Task: review the **logic, expected effect, accuracy and gaps** of C0139/C0140 before building C0079 fatigue × style/intensity.
>
> Specifically challenge the following rather than accepting them:
> 1. Are FotMob league physical values season-to-date totals, per-match averages, or another aggregation? Prove it from payload semantics and later-GW behavior if available.
> 2. `team_distance_m` and `player_distance_sum_m` reconcile closely but are not independent signals. Separate ingestion-quality checks from modeling features.
> 3. Decide whether max top speed belongs in fatigue at all; it may be an athletic-capability/style variable instead.
> 4. Define correct normalization for sprint count and distance by match/minute exposure and rolling recent windows.
> 5. Keep final-third wins explicitly as a pressing-output proxy, not true pressure/PPDA.
> 6. Determine what team-level load can legitimately affect fixture lambdas and what must be player-level for FPL expected minutes/rotation.
> 7. Identify missing causal variables: rest days, congestion, cup/Europe, extra time, travel, rotation, expected XI, opponent tempo/intensity and game state.
> 8. Separate data-integrity accuracy from predictive accuracy. Current 20/20 coverage and <=0.5m distance reconciliation prove ingestion quality, not model value.
> 9. Assess source reliability/terms risk: FotMob public/consumer polling is technically working; SofaScore currently returns 403 from Supabase; continuous current-EPL XY remains unavailable.
> 10. Preserve chronology: C0139/C0140 post-match evidence may inform future research states only and must never rewrite frozen forecasts.
>
> Give me a structured audit with: **(A) what is logically sound, (B) what is wrong or misleading, (C) expected effect pathways for FPL and betting, (D) accuracy we can actually claim today, (E) remaining data/model gaps, and (F) the exact corrected architecture you recommend.**
>
> Do not implement changes yet. First return the audit and recommended design. Preserve all immutable rules: historical forecasts append-only; missing != zero; pre-kickoff hard freeze; no secrets; `model_effect_enabled=false` for unvalidated intelligence; A0005/E0007/W0002 untouched.

## 8. Current intent

C0141 is documentation/tracker handover only. It must not change any forecast, coefficient, cohort or model effect.
