import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_STRUCTURE, MORGENROT_EVENTS } from '@/lib/demo/morgenrot/structure';
import { buildHomeModel, visiblePlanets, landingFor } from '@/features/home/data/homeModel';
import { DEFAULT_FEATURE_ID, navigationModel } from '@/features/registry';

const DAY = '2026-10-28';

describe('Home model (Café Morgenrot, fiktiv)', () => {
  it('owner sees exactly three things that need them, plus team and yesterday', () => {
    const m = buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'marius');
    expect(m.scope).toBe('owner');
    expect(m.greeting).toBe('Guten Morgen, Marius.');
    expect(m.needsYou).toHaveLength(3);
    expect(m.needsYou[0].title).toMatch(/Tarek ist krank, Jonas übernimmt/);
    expect(m.team.find((t) => t.personId === 'jonas')?.shift).toBe('06:30–14:30');
    expect(m.team.find((t) => t.personId === 'tarek')?.shift).toBe('krank');
    expect(m.yesterday?.revenue).toBe(1842);
  });

  it('staff only see their own day, no money, no team', () => {
    const m = buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'lena');
    expect(m.scope).toBe('staff');
    expect(m.greeting).toBe('Guten Morgen, Lena.');
    expect(m.yesterday).toBeNull();
    expect(m.team).toEqual([]);
    expect(m.shift).toBe('07:30–16:00');
    expect(m.needsYou.every((i) => i.owner === 'lena')).toBe(true);
  });

  it('sick person gets a calm day off, substitute gets the shift', () => {
    expect(buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'tarek').shift).toBe('Gute Besserung, heute frei');
    expect(buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DAY, 'jonas').shift).toBe('06:30–14:30');
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
