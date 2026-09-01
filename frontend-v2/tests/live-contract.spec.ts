import { expect, test } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';
import { FplApiSchema, ManagerPlanApiSchema } from '../src/lib/contracts';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live API contract smoke runs once per CI matrix.');
}

test('live GW3 FPL API satisfies the UI v2 contract', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.fpl}?gw=3`);
  expect(response.ok()).toBe(true);
  const parsed = FplApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.squad.length).toBeGreaterThanOrEqual(15);
  expect(parsed.fixture_results.length).toBe(10);
});

test('C0177 returns the immutable latest saved GW3 manager plan', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.managerPlan}?gw=3`, { headers: publicGatewayHeaders });
  expect(response.ok()).toBe(true);
  const parsed = ManagerPlanApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(3);
  expect(parsed.plan?.id).toBe(3);
  expect(parsed.plan?.captain_player_id).toBe(470);
  expect(parsed.plan?.transfers).toEqual([]);
});
