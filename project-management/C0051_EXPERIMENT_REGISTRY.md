# C0051 — Research Experiment Registry

Status: **Completed / Verified**  
Epic: **C0049 — Validation & sample infrastructure**  
Date: 2026-08-24

## Purpose

Create an immutable registry for every research/model experiment so a result can always be traced to the exact Change ID, feature schema, model versions, chronology policy, code commit, train/validation/test windows, coefficient/model artifact and external run references.

This prevents experiment definitions from being silently rewritten after results are known.

## Production objects

- `public.research_experiments`
- `public.research_experiment_key_seq`
- `public.research_experiment_registry`
- `public.register_research_experiment_v01(...)`
- `private.block_research_experiment_mutation()`

Production migration: `c0051_research_experiment_registry_v01`.
Repository migration: `supabase/migrations/20260824232000_c0051_research_experiment_registry_v01.sql`.

## ID scheme

Experiment IDs are immutable 5-character sequential keys:

- `E0001`
- `E0002`
- ...

The experiment ID is independent of the 5-character project Change ID (`Cxxxx`). Every experiment must link to a valid Change ID.

## Immutable definition fields

Each experiment can record:

- Change ID and optional parent experiment;
- experiment name, purpose and hypothesis;
- experiment type;
- feature schema and feature-family list;
- baseline model version;
- candidate model version;
- outcome model version;
- chronology policy;
- train / validation / test windows;
- code commit SHA;
- model artifact hash;
- coefficient manifest;
- external run/API references;
- definition hash;
- forward-valid flag;
- research status.

UPDATE and DELETE are blocked. If any material definition changes, register a new experiment rather than editing the old one.

## Chronology / anti-hindsight controls

`register_research_experiment_v01` requires:

- `chronology_policy.pre_kickoff_only = true`;
- `actual_data_allowed_in_generation = false`;
- actual outcome data remains forbidden during generation;
- model effect remains disabled at registry level;
- parent experiment key, when supplied, must already exist.

Evaluation may occur after the prediction/experiment output has been frozen; that permission belongs in the chronology-policy metadata rather than allowing actual outcomes into generation.

## Idempotency

The canonical definition is serialized to JSON and hashed. Re-registering the exact same definition returns the existing experiment instead of allocating a new key.

This is important for reproducible automation: retries do not create duplicate experiments.

## First registered experiment — E0001

`E0001` records the already-frozen GW1 Enriched Shadow Outcome Replay v0.1.

Linked Change ID: `C0027`.

Definition:

- baseline model: `0.1.3`;
- candidate model: `enriched_shadow_v0.1`;
- outcome engine: `independent_poisson_original_fixture_generator`;
- code commit: `031e1f80d28903779c51da51e58cab0ef3a3e531`;
- model/run artifact hash: `e9d6ad8baac0839c29914ac72d0ab41a`;
- enriched shadow run id: `2`;
- source blind replay run id: `1`;
- research replay API version: `2`;
- forward-valid: false;
- model-effect: false.

Fixed coefficient manifest preserved in E0001:

- wide: 0.04 max log-lambda effect;
- aerial/set-piece: 0.035;
- central creation: 0.05;
- recent attacking xG: 0.05;
- opponent defensive xGA: 0.04;
- positive transition opportunity: 0.025;
- schedule/fatigue: 0.03;
- own personnel continuity: 0.05;
- opponent personnel defence continuity: 0.04;
- total log-lambda cap: 0.12.

Definition hash: `236d6384e0ce98a912523e4824d27b5b`.

## Verification

### Idempotency test

Re-registering the exact E0001 definition returned:

- `existing=true`;
- `experiment_key=E0001`;
- same id `1`;
- same definition hash.

No duplicate row was created.

### Invalid chronology test

A deliberate test definition with `pre_kickoff_only=false` was rejected with:

`chronology_policy.pre_kickoff_only must be true`

Post-test audit confirmed zero invalid-test rows.

### Immutability tests

Direct UPDATE of E0001 was rejected with:

`research_experiments is immutable; create a new experiment definition instead`

Direct DELETE produced the same rejection.

E0001 remained unchanged.

### Final registry audit

- experiment rows: 1;
- E0001 rows: 1;
- invalid chronology test rows: 0;
- rows permitting actual data during generation: 0;
- model-effect enabled rows: 0.

## Security / performance

RLS is enabled and anon/authenticated grants are revoked. Service role has read/insert access; mutation is blocked even for direct SQL by the trigger.

The Supabase security advisor reports the intentional `RLS enabled, no policy` INFO because this is a service-only table. No permissive client policy should be added simply to silence that INFO.

The performance advisor reports no missing-FK-index issue for C0051. New registry indexes may appear as unused immediately after creation, which is expected on a one-row table.

## Permanent decision

An experiment result is not just a metric. It is the tuple:

**Change ID + Experiment ID + data chronology + feature version + model/outcome version + code commit + artifact/coefficient definition + evaluation window.**

If any of those materially change, it is a new experiment.

## Next change

**C0052 — Walk-forward evaluation engine**.
