# C0273 Package A — A1 Aggregate Hash Adjudication

Date: 2026-09-15
Production effect: NONE

## Decision

**FALSE DRIFT — A1 MAY CONTINUE.**

The A1 stop was caused by reproducing the A0 aggregate with a newline separator instead of the separator actually used by the A0 query.

Live direct-family scope remains exactly 51 records. A row-by-row comparison against all 51 version/name/statement-MD5 triples frozen in Checkpoint 48 returned **51 matches / 0 mismatches**.

Aggregate reproduction over the same ordered `version:name:statement_md5` tokens:

- `string_agg(..., E'\n')` -> `ab55475eb4a7da11521c889122f72662`
- `string_agg(..., ',')` -> `66b9d8bac51fd1f1581d8b75a850714d`

Therefore the Checkpoint-48 aggregate `66b9d8bac51fd1f1581d8b75a850714d` is reproducible when the comma separator is restored. The earlier prose described the token composition and ordering but omitted the aggregate separator, creating an ambiguous reproduction recipe.

## Governance consequence

No production drift is evidenced. No migration statement changed. This is an audit/reproduction-method defect only. Preserve both hashes and this explanation rather than rewriting Checkpoint 48 history.

A1 exact-payload materialization may resume under the existing no-production-change and no-semantic-edit contract.
