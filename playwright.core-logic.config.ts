import { defineConfig } from '@playwright/test';

const baseURL = process.env.CORE_LOGIC_QA_URL || 'http://127.0.0.1:3112';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
  throw new Error('CORE logic QA is restricted to the isolated local example environment.');
}
export default defineConfig({
  testDir: './e2e/core-logic',
  workers: 1, retries: 0, timeout: 45_000,
  outputDir: 'test-results/core-logic',
  use: { baseURL, browserName: 'chromium', viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/Berlin', contextOptions: { reducedMotion: 'reduce' } },
});
