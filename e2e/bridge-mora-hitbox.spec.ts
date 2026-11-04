import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Regression for the Jade overlay hover loop:
 * the animated artwork may float, but the button's hitbox must not move.
 * Self-contained fixture: does not require a logged-in OS or a running CORE.
 */
test('Jade MÔRA hover keeps its clickable hitbox stationary', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(`
    <main style="position:relative; margin:180px; width:400px; height:360px">
      <div class="bridge">
        <div class="bridge__heart">
          <button class="bridge__mora" data-testid="dock-mora" aria-label="MÔRA" type="button">
            <span class="bridge__mora-visual" data-testid="mora-mark">
              <span class="jade-mora" style="width:100px;height:130px">
                <span class="jade-mora__glow"></span>
                <span style="display:block;width:100%;height:100%;border-radius:50%;background:#a8d1bb"></span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </main>
  `);
  await page.addStyleTag({
    content: readFileSync(join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8'),
  });

  const hitbox = page.getByTestId('dock-mora');
  const visual = page.getByTestId('mora-mark');
  const buttonAnimation = await hitbox.evaluate(el => getComputedStyle(el).animationName);
  const visualAnimation = await visual.evaluate(el => getComputedStyle(el).animationName);
  expect(buttonAnimation).toBe('none');
  expect(visualAnimation).toContain('jade-fly');

  const initial = await hitbox.boundingBox();
  expect(initial).not.toBeNull();
  await hitbox.hover();
  for (const sample of [0, 450, 900]) {
    if (sample) await page.waitForTimeout(450);
    const box = await hitbox.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeCloseTo(initial!.x, 0);
    expect(box!.y).toBeCloseTo(initial!.y, 0);
    expect(box!.width).toBeCloseTo(initial!.width, 0);
    expect(box!.height).toBeCloseTo(initial!.height, 0);
    await page.screenshot({ path: testInfo.outputPath(`mora-hover-${sample}.png`) });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await visual.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});
