/**
 * MR10 Smoke: Finder from L3 folder click
 *
 * Acceptance criteria:
 * 1. Navigate L2 → L3 by clicking a Space moon, then click a folder orb.
 * 2. Finder pane opens.
 * 3. Exactly ONE [data-testid="finder-nav-group"] exists (no duplicate nav controls).
 * 4. No network requests to /v1/chat or /v1/folders/{id}/context were made.
 *
 * Run: npx playwright test e2e / finder - from - l3.spec.ts
    */

import { test, expect, Page, Request } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://hq.saimor.world';

async function goToApp(page: Page) {
    await page.goto(BASE + '/home', { waitUntil: 'networkidle' });
}

async function isAuthWall(page: Page): Promise<boolean> {
    const url = page.url();
    return (
        url.includes('callbackUrl') ||
        url.includes('/login') ||
        url.includes('/auth') ||
        url.includes('/sign') ||
        (!url.includes('/home') && !url.includes('/app'))
    );
}

test.describe('MR10 — Finder from L3', () => {
    let v1Requests: string[] = [];

    test.beforeEach(async ({ page }) => {
        v1Requests = [];

        // Capture v1 API requests
        page.on('request', (req: Request) => {
            const url = req.url();
            if (url.includes('/v1/chat') || url.includes('/v1/folders/') && url.includes('/context')) {
                v1Requests.push(url);
            }
        });

        await goToApp(page);
        const onAuthWall = await isAuthWall(page);
        test.skip(onAuthWall, 'No auth session — set BASE_URL to authenticated environment or use storageState');
    });

    test('opens Finder from L3 folder click with single nav group and no v1 requests', async ({ page }) => {
        // Step 1: navigate to L3 by clicking first visible Space moon
        const firstMoon = page.locator('[data-testid^="space-"]').first();
        await expect(firstMoon).toBeVisible({ timeout: 12000 });
        await firstMoon.click();

        // Step 2: confirm we're in L3 — folder orbs should appear
        const firstFolder = page.locator('[data-testid^="folder-"]').first();
        await expect(firstFolder).toBeVisible({ timeout: 10000 });

        // Step 3: click the folder to open Finder
        await firstFolder.click();

        // Step 4: Finder pane should now be visible
        // The Finder pane title is "Finder" or contains the folder name
        const finderPane = page
            .locator('[data-testid="finder-nav-group"]')
            .or(page.locator('text=FINDER').first())
            .or(page.locator('[title^="Back (Alt"]').first());

        await expect(finderPane).toBeVisible({ timeout: 10000 });

        // Step 5: assert exactly ONE finder-nav-group
        const navGroups = page.locator('[data-testid="finder-nav-group"]');
        await expect(navGroups).toHaveCount(1, { timeout: 5000 });

        // Step 6: assert no v1/chat or v1/folders/context requests were made
        // Allow a small settle time for any deferred requests
        await page.waitForTimeout(500);

        expect(
            v1Requests,
            `Expected no v1 chat/context requests, but got: ${JSON.stringify(v1Requests)}`
        ).toHaveLength(0);
    });

    test('Finder nav-group has exactly 3 nav buttons (Back, Forward, Up)', async ({ page }) => {
        // Navigate to L3, open Finder
        const firstMoon = page.locator('[data-testid^="space-"]').first();
        await expect(firstMoon).toBeVisible({ timeout: 12000 });
        await firstMoon.click();

        const firstFolder = page.locator('[data-testid^="folder-"]').first();
        await expect(firstFolder).toBeVisible({ timeout: 10000 });
        await firstFolder.click();

        // Finder pane opened — check nav group
        const navGroup = page.locator('[data-testid="finder-nav-group"]');
        await expect(navGroup).toBeVisible({ timeout: 10000 });

        // Should have exactly 3 buttons: back, forward, up
        const navButtons = navGroup.locator('button');
        await expect(navButtons).toHaveCount(3);

        // Verify aria-labels
        await expect(navGroup.locator('[aria-label="Navigate back"]')).toHaveCount(1);
        await expect(navGroup.locator('[aria-label="Navigate forward"]')).toHaveCount(1);
        await expect(navGroup.locator('[aria-label="Navigate up"]')).toHaveCount(1);
    });
});
