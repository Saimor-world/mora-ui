import { defineConfig } from '@playwright/test';
const baseURL = 'http://127.0.0.1:3000';
export default defineConfig({
  testDir: './e2e/universe-refinement', workers: 1, retries: 0, timeout: 45000,
  outputDir: 'test-results/universe-refinement', reporter: 'list',
  use: { baseURL, browserName: 'chromium', contextOptions: { reducedMotion: 'reduce' },
    timezoneId: 'Europe/Berlin', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm start', url: baseURL, reuseExistingServer: false, timeout: 60000 },
});
