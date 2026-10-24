import { buildLiveDay, taskLineOf } from '@/lib/lea/live';
import { buildFinder } from '@/lib/lea/finder';
import type { WorldTask } from '@/lib/lea/world';

const now = new Date('2026-10-24T17:00:00');
const t = (id: string, status: string, due?: string, folder_id?: string): WorldTask => ({ id, title: id, status, due_date: due ?? null, folder_id: folder_id ?? null });

describe('eine Quelle der Wahrheit für Aufgaben', () => {
  const undated = Array.from({ length: 19 }, (_, i) => t(`a${i}`, 'backlog'));
  it('nichts fällig, aber offen: nie „alles erledigt“', () => {
    const tl = taskLineOf(undated, now);
    expect(tl.line).toBe('Heute nichts fällig · 19 offen');
    const day = buildLiveDay([], undated, {}, now);
    expect(day.taskLine).toBe(tl.line);
    expect(day.openTotal).toBe(19);
    expect(day.sentence).not.toMatch(/alles erledigt/);
    expect(day.sentence).toMatch(/19 Aufgaben offen/);
  });
  it('heute fällig und überfällig getrennt', () => {
    const tl = taskLineOf([t('x', 'backlog', '2026-10-24'), t('y', 'backlog', '2026-10-20'), t('z', 'in_progress'), t('d', 'done', '2026-10-01')], now);
    expect(tl).toMatchObject({ dueToday: 1, overdue: 1, inProgress: 1, openTotal: 3, line: '1 heute fällig · 1 überfällig · 3 offen' });
  });
  it('alles erledigt nur ohne offene Aufgaben', () => {
    expect(taskLineOf([t('d', 'done')], now).line).toBe('Alles erledigt');
  });
  it('Aufgaben mit Ordner sind Sterne ihres Mondes, nicht des Aufgaben-Sammelorts', () => {
    const planets = buildFinder({ departments: [{ id: 'd', name: 'Vertrieb', spaces: [{ id: 's', name: 'V' }] }], folders: [{ id: 'f', name: 'Angebote', space_id: 's' }], nodes: [], tasks: [t('p', 'backlog', undefined, 'f'), t('q', 'backlog')], now });
    expect(planets.find((p) => p.id === 'd')!.moons[0].stars.map((s) => s.id)).toEqual(['p']);
    expect(planets.find((p) => p.kind === 'tasks')!.stars.map((s) => s.id)).toEqual(['q']);
  });
});
