// Universe screenshot capture with mocked data
// Usage: node scripts/capture-universe.mjs [port] [output-name]
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';

const [,, portArg, nameArg] = process.argv;
const port = portArg || '3003';
const name = nameArg || 'universe-default';
const base = `http://localhost:${port}`;
const empty = process.env.EMPTY === '1';
const stayHome = process.env.HOME === '1';

const FIXTURE_PATH = process.env.FIXTURE || './fixtures/universe-demo.json';
const real = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const uniRaw = real.default;
const uni = empty
  ? {
      ...uniRaw,
      planets: uniRaw.planets.map((p) => ({
        ...p,
        glow: null,
        counts: Object.fromEntries(Object.entries(p.counts || {}).map(([k, v]) => [k, typeof v === 'number' ? 0 : v])),
        moons: (p.moons || []).map((m) => ({ ...m, docs: 0 })),
      })),
    }
  : uniRaw;
const company = uni.company;

const depts = uni.planets.filter((p) => p.kind === 'domain').map((p, i) => ({
  id: p.department_id || `dept-${p.key.replace('domain:', '')}`,
  tenant_id: 'tenant-saimor-hq',
  company_id: company.id,
  name: p.label,
  slug: p.domain_type,
  order: i,
  visibility: 'visible',
  type: 'department',
  children: (p.moons || []).map((m) => ({
    id: m.key.replace('space:', ''),
    name: m.label,
    type: 'space',
    children: [],
  })),
  spaces: (p.moons || []).map((m) => ({ id: m.key.replace('space:', ''), name: m.label, folders: [] })),
}));

const profile = {
  user_id: 'owner',
  id: 'owner',
  email: 'marius@saimor.world',
  full_name: 'Marius',
  role: 'system_owner',
  tenant_id: 'tenant-saimor-hq',
  operational_state: 'operational',
  setup_required: false,
  active_company_id: company.id,
  active_company_name: company.name,
  company_count: 1,
  scope_source: 'screenshot-harness',
};

const todayIso = '2026-10-19';
const asOf = '2026-10-19T08:00:00+00:00';
const sourceMeta = {
  source: 'harness',
  scope: { level: 'company', tenant_id: 'tenant-saimor-hq', user_id: 'owner', company_id: company.id },
  connection: 'local',
  complete: true,
  as_of: asOf,
  stale_after_seconds: 300,
};

const mails = empty ? [] : [
  { id: 's1', subject: 'Anfrage: Produktdemo', from_addr: 'kunde@beispiel.de', snippet: 'Passt Donnerstag?', date: '2026-10-19T14:30:00Z', from: 'kunde@beispiel.de' },
  { id: 's2', subject: 'RE: Quartalsbericht', from_addr: 'partner@firma.de', snippet: 'Zahlen liegen bei.', date: '2026-10-19T13:15:00Z', from: 'partner@firma.de' },
  { id: 's3', subject: 'Rechnung #2847', from_addr: 'buchhaltung@lieferant.de', snippet: 'Bitte prüfen.', date: '2026-10-19T11:00:00Z', from: 'buchhaltung@lieferant.de' },
  { id: 's4', subject: 'Team-Update KW42', from_addr: 'team@saimor.world', snippet: 'Standup um 09:30', date: '2026-10-19T09:00:00Z', from: 'team@saimor.world' },
];
const events = empty ? [] : [
  { id: 'c1', title: 'Standup', date: todayIso, time: '09:30', duration: 15, start_date: todayIso },
  { id: 'c2', title: 'Kundengespräch: Demo', date: todayIso, time: '14:00', duration: 60, location: 'Call', start_date: todayIso },
];
const feeds = empty ? [] : [
  { id: 'f1', title: 'Release notes: Kalender-Sync', sourceTitle: 'Produkt', source_title: 'Produkt', published: asOf, summary: 'Sync ist draußen.' },
  { id: 'f2', title: 'Design-Kritik: Orbit-Lesbarkeit', sourceTitle: 'Studio', source_title: 'Studio', published: asOf },
  { id: 'f3', title: 'Nightwatch-Ruhe über das Wochenende', sourceTitle: 'Betrieb', source_title: 'Betrieb', published: asOf },
];
const incidents = empty ? [] : [
  { id: 'nw1', title: 'Ungewöhnlicher Login-Versuch', summary: 'Ein Login aus einem neuen Netz.', severity: 'warning', status: 'open', detected_at: '2026-10-19T06:10:00Z', department_id: null },
];
const todaySnapshot = {
  status: 'ok',
  date: todayIso,
  timezone: 'Europe/Berlin',
  generated_at: asOf,
  requested_scope: { tenant_id: 'tenant-saimor-hq', user_id: 'owner', company_id: company.id },
  mail: {
    ...sourceMeta,
    status: empty ? 'empty' : 'ok',
    inbox_loaded: mails.length,
    sample_limit: 5,
    items: mails,
  },
  calendar: {
    ...sourceMeta,
    status: empty ? 'empty' : 'ok',
    date: todayIso,
    count: events.length,
    next_event: events[0] || null,
    events,
  },
  tasks: {
    ...sourceMeta,
    status: empty ? 'empty' : 'ok',
    counts: empty
      ? { open: 0, in_progress: 0, due_today: 0, overdue: 0 }
      : { open: 3, in_progress: 1, due_today: 1, overdue: 0 },
    items: empty ? [] : [
      { id: 't1', title: 'API-Integration fertigstellen', status: 'in_progress', priority: 'high', due_date: todayIso },
      { id: 't2', title: 'Code-Review: Login-Flow', status: 'in_progress', priority: 'medium' },
      { id: 't3', title: 'Bug: Sidebar-Animation', status: 'backlog', priority: 'medium' },
    ],
    due_today: empty ? [] : [{ id: 't1', title: 'API-Integration fertigstellen', status: 'in_progress', priority: 'high', due_date: todayIso }],
    overdue: [],
  },
  nightwatch: {
    ...sourceMeta,
    status: empty ? 'empty' : 'ok',
    open_incidents: incidents.length,
    health_score: empty ? 100 : 92,
    incidents,
  },
};
const billing = empty
  ? { subscriptions: [] }
  : {
      subscriptions: [{
        id: 'sub-demo-1',
        provider: 'paddle',
        status: 'active',
        price: {
          base_price: { amount_minor: 248000, currency: 'EUR' },
          interval: 'month',
          seats: 3,
          included_seats: 3,
          additional_seats: 0,
          additional_seat_price: { amount_minor: 0, currency: 'EUR' },
        },
      }, {
        id: 'sub-demo-2',
        provider: 'paddle',
        status: 'active',
        price: {
          base_price: { amount_minor: 0, currency: 'EUR' },
          interval: 'month',
          seats: 1,
          included_seats: 1,
          additional_seats: 0,
          additional_seat_price: { amount_minor: 0, currency: 'EUR' },
        },
      }, {
        id: 'sub-demo-3',
        provider: 'paddle',
        status: 'active',
        price: {
          base_price: { amount_minor: 0, currency: 'EUR' },
          interval: 'month',
          seats: 1,
          included_seats: 1,
          additional_seats: 0,
          additional_seat_price: { amount_minor: 0, currency: 'EUR' },
        },
      }],
    };

const W = +(process.env.W || 1440);
const H = +(process.env.H || 900);
const DPR = +(process.env.DPR || 2);

async function main() {
  console.log(`Capturing Universe at ${base} → ${name}.png (${W}x${H})${empty ? ' [empty]' : ''}${stayHome ? ' [home]' : ''}`);

  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DPR,
    timezoneId: 'Europe/Berlin',
    locale: 'de-DE',
  });

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
  page.on('pageerror', (e) => console.log('Page error:', e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('Console error:', msg.text());
  });

  await page.route('**/api/core/**', async (route) => {
    const url = route.request().url();
    let body = {};
    const status = 200;

    if (/\/v3\/health/.test(url)) body = { status: 'ok' };
    else if (url.includes('/v3/auth/session')) body = profile;
    else if (/\/v3\/universe(\?|$)/.test(url)) body = { data: { ...uni, companies: real.companies } };
    else if (/\/v3\/companies(\?|$)/.test(url)) body = (real.companies || []).map((c) => ({ id: c.id, name: c.name, is_demo: c.sector === 'demo' }));
    else if (/\/v3\/today(\?|$)/.test(url)) body = todaySnapshot;
    else if (url.includes('/v3/mora/today')) body = { items: empty ? [] : [
      { title: 'Standup 09:30', source: 'Kalender · heute', area: 'Post & Termine' },
      { title: 'Kundengespräch: Demo', source: 'Kalender · 14:00', area: 'Post & Termine' },
      { title: 'Anfrage: Produktdemo', source: 'Post · 4 neu', area: 'Post & Termine' },
    ] };
    else if (/\/v3\/tree(\?|$)/.test(url)) body = { departments: depts };
    else if (/\/v3\/departments(\?|$)/.test(url)) body = depts;
    else if (url.includes('/users/me/memberships')) body = { department_memberships: [] };
    else if (url.includes('/v3/mail/messages')) body = { messages: mails };
    else if (url.includes('/v3/calendar/events')) body = { events };
    else if (url.includes('/v3/integrations/rss/items')) body = { items: feeds };
    else if (url.includes('/v3/signals')) body = { data: mails.map((m) => ({ id: m.id, kind: 'mail', title: m.subject, subtitle: m.from, timestamp: m.date })) };
    else if (url.includes('/v3/mora/presence')) body = { state: process.env.MORA_STATE || 'calm', target: process.env.MORA_TARGET || null };
    else if (url.includes('/v3/department-stats')) {
      body = {
        stats: uni.planets.map((p) => ({
          department_id: p.department_id || p.key,
          node_count: Number(p.counts?.docs ?? 0),
          docs: Number(p.counts?.docs ?? 0),
          spaces: (p.moons || []).length,
          folders: (p.moons || []).length,
        })),
      };
    } else if (url.includes('/v3/nightwatch/incidents')) body = incidents;
    else if (url.includes('/v1/nightwatch')) body = { incidents };
    else if (url.includes('/v3/workspace/billing')) body = billing;
    else if (url.includes('/v3/subscriptions')) body = billing.subscriptions;
    else if (url.includes('/v3/users/me/content')) body = { cloud_storage: { connectors: [] } };
    else body = {};

    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });

  console.log('Navigating to', base + '/home');
  await page.goto(base + '/home', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);

  if (!stayHome) {
    console.log('Clicking UNIVERSE tab...');
    try {
      const universeTab = page.locator('text=UNIVERSE').first();
      if (await universeTab.isVisible()) {
        await universeTab.click();
        console.log('Clicked UNIVERSE tab');
      } else {
        const toggleBtn = page.getByTestId('universe-toggle');
        if (await toggleBtn.isVisible()) {
          await toggleBtn.click();
          console.log('Clicked universe-toggle');
        }
      }
    } catch (e) {
      console.log('Could not click Universe tab:', e.message);
    }
    await page.waitForTimeout(4000);
  } else {
    await page.waitForTimeout(2500);
  }

  await page.addStyleTag({
    content: `
    [data-nextjs-toast], [data-nextjs-dialog], nextjs-portal,
    #__next-build-indicator, .nextjs-toast-errors-parent {
      display: none !important; visibility: hidden !important; opacity: 0 !important;
    }
  `,
  });

  await page.mouse.move(W / 2, H / 2);
  await page.waitForTimeout(400);
  await page.mouse.move(W / 2, 70);
  await page.waitForTimeout(800);

  const bodyText = await page.locator('body').innerText();
  console.log('Page content preview:', bodyText.slice(0, 360).replace(/\n/g, ' '));

  const planets = await page.locator('[data-planet-kind]').evaluateAll((els) =>
    els.map((e) => ({
      label: e.getAttribute('data-mora-label'),
      kind: e.dataset.planetKind,
      caption: e.querySelector('.uv2-planet-caption')?.textContent || '',
    })),
  );
  console.log(`Found ${planets.length} planets:`, planets.map((p) => `${p.label}${p.caption ? ' · ' + p.caption : ''}`).join(', '));

  if (process.env.CLICK_PLANET) {
    const planetName = process.env.CLICK_PLANET;
    console.log(`Clicking planet: ${planetName}`);
    try {
      await page.locator(`[data-planet-kind][data-mora-label="${planetName}"]`).first().click({ force: true });
      await page.waitForTimeout(1800);
    } catch (e) {
      console.log('Could not click planet:', e.message);
    }
  }

  await page.mouse.move(W / 2, 70);
  await page.waitForTimeout(600);

  const outDir = '/opt/cursor/artifacts/screenshots';
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/${name}.png`;
  await Promise.race([
    page.evaluate(() => (document.fonts && document.fonts.ready) || Promise.resolve()),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
  await page.screenshot({ path: outPath, timeout: 60000, animations: 'disabled' });
  console.log(`Screenshot saved to ${outPath}`);
  await browser.close();
  return outPath;
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
