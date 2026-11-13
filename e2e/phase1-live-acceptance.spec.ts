import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:13001';
const SHOT_DIR =
  'C:\\Users\\mf4hr\\.gemini\\antigravity\\brain\\6bdab588-e677-4e22-b7df-8785efc0dcb9';

async function prepareContext(context: BrowserContext) {
  await context.addInitScript(() => {
    window.localStorage.setItem('saimor_product_tour_dismissed', '1');
  });
}

async function loginViaCore(context: BrowserContext, email: string, password: string) {
  const loginRes = await context.request.post(`${BASE_URL}/api/auth/core-login`, {
    data: { email, password },
  });
  expect(loginRes.ok()).toBeTruthy();
  const cookies = await context.cookies(BASE_URL);
  expect(cookies.some((c) => c.name === 'mora_session')).toBeTruthy();
  expect(cookies.some((c) => c.name === 'mora_auth_token')).toBeTruthy();
}

async function openDepartmentDeskFromUniverse(page: Page, deptId: string) {
  const planetBtn = page.locator(`[data-testid="open-${deptId}"]`);
  await expect(planetBtn).toBeVisible({ timeout: 35_000 });
  await planetBtn.click();

  const enterBtn = page.locator('[data-testid="dept-room-enter"]');
  await expect(enterBtn).toBeVisible({ timeout: 15_000 });
  await enterBtn.click();

  const deskPlate = page.locator('[data-testid="wk-desk-plate"]');
  await expect(deskPlate).toBeVisible({ timeout: 15_000 });
  await deskPlate.click();

  await expect(page.locator('[data-testid="wk-workstation"]')).toBeVisible({ timeout: 15_000 });
}

async function closeDeskAndEnterCorridorRoom(page: Page, nextDeptId: string) {
  const closeBtn = page.locator('[data-testid="wk-workstation"] button.wk-ws-close').first();
  await expect(closeBtn).toBeVisible({ timeout: 10_000 });
  await closeBtn.click();
  await expect(page.locator('[data-testid="wk-workstation"]')).toHaveCount(0, { timeout: 10_000 });

  const corridorBtn = page.locator(`[data-testid="wk-corridor-${nextDeptId}"]`);
  await expect(corridorBtn).toBeVisible({ timeout: 15_000 });
  await corridorBtn.click();

  const deskPlate = page.locator('[data-testid="wk-desk-plate"]');
  await expect(deskPlate).toBeVisible({ timeout: 15_000 });
  await deskPlate.click();
  await expect(page.locator('[data-testid="wk-workstation"]')).toBeVisible({ timeout: 15_000 });
}

test.use({ actionTimeout: 45_000 });

test.describe.serial('Phase 1 Live Authenticated CORE + OS Acceptance', () => {
  test('1. Authenticated Owner HQ boot without fake Kanzlei Weber', async ({ browser }) => {
    test.setTimeout(150_000);
    const ownerCtx = await browser.newContext();
    try {
      await prepareContext(ownerCtx);
      await loginViaCore(ownerCtx, 'marius@saimor-e2e.test', 'Phase1OwnerPass!');
      const ownerPage = await ownerCtx.newPage();

      await ownerPage.goto(`${BASE_URL}/os#universe`, { waitUntil: 'domcontentloaded' });
      const sessionRes = await ownerCtx.request.get(`${BASE_URL}/api/core/v3/auth/session`);
      expect(sessionRes.status()).toBe(200);
      const sessionData = await sessionRes.json();
      expect(sessionData.email).toBe('marius@saimor-e2e.test');
      expect(sessionData.active_company_id).toBe('co-hq-live');
      expect(Boolean(sessionData.is_demo)).toBe(false);

      await expect(ownerPage.locator('[data-testid="os-shell"]')).toBeVisible({ timeout: 25_000 });
      await expect(ownerPage.locator('[data-testid="demo-switch"]')).toContainText('SAIMÔR', {
        timeout: 25_000,
      });
      await expect(ownerPage.locator('[data-testid="demo-banner"]')).toHaveCount(0);

      await openDepartmentDeskFromUniverse(ownerPage, 'dept-hq-verw');
      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-live-till"]')).toContainText(
        'Tagesstand: 0,00 €'
      );
      await expect(ownerPage.locator('[data-testid="wk-weber-e2e-bar"]')).toHaveCount(0);
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-close-till-btn"]')).toHaveCount(0);
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-live-till"]')).not.toContainText(
        'Kanzlei Weber'
      );
      await ownerPage.screenshot({ path: `${SHOT_DIR}\\e2e-01-live-hq-no-weber.png`, fullPage: false });
    } finally {
      await ownerCtx.close();
    }
  });

  test('2. Restricted Member (Svenja) gets 403 on unassigned department & blocked [FREIGABE] UI action', async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    const memberCtx = await browser.newContext();
    try {
      await prepareContext(memberCtx);
      await loginViaCore(memberCtx, 'svenja@saimor-e2e.test', 'Phase1MemberPass!');

      const forbiddenDeptRes = await memberCtx.request.post(
        `${BASE_URL}/api/core/v3/operational/ledger/entries`,
        {
          data: {
            company_id: 'co-hq-live',
            department_id: 'dept-hq-theke',
            station: 'theke-station',
            kind: 'pos_sale',
            label: 'Unberechtigter Abteilungszugriff',
            amount_cents: 1000,
            safety_level: 'routine',
            idempotency_key: 'e2e-svenja-forbidden-dept',
          },
        }
      );
      expect(forbiddenDeptRes.status()).toBe(403);

      const memberPage = await memberCtx.newPage();
      await memberPage.goto(`${BASE_URL}/os#universe`, { waitUntil: 'domcontentloaded' });
      await openDepartmentDeskFromUniverse(memberPage, 'dept-hq-verw');
      await expect(memberPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );

      const memberOrderBtn = memberPage.locator('[data-testid="wk-verwaltung-order-btn"]');
      const forbiddenReplyPromise = memberPage.waitForResponse(
        (res) =>
          res.url().includes('/api/core/v3/operational/ledger/entries') &&
          res.request().method() === 'POST'
      );
      await memberOrderBtn.click();
      await memberOrderBtn.click();
      const forbiddenReply = await forbiddenReplyPromise;
      expect(forbiddenReply.status()).toBe(403);
      await expect(memberPage.locator('[data-testid="wk-audit-error"]')).toBeVisible({
        timeout: 15_000,
      });
      await expect(memberPage.locator('[data-testid="wk-audit-error"]')).toContainText(
        /Fehlgeschlagen|403|nicht erlaubt/i
      );
      await expect(memberPage.locator('[data-testid="wk-audit-count"]')).toContainText('0 Einträge');
    } finally {
      await memberCtx.close();
    }
  });

  test('3. Intentional 503 outage -> Fehlgeschlagen -> Retry (201) -> Reload + 2nd Admin Anna persistence', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const ownerCtx = await browser.newContext();
    const adminCtx = await browser.newContext();
    try {
      await prepareContext(ownerCtx);
      await prepareContext(adminCtx);
      await loginViaCore(ownerCtx, 'marius@saimor-e2e.test', 'Phase1OwnerPass!');
      const ownerPage = await ownerCtx.newPage();
      await ownerPage.goto(`${BASE_URL}/os#universe`, { waitUntil: 'domcontentloaded' });
      await openDepartmentDeskFromUniverse(ownerPage, 'dept-hq-verw');
      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );

      let failLedgerOnce = true;
      await ownerPage.route('**/api/core/v3/operational/ledger/entries', async (route) => {
        if (route.request().method() === 'POST' && failLedgerOnce) {
          failLedgerOnce = false;
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Simulierte CORE-Unterbrechung (E2E)' }),
          });
          return;
        }
        await route.continue();
      });

      const ownerOrderBtn = ownerPage.locator('[data-testid="wk-verwaltung-order-btn"]');
      await ownerOrderBtn.click();
      await ownerOrderBtn.click();

      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'failed',
        { timeout: 15_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-audit-error"]')).toBeVisible();
      await ownerPage.screenshot({ path: `${SHOT_DIR}\\e2e-02-server-outage-error.png`, fullPage: false });

      const retryPostPromise = ownerPage.waitForResponse(
        (res) =>
          res.url().includes('/api/core/v3/operational/ledger/entries') &&
          res.request().method() === 'POST'
      );
      await ownerPage.locator('[data-testid="wk-ledger-retry-btn"]').click();
      const retryPostRes = await retryPostPromise;
      expect(retryPostRes.status()).toBe(201);

      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 15_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-audit-error"]')).toHaveCount(0);
      await expect(ownerPage.locator('[data-testid="wk-audit-feedback"]')).toContainText(
        'Durch CORE bestätigt'
      );
      await expect(ownerPage.locator('[data-testid="wk-audit-count"]')).toContainText('1 Einträge');

      await ownerPage.reload({ waitUntil: 'domcontentloaded' });
      await openDepartmentDeskFromUniverse(ownerPage, 'dept-hq-verw');
      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-order-btn"]')).toContainText(
        'Freigabe im Kontor dokumentiert (Durch CORE bestätigt)',
        { timeout: 15_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-audit-count"]')).toContainText('1 Einträge');

      await loginViaCore(adminCtx, 'anna@saimor-e2e.test', 'Phase1AdminPass!');
      const adminPage = await adminCtx.newPage();
      await adminPage.goto(`${BASE_URL}/os#universe`, { waitUntil: 'domcontentloaded' });
      await openDepartmentDeskFromUniverse(adminPage, 'dept-hq-verw');
      await expect(adminPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );
      await expect(adminPage.locator('[data-testid="wk-verwaltung-order-btn"]')).toContainText(
        'Freigabe im Kontor dokumentiert',
        { timeout: 15_000 }
      );
      await expect(adminPage.locator('[data-testid="wk-audit-count"]')).toContainText('1 Einträge');
    } finally {
      await ownerCtx.close();
      await adminCtx.close();
    }
  });

  test('4. Atelier document persistence with intentional 500 error -> Fehlgeschlagen -> Retry -> Reload', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const ownerCtx = await browser.newContext();
    try {
      await prepareContext(ownerCtx);
      await loginViaCore(ownerCtx, 'marius@saimor-e2e.test', 'Phase1OwnerPass!');
      const ownerPage = await ownerCtx.newPage();
      await ownerPage.goto(`${BASE_URL}/os#universe`, { waitUntil: 'domcontentloaded' });
      await openDepartmentDeskFromUniverse(ownerPage, 'dept-hq-atelier');
      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-studio-lectern"]')).toContainText(
        'ORIGIN // 001 Material-Manifest',
        { timeout: 15_000 }
      );

      let failNodeWriteOnce = true;
      await ownerPage.route('**/api/core/v3/nodes/*', async (route) => {
        const method = route.request().method();
        if ((method === 'PATCH' || method === 'PUT') && failNodeWriteOnce) {
          failNodeWriteOnce = false;
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Simulierter Dossier-Speicherfehler (E2E)' }),
          });
          return;
        }
        await route.continue();
      });

      await ownerPage.locator('[data-testid="wk-studio-edit-toggle"]').click();
      await expect(ownerPage.locator('[data-testid="wk-studio-editor"]')).toBeVisible();
      await ownerPage
        .locator('[data-testid="wk-studio-editor"]')
        .fill('# ORIGIN // 001\n\nVerifiziert via Live E2E.');
      await ownerPage.locator('[data-testid="wk-studio-save"]').click();

      await expect(ownerPage.locator('[data-testid="wk-studio-doc-error"]')).toBeVisible({
        timeout: 15_000,
      });
      await expect(ownerPage.locator('[data-testid="wk-studio-doc-error"]')).toContainText(
        'Dossier-Speicherung fehlgeschlagen'
      );
      await ownerPage.screenshot({ path: `${SHOT_DIR}\\e2e-03-doc-save-failed.png`, fullPage: false });

      const retryDocPromise = ownerPage.waitForResponse(
        (res) =>
          res.url().includes('/api/core/v3/nodes/') &&
          (res.request().method() === 'PATCH' || res.request().method() === 'PUT')
      );
      await ownerPage.locator('[data-testid="wk-studio-retry-btn"]').click();
      const retryDocRes = await retryDocPromise;
      expect(retryDocRes.ok()).toBeTruthy();

      await expect(ownerPage.locator('[data-testid="wk-studio-doc-error"]')).toHaveCount(0, {
        timeout: 15_000,
      });
      await expect(ownerPage.locator('[data-testid="wk-studio-lectern"]')).toContainText(
        'Durch CORE bestätigt',
        { timeout: 15_000 }
      );

      await ownerPage.reload({ waitUntil: 'domcontentloaded' });
      await openDepartmentDeskFromUniverse(ownerPage, 'dept-hq-atelier');
      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-studio-doc-preview"]')).toContainText(
        'Verifiziert via Live E2E.',
        { timeout: 15_000 }
      );
    } finally {
      await ownerCtx.close();
    }
  });

  test('5. DemoSwitch Café Morgenrot 4-room flow (1991,30 €) -> LiveCockpit sync -> Strict Demo-to-HQ isolation', async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    const ownerCtx = await browser.newContext();
    try {
      await prepareContext(ownerCtx);
      await loginViaCore(ownerCtx, 'marius@saimor-e2e.test', 'Phase1OwnerPass!');
      const ownerPage = await ownerCtx.newPage();
      await ownerPage.goto(`${BASE_URL}/os#universe`, { waitUntil: 'domcontentloaded' });

      const demoSwitchBtn = ownerPage.locator('[data-testid="demo-switch"] button.os-company-pill');
      await expect(demoSwitchBtn).toBeVisible({ timeout: 65_000 });
      await demoSwitchBtn.click();
      const cafeOption = ownerPage.locator('[data-testid="company-options"] button', {
        hasText: 'Café Morgenrot',
      });
      await expect(cafeOption).toBeVisible({ timeout: 10_000 });
      await cafeOption.click();
      await expect(ownerPage.locator('[data-testid="demo-banner"]')).toBeVisible({ timeout: 15_000 });

      await openDepartmentDeskFromUniverse(ownerPage, 'd-service');
      await expect(ownerPage.locator('[data-testid="wk-weber-e2e-bar"]')).toBeVisible({
        timeout: 15_000,
      });
      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'demo-simulation'
      );
      await ownerPage.locator('[data-testid="wk-weber-step-cta"]').click();
      await expect(ownerPage.locator('[data-testid="wk-weber-state-1"]')).toContainText('✓', {
        timeout: 10_000,
      });

      await closeDeskAndEnterCorridorRoom(ownerPage, 'd-kueche');
      await ownerPage.locator('[data-testid="wk-weber-step-cta"]').click();
      await expect(ownerPage.locator('[data-testid="wk-weber-state-2"]')).toContainText('✓', {
        timeout: 10_000,
      });

      await closeDeskAndEnterCorridorRoom(ownerPage, 'd-theke');
      await ownerPage.locator('[data-testid="wk-weber-step-cta"]').click();
      await expect(ownerPage.locator('[data-testid="wk-weber-state-3"]')).toContainText('✓', {
        timeout: 10_000,
      });
      await ownerPage.locator('[data-testid="wk-theke-pos-book"]').click();
      await expect(ownerPage.locator('[data-testid="wk-audit-feedback"]')).toContainText(
        'Demo / Simulation',
        { timeout: 10_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-audit-feedback"]')).toContainText('+7,30 €');

      await closeDeskAndEnterCorridorRoom(ownerPage, 'd-verw');
      await ownerPage.locator('[data-testid="wk-verwaltung-close-till-btn"]').click();
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-live-till"]')).toContainText(
        'Tagesstand: 1991,30 €',
        { timeout: 15_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-live-till"]')).toContainText(
        'Kanzlei Weber (142,00 €) einmalig verbucht ✓'
      );
      await ownerPage.screenshot({
        path: `${SHOT_DIR}\\e2e-04-demo-morgenrot-1991-30.png`,
        fullPage: false,
      });

      await ownerPage.reload({ waitUntil: 'domcontentloaded' });
      const bannerStillVisible = await ownerPage.locator('[data-testid="demo-banner"]').isVisible().catch(() => false);
      if (!bannerStillVisible) {
        const switchAgain = ownerPage.locator('[data-testid="demo-switch"] button.os-company-pill');
        await expect(switchAgain).toBeVisible({ timeout: 65_000 });
        await switchAgain.click();
        await ownerPage.locator('[data-testid="company-options"] button', { hasText: 'Café Morgenrot' }).click();
        await expect(ownerPage.locator('[data-testid="demo-banner"]')).toBeVisible({ timeout: 15_000 });
      }
      await openDepartmentDeskFromUniverse(ownerPage, 'd-verw');
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-live-till"]')).toContainText(
        '1991,30 €',
        { timeout: 15_000 }
      );

      await ownerPage.locator('[data-testid="wk-workstation"] button.wk-ws-close').first().click();
      const homeBtn = ownerPage.locator('[data-testid="os-dock"] button[data-feature="home"]');
      await expect(homeBtn).toBeVisible({ timeout: 10_000 });
      await homeBtn.click();

      const liveCockpitSync = ownerPage.locator('[data-testid="home-bridge-ledger-sync"]');
      await expect(liveCockpitSync).toBeVisible({ timeout: 35_000 });
      await expect(liveCockpitSync).toContainText('1991,30 €');
      await expect(liveCockpitSync).toContainText('Kanzlei Weber');
      await ownerPage.screenshot({ path: `${SHOT_DIR}\\e2e-05-livecockpit-sync.png`, fullPage: false });

      await ownerPage.locator('[data-testid="demo-back"]').click();
      await expect(ownerPage.locator('[data-testid="demo-banner"]')).toHaveCount(0, {
        timeout: 15_000,
      });
      await ownerPage.locator('[data-testid="os-dock"] button[data-feature="universe"]').click();
      await openDepartmentDeskFromUniverse(ownerPage, 'dept-hq-verw');
      await expect(ownerPage.locator('[data-testid="wk-scope-truth-badge"]')).toHaveAttribute(
        'data-truth-status',
        'core-confirmed',
        { timeout: 25_000 }
      );
      await expect(ownerPage.locator('[data-testid="wk-weber-e2e-bar"]')).toHaveCount(0);
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-live-till"]')).not.toContainText(
        '1991,30 €'
      );
      await expect(ownerPage.locator('[data-testid="wk-verwaltung-live-till"]')).toContainText(
        'Tagesstand: 0,00 €'
      );
      await ownerPage.screenshot({ path: `${SHOT_DIR}\\e2e-06-hq-isolation.png`, fullPage: false });
    } finally {
      await ownerCtx.close();
    }
  });
});
