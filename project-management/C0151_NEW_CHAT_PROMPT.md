Continue development of the Football Intelligence Engine from the latest production state.

Repository: `ElDon-Hanzy/football-intelligence-engine`
Supabase project: `knooiwezzsxcwhtjtdap`

This is a fresh conversation because the previous one reached its context limit.

Before doing any implementation or FPL recommendation:

1. Read:
   - `PROJECT_STATE.md`
   - `DECISIONS_AND_HISTORY.md`
   - `project-management/C0151_CONVERSATION_HANDOVER_20260831.md`
   - `project-management/C0147_MATCHUP_PREDICTIVE_VALIDATION.md`
   - `project-management/C0149_GW2_XPTS_XG_RANKING_AUDIT.md`
   - `project-management/C0150_FPL_EVENT_CONDITIONING_INTEGRITY.md`
2. Independently inspect Supabase production. Do not blindly trust the handover or root docs; the root docs were last consolidated before C0145-C0150.
3. At minimum run:
   - `private.audit_change_tracker_governance_v01()`
   - `private.a0005_forward_validation_status_v01()`
   - `private.w0002_forward_validation_status_v01()`
   - `private.matchup_predictive_validation_status_v01()`
4. Query the latest GW3 `public.gameweek_prediction_runs`, latest `public.fpl_manager_plans`, active `public.squad_members`, current player state, current prices and current fixtures/results.

Critical current state:

- C0147 matchup predictive layer is live-visible as **UNDER OBSERVATION**, but `model_effect_enabled=false`. Do not silently use it to change production FPL/betting probabilities until its prospective validation+test promotion gate passes.
- C0149 found a real C0135 implementation regression: recursive rolling baselines, player event hazards not responding to target team lambda, and explicit penalty contribution being collapsed into a generic multiplier.
- C0150 fixed those defects prospectively only. Never rewrite GW1/GW2. Latest corrected GW3 snapshot at handover was run 1240, 600 rows, projection layer `rolling_projection_v0.2_event_integrity`.
- C0150 illustrative GW3 outputs at handover: Haaland 6.83 xPts / ~0.87 fixture xG; Mbeumo 6.54 / ~0.62 xG; Bruno 6.33 / ~0.38 xG + ~0.43 xA; Saka 5.19 / ~0.32 xG.
- Latest superseding GW3 manager plan at handover is HOLD / no transfers, provisional Bruno captain, Mbeumo vice. O'Reilly -> Guéhi is only a watch candidate. Collins is not uniquely preferred. Do not fund Haaland by selling Bruno or by ad-hoc downgrades.
- GW2 actual captain was Bruno. Frozen historical model captain was Tzolis; preserve both separately.
- As of the handover creation, Aston Villa-Arsenal GW2 had not yet finished. First ingest/finalize that result and update all GW2 actuals before auditing GW2 or locking GW3.

Permanent FPL process:

- Optimize probability of OR #1.
- Full-pool default: roughly top 300 by expected minutes, split by GK/DEF/MID/FWD, plus an explosive-exception bucket for rapidly changing roles/start probabilities (Cherki is the canonical example).
- Re-optimize the whole legal £100m squad/transfer path after every proposed change.
- Apply expected-minutes and tactical-role gates, marginal value, bench leakage, correlation, club-slot cost, future transfer flexibility and captaincy distribution.
- Always compare against ROLL/no action.
- Do not force spending or premiums through ad-hoc downgrades.
- User explicitly does not want Bruno sold merely to reach Haaland.

Noise-Control Gate:

Never make a final FPL decision from a single model output, recent score, isolated statistic or one-match tactical observation. Every proposed transfer, captaincy choice or structural change must demonstrate a robust edge after model uncertainty and sensitivity testing. Require multiple independent supporting signals, including at least one structural signal such as expected minutes, tactical role or fixture quality. Always compare against ROLL/no action. If the recommendation changes under reasonable assumptions, if plausible scenarios do not favor it consistently, or if the projected difference is within normal model error, classify it as **NO MEANINGFUL EDGE** and do not act. Do not rank statistically indistinguishable options as if the difference were real.

Website/product direction:

- Human-first, plain-English decision product, not a technical dashboard.
- Home: last-GW highlight, next-GW expectation, one clear action, top 3-4 captain candidates with xPts/fixture xG/xA/xMins/haul tails/set pieces/matchup, key changes/risks.
- FPL: GW brief, exact squad recommendation/HOLD, visual XI/bench/C/VC/FT/ITB, why better than rolling, top-10 raw xPts clearly labelled as non-decision ranking, 3-5 GW outlook.
- Betting: top qualifying Correct Score, 1X2, O/U, BTTS/other market; allow NO BET; model probability first; actual result on same card with green tick for deterministic hits.
- Team/player/fixture modals should explain form, strength/weaknesses, named absences and roles, tactical matchups and player-specific opportunity.
- Deep decision logic still runs through ChatGPT for now; autonomous website logic is a later project.

Immediate task sequence:

1. Finish GW2 ingestion/audit after Villa-Arsenal.
2. Re-run corrected C0150 GW3 projections from fresh current information.
3. Re-optimize GW3 full-pool from scratch under the Noise-Control Gate; do not anchor to old Guéhi+Collins.
4. Re-test captaincy and Haaland structures while keeping Bruno.
5. Update the website/manager-plan overlay only after the decision survives robustness checks.
6. Keep C0147 under observation and continue accumulating prospective evidence.
7. Run governance audit after any material implementation write.

Start by reporting the verified live status and any discrepancy between this handover and production, then continue the immediate sequence without asking me to repeat prior context.