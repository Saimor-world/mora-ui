import { defineConfig } from '@playwright/test';
import path from 'node:path';

// Local, fictional preview only. No credentials or external service mutations.
export default defineConfig({
  testDir: './e2e/cockpit',
  timeout: 45_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: `test-results/cockpit/${process.env.COCKPIT_REVISION || 'after'}/traces`,
  use: { baseURL: 'http://127.0.0.1:3000', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: `node ${JSON.stringify(path.resolve('node_modules/next/dist/bin/next'))} start --hostname 127.0.0.1 --port 3000`,
    cwd: process.env.COCKPIT_APP_DIR || process.cwd(),
    url: 'http://127.0.0.1:3000/os?firma=morgenrot',
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
