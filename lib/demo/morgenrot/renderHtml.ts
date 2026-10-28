import { FICTIONAL_NOTICE } from './seed';
import type { MorningPlan } from './morningPlan';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Statische Vorschau des Tagesplans (wie MÔRA ihn zustellt). Kein App-Routing nötig. */
export function renderMorningPlanHtml(plan: MorningPlan): string {
  const tasks = plan.tasks.map((t) => `<li><span class="t">${t.due ?? ''}</span>${esc(t.title)}</li>`).join('');
  const approvals = plan.approvals.map((t) => `<li class="ap"><span class="dot"></span>${esc(t.title)}</li>`).join('');
  const team = (plan.team ?? []).map((m) => `<li><b>${esc(m.name)}</b><span>${esc(m.role)} · ${esc(m.shift)}</span></li>`).join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tagesplan ${esc(plan.name)}</title><style>
body{margin:0;font:15px/1.5 -apple-system,Inter,system-ui,sans-serif;background:#12142b;color:#ece8f6}
.w{max-width:620px;margin:0 auto;padding:28px 20px}
.banner{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#f5c27a;border:1px solid #f5c27a55;border-radius:8px;padding:6px 10px;margin-bottom:22px}
.k{color:#8fd9c8;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
h1{font-size:26px;margin:4px 0 6px}.g{color:#c9c3dc;margin:0 0 22px}
.c{background:#1c1f3d;border:1px solid #ffffff14;border-radius:16px;padding:16px 18px;margin-bottom:14px}
h2{font-size:13px;color:#a9a3c4;margin:0 0 10px;font-weight:600}
ul{list-style:none;margin:0;padding:0}li{padding:8px 0;border-top:1px solid #ffffff10;display:flex;gap:12px}li:first-child{border:0}
.t{color:#8fd9c8;min-width:44px;font-variant-numeric:tabular-nums}.ap .dot{width:8px;height:8px;border-radius:50%;background:#f5c27a;margin-top:8px}
li span:last-child{color:#a9a3c4}li b{min-width:150px;font-weight:600}
.s{font-size:22px;font-weight:600}
</style></head><body><div class="w">
<div class="banner">${esc(FICTIONAL_NOTICE)}</div>
<div class="k">MÔRA · Tagesplan ${esc(plan.date)} · ${esc(plan.jobRole)}</div>
<h1>${esc(plan.name)}</h1><p class="g">${esc(plan.greeting)}</p>
${plan.shift ? `<div class="c"><h2>Deine Schicht</h2><div class="s">${plan.shift.start} – ${plan.shift.end}</div></div>` : ''}
${approvals ? `<div class="c"><h2>Wartet auf dein Ja</h2><ul>${approvals}</ul></div>` : ''}
${team ? `<div class="c"><h2>Team heute</h2><ul>${team}</ul></div>` : ''}
${tasks ? `<div class="c"><h2>Deine Aufgaben</h2><ul>${tasks}</ul></div>` : ''}
</div></body></html>`;
}
