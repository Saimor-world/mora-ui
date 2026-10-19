// Universe screenshot capture with mocked data
// Usage: node scripts/capture-universe.mjs [port] [output-name] [options]
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const [,, portArg, nameArg] = process.argv;
const port = portArg || '3003';
const name = nameArg || 'universe-default';
const base = `http://localhost:${port}`;

// Load fixture
const FIXTURE_PATH = process.env.FIXTURE || './fixtures/universe-demo.json';
const real = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const entry = Object.entries(real.by_company)[0];
const uni = entry ? entry[1] : real.default;
const company = uni.company;

// Build departments from planets for /v3/tree and /v3/departments
const depts = uni.planets.filter(p => p.kind === 'domain').map((p, i) => ({
  id: p.department_id || `dept-${p.key.replace('domain:', '')}`,
  tenant_id: 'tenant-saimor-hq',
  company_id: company.id,
  name: p.label,
  slug: p.domain_type,
  order: i,
  visibility: 'visible',
  spaces: (p.moons || []).map(m => ({ id: m.key.replace('space:', ''), name: m.label, folders: [] }))
}));

// User profile for session
const profile = {
  user_id: 'owner',
  email: 'marius@saimor.world',
  full_name: 'Marius',
  role: 'system_owner',
  tenant_id: 'tenant-saimor-hq',
  operational_state: 'operational',
  setup_required: false,
  active_company_id: company.id,
  active_company_name: company.name,
  company_count: 1,
  scope_source: 'screenshot-harness'
};

// Signals/signals mock data with realistic work info
const signalsMock = [
  { id: 's1', kind: 'mail', title: '3 neue E-Mails', subtitle: 'Posteingang', department_id: null, timestamp: new Date().toISOString() },
  { id: 's2', kind: 'task', title: 'Review: UI-Verbesserungen', subtitle: 'Werkstatt', department_id: 'dept-werkstatt', timestamp: new Date().toISOString() },
  { id: 's3', kind: 'approval', title: 'Freigabe: Quartalsbudget', subtitle: 'Finanzen', department_id: 'dept-finanzen', timestamp: new Date().toISOString() },
];

// MORA presence mock - for "working" state
const moraPresenceMock = {
  state: process.env.MORA_STATE || 'calm',
  target: process.env.MORA_TARGET || null,
  action: process.env.MORA_ACTION || null,
  message: process.env.MORA_MESSAGE || null,
};

const W = +(process.env.W || 1440);
const H = +(process.env.H || 900);
const DPR = +(process.env.DPR || 2);

async function main() {
  console.log(`Capturing Universe at ${base} → ${name}.png (${W}x${H})`);
  
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DPR,
    timezoneId: 'Europe/Berlin',
    locale: 'de-DE',
  });

  // Set up session tokens
  await ctx.addInitScript(() => {
    localStorage.setItem('last_activity', new Date().toISOString());
    localStorage.setItem('saimor_dev_token', 'sess_harness_mock');
  });
  
  await ctx.addCookies([
    { name: 'mora_auth_token', value: 'sess_harness_mock', url: base },
    { name: 'mora_session', value: 'sess_harness_mock', url: base },
  ]);
  
  await ctx.addInitScript((cid) => {
    localStorage.setItem('last_company_id', cid);
    localStorage.setItem('saimor_active_company', cid);
  }, company.id);

  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('Page error:', e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('Console error:', msg.text());
  });

  // Mock all API routes
  await page.route('**/api/core/**', async route => {
    const url = route.request().url();
    let body = {};
    let status = 200;

    if (/\/v3\/health/.test(url)) {
      body = { status: 'ok' };
    } else if (url.includes('/v3/auth/session')) {
      body = profile;
    } else if (/\/v3\/universe(\?|$)/.test(url)) {
      body = { data: { ...uni, companies: real.companies } };
    } else if (/\/v3\/companies(\?|$)/.test(url)) {
      body = (real.companies || []).map(c => ({ id: c.id, name: c.name, is_demo: c.sector === 'demo' }));
    } else if (url.includes('/v3/mora/today')) {
      body = { items: [] };
    } else if (/\/v3\/(departments|tree)(\?|$)/.test(url)) {
      body = url.includes('/v3/tree') ? { departments: depts } : depts;
    } else if (url.includes('/users/me/memberships')) {
      body = { department_memberships: [] };
    } else if (url.includes('/v3/signals')) {
      body = { data: signalsMock };
    } else if (url.includes('/v3/mora/presence')) {
      body = moraPresenceMock;
    } else if (url.includes('/v3/department-stats')) {
      body = { stats: depts.map(d => ({ department_id: d.id, node_count: 10, folder_count: 3 })) };
    } else if (url.includes('/v1/nightwatch')) {
      body = { incidents: [] };
    } else if (url.includes('/v3/subscriptions')) {
      body = [];
    } else {
      // Default empty response for unknown endpoints
      body = {};
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  // Navigate to home
  console.log('Navigating to', base + '/home');
  await page.goto(base + '/home', { waitUntil: 'load', timeout: 60000 });
  
  // Wait for initial load
  await page.waitForTimeout(3000);
  
  // Click on UNIVERSE tab to switch to Universe view
  console.log('Clicking UNIVERSE tab...');
  try {
    // Try multiple selectors for the Universe toggle
    const universeTab = page.locator('text=UNIVERSE').first();
    if (await universeTab.isVisible()) {
      await universeTab.click();
      console.log('Clicked UNIVERSE tab');
    } else {
      // Try by test ID
      const toggleBtn = page.getByTestId('universe-toggle');
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
        console.log('Clicked universe-toggle');
      }
    }
  } catch (e) {
    console.log('Could not click Universe tab:', e.message);
  }
  
  // Wait for Universe to render
  await page.waitForTimeout(4000);
  
  // Move mouse to trigger any hover states, then away
  await page.mouse.move(W / 2, H / 2);
  await page.waitForTimeout(500);
  await page.mouse.move(W / 2, 70);
  await page.waitForTimeout(1000);

  // Check what's on the page
  const bodyText = await page.locator('body').innerText();
  console.log('Page content preview:', bodyText.slice(0, 300).replace(/\n/g, ' '));

  // Check for planets
  const planets = await page.locator('[data-planet-kind]').evaluateAll(els => 
    els.map(e => {
      const rect = e.getBoundingClientRect();
      return {
        label: e.getAttribute('data-mora-label'),
        kind: e.dataset.planetKind,
        state: e.dataset.planetState,
        pos: `${Math.round(rect.x + rect.width/2)},${Math.round(rect.y + rect.height/2)}`
      };
    })
  );
  console.log(`Found ${planets.length} planets:`, planets.map(p => p.label).join(', '));

  // Optional: Click on a planet to show detail panel
  if (process.env.CLICK_PLANET) {
    const planetName = process.env.CLICK_PLANET;
    console.log(`Clicking planet: ${planetName}`);
    try {
      await page.locator(`[data-planet-kind][data-mora-label="${planetName}"]`).first().click({ force: true });
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log('Could not click planet:', e.message);
    }
  }

  // Optional: Enable immersive mode
  if (process.env.IMMERSIVE) {
    console.log('Enabling immersive mode...');
    try {
      const immersiveBtn = page.locator('[data-testid="uv2-immersive"]');
      if (await immersiveBtn.isVisible()) {
        await immersiveBtn.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Could not enable immersive:', e.message);
    }
  }

  // Move mouse away from UI elements
  await page.mouse.move(W / 2, 70);
  await page.waitForTimeout(800);

  // Ensure output directory exists
  const outDir = '/opt/cursor/artifacts/screenshots';
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // Take screenshot
  const outPath = `${outDir}/${name}.png`;
  await page.screenshot({ path: outPath });
  console.log(`Screenshot saved to ${outPath}`);

  await browser.close();
  return outPath;
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
