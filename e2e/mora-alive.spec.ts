import { test, expect } from '@playwright/test';

test('renders a 3D body, supports touch/keyboard controls and labels expressions as preview', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /THREE.WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text())) errors.push(message.text()); });
  await page.goto('/tunnel?mora=alive');
  await expect(page.getByRole('region', { name: 'MÔRA Alive Vorschau' })).toBeVisible();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.getByRole('img', { name: 'Freigegebenes SAIMÔR-Sigil' }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Bewegung pausieren' }).click();
  await expect(canvas).toHaveAttribute('data-gpu-nonfinite', '0');
  await canvas.screenshot({ path: info.outputPath('reference-idle.png') });
  await page.getByRole('button', { name: 'Bewegung fortsetzen' }).click();
  await page.getByRole('button', { name: 'Zu mir', exact: true }).press('Enter');
  await page.getByTestId('mora-alive-stage').tap({ position: { x: 100, y: 100 } });
  await page.getByRole('combobox', { name: 'Character-Vorschau' }).selectOption('working');
  await expect(page.getByRole('status')).toHaveText('Arbeitet');
  await expect(page.getByRole('region', { name: 'MÔRA Alive Vorschau' })).toHaveAttribute('data-character-source', 'preview');
  await page.getByRole('button', { name: 'Bewegung pausieren' }).click();
  await expect(page.getByRole('button', { name: 'Bewegung fortsetzen' })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: info.outputPath('alive-paused.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Character-Vorschau' }).selectOption('night-rest');
  await expect(canvas).toHaveAttribute('data-gpu-nonfinite', '0');
  await canvas.screenshot({ path: info.outputPath('reference-night-rest.png') });
  await page.getByRole('combobox', { name: 'Character-Vorschau' }).selectOption('');
  await expect(page.getByRole('status')).toHaveText('Bei dir');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('system reduced motion freezes the rendered pose and mobile content scrolls', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tunnel?mora=alive');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('Reduzierte Bewegung aktiv. Der Körper bleibt still.')).toBeVisible();
  const before = await page.locator('canvas').screenshot();
  await page.waitForTimeout(250);
  expect(await page.locator('canvas').screenshot()).toEqual(before);
  await page.getByRole('link', { name: 'Zum SAIMÔR OS ↗' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: 'Zum SAIMÔR OS ↗' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('alive-reduced-motion.png'), fullPage: true });
});
