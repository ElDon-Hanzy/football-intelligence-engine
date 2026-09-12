# V3 Design System — Touchline direction

Status: C0255 foundation

V3 is a consumer football-intelligence product. It should feel closer to a premium football companion than an engineering console.

## Identity

Working product direction: **Touchline**.

The name is provisional; the visual rules are not dependent on it.

Brand character:

- confident, not technical-looking;
- football-first;
- editorial clarity over dashboard density;
- intelligent without visualizing every internal model layer;
- light-first and spacious;
- high information integrity with calm state labels.

## Color system

Primary surfaces are warm/light rather than V2 navy.

- Chalk: `#F4F3EC` — application background.
- Paper: `#FFFFFF` — primary content surfaces.
- Ink: `#14201A` — primary text.
- Slate: `#66736B` — secondary text.
- Line: `#DDE2DD` — standard border.
- Pitch: `#0B6B46` — primary brand/action color.
- Pitch Deep: `#075338` — strong states/hover.
- Intelligence Blue: `#2B63E5` — model/intelligence cue only.
- Energy Lime: `#B8EE56` — sparing high-signal accent.
- Amber: `#B8741A` — uncertainty/warning.
- Red: `#B83E3E` — negative/error.

Do not use dark purple/black FIE gradients as a default V3 surface.

## Typography

Planned families:

- Display / football headlines: `Manrope`.
- UI / data / body: `Inter`.

Fallbacks must remain strong system sans-serifs so the product remains usable before fonts load.

Typography hierarchy:

- Display: 42–64px desktop, 32–44px mobile.
- Page title: 32–44px desktop, 28–34px mobile.
- Section title: 20–28px.
- Card title: 15–18px.
- Body: 14–16px.
- Metadata: 11–13px.

Numerical metrics use tabular figures.

## Layout

Desktop:

- max content width: 1280px;
- top navigation, not a permanent dark side rail;
- 24–32px page gutters;
- FPL pitch may expand wider than ordinary article/card content.

Tablet:

- 20–24px gutters;
- pitch remains primary and cards reorganize below it.

Mobile:

- 12–16px gutters;
- bottom navigation;
- pitch is horizontally contained rather than replaced by a list;
- list view is an explicit secondary toggle.

## Spacing

Base rhythm: 4px.

Common tokens: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64.

## Shape

- small radius: 10px;
- standard card radius: 16px;
- hero/pitch container radius: 24px;
- pills reserved for statuses, filters and compact controls rather than every UI element.

## Elevation

Use subtle paper separation, not glowing panels.

- standard card: border first, minimal shadow;
- floating/interactive card: soft low-opacity shadow;
- pitch players may use stronger separation for legibility.

## Information hierarchy

Consumer layer first:

1. what state am I viewing?;
2. what team/action matters?;
3. what is happening live?;
4. what does the engine expect?;
5. why / provenance only when expanded.

Never lead with run IDs, model versions, tracker IDs or pipeline jargon unless the user opens evidence/details.

## FPL-specific UI

Primary workspace:

- lifecycle/status strip;
- Actual / Engine / Live state switcher;
- formation-aware pitch;
- player shirts/cards with name, opponent, H/A, captain/vice marker and one primary metric;
- bench visually separated under the pitch;
- transfer summary immediately below/adjacent;
- secondary list view toggle;
- advanced model evidence lower in the page.

State color must not substitute for text. Authorization and verification always remain explicit words.

## Accessibility

- WCAG AA contrast target for text and controls;
- minimum 44px interactive target;
- focus-visible ring on all interactive controls;
- reduced-motion support;
- pitch/list information equivalence for screen readers;
- never rely on red/green alone for semantic differences.
