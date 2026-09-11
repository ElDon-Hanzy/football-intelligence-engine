# C0247 — Decisions & History Addendum

Date: 2026-09-11
Scope: durable decisions introduced after the current `DECISIONS_AND_HISTORY.md` cutoff.

## C0240 — Final adversarial optimization

The initial optimizer output is provisional. A final candidate may be attacked by slot, structural, transfer-path and role-allocation challengers. However, C0240's current transfer-path search is an **immediate transfer-count search**, not a sequential multi-GW FT planner.

## C0241 — Exact-horizon lineage

A horizon-N decision must be based on an exact horizon-N optimizer and exact current prediction lineage. A shorter optimizer result may not be extended and represented as the same decision. Repeat adversarial cycles must be idempotent and reuse only matching finalized lineage.

## C0242 — Decision consistency

Serious prior/manual challengers must persist until explicitly resolved against current manager/price/prediction state. A change in feasibility must be described as a state change rather than a reversal of football opinion.

Captaincy is separate from squad optimization. Candidates inside the declared error band are `NO_MEANINGFUL_EDGE`; a nominal mean leader may be used as a default but must not be described as having a meaningful edge.

C0242 remains incomplete until its consistency status is integrated into C0234/C0237 and its legal dispatch/capture path is regression-tested.

## C0243-C0246 — Valid requirements, implementation deferred

The project identified four valid requirements:

- predicted price movement / transfer timing;
- chip timing and opportunity cost;
- sequential FT utilization / ideal-squad reachability;
- XI-first / bench / hit objective correction.

They remain Planned / Design Pending. User authorization is required before implementation.

## C0247 — Consolidation decision

The requirements above should **not** automatically become four new independent production layers.

The current forecasting core is structurally healthy; downstream decision architecture is the over-engineering risk. The next architecture should converge toward one multi-GW state-transition decision planner plus one fail-closed authorization gate.

A production layer must be rejected or merged unless it fixes a demonstrated material failure, adds unique information, has a falsifiable/regression-tested output, has a clear consumer and creates more expected decision value than maintenance/complexity risk.

## Static-horizon limitation

The current 5-GW optimizer evaluates candidate XVs largely statically and C0240 tests immediate current-FT / +1-hit / +2-hit paths. It does not yet model +1 FT arriving each new Gameweek, future re-optimization, price changes or information value.

Therefore a static 5-GW objective must not be treated as a complete strategy comparison between acting now and staging transfers across future weeks.

## Bench semantics

The current optimizer already discounts bench points (default 0.12); it does not equal-weight XI and bench. The remaining defect is state dependence: normal-GW bench points should reflect autosub/resilience/option value, while Bench Boost gives full scoring value.

## Chip semantics

Wildcard/BB/TC/FH must be compared against future windows and reachable normal-transfer paths, not assessed by availability alone.

## Price semantics

Predicted price movement is execution/feasibility information. It must not modify player xPts.

## Communication / authority

Live Supabase/runtime outranks documentation. Current publication, adversarial survivor and final authorized recommendation are distinct concepts. Changed recommendations require an explicit explanation of the new evidence or corrected defect that superseded the older state.