/**
 * Scheduler-Einstiegspunkt: MÔRA-Tagesplan für die FIKTIVE Demo-Firma Café Morgenrot.
 *
 *   npx tsx scripts/demo-morgenrot/morning-plan.ts [--date YYYY-MM-DD] [--force] [--out DIR]
 *
 * Cron (stündlich, Job prüft selbst 07:00 Europe/Berlin):  0 * * * *  … morning-plan.ts
 * Schreibt pro Person <id>.json und <id>.html nach --out (Default: ./demo-out/morgenrot).
 * Keine Netzwerk- oder DB-Zugriffe, keine Secrets.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MORGENROT_SEED } from '../../lib/demo/morgenrot/seed';
import { buildMorningPlans, isMorningPlanDue } from '../../lib/demo/morgenrot/morningPlan';
import { renderMorningPlanHtml } from '../../lib/demo/morgenrot/renderHtml';

const args = process.argv.slice(2);
const arg = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const now = new Date();
const date = arg('--date') ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
const out = arg('--out') ?? 'demo-out/morgenrot';

if (!args.includes('--force') && !isMorningPlanDue(now)) {
  console.log('[morgenrot] nicht 07:00 Europe/Berlin, nichts zu tun');
  process.exit(0);
}
mkdirSync(out, { recursive: true });
for (const plan of buildMorningPlans(MORGENROT_SEED, date)) {
  writeFileSync(join(out, `${plan.personId}.json`), JSON.stringify(plan, null, 2));
  writeFileSync(join(out, `${plan.personId}.html`), renderMorningPlanHtml(plan));
  console.log(`[morgenrot] ${date} ${plan.personId}: ${plan.greeting}`);
}
