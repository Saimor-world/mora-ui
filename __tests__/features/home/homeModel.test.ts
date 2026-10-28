import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_STRUCTURE, MORGENROT_EVENTS } from '@/lib/demo/morgenrot/structure';
import { buildHomeModel, visiblePlanets, landingFor } from '@/features/home/data/homeModel';
import { act, initialDay } from '@/features/home/data/demoDay';
import { askMora } from '@/features/home/data/moraDemo';
import { DEFAULT_FEATURE_ID, navigationModel } from '@/features/registry';

const DAY = '2026-10-28';

describe('Home model (Café Morgenrot, fiktiv)', () => {
  it('owner sees exactly three things that need them, plus team and yesterday', () => {
    const m = buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'marius');
    expect(m.scope).toBe('owner');
    expect(m.greeting).toBe('Guten Morgen, Marius.');
    expect(m.needsYou.map((i) => i.id)).toEqual(['swap', 'reviews', 'order']);
    expect(m.needsYou[0].title).toMatch(/Jonas und Lena möchten am Donnerstag tauschen/);
    expect(m.team.find((t) => t.personId === 'tarek')?.shift).toBe('06:30–14:30');
    expect(m.yesterday?.revenue).toBe(1842);
  });

  it('staff only see their own day, no money, no team', () => {
    const m = buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'lena');
    expect(m.scope).toBe('staff');
    expect(m.yesterday).toBeNull();
    expect(m.team).toEqual([]);
    expect(m.shift).toBe('07:30–16:00');
    expect(m.needsYou.every((i) => i.owner === 'lena')).toBe(true);
  });

  it('Tarek has a normal working day in the kitchen', () => {
    const m = buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'tarek');
    expect(m.shift).toBe('06:30–14:30');
    expect(m.needsYou.map((i) => i.title)).toEqual(['Teig für Zimtschnecken ansetzen', 'Hafermilch-Bestand zählen']);
  });
});

describe('Demo day actions really change the views', () => {
  it('approving swap, reviews and order empties the owner list and informs staff', () => {
    let d = initialDay();
    d = act(act(act(d, { type: 'swap', answer: 'approved' }), { type: 'reviewsAll' }), { type: 'order' });
    const m = buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'marius', d);
    expect(m.needsYou).toEqual([]);
    expect(m.subline).toMatch(/^Nichts braucht dich/);
    expect(m.doneToday).toHaveLength(3);
    expect(buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'jonas', d).doneToday.find((i) => i.id === 'swap')?.detail).toBe('von Marius freigegeben');
  });
  it('Tarek counting oat milk feeds the owner order, Jonas daily close reaches the owner', () => {
    let d = act(initialDay(), { type: 'oat', liters: 9 });
    expect(buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'marius', d).needsYou.find((i) => i.id === 'order')?.detail).toMatch(/Tarek hat 9 l Hafermilch gezählt/);
    d = act(d, { type: 'close', cash: 1906, by: 'jonas', at: '18:04' });
    expect(buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'marius', d).close).toEqual({ cash: 1906, by: 'jonas', at: '18:04' });
  });
  it('a message through MÔRA lands on the recipient Home', () => {
    const r = askMora('Sag Lena, sie soll heute die Terrasse zumachen', 'marius', MORGENROT_SEED, MORGENROT_EVENTS, DAY, initialDay());
    expect(r.confirm).toBe('Senden');
    const d = act(initialDay(), r.action!);
    expect(buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'lena', d).needsYou[0].title).toBe('Marius: „Heute die Terrasse zumachen.“');
  });
  it('MÔRA answers from demo data and respects roles', () => {
    const d = initialDay();
    expect(askMora('Wer arbeitet heute?', 'marius', MORGENROT_SEED, MORGENROT_EVENTS, DAY, d).text).toMatch(/Tarek 06:30–14:30/);
    expect(askMora('Wie war der Umsatz gestern?', 'lena', MORGENROT_SEED, MORGENROT_EVENTS, DAY, d).text).toMatch(/nur Marius/);
    expect(askMora('Wie war der Umsatz gestern?', 'marius', MORGENROT_SEED, MORGENROT_EVENTS, DAY, d).text).toMatch(/1\.842 €/);
    expect(askMora('Zeig mir die Rezepte', 'tarek', MORGENROT_SEED, MORGENROT_EVENTS, DAY, d).openMoon).toBe('k-rez');
    expect(askMora('Zeig mir die Verträge', 'tarek', MORGENROT_SEED, MORGENROT_EVENTS, DAY, d).openMoon).toBeUndefined();
  });
});

describe('Universe as company structure', () => {
  it('owner sees every department planet, staff only their own', () => {
    expect(visiblePlanets(MORGENROT_STRUCTURE, MORGENROT_SEED, 'marius').map((p) => p.id)).toEqual(['service', 'kueche', 'aushilfe', 'verwaltung']);
    expect(visiblePlanets(MORGENROT_STRUCTURE, MORGENROT_SEED, 'tarek').map((p) => p.id)).toEqual(['kueche']);
  });
  it('moons are folders', () => {
    const k = MORGENROT_STRUCTURE.find((p) => p.id === 'kueche')!;
    expect(k.moons.map((m) => m.title)).toContain('Rezepte');
  });
  it('staff land directly inside their planet, owner on Home', () => {
    expect(landingFor(MORGENROT_SEED, 'marius')).toEqual({ feature: 'home', planet: null });
    expect(landingFor(MORGENROT_SEED, 'tarek')).toEqual({ feature: 'home', planet: 'kueche' });
  });
});

describe('Home is the default landing', () => {
  it('registry defaults to home and lists it first', () => {
    expect(DEFAULT_FEATURE_ID).toBe('home');
    const nav = navigationModel({ role: 'owner', flags: new Set(), preview: true, internal: false });
    expect(nav.primary[0].id).toBe('home');
  });
});
