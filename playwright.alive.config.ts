import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'mora-alive.spec.ts', timeout: 45000,
  expect: { timeout: 15000 }, workers: 1, retries: 0, reporter: 'list',
  outputDir: 'test-results/mora-alive',
  use: { baseURL: 'http://127.0.0.1:3000', screenshot: 'on', trace: 'retain-on-failure' },
  webServer: { command: 'npm start -- --hostname 127.0.0.1', url: 'http://127.0.0.1:3000/tunnel?mora=alive', reuseExistingServer: false, timeout: 60000 },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, hasTouch: true } },
    { name: 'iphone-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
