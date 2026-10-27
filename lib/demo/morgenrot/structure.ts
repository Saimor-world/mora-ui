import type { JobRoleId } from './jobRoles';

/** Firmenstruktur als Universum (FIKTIV): Planeten = Abteilungen, Monde = Ordner. */
export interface DemoMoon { id: string; title: string; count: number }
export interface DemoPlanet { id: string; title: string; jobRoles: JobRoleId[]; hue: string; moons: DemoMoon[] }

export const MORGENROT_STRUCTURE: DemoPlanet[] = [
  { id: 'service', title: 'Service', jobRoles: ['service'], hue: '#7FE0CB', moons: [
    { id: 's-res', title: 'Reservierungen', count: 6 }, { id: 's-bew', title: 'Bewertungen', count: 3 }, { id: 's-karte', title: 'Speisekarte', count: 2 } ] },
  { id: 'kueche', title: 'Küche', jobRoles: ['kueche'], hue: '#F2B880', moons: [
    { id: 'k-rez', title: 'Rezepte', count: 24 }, { id: 'k-best', title: 'Bestand', count: 41 }, { id: 'k-hyg', title: 'Hygiene', count: 5 } ] },
  { id: 'aushilfe', title: 'Theke & Aushilfe', jobRoles: ['aushilfe'], hue: '#A9A4F0', moons: [
    { id: 'a-check', title: 'Checklisten', count: 4 }, { id: 'a-schicht', title: 'Schichtplan', count: 1 } ] },
  { id: 'verwaltung', title: 'Verwaltung', jobRoles: ['inhaber'], hue: '#E7D9A8', moons: [
    { id: 'v-zahl', title: 'Zahlen', count: 12 }, { id: 'v-lief', title: 'Lieferanten', count: 7 }, { id: 'v-vert', title: 'Verträge', count: 9 }, { id: 'v-team', title: 'Team', count: 4 } ] },
];

/** Was MÔRA über Nacht selbst vorbereitet hat (FIKTIV). */
export interface DemoEvents {
  sick: { personId: string; date: string; at: string; substituteId: string }[];
  reviews: { date: string; drafts: number; stars: number[] };
  order: { date: string; for: string; items: string; total: number };
  yesterday: { date: string; revenue: number; card: number; vsLastWeek: number; tillOk: boolean };
}

export const MORGENROT_EVENTS: DemoEvents = {
  sick: [{ personId: 'tarek', date: '2026-10-28', at: '06:12', substituteId: 'jonas' }],
  reviews: { date: '2026-10-28', drafts: 3, stars: [5, 5, 3] },
  order: { date: '2026-10-28', for: 'Donnerstag', items: 'Kaffee & Hafermilch', total: 214 },
  yesterday: { date: '2026-10-27', revenue: 1842, card: 0.71, vsLastWeek: 0.09, tillOk: true },
};
