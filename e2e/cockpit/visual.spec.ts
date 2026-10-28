import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const revision = process.env.COCKPIT_REVISION || 'after';
const improved = revision === 'after';
const sizes = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'ipad', width: 1180, height: 820 },
  { name: 'iphone', width: 390, height: 844 },
];

for (const size of sizes) test(`${size.name}: Home, Universe, Planet und Ordner`, async ({ page }) => {
  await page.setViewportSize(size);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' || request.method() !== 'GET' || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  const folder = path.resolve('test-results/cockpit', revision, size.name);
  await fs.mkdir(folder, { recursive: true });
  const shot = async (name: string) => {
    await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => (img as HTMLImageElement).decode().catch(() => {}))));
    await page.screenshot({ path: path.join(folder, `${name}.png`), animations: 'disabled' });
  };
  await page.goto('/os?firma=morgenrot&als=marius');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('home')).toHaveAttribute('data-phone', size.name === 'iphone' ? '1' : '0');
  await shot('01-home');
  if (improved) {
    await expect(page.getByText('Fiktive Demo', { exact: true })).toBeVisible();
    for (const id of ['service', 'kueche', 'aushilfe', 'verwaltung']) await expect(page.getByTestId(`open-${id}`)).toBeVisible();
    const panel = await page.locator('.ck-panel').boundingBox();
    const dock = await page.locator('.ck-dock').boundingBox();
    expect(panel!.y + panel!.height).toBeLessThan(dock!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
  }
  await page.getByTestId('open-firma').click();
  await expect(page.getByTestId('planet-system')).toBeVisible();
  await shot('02-universe');
  const kitchen = page.getByTestId('open-kueche');
  await kitchen.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('planet-kueche')).toBeVisible();
  await shot('03-planet');
  if (improved) {
    const title = await page.getByRole('heading', { name: 'Küche', exact: true }).boundingBox();
    const dock = await page.locator('.ck-dock').boundingBox();
    expect(title!.y + title!.height).toBeLessThan(dock!.y - 16);
    for (const moon of await page.locator('.ck-moon').all()) {
      const target = await moon.boundingBox();
      const orb = await moon.locator('.glass-orb').boundingBox();
      expect(target!.width).toBeGreaterThanOrEqual(44);
      expect(orb!.width).toBeGreaterThanOrEqual(size.name === 'iphone' ? 72 : 90);
      expect(target!.x).toBeGreaterThanOrEqual(0);
      expect(target!.x + target!.width).toBeLessThanOrEqual(size.width);
    }
  }
  await page.getByTestId('moon-k-rez').click();
  await expect(page.getByTestId('ck-sheet')).toBeVisible();
  await shot('04-folder');
  await page.getByRole('button', { name: 'Schließen' }).click();
  await page.getByTestId('ck-back').click();
  await page.getByTestId('open-verwaltung').click();
  await shot('05-four-moons');
  await page.getByTestId('dock-home').click();
  await page.getByTestId('viewer-switch').selectOption('tarek');
  await expect(page.getByTestId('home')).toHaveAttribute('data-scope', 'staff');
  await expect(page.locator('.ck-facts')).toHaveCount(0);
  await shot('06-staff');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('open-firma').click();
  await shot('07-reduced-motion');
  expect(errors).toEqual([]);
});
