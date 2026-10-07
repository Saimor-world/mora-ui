import { expect, test } from '@playwright/test';

/**
 * OS prototype smoke (local preview build):
 *   NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local npm run build && npm start
 *   BASE_URL=http://localhost:3000 npx playwright test e2e/os-prototype.spec.ts
 */
const SURFACES = ['today', 'mora', 'finance', 'post', 'knowledge', 'settings', 'labs', 'universe'];

test.describe('OS prototype (/os, local preview)', () => {
  for (const id of SURFACES) {
    test(`surface ${id} renders without page errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`/os#${id}`);
      await expect(page.getByTestId(`feature-${id}`)).toBeVisible();
      await expect(page.getByTestId('os-preview-banner')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('finance never claims a connection without CORE', async ({ page }) => {
    await page.goto('/os#finance');
    await expect(page.getByTestId('finance-contracts')).toBeVisible();
    await expect(page.getByText('Verbunden', { exact: false })).toHaveCount(0);
  });

  test('a legacy app opens as a classic pane from Labs', async ({ page }) => {
    await page.goto('/os#labs');
    await page.locator('[data-legacy-app="timeline"] button', { hasText: 'Öffnen' }).click();
    await expect(page.locator('[data-pane-stack]').first()).toBeVisible();
  });

  test('mobile: bottom bar + MÔRA sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/os#today');
    const bar = page.getByRole('navigation', { name: 'Navigation mobil' });
    await expect(bar).toBeVisible();
    await bar.getByRole('button', { name: 'MÔRA' }).click();
    await expect(page.getByTestId('mora-console-panel')).toBeVisible();
  });

  test('universe layer: calm and dimmed on Heute, full in Universe', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#today');
    const layer = page.getByTestId('os-universe-layer');
    await expect(layer).toHaveAttribute('data-mode', 'calm');
    await expect(layer).toHaveAttribute('data-motion', 'off');
    const calmFilter = await page.getByTestId('os-atmo-plate').evaluate((el) => getComputedStyle(el).filter);
    expect(calmFilter).toContain('blur');
    await page.goto('/os#universe');
    await expect(layer).toHaveAttribute('data-mode', 'universe');
    await expect(layer).toHaveAttribute('data-motion', 'on', { timeout: 10_000 });
  });

  test('Heute → Universe via card, no page errors (React #185 fixed)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#today');
    await page.getByTestId('today-universe-card').click();
    await expect(page).toHaveURL(/#universe$/);
    await expect(page.getByTestId('feature-universe')).toBeVisible();
    await expect(page.getByTestId('os-shell')).toHaveAttribute('data-atmosphere', 'universe');
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test('universe landscape: planets around MÔRA, focus → detail → open area', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#universe');
    await page.getByTestId('universe-lens-landscape').click();
    const field = page.getByTestId('universe-landscape');
    await expect(field).toBeVisible();
    await expect(page.locator('[data-planet]')).toHaveCount(7);
    await expect(page.getByTestId('universe-core')).toBeVisible();
    await expect(page.getByText('Beispiel', { exact: true }).first()).toBeVisible();
    await page.locator('[data-planet="post"]').click({ force: true });
    await expect(field).toHaveAttribute('data-focus', 'post');
    await expect(page.getByTestId('universe-detail')).toBeVisible();
    await page.getByTestId('universe-open-area').click();
    await expect(page).toHaveURL(/#post$/);
    await expect(page.getByTestId('feature-post')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('universe mobile stays spatial; reduced motion keeps planets still', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/os#universe');
    await page.getByTestId('universe-lens-landscape').click();
    const field = page.getByTestId('universe-landscape');
    await expect(field).toHaveAttribute('data-layout', 'mobile');
    await expect(field).toHaveAttribute('data-motion', 'still');
    await page.locator('[data-planet="today"]').click();
    await expect(page.getByTestId('universe-detail')).toBeVisible();
    await ctx.close();
  });

  test('V1.3: Marius\' dock is the main navigation (desktop + mobile)', async ({ browser }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto('/os#today');
      const dock = page.getByTestId('os-dock');
      await expect(dock).toBeVisible();
      await expect(page.locator('.os-shell__rail')).toHaveCount(0);
      await dock.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(page).toHaveURL(/#post$/);
      await expect(page.getByTestId('feature-post')).toContainText('Wochenlieferung Arabica');
      await dock.getByTestId('dock-mora').click();
      await ctx.close();
    }
  });

  test('V1.3: original Organisationsfeld with the demo pack, MÔRA core, Beispiel', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#universe');
    await expect(page.getByTestId('demo-organization-universe')).toBeVisible();
    await expect(page.getByText('Store San Francisco').first()).toBeVisible();
    await expect(page.getByTestId('universe-core')).toBeVisible();
    await expect(page.getByTestId('universe-attention')).toContainText('Beispiel');
    await page.goto('/os#knowledge');
    await expect(page.getByTestId('knowledge-demo-docs')).toContainText('employee_handbook.pdf');
    await page.goto('/os#finance');
    await expect(page.getByTestId('feature-finance')).not.toContainText('€');
    expect(errors).toEqual([]);
  });
});
