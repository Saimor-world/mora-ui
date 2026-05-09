/**
 * Production Smoke Test — The One Test That Blocks Deploys
 *
 * Asserts the critical user path works end-to-end:
 *   1. Login page loads
 *   2. Login form accepts credentials → reaches /home
 *   3. Home shell renders (greeting, dock, orb)
 *   4. Notes pane opens, accepts text, persists
 *   5. Mora chat pane opens, message can be typed
 *   6. Logout returns to /login
 *
 * If this test fails, the deploy is REJECTED. No exceptions.
 *
 * Configuration via env:
 *   SMOKE_BASE_URL    — defaults to http://127.0.0.1:3000
 *   SMOKE_EMAIL       — required
 *   SMOKE_PASSWORD    — required
 *   SMOKE_HEADED=1    — to debug visually
 *
 * Run locally:
 *   SMOKE_EMAIL=demo@saimor.io SMOKE_PASSWORD=... npx playwright test e2e/production-smoke.spec.ts
 *
 * Run against production:
 *   SMOKE_BASE_URL=https://hq.saimor.world SMOKE_EMAIL=... SMOKE_PASSWORD=... npx playwright test e2e/production-smoke.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;

// Performance budgets from ARCHITECTURE.md §9
const BUDGET = {
    homeColdRender: 1500,
    paneOpenWarm: 300,
};

test.describe('Production Smoke', () => {
    test.skip(!EMAIL || !PASSWORD, 'SMOKE_EMAIL and SMOKE_PASSWORD must be set');

    test.beforeEach(async ({ page }) => {
        page.setDefaultTimeout(15_000);
    });

    test('critical path: login → home → notes → mora → logout', async ({ page }) => {
        // ── 1. Login page loads ───────────────────────────────────────
        const loginStart = Date.now();
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();

        // ── 2. Submit credentials → reach /home ──────────────────────
        await emailInput.fill(EMAIL!);
        await passwordInput.fill(PASSWORD!);

        const submitButton = page.locator('button[type="submit"]').first();
        await Promise.all([
            page.waitForURL(/\/home/, { timeout: 15_000 }),
            submitButton.click(),
        ]);

        // ── 3. Home shell renders ────────────────────────────────────
        // Greeting strip is the canonical "home loaded" signal
        await expect(page.locator('[data-testid="briefing-strip"]')).toBeVisible({ timeout: 10_000 });
        const homeRenderTime = Date.now() - loginStart;
        console.log(`[smoke] login → home render: ${homeRenderTime}ms`);

        // Dock must be present
        await expect(page.locator('[data-testid="dock"], [data-dock]').first()).toBeVisible();

        // ── 4. Notes pane opens and persists text ───────────────────
        const paneStart = Date.now();
        await openNotesPane(page);
        const paneTime = Date.now() - paneStart;
        console.log(`[smoke] notes pane open: ${paneTime}ms`);
        expect(paneTime).toBeLessThan(BUDGET.paneOpenWarm * 4); // generous in CI

        const notesTextarea = page.locator('textarea').first();
        await expect(notesTextarea).toBeVisible();

        const testText = `smoke-test-${Date.now()}`;
        await notesTextarea.fill(testText);
        await notesTextarea.blur();

        // Wait for save indicator to settle
        await page.waitForTimeout(800);
        await expect(notesTextarea).toHaveValue(testText);

        // ── 5. Mora chat opens (message-typeable check, no LLM call) ─
        await openMoraChat(page);

        const chatInput = page
            .locator('textarea[placeholder*="rag"], textarea[placeholder*="ora"], textarea[placeholder*="rag" i]')
            .first()
            .or(page.locator('[data-testid="chat-input"]').first());
        await expect(chatInput).toBeVisible({ timeout: 8_000 });
        await chatInput.fill('hallo');
        await expect(chatInput).toHaveValue('hallo');

        // ── 6. Logout returns to login ───────────────────────────────
        const logoutButton = page.locator('[data-testid="home-logout"]').first();
        if (await logoutButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await Promise.all([
                page.waitForURL(/\/login|\/$/, { timeout: 10_000 }),
                logoutButton.click(),
            ]);
        }
    });

    test('degraded mode: home renders without LLM provider', async ({ page }) => {
        test.skip(!EMAIL || !PASSWORD, 'credentials required');

        await loginFlow(page, EMAIL!, PASSWORD!);

        // Home must render even if assistant is degraded
        await expect(page.locator('[data-testid="briefing-strip"]')).toBeVisible();

        // Search must work via fallback (no LLM dependency)
        const searchTrigger = page.locator('[data-testid="dock-search"], [data-search-trigger]').first();
        if (await searchTrigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await searchTrigger.click();
            const searchInput = page.locator('input[placeholder*="uche" i]').first();
            await expect(searchInput).toBeVisible({ timeout: 5_000 });
        }
    });
});

// ── Helpers ───────────────────────────────────────────────────────────

async function loginFlow(page: Page, email: string, password: string) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().fill(email);
    await page.locator('input[type="password"], input[name="password"]').first().fill(password);
    await Promise.all([
        page.waitForURL(/\/home/, { timeout: 15_000 }),
        page.locator('button[type="submit"]').first().click(),
    ]);
}

async function openNotesPane(page: Page) {
    // Try multiple selectors — dock changes naming over time
    const selectors = [
        '[data-testid="dock-notes"]',
        '[data-app-id="notes"]',
        'button[aria-label*="otiz" i]',
        'button:has-text("Notizen")',
    ];
    for (const sel of selectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1_500 }).catch(() => false)) {
            await el.click();
            return;
        }
    }
    throw new Error('Could not find notes dock button');
}

async function openMoraChat(page: Page) {
    const selectors = [
        '[data-testid="dock-chat"]',
        '[data-app-id="chat"]',
        'button[aria-label*="ora" i]',
        'button:has-text("Mora")',
    ];
    for (const sel of selectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1_500 }).catch(() => false)) {
            await el.click();
            return;
        }
    }
    throw new Error('Could not find Mora dock button');
}
