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
  id,
  snapshot_run_id: 7,
  match_id: matchId,
  team_id: alignment === 'CONTRADICTS' ? 8 : 10,
  opponent_team_id: alignment === 'CONTRADICTS' ? 10 : 8,
  fact_type: `C0166_${family}`,
  usefulness_score: 1 - rank / 10,
  card_rank: rank,
  alignment,
  one_liner: text,
  payload: { family },
  evidence_cutoff: '2026-09-01T20:32:50+00:00',
});

const factsPayload = {
  ok: true,
  gameweek: 3,
  facts_available: true,
  evidence_source: 'dynamic_c0166_views',
  snapshot_run: { id: 7, as_of_gameweek: 2 },
  fixtures: fixtureResults.map((fixture, index) => ({
    match_id: fixture.match_id,
    gameweek: 3,
    kickoff_time: fixture.kickoff_time,
    home: { id: 10 + index * 2, name: fixture.home_team, short_name: fixture.home_short, recent: recent(10 + index * 2) },
    away: { id: 11 + index * 2, name: fixture.away_team, short_name: fixture.away_short, recent: recent(11 + index * 2) },
    alignment_basis: { snapshot_id: index === 1 ? 999 : fixture.prediction.snapshot_id, captured_at: '2026-09-01T21:03:00+00:00', source_change_id: 'C0166', top_outcome: 'H', markets: fixture.prediction.markets },
    card_facts: index === 0 ? [
      fact(1, fixture.match_id, 'VENUE_FORM', 'Fulham have won six of ten home matches.', 1),
      fact(2, fixture.match_id, 'VENUE_FORM', 'Duplicate venue family should not display.', 2),
      fact(3, fixture.match_id, 'STREAK', 'Palace are winless in nine league matches.', 3),
      fact(4, fixture.match_id, 'MATCHUP_XG', 'Fulham have the stronger chance matchup.', 4),
      fact(5, fixture.match_id, 'PROCESS', 'A fourth distinct fact is capped out.', 5),
    ] : [fact(100 + index, fixture.match_id, 'PROCESS', 'One signed model input supports the numerical lean.', 1)],
    modal_facts: index === 0 ? [
      fact(11, fixture.match_id, 'VENUE_FORM', 'Fulham have won six of ten home matches.', 1),
      fact(12, fixture.match_id, 'STREAK', 'Palace are winless in nine league matches.', 2),
      fact(13, fixture.match_id, 'MATCHUP_XG', 'Fulham have the stronger chance matchup.', 3),
      fact(14, fixture.match_id, 'PROCESS', 'A fourth support should not crowd out the risk section.', 4),
      fact(20, fixture.match_id, 'CURRENT_SEASON_PROCESS', 'Palace have the stronger current-season chance profile.', 1, 'CONTRADICTS'),
    ] : [fact(200 + index, fixture.match_id, 'PROCESS', 'One signed model input supports the numerical lean.', 1)],
  })),
};

const fplPayload = { ok: true, gameweek: 3, model_version: '0.1.3', squad: [], fixture_results: fixtureResults };

test.beforeEach(async ({ page }) => {
  await page.route('**/fpl-api**', async (route) => route.fulfill({ json: fplPayload }));
  await page.route('**/fixture-facts-api**', async (route) => route.fulfill({ json: factsPayload }));
});

test('fixture scan renders calls, bounded evidence and an atomic accessible matchup modal', async ({ page }) => {
  await page.goto('/?view=fixtures&gw=3');
  await expect(page.getByRole('heading', { level: 1, name: 'Fixtures' })).toBeVisible();
  const cards = page.locator('.fixture-card');
  await expect(cards).toHaveCount(10);
  await expect(cards.nth(0).getByText('No clear edge')).toBeVisible();
  await expect(cards.nth(1).getByText('Lean', { exact: true })).toBeVisible();
  await expect(cards.nth(2).getByText('Strong call', { exact: true })).toBeVisible();

  const formButton = cards.nth(0).locator('.form-result-button').first();
  const box = await formButton.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await formButton.click();
  await expect(cards.nth(0).locator('.form-detail')).toBeVisible();

  await cards.nth(0).getByRole('button', { name: /Decision evidence/ }).click();
  await expect(cards.nth(0).locator('.evidence-list li')).toHaveCount(3);
  await expect(cards.nth(0).getByText('Duplicate venue family should not display.')).toHaveCount(0);

  await expect(cards.nth(1).getByText(/Evidence is refreshing/)).toBeVisible();
  await expect(cards.nth(1).getByRole('button', { name: /Decision evidence/ })).toHaveCount(0);
  await expect(cards.nth(1).getByRole('button', { name: 'Matchup refreshing' })).toBeDisabled();

  const openButton = cards.nth(0).getByRole('button', { name: 'Open matchup' });
  await openButton.click();
  const dialog = page.getByRole('dialog', { name: 'Fulham vs Crystal Palace' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close Fulham vs Crystal Palace' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  const story = await dialog.locator('.match-story p').textContent();
  expect(story).toContain('effectively split');
  expect(story).toContain('0.7pp');
  expect(story).not.toContain('Fulham have won six of ten home matches.');
  await expect(dialog.getByRole('heading', { name: 'Supports the call' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Counterpoints / risks' })).toBeVisible();
  await expect(dialog.getByText('Palace have the stronger current-season chance profile.')).toBeVisible();
  await expect(dialog.getByText('A fourth support should not crowd out the risk section.')).toHaveCount(0);

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
