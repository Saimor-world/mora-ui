import { expect, test } from '@playwright/test';

/**
 * Mit MÔRA sprechen passiert über dem See, nicht in einer Seitenleiste:
 * das Eingabefeld liegt nie unter dem Dock, nimmt Text an, und die eine MÔRA fliegt aus dem Dock in die Mitte.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { window.localStorage.setItem('saimor_product_tour_dismissed', '1'); } catch { /* ignore */ } });
});

for (const size of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
  test(`MÔRA conversation input is clickable and typeable at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/os#home');
    await page.getByTestId('dock-ask-open').click();
    const stage = page.getByTestId('mora-stage');
    await expect(stage).toBeVisible();
    await expect(page.locator('.os-shell__mora')).toHaveCount(0);
    const input = stage.getByLabel('Nachricht an MÔRA');
    await expect(input).toBeVisible();
    // Während MÔRA in die Mitte fliegt, kreuzt sie kurz das Feld; danach muss es frei sein.
    await expect(async () => {
      const covered = await input.evaluate((field) => {
        const r = field.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit && (hit === field || field.contains(hit)) ? null : hit ? `${hit.tagName}.${hit.className}` : 'nothing';
      });
      expect(covered).toBeNull();
    }).toPass({ timeout: 4000 });
    await input.click();
    await input.pressSequentially('Was steht heute an?');
    await expect(input).toHaveValue('Was steht heute an?');
    // Genau eine MÔRA: die Pixel-Figur aus dem Dock, und sie ist in die Mitte über dem See geflogen.
    await expect(page.locator('img[src*="mora-stone"]')).toHaveCount(0);
    await expect(page.locator('img[src="/mora/pixel/body.png"]:visible')).toHaveCount(1);
    await expect(async () => {
      const [mora, anchor] = await Promise.all([page.getByTestId('dock-mora').boundingBox(), page.getByTestId('mora-stage-anchor').boundingBox()]);
      expect(mora && anchor).toBeTruthy();
      expect(Math.abs(mora!.x + mora!.width / 2 - (anchor!.x + anchor!.width / 2))).toBeLessThan(12);
      expect(Math.abs(mora!.y + mora!.height / 2 - (anchor!.y + anchor!.height / 2))).toBeLessThan(12);
    }).toPass({ timeout: 4000 });
    // Esc bringt sie zurück ins Dock.
    await page.keyboard.press('Escape');
    await expect(stage).toHaveCount(0);
  });
}
