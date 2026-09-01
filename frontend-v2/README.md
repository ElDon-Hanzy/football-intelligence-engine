# Football Intelligence Engine — UI v2

Parallel frontend rebuild governed by C0168 and child changes C0169–C0176.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The production legacy UI remains at the repository root. UI v2 is deployed under `/v2/` until C0176 controlled cutover.

## Rules
- Production APIs are authoritative.
- Runtime schemas validate untrusted API payloads.
- No model state writes from the browser.
- Mobile-first; minimum 44px interactive hit areas.
- No visual/interaction change is marked Verified solely because deployment succeeds.
