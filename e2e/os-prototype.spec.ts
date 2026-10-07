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

  test('mobile: dock + MÔRA sheet from the MÔRA stone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/os#today');
    const bar = page.getByRole('navigation', { name: 'Hauptnavigation' });
    await expect(bar).toBeVisible();
    await bar.getByTestId('dock-mora').click();
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

  const SIZES = [[1024, 640], [1280, 800], [1440, 900], [390, 844]] as const;

  for (const [w, h] of SIZES) {
    test(`V1.3.1 universe ${w}x${h}: no overlapping boxes, threads stay inside the field, dock fully visible`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto('/os#universe');
      await expect(page.getByTestId('demo-organization-universe')).toBeVisible();
      await page.waitForTimeout(1200);
      const r = await page.evaluate(() => {
        const vis = (el: Element | null) => { if (!el) return null; const st = getComputedStyle(el); const b = el.getBoundingClientRect(); return st.display !== 'none' && st.visibility !== 'hidden' && b.width > 0 && b.height > 0 ? b : null; };
        const boxes: { name: string; b: DOMRect }[] = [];
        const add = (name: string, el: Element | null) => { const b = vis(el); if (b) boxes.push({ name, b }); };
        document.querySelectorAll('[data-testid^="territory-"]').forEach((t) => {
          const id = (t as HTMLElement).dataset.testid;
          add('body:' + id, t.querySelector('.saimor-territory-body > span'));
          add('label:' + id, t.querySelector('[data-territory-label]'));
          add('meta:' + id, t.querySelector('[data-territory-meta]'));
          add('badge:' + id, t.querySelector('[data-territory-badge]'));
        });
        add('core', document.querySelector('[data-testid="universe-core"] [data-testid="mora-stone"]') || document.querySelector('[data-testid="universe-core"]'));
        add('coreLabel', document.querySelector('[data-testid="universe-core"] .os-ulx__core-label'));
        add('legend', document.querySelector('[data-testid="relation-legend"] > div'));
        add('pill', document.querySelector('[data-testid="universe-attention"]'));
        add('intro', document.querySelector('.os-universe__intro'));
        add('h1', document.querySelector('.os-legacy-universe__header h1'));
        document.querySelectorAll('.os-legacy-obs > div > div').forEach((c, i) => add('obs' + i, c));
        add('dock', document.querySelector('[data-testid="dock"]'));
        add('topbar', document.querySelector('.os-shell__topbar'));
        const over: string[] = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].b, c = boxes[j].b;
          const own = boxes[i].name.split(':')[1] && boxes[i].name.split(':')[1] === boxes[j].name.split(':')[1];
          if (own) continue;
          if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 2 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 2) over.push(boxes[i].name + ' × ' + boxes[j].name);
        }
        const fb = vis(document.querySelector('[data-testid="organization-field-box"]'));
        const out: string[] = [];
        let strands = 0;
        if (fb) document.querySelectorAll('[data-testid="relation-layer"] path').forEach((pa, i) => { strands++; const b = pa.getBoundingClientRect(); if (b.left < fb.left - 2 || b.right > fb.right + 2 || b.top < fb.top - 2 || b.bottom > fb.bottom + 2) out.push('strand ' + i); });
        const d = document.querySelector('[data-testid="dock"]')!.getBoundingClientRect();
        return { over, out, strands, desktop: Boolean(fb), dockBottom: d.bottom, dockTop: d.top, vh: innerHeight };
      });
      expect(r.over).toEqual([]);
      expect(r.out).toEqual([]);
      if (r.desktop) expect(r.strands).toBeGreaterThan(0);
      expect(r.dockTop).toBeGreaterThan(0);
      expect(r.dockBottom).toBeLessThanOrEqual(r.vh - 4);
      await ctx.close();
    });
  }

  for (const [w, h] of SIZES) {
    test(`V1.3.1 all surfaces ${w}x${h}: dock fully visible, content ends above the dock, topbar clear`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      for (const id of ['today', 'mora', 'finance', 'post', 'knowledge', 'settings', 'labs']) {
        await page.goto(`/os#${id}`);
        await expect(page.getByTestId(`feature-${id}`)).toBeVisible();
        await page.waitForTimeout(400);
        const r = await page.evaluate((fid) => {
          const main = document.querySelector('#os-main') as HTMLElement;
          main.scrollTop = main.scrollHeight;
          const d = document.querySelector('[data-testid="dock"]')!.getBoundingClientRect();
          const t = document.querySelector('.os-shell__topbar')!.getBoundingClientRect();
          const f = document.querySelector(`[data-testid="feature-${fid}"]`)!.getBoundingClientRect();
          return { dockTop: d.top, dockBottom: d.bottom, vh: innerHeight, topbarBottom: t.bottom, featureBottom: f.bottom };
        }, id);
        expect(r.dockBottom, id).toBeLessThanOrEqual(r.vh - 4);
        expect(r.dockTop, id).toBeGreaterThan(r.topbarBottom);
        expect(r.featureBottom, id).toBeLessThanOrEqual(r.dockTop + 1);
      }
      await ctx.close();
    });
  }
});
