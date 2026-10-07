import { expect, test } from '@playwright/test';

/**
 * OS prototype smoke (local preview build):
 *   NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local npm run build && npm start
 *   BASE_URL=http://localhost:3000 npx playwright test e2e/os-prototype.spec.ts
 */
const SURFACES = ['today', 'mora', 'finance', 'post', 'knowledge', 'settings', 'labs'];

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
});
