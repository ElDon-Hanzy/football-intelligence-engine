# C0034 — Third Correct Score source

Date: 2026-08-25
Status: Blocked after source selection / live same-provider test

## Objective
Add a third independent pre-kickoff Correct Score source to strengthen market consensus beyond Bet365 + Unibet.

## Live test of existing provider alternatives
On genuine pre-kickoff GW2 fixtures, Odds-API.io was asked for William Hill, Betway and BetVictor through the existing protected `ingest-bookmaker-odds` path.

Result:
- events found: 10
- events matched: 10
- raw payloads written: 0
- normalized selections: 0
- Correct Score rows: 0
- initial bookmaker calls returned HTTP 403; subsequent burst calls returned HTTP 429

Therefore none of the three satisfies C0034 under the current Odds-API.io access. The previous Pinnacle attempt also produced no usable selections.

## Selected independent provider
**Sportmonks Premium Odds Feed, powered by TXODDS** is the preferred replacement source.

Official product documentation states:
- 120+ bookmakers
- 42 betting markets including Correct Score
- pre-match updates around every minute, worst case up to about two minutes after a bookmaker change
- `latest_bookmaker_update` on each price
- opening odds plus subsequent changes retained/queryable for up to seven days after kickoff
- direct filtering by bookmaker and market IDs
- separate provider stack from Odds-API.io

References:
- https://www.sportmonks.com/football-api/premium-odds-feed/
- https://www.sportmonks.com/football-api/solutions/sports-betting-api/

## Remaining blocker
A Sportmonks API token / Premium Odds access is required for a genuine live acceptance test. No relevant connected plugin/integration is available in this ChatGPT environment.

C0034 must remain Blocked until a token or equivalent access is available and the acceptance criterion is actually met: a third source must produce normalized pre-kickoff Correct Score selections on target fixtures.

## Planned acceptance test once access exists
1. Store the Sportmonks token only in Supabase backend secrets; never commit it.
2. Map Sportmonks fixture IDs to FIE match IDs by teams + kickoff with strict tolerance.
3. Fetch Correct Score only, preserving bookmaker ID/name, `latest_bookmaker_update`, capture time and raw payload.
4. Write raw snapshots append-only, then normalize exact-score selections into the existing odds layer with provider=`sportmonks-txodds`.
5. Refuse any source update at/after kickoff.
6. Verify at least one third-bookmaker source across all target fixtures; measure coverage independently from Bet365/Unibet.
7. Keep market signals observational and `model_effect_enabled=false`.
