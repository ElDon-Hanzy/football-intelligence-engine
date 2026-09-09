import { expect, test } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';
import { ManagerPlanApiSchema } from '../src/lib/contracts';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live API contract smoke runs once per CI matrix.');
}

test('C0239 current GW manager API serves a browser-parseable C0237 live plan', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  const response = await request.get(`${endpoints.managerPlan}?gw=4`, { headers: publicGatewayHeaders });
  expect(response.ok()).toBe(true);
  const parsed = ManagerPlanApiSchema.parse(await response.json());
  expect(parsed.gameweek).toBe(4);
  expect(parsed.plan).not.toBeNull();
  expect(parsed.plan?.source ?? '').toMatch(/^C0237_ALWAYS_LIVE_PLAN_/);
  expect(parsed.plan?.starting_xi).toHaveLength(11);
  expect(parsed.plan?.bench_order).toHaveLength(4);
  expect(parsed.plan?.transfers.length ?? 0).toBeGreaterThanOrEqual(0);
  expect(typeof parsed.plan?.horizon).toBe('string');
});
