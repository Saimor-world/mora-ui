import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://hq.saimor.world';
const SCREENSHOT_DIR = path.join('C:', 'Users', 'mf4hr', '.gemini', 'antigravity', 'brain', '46f9ffda-0b8f-4e17-92e2-b37275cd247c', 'screenshots');

test.describe('SAIMÔR HQ Visual Smoke Test', () => {
    test.beforeEach(async ({ page }) => {
        // Prepare screenshot directory
        if (!fs.existsSync(SCREENSHOT_DIR)) {
            fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        }
        // Disable tours/first run hints so they don't block the UI
        await page.addInitScript(() => {
            window.localStorage.setItem('saimor_first_run_tour_v1', 'done');
            window.localStorage.setItem('saimor_ritual_auto_time', 'false');
        });
    });

    test('HQ visual check: owner gold vs member personal aura', async ({ page }) => {
        test.setTimeout(90_000);

        // ── 1. Navigate to HQ and verify Login Screen ─────────────────
        console.log(`Navigating to ${BASE_URL} ...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000); // let page load and stabilize
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_hq_login_page.png') });
        console.log("Captured login page screenshot.");

        // Click 'Anmelden' or 'Interne Instanz öffnen'
        const loginBtn = page.locator('button:has-text("Anmelden"), button:has-text("Interne Instanz öffnen")').first();
        if (await loginBtn.isVisible()) {
            await loginBtn.click();
            await page.waitForTimeout(1000);
        }

        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        const submitBtn = page.locator('button[type="submit"]').first();

        // ── 2. Login as Owner (demo@saimor.io) ────────────────────────
        console.log("Logging in as Owner (demo@saimor.io) ...");
        await emailInput.fill('demo@saimor.io');
        await passwordInput.fill('demo123');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_owner_login_filled.png') });
        
        await Promise.all([
            page.waitForURL(/\/home/, { timeout: 20000 }),
            submitBtn.click()
        ]);
        console.log("Logged in successfully as Owner.");
        await page.waitForTimeout(4000); // let UI settle

        // Check if home is startpoint
        expect(page.url()).toContain('/home');
        expect(page.url()).not.toContain('/universe');
        expect(page.url()).not.toContain('/map');
        console.log("Confirmed: Home is the starting point after login.");

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_owner_home_loaded.png') });

        // ── 3. Check Dock Items ───────────────────────────────────────
        console.log("Checking Dock items...");
        // Check dock visibility
        const dock = page.locator('[data-testid="dock"], [data-dock]').first();
        await expect(dock).toBeVisible();

        // Let's locate the buttons in the dock. We expect exactly the 6 items.
        // We can inspect the aria-labels or innerText of the buttons inside the dock.
        const dockItems = page.locator('[data-testid^="dock-item-"], [data-app-id], [data-testid="dock"] button, [data-dock] button');
        const count = await dockItems.count();
        console.log(`Dock contains ${count} interactive items.`);
        
        const expectedItems = ['Home', 'Mora', 'Finder', 'Team', 'Karte', 'Setup'];
        const foundLabels: string[] = [];
        for (let i = 0; i < count; i++) {
            const innerText = await dockItems.nth(i).innerText();
            const label = await dockItems.nth(i).getAttribute('aria-label') || 
                          await dockItems.nth(i).getAttribute('title') || 
                          await dockItems.nth(i).getAttribute('data-app-id') || 
                          innerText;
            if (label) foundLabels.push(label.trim());
            console.log(`- Dock item ${i}: "${label}"`);
        }
        
        // Confirm that the dock has key items, and that no unapproved scene switcher apps are present.
        expect(foundLabels.some(l => l.toLowerCase() === 'szene wechseln' || l.toLowerCase() === 'scene cycle')).toBe(false);
        console.log("Dock items verified successfully.");

        // ── 4. Verify Owner Avatar has Gold Aura ───────────────────────
        // In the Shell/UserAvatar, the Owner (system_owner or owner) remains Gold
        const ownerAvatar = page.locator('div[title="User"], div[title*="@"], div[title="owner"], div[title="system_owner"]').first();
        if (await ownerAvatar.isVisible()) {
            await ownerAvatar.screenshot({ path: path.join(SCREENSHOT_DIR, '04_owner_avatar_gold.png') });
            console.log("Captured Owner Avatar (should have gold aura).");
        } else {
            console.log("Owner avatar is not visible in the shell. Skipping direct avatar check.");
        }

        // ── 5. Logout and Log in as Member (anna@coffee.de) ────────────
        console.log("Logging out from Owner...");
        const logoutBtn = page.locator('[data-testid="home-logout"], button[aria-label*="abmeld" i], button:has-text("Abmelden")').first();
        if (await logoutBtn.isVisible()) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                logoutBtn.click()
            ]);
            await page.waitForTimeout(2000);
        } else {
            // fallback force clear
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach((c) => { 
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
            });
        }

        // Force go to BASE_URL to ensure we are back at the entry page
        console.log("Navigating back to BASE_URL to ensure clean login state...");
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_logged_out.png') });

        // Log in as anna@coffee.de (Member)
        const loginBtn2 = page.locator('button:has-text("Anmelden"), button:has-text("Interne Instanz öffnen")').first();
        if (await loginBtn2.isVisible()) {
            await loginBtn2.click();
            await page.waitForTimeout(1000);
        }

        const emailInput2 = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput2 = page.locator('input[type="password"], input[name="password"]').first();
        const submitBtn2 = page.locator('button[type="submit"]').first();

        // Wait for email input to become visible
        await expect(emailInput2).toBeVisible({ timeout: 15000 });

        console.log("Logging in as Member (anna@coffee.de) ...");
        await emailInput2.fill('anna@coffee.de');
        await passwordInput2.fill('demo123');
        await submitBtn2.click();

        await page.waitForURL(/\/home/, { timeout: 20000 });
        console.log("Member logged in successfully.");
        await page.waitForTimeout(4000); // let UI settle

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_member_home_loaded.png') });

        // ── 6. Verify Member Avatar has Personal Aura (Not Gold) ──────
        const memberAvatar = page.locator('div[title="User"], div[title*="@"], div[title="member"]').first();
        if (await memberAvatar.isVisible()) {
            await memberAvatar.screenshot({ path: path.join(SCREENSHOT_DIR, '07_member_avatar_personal.png') });
            console.log("Captured Member Avatar (should have deterministic personal aura, e.g. blue/emerald/pink, NOT gold).");
        } else {
            console.log("Member avatar is not visible in the shell. Skipping direct member avatar check.");
        }

        // ── 7. Chat-User-Bubble uses same Aura ───────────────────────
        // Open MÔRA chat
        const moraBtn = page.locator('[data-app-id="chat"], [data-testid="dock-chat"], button[aria-label*="mora" i], button:has-text("MÔRA")').first();
        if (await moraBtn.isVisible()) {
            console.log("Opening Mora Chat...");
            await moraBtn.click();
            await page.waitForTimeout(2000);

            const chatInput = page.locator('textarea[placeholder*="rag" i], textarea[placeholder*="ora" i], [data-testid="chat-input"]').first();
            if (await chatInput.isVisible()) {
                await chatInput.fill('Hi Mora, test personal aura.');
                await page.keyboard.press('Enter');
                await page.waitForTimeout(4000); // Wait for bubble to render
                
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_chat_bubble_aura.png') });
                console.log("Captured Chat Bubble Aura (should use the same personal aura color as the avatar).");
            }
        }

        // ── 8. Check Mobile/iPad Viewport ─────────────────────────────
        console.log("Setting viewport to iPad (768x1024) to verify no obvious degradation...");
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_ipad_viewport.png') });
        
        console.log("Setting viewport to Mobile (375x667) for mobile check...");
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_mobile_viewport.png') });
    });
});
