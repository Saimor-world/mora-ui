import { expect, test } from '@playwright/test';

/** The MÔRA chat input must never sit under the dock: it is the element hit at its centre, and it takes typing. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { window.localStorage.setItem('saimor_product_tour_dismissed', '1'); } catch { /* ignore */ } });
});

for (const size of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
  test(`MÔRA chat input is clickable and typeable at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/os#home');
    await page.getByTestId('dock-ask-open').click();
    const panel = page.locator('.os-shell__mora');
    await expect(panel).toBeVisible();
    const input = panel.locator('input, textarea').last();
    await expect(input).toBeVisible();
    const covered = await input.evaluate((field) => {
      const r = field.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit && (hit === field || field.contains(hit)) ? null : (hit as HTMLElement | null)?.className || 'nothing';
    });
    expect(covered).toBeNull();
    await input.click();
    await input.pressSequentially('Was steht heute an?');
    await expect(input).toHaveValue('Was steht heute an?');
    // The old jade stone is gone; MÔRA in the chat is the pixel figure.
    await expect(panel.locator('img[src*="mora-stone"]')).toHaveCount(0);
    await expect(panel.locator('img[src="/mora/pixel/body.png"]').first()).toBeVisible();
  });
}
