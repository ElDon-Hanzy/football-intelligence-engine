# C0083 — Spatial Data Source Audit

Date: 2026-08-25
Status: Completed / Verified research decision
Parent: C0082

## Objective
Identify defensible data sources that can close the current spatial/tactical gaps without relabelling weak proxies as true pressing, defensive line height, left/right channel geometry, speed or chance origin.

Acceptance criteria: source matrix records cost, data depth, delivery speed/latency, competition coverage, licensing/access terms and suitability for FIE.

## Required capabilities
1. True pressure / pressing evidence (event-level pressure or tracking-derived pressure, not PPDA-only storytelling).
2. Continuous or sufficiently dense XY player/ball locations to derive team shape and defensive-line height.
3. Event coordinates and attacking direction to derive left/right channels and chance origin.
4. Speed/acceleration and transition evidence.
5. API/feed suitable for repeatable engineering with provenance.
6. EPL/current-season coverage must be contractually confirmed before production ingestion.

## Source matrix

| Provider / product | Pressure | Continuous XY / line height | Channels / chance origin | Speed / transition | Coverage | Delivery / API | Cost | Access / terms | FIE fit |
|---|---|---|---|---|---|---|---|---|---|
| **Stats Perform — Opta Vision** | Native Pressure Intensity; tracking-based | **Yes**: all 22 uninterrupted kickoff-to-final whistle; raw tracking feeds; Shape Analysis | Event data synchronised to XY; suitable for true zones/channels and line-breaking context | Movement, acceleration, direction, off-ball runs, physical output | 80+ major competitions publicly stated | Raw feeds + ProVision/API; automated updates; public ProVision page says a full season can be pulled in under a minute | **Quote only**; no public list price found | Enterprise/demo contract; EPL/current-season feed and downstream-storage rights must be confirmed in writing | **Rank 1 — deepest single-source solution** |
| **Hudl Tracking + Hudl StatsBomb/Wyscout event layer** | StatsBomb collects pressures; Hudl tracking can support tracking-derived pressure models | **Yes**: FIFA-certified raw X&Y for every player and ball, 25 fps; 120+ competitions | Wyscout Events Pack provides precise event locations; StatsBomb event/360 provides rich coordinates/context | Tracking exposes position, speed, direction; physical metrics available | Tracking 120+ competitions; Wyscout 1000+ video/data competitions; StatsBomb event data 190+ | Raw X&Y available via API and aligned to Hudl event/video ecosystem | **Quote only**; package-based, no public list price found | Commercial/demo contract; confirm whether one contract can expose the required EPL event + tracking products and storage/derived-feature rights | **Rank 2 — strongest integrated alternative** |
| **SkillCorner — XY Tracking + Game Intelligence** | Game Intelligence exposes pressure/on-ball engagements; API includes out-of-possession engagement endpoints | **Yes**: every player + ball, continuous high-frequency tracking with off-camera extrapolation | Raw XY enables side/zone geometry; event/Game Intelligence layer gives contextual actions | Physical Data plus tracking; speed/work-rate/explosiveness and off-ball runs | 120+ competitions; 30k+ games/season publicly stated | Documented API includes custom tracking, physical, passing options, off-ball runs and on-ball engagements | **Quote only**; no public list price found | Commercial contract; current EPL coverage, historical depth, latency and redistribution/storage must be confirmed | **Rank 3 — clean tracking-first API choice** |
| **Hudl StatsBomb Event + 360 without continuous tracking** | **Yes**: pressures are explicit events | No continuous full-match line height from 360 alone; 360 is event-time visible-player positioning | **Strong** event coordinates, attacking direction, freeze-frame context, chance origin | Event-level transition/Phases of Play; no continuous physical speed without tracking add-on | Event data 190+; player-location data for 40+ key leagues; Phases of Play 200+ | API available; post-match event products and API | **Quote only** for commercial data; open data exists only for selected historical samples | Commercial license for production. Open data useful only for prototyping where coverage fits | **Good event-first option, insufficient alone for C0082's full tracking goals** |
| **Genius Sports / Second Spectrum** | Tracking platform can derive pressure/spacing | **Yes in principle**; official PL tracking technology captures precise player/ball locations | Tracking allows channels/shape if data access is licensed | Tracking supports physical/spatial derivation | Second Spectrum is publicly identified as Official Tracking Provider for the Premier League/EFL | No clear public self-service developer route found in this audit | **Quote / rights-based** | Access appears partnership/rights dependent; API and downstream rights require direct commercial confirmation | **Strategically attractive for EPL, but integration access is uncertain** |
| **Metrica Sports sample/open data** | Derivable from sample tracking but not a production league feed | **Yes on sample matches**; synchronised tracking/event data | Yes for schema/prototyping | Tracking supports speed/space derivation | Only a few anonymised sample games in public repo | Files; useful for local schema and algorithms | **Free sample** | Public sample asks attribution/responsible use; not a production EPL license | **Best zero-cost C0084 schema/prototype source, not production data** |

## Evidence URLs
- Opta Vision: https://www.statsperform.com/products/opta-vision/
- Opta ProVision/API: https://www.statsperform.com/products/opta-provision/
- Opta team performance/raw tracking: https://www.statsperform.com/team-performance/
- Hudl StatsBomb FAQ/data types: https://www.hudl.com/products/statsbomb/faq
- Hudl StatsBomb product: https://www.hudl.com/products/statsbomb
- Hudl raw X&Y launch: https://www.hudl.com/blog/hudl-raw-xy-data-release-api
- Hudl Tracking: https://www.hudl.com/en_gb/products/data/tracking-data
- Hudl Wyscout Data API: https://www.hudl.com/products/wyscout/data-api
- SkillCorner XY: https://skillcorner.com/products/football/xy-tracking-data
- SkillCorner football/coverage: https://skillcorner.com/sports/football
- SkillCorner API: https://skillcorner.com/api/docs/
- Genius Sports statement identifying Second Spectrum as Official PL tracking provider: https://www.geniussports.com/wp-content/uploads/2024/05/Genius-Sports-Modern-Slavery-Transparency-Statement-2022-2023-Final.pdf
- Metrica sample data: https://github.com/metrica-sports/sample-data

## Decision

### Preferred procurement order
1. **Opta Vision** — request sample + commercial quote first. It is the cleanest single-source answer to pressure, continuous XY, shape/line-height, speed and event context.
2. **Hudl** — request a combined event + raw X&Y package. Technically very strong and potentially easier to integrate into one event/video/tracking ecosystem.
3. **SkillCorner** — request EPL sample/API access as the tracking-first fallback and benchmark its quality/price against the first two.
4. **Second Spectrum/Genius** — contact only if direct EPL tracking access can be commercially exposed to this project.

### Required commercial questions before procurement
For every shortlisted vendor obtain written answers to:
- Does the package include current Premier League matches and how many historical seasons?
- Exact delivery latency: live, near-live, minutes post-match, or hours post-match?
- Raw frame frequency and coordinate convention; are off-camera positions observed or extrapolated and is per-frame quality supplied?
- Can raw data be stored indefinitely in Supabase and used to create proprietary derived metrics/models?
- Can derived metrics be surfaced in a private or public product, and what redistribution restrictions apply?
- Are event and tracking IDs/timestamps stable enough for deterministic reprocessing?
- API rate limits, bulk export limits and backfill costs.
- Total annual price for EPL only vs multi-league coverage, including historical backfill.

## Impact on project status
C0083 source discovery is complete. The technical source blocker in C0082 has been resolved: defensible sources exist. **C0082 should remain Blocked until commercial access/sample data for a production provider is obtained**, because source existence is not the same as licensed production evidence.

C0084 can proceed immediately with a provider-neutral append-only spatial/event schema using Metrica's open sample for format/prototype validation. That schema must preserve raw provider coordinates/timestamps/quality metadata so Opta, Hudl or SkillCorner can be onboarded later without semantic loss.
