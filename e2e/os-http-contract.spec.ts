import { expect, test, type Page } from '@playwright/test';

/** HTTP-contract simulator, NOT a real CORE/IMAP E2E. Synthetic fixtures only. */
test.setTimeout(60000);
type Scenario = 'connected' | 'not_connected' | 'invalid_mail' | 'today_connected' | 'today_mail_unavailable' | 'summary_unavailable';
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
    else if (url.pathname.endsWith('/connections/mail/summary')) {
      if (scenario === 'summary_unavailable') {
        await route.fulfill({
          status: 409, contentType: 'application/json',
          body: JSON.stringify({ detail: 'Kein verifiziert verbundenes Postfach.' }),
        });
        return;
      }
      const now = new Date().toISOString();
      payload = {
        method: 'regelbasiert',
        status: 'ok',
        total: 1,
        verified_at: now,
        headline: '1 synthetische Nachricht im verifizierten Posteingang.',
        source: { provider: 'local_test', dev_only: true },
        groups: [{
          key: 'rechnung',
          label: 'Rechnungen & Zahlungen',
          count: 1,
          refs: [{
            uid: 'synthetic-1',
            message_id: '<synthetic-1@dev-imap.example.test>',
            subject: 'Test-Eingang mit CORE-Feld',
            from: 'Testabsender <test@example.invalid>',
            date: now,
          }],
        }],
        other: { count: 0, refs: [] },
      };
    }
    else if (url.pathname.endsWith('/today')) {
      const now = new Date().toISOString();
      const date = now.slice(0, 10);
      const unavailable = (source: string, level: 'company' | 'user' = 'company') => ({
        status: 'unavailable',
        source,
        scope: { level, tenant_id: 'tenant-qa', user_id: 'qa-operator',
          company_id: level === 'company' ? 'company-browser-qa' : null },
        connection: 'not_verified',
        complete: false,
        as_of: now,
        stale_after_seconds: 300,
      });
      const mailReadable = scenario !== 'today_mail_unavailable';
      payload = {
        status: 'degraded',
        date,
        timezone: 'Europe/Berlin',
        generated_at: now,
        requested_scope: {
          tenant_id: 'tenant-qa',
          user_id: 'qa-operator',
          company_id: 'company-browser-qa',
        },
        mail: {
          ...unavailable('imap', 'user'),
          ...(mailReadable ? { status: 'ok', connection: 'connected', complete: true } : {}),
          inbox_loaded: mailReadable ? 1 : null,
          sample_limit: 5,
          items: mailReadable ? [{
            id: 'synthetic-1',
            subject: 'Test-Eingang mit CORE-Feld',
            from_addr: 'test@example.invalid',
            snippet: 'Nur synthetische Daten',
            read: false,
          }] : [],
        },
        calendar: {
          ...unavailable('calendar'), date, count: null, next_event: null, events: [],
        },
        tasks: {
          ...unavailable('tasks'),
          counts: { open: null, in_progress: null, due_today: null, overdue: null },
          items: [], due_today: [], overdue: [],
        },
        nightwatch: {
          ...unavailable('nightwatch'), open_incidents: null, health_score: null, incidents: [],
        },
      };
    }
    else if (url.pathname.endsWith('/briefing')) payload = { status: 'degraded' };
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


test('synthetic CORE snapshot: Post -> Heute -> MÔRA uses the same mail reference', async ({ page }) => {
  await setup(page, 'today_connected');
  await page.goto('/os#post');
  await expect(page.getByText('Test-Eingang mit CORE-Feld')).toBeVisible({ timeout: 30000 });
  await page.goto('/os#today');
  await expect(page.getByTestId('today-now-mail')).toContainText('Test-Eingang mit CORE-Feld', { timeout: 30000 });
  const summary = page.getByTestId('mail-summary');
  await expect(summary).toContainText('1 synthetische Nachricht');
  await expect(summary.getByTestId('mail-ref')).toHaveAttribute(
    'data-message-id', '<synthetic-1@dev-imap.example.test>',
  );
  await expect(page.getByTestId('mail-summary-method')).toContainText('regelbasiert');
  await expect(summary).toContainText('Test-Server · nur Entwicklung');
  // Other services intentionally unavailable; never claim a global all-clear.
  await expect(page.getByTestId('today-now-kalender')).toContainText('Nicht erreichbar');
  await expect(page.getByTestId('today-now-aufgaben')).toContainText('Nicht erreichbar');
  expect(seen.some((p) => p.endsWith('/connections/mail/summary'))).toBe(true);
  expect(seen.some((p) => p.includes('/today?company_id=company-browser-qa'))).toBe(true);
});

test('source connected does not mean a successful Today mail read', async ({ page }) => {
  await setup(page, 'today_mail_unavailable');
  await page.goto('/os#today');
  await expect(page.getByTestId('today-now-mail')).toContainText('Nicht erreichbar', { timeout: 30000 });
  await expect(page.getByTestId('today-now-mail')).not.toContainText('Keine Nachrichten');
  await expect(page.getByTestId('today-now-mail')).not.toContainText('Nichts Neues');
});

test('mail summary verification failure is visible and never represented as empty', async ({ page }) => {
  await setup(page, 'summary_unavailable');
  await page.goto('/os#today');
  await expect(page.getByTestId('mail-summary-error')).toContainText(
    'Kein verifiziert verbundenes Postfach', { timeout: 30000 },
  );
  await expect(page.getByTestId('mail-summary-empty')).toHaveCount(0);
});
