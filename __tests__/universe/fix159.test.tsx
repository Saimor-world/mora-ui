import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toneSlot, toneSlots, matteTone } from '@/lib/universe/matteTone';
import { buildLiveDay, formatTaskLine } from '@/lib/lea/live';
import { buildFinder, TASKS_PLANET } from '@/lib/lea/finder';
import { localISO } from '@/lib/lea/world';

// Beispiel-Daten, keine echten Kundinnen.
const now = new Date();
const day = (o: number) => { const d = new Date(now); d.setDate(d.getDate() + o); return localISO(d); };
const tasks = [
  { id: 't1', title: 'Gel bestellen (Beispiel)', status: 'open', due_date: day(-2) },
  { id: 't2', title: 'Rechnung schicken (Beispiel)', status: 'open', due_date: day(0) },
  { id: 't3', title: 'Warteliste anrufen (Beispiel)', status: 'open', due_date: day(4) },
];
const departments = [
  { id: 'd1', name: 'Kundinnen', spaces: [{ id: 's1', name: 'Stamm' }] },
  { id: 'd2', name: 'Material', spaces: [{ id: 's2', name: 'Lager' }] },
];
const folders = [{ id: 'f1', name: 'Karteikarten', space_id: 's1' }, { id: 'f2', name: 'Gel & Lacke', space_id: 's2' }];

describe('Planetenfarbe fest aus dem Namen', () => {
  it('färbt bestehende Abteilungen nicht um, wenn eine neue dazukommt', () => {
    const before = toneSlots(['Kundinnen', 'Material', 'Rezeption']);
    const after = toneSlots(['Kundinnen', 'Material', 'Rezeption', 'Ausbildung']);
    expect(after.slice(0, 2)).toEqual(before.slice(0, 2));
    expect(before[0]).toBe(toneSlot('Kundinnen'));
  });

  it('entzerrt nur direkte Nachbarn mit gleichem Ton (auch Letzter gegen Ersten)', () => {
    const slots = toneSlots(['Termine', 'Kalender', 'Post', 'Kasse']); // drei gleiche Familien hintereinander
    for (let i = 1; i < slots.length; i++) expect(slots[i]).not.toBe(slots[i - 1]);
    expect(slots[slots.length - 1]).not.toBe(slots[0]);
    expect(slots[0]).toBe(toneSlot('Termine'));
  });

  it('ohne Platzangabe ist matteTone der feste Ton des Namens', () => {
    expect(matteTone('Kundinnen').vars['--p-base']).toBe(matteTone('Kundinnen', {}, toneSlot('Kundinnen')).vars['--p-base']);
  });
});

describe('MÔRAs Satz', () => {
  it('trennt „heute fällig“ und „überfällig“ wie die Aufgabenzeile', () => {
    const live = buildLiveDay([], tasks, {}, now);
    expect(live.sentence).toContain('Heute fällig: Rechnung schicken (Beispiel).');
    expect(live.sentence).toContain('Überfällig: Gel bestellen (Beispiel).');
    expect(live.taskLine).toBe(formatTaskLine({ openTotal: 3, dueToday: 1, overdue: 1 }));
  });

  it('nennt bei einem kommenden Termin die Zahlen getrennt', () => {
    const live = buildLiveDay([{ id: 'e1', title: 'Maniküre – Mara Beispiel', date: day(0), time: '23:59' }], tasks, {}, now);
    expect(live.sentence).toMatch(/1 Aufgabe heute fällig, 1 überfällig\./);
  });
});

// LiveWorld: der Horizont-Knopf „Aufgaben“ und jeder Weg zum alten Aufgaben-Planeten öffnen das Blatt.
const finder = buildFinder({ departments, folders, nodes: [], tasks, now });
jest.mock('@/lib/lea/useWorld', () => ({
  useWorld: () => ({
    enabled: true, loading: false, failed: false, companyId: 'co-beispiel',
    planets: finder.filter((p) => p.kind === 'department').map((p) => ({ id: p.id, name: p.name, tone: p.tone, weight: 1, meta: '1 Ordner', moons: [] })),
    finder, tasksPlanetId: TASKS_PLANET, day: buildLiveDay([], tasks, {}, now), events: [], tasks,
  }),
}));
jest.mock('@/lib/lea/useHorizonSources', () => ({ useHorizonSources: () => ({ mail: null, feed: null, sources: [] }) }));
jest.mock('@/lib/lea/useFinderActions', () => ({ useFinderActions: () => ({ createFolder: jest.fn(), createNote: jest.fn(), upload: jest.fn(), refresh: jest.fn() }) }));
jest.mock('@/lib/lea/useDayActions', () => ({ useDayActions: () => ({ setDone: jest.fn(), addForTomorrow: jest.fn(), addTask: jest.fn(), assignFolder: jest.fn() }) }));
jest.mock('@/lib/lea/universeFocus', () => {
  const { create } = jest.requireActual('zustand');
  const store = create((set: (s: object) => void, get: () => { target: unknown }) => ({ target: null, show: (t: unknown) => set({ target: t }), take: () => { const t = get().target; if (t) set({ target: null }); return t; } }));
  return { useUniverseFocus: store };
});

import { LiveWorld } from '@/features/universe/ui/LiveWorld';
import { useUniverseFocus } from '@/lib/lea/universeFocus';

function renderWorld() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><LiveWorld onAskMora={jest.fn()} navigate={jest.fn()} /></QueryClientProvider>);
}

describe('LiveWorld – Aufgaben', () => {
  it('öffnet „Aufgaben zuordnen“ über den Horizont-Knopf; das Datum steht als „TT.MM.“', () => {
    renderWorld();
    fireEvent.click(screen.getByTestId('horizon-tasks'));
    const sheet = screen.getByTestId('taskhome-sheet');
    expect(sheet).toHaveTextContent('Aufgaben zuordnen');
    const [, m, d] = day(-2).split('-');
    expect(within(sheet).getByText(new RegExp(`${d}\\.${m}\\.`))).toBeInTheDocument();
    expect(sheet.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('öffnet das Blatt auch, wenn ein anderer Ort zum alten Aufgaben-Planeten springt', () => {
    renderWorld();
    expect(screen.queryByTestId('taskhome-sheet')).toBeNull();
    act(() => { (useUniverseFocus as unknown as { getState: () => { show: (t: unknown) => void } }).getState().show({ planetId: TASKS_PLANET }); });
    expect(screen.getByTestId('taskhome-sheet')).toBeInTheDocument();
  });
});

describe('shortLine', () => {
  const { shortLine } = jest.requireActual('@/features/universe/ui/LiveWorld') as { shortLine: (s: string) => string };
  it('nimmt den ersten Satz, ohne Lookbehind-Regex', () => {
    expect(shortLine('Um 11:00 kommt Mara Beispiel. Überfällig: Gel bestellen.')).toBe('Um 11:00 kommt Mara Beispiel.');
    expect(shortLine('Heute ist alles erledigt')).toBe('Heute ist alles erledigt');
    expect(shortLine('Der Termin mit Sophie Beispielhaft-Langname um 09:30 ist noch nicht abgeschlossen.').length).toBeLessThanOrEqual(56);
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../features/universe/ui/LiveWorld.tsx'), 'utf8');
    expect(src).not.toContain('(?<=');
  });
});
