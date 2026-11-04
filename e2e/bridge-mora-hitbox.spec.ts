import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// Isolated CSS/interaction regression, NOT an authenticated OS end-to-end test.
// Only repository CSS and artwork are used; no CORE or personal data is loaded.
const css = readFileSync(join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');
const artwork = readFileSync(join(process.cwd(), 'public/mora/jade-01.png')).toString('base64');

for (const device of [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: 'phone-touch', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch });

    test('MÔRA keeps a stable, operable hitbox while artwork floats', async ({ page }, testInfo) => {
      await page.setContent(`
        <html data-dock="c"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;background:#082430">
          <main style="position:relative;margin:240px auto 0;width:280px;height:360px">
            <div class="bridge"><div class="bridge__heart">
              <button class="bridge__mora" data-testid="dock-mora" aria-label="MÔRA" type="button">
                <span class="bridge__mora-visual" data-testid="mora-mark">
                  <span class="jade-mora" style="width:${device.isMobile ? 84 : 130}px">
                    <span class="jade-mora__glow"></span>
                    <img src="data:image/png;base64,${artwork}" alt="" draggable="false" />
                  </span>
                </span>
              </button>
            </div></div>
          </main>
        </body></html>
      `);
      await page.addStyleTag({ content: css });

      const hitbox = page.getByTestId('dock-mora');
      const visual = page.getByTestId('mora-mark');
      await expect(hitbox.locator('img')).toBeVisible();
      await hitbox.evaluate(el => {
        el.dataset.clicks = '0';
        el.addEventListener('click', () => { el.dataset.clicks = String(Number(el.dataset.clicks) + 1); });
      });
      expect(await hitbox.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
      expect(await visual.evaluate(el => getComputedStyle(el).animationName)).toBe('jade-fly');
      expect(await visual.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');

      const initial = await hitbox.boundingBox();
      expect(initial).not.toBeNull();
      if (!device.hasTouch) await hitbox.hover();

      // Seek to the extrema of the real eight-second animation: this catches
      // movement across the full cycle without timing-dependent long sleeps.
      const visualPositions: number[] = [];
      for (const time of [0, 4000, 8000]) {
        await visual.evaluate((el, ms) => {
          const animation = el.getAnimations()[0];
          animation.pause();
          animation.currentTime = ms;
        }, time);
        const box = await hitbox.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeCloseTo(initial!.x, 2);
        expect(box!.y).toBeCloseTo(initial!.y, 2);
        expect(box!.width).toBeCloseTo(initial!.width, 2);
        expect(box!.height).toBeCloseTo(initial!.height, 2);
        visualPositions.push((await visual.boundingBox())!.y);
        await page.screenshot({ path: testInfo.outputPath(`hover-${device.name}-${time}.png`) });
      }
      expect(Math.max(...visualPositions) - Math.min(...visualPositions)).toBeGreaterThan(5);

      // Pointer, touch and keyboard activate the same stationary button.
      if (device.hasTouch) await hitbox.tap(); else await hitbox.click();
      await expect(hitbox).toHaveAttribute('data-clicks', '1');
      await hitbox.focus();
      await expect(hitbox).toBeFocused();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await expect(hitbox).toHaveAttribute('data-clicks', '3');

      // The stage flight must still move the button; only breathing is frozen.
      await hitbox.evaluate(el => {
        el.dataset.flying = 'true';
        el.style.transform = 'translate(40px, 80px) scale(0.85)';
      });
      expect(await visual.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
      await expect.poll(async () => (await hitbox.boundingBox())!.x).toBeGreaterThan(initial!.x + 20);
      await page.screenshot({ path: testInfo.outputPath(`flight-${device.name}.png`) });
      await hitbox.evaluate(el => { delete el.dataset.flying; el.style.removeProperty('transform'); });
      await expect.poll(() => visual.evaluate(el => getComputedStyle(el).animationName)).toBe('jade-fly');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(await visual.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
      expect(await hitbox.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
      await testInfo.attach('fixture-provenance', {
        body: JSON.stringify({
          scope: 'isolated fixture; not OS acceptance',
          commit: process.env.GITHUB_SHA ?? 'local working tree',
          browser: testInfo.project.name,
          device,
        }, null, 2),
        contentType: 'application/json',
      });
    });
  });
}
