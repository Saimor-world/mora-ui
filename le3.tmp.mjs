import { chromium } from '@playwright/test';
import fs from 'fs';
const OUT = '/workspace/os-recovery-v1/shots-v1.4/legacy/';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.request.post('http://localhost:3001/api/auth/core-login', { data: { email: 'demo@saimor.io', password: 'demo123' } });
const log = {};
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 2500);
async function step(name, fn) { try { await p.goto('http://localhost:3001/home'); await p.waitForTimeout(5000); await fn(); await p.waitForTimeout(4000); await p.screenshot({ path: OUT + name + '.png' }); log[name] = await txt(); } catch (e) { log[name] = 'ERR ' + e.message.slice(0, 150); } }
const dock = (l) => p.locator(`button[aria-label="${l}"]`).last().click();
await step('universe-planet', async () => { await dock('Universe'); await p.waitForTimeout(4000); await p.getByText('Management', { exact: true }).last().click(); });
await step('mora-signale', async () => { await dock('MÔRA'); await p.waitForTimeout(3000); await p.getByRole('button', { name: 'Signale' }).first().click(); });
await step('mora-erinnerungen', async () => { await dock('MÔRA'); await p.waitForTimeout(3000); await p.getByRole('button', { name: 'Erinnerungen' }).first().click(); });
await step('mora-answer', async () => { await dock('MÔRA'); await p.waitForTimeout(3000); await p.getByText('Was gibt es Neues?').first().click(); await p.waitForTimeout(8000); });
await step('home-mail', async () => { await p.getByText('Kommunikation', { exact: false }).first().click(); });
await step('home-kalender', async () => { await p.getByText('Termine, Tagesstruktur', { exact: false }).first().click(); });
await step('home-dateien', async () => { await p.getByText('Dokumente und Arbeitsmaterial', { exact: false }).first().click(); });
await step('home-nightwatch', async () => { await p.getByText('Alles ruhig').first().click(); });
fs.writeFileSync('/tmp/legacy-log2.json', JSON.stringify(log, null, 1)); await b.close();
