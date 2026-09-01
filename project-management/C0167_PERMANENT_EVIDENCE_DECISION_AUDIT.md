# C0167 — Permanent evidence-to-decision consistency audit

## Purpose
Prevent a repeat of the Fulham–Crystal Palace failure mode where the displayed evidence and the production lean can drift apart or the UI can explain a decision with stale/non-material facts.

## Production guardrail
`private.c0167_decision_evidence_audit_v01(gameweek)` runs after the C0159 -> C0166 fixture refresh cycle and checks every live fixture for:

- latest pre-kickoff production snapshot is C0166
- no target-fixture actual-data leakage
- no frozen research mutation
- card facts are signed model inputs
- no duplicate card fact families or duplicate text
- L5 cross-season xG statements explicitly say they span seasons
- no ambiguous pronoun-only fact wording
- categorical calls have at least one material explanation and signed support
- weak/no-edge fixtures are not forced into categorical calls

Audit results are appended to `public.c0167_audit_events`.

## Fact-layer hardening
New fact snapshots use `private.refresh_c0162_team_fact_layer_v05()` and `private.c0167_humanize_streak_facts_v01()` so streak facts always identify the team explicitly. Historical fact snapshots are not rewritten.

Examples after hardening:
- `Crystal Palace are winless in 9 league matches, have lost 3 straight and conceded in 8 straight.`
- `Chelsea have conceded in 18 consecutive league matches.`

## GW3 verification
At implementation time:
- 10/10 GW3 fixtures passed C0167
- 8 categorical calls, 2 no-clear-edge fixtures
- 0 hard-violation fixtures
- C0159 refresh: 10/10 equivalent rows skipped
- C0166 refresh: 10/10 equivalent rows skipped
- C0166 legacy audit: OK
- C0167 audit: OK
- latest FPL run at verification: 1256, consuming C0166 fixture inputs

## Integrity
Read-only audit logic does not alter fixture probabilities, FPL forecasts or historical predictions. The only write performed by the audit cycle is the append-only audit event log.