import { expect, test, type Page } from '@playwright/test';

/** HTTP-contract simulator, NOT a real CORE/IMAP E2E. Synthetic fixtures only. */
test.setTimeout(60000);
type Scenario = 'connected' | 'not_connected' | 'invalid_mail';
const seen: string[] = [];

async function setup(page: Page, scenario: Scenario) {
  seen.length = 0;
  await page.addInitScript(() => {
    localStorage.setItem('saimor_product_tour_dismissed', '1');
    localStorage.setItem('last_company_id', 'company-browser-qa');
    localStorage.setItem('saimor_active_company', 'company-browser-qa');
    localStorage.setItem('last_activity', new Date().toISOString());
    localStorage.setItem('saimor_os_onboarding_org', JSON.stringify({ company: 'QA Testfirma', departments: ['Management'] }));
  });
  await page.context().addCookies([{ name: 'mora_auth_token', value: 'sess_browser_contract_only', url: 'http://127.0.0.1:3000' }]);
  await page.route('**/api/core/v3/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    seen.push(url.pathname + url.search);
    let payload: unknown;
    if (url.pathname.endsWith('/auth/session')) payload = {
      user_id: 'qa-operator', full_name: 'QA Operator', role: 'owner',
      tenant_id: 'tenant-qa', active_company_id: 'company-browser-qa', company_count: 1,
      operational_state: 'operational', setup_required: false
    };
    else if (url.pathname.endsWith('/connections')) payload = {
      connections: [{ id: 'mail', label: 'Mail', group: 'mail',
        status: scenario === 'not_connected' ? 'available' : 'connected',
        source: 'synthetic_http', detail: 'nur Test' },
        { id: 'calendar', label: 'Calendar', group: 'calendar', status: 'available', detail: 'nur Test' }]
    };
    else if (url.pathname.endsWith('/mail/messages')) payload = scenario === 'invalid_mail'
      ? { unexpected_shape: true }
      : [{ id: 'synthetic-1', subject: 'Test-Eingang mit CORE-Feld', from_addr: 'test@example.invalid',
           snippet: 'Nur synthetische Daten', read: false }];
    else if (url.pathname.endsWith('/calendar/events')) payload = [];
    else if (url.pathname.endsWith('/health')) payload = { state: 'online' };
    else payload = { status: 'unavailable' };
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: payload, meta: { api_version: 'v3' } }) });
  });
}

test('CORE connected: Post displays test mail and only selected company is requested', async ({ page }) => {
  await setup(page, 'connected');
  await page.goto('/os#post');
  await expect(page.getByText('Test-Eingang mit CORE-Feld')).toBeVisible({ timeout: 30000 });
  expect(seen.some((p) => p.includes('/mail/messages?company_id=company-browser-qa'))).toBe(true);
  await expect(page.getByTestId('post-source-gate-calendar')).toBeVisible();
  await expect(page.getByText('Posteingang leer')).toHaveCount(0);
});

test('CORE not connected: no mail read and sources gate is visible', async ({ page }) => {
  await setup(page, 'not_connected');
  await page.goto('/os#post');
  await expect(page.getByTestId('post-source-gate-mail')).toBeVisible({ timeout: 25000 });
  expect(seen.some((p) => p.includes('/mail/messages'))).toBe(false);
  await expect(page.getByText('Posteingang leer')).toHaveCount(0);
  await page.getByTestId('post-source-gate-mail').getByRole('button', { name: 'Quellen prüfen' }).click();
  await expect(page.getByTestId('feature-settings')).toBeVisible();
  await expect(page).toHaveURL(/#settings$/);
});

test('CORE unexpected successful payload is not treated as empty', async ({ page }) => {
  await setup(page, 'invalid_mail');
  await page.goto('/os#post');
  await expect(page.getByText('CORE hat keine Daten geliefert', { exact: false })).toBeVisible({ timeout: 25000 });
  await expect(page.getByText('Posteingang leer')).toHaveCount(0);
});

