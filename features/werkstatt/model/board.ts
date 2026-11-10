import type { WorkTask } from '@/lib/universe/deptWork';

/**
 * Das Aufgabenbrett: Vorne hängt, was in den nächsten zwei Wochen dran ist (Überfälliges zuerst), Blatt für Blatt
 * zu je `perPage` Karten. Alles ohne Datum oder später liegt als Stapel „Später“ daneben – nie 40 winzige Karten.
 */
export interface Board { pages: WorkTask[][]; later: WorkTask[]; overdue: number; open: number }

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export function arrangeBoard(tasks: WorkTask[], today: string, perPage = 6, horizonDays = 14): Board {
  const open = tasks.filter((t) => !t.done);
  const until = addDays(today, horizonDays);
  const byDue = (a: WorkTask, b: WorkTask) => (a.due ?? '9999').localeCompare(b.due ?? '9999');
  const front = open.filter((t) => t.overdue || (t.due !== null && t.due <= until)).sort((a, b) => Number(b.overdue) - Number(a.overdue) || byDue(a, b));
  const later = open.filter((t) => !front.includes(t)).sort(byDue);
  const pages: WorkTask[][] = [];
  for (let i = 0; i < front.length; i += perPage) pages.push(front.slice(i, i + perPage));
  return { pages: pages.length ? pages : [[]], later, overdue: open.filter((t) => t.overdue).length, open: open.length };
}
