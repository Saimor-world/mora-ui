/**
 * Werkstatt v15 – Verhalten aus Sicht der Nutzerin: lesbare Karten ohne Hover, Später-Stapel statt 40 Kärtchen,
 * Überfällig genau einmal, Erledigt genau einmal, Zuweisen per Zettel mit echten Namen (kein weißes Menü),
 * Buch blättert über 40 Seiten, Formatleiste nur an einer Markierung, Wochenblatt speichert einmal je Änderung,
 * Zurück führt immer dorthin, woher man kam.
 */
import React from 'react';
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeptWork, WorkTask } from '@/lib/universe/deptWork';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';

const mutate = jest.fn();
const update = jest.fn().mockResolvedValue(true);
const setDone = jest.fn().mockResolvedValue(true);
const corePost = jest.fn();
let nodes: Record<string, { id: string; title: string; content: string }> = {};
jest.mock('@/lib/api/orgClient', () => ({ fetchNodeDetails: jest.fn((id: string) => Promise.resolve(nodes[id])), createNode: jest.fn() }));
jest.mock('@/lib/queries/useNodes', () => ({ useUpdateNode: () => ({ mutate }) }));
jest.mock('@/lib/queries/useTeamMembers', () => ({ useTeamMembers: () => ({ data: [{ id: 'u1', name: 'Lea' }, { id: 'u2', name: 'Nina' }, { id: 'u3', name: 'Tarek' }] }) }));
jest.mock('@/lib/lea/useDayActions', () => ({ useDayActions: () => ({ setDone, update, addTask: jest.fn().mockResolvedValue(true) }) }));
jest.mock('@/lib/api/http', () => ({ corePost: (...a: unknown[]) => corePost(...a) }));
jest.mock('@/lib/os/useScopedToday', () => ({ invalidateToday: jest.fn() }));

import { Werkstatt } from '@/features/werkstatt/ui/Werkstatt';
import { TaskSheet } from '@/features/werkstatt/ui/TaskSheet';
import { Book } from '@/features/werkstatt/ui/Book';
import { Mappe } from '@/features/werkstatt/ui/Mappe';

const TODAY = '2026-11-10';
const day = (n: number) => { const d = new Date(2026, 10, 10 + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function task(i: number, due: string | null, extra: Partial<WorkTask> = {}): WorkTask {
  const overdue = !!due && due < TODAY;
  return { id: `t${i}`, title: `Aufgabe Nummer ${i} im Laden`, status: 'backlog', done: false, due, overdue, dueToday: due === TODAY, folderId: 'f-plan', assignee: i % 2 ? 'Lea' : null, raw: { id: `t${i}`, title: `Aufgabe ${i}`, status: 'backlog' } as never, ...extra };
}
const forty = Array.from({ length: 40 }, (_, i) => task(i, i < 6 ? day(-1 - i) : i < 22 ? day(Math.min(14, i - 6)) : i < 30 ? day(20 + i) : null));
const planet = { id: 'dept-laden', title: 'Laden', jobRoles: [], glass: 'sage', moons: [{ id: 'f-plan', title: 'Planung', files: [] }, { id: 'f-hb', title: 'Handbuch', files: [] }] } as unknown as DemoPlanet;
const work: DeptWork = {
  moons: new Map([
    ['f-plan', { docs: [{ id: 'n-kw46', name: 'Wochenplan KW 46', meta: '' }], open: forty, done: [], overdue: 6 }],
    ['f-hb', { docs: [{ id: 'n-hb', name: 'Betriebshandbuch', meta: '' }], open: [], done: [], overdue: 0 }],
  ]),
  loose: [], open: 40, overdue: 6,
};
const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

// jsdom misst nicht: Höhe eines Textstücks = Zeilen à 40 Zeichen × 34,5 Einheiten (wie 23px × 1,5).
const lineH = 34.5;
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get(this: HTMLElement) {
    if (!this.classList.contains('wk-piece')) return 0;
    const n = (this.textContent ?? '').length;
    const pad = this.classList.contains('is-open') ? 0 : 13;
    return Math.max(1, Math.ceil(n / 40)) * lineH + pad;
  } });
  (Range.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => ({ left: 100, right: 160, top: 300, bottom: 320, width: 60, height: 20, x: 100, y: 300, toJSON: () => ({}) } as DOMRect);
});
beforeEach(() => {
  jest.clearAllMocks();
  // Bewegung reduziert: Kamerafahrten springen sofort an ihr Ziel (gleiche Logik, keine Wartezeit im Test).
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() }));
  nodes = {};
});

describe('Brett mit 40 Aufgaben', () => {
  it('zeigt höchstens 5 Karten plus Stapel „später“ – jede Karte trägt ihren Titel lesbar, ohne Tooltip', () => {
    const { container } = wrap(<Werkstatt planet={planet} work={work} planets={[]} companyId="c" today={TODAY} fromSpace={false} onExit={jest.fn()} />);
    const board = screen.getByTestId('wk-board');
    const cards = board.querySelectorAll('[data-testid^="wk-card-"]');
    expect(cards.length).toBeLessThanOrEqual(5);
    cards.forEach((c) => expect(c.querySelector('.wk-card__t')?.textContent?.trim().length).toBeGreaterThan(5));
    expect(container.querySelectorAll('[title]')).toHaveLength(0);
    expect(screen.getByTestId('wk-later').getAttribute('aria-label')).toMatch(/Später, 18 Aufgaben/);
    expect(container.querySelectorAll('select, [role="listbox"], [role="menu"]')).toHaveLength(0);
  });
  it('Überfällig steht genau einmal je Karte (ein Punkt) und nirgends sonst', () => {
    wrap(<Werkstatt planet={planet} work={work} planets={[]} companyId="c" today={TODAY} fromSpace={false} onExit={jest.fn()} />);
    const board = screen.getByTestId('wk-board');
    const cards = Array.from(board.querySelectorAll<HTMLElement>('[data-testid^="wk-card-"]'));
    for (const c of cards) expect(c.querySelectorAll('.wk-dot').length).toBe(c.dataset.overdue ? 1 : 0);
    expect(document.querySelectorAll('.wk-tag .wk-dot')).toHaveLength(0);
  });
  it('blättert vorne durch die nächsten zwei Wochen und öffnet den Stapel', () => {
    wrap(<Werkstatt planet={planet} work={work} planets={[]} companyId="c" today={TODAY} fromSpace={false} onExit={jest.fn()} />);
    fireEvent.click(screen.getByTestId('wk-later'));
    expect(screen.getByTestId('wk-board').dataset.later).toBe('1');
    expect(screen.getByTestId('wk-now')).toBeTruthy();
  });
});

describe('Zurück führt dorthin, woher man kam', () => {
  it('Brett → Aufgabe → Esc → Raum → Pult → Esc → Raum → Esc → hinaus', async () => {
    const onExit = jest.fn();
    nodes['n-hb'] = { id: 'n-hb', title: 'Betriebshandbuch', content: '# Handbuch\n\nText.' };
    wrap(<Werkstatt planet={planet} work={work} planets={[]} companyId="c" today={TODAY} fromSpace={false} onExit={onExit} />);
    const root = screen.getByTestId('werkstatt');
    fireEvent.click(screen.getByTestId('wk-board').querySelector('[data-testid^="wk-card-"]') as HTMLElement);
    expect(root.dataset.place).toBe('task');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(root.dataset.place).toBe('room');
    fireEvent.click(screen.getByTestId('wk-hit-lectern'));
    expect(root.dataset.place).toBe('doc');
    await flush();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(root.dataset.place).toBe('room');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
  it('Deep-Link auf eine Aufgabe: Zurück heißt „Werkstatt“', () => {
    wrap(<Werkstatt planet={planet} work={work} planets={[]} companyId="c" today={TODAY} initial={{ kind: 'task', id: 't3' }} fromSpace={false} onExit={jest.fn()} />);
    expect(screen.getByTestId('werkstatt').dataset.place).toBe('task');
    expect(document.querySelector('.wk-dock')?.textContent).toMatch(/Werkstatt/);
  });
});

describe('Aufgabenblatt', () => {
  const t = task(1, day(-2), { assignee: null });
  it('Erledigt gibt es genau einmal, Überfällig genau einmal', () => {
    const { container } = wrap(<TaskSheet task={t} crumb="Laden · Planung" companyId="c" docs={[]} onOpenDoc={jest.fn()} back={null} />);
    expect(screen.getAllByRole('button', { name: /erledigt/i })).toHaveLength(1);
    expect(container.querySelectorAll('.wk-dot')).toHaveLength(1);
  });
  it('Zuweisen: Zettel mit Namen aus dem Team, kein weißes Menü; der Name steht danach in Tinte', async () => {
    corePost.mockResolvedValue({ data: { id: 't1', assignee: 'Nina' } });
    const { container } = wrap(<TaskSheet task={t} crumb="Laden" companyId="c" docs={[]} onOpenDoc={jest.fn()} back={null} />);
    fireEvent.click(screen.getByTestId('wk-task-who'));
    const slip = container.querySelector('[data-ws-pop]') as HTMLElement;
    expect(within(slip).getAllByRole('button').map((b) => b.textContent)).toEqual(expect.arrayContaining(['Lea', 'Nina', 'Tarek']));
    expect(container.querySelectorAll('select, [role="listbox"], [role="menu"]')).toHaveLength(0);
    fireEvent.click(within(slip).getByRole('button', { name: 'Nina' }));
    await flush();
    expect(corePost).toHaveBeenCalledWith('/v3/tasks/t1', { assignee: 'Nina' });
    expect(screen.getByTestId('wk-task-who').textContent).toBe('Nina');
    expect(screen.getByTestId('wk-task-who').className).toMatch(/wk-hand/);
    expect(container.textContent).not.toMatch(/nur hier vermerkt/);
  });
  it('kennt CORE das Feld nicht, ist das sichtbar als Stub markiert', async () => {
    corePost.mockResolvedValue({ data: { id: 't1' } });
    const { container } = wrap(<TaskSheet task={t} crumb="Laden" companyId="c" docs={[]} onOpenDoc={jest.fn()} back={null} />);
    fireEvent.click(screen.getByTestId('wk-task-who'));
    fireEvent.click(within(container.querySelector('[data-ws-pop]') as HTMLElement).getByRole('button', { name: 'Lea' }));
    await flush();
    expect(container.textContent).toMatch(/nur hier vermerkt/);
  });
});

describe('Buch am Pult', () => {
  const para = 'Wer zuerst kommt, schaltet die Maschine an und lässt sie zwanzig Minuten warm werden, bevor die Tür aufgeht und Gäste kommen.';
  const long = ['# Betriebshandbuch', ...Array.from({ length: 96 }, (_, i) => (i % 8 === 0 ? `## Kapitel ${i / 8 + 1}` : `${para} ${para}`))].join('\n\n');
  const stage = { x: 0, y: 0, k: 0.75, vw: 1440, vh: 900 } as never;
  it('ein langes Dokument wird zum Buch mit rund 40 Seiten, das bis zum Ende blättert', async () => {
    nodes['n-hb'] = { id: 'n-hb', title: 'Betriebshandbuch', content: long };
    wrap(<Book id="n-hb" fallbackTitle="Betriebshandbuch" folderId="f-hb" stage={stage} back={null} />);
    const book = screen.getByTestId('wk-book');
    await waitFor(() => expect(Number(book.dataset.pages)).toBeGreaterThan(1));
    const pages = Number(book.dataset.pages);
    expect(pages).toBeGreaterThanOrEqual(38);
    expect(pages).toBeLessThanOrEqual(46);
    const spreads = Math.ceil(pages / 2);
    for (let i = 1; i < spreads; i++) fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(Number(book.dataset.spread)).toBe(spreads - 1);
    expect(screen.queryByTestId('wk-book-next')).toBeNull();
  });
  it('Formatleiste erscheint nur an einer Markierung, nicht beim bloßen Bearbeiten', async () => {
    nodes['n-s'] = { id: 'n-s', title: 'Kurz', content: '# Kurz\n\nEin Absatz zum Markieren.' };
    wrap(<Book id="n-s" fallbackTitle="Kurz" folderId="f" stage={stage} back={null} />);
    await waitFor(() => expect(document.querySelector('.wk-piece--p')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    expect(screen.queryByTestId('wk-fmt')).toBeNull();
    const piece = document.querySelector('.wk-piece--p') as HTMLElement;
    const r = document.createRange(); r.setStart(piece.firstChild as Text, 4); r.setEnd(piece.firstChild as Text, 10);
    act(() => { const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange')); });
    expect(screen.getByTestId('wk-fmt')).toBeTruthy();
    act(() => { window.getSelection()!.collapseToStart(); document.dispatchEvent(new Event('selectionchange')); });
    expect(screen.queryByTestId('wk-fmt')).toBeNull();
  });
});

describe('Mappe – Wochenblatt von Hand', () => {
  const md = '# Wochenplan KW 46\n\n| | Mo | Di | Mi | Do | Fr | Sa | So |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| Theke | Lea | Nina | | | | alle | zu |\n\n## Offen\n\n- Schichten\n';
  it('Eintragen in eine Zelle speichert das Blatt einmal (nicht je Tastendruck) als Tabelle im Knoten', async () => {
    nodes['n-kw46'] = { id: 'n-kw46', title: 'Wochenplan KW 46', content: md };
    wrap(<Mappe weeks={[{ id: 'n-kw46', name: 'Wochenplan KW 46', monday: '2026-11-09' }]} folderId="f-plan" companyId="c" today={TODAY} back={null} />);
    const cell = await screen.findByTestId('wk-cell-0-2');
    expect(cell.getAttribute('aria-label')).toBe('Theke Mi');
    jest.useFakeTimers();
    for (const v of ['S', 'Sa', 'Sam', 'Samira']) fireEvent.change(cell, { target: { value: v } });
    expect(mutate).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(900); });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ id: 'n-kw46', payload: { content: expect.stringContaining('| Theke | Lea | Nina | Samira |') } });
    jest.useRealTimers();
  });
});
