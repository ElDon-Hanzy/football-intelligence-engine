# C0279 P7 — Matchup Modal & Decision-Evidence Contract Closeout

**Status:** Completed / Verified  
**Date:** 2026-09-18  
**Production effect:** None (private shadow contract only)  
**Next phase:** P8 chronological shadow evaluation

## Outcome

P7 implements `private.c0279_decision_evidence_modal_v01(snapshot_id, prediction_run_id)` as the calculation-faithful matchup-modal payload. The contract presents, in order:

1. engine conclusion;
2. calculation-linked supporting evidence;
3. genuine uncertainty/risk;
4. explicit conflict reconciliation;
5. gated player implications; and
6. separately labeled research-only tactical context.

The payload is structured and auditable rather than assembled from independent prose snippets. Supporting facts carry `SUPPORTS_CONCLUSION`; risks carry `LIMITS_CERTAINTY`; reconciliations carry `RESOLVED`. Tactical matchup observations have `model_effect_enabled=false` and are excluded from support and risk.

## Decision-Evidence controls

- No L10/L20 or opaque rolling-window language is emitted.
- The isolated raw modal score is disclosed but cannot silently replace the selected score family.
- Shootout is asserted and audited as a HIGH_SCORING subtype.
- Weak result direction is disclosed separately from the score-family conclusion.
- A direction/family tension passes only when explicitly disclosed and below the registered 0.08 material direction gate.
- Mirrored tactical verdicts are prohibited; zero-effect tactical observations are placed under “Additional tactical context — not used in this forecast”.
- Player implications include only P5 `ELIGIBLE` players, ranked within each team by conditional P(10+) when the team scores 4+, and explicitly grant no captaincy or chip authority.
- Contract execution is restricted to `postgres` and `service_role`.

## Diagnostic fixtures

### Brentford vs Chelsea — snapshot 9084

- Conclusion: HIGH_SCORING / SHOOTOUT.
- Representative score: 3–2; raw isolated modal cell: 1–1.
- Expected total goals: 3.31; Over 2.5: 64.3%; BTTS: 65.4%; high-scoring membership: 43.4%; 5+ goals: 23.9%.
- Result direction: slight home lean, 5.3-point edge; the modal does not describe this as a confident Brentford win.
- Chelsea eligible high-tail leader: João Pedro, P(10+ | Chelsea 4+) 16.83%, followed by Rogers 13.51% and Palmer 11.54%.

### Leeds vs Crystal Palace — snapshot 9090

- Conclusion: HIGH_SCORING / SHOOTOUT.
- Representative score: 3–2; raw isolated modal cell: 1–1.
- Expected total goals: 3.13; Over 2.5: 60.6%; BTTS: 62.5%; high-scoring membership: 39.7%; 5+ goals: 20.7%.
- Result direction: slight home lean, 6.7-point edge.
- The former mirrored “suppresses Leeds / suppresses Palace” presentation is removed from decision evidence. Ten tactical observations remain visible only as traced, research-only, zero-effect context.

## Full GW5 viewer-assessment suite

| Check | Result |
|---|---:|
| Fixtures assessed | 10 |
| Decision-ready | 10/10 |
| Chronology-valid | 10/10 |
| Deterministic evidence hashes | 10/10 |
| Zero production effect | 10/10 |
| Shootout outside HIGH_SCORING | 0 |
| Opaque L10/L20 mentions | 0 |
| Mirrored suppression mentions in support/risk | 0 |
| Research tactical evidence in support/risk | 0 |
| Support/risk effect-label violations | 0 |

The initial suite correctly exposed one legitimate Spurs–Aston Villa tension: LOW_SCORING_PARITY produced a 1–1 representative score while the 1X2 layer held only a slight away lean. The contract was corrected to disclose that tension instead of falsely claiming direction-family coherence. The repeated suite then passed 10/10.

## Security and architecture

- Function is private, stable and search-path pinned.
- Execute privileges: `postgres`, `service_role`; none for `public`, `anon` or `authenticated`.
- Supabase advisors produced no P7-specific security or performance finding; pre-existing project-wide informational findings remain outside this phase.
- C0213 system consolidation: GREEN.
- Registry integrity: GREEN.
- Production behavioral proof: 14/14.
- Required capabilities: 19/19.
- Tracker consumption governance: 100/100, zero violations.
- Active duplicate cron targets: zero.
- Production components remain 14.

## Artifacts

- `supabase/migrations/20260918123000_c0279_p7_decision_evidence_modal.sql`
- `supabase/migrations/20260918124500_c0279_p7_direction_conflict_disclosure.sql`
- `project-management/C0279_P7_MATCHUP_MODAL_DECISION_EVIDENCE_CLOSEOUT_20260918.md`

## Boundary

P7 does not modify fixture forecasts, exact-score matrices, player projections, captain selection, chip selection, historical rows or external FPL state. P8 remains pending. Promotion remains forbidden without chronological evaluation, definition-bound consumption proof, green governance and explicit authorization.
