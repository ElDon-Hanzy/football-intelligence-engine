# C0268 — Decisions & History Addendum

Date: 2026-09-13 (Dubai)
Scope: durable product-serving decisions learned from C0264, C0266, C0267 and C0268.

## 1. Runtime truth outranks stale repository documentation

C0264 proved that a production Edge Function may diverge from `main` during an experiment even when documentation still describes the older version. Before any serving optimization or rollback decision, inspect the actual deployed function version/source and compare it with repository/runtime manifests.

A parity gate must be repaired when its manifest is stale; it must not be bypassed merely because the live runtime appears healthy.

## 2. Never hand-mutate public JWT payloads

The C0264 incident and a pre-merge C0268 red-team catch were the same failure class: a copied public anon-JWT literal had its decoded issuer text changed without a valid signature.

Permanent rule:

- browser public credentials are opaque signed values;
- do not edit their encoded header/payload text by hand;
- public credentials consumed by related V3 clients must be parity-checked;
- CI must decode and validate material claims (`iss`, project `ref`, `role`) in addition to live endpoint smoke;
- a smoke test must not source the credential from only one client file if several clients independently ship it.

Current required claims are `iss=supabase`, `ref=knooiwezzsxcwhtjtdap`, `role=anon`.

## 3. Public catalog authorization and gateway JWT verification are separate controls

`gameweek-status-api` is intentionally public to the V3 browser but remains fail-closed. Its current runtime uses `verify_jwt=false` at the gateway because the function body explicitly authorizes approved public credentials.

Permanent rule:

- do not flip gateway JWT verification solely to make a public-browser contract work;
- do not remove handler authorization to cure a 401;
- an unauthenticated/unapproved request must remain rejected;
- changes to this public contract require live browser-client smoke, not only direct service-role testing.

## 4. Actual truth may be prefetched only with Gameweek identity proof

C0268 established a safe latency pattern for current FPL truth:

- default workspace/catalog/actual-live calls may start concurrently;
- a default actual-live response may be reused only when its returned `gameweek` equals the workspace Gameweek;
- if the Gameweeks differ, the client must fetch actual/live explicitly for the workspace Gameweek;
- an explicit Gameweek response that returns another Gameweek is a contract error;
- cross-Gameweek actual and recommendation truth must never be combined for speed.

This is a semantic gate, not an optimization detail.

## 5. Controlled performance evidence outranks isolated latency readings

External Edge Function latency varies materially with region, runner cold state, connection setup and upstream warm state. A single before/after request is insufficient evidence for promotion.

C0268 was accepted because an alternating same-run old/new schedule A/B produced a consistent edge: old median 1374 ms versus new median 1168 ms, about 206 ms / 15% faster, with both new samples beating both old samples.

Permanent rule:

- isolate the structural change;
- compare against no-change baseline;
- use same-run or otherwise controlled samples where practical;
- treat absolute cross-run timing as observational context;
- reject performance changes whose advantage is inside normal measurement noise.

## 6. Performance work cannot weaken product gates

Latency work is serving architecture, not permission to weaken correctness.

The following remain mandatory for V3 performance changes:

- semantic contract tests;
- public-client live smoke;
- credential parity/claims validation;
- serving/runtime parity;
- typecheck/build;
- V2 rollback isolation;
- responsive browser E2E/accessibility;
- Pages artifact integrity;
- deployed root/V2/V3 verification.

## 7. Actual, recommendation, frozen evidence and realized outcome remain separate lanes

C0255/C0257 semantics remain authoritative through C0268:

- actual submitted team comes only from verified submission evidence;
- recommendation is hypothetical engine state;
- decision-time projections remain frozen;
- realized result is a separate outcome lane;
- `FINAL` publication status is not execution authorization;
- missing remains missing;
- exact fail-closed wording remains `Actual submitted team not verified` when verification is absent.

The later capture of a verified GW4 actual submission does not retroactively transform the engine recommendation into the submitted team or prove it was executed.

## 8. Contaminated experiment branches are not restart points

C0264 PR #20 is closed unmerged and tracker status remains Blocked. C0267 deliberately restarted from clean `main` and copied only the independently live-proven workspace subset before re-running all gates.

Permanent rule: after a production incident involving mixed experimental changes, restart from a verified clean baseline rather than continuing to stack repairs on the contaminated branch.

## 9. V2 remains rollback surface

V3 optimization does not authorize V2 retirement. Every relevant Pages build must preserve `/v2/` as an isolated fallback until a separate evidence-driven retirement decision is approved.

## 10. C0268 disposition

C0268 is **Completed / Verified**.

Evidence:

- PR #24;
- merge `4b16fd6364d78e26af1430bed05aa8178ea736e5`;
- final PR workflow `34775557312` PASS;
- production Pages workflow `34775635944` SUCCESS;
- deployed legacy root + V2 + V3 verification PASS;
- V3 responsive suite 75/75 PASS;
- tracker transitioned to Completed / Verified.

Any further V3 latency work must receive a new change ID and start from current verified `main`.
