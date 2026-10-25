/** Eine Zahl, überall dieselbe: Planet-Zeile, Horizont, MÔRA-Satz, Heute (mit und ohne Sitzung) und Glocke. */
jest.mock('@/lib/lea/useWorld', () => ({ useWorld: () => ({ day: {} }) }));
import { buildLiveDay, taskLineOf, formatTaskLine } from '@/lib/lea/live';
import { dayNotices } from '@/components/os-shell/NotificationTray';
import type { WorldTask } from '@/lib/lea/world';

const now = new Date('2026-10-24T17:00:00');
const t = (id: string, status: string, due?: string, folder_id?: string): WorldTask => ({ id, title: id, status, due_date: due ?? null, folder_id: folder_id ?? null });

const cases: Record<string, WorldTask[]> = {
  leer: [],
  'nur erledigt': [t('d', 'done', '2026-10-01')],
  'HQ: 19 ohne Datum': Array.from({ length: 19 }, (_, i) => t(`a${i}`, 'backlog')),
  gemischt: [t('h', 'backlog', '2026-10-24'), t('o1', 'backlog', '2026-10-20'), t('o2', 'in_progress', '2026-10-01', 'f1'), t('m', 'backlog', '2026-10-25'), t('x', 'done', '2026-10-24'), t('u', 'backlog')],
};

describe.each(Object.entries(cases))('Zählkonsistenz: %s', (_name, tasks) => {
  const tl = taskLineOf(tasks, now);
  const day = buildLiveDay([], tasks, {}, now);
  it('Planet/Horizont/MÔRA-Kontext = taskLineOf', () => {
    expect(day.taskLine).toBe(tl.line);
    expect(day.openTotal).toBe(tl.openTotal);
  });
  it('Heute ohne Sitzung (Snapshot-Zahlen) formuliert identisch', () => {
    expect(formatTaskLine({ openTotal: tl.openTotal, dueToday: tl.dueToday, overdue: tl.overdue })).toBe(tl.line);
  });
  it('Glocke: dringende Aufgaben = überfällig', () => {
    expect(dayNotices(day).filter((n) => n.id.startsWith('od-') && n.urgent).length).toBe(tl.overdue);
  });
  it('MÔRA-Satz widerspricht nie', () => {
    if (tl.openTotal) expect(day.sentence).not.toMatch(/alles erledigt/);
    if (tl.due) expect(day.open.length).toBe(tl.due);
  });
});
