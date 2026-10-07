import { expect, test } from '@playwright/test';

/**
 * OS prototype smoke (local preview build):
 *   NEXT_PUBLIC_OS_PROTOTYPE=1 NEXT_PUBLIC_OS_PREVIEW=local npm run build && npm start
 *   BASE_URL=http://localhost:3000 npx playwright test e2e/os-prototype.spec.ts
 */
const SURFACES = ['today', 'mora', 'finance', 'post', 'knowledge', 'settings', 'labs', 'universe'];

// V1.6: Onboarding erscheint beim ersten Besuch – für die übrigen Tests als erledigt markieren.
test.beforeEach(async ({ page }, info) => {
  if (info.title.startsWith('onboarding')) return;
  await page.addInitScript(() => { try { window.localStorage.setItem('saimor_product_tour_dismissed', '1'); } catch { /* ignore */ } });
});

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


  test('V1.3: Marius\' dock is the main navigation (desktop + iPad)', async ({ browser }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }]) {
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

  const SIZES = [[1024, 768], [1280, 800], [1440, 900], [1180, 820], [820, 1180]] as const;

  for (const [w, h] of SIZES) {
    test(`V1.4 universe ${w}x${h}: no overlapping boxes, threads stay inside the field, dock fully visible`, async ({ browser }) => {
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
    test(`V1.4 all surfaces ${w}x${h}: dock fully visible, content ends above the dock, topbar clear`, async ({ browser }) => {
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

  test('V1.4: command palette jumps to a planet and to a document', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#today');
    await expect(page.getByTestId('mora-lagebild')).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.getByLabel('Suchen oder Befehl').fill('San Francisco');
    await page.getByRole('option', { name: /Store San Francisco/ }).first().click();
    await expect(page).toHaveURL(/#universe$/);
    await expect(page.getByTestId('planet-detail')).toContainText('Store San Francisco');
    await page.keyboard.press('Control+k');
    await page.getByLabel('Suchen oder Befehl').fill('handbook');
    await page.getByRole('option', { name: /employee_handbook\.pdf/ }).click();
    await expect(page).toHaveURL(/#knowledge$/);
    await expect(page.getByTestId('knowledge-demo-docs')).toContainText('employee_handbook.pdf');
  });

  test('V1.4: dock shortcuts 1–9, M, U and the ? overlay', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/os#today');
    await expect(page.getByTestId('feature-today')).toBeVisible();
    await page.keyboard.press('u');
    await expect(page).toHaveURL(/#universe$/);
    await page.keyboard.press('1');
    await expect(page).toHaveURL(/#today$/);
    await page.keyboard.press('Shift+?');
    await expect(page.getByTestId('shortcuts-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('shortcuts-overlay')).toHaveCount(0);
    await page.keyboard.press('m');
    await expect(page.getByTestId('mora-console-panel')).toBeVisible();
  });

  test('V1.4: Lagebild → planet focus → glass detail → Wissen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#today');
    const lb = page.getByTestId('mora-lagebild');
    await expect(lb).toContainText('Beispiel');
    await expect(lb.locator('li')).toHaveCount(3);
    await lb.getByTestId('lagebild-focus-demo-sf').click();
    await expect(page).toHaveURL(/#universe$/);
    const detail = page.getByTestId('planet-detail');
    await expect(detail).toContainText('ai_barista_pilot.pdf');
    await expect(detail).toContainText('Quartalsbericht');
    await page.keyboard.press('Escape');
    await expect(detail).toHaveCount(0);
    await page.getByTestId('territory-demo-hr').click({ force: true });
    await page.getByTestId('planet-open-knowledge').click();
    await expect(page).toHaveURL(/#knowledge$/);
    await expect(page.getByTestId('knowledge-demo-docs')).toContainText('employee_handbook.pdf');
  });

  test('V1.4: below 768 px a calm desktop/tablet hint, no dedicated phone layout', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/os#today');
    await expect(page.getByTestId('os-small-notice')).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByTestId('os-small-notice')).toBeHidden();
  });
  test('V1.4 legacy: Kontext-Kapsel, Control Center (C), Focus Mode, Heute-Karten, Palette-Start', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#today');
    await expect(page.getByTestId('today-now')).toBeVisible();
    await expect(page.getByTestId('today-launch')).toBeVisible();
    await expect(page.getByTestId('context-capsule')).toContainText('Simple Coffee Group');
    await page.getByTestId('context-capsule').getByRole('button', { name: /Universe/ }).click();
    await expect(page).toHaveURL(/#universe/);
    await page.keyboard.press('c');
    await expect(page.getByTestId('control-center')).toBeVisible();
    await page.getByTestId('focus-toggle').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('control-center')).toHaveCount(0);
    await expect(page.getByTestId('focus-left')).toHaveText(/2[45]:\d\d/);
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('palette-home')).toBeVisible();
  });
  for (const [w, h] of [[1024, 768], [1280, 800], [1440, 900], [1180, 820], [820, 1180]] as const) {
    test(`V1.4 topbar ${w}x${h}: Kontext-Kapsel kollidiert nicht`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      for (const s of ['today', 'universe']) {
        await page.goto(`/os#${s}`);
        await expect(page.getByTestId('context-capsule')).toBeAttached();
        const r = await page.evaluate(() => {
          const cap = document.querySelector('[data-testid="context-capsule"]')!;
          const kids = [...cap.querySelectorAll('.os-context__capsule > *'), document.querySelector('.os-context__clock')!].filter((e) => getComputedStyle(e).display !== 'none' && (e as HTMLElement).offsetWidth > 0).map((e) => e.getBoundingClientRect());
          const others = [...document.querySelectorAll('.os-shell__topbar > div:first-child > *, [aria-label="Befehle öffnen"], [data-testid="mora-toggle"]')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
          const capBox = cap.getBoundingClientRect();
          const hit = others.some((o) => kids.some((k) => Math.min(k.right, o.right) - Math.max(k.left, o.left) > 0 && Math.min(k.bottom, o.bottom) - Math.max(k.top, o.top) > 0));
          const clipped = kids.slice(0, -1).some((k) => k.right > capBox.right + 1);
          return { hit, clipped };
        });
        expect(r).toEqual({ hit: false, clipped: false });
      }
    });
  }
  test('V1.4 legacy: MÔRA-Signale → Navigieren → Planet-Detail; Wissen-Ablageorte; Post „Mit MÔRA“', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#mora');
    await page.getByTestId('mora-tab-signals').click();
    await expect(page.getByTestId('mora-signals')).toBeVisible();
    await page.getByTestId('mora-signal-demo-ml-4').getByRole('button', { name: 'Navigieren' }).click();
    await expect(page.getByTestId('planet-detail')).toContainText('San Francisco');
    await page.goto('/os#knowledge');
    await expect(page.getByTestId('knowledge-storage')).toContainText('Workspace');
    await page.goto('/os#post');
    await expect(page.getByRole('button', { name: /^Mit MÔRA/ }).first()).toBeVisible();
  });
  test('V1.5: Look Klar/Kosmos + Phasen-Override werden lokal gespeichert, Ambient aus per Default', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#settings');
    await expect(page.getByTestId('look-settings')).toBeVisible();
    await expect(page.getByTestId('ambient-toggle')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('look-klar').click();
    await page.getByTestId('phase-lounge').click();
    await expect(page.getByTestId('os-shell')).toHaveAttribute('data-look', 'klar');
    await expect(page.getByTestId('os-shell')).toHaveAttribute('data-phase', 'lounge');
    await page.reload();
    await expect(page.getByTestId('os-shell')).toHaveAttribute('data-look', 'klar');
    await expect(page.getByTestId('os-shell')).toHaveAttribute('data-phase', 'lounge');
    await expect(page.getByTestId('context-clock')).toContainText('LOUNGE');
    await page.getByTestId('phase-auto').click();
    await page.getByTestId('look-kosmos').click();
  });

  test('V1.5: Morgenbriefing ehrlich ohne Quellen, Beispiel-Vorschau markiert', async ({ page }) => {
    await page.goto('/os#today');
    await expect(page.getByTestId('briefing-pending')).toContainText('Briefing startet, sobald Quellen angebunden sind');
    await page.getByTestId('briefing-preview-toggle').click();
    await expect(page.getByTestId('briefing-demo')).toContainText('Beispiel');
  });

  test('V1.5: Universe spricht Alltagssprache und zeigt den nächsten Schritt', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/os#universe');
    await expect(page.getByTestId('universe-lens-organization')).toHaveText('Abteilungen');
    await expect(page.getByTestId('universe-attention')).toContainText('Nächster Schritt');
    await expect(page.getByTestId('feature-universe')).not.toContainText(' Docs');
  });

  test('onboarding: first visit shows 4 calm steps, can be skipped and restarted', async ({ page }) => {
    await page.goto('/os#today');
    const ob = page.getByTestId('onboarding');
    await expect(ob).toBeVisible();
    await page.getByTestId('ob-look-klar').click();
    await expect(page.getByTestId('os-shell')).toHaveAttribute('data-look', 'klar');
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('ob-company').fill('Muster GmbH');
    await page.getByTestId('ob-dept').fill('Vertrieb');
    await page.getByTestId('ob-dept-add').click();
    await expect(page.getByTestId('ob-depts')).toContainText('Vertrieb');
    await page.getByTestId('onboarding-next').click();
    await expect(page.getByTestId('ob-sources')).toContainText('Ohne CORE-Sitzung');
    await page.getByTestId('onboarding-next').click();
    await expect(page.getByTestId('ob-tour')).toBeVisible();
    await expect(page.getByTestId('os-dock')).toHaveAttribute('data-tour-spot', '');
    await page.getByTestId('onboarding-skip').click();
    await expect(ob).toHaveCount(0);
    const org = await page.evaluate(() => window.localStorage.getItem('saimor_os_onboarding_org'));
    expect(org).toContain('Vertrieb');
    await page.reload();
    await expect(page.getByTestId('feature-today')).toBeVisible();
    await expect(page.getByTestId('onboarding')).toHaveCount(0);
    await page.goto('/os#settings');
    await page.getByTestId('onboarding-restart').click();
    await expect(page.getByTestId('onboarding')).toBeVisible();
  });

  test('agent feed: demo entries are marked as Beispiel on Heute and in MÔRA', async ({ page }) => {
    await page.goto('/os#today');
    const feed = page.getByTestId('agent-feed');
    await expect(feed).toBeVisible();
    await expect(feed.locator('.os-sample-tag')).toBeVisible();
    await expect(feed.locator('.os-agent-feed__item')).toHaveCount(3);
    await page.goto('/os#mora');
    await page.getByTestId('mora-tab-agents').click();
    await expect(page.getByTestId('agent-feed').locator('.os-sample-tag')).toBeVisible();
  });

  test('sources page is honest without a CORE session', async ({ page }) => {
    await page.goto('/os#settings');
    await page.getByTestId('settings-tab-sources').click();
    await expect(page.getByTestId('sources-panel')).toContainText('erst mit einer Sitzung');
    await expect(page.getByText('verbunden', { exact: true })).toHaveCount(0);
  });
});
