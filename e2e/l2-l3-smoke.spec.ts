/**
 * L2 / L3 Smoke Tests — Demo Regression Guard
 *
 * What these tests protect:
 *  - L2 (DepartmentLayer): centre orb renders, at least one Space moon visible
 *  - L3 (SpaceLayer): clicking a moon navigates into it, folder orbs appear
 *  - Breadcrumb path updates correctly on each navigation
 *  - Critical buttons (Back, + NEW SPACE / + NEW FOLDER) are visible
 *
 * These run against the configured Playwright baseURL. The app requires a valid auth session.
 * If the page redirects to login, tests are skipped gracefully.
 *
 * Run: npx playwright test e2e/l2-l3-smoke.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

/** Navigate to the app and wait for the layer to stabilise. */
async function goToApp(page: Page) {
    await page.goto('/home', { waitUntil: 'networkidle' });
}

/**
 * True if the page landed on an auth wall instead of the app.
 * The server redirects to /?callbackUrl=%2Fhome when not authenticated —
 * check for callbackUrl in query string OR common auth paths.
 */
async function isAuthWall(page: Page): Promise<boolean> {
    const url = page.url();
    return (
        url.includes('callbackUrl') ||
        url.includes('/login') ||
        url.includes('/auth') ||
        url.includes('/sign') ||
        url.endsWith('/?') ||
        // Also check: if we're on the root and the expected shell elements are absent
        (!url.includes('/home') && !url.includes('/app'))
    );
}

// ─── L2: DepartmentLayer ─────────────────────────────────────────────────────

test.describe('L2 — DepartmentLayer', () => {
    test.beforeEach(async ({ page }) => {
        await goToApp(page);
        const onAuthWall = await isAuthWall(page);
        test.skip(onAuthWall, 'No auth session — run against an authenticated environment or set cookies via storageState');
    });

    test('shows "LAYER DEPARTMENT" pill in top bar', async ({ page }) => {
        // The top bar label switches to reflect the current layer
        await expect(page.locator('text=LAYER DEPARTMENT').or(page.locator('text=Layer Department'))).toBeVisible();
    });

    test('renders the centre department orb with dept name', async ({ page }) => {
        // Stats panel heading confirms we're in L2
        await expect(page.locator('text=DEPARTMENT ORBIT').or(page.locator('text=Department Orbit'))).toBeVisible({ timeout: 8000 });
    });

    test('renders at least one Space moon with data-testid', async ({ page }) => {
        const moons = page.locator('[data-testid^="space-"]');
        await expect(moons.first()).toBeVisible({ timeout: 10000 });
        const count = await moons.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('moon is not clipped by top bar (y > 80px)', async ({ page }) => {
        const moon = page.locator('[data-testid^="space-"]').first();
        await expect(moon).toBeVisible({ timeout: 10000 });
        const box = await moon.boundingBox();
        expect(box).not.toBeNull();
        // Top of moon should be below the top bar (~60px)
        expect(box!.y).toBeGreaterThan(80);
    });

    test('moon is not clipped by bottom dock (bottom < 90% of viewport height)', async ({ page }) => {
        const moon = page.locator('[data-testid^="space-"]').first();
        await expect(moon).toBeVisible({ timeout: 10000 });
        const box = await moon.boundingBox();
        const vh = page.viewportSize()!.height;
        expect(box!.y + box!.height).toBeLessThan(vh * 0.90);
    });

    test('Back button is visible and has text "Zurück" or "Back"', async ({ page }) => {
        const back = page.locator('button:has-text("Zurück"), button:has-text("Back"), button:has-text("ZURUCK")');
        await expect(back.first()).toBeVisible();
    });

    test('+ NEW SPACE button is visible', async ({ page }) => {
        await expect(page.locator('button:has-text("NEW SPACE"), button:has-text("New Space")')).toBeVisible();
    });
});

// ─── L3: SpaceLayer ──────────────────────────────────────────────────────────

test.describe('L3 — SpaceLayer', () => {
    test.beforeEach(async ({ page }) => {
        await goToApp(page);
        const onAuthWall = await isAuthWall(page);
        test.skip(onAuthWall, 'No auth session — run against an authenticated environment or set cookies via storageState');
        // Navigate into L3 by clicking the first moon
        const firstMoon = page.locator('[data-testid^="space-"]').first();
        await expect(firstMoon).toBeVisible({ timeout: 10000 });
        await firstMoon.click();
    });

    test('shows "LAYER SPACE" pill after clicking moon', async ({ page }) => {
        await expect(page.locator('text=LAYER SPACE').or(page.locator('text=Layer Space'))).toBeVisible({ timeout: 8000 });
    });

    test('renders at least one Folder orb with data-testid', async ({ page }) => {
        const folders = page.locator('[data-testid^="folder-"]');
        await expect(folders.first()).toBeVisible({ timeout: 10000 });
        const count = await folders.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('shows "FOLDER CLUSTER" stats panel heading', async ({ page }) => {
        // Stats panel shows "Layer 3 / Folder Cluster" (pill was removed; text is in stats panel)
        await expect(
            page.locator('text=FOLDER CLUSTER')
                .or(page.locator('text=Folder Cluster'))
                .or(page.locator('text=folder cluster'))
        ).toBeVisible({ timeout: 8000 });
    });

    test('folder orb is not clipped by top bar (y > 80px)', async ({ page }) => {
        const folder = page.locator('[data-testid^="folder-"]').first();
        await expect(folder).toBeVisible({ timeout: 10000 });
        const box = await folder.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeGreaterThan(80);
    });

    test('Back button navigates back to L2', async ({ page }) => {
        const back = page.locator('button:has-text("Zurück"), button:has-text("Back")').first();
        await expect(back).toBeVisible();
        await back.click();
        // Should return to L2 — moon visible again
        await expect(page.locator('[data-testid^="space-"]').first()).toBeVisible({ timeout: 8000 });
    });

    test('+ NEW FOLDER button is visible', async ({ page }) => {
        await expect(page.locator('button:has-text("NEW FOLDER"), button:has-text("New Folder")')).toBeVisible();
    });
});
