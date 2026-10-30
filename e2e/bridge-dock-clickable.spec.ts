import { expect, test } from '@playwright/test';

/** Every dock icon, instrument, action and chip must be the element hit at its own centre (nothing transparent on top). */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { window.localStorage.setItem('saimor_product_tour_dismissed', '1'); } catch { /* ignore */ } });
});

for (const route of ['/os#home', '/os#universe', '/os#post']) {
  test(`dock buttons are clickable on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await page.locator('.bridge__app').first().waitFor();
    const blocked = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.bridge__app, .bridge__comp, .bridge__mora, .bridge__ask button, .bridge__inst-actions button, .bridge__chips button, .bridge__chip')]
        .filter((b) => b.offsetParent)
        .filter((b) => { const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !hit || !b.contains(hit); })
        .map((b) => b.dataset.station || b.getAttribute('aria-label') || b.className));
    expect(blocked).toEqual([]);
  });
}
