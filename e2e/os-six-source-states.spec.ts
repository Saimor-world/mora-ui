import { expect, test, type Page } from '@playwright/test';

/**
 * Issue #107: six-state OS UI proof using isolated, synthetic HTTP contracts.
 *
 * This is NOT an integrated CORE server / live IMAP browser test. That backend
 * path has its own real loopback IMAP + HTTP suite in saimor-core PR #125.
 * We deliberately do not sign in to a real account, use live credentials,
 * call network endpoints, send mail, or reset any remote state here.
 */
type MailState = 'ok' | 'empty' | 'disconnected' | 'partial' | 'unavailable' | 'stale';
const COMPANY = 'company-browser-qa';
const USER = 'qa-operator';
const TENANT = 'tenant-qa';
const MESSAGE_ID = '<issue107-ui-proof@local.test>';
const SUBJECT = '[ISSUE107] Synthetischer Prüfbericht';

test.setTimeout(65_000);

async function withMailState(page: Page, state: MailState) {
  const visited: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('saimor_product_tour_dismissed', '1');
    localStorage.setItem('last_company_id', 'company-browser-qa');
    localStorage.setItem('saimor_active_company', 'company-browser-qa');
    localStorage.setItem('last_activity', new Date().toISOString());
    localStorage.setItem('saimor_os_onboarding_org', JSON.stringify({
      company: 'QA Testfirma', departments: ['Management'],
    }));
  });
  await page.context().addCookies([
    { name: 'mora_auth_token', value: 'sess_issue107_synthetic_browser_only', url: 'http://127.0.0.1:3000' },
  ]);

  const now = new Date();
  const observed = new Date(now.getTime() - (state === 'stale' ? 15 * 60_000 : 3_000)).toISOString();
  const sourceScope = (level: 'user' | 'company') => ({
    level, tenant_id: TENANT, user_id: USER,
    company_id: level === 'company' ? COMPANY : null,
  });
  const source = (id: string, level: 'user' | 'company' = 'company') => ({
    status: 'unavailable', source: id, scope: sourceScope(level),
    connection: 'not_verified', complete: false, as_of: observed,
    stale_after_seconds: 300,
  });
  const verified = state === 'ok' || state === 'empty';
  const count = state === 'empty' ? 0 : state === 'ok' ? 1 : null;
  const mailItems = state === 'ok' || state === 'stale' ? [{
    id: 'issue107-1', message_id: MESSAGE_ID, subject: SUBJECT,
    from_addr: 'synthetic@example.test', date: observed, snippet: 'Testdaten, keine Mailtexte.',
  }] : [];
  const summaryStatus = state;
  const summary = {
    method: 'regelbasiert', status: summaryStatus, total: state === 'ok' ? 1 : 0,
    verified_at: observed,
    headline: state === 'empty' ? '0 Nachrichten im verifizierten Posteingang.'
      : state === 'ok' ? '1 synthetische Nachricht im verifizierten Posteingang.'
        : 'Datenstand nicht vollständig und aktuell bestätigt.',
    source: { provider: 'local_test', dev_only: true, scope: sourceScope('user') },
    groups: state === 'ok' ? [{
      key: 'rechnung', label: 'Rechnungen', count: 1,
      refs: [{ uid: 'issue107-1', message_id: MESSAGE_ID,
        subject: SUBJECT, from: 'Synthetic <synthetic@example.test>', date: observed }],
    }] : [],
    other: { count: 0, refs: [] },
  };

  await page.route('**/api/core/v3/**', async (route) => {
    const url = new URL(route.request().url());
    visited.push(url.pathname + url.search);
    const end = (suffix: string) => url.pathname.endsWith(suffix);
    let status = 200;
    let payload: unknown = { status: 'unavailable' };
    if (end('/auth/session')) payload = {
      user_id: USER, full_name: 'QA Operator', role: 'owner', tenant_id: TENANT,
      active_company_id: COMPANY, company_count: 1,
      operational_state: 'operational', setup_required: false,
    };
    else if (end('/connections')) payload = {
      connections: [
        { id: 'mail', label: 'Mail', group: 'mail',
          status: state === 'disconnected' ? 'available' : 'connected',
          source: 'local_test', detail: 'Nur synthetischer Test', scope: sourceScope('user') },
        { id: 'calendar', label: 'Calendar', group: 'calendar',
          status: 'available', detail: 'Nicht verbunden' },
      ],
    };
    else if (end('/mail/messages')) payload = {
      status: state, source: 'local_test', scope: sourceScope('user'),
      as_of: observed, complete: verified,
      messages: state === 'ok' ? mailItems : [],
    };
    else if (end('/connections/mail/summary')) {
      if (state === 'disconnected') {
        status = 409;
        payload = { detail: 'Kein verifiziert verbundenes Postfach.' };
      } else payload = summary;
    }
    else if (end('/today')) payload = {
      status: verified ? 'degraded' : 'unknown',
      date: now.toISOString().slice(0, 10), timezone: 'Europe/Berlin',
      generated_at: now.toISOString(),
      requested_scope: { tenant_id: TENANT, user_id: USER, company_id: COMPANY },
      mail: {
        ...source('local_test', 'user'), status: state,
        connection: state === 'disconnected' ? 'not_verified' : 'verified_test_snapshot',
        complete: verified, inbox_loaded: count,
        sample_limit: 5, items: state === 'ok' ? mailItems : [],
      },
      calendar: { ...source('calendar'), date: now.toISOString().slice(0, 10),
        count: null, next_event: null, events: [] },
      tasks: { ...source('tasks'),
        counts: { open: null, in_progress: null, due_today: null, overdue: null },
        items: [], due_today: [], overdue: [] },
      nightwatch: { ...source('nightwatch'), open_incidents: null,
        health_score: null, incidents: [] },
    };
    else if (end('/briefing')) payload = { status: 'degraded' };
    else if (end('/calendar/events')) payload = [];
    else if (end('/health')) payload = { state: 'online' };
    await route.fulfill({
      status, contentType: 'application/json',
      body: JSON.stringify(status === 409 ? payload : { data: payload, meta: { api_version: 'v3' } }),
    });
  });
  return visited;
}

const cardTitle: Record<MailState, string> = {
  ok: SUBJECT, empty: 'Keine Nachrichten geladen',
  disconnected: 'Nicht verbunden', partial: 'Unvollständig',
  unavailable: 'Nicht erreichbar', stale: 'Daten veraltet',
};

for (const state of ['ok', 'empty', 'disconnected', 'partial', 'unavailable', 'stale'] as const) {
  test(`Issue 107 six-state browser proof: ${state} in Post, Heute, MÔRA`, async ({ page }) => {
    const visited = await withMailState(page, state);

    // Post must never invent a verifiably empty mailbox for a degraded state.
    await page.goto('/os#post');
    await expect(page.getByTestId('feature-post')).toBeVisible({ timeout: 30_000 });
    if (state === 'disconnected') {
      await expect(page.getByTestId('post-source-gate-mail')).toBeVisible({ timeout: 25_000 });
      expect(visited.some((s) => s.includes('/mail/messages'))).toBe(false);
      await expect(page.getByText('Posteingang leer')).toHaveCount(0);
    } else if (state === 'ok') {
      await expect(page.getByText(SUBJECT)).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText('Posteingang leer')).toHaveCount(0);
    } else if (state === 'empty') {
      await expect(page.getByText('Posteingang leer')).toBeVisible({ timeout: 25_000 });
    } else {
      const label: Record<'partial' | 'unavailable' | 'stale', string> = {
        partial: 'Abruf unvollständig',
        unavailable: 'Quelle nicht erreichbar',
        stale: 'Daten veraltet',
      };
      await expect(page.getByText(label[state])).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText('Posteingang leer')).toHaveCount(0);
      await expect(page.getByText('Letzter bestätigter Stand:', { exact: false })).toBeVisible();
    }

    await page.goto('/os#today');
    const mailCard = page.getByTestId('today-now-mail');
    await expect(mailCard).toContainText(cardTitle[state], { timeout: 30_000 });
    if (!['ok', 'empty'].includes(state)) {
      await expect(mailCard).not.toContainText('Keine Nachrichten geladen');
      await expect(mailCard).not.toContainText('Nichts Neues');
      await expect(mailCard).not.toContainText('Heute frei');
    }

    if (state === 'ok') {
      await expect(page.getByTestId('mail-summary')).toContainText('1 synthetische Nachricht', { timeout: 25_000 });
      await expect(page.getByTestId('mail-ref')).toHaveAttribute('data-message-id', MESSAGE_ID);
    } else if (state === 'empty') {
      await expect(page.getByTestId('mail-summary-empty')).toContainText('wirklich leer', { timeout: 25_000 });
      await expect(page.getByTestId('mail-summary')).toHaveCount(0);
    } else if (state === 'disconnected') {
      // No verified connector means MÔRA must not fetch a mail summary.
      await expect(page.getByTestId('briefing-pending')).toContainText('Quellen angebunden', { timeout: 25_000 });
      await expect(page.getByTestId('mail-summary')).toHaveCount(0);
      await expect(page.getByTestId('mail-summary-empty')).toHaveCount(0);
      expect(visited.some((p) => p.endsWith('/connections/mail/summary'))).toBe(false);
    } else {
      await expect(page.getByTestId('mail-summary-degraded')).toHaveAttribute('data-state', state, { timeout: 25_000 });
      await expect(page.getByTestId('mail-summary-degraded')).toContainText('Keine Aussage über neue oder fehlende Nachrichten.');
      await expect(page.getByTestId('mail-summary-empty')).toHaveCount(0);
    }
    expect(visited.some((s) => s.includes('/today?company_id=company-browser-qa'))).toBe(true);
    if (state !== 'disconnected') {
      expect(visited.some((s) => s.endsWith('/connections/mail/summary'))).toBe(true);
    }
  });
}
