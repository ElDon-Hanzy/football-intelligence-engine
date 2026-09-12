# Football Intelligence V3

`frontend-v3/` is a new product surface. It is not a redesign or fork of `frontend-v2`.

C0255 rules:

- do not import V2 CSS or V2 presentation components;
- preserve the existing engine/model/governance contracts;
- consume an explicit V3 semantic read model;
- keep actual submitted state, engine recommendation, frozen decision evidence and realized results separate;
- never infer execution authorization from publication status;
- keep `/v2/` operational until V3 passes production QA.

The first committed module is `src/domain/fplState.ts`. Application shell/design-system work starts only after the state contract and serving reproducibility gates are defined.
