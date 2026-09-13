# C0269 — Decisions & History Addendum

Date: 2026-09-14 (Dubai)

## Durable decision

A controlled latency improvement is not sufficient evidence for production promotion when the change alters network concurrency or cold-start behavior.

C0268 showed an approximately 15% same-run median request-schedule improvement, but post-closeout production revalidation produced repeated HTTP 500 failures under its simultaneous three-Edge cold-start pattern. The failing endpoint changed between runs, while the underlying database dependencies remained healthy.

Therefore C0269 permanently establishes the following default serving policy for the V3 current FPL page:

1. never cold-start Gameweek catalog, workspace and actual/live simultaneously;
2. permit at most two cold Edge requests concurrently;
3. resolve catalog/workspace Gameweek identity before requesting actual/live;
4. request actual/live explicitly for the resolved workspace Gameweek;
5. fail closed on cross-Gameweek mismatch;
6. do not hide serving failures with retries in acceptance tests;
7. retain public-auth credential parity and decoded-claims validation;
8. preserve V2 as an untouched rollback surface.

Reliability outranks a small latency gain when the performance edge is not robust across plausible runtime conditions.

## Historical interpretation

C0268 remains `Completed / Verified` as a historical shipped change because it passed its original acceptance evidence. Its three-way scheduling behavior is nevertheless superseded and must not be treated as the current baseline.

C0269 is the active production scheduling baseline and is `Completed / Verified` after PR #25, merge `1a7fffa39bb600173bd83f7d45c5e12b167546bb`, and successful production Pages run `34778026055`.

## Future optimization gate

Any future latency optimization must start from C0269, use a fresh change ID, compare against ROLL/no-change, preserve all chronology/auth/semantic/V2 gates, and include repeated realistic availability testing in addition to controlled latency measurement.
