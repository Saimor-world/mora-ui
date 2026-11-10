/**
 * Das Wochenblatt der Planung: ein Raster (Zeilen × sieben Tage), gespeichert als Markdown-Tabelle in einer
 * normalen Notiz im Ordner „Planung“ (dieselbe Node-API wie Dokumente). So bleibt es auch außerhalb lesbar.
 */
export const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export interface WeekRow { label: string; cells: string[] }
export interface WeekSheet { title: string; rows: WeekRow[]; open: string[] }

const cellEsc = (s: string) => s.replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim();
const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

export function parseWeek(md: string): WeekSheet {
  const lines = (md || '').replace(/\r\n?/g, '\n').split('\n');
  let title = '';
  const rows: WeekRow[] = [];
  const open: string[] = [];
  let inOpen = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const h = t.match(/^#{1,3}\s+(.*)$/);
    if (h) { if (!title) title = h[1].trim(); inOpen = /^offen$/i.test(h[1].trim()); continue; }
    if (t.startsWith('|')) {
      const cells = splitRow(t);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue;
      if (cells.slice(1).join('|') === DAYS.join('|')) continue;
      const [label, ...rest] = cells;
      rows.push({ label, cells: DAYS.map((_, i) => rest[i] ?? '') });
      continue;
    }
    const li = t.match(/^[-*]\s+(?:\[[ xX]\]\s+)?(.*)$/);
    if (li && inOpen) open.push(li[1].trim());
  }
  return { title, rows, open };
}

export function serializeWeek(w: WeekSheet): string {
  const head = `| | ${DAYS.join(' | ')} |`;
  const sep = `| --- | ${DAYS.map(() => '---').join(' | ')} |`;
  const body = w.rows.map((r) => `| ${cellEsc(r.label)} | ${DAYS.map((_, i) => cellEsc(r.cells[i] ?? '')).join(' | ')} |`);
  const open = w.open.length ? `\n\n## Offen\n\n${w.open.map((o) => `- ${o}`).join('\n')}` : '';
  return `# ${w.title}\n\n${[head, sep, ...body].join('\n')}${open}\n`;
}

export function setCell(w: WeekSheet, row: number, day: number, value: string): WeekSheet {
  return { ...w, rows: w.rows.map((r, i) => (i === row ? { ...r, cells: r.cells.map((c, d) => (d === day ? value : c)) } : r)) };
}
export function addRow(w: WeekSheet, label: string): WeekSheet {
  return { ...w, rows: [...w.rows, { label, cells: DAYS.map(() => '') }] };
}

/** Montag der Woche (lokal, ISO-Datum). */
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - wd);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
/** Kalenderwoche nach ISO 8601. */
export function isoWeek(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}
/** „9.–15. November“ */
export function weekRange(monday: string): string {
  const [y, m, d] = monday.split('-').map(Number);
  const a = new Date(y, m - 1, d), b = new Date(y, m - 1, d + 6);
  const mon = (x: Date) => x.toLocaleDateString('de-DE', { month: 'long' });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}.–${b.getDate()}. ${mon(b)}` : `${a.getDate()}. ${mon(a)} – ${b.getDate()}. ${mon(b)}`;
}
