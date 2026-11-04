import type { TodaySnapshot } from '@/lib/api/todayClient';

export type MyceliumThread = { a: string; b: string; weight: number };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9äöüß ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Myzel zwischen Abteilungen aus dem Tagesstand: zwei Abteilungen sind verbunden,
 * wenn ein Eintrag der einen die andere beim Namen nennt oder beide am selben Thema arbeiten
 * (gleiches tragendes Wort, z. B. „Herbstkarte“ in Küche und Marketing).
 * Nur echte Einträge, nichts aufgefüllt.
 */
export function homeMycelium(planets: { id: string; title: string }[], snapshot: TodaySnapshot | null | undefined, max = 6): MyceliumThread[] {
  if (!snapshot || planets.length < 2) return [];
  const ids = new Set(planets.map((p) => p.id));
  const names = planets.map((p) => ({ id: p.id, name: norm(p.title).replace(/\bfiktiv\b/g, '').trim() })).filter((p) => p.name.length >= 3);
  type Item = { dept?: string | null; title?: string };
  const items: Item[] = [
    ...[...(snapshot.tasks?.overdue ?? []), ...(snapshot.tasks?.due_today ?? []), ...(snapshot.tasks?.items ?? [])].filter((t) => t.status !== 'done').map((t) => ({ dept: t.department_id, title: t.title })),
    ...(snapshot.calendar?.events ?? []).map((e) => ({ dept: (e as { department_id?: string | null }).department_id, title: e.title })),
    ...(snapshot.mail?.items ?? []).map((m) => ({ dept: (m as { department_id?: string | null }).department_id, title: m.subject })),
  ];
  const w = new Map<string, number>();
  const link = (x: string, y: string) => { if (x === y || !ids.has(x) || !ids.has(y)) return; const k = [x, y].sort().join('|'); w.set(k, (w.get(k) ?? 0) + 1); };
  const byTitle = new Map<string, Set<string>>();
  const STOP = new Set(['anfrage', 'termin', 'heute', 'morgen', 'bestaetigt', 'bestatigt', 'rechnung', 'oktober', 'november', 'personen']);
  for (const it of items) {
    if (!it.dept || !it.title) continue;
    const t = norm(it.title);
    for (const n of names) if (n.id !== it.dept && new RegExp(`\\b${n.name}\\b`).test(t)) link(it.dept, n.id);
    for (const word of new Set(t.split(' ').filter((x) => x.length >= 6 && !STOP.has(x)).map((x) => x.slice(0, 8)))) {
      const s = byTitle.get(word) ?? new Set<string>(); s.add(it.dept); byTitle.set(word, s);
    }
  }
  for (const s of byTitle.values()) { const l = [...s]; for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) link(l[i], l[j]); }
  return [...w.entries()].sort((p, q) => q[1] - p[1]).slice(0, max).map(([k, n]) => { const [a, b] = k.split('|'); return { a, b, weight: Math.min(1, n / 3) }; });
}
