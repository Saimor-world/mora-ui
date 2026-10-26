import { expect, test } from '@playwright/test';

// Run only against the existing localhost-only OS preview build. Never changes
// an authenticated user's preference. Requires NEXT_PUBLIC_OS_PREVIEW=local.
for (const scale of [0.8, 0.9, 1, 1.1, 1.2, 'invalid']) {
  test(`OS frame reaches the viewport edge at interface scale ${scale}`, async ({ page, baseURL }) => {
    const hostname = new URL(baseURL ?? 'http://localhost:3000').hostname;
    test.skip(!['localhost', '127.0.0.1', '[::1]'].includes(hostname), 'Local preview only');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.addInitScript((value) => {
      localStorage.setItem('saimor_scale', String(value));
      localStorage.setItem('saimor_product_tour_dismissed', '1');
    }, scale);
    await page.goto('/os#today');
    await expect(page.getByTestId('os-preview-banner')).toBeVisible();
    const expectedScale = typeof scale === 'number' ? scale : 1;
    await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--mora-interface-scale'))).toBe(String(expectedScale));
    for (const surface of ['today', 'universe']) {
      await page.goto(`/os#${surface}`);
      const shell = page.locator('.os-shell');
      await expect(shell).toHaveAttribute('data-place', surface);
      const bounds = await shell.boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds!.x + bounds!.width - 1920)).toBeLessThanOrEqual(1);
      // Preview reserves 30 layout pixels for its banner; this must not
      // accidentally shrink the entire frame to 80–90% of the viewport.
      expect(Math.abs(bounds!.height - (1080 - 30 * expectedScale))).toBeLessThanOrEqual(2);
      const main = await page.locator('#os-main').boundingBox();
      expect(main).not.toBeNull();
      expect(Math.abs(main!.x + main!.width - 1920)).toBeLessThanOrEqual(1);
    }
  });
}
