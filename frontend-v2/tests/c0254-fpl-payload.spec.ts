import { expect, test } from '@playwright/test';
import { endpoints, publicGatewayHeaders } from '../src/lib/api';

function desktopOnly(projectName: string): void {
  test.skip(projectName !== 'desktop-1366', 'Live payload-size integration runs once per CI matrix.');
}

test('C0254 fpl-api omits internal feature blobs from the public UI payload', async ({ request }, testInfo) => {
  desktopOnly(testInfo.project.name);
  test.setTimeout(90_000);

  const statusResponse = await request.get(endpoints.gameweekStatus, {
    headers: publicGatewayHeaders,
    timeout: 30_000,
  });
  expect(statusResponse.ok()).toBe(true);
  const status = await statusResponse.json();
  const gw = Number(status.live_gameweek);
  expect(Number.isInteger(gw) && gw >= 1 && gw <= 38).toBe(true);

  const response = await request.get(`${endpoints.fpl}?gw=${gw}`, { timeout: 60_000 });
  expect(response.ok()).toBe(true);
  const body = await response.body();
  const payload = JSON.parse(body.toString('utf8'));

  expect(payload.ok).toBe(true);
  expect(payload.all_predictions.length).toBeGreaterThanOrEqual(500);
  expect(payload.squad).toHaveLength(15);
  // The payload itself is the authority for this contract. A descriptive serving_semantics
  // flag is useful metadata, but its presence must not be stronger than proving that the
  // internal feature blobs are actually absent from every serialized player row.
  expect(payload.all_predictions.every((player: Record<string, unknown>) => player.features === undefined)).toBe(true);
  expect(payload.squad.every((player: Record<string, unknown>) => player.features === undefined)).toBe(true);

  console.log(`C0254_FPL_PAYLOAD_BYTES|${body.byteLength}`);
  expect(body.byteLength).toBeLessThan(1_500_000);
});
