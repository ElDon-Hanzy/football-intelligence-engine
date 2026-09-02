import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fixtureResults = Array.from({ length: 10 }, (_, index) => {
  const markets = index === 0
    ? { home_win: 0.3819, draw: 0.2433, away_win: 0.3745 }
    : index === 1
      ? { home_win: 0.4055, draw: 0.2592, away_win: 0.3351 }
      : index === 2
        ? { home_win: 0.22, draw: 0.22, away_win: 0.56 }
        : { home_win: 0.52, draw: 0.25, away_win: 0.23 };
  return {
    match_id: 25 + index,
    kickoff_time: `2026-09-0${index < 5 ? 4 : 6}T${String(12 + index).padStart(2, '0')}:00:00+00:00`,
    home_team: index === 0 ? 'Fulham' : index === 1 ? "Nott'm Forest" : `Home ${index}`,
    away_team: index === 0 ? 'Crystal Palace' : index === 1 ? 'Spurs' : index === 2 ? 'Liverpool' : `Away ${index}`,
    home_short: index === 0 ? 'FUL' : `H${index}`,
    away_short: index === 0 ? 'CRY' : `A${index}`,
    finished: false,
    prediction: {
      snapshot_id: 211 + index,
      source_change_id: 'C0166',
      captured_at: '2026-09-01T21:03:00+00:00',
      markets,
      home_lambda: index === 0 ? 1.49 : 1.75,
      away_lambda: index === 0 ? 1.49 : 1.2,
      headline_score: '1-1',
      headline_score_probability: 0.11,
      raw_modal_score: '1-1',
      raw_modal_probability: 0.112,
      script_family: index === 2 ? 'AWAY' : 'HOME',
      script_confidence: Math.max(markets.home_win, markets.draw, markets.away_win),
      selector: { selector_rule: 'RAW_MODE_RETAINED_UNCERTAIN_CONFLICT' },
      top_scorelines: [{ score: '1-1', prob: 0.112 }, { score: '1-0', prob: 0.084 }, { score: '2-1', prob: 0.08 }],
    },
  };
});

const recent = (teamId: number) => Array.from({ length: 5 }, (_, index) => ({
  team_id: teamId,
  sequence_no: index + 1,
  opponent_team_id: index === 4 ? null : 90 + index,
  opponent_name: `Opponent ${index + 1}`,
  opponent_short: `O${index + 1}`,
  fixture_kickoff: `2026-08-${String(30 - index * 7).padStart(2, '0')}T14:00:00+00:00`,
  venue: index % 2 === 0 ? 'H' : 'A',
  goals_for: index % 3,
  goals_against: (index + 1) % 3,
  result: index % 3 === 0 ? 'W' : index % 3 === 1 ? 'D' : 'L',
}));

const fact = (id: number, matchId: number, family: string, text: string, rank: number, alignment: 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL' = 'SUPPORTS') => ({
  id, snapshot_run_id: 7, match_id: matchId,
  team_id: alignment === 'CONTRADICTS' ? 8 : 10, opponent_team_id: alignment === 'CONTRADICTS' ? 10 : 8,
  fact_type: `C0190_${family}`, usefulness_score: 1 - rank / 20, card_rank: rank, alignment, one_liner: text,
  payload: { family, model_effect_enabled: false }, evidence_cutoff: '2026-09-01T20:32:50+00:00',
});

const factsPayload = {
  ok: true, gameweek: 3, facts_available: true, evidence_source: 'dynamic_c0166_plus_c0190_context', snapshot_run: { id: 7, as_of_gameweek: 2 },
  fixtures: fixtureResults.map((fixture, index) => ({
    match_id: fixture.match_id, gameweek: 3, kickoff_time: fixture.kickoff_time,
    home: { id: 10 + index * 2, name: fixture.home_team, short_name: fixture.home_short, recent: recent(10 + index * 2) },
    away: { id: 11 + index * 2, name: fixture.away_team, short_name: fixture.away_short, recent: recent(11 + index * 2) },
    alignment_basis: { snapshot_id: index === 1 ? 999 : fixture.prediction.snapshot_id, captured_at: '2026-09-01T21:03:00+00:00', source_change_id: 'C0166', top_outcome: 'H', markets: fixture.prediction.markets },
    card_facts: [],
    modal_facts: index === 0 ? [
      fact(11, fixture.match_id, 'BASELINE_MODEL', 'The structural baseline slightly favours Fulham.', 1),
      fact(12, fixture.match_id, 'VENUE_ATTACK_XG', 'Fulham carry the stronger venue attack xG.', 2),
      fact(13, fixture.match_id, 'SEASON_RESULTS', 'Fulham have the stronger early-season result line.', 3),
      fact(14, fixture.match_id, 'RECENT_GOAL_BALANCE', 'Fulham have the stronger recent goal balance.', 4),
      fact(15, fixture.match_id, 'SEASON_SCORING', 'Fulham are scoring more per league match this season.', 5),
      fact(16, fixture.match_id, 'SEASON_CLEAN_SHEETS', 'A sixth support should be capped from the primary group.', 6),
      fact(20, fixture.match_id, 'CURRENT_SEASON_PROCESS', 'Palace have the stronger current-season chance profile.', 1, 'CONTRADICTS'),
      fact(21, fixture.match_id, 'TACTICAL_WIDE', 'Tactical research gives Palace the stronger wide matchup.', 2, 'CONTRADICTS'),
    ] : [fact(200 + index, fixture.match_id, 'PROCESS', 'One evidence family supports the numerical lean.', 1)],
  })),
};

const fplPayload = { ok: true, gameweek: 3, model_version: '0.1.3', squad: [], fixture_results: fixtureResults };
const gameweekStatusPayload = { ok: true, live_gameweek: 3, reason: 'NEXT_UNFINISHED_GAMEWEEK', as_of: '2026-09-02T07:00:00Z', schedule: [{ gameweek: 3, fixtures: 10, finished: 0, unfinished: 10, first_kickoff: '2026-09-04T19:00:00Z', last_kickoff: '2026-09-06T15:30:00Z' }], teams: [{ id: 1, fpl_team_id: 9, name: 'Fulham', short_name: 'FUL', team_code: 54 }, { id: 2, fpl_team_id: 7, name: 'Crystal Palace', short_name: 'CRY', team_code: 31 }], semantics: { frozen_projection_runs_do_not_define_live_gameweek: true } };

test.beforeEach(async ({ page }) => {
  await page.route('**/fpl-api**', async (route) => route.fulfill({ json: fplPayload }));
  await page.route('**/fixture-facts-api**', async (route) => route.fulfill({ json: factsPayload }));
  await page.route('**/gameweek-status-api**', async (route) => route.fulfill({ json: gameweekStatusPayload }));
});

test('fixture scan stays compact and opens the accessible matchup modal directly', async ({ page }) => {
  await page.goto('/?view=fixtures&gw=3');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixtures' })).toBeVisible();
  const cards = page.locator('.fixture-card');
  await expect(cards).toHaveCount(10);
  await expect(cards.nth(0).getByText('No clear edge')).toBeVisible();
  await expect(cards.nth(1).getByText('Lean', { exact: true })).toBeVisible();
  await expect(cards.nth(2).getByText('Strong', { exact: true })).toBeVisible();
  await expect(cards.nth(0).getByText('FUL', { exact: true })).toBeVisible();
  await expect(cards.nth(0).locator('.compact-form-dot')).toHaveCount(10);
  await expect(cards.nth(0).locator('.club-crest')).toHaveCount(2);
  await expect(cards.nth(0).getByText(/exact-score probability/i)).toHaveCount(0);
  await expect(cards.nth(0).locator('.fixture-expanded')).toHaveCount(0);
  await expect(cards.nth(0).locator('.club-crest.is-expanded')).toHaveCount(0);

  const openButton = cards.nth(0).getByRole('button', { name: 'Open matchup' });
  await expect(openButton).toBeVisible();
  await expect(cards.nth(1).getByRole('button', { name: 'Matchup refreshing' })).toBeDisabled();

  await openButton.click();
  const dialog = page.getByRole('dialog', { name: 'Fulham vs Crystal Palace' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close Fulham vs Crystal Palace' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  const story = await dialog.locator('.match-story p').textContent();
  expect(story).toContain('genuine split');
  expect(story).toContain('0.7pp');
  expect(story).toContain('6 distinct evidence families');
  await expect(dialog.getByRole('heading', { name: /Case for Fulham/ })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /Case against Fulham/ })).toBeVisible();
  await expect(dialog.locator('.modal-evidence-group.is-support li')).toHaveCount(5);
  await expect(dialog.locator('.modal-evidence-group.is-risk li')).toHaveCount(2);
  await expect(dialog.getByText('A sixth support should be capped from the primary group.')).toHaveCount(0);
  await expect(dialog.getByText('Palace have the stronger current-season chance profile.')).toBeVisible();
  await expect(dialog.getByText(/Research-only context does not change the production forecast/)).toBeVisible();

  const technical = dialog.getByText('Technical details', { exact: true });
  await expect(dialog.getByText('Raw modal score', { exact: true })).not.toBeVisible();
  await page.keyboard.press('Tab');
  await expect(technical).toBeFocused();
  await technical.click();
  await expect(dialog.getByText('Raw modal score', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Selector rule', { exact: true })).toBeVisible();

  const modalA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(modalA11y.violations).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await expect(openButton).toBeFocused();

  await openButton.click();
  await expect(dialog).toBeVisible();
  await page.locator('.dialog-backdrop').click({ position: { x: 4, y: 4 } });
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');

  await openButton.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close Fulham vs Crystal Palace' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(openButton).toBeFocused();

  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations).toEqual([]);
});

test('finished fixtures always show explicit prediction audit marks, including no-edge top calls', async ({ page }) => {
  const finishedFixtures = fixtureResults.map((fixture, index) => index === 0 ? {
    ...fixture,
    finished: true,
    home_score: 1,
    away_score: 0,
  } : fixture);
  await page.unroute('**/fpl-api**');
  await page.route('**/fpl-api**', async (route) => route.fulfill({ json: { ...fplPayload, fixture_results: finishedFixtures } }));

  await page.goto('/?view=fixtures&gw=3');
  const card = page.locator('.fixture-card').first();
  await expect(card.getByText('FT', { exact: true })).toBeVisible();
  await expect(card.getByText(/No clear edge · top FUL win/)).toBeVisible();
  await expect(card.getByLabel('top 1X2 prediction correct')).toBeVisible();
  await expect(card.getByLabel('exact-score prediction incorrect')).toBeVisible();
  await expect(card.locator('.inline-audit-mark.is-correct')).toHaveCount(1);
  await expect(card.locator('.inline-audit-mark.is-wrong')).toHaveCount(1);
  await expect(card.getByText('Actual 1-0', { exact: true })).toBeVisible();

  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations).toEqual([]);
});
