import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for L2/L3 smoke tests.
 * Runs against the live deployment by default.
 * Override BASE_URL env var to test a local dev server.
 *
 * Usage:
 *   npx playwright test                          # against hq.saimor.world
 *   BASE_URL=http://localhost:3000 npx playwright test   # local
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    retries: 1,
    reporter: 'list',
    use: {
        baseURL: process.env.BASE_URL || 'https://hq.saimor.world',
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
