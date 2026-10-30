import fs from 'fs';
import path from 'path';
import { tileSub } from '@/components/os-shell/BridgeConcept';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const css = fs.readFileSync(path.join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** .os-dock sets pointer-events:none for its glass layers – every interactive part must opt back in. */
it.each(['.bridge__pill', '.bridge__app', '.bridge__comps .bridge__comp', '.bridge__mora', '.bridge__ask'])('%s opts back into pointer events', (sel) => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].split(',').map((s) => s.trim()).includes(sel) && /pointer-events/.test(m[2]));
  expect(rules.length).toBeGreaterThan(0);
  expect(rules[rules.length - 1][2]).toMatch(/pointer-events\s*:\s*auto/);
});

const ok = { status: 'ok', complete: true };
const snapshot = {
  date: '2026-10-30', timezone: 'Europe/Berlin',
  mail: { ...ok, items: [{ id: 'm1', subject: 'Gelesen', read: true }, { id: 'm2', subject: 'Lieferung morgen', read: false }] },
  tasks: { ...ok, items: [], due_today: [{ id: 't1', title: 'Teig ansetzen', status: 'backlog' }], overdue: [{ id: 't2', title: 'Kassenbuch', status: 'backlog' }], counts: {} },
  calendar: { ...ok, next_event: { id: 'e1', title: 'Post', date: '2026-10-30', time: '14:00', location: 'Café' }, events: [{ id: 'e1', title: 'Post', date: '2026-10-30', time: '14:00' }, { id: 'e2', title: 'Feier', date: '2026-10-30', time: '18:00' }] },
  nightwatch: { ...ok, as_of: '2026-10-30T12:28:00Z', incidents: [] },
} as unknown as TodaySnapshot;

it('fills every dock tile only from real snapshot content', () => {
  expect(tileSub('post', snapshot)).toBe('Lieferung morgen');
  expect(tileSub('today', snapshot)).toBe('Teig ansetzen');
  expect(tileSub('overdue', snapshot)).toBe('Kassenbuch');
  expect(tileSub('next', snapshot)).toBe('Café');
  expect(tileSub('events', snapshot)).toBe('Danach 18:00 Feier');
  expect(tileSub('nightwatch', snapshot)).toBe('Letzter Check 13:28');
  expect(tileSub('post', null)).toBe('');
});
