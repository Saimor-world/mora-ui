import { expect, test, type Page } from '@playwright/test';

/**
 * V1.8 · Erste echte lokale Quelle (E-Mail) – gegen den LIVE lokalen CORE (:8081)
 * und den dev-only IMAP-Test-Server (127.0.0.1:3143, synthetische Mails).
 *
 * Läuft nur, wenn die Zugangsdaten zur Laufzeit per Umgebung kommen – nie im Repo:
 *   OS_LIVE_EMAIL / OS_LIVE_PASSWORD     lokales CORE-Testkonto
 *   DEV_IMAP_USER / DEV_IMAP_PASSWORD    lokaler IMAP-Test-Server
 *   OS_LIVE_CORE_URL (default http://localhost:8081)
 * UI muss als Live-Build mit NEXT_PUBLIC_SAIMOR_CORE_URL=http://localhost:8081 laufen.
 * OS_LIVE_IMAP_DOWN=1 prüft stattdessen den Fehlerfall bei gestopptem IMAP-Server.
 */
const ENV = process.env;
const CORE = ENV.OS_LIVE_CORE_URL || 'http://localhost:8081';
const ready = Boolean(ENV.OS_LIVE_EMAIL && ENV.OS_LIVE_PASSWORD && ENV.DEV_IMAP_USER && ENV.DEV_IMAP_PASSWORD);
const imapDown = ENV.OS_LIVE_IMAP_DOWN === '1';

test.describe.configure({ mode: 'serial' });
test.skip(!ready, 'V1.8 live mail e2e needs local CORE + dev IMAP credentials from the environment');

async function login(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('saimor_product_tour_dismissed', '1');
    localStorage.setItem('saimor_os_onboarding_org', JSON.stringify({ company: 'Lokale Testfirma', departments: ['Management', 'Vertrieb', 'Wissen', 'Finanzen', 'Marketing'] }));
  });
  await page.goto('/login');
  const status = await page.evaluate(async ([email, password]) => (await fetch('/api/auth/core-login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password }),
  })).status, [ENV.OS_LIVE_EMAIL!, ENV.OS_LIVE_PASSWORD!]);
  expect(status).toBe(200);
}

/** Lokale Test-Verbindung im lokalen SQLite deaktivieren (nur Dev-CORE, nur Testkonto). */
async function resetMail(page: Page) {
  const status = await page.evaluate(async (core) => (await fetch(`${core}/v3/integrations/mail`, { method: 'DELETE', credentials: 'include' })).status, CORE);
  expect(status).toBe(200);
}

async function openSources(page: Page, look = 'kosmos') {
  await page.goto(`/os?phase=build&look=${look}&onboarding=off&section=sources#settings`);
  await page.getByTestId('settings-tab-sources').click();
  await expect(page.getByTestId('dock-station-mail')).toBeVisible({ timeout: 20_000 });
}

async function connectMail(page: Page, password: string) {
  await page.getByTestId('dock-station-mail').click();
  await page.getByTestId('dock-approve').click();
  const form = page.getByTestId('dock-form-mail');
  await form.locator('select').selectOption('local_test');
  await form.locator('input[type=email]').fill(ENV.DEV_IMAP_USER!);
  await form.locator('input[type=password]').fill(password);
  await page.getByTestId('dock-submit').click();
}

test('falsches Passwort: Fehler statt leeres Postfach, nichts angedockt', async ({ page }) => {
  test.skip(imapDown, 'only with running IMAP server');
  await login(page);
  await resetMail(page);
  await openSources(page);
  await expect(page.getByTestId('dock-station-mail')).toHaveAttribute('data-status', 'available');
  await connectMail(page, 'falsches-passwort-123');
  const err = page.getByTestId('dock-error');
  await expect(err).toContainText('Die Zugangsdaten wurden abgelehnt.');
  await expect(err).toContainText('Ein Fehler ist kein leeres Postfach.');
  await openSources(page);
  await expect(page.getByTestId('dock-station-mail')).toHaveAttribute('data-status', 'available');
});

test('richtiges Passwort: angedockt erst nach Abruf, erstes Signal, Heute mit Test-Mail und regelbasierter Zusammenfassung', async ({ page }) => {
  test.skip(imapDown, 'only with running IMAP server');
  await login(page);
  await resetMail(page);
  await openSources(page);
  await connectMail(page, ENV.DEV_IMAP_PASSWORD!);
  await expect(page.getByTestId('dock-docked')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('dock-verified')).toContainText('in CORE bestätigt');
  await expect(page.getByTestId('mail-summary-signal')).toContainText('Rechnung RE-TEST-0412');
  await expect(page.getByTestId('dock-first-signal')).toContainText('regelbasiert');
  await expect(page.getByTestId('dock-station-mail')).toHaveAttribute('data-status', 'connected');

  await page.getByTestId('dock-to-today').click();
  await expect(page.getByTestId('feature-today')).toBeVisible();
  await expect(page.getByTestId('today-now-mail')).toContainText('Rechnung RE-TEST-0412', { timeout: 20_000 });
  const summary = page.getByTestId('mail-summary');
  await expect(summary).toContainText('5 Nachrichten im Posteingang');
  await expect(page.getByTestId('mail-summary-method')).toHaveText('regelbasiert');
  await expect(page.getByTestId('mail-group-frist')).toContainText('Frist: Unterlagen');
  await expect(page.getByTestId('mail-ref')).toHaveCount(5);
});

test('IMAP-Server gestoppt: Heute zeigt einen Lesefehler, nicht „Nichts Neues“', async ({ page }) => {
  test.skip(!imapDown, 'run with OS_LIVE_IMAP_DOWN=1 after stopping the dev IMAP server');
  await login(page);
  await page.goto('/os?phase=build&look=kosmos&onboarding=off#today');
  await expect(page.getByTestId('today-now-mail')).toContainText('Unbekannt', { timeout: 20_000 });
  await expect(page.getByTestId('today-now-mail')).not.toContainText('Nichts Neues');
  await expect(page.getByText('Post gerade nicht verfügbar')).toBeVisible();
});
