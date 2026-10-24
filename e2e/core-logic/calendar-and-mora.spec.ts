import { execFileSync } from 'node:child_process';
import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';

const company = 'co-beispiel-lea';
const statusPath = `/api/core/v3/appointments/status?company_id=${company}`;
const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
async function phases(api: APIRequestContext) {
  const response = await api.get(statusPath);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.items as Array<{ event_id: string; phase: string; version: number }>;
}
async function setPhase(api: APIRequestContext, id: string, phase: string) {
  const current = (await phases(api)).find(e => e.event_id === id);
  const response = await api.put(`/api/core/v3/appointments/${id}/status?company_id=${company}`, { data: { phase, expected_version: current?.version ?? 0 } });
  expect(response.ok()).toBeTruthy();
}
async function picture(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${sha}-${name}.png`), fullPage: false });
}
test.beforeEach(async ({ context, request, baseURL }) => {
  // Synthetic local session, never a production credential.
  await context.addCookies([{ name: 'mora_session', value: 'sess_local_core_contract', url: baseURL! }]);
  const profile = await (await request.get('/api/core/v3/auth/session')).json();
  expect(profile.tenant_id).toBe('tenant-beispiel-lea');
  expect(profile.active_company_id).toBe(company);
  await context.addInitScript(() => localStorage.setItem('saimor_product_tour_dismissed', '1'));
  for (const id of ['e1', 'e2', 'e3', 'e4']) await setPhase(request, id, id === 'e1' ? 'geplant' : 'erledigt');
});

test('Today confirms CORE, undo persists, and a second device reloads the same state', async ({ page, browser, request, baseURL }, info) => {
  await page.goto('/os#today');
  await page.getByTestId('day-finish-stale').click();
  await expect(page.getByTestId('day-toast')).toContainText('abgeschlossen');
  expect((await phases(request)).find(e => e.event_id === 'e1')?.phase).toBe('erledigt');
  await picture(page, info, 'today-1440');
  const second = await browser.newContext({ baseURL, timezoneId: 'Europe/Berlin' });
  try {
    await second.addCookies([{ name: 'mora_session', value: 'sess_local_core_contract', url: baseURL! }]);
    await second.addInitScript(() => localStorage.setItem('saimor_product_tour_dismissed', '1'));
    const other = await second.newPage();
    await other.goto('/os#today');
    await expect(other.getByTestId('day-panel')).toBeVisible();
    await expect(other.getByTestId('day-finish-stale')).toHaveCount(0);
    await page.getByTestId('day-toast').getByRole('button', { name: 'Rückgängig' }).click();
    await expect(page.getByTestId('day-finish-stale')).toBeVisible();
    await other.reload();
    await expect(other.getByTestId('day-finish-stale')).toBeVisible();
  } finally { await second.close(); }
});

test('failed save leaves the appointment open and shows the error', async ({ page, request }, info) => {
  await page.goto('/os#today');
  await page.route('**/api/core/v3/appointments/e1/status?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Controlled local save failure' }) }));
  await page.getByTestId('day-finish-stale').click();
  await expect(page.getByTestId('day-toast')).toContainText('nicht gespeichert');
  await expect(page.getByTestId('day-finish-stale')).toBeVisible();
  expect((await phases(request)).find(e => e.event_id === 'e1')?.phase).toBe('geplant');
  await picture(page, info, 'save-error-1440');
});

test('Universe uses the existing CORE action and reports the disabled model honestly', async ({ page, request }, info) => {
  await page.goto('/os#universe');
  await expect(page.getByTestId('world-ask-input')).toBeVisible();
  await page.getByTestId('world-ask-input').fill('Wie war die Woche?');
  await page.getByTestId('world-ask-send').click();
  await expect(page.getByTestId('mora-reply')).toContainText('keine vollständige Antwort');
  await page.getByTestId('world-ask-input').fill('Sophie ist da');
  await page.getByTestId('world-ask-send').click();
  await expect(page.getByTestId('mora-reply')).toContainText('Termin läuft');
  expect((await phases(request)).find(e => e.event_id === 'e1')?.phase).toBe('laeuft');
  await page.getByTestId('mora-undo').click();
  await expect(page.getByTestId('mora-reply')).toContainText('Rückgängig gemacht');
  await picture(page, info, 'universe-1440');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await picture(page, info, 'universe-1920');
  await page.getByTestId('world-ask-input').fill('@Termine');
  await page.getByTestId('world-ask-send').click();
  await expect(page.getByTestId('world-ask-input')).toHaveCount(0);
});

test('phone companion remains usable and the other customer surfaces open', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/os#today');
  await page.getByTestId('day-finish-stale').click();
  await expect(page.getByTestId('day-toast')).toContainText('abgeschlossen');
  await expect(page.getByTestId('os-dock')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await picture(page, info, 'phone-390');
  for (const surface of ['post', 'knowledge', 'settings']) {
    await page.goto(`/os#${surface}`);
    await expect(page.getByTestId(`feature-${surface}`)).toBeVisible();
  }
  expect(errors).toEqual([]);
});
