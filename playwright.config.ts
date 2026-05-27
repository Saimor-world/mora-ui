import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for L2/L3 smoke tests.
 * Runs against the local UI by default.
 * Use playwright.live.config.ts for staged/live canaries.
 *
 * Usage:
 *   npx playwright test
 *   BASE_URL=http://localhost:3003 npx playwright test
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    retries: 1,
    reporter: 'list',
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        headless: true,
        viewport: { width: 1280, height: 800 },
        // Accept self-signed certs in dev if needed
        ignoreHTTPSErrors: false,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
