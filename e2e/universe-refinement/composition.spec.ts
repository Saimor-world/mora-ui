import { test, expect } from '@playwright/test';

// Controlled UI fixtures only. Every CORE request is intercepted; no real account or writes.
const company = 'ui-qa-only';
const departments = [
  { id: 'growth', name: 'Growth', spaces: [{ id: 'sg', name: 'Kunden' }] },
  { id: 'rnd', name: 'R&D', spaces: [{ id: 'sr', name: 'Entwicklung' }] },
  { id: 'intelligence', name: 'Intelligence', spaces: [] },
  { id: 'product', name: 'Product', spaces: [{ id: 'sp', name: 'Angebot' }] },
];
const folders = [
  { id: 'roadmap', name: 'Roadmap', space_id: 'sr' },
  { id: 'research', name: 'Research', space_id: 'sr' },
  { id: 'kunden', name: 'Kunden', space_id: 'sg' },
  { id: 'angebot', name: 'Angebot', space_id: 'sp' },
  { id: 'inbox', name: 'Eingang', space_id: 'su' },
];
const nodes = Array.from({ length: 6 }, (_, i) => ({ id: `qa-${i}`,
  title: `UI-Testdokument ${i + 1}`, type: 'document', folder_id: i < 4 ? 'roadmap' : 'research' }));

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'mora_session', value: 'sess_ui_fixture_not_a_credential', url: baseURL! }]);
  await page.addInitScript(() => {
    localStorage.setItem('saimor_product_tour_dismissed', '1');
    localStorage.setItem('last_activity', new Date().toISOString());
    localStorage.setItem('mora.universe.details', '0');
    localStorage.setItem('mora.universe.moraInScene', '0');
    localStorage.setItem('mora.universe.view', 'glass');
  });
  await page.route('**/api/core/**', async route => {
    const req = route.request();
    if (req.method() !== 'GET') { await route.abort();return; }
    const url = new URL(req.url()), path = url.pathname.replace('/api/core', '');
    let body: unknown;
    if (path === '/v3/auth/session') body = { user_id: 'ui-user', tenant_id: 'ui-tenant',
      role: 'owner', full_name: 'Visuelle Testdaten', email: 'qa@example.invalid',
      operational_state: 'operational', setup_required: false,
      active_company_id: company, active_company_name: 'UI-Testdaten', company_count: 1 };
    else if (path === '/v3/tree') body = { departments,
      unassigned_spaces: [{ id: 'su', name: 'Eingang' }] };
    else if (path === '/v3/folders') body = { folders };
    else if (path === '/v3/nodes') body = { nodes };
    else if (path === '/v3/tasks') body = { tasks: [] };
    else if (path === '/v3/files') body = { files: [] };
    else if (path === '/v3/appointments/status') body = { statuses: [] };
    else if (path === '/v3/calendar/read-model') {
      const start = url.searchParams.get('start_date'), end = url.searchParams.get('end_date');
      body = { source: 'core_calendar', status: 'empty', complete: true, truncated: false,
        limit: 500, count: 0, events: [], as_of: new Date().toISOString(), last_synced_at: null,
        stale_after_seconds: 3600, requested_scope: { tenant_id: 'ui-tenant', user_id: 'ui-user', company_id: company },
        scope: { level: 'company', tenant_id: 'ui-tenant', user_id: 'ui-user', company_id: company },
        window: { start_date: start, end_date: end, timezone: 'Europe/Berlin', selection: 'start_date' },
        coverage: { start_date: start, end_date: end } };
    } else if (path === '/v3/companies') body = { companies: [{ id: company, name: 'UI-Testdaten' }] };
    else { await route.fulfill({ status: 503, json: { detail: 'Not supplied by visual UI fixture' } });return; }
    await route.fulfill({ status: 200, json: body });
  });
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`actual OS overview and folder drilldown ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
    await page.goto('/os#universe');
    await expect(page.getByTestId('world-planet-rnd')).toBeVisible();
    await expect(page.locator('[data-testid^="world-planet-"]').filter({ has: page.locator('.glass-orb') })).toHaveCount(5);
    await expect(page.locator('.wd-mora')).toHaveCount(0);
    await page.evaluate(() => {
      const badge = document.createElement('div');badge.textContent = 'UI-Testdaten · kein Live-CORE';
      badge.style.cssText = 'position:fixed;right:12px;top:70px;z-index:99999;font:11px system-ui;color:#eee;background:#14201ddd;padding:6px;pointer-events:none';
      document.body.appendChild(badge);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`overview-${viewport.width}.png`) });
    await page.getByTestId('world-planet-rnd').click();
    await page.getByTestId('world-focus-zoom').click();
    const world = page.getByTestId('world-planet-window');await expect(world).toBeVisible();
    await expect(page.getByTestId('fv-moon-roadmap')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`department-${viewport.width}.png`) });
    await page.getByTestId('fv-moon-roadmap').click();
    await expect(page.getByTestId('fv-star-qa-0')).toBeVisible();
    await page.getByTestId('fv-up').click();
    await page.getByTestId('world-planet-close').click();
    await expect(page.getByTestId('world-planet-rnd')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const width of [1440, 390]) {
  test(`existing wardrobe preserves material layers, neck exclusivity and undo ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto('/os#settings');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('last_user_name')))
      .toBe('Visuelle Testdaten');
    const wardrobe = page.getByTestId('mora-wardrobe');
    await expect(wardrobe).toBeVisible();
    await expect(page.getByTestId('mora-stage')).toHaveAttribute('data-reduced', 'true');
    await page.getByTestId('wd-tab-neck').click();
    await page.getByTestId('wd-neck-none').click();
    const stage = page.getByTestId('wd-stage');
    await expect.poll(() => stage.locator('.jm__img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await page.mouse.move(0, 0);
    const stillFrame = await stage.screenshot({ path: info.outputPath(`jade-base-${width}.png`) });
    // Observe beyond the stage's first scheduled blink; reduced motion stays still.
    await page.waitForTimeout(1800);
    expect(await stage.screenshot()).toEqual(stillFrame);
    await page.getByTestId('wd-tab-face').click();
    await page.getByTestId('wd-face-jade-sunglasses').click();
    await expect(stage.locator('[data-acc="jade-sunglasses"]')).toHaveCount(1);
    await page.mouse.move(0, 0);
    await stage.screenshot({ path: info.outputPath(`jade-sunglasses-${width}.png`) });
    await page.getByTestId('wd-face-none').click();
    await page.getByTestId('wd-tab-neck').click();
    await page.getByTestId('wd-neck-jade-scarf').click();
    await expect(stage.locator('[data-acc="jade-scarf"]')).toHaveCount(1);
    await page.mouse.move(0, 0);
    await stage.screenshot({ path: info.outputPath(`jade-scarf-${width}.png`) });
    await page.getByTestId('wd-neck-pearl-necklace').click();
    await expect(stage.locator('[data-acc="jade-scarf"]')).toHaveCount(0);
    await expect(stage.locator('[data-acc="pearl-necklace"]')).toHaveCount(1);
    await page.mouse.move(0, 0);
    await stage.screenshot({ path: info.outputPath(`jade-pearls-${width}.png`) });
    await page.getByTestId('wd-undo').click();
    await expect(stage.locator('[data-acc="jade-scarf"]')).toHaveCount(1);
    await page.getByTestId('wd-redo').click();
    await expect(stage.locator('[data-acc="pearl-necklace"]')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(
      localStorage.getItem('mora.wardrobe.v1:ui-user') || '{}').neck)).toMatch(/^pearl-necklace/);
    expect((await page.context().cookies()).find(c => c.name === 'mora_session')?.value)
      .toBe('sess_ui_fixture_not_a_credential');
    await page.reload();
    await expect(page.getByTestId('wd-stage').locator('[data-acc="pearl-necklace"]')).toHaveCount(1);
  });
}

test('motion preference changes reset the existing wardrobe without a reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/os#settings');
  const stage = page.getByTestId('mora-stage');
  // A blink lasts 150ms; web-first assertions can poll less often than that.
  const waitForBlink = () => page.waitForFunction(
    () => document.querySelector('[data-testid="mora-stage"]')?.getAttribute('data-blink') === 'true',
    null, { polling: 'raf', timeout: 5000 });
  await expect(stage).toBeVisible();
  await expect(stage).not.toHaveAttribute('data-reduced', 'true');
  await waitForBlink();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stage).toHaveAttribute('data-reduced', 'true');
  await expect(stage).not.toHaveAttribute('data-blink');
  await expect(stage.locator('.jm__eyes')).toHaveCSS('--gx', '0');
  await expect(stage.locator('.jm__eyes')).toHaveCSS('--gy', '0');
  await page.mouse.move(350, 180);
  await page.waitForTimeout(1800);
  await expect(stage).not.toHaveAttribute('data-blink');
  await expect(stage.locator('.jm__eyes')).toHaveCSS('--gx', '0');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(stage).not.toHaveAttribute('data-reduced', 'true');
  await waitForBlink();
});

test.describe('touch interaction', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('phone taps open a department and folder and return to the overview', async ({ page }) => {
    await page.goto('/os#universe');
    await page.getByTestId('world-planet-rnd').tap();
    await page.getByTestId('world-focus-zoom').tap();
    await page.getByTestId('fv-moon-roadmap').tap();
    await expect(page.getByTestId('fv-star-qa-0')).toBeVisible();
    await page.getByTestId('fv-up').tap();
    await page.getByTestId('world-planet-close').tap();
    await expect(page.getByTestId('world-planet-rnd')).toBeVisible();
  });
});
