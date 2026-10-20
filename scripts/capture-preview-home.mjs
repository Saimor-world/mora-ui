/**
 * Playwright capture of preview Home (/home in private_preview).
 *
 * Mocks CORE + auth APIs via route interception (no live backend).
 * Seeds website-entry localStorage without a security-check score
 * (plain product-demo link — the empty "--" case).
 *
 * Usage:
 *   CAPTURE_OUT=/opt/cursor/artifacts CAPTURE_LABEL=after \
 *     BASE_URL=http://127.0.0.1:3005 node scripts/capture-preview-home.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3005';
const OUT_DIR = process.env.CAPTURE_OUT || '/opt/cursor/artifacts';
const LABEL = process.env.CAPTURE_LABEL || 'after';

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
];

const PROFILE = {
  user_id: 'preview-user',
  email: 'preview@simplecoffee.test',
  full_name: 'Preview',
  role: 'demo',
  tenant_id: 'tenant-preview-simple-coffee',
  demo_mode: true,
  operational_state: 'operational',
  setup_required: false,
  active_company_id: 'company-simple-coffee',
  active_company_name: 'Simple Coffee Group',
  company_count: 1,
  scope_source: 'website_entry_preview',
};

const COMPANIES = [
  {
    id: 'company-simple-coffee',
    tenant_id: 'tenant-preview-simple-coffee',
    owner_id: 'preview-user',
    name: 'Simple Coffee Group',
    slug: 'simple-coffee-group',
    is_demo: true,
  },
];

const WEBSITE_ENTRY = {
  id: 'preview-demo',
  companyName: 'Simple Coffee Group',
  title: 'Product Demo',
  domain: 'simplecoffee.example',
  rooms: [],
  documents: [],
  tasks: [],
  storedAt: new Date().toISOString(),
};

function envelope(data) {
  return { data, meta: { api_version: 'v3' } };
}

async function installMocks(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/auth/session')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { email: PROFILE.email, name: PROFILE.full_name, tenant_id: PROFILE.tenant_id } }),
      });
    }
    if (url.includes('/api/auth/owner-preview-return')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: false }),
      });
    }
    if (url.includes('/api/auth/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }

    const coreIdx = url.indexOf('/api/core/');
    if (coreIdx !== -1) {
      const slug = url.slice(coreIdx + '/api/core'.length).split('?')[0];
      if (slug.includes('/v3/auth/session') || slug.includes('/v3/auth/me') || slug.endsWith('/v3/users/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(PROFILE)) });
      }
      if (slug.includes('/v3/companies')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(COMPANIES)) });
      }
      if (method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope([])) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope({ ok: true })) });
    }

    return route.continue();
  });
}

async function seedPreview(page) {
  await page.addInitScript((entry) => {
    localStorage.setItem('saimor_website_entry_context', JSON.stringify(entry));
    localStorage.setItem('saimor_session_kind', 'website_entry_preview');
    localStorage.setItem('saimor_tenant', 'tenant-preview-simple-coffee');
    localStorage.setItem('saimor_role', 'demo');
    localStorage.setItem('last_user_email', 'preview@simplecoffee.test');
    localStorage.setItem('last_user_name', 'Preview');
    localStorage.setItem('last_activity', String(Date.now()));
    localStorage.setItem('saimor_view_mode', 'workspace');
    sessionStorage.removeItem('saimor_product_tour_session');
    localStorage.removeItem('saimor_product_tour_dismissed');
    localStorage.removeItem('saimor_first_run_tour_v1');
  }, WEBSITE_ENTRY);
}

async function captureViewport(browser, { name, width, height }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: 'de-DE',
    reducedMotion: 'reduce',
  });
  await context.addCookies([
    { name: 'mora_session', value: 'sess_preview_capture', url: BASE_URL },
    { name: 'mora_auth_token', value: 'sess_preview_capture', url: BASE_URL },
  ]);
  const page = await context.newPage();
  await installMocks(page);
  await seedPreview(page);

  await page.goto(`${BASE_URL}/home`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const isPhone = width <= 767;
  if (isPhone) {
    await page.waitForURL(/\/begleiter/, { timeout: 25_000 });
    await page.locator('[data-testid="begleiter"]').waitFor({ state: 'visible', timeout: 25_000 });
    await page.getByTestId('proposal-title').waitFor({ state: 'visible', timeout: 10_000 });
  } else {
    const surface = page.locator('[data-testid="visitor-home-surface"]');
    await surface.waitFor({ state: 'visible', timeout: 25_000 });
    await page.getByText(/Guten |Willkommen/).first().waitFor({ state: 'visible', timeout: 10_000 });
  }
  await page.waitForTimeout(800);

  const file = path.join(OUT_DIR, `preview-home-${LABEL}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return file;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const files = [];
  try {
    for (const vp of VIEWPORTS) {
      const file = await captureViewport(browser, vp);
      files.push(file);
      console.log(`wrote ${file}`);
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ label: LABEL, files }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
